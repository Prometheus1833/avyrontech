import { Hono, type Context } from "hono";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";
import { resolveAgentModel } from "./agentRuntimePolicy";
import { reserveAiCost } from "./aiCostGuard";
import { now, sha256 } from "./security";
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
aiProjectsRouter.use("*", async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !c.get("mfaVerified")) {
    return c.json({ error: { code: "mfa_required" } }, 403);
  }
  await next();
});

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
  const [channels, agents, content, memories, competitors, members, events] = await Promise.all([
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
  await event(c, access.project.id, "ai_project.channel.update", "channel", provider, { status });
  return c.json({ ok: true });
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

  const memories = await c.env.DB.prepare(
    `SELECT kind, summary FROM ai_project_memories
      WHERE project_id = ? AND status = 'approved' AND expires_at > ?
      ORDER BY confidence DESC, observed_at DESC LIMIT 8`,
  ).bind(access.project.id, now()).all<{ kind: string; summary: string }>();
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
    const maxTokens = Math.max(128, Math.min(900, agent.max_tokens || 800));
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
  if (!generated.caption) {
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
    cta: generated.cta, hashtags_json: JSON.stringify(generated.hashtags), status: "draft",
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
      JSON.stringify(generated.hashtags), responseBody.expires_at, completedAt, completedAt,
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
