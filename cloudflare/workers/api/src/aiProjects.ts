import { privilegedMfaSatisfied } from "./mfaPolicy";
import { Hono, type Context } from "hono";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";
import { resolveAgentModel } from "./agentRuntimePolicy";
import { reserveAiCost } from "./aiCostGuard";
import { now, sha256 } from "./security";
import { runSocialStudioScheduler } from "./socialStudioScheduler";
import { proposeAudienceCandidates, type AudienceProfile } from "./socialAudienceOptimizer";
import { createSocialStudioBackup, type SocialBackupScope } from "./socialStudioBackup";
import {
  AI_CHANNEL_PROVIDERS,
  contentExpiry,
  parseGeneratedContent,
  validateAiProjectPatch,
  validateContentGeneration,
} from "./aiProjectPolicy";

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;

type ProjectRecord = {
  id: string; organization_id: string | null; slug: string; name: string;
  primary_objective: string; automation_mode: string; content_retention_days: number;
  daily_generation_limit: number; brand_tone: string; target_audience: string;
  core_offer: string; agent_instructions: string; allow_outbound_messages: number;
};

type ProjectAccess = {
  project: ProjectRecord;
  role: "platform_owner" | "superadmin" | "owner" | "manager" | "editor" | "viewer";
  canManage: boolean;
  canCreateContent: boolean;
  canConnect: boolean;
};

async function projectAccess(c: Context<AppBindings>, key: string, bySlug = false): Promise<ProjectAccess | null> {
  const project = await c.env.DB.prepare(
    `SELECT id, organization_id, slug, name, primary_objective, automation_mode,
            content_retention_days, daily_generation_limit, brand_tone,
            target_audience, core_offer, agent_instructions, allow_outbound_messages
       FROM ai_projects WHERE ${bySlug ? "slug" : "id"} = ?`,
  ).bind(key).first<ProjectRecord>();
  if (!project) return null;
  const platformRole = await platformRoleForUser(c.env.DB, c.get("userId"));
  if (platformRole) return {
    project,
    role: platformRole,
    canManage: platformRole === "platform_owner",
    canCreateContent: platformRole === "platform_owner",
    canConnect: platformRole === "platform_owner",
  };
  const member = await c.env.DB.prepare(
    "SELECT role FROM ai_project_members WHERE project_id = ? AND user_id = ? AND status = 'active'",
  ).bind(project.id, c.get("userId")).first<{ role: "owner" | "manager" | "editor" | "viewer" }>();
  if (!member) return null;
  return {
    project,
    role: member.role,
    canManage: member.role === "owner" || member.role === "manager",
    canCreateContent: member.role !== "viewer",
    canConnect: false,
  };
}

async function event(c: Context<AppBindings>, projectId: string, action: string, targetType?: string, targetId?: string, metadata: unknown = {}) {
  await c.env.DB.prepare(
    `INSERT INTO ai_project_events
       (id, project_id, actor_user_id, action, target_type, target_id, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    identifier("aipe"), projectId, c.get("userId"), action,
    targetType || null, targetId || null, JSON.stringify(metadata), now(),
  ).run();
}

export const aiProjectsRouter = new Hono<AppBindings>();

// Every mutation in this high-impact workspace requires a current MFA session,
// including changes made by explicitly invited client collaborators.
const requireAiProjectMfa = async (c: Context<AppBindings>, next: () => Promise<void>) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !(await privilegedMfaSatisfied(c))) {
    return c.json({ error: { code: "mfa_required" } }, 403);
  }
  await next();
};
aiProjectsRouter.use("/api/ai-projects", requireAiProjectMfa);
aiProjectsRouter.use("/api/ai-projects/*", requireAiProjectMfa);

aiProjectsRouter.get("/api/ai-projects", async (c) => {
  const platformRole = await platformRoleForUser(c.env.DB, c.get("userId"));
  const membershipFilter = platformRole
    ? ""
    : "WHERE EXISTS (SELECT 1 FROM ai_project_members member WHERE member.project_id = project.id AND member.user_id = ? AND member.status = 'active')";
  const query = c.env.DB.prepare(
    `SELECT project.id, project.organization_id, project.slug, project.name,
            project.product_key, project.ownership_scope, project.summary,
            project.status, project.primary_objective, project.automation_mode,
            project.memory_status, project.updated_at,
            (SELECT COUNT(*) FROM ai_project_channels channel WHERE channel.project_id = project.id) AS channels_total,
            (SELECT COUNT(*) FROM ai_project_channels channel WHERE channel.project_id = project.id AND channel.connection_status = 'connected') AS channels_connected,
            (SELECT COUNT(*) FROM ai_project_agents agent WHERE agent.project_id = project.id) AS agents_total,
            (SELECT COUNT(*) FROM ai_project_agents agent WHERE agent.project_id = project.id AND agent.status = 'ready') AS agents_ready,
            (SELECT COUNT(*) FROM ai_content_items content WHERE content.project_id = project.id AND content.status IN ('draft','pending_approval')) AS content_pending
       FROM ai_projects project ${membershipFilter}
      ORDER BY CASE project.status WHEN 'active' THEN 0 WHEN 'setup' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
               project.updated_at DESC`,
  );
  const rows = platformRole ? await query.all() : await query.bind(c.get("userId")).all();
  return c.json({ data: rows.results, platformRole });
});

aiProjectsRouter.get("/api/ai-projects/:slug", async (c) => {
  const access = await projectAccess(c, c.req.param("slug"), true);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  const project = await c.env.DB.prepare("SELECT * FROM ai_projects WHERE id = ?")
    .bind(access.project.id).first();
  const [channels, agents, content, memories, competitors, members, events, socialPolicy, socialJobs, socialSources, socialOpportunities, socialTools, socialAccounts, audienceRuns, audienceCandidates, socialDesignProfiles, socialBackups, socialAssets] = await Promise.all([
    c.env.DB.prepare(
      `SELECT channel.*, connection.provider AS verified_provider,
              connection.status AS verified_connection_status, connection.last_validated_at
         FROM ai_project_channels channel
         LEFT JOIN source_connections connection ON connection.id = channel.connection_id
        WHERE channel.project_id = ? ORDER BY channel.provider`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT assigned.agent_slug, assigned.role, assigned.status, assigned.autonomy,
              assigned.capabilities_json, assigned.instructions, assigned.quality_score,
              assigned.last_trained_at, assigned.last_run_at, registry.name,
              registry.mission, registry.accent, registry.current_version
         FROM ai_project_agents assigned
         JOIN ai_agents registry ON registry.slug = assigned.agent_slug
        WHERE assigned.project_id = ?
        ORDER BY CASE assigned.status WHEN 'ready' THEN 0 WHEN 'training' THEN 1 ELSE 2 END, assigned.role`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT id, generated_by_agent, format, objective, channels_json, title, caption,
              visual_direction, cta, hashtags_json, status, scheduled_at,
              published_at, expires_at, created_at, updated_at
         FROM ai_content_items WHERE project_id = ? AND status <> 'expired'
        ORDER BY created_at DESC LIMIT 60`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT id, kind, summary, source_url, confidence, status, observed_at, expires_at
         FROM ai_project_memories WHERE project_id = ? AND expires_at > ?
        ORDER BY status = 'approved' DESC, observed_at DESC LIMIT 40`,
    ).bind(access.project.id, now()).all(),
    c.env.DB.prepare(
      "SELECT * FROM ai_project_competitors WHERE project_id = ? ORDER BY scope, name LIMIT 60",
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT member.user_id, member.role, member.status, member.granted_at,
              account.email, account.display_name
         FROM ai_project_members member JOIN users account ON account.id = member.user_id
        WHERE member.project_id = ? ORDER BY member.role, account.display_name`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      "SELECT action, target_type, target_id, created_at FROM ai_project_events WHERE project_id = ? ORDER BY created_at DESC LIMIT 30",
    ).bind(access.project.id).all(),
    c.env.DB.prepare("SELECT * FROM ai_social_policies WHERE project_id=?")
      .bind(access.project.id).first(),
    c.env.DB.prepare(
      `SELECT id,schedule_key,kind,format,primary_channel,topic,brief_json,status,due_at,
              content_id,blog_post_id,attempt_count,last_error_code,created_at,updated_at,completed_at
         FROM ai_social_jobs WHERE project_id=? ORDER BY due_at DESC LIMIT 80`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT id,kind,title,canonical_url,source_label,scope,evidence_json,insight,status,
              observed_at,expires_at,created_at,updated_at
         FROM ai_social_sources WHERE project_id=? ORDER BY observed_at DESC LIMIT 80`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT id,channel,external_object_id,provenance_url,business_name,business_signal,
              intent_score,recommended_action,proposed_message,status,lead_candidate_id,
              reviewed_at,created_at,updated_at
         FROM ai_social_opportunities WHERE project_id=?
        ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,intent_score DESC,created_at DESC LIMIT 80`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT provider,capability,billing_mode,status,requires_approval,max_calls_per_day,notes,last_checked_at
         FROM ai_social_tool_policies WHERE project_id=? ORDER BY provider,capability`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT id,provider,surface,label,external_account_id,connection_status,review_status,timezone,
              daily_review_hour,daily_review_minute,cleanup_limit,growth_limit,require_approval,
              last_snapshot_at,last_review_at,last_error_code,created_at,updated_at
         FROM ai_social_accounts WHERE project_id=? ORDER BY provider,label`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT run.id,run.account_id,account.provider,account.surface,account.label,run.review_date,run.status,
              run.cleanup_limit,run.growth_limit,run.cleanup_count,run.growth_count,run.due_at,
              run.approved_at,run.completed_at,run.last_error_code,run.created_at,run.updated_at
         FROM ai_social_audience_runs run JOIN ai_social_accounts account ON account.id=run.account_id
        WHERE account.project_id=? ORDER BY run.due_at DESC LIMIT 80`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT candidate.id,candidate.run_id,candidate.relationship_id,candidate.action,candidate.score,
              candidate.reasons_json,candidate.protection_json,candidate.status,candidate.approved_at,
              candidate.executed_at,candidate.last_error_code,relationship.profile_url,relationship.handle,
              relationship.display_name,relationship.relationship,relationship.profile_kind,
              relationship.business_category,relationship.website_url,relationship.website_state,
              relationship.activity_state,relationship.follows_back,relationship.relevance_score,
              relationship.intent_score
         FROM ai_social_audience_candidates candidate
         JOIN ai_social_audience_runs run ON run.id=candidate.run_id
         JOIN ai_social_accounts account ON account.id=run.account_id
         JOIN ai_social_relationships relationship ON relationship.id=candidate.relationship_id
        WHERE account.project_id=? ORDER BY run.due_at DESC,candidate.action,candidate.score DESC LIMIT 200`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT id,version,status,profile_json,source_sha256,source_object_key,created_at,approved_at,updated_at
         FROM ai_social_design_profiles WHERE project_id=? ORDER BY version DESC LIMIT 12`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT id,scope,status,schema_version,manifest_sha256,byte_size,row_counts_json,
              started_at,completed_at,verified_at,last_error_code
         FROM ai_social_backup_runs WHERE project_id=? ORDER BY started_at DESC LIMIT 30`,
    ).bind(access.project.id).all(),
    c.env.DB.prepare(
      `SELECT id,content_id,asset_group_id,channel,role,r2_bucket,object_key,mime_type,
              width,height,duration_ms,byte_size,sha256,provenance_json,status,created_at,updated_at
         FROM ai_social_assets WHERE project_id=? AND status<>'deleted' ORDER BY created_at DESC LIMIT 120`,
    ).bind(access.project.id).all(),
  ]);
  return c.json({
    project,
    channels: channels.results,
    agents: agents.results,
    content: content.results,
    memories: memories.results,
    competitors: competitors.results,
    members: members.results,
    events: events.results,
    socialPolicy,
    socialJobs: socialJobs.results,
    socialSources: socialSources.results,
    socialOpportunities: socialOpportunities.results,
    socialTools: socialTools.results,
    socialAccounts: socialAccounts.results,
    audienceRuns: audienceRuns.results,
    audienceCandidates: audienceCandidates.results,
    socialDesignProfiles: socialDesignProfiles.results,
    socialBackups: socialBackups.results,
    socialAssets: socialAssets.results,
    permission: {
      role: access.role, canManage: access.canManage,
      canCreateContent: access.canCreateContent, canConnect: access.canConnect,
    },
  });
});

const PROJECT_FIELD_MAP = {
  status: "status", primaryObjective: "primary_objective", automationMode: "automation_mode",
  brandTone: "brand_tone", targetAudience: "target_audience", coreOffer: "core_offer",
  agentInstructions: "agent_instructions", dailyGenerationLimit: "daily_generation_limit",
  contentRetentionDays: "content_retention_days", rawDataRetentionDays: "raw_data_retention_days",
  maxAssetBytes: "max_asset_bytes", allowOutboundMessages: "allow_outbound_messages",
} as const;

aiProjectsRouter.patch("/api/ai-projects/:projectId", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canManage) return c.json({ error: { code: "forbidden" } }, 403);
  const parsed = validateAiProjectPatch(await c.req.json<unknown>().catch(() => null));
  if (!parsed.ok) return c.json({ error: { code: parsed.code, field: parsed.field } }, 400);
  const patch = parsed.value;
  if ((patch.automationMode === "automatic" || patch.allowOutboundMessages === true) && !access.canConnect) {
    return c.json({ error: { code: "platform_owner_approval_required" } }, 403);
  }
  if (patch.automationMode === "automatic" || patch.allowOutboundMessages === true) {
    const verified = await c.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM ai_project_channels channel
        JOIN source_connections connection ON connection.id = channel.connection_id
       WHERE channel.project_id = ? AND channel.connection_status = 'connected'
         AND connection.status = 'active'`,
    ).bind(access.project.id).first<{ count: number }>();
    if (!verified?.count) return c.json({ error: { code: "verified_connection_required" } }, 409);
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [wire, column] of Object.entries(PROJECT_FIELD_MAP)) {
    const value = patch[wire as keyof typeof patch];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    values.push(typeof value === "boolean" ? Number(value) : value);
  }
  const timestamp = now();
  sets.push("updated_at = ?"); values.push(timestamp, access.project.id);
  await c.env.DB.prepare(`UPDATE ai_projects SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
  await event(c, access.project.id, "ai_project.strategy.update", "ai_project", access.project.id, { fields: Object.keys(patch) });
  return c.json({ ok: true });
});

aiProjectsRouter.patch("/api/ai-projects/:projectId/channels/:provider", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canConnect) return c.json({ error: { code: "platform_owner_required" } }, 403);
  const provider = c.req.param("provider");
  if (!(AI_CHANNEL_PROVIDERS as readonly string[]).includes(provider)) {
    return c.json({ error: { code: "invalid_provider" } }, 400);
  }
  const body = await c.req.json<{ status?: string; connectionId?: string | null; accountLabel?: string | null }>().catch(() => null);
  const status = String(body?.status || "");
  if (!body || !["disconnected", "verifying", "connected", "error", "paused"].includes(status)) {
    return c.json({ error: { code: "invalid_connection_state" } }, 400);
  }
  const connectionId = body.connectionId || null;
  if (status === "connected") {
    const connection = connectionId ? await c.env.DB.prepare(
      `SELECT id FROM source_connections
        WHERE id = ? AND provider = ? AND purpose IN ('publishing','analytics')
          AND status = 'active'
          AND ((organization_id = ?) OR (organization_id IS NULL AND ? IS NULL))`,
    ).bind(connectionId, provider, access.project.organization_id, access.project.organization_id).first() : null;
    if (!connection) return c.json({ error: { code: "verified_connection_required" } }, 409);
  }
  const timestamp = now();
  await c.env.DB.prepare(
    `UPDATE ai_project_channels
        SET connection_id = ?, account_label = ?, connection_status = ?,
            allowed_actions_json = ?, updated_by = ?, updated_at = ?
      WHERE project_id = ? AND provider = ?`,
  ).bind(
    connectionId, String(body.accountLabel || "").trim().slice(0, 160) || null, status,
    status === "connected" ? '["read","draft"]' : '["read"]',
    c.get("userId"), timestamp, access.project.id, provider,
  ).run();
  if (["facebook", "instagram", "tiktok"].includes(provider)) {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE ai_social_accounts SET connection_id=?,connection_status=?,updated_at=?
          WHERE project_id=? AND provider=?`,
      ).bind(connectionId, status, timestamp, access.project.id, provider),
      c.env.DB.prepare(
        `UPDATE ai_social_audience_runs SET status='awaiting_data',updated_at=?
          WHERE account_id IN (SELECT id FROM ai_social_accounts WHERE project_id=? AND provider=? AND connection_status='connected')
            AND status='awaiting_connection'`,
      ).bind(timestamp, access.project.id, provider),
    ]);
  }
  await event(c, access.project.id, "ai_project.channel.update", "channel", provider, { status });
  return c.json({ ok: true });
});

const SOCIAL_SOURCE_KINDS = new Set(["current_post", "competitor_post", "trend", "industry_news", "pdf_book", "website", "analytics"]);
const SOCIAL_SOURCE_SCOPES = new Set(["owned", "local", "national", "international", "internal"]);
const AUDIENCE_PROVIDERS = new Set(["facebook", "instagram", "tiktok"]);
const AUDIENCE_SURFACES = new Set(["profile", "page", "professional", "business", "creator"]);
const AUDIENCE_RELATIONSHIPS = new Set(["friend", "following", "follower", "mutual", "requested", "suggested"]);
const AUDIENCE_PROFILE_KINDS = new Set(["business", "organization", "creator", "personal", "unknown"]);
const AUDIENCE_WEBSITE_STATES = new Set(["none", "weak", "adequate", "unknown"]);
const AUDIENCE_ACTIVITY_STATES = new Set(["active", "inactive", "unknown"]);
const AUDIENCE_PROTECTIONS = new Set(["conversation", "engagement", "contacted", "lead", "client", "partner", "manual", "do_not_contact"]);

aiProjectsRouter.post("/api/ai-projects/:projectId/audience/accounts", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canConnect) return c.json({ error: { code: "platform_owner_required" } }, 403);
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  const provider = String(body?.provider || "");
  const surface = String(body?.surface || "");
  const label = String(body?.label || "").trim().slice(0, 120);
  if (!AUDIENCE_PROVIDERS.has(provider) || !AUDIENCE_SURFACES.has(surface) || label.length < 2) {
    return c.json({ error: { code: "invalid_audience_account" } }, 400);
  }
  const id = identifier("asa");
  const timestamp = now();
  const channel = await c.env.DB.prepare(
    `SELECT connection_id,connection_status FROM ai_project_channels
      WHERE project_id=? AND provider=?`,
  ).bind(access.project.id, provider).first<{ connection_id: string | null; connection_status: string }>();
  try {
    await c.env.DB.prepare(
      `INSERT INTO ai_social_accounts
        (id,project_id,provider,surface,label,connection_id,connection_status,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).bind(
      id, access.project.id, provider, surface, label,
      channel?.connection_status === "connected" ? channel.connection_id : null,
      channel?.connection_status === "connected" ? "connected" : "disconnected",
      timestamp, timestamp,
    ).run();
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return c.json({ error: { code: "audience_account_exists" } }, 409);
    throw error;
  }
  await event(c, access.project.id, "social_audience.account.create", "social_account", id, { provider, surface, label });
  return c.json({ id }, 201);
});

aiProjectsRouter.post("/api/ai-projects/:projectId/audience/accounts/:accountId/snapshot", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canConnect) return c.json({ error: { code: "platform_owner_required" } }, 403);
  const account = await c.env.DB.prepare(
    "SELECT id,cleanup_limit,growth_limit FROM ai_social_accounts WHERE id=? AND project_id=?",
  ).bind(c.req.param("accountId"), access.project.id).first<{ id: string; cleanup_limit: number; growth_limit: number }>();
  if (!account) return c.json({ error: { code: "audience_account_not_found" } }, 404);
  const body = await c.req.json<{ profiles?: Array<Record<string, unknown>> }>().catch(() => null);
  if (!body?.profiles || !Array.isArray(body.profiles) || body.profiles.length > 1_000) {
    return c.json({ error: { code: "invalid_audience_snapshot" } }, 400);
  }
  const timestamp = now();
  for (const item of body.profiles) {
    const externalProfileId = String(item.externalProfileId || "").trim().slice(0, 240);
    const profileUrl = String(item.profileUrl || "").trim().slice(0, 1_000);
    const relationship = String(item.relationship || "");
    const profileKind = String(item.profileKind || "unknown");
    const websiteState = String(item.websiteState || "unknown");
    const activityState = String(item.activityState || "unknown");
    if (!externalProfileId || !AUDIENCE_RELATIONSHIPS.has(relationship) || !AUDIENCE_PROFILE_KINDS.has(profileKind)
      || !AUDIENCE_WEBSITE_STATES.has(websiteState) || !AUDIENCE_ACTIVITY_STATES.has(activityState)) continue;
    try { if (!/^https?:$/.test(new URL(profileUrl).protocol)) continue; } catch { continue; }
    const relationshipId = identifier("asr");
    const followsBack = typeof item.followsBack === "boolean" ? Number(item.followsBack) : null;
    const relevanceScore = Math.max(0, Math.min(100, Math.round(Number(item.relevanceScore) || 0)));
    const intentScore = Math.max(0, Math.min(100, Math.round(Number(item.intentScore) || 0)));
    await c.env.DB.prepare(
      `INSERT INTO ai_social_relationships
        (id,account_id,external_profile_id,profile_url,handle,display_name,relationship,profile_kind,
         business_category,website_url,website_state,activity_state,last_activity_at,follows_back,
         relevance_score,intent_score,evidence_json,first_observed_at,last_observed_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(account_id,external_profile_id) DO UPDATE SET
         profile_url=excluded.profile_url,handle=excluded.handle,display_name=excluded.display_name,
         relationship=excluded.relationship,profile_kind=excluded.profile_kind,
         business_category=excluded.business_category,website_url=excluded.website_url,
         website_state=excluded.website_state,activity_state=excluded.activity_state,
         last_activity_at=excluded.last_activity_at,follows_back=excluded.follows_back,
         relevance_score=excluded.relevance_score,intent_score=excluded.intent_score,
         evidence_json=excluded.evidence_json,last_observed_at=excluded.last_observed_at,updated_at=excluded.updated_at`,
    ).bind(
      relationshipId, account.id, externalProfileId, profileUrl,
      String(item.handle || "").slice(0, 160) || null, String(item.displayName || "").slice(0, 200) || null,
      relationship, profileKind, String(item.businessCategory || "").slice(0, 200) || null,
      String(item.websiteUrl || "").slice(0, 1_000) || null, websiteState, activityState,
      Number.isSafeInteger(item.lastActivityAt) ? item.lastActivityAt : null, followsBack,
      relevanceScore, intentScore,
      JSON.stringify(item.evidence && typeof item.evidence === "object" ? item.evidence : {}),
      timestamp, timestamp, timestamp, timestamp,
    ).run();
    const stored = await c.env.DB.prepare(
      "SELECT id FROM ai_social_relationships WHERE account_id=? AND external_profile_id=?",
    ).bind(account.id, externalProfileId).first<{ id: string }>();
    const protections = Array.isArray(item.protections)
      ? [...new Set(item.protections.map(String).filter((value) => AUDIENCE_PROTECTIONS.has(value)))]
      : [];
    for (const protection of protections) {
      await c.env.DB.prepare(
        `INSERT INTO ai_social_profile_protections
          (account_id,external_profile_id,protection_type,source_ref,reason,observed_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?)
         ON CONFLICT(account_id,external_profile_id,protection_type) DO UPDATE SET
           source_ref=excluded.source_ref,reason=excluded.reason,observed_at=excluded.observed_at,updated_at=excluded.updated_at`,
      ).bind(
        account.id, externalProfileId, protection, String(item.sourceRef || "").slice(0, 1_000) || null,
        `Protejat automat: ${protection}`, timestamp, timestamp, timestamp,
      ).run();
    }
    if (!stored) continue;
  }
  await c.env.DB.prepare("UPDATE ai_social_accounts SET last_snapshot_at=?,updated_at=? WHERE id=?")
    .bind(timestamp, timestamp, account.id).run();
  const run = await c.env.DB.prepare(
    `SELECT id FROM ai_social_audience_runs
      WHERE account_id=? AND status IN ('awaiting_data','analyzing') AND due_at<=?
      ORDER BY due_at DESC LIMIT 1`,
  ).bind(account.id, timestamp).first<{ id: string }>();
  if (!run) return c.json({ ok: true, proposed: 0, runId: null });
  await c.env.DB.prepare("UPDATE ai_social_audience_runs SET status='analyzing',updated_at=? WHERE id=?")
    .bind(timestamp, run.id).run();
  const rows = await c.env.DB.prepare(
    `SELECT relationship.id,relationship.relationship,relationship.profile_kind,relationship.website_state,
            relationship.activity_state,relationship.follows_back,relationship.relevance_score,relationship.intent_score,
            COALESCE(group_concat(protection.protection_type), '') protections
       FROM ai_social_relationships relationship
       LEFT JOIN ai_social_profile_protections protection
         ON protection.account_id=relationship.account_id
        AND protection.external_profile_id=relationship.external_profile_id
        AND (protection.expires_at IS NULL OR protection.expires_at>?)
      WHERE relationship.account_id=? GROUP BY relationship.id`,
  ).bind(timestamp, account.id).all<{
    id: string; relationship: AudienceProfile["relationship"]; profile_kind: AudienceProfile["profileKind"];
    website_state: AudienceProfile["websiteState"]; activity_state: AudienceProfile["activityState"];
    follows_back: number | null; relevance_score: number; intent_score: number; protections: string;
  }>();
  const proposals = proposeAudienceCandidates(rows.results.map((row) => ({
    id: row.id, relationship: row.relationship, profileKind: row.profile_kind,
    websiteState: row.website_state, activityState: row.activity_state,
    followsBack: row.follows_back === null ? null : Boolean(row.follows_back),
    relevanceScore: row.relevance_score, intentScore: row.intent_score,
    protections: row.protections ? row.protections.split(",") : [],
  })), { cleanup: account.cleanup_limit, growth: account.growth_limit });
  for (const proposal of proposals) {
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO ai_social_audience_candidates
        (id,run_id,relationship_id,action,score,reasons_json,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).bind(identifier("aac"), run.id, proposal.relationshipId, proposal.action, proposal.score, JSON.stringify(proposal.reasons), timestamp, timestamp).run();
  }
  const cleanupCount = proposals.filter((proposal) => proposal.action === "unfollow" || proposal.action === "unfriend").length;
  const growthCount = proposals.length - cleanupCount;
  await c.env.DB.prepare(
    `UPDATE ai_social_audience_runs SET status='review_ready',cleanup_count=?,growth_count=?,updated_at=? WHERE id=?`,
  ).bind(cleanupCount, growthCount, timestamp, run.id).run();
  return c.json({ ok: true, proposed: proposals.length, runId: run.id });
});

aiProjectsRouter.patch("/api/ai-projects/:projectId/audience/runs/:runId/review", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canManage) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<{ group?: string; decision?: string }>().catch(() => null);
  const group = String(body?.group || "");
  const decision = String(body?.decision || "");
  if (!['cleanup','growth'].includes(group) || !['approved','rejected'].includes(decision)) {
    return c.json({ error: { code: "invalid_audience_review" } }, 400);
  }
  const actions = group === "cleanup" ? ["unfollow", "unfriend"] : ["follow", "friend_request"];
  const timestamp = now();
  const nextStatus = decision === "approved" ? "queued" : "rejected";
  const result = await c.env.DB.prepare(
    `UPDATE ai_social_audience_candidates AS candidate
        SET status=?,approved_by=?,approved_at=?,updated_at=?
      WHERE candidate.run_id=? AND candidate.action IN (?,?) AND candidate.status='proposed'
        AND EXISTS (
          SELECT 1 FROM ai_social_audience_runs run
          JOIN ai_social_accounts account ON account.id=run.account_id
          WHERE run.id=candidate.run_id AND account.project_id=? AND run.status IN ('review_ready','approved')
        )
        AND NOT EXISTS (
          SELECT 1 FROM ai_social_relationships relationship
          JOIN ai_social_profile_protections protection
            ON protection.account_id=relationship.account_id
           AND protection.external_profile_id=relationship.external_profile_id
          WHERE relationship.id=candidate.relationship_id
            AND (protection.expires_at IS NULL OR protection.expires_at>?)
        )`,
  ).bind(nextStatus, c.get("userId"), timestamp, timestamp, c.req.param("runId"), actions[0], actions[1], access.project.id, timestamp).run();
  if (!result.meta.changes) return c.json({ error: { code: "audience_list_not_reviewable" } }, 409);
  const remaining = await c.env.DB.prepare(
    "SELECT COUNT(*) count FROM ai_social_audience_candidates WHERE run_id=? AND status='proposed'",
  ).bind(c.req.param("runId")).first<{ count: number }>();
  await c.env.DB.prepare(
    `UPDATE ai_social_audience_runs SET status=?,approved_by=?,approved_at=?,updated_at=? WHERE id=?`,
  ).bind(remaining?.count ? "review_ready" : "approved", c.get("userId"), timestamp, timestamp, c.req.param("runId")).run();
  await event(c, access.project.id, `social_audience.${group}.${decision}`, "audience_run", c.req.param("runId"), { count: result.meta.changes });
  return c.json({ ok: true, queued: decision === "approved" ? result.meta.changes : 0 });
});

aiProjectsRouter.patch("/api/ai-projects/:projectId/social-policy", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canManage) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: { code: "bad_request" } }, 400);
  const integer = (field: string, min: number, max: number) => {
    if (body[field] === undefined) return undefined;
    const value = Number(body[field]);
    return Number.isSafeInteger(value) && value >= min && value <= max ? value : false;
  };
  const fields: Array<[string, string, number, number]> = [
    ["dailyPostCount", "daily_post_count", 0, 8],
    ["dailyImageCount", "daily_image_count", 0, 8],
    ["reelIntervalDays", "reel_interval_days", 1, 30],
    ["tagMin", "tag_min", 0, 20],
    ["tagMax", "tag_max", 0, 30],
    ["weeklyArticleWeekday", "weekly_article_weekday", 1, 7],
    ["weeklyArticleHour", "weekly_article_hour", 0, 23],
    ["weeklyArticleMinute", "weekly_article_minute", 0, 59],
    ["engagementIntervalMinutes", "engagement_interval_minutes", 60, 1_440],
    ["storyLikeTarget", "story_like_target", 0, 20],
    ["feedLikeTarget", "feed_like_target", 0, 20],
  ];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [wire, column, min, max] of fields) {
    const value = integer(wire, min, max);
    if (value === false) return c.json({ error: { code: "invalid_social_policy", field: wire } }, 400);
    if (value !== undefined) { sets.push(`${column}=?`); values.push(value); }
  }
  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "paused") return c.json({ error: { code: "invalid_social_policy", field: "status" } }, 400);
    sets.push("status=?"); values.push(body.status);
  }
  if (body.timeSlots !== undefined) {
    if (!body.timeSlots || typeof body.timeSlots !== "object" || Array.isArray(body.timeSlots)) {
      return c.json({ error: { code: "invalid_social_policy", field: "timeSlots" } }, 400);
    }
    const slots = body.timeSlots as Record<string, unknown>;
    for (const key of ["post", "image", "reel", "story"]) {
      if (slots[key] !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(slots[key]))) {
        return c.json({ error: { code: "invalid_social_policy", field: `timeSlots.${key}` } }, 400);
      }
    }
    sets.push("time_slots_json=?"); values.push(JSON.stringify(slots));
  }
  if (body.industryRotation !== undefined) {
    if (!Array.isArray(body.industryRotation) || body.industryRotation.length < 1 || body.industryRotation.length > 30
      || body.industryRotation.some((item) => typeof item !== "string" || item.trim().length < 2 || item.length > 80)) {
      return c.json({ error: { code: "invalid_social_policy", field: "industryRotation" } }, 400);
    }
    sets.push("industry_rotation_json=?");
    values.push(JSON.stringify([...new Set(body.industryRotation.map((item) => String(item).trim()))]));
  }
  if (!sets.length) return c.json({ error: { code: "nothing_to_update" } }, 400);
  const timestamp = now();
  sets.push("require_human_approval=1", "updated_at=?"); values.push(timestamp, access.project.id);
  await c.env.DB.prepare(`UPDATE ai_social_policies SET ${sets.join(",")} WHERE project_id=?`).bind(...values).run();
  await event(c, access.project.id, "social_studio.policy.update", "ai_project", access.project.id, { fields: Object.keys(body) });
  return c.json({ ok: true });
});

aiProjectsRouter.post("/api/ai-projects/:projectId/social-studio/plan", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canConnect) return c.json({ error: { code: "platform_owner_required" } }, 403);
  const result = await runSocialStudioScheduler(c.env, now());
  await event(c, access.project.id, "social_studio.plan.run", "ai_project", access.project.id, result);
  return c.json({ ok: true, ...result });
});

aiProjectsRouter.post("/api/ai-projects/:projectId/social-studio/backups", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canManage) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<{ scope?: string }>().catch(() => null);
  const scope = String(body?.scope || "configuration") as SocialBackupScope;
  if (!["configuration", "content", "full"].includes(scope)) {
    return c.json({ error: { code: "invalid_backup_scope" } }, 400);
  }
  try {
    const result = await createSocialStudioBackup(c.env, access.project.id, c.get("userId"), scope);
    await event(c, access.project.id, "social_studio.backup.created", "social_backup", result.id, {
      scope, sha256: result.sha256, byteSize: result.byteSize, rowCounts: result.rowCounts,
    });
    return c.json({ ok: true, ...result }, 201);
  } catch {
    return c.json({ error: { code: "social_backup_failed" } }, 500);
  }
});

aiProjectsRouter.get("/api/ai-projects/:projectId/social-studio/backups/:backupId/download", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canManage) return c.json({ error: { code: "forbidden" } }, 403);
  const backup = await c.env.DB.prepare(
    `SELECT id,manifest_object_key,manifest_sha256 FROM ai_social_backup_runs
      WHERE id=? AND project_id=? AND status IN ('ready','verified')`,
  ).bind(c.req.param("backupId"), access.project.id).first<{
    id: string; manifest_object_key: string | null; manifest_sha256: string | null;
  }>();
  if (!backup?.manifest_object_key) return c.json({ error: { code: "backup_not_ready" } }, 404);
  const object = await c.env.FILES.get(backup.manifest_object_key);
  if (!object) return c.json({ error: { code: "backup_object_missing" } }, 410);
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "application/json; charset=UTF-8",
      "content-disposition": `attachment; filename="avyron-social-studio-${backup.id}.json"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-avyron-sha256": backup.manifest_sha256 || "",
    },
  });
});

aiProjectsRouter.post("/api/ai-projects/:projectId/social-jobs/:jobId/retry", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canManage) return c.json({ error: { code: "forbidden" } }, 403);
  const timestamp = now();
  const result = await c.env.DB.prepare(
    `UPDATE ai_social_jobs SET status='queued',last_error_code=NULL,updated_at=?
      WHERE id=? AND project_id=? AND status IN ('failed','awaiting_budget')`,
  ).bind(timestamp, c.req.param("jobId"), access.project.id).run();
  if (!result.meta.changes) return c.json({ error: { code: "job_not_retryable" } }, 409);
  await event(c, access.project.id, "social_studio.job.retry", "social_job", c.req.param("jobId"));
  return c.json({ ok: true });
});

aiProjectsRouter.post("/api/ai-projects/:projectId/social-sources", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canManage) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  const kind = String(body?.kind || "");
  const scope = String(body?.scope || "national");
  const title = String(body?.title || "").trim().slice(0, 240);
  const sourceLabel = String(body?.sourceLabel || "").trim().slice(0, 160);
  const canonicalUrl = String(body?.canonicalUrl || "").trim().slice(0, 1_000) || null;
  const insight = String(body?.insight || "").trim().slice(0, 4_000);
  if (!SOCIAL_SOURCE_KINDS.has(kind) || !SOCIAL_SOURCE_SCOPES.has(scope) || title.length < 3 || sourceLabel.length < 2) {
    return c.json({ error: { code: "invalid_social_source" } }, 400);
  }
  if (canonicalUrl) {
    try { if (!/^https?:$/.test(new URL(canonicalUrl).protocol)) throw new Error(); }
    catch { return c.json({ error: { code: "invalid_source_url" } }, 400); }
  }
  const id = identifier("ass");
  const timestamp = now();
  await c.env.DB.prepare(
    `INSERT INTO ai_social_sources
      (id,project_id,kind,title,canonical_url,source_label,scope,evidence_json,insight,status,observed_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,? ,?,'proposed',?,?,?)`,
  ).bind(
    id, access.project.id, kind, title, canonicalUrl, sourceLabel, scope,
    JSON.stringify(body?.evidence && typeof body.evidence === "object" ? body.evidence : {}),
    insight, timestamp, timestamp, timestamp,
  ).run();
  await event(c, access.project.id, "social_studio.source.proposed", "social_source", id, { kind, scope });
  return c.json({ id }, 201);
});

aiProjectsRouter.patch("/api/ai-projects/:projectId/social-sources/:sourceId", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canManage) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<{ status?: string }>().catch(() => null);
  if (!body || !["approved", "rejected"].includes(String(body.status))) return c.json({ error: { code: "invalid_source_state" } }, 400);
  const timestamp = now();
  const result = await c.env.DB.prepare(
    `UPDATE ai_social_sources SET status=?,approved_by=?,approved_at=?,updated_at=?
      WHERE id=? AND project_id=? AND status='proposed'`,
  ).bind(body.status, c.get("userId"), timestamp, timestamp, c.req.param("sourceId"), access.project.id).run();
  if (!result.meta.changes) return c.json({ error: { code: "source_not_reviewable" } }, 409);
  await event(c, access.project.id, `social_studio.source.${body.status}`, "social_source", c.req.param("sourceId"));
  return c.json({ ok: true });
});

aiProjectsRouter.patch("/api/ai-projects/:projectId/social-opportunities/:opportunityId", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canManage) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<{ decision?: string }>().catch(() => null);
  const decision = String(body?.decision || "");
  if (!['approved','rejected','handed_off'].includes(decision)) return c.json({ error: { code: "invalid_opportunity_state" } }, 400);
  const opportunity = await c.env.DB.prepare(
    `SELECT * FROM ai_social_opportunities WHERE id=? AND project_id=? AND status='pending'`,
  ).bind(c.req.param("opportunityId"), access.project.id).first<{
    id: string; channel: string; provenance_url: string; business_name: string | null;
    business_signal: string; intent_score: number; recommended_action: string;
  }>();
  if (!opportunity) return c.json({ error: { code: "opportunity_not_reviewable" } }, 409);
  const timestamp = now();
  let leadCandidateId: string | null = null;
  if (decision === "handed_off") {
    leadCandidateId = identifier("candidate");
    await c.env.DB.prepare(
      `INSERT INTO lead_candidates
        (id,organization_id,discovered_by,business_name,public_contact_json,provenance_url,
         rationale,confidence,status,reviewed_by,reviewed_at,created_at,updated_at)
       VALUES (?,?,'social-studio',?,?,?,? ,?,'approved',?,?,?,?)`,
    ).bind(
      leadCandidateId, access.project.organization_id, opportunity.business_name,
      JSON.stringify({ channel: opportunity.channel }), opportunity.provenance_url,
      opportunity.business_signal, opportunity.intent_score / 100,
      c.get("userId"), timestamp, timestamp, timestamp,
    ).run();
  }
  await c.env.DB.prepare(
    `UPDATE ai_social_opportunities SET status=?,lead_candidate_id=?,reviewed_by=?,reviewed_at=?,updated_at=?
      WHERE id=? AND project_id=?`,
  ).bind(decision, leadCandidateId, c.get("userId"), timestamp, timestamp, opportunity.id, access.project.id).run();
  await event(c, access.project.id, `social_studio.opportunity.${decision}`, "social_opportunity", opportunity.id, { leadCandidateId });
  return c.json({ ok: true, leadCandidateId });
});

type AgentForGeneration = {
  slug: string; name: string; model: string; temperature: number; max_tokens: number;
  system_prompt: string; guardrails: string; version_id: string;
};

aiProjectsRouter.post("/api/ai-projects/:projectId/content/generate", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canCreateContent) return c.json({ error: { code: "forbidden" } }, 403);
  const parsed = validateContentGeneration(await c.req.json<unknown>().catch(() => null));
  if (!parsed.ok) return c.json({ error: { code: parsed.code, field: parsed.field } }, 400);
  const idempotencyKey = (c.req.header("idempotency-key") || "").trim();
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(idempotencyKey)) {
    return c.json({ error: { code: "idempotency_key_required" } }, 400);
  }
  const scope = `ai_content.generate:${access.project.id}:${c.get("userId")}`;
  const requestHash = await sha256(JSON.stringify(parsed.value));
  const previous = await c.env.DB.prepare(
    "SELECT request_hash, response_status, response_json FROM idempotency_keys WHERE scope = ? AND idempotency_key = ? AND expires_at > ?",
  ).bind(scope, idempotencyKey, now()).first<{ request_hash: string; response_status: number | null; response_json: string | null }>();
  if (previous) {
    if (previous.request_hash !== requestHash) return c.json({ error: { code: "idempotency_key_reused" } }, 409);
    if (previous.response_json) return new Response(previous.response_json, {
      status: previous.response_status || 201, headers: { "content-type": "application/json; charset=UTF-8" },
    });
    return c.json({ error: { code: "request_in_progress" } }, 409);
  }

  const rollingWindowStart = now() - 86_400_000;
  const generatedToday = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM ai_content_items WHERE project_id = ? AND created_at >= ?",
  ).bind(access.project.id, rollingWindowStart).first<{ count: number }>();
  if ((generatedToday?.count || 0) >= access.project.daily_generation_limit) {
    return c.json({ error: { code: "daily_generation_limit" } }, 429);
  }

  const blocked = await c.env.DB.prepare(
    `SELECT 1 FROM ai_kill_switches WHERE enabled = 1 AND
      ((scope_type = 'global' AND scope_id = '*')
       OR (scope_type = 'organization' AND scope_id = ?)
       OR (scope_type = 'agent' AND scope_id = 'ai-prod-content')) LIMIT 1`,
  ).bind(access.project.organization_id || "platform").first();
  if (blocked) return c.json({ error: { code: "agent_paused" } }, 503);

  const agent = await c.env.DB.prepare(
    `SELECT registry.slug, registry.name, version.model, version.temperature,
            version.max_tokens, version.system_prompt, version.guardrails,
            version.id AS version_id
       FROM ai_project_agents assigned
       JOIN ai_agents registry ON registry.slug = assigned.agent_slug
       JOIN ai_agent_versions version
         ON version.agent_slug = registry.slug AND version.version = registry.current_version
        AND version.status = 'approved'
      WHERE assigned.project_id = ? AND assigned.role = 'content'
        AND assigned.status = 'ready' AND registry.status = 'active' LIMIT 1`,
  ).bind(access.project.id).first<AgentForGeneration>();
  if (!agent) return c.json({ error: { code: "content_agent_not_ready" } }, 409);
  if (!c.env.AI) return c.json({ error: { code: "workers_ai_unavailable" } }, 503);

  const [memories, sources, socialPolicy] = await Promise.all([
    c.env.DB.prepare(
      `SELECT kind, summary FROM ai_project_memories
        WHERE project_id = ? AND status = 'approved' AND expires_at > ?
        ORDER BY confidence DESC, observed_at DESC LIMIT 8`,
    ).bind(access.project.id, now()).all<{ kind: string; summary: string }>(),
    c.env.DB.prepare(
      `SELECT kind,title,source_label,canonical_url,insight FROM ai_social_sources
        WHERE project_id=? AND status='approved' AND (expires_at IS NULL OR expires_at>?)
        ORDER BY observed_at DESC LIMIT 8`,
    ).bind(access.project.id, now()).all<{ kind: string; title: string; source_label: string; canonical_url: string | null; insight: string }>(),
    c.env.DB.prepare("SELECT tag_min,tag_max FROM ai_social_policies WHERE project_id=?")
      .bind(access.project.id).first<{ tag_min: number; tag_max: number }>(),
  ]);
  const request = parsed.value;
  const prompt = [
    agent.system_prompt,
    agent.guardrails,
    "Returnează exclusiv JSON valid cu cheile title, caption, visualDirection, cta, hashtags (array).",
    `Proiect: ${access.project.name}`,
    `Obiectiv: ${request.objective}; format: ${request.format}; canal: ${request.channel}.`,
    `Ton: ${access.project.brand_tone}`,
    `Audiență: ${access.project.target_audience || "nespecificată"}`,
    `Ofertă: ${access.project.core_offer || "nespecificată"}`,
    `Reguli proiect: ${access.project.agent_instructions || "fără reguli suplimentare"}`,
    `Subiect: ${request.topic}`,
    request.context ? `Context introdus de operator: ${request.context}` : "",
    request.format === "story"
      ? "Descrierea trebuie să fie scurtă, tematică și lizibilă imediat."
      : `Folosește între ${socialPolicy?.tag_min || 5} și ${socialPolicy?.tag_max || 10} hashtaguri relevante, specifice și curate.`,
    sources.results.length
      ? `Surse editoriale aprobate:\n${sources.results.map((item) => `- ${item.source_label}: ${item.title}; ${item.insight}; ${item.canonical_url || "fără URL"}`).join("\n")}`
      : "Nu există surse editoriale aprobate. Nu afirma că un subiect este în tendințe și nu atribui rezultate concurenților.",
    memories.results.length
      ? `Memorie aprobată:\n${memories.results.map((item) => `- ${item.kind}: ${item.summary}`).join("\n")}`
      : "Memorie aprobată: indisponibilă. Nu inventa fapte; formulează o ciornă generică și marchează clar direcția vizuală.",
  ].filter(Boolean).join("\n\n");
  const timestamp = now();
  const runId = identifier("run");
  await c.env.DB.prepare(
    `INSERT INTO ai_runs
       (id, organization_id, agent_slug, agent_version_id, actor_user_id, status,
        input_hash, input_tokens, output_tokens, request_id, started_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'running', ?, ?, 0, ?, ?, ?)`,
  ).bind(
    runId, access.project.organization_id, agent.slug, agent.version_id, c.get("userId"),
    requestHash, Math.max(1, Math.ceil(prompt.length / 4)), c.get("requestId") || null,
    timestamp, timestamp,
  ).run();

  let raw = "";
  try {
    const maxTokens = Math.max(128, Math.min(request.format === "article" ? 1_800 : 1_000, agent.max_tokens || 800));
    const reservation = await reserveAiCost({
      db: c.env.DB,
      agentSlug: agent.slug,
      vendorId: "fin_vendor_cloudflare_ai",
      operation: "ai_project_content_draft",
      requestedUnits: Math.max(1, Math.ceil(prompt.length / 4)) + maxTokens,
      estimatedCostMinor: 0,
      idempotencyKey: `ai-run:${runId}`,
      requestId: c.get("requestId") || null,
    });
    if (reservation.decision !== "allowed") {
      await c.env.DB.prepare("UPDATE ai_runs SET status = ?, error_code = ?, completed_at = ? WHERE id = ?")
        .bind(reservation.decision === "waiting_for_budget_approval" || reservation.decision === "approval_required" ? "awaiting_approval" : "denied", reservation.reason, now(), runId).run();
      return c.json({ error: { code: reservation.decision, reason: reservation.reason } }, 409);
    }
    const output = await c.env.AI.run(resolveAgentModel(agent.model), {
      max_tokens: maxTokens,
      temperature: Math.max(0, Math.min(0.8, agent.temperature || 0.4)),
      messages: [{ role: "system", content: prompt }, { role: "user", content: "Creează ciorna solicitată." }],
    }) as { response?: string };
    raw = String(output?.response || "").trim();
    if (!raw) throw new Error("empty_model_response");
  } catch (error) {
    await c.env.DB.prepare("UPDATE ai_runs SET status = 'failed', error_code = ?, completed_at = ? WHERE id = ?")
      .bind(String((error as Error).message).slice(0, 120), now(), runId).run();
    return c.json({ error: { code: "generation_failed" } }, 502);
  }

  const generated = parseGeneratedContent(raw);
  const requiresTags = request.format !== "story" && request.format !== "message" && request.format !== "article";
  const tagMin = socialPolicy?.tag_min || 5;
  const tagMax = socialPolicy?.tag_max || 10;
  if (!generated.caption || (requiresTags && (generated.hashtags.length < tagMin || generated.hashtags.length > tagMax))) {
    await c.env.DB.prepare("UPDATE ai_runs SET status = 'failed', error_code = 'invalid_model_output', completed_at = ? WHERE id = ?")
      .bind(now(), runId).run();
    return c.json({ error: { code: "invalid_model_output" } }, 502);
  }
  const contentId = identifier("aic");
  const completedAt = now();
  const responseBody = {
    id: contentId, project_id: access.project.id, generated_by_agent: agent.slug,
    format: request.format, objective: request.objective, channels_json: JSON.stringify([request.channel]),
    title: generated.title, caption: generated.caption, visual_direction: generated.visualDirection,
    cta: generated.cta, hashtags_json: JSON.stringify(generated.hashtags.slice(0, tagMax)), status: "draft",
    scheduled_at: null, published_at: null,
    expires_at: contentExpiry(completedAt, access.project.content_retention_days),
    created_at: completedAt, updated_at: completedAt,
  };
  const responseJson = JSON.stringify({ data: responseBody, runId });
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO ai_content_items
        (id, project_id, created_by, generated_by_agent, format, objective,
         channels_json, title, caption, visual_direction, cta, hashtags_json,
         status, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    ).bind(
      contentId, access.project.id, c.get("userId"), agent.slug, request.format,
      request.objective, JSON.stringify([request.channel]), generated.title,
      generated.caption, generated.visualDirection, generated.cta,
      JSON.stringify(generated.hashtags.slice(0, tagMax)), responseBody.expires_at, completedAt, completedAt,
    ),
    c.env.DB.prepare(
      `INSERT INTO ai_run_steps
        (id, run_id, sequence, kind, name, status, output_json, started_at, completed_at, created_at)
       VALUES (?, ?, 0, 'model', 'content_draft', 'succeeded', ?, ?, ?, ?)`,
    ).bind(identifier("step"), runId, JSON.stringify({ contentId, format: request.format, channel: request.channel }), timestamp, completedAt, timestamp),
    c.env.DB.prepare("UPDATE ai_runs SET status = 'succeeded', output_tokens = ?, completed_at = ? WHERE id = ?")
      .bind(Math.max(1, Math.ceil(raw.length / 4)), completedAt, runId),
    c.env.DB.prepare(
      `INSERT INTO idempotency_keys
        (scope, idempotency_key, request_hash, response_status, response_json,
         resource_type, resource_id, created_at, expires_at)
       VALUES (?, ?, ?, 201, ?, 'ai_content', ?, ?, ?)`,
    ).bind(scope, idempotencyKey, requestHash, responseJson, contentId, completedAt, completedAt + 86_400_000),
    c.env.DB.prepare(
      `INSERT INTO ai_project_events
        (id, project_id, actor_user_id, action, target_type, target_id, metadata_json, created_at)
       VALUES (?, ?, ?, 'ai_project.content.generated', 'ai_content', ?, ?, ?)`,
    ).bind(identifier("aipe"), access.project.id, c.get("userId"), contentId, JSON.stringify({ format: request.format, channel: request.channel }), completedAt),
  ]);
  return c.json(JSON.parse(responseJson) as { data: typeof responseBody; runId: string }, 201);
});

aiProjectsRouter.patch("/api/ai-projects/:projectId/content/:contentId", async (c) => {
  const access = await projectAccess(c, c.req.param("projectId"));
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.canCreateContent) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<{ status?: string }>().catch(() => null);
  const next = String(body?.status || "");
  if (!["draft", "pending_approval", "approved", "rejected"].includes(next)) {
    return c.json({ error: { code: "invalid_content_state" } }, 400);
  }
  if (next === "approved" && !access.canManage) return c.json({ error: { code: "approval_required" } }, 403);
  const content = await c.env.DB.prepare(
    "SELECT id FROM ai_content_items WHERE id = ? AND project_id = ? AND status NOT IN ('published','expired')",
  ).bind(c.req.param("contentId"), access.project.id).first();
  if (!content) return c.json({ error: { code: "not_found" } }, 404);
  const timestamp = now();
  await c.env.DB.prepare(
    `UPDATE ai_content_items SET status = ?, approved_by = ?, approved_at = ?, updated_at = ?
      WHERE id = ? AND project_id = ?`,
  ).bind(
    next, next === "approved" ? c.get("userId") : null,
    next === "approved" ? timestamp : null, timestamp,
    c.req.param("contentId"), access.project.id,
  ).run();
  await event(c, access.project.id, `ai_project.content.${next}`, "ai_content", c.req.param("contentId"));
  return c.json({ ok: true });
});
