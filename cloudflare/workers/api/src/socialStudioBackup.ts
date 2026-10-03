import type { Env } from "./types";
import { now, sha256 } from "./security";

export const SOCIAL_BACKUP_SCHEMA_VERSION = 38;

export type SocialBackupScope = "configuration" | "content" | "full";

type BackupCollections = Record<string, unknown[]>;

export type SocialBackupDocument = {
  format: "avyron-social-studio-backup";
  schemaVersion: number;
  projectId: string;
  scope: SocialBackupScope;
  createdAt: string;
  exclusions: string[];
  data: BackupCollections;
  rowCounts: Record<string, number>;
};

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;

export const socialBackupObjectKey = (projectId: string, backupId: string, timestamp: number) => {
  const date = new Date(timestamp).toISOString().slice(0, 10);
  return `ai-projects/${projectId}/social-studio/backups/${date}/${backupId}.json`;
};

export function buildSocialBackupDocument(
  projectId: string,
  scope: SocialBackupScope,
  timestamp: number,
  data: BackupCollections,
): SocialBackupDocument {
  return {
    format: "avyron-social-studio-backup",
    schemaVersion: SOCIAL_BACKUP_SCHEMA_VERSION,
    projectId,
    scope,
    createdAt: new Date(timestamp).toISOString(),
    exclusions: [
      "access_tokens", "refresh_tokens", "cookies", "session_data",
      "connector_secrets", "connection_ids", "private_messages",
    ],
    data,
    rowCounts: Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.length])),
  };
}

async function rows(env: Env, query: string, projectId: string) {
  const result = await env.DB.prepare(query).bind(projectId).all<Record<string, unknown>>();
  return result.results;
}

async function collectBackupData(env: Env, projectId: string, scope: SocialBackupScope): Promise<BackupCollections> {
  const [project, policy, designProfiles, channels, agents, toolPolicies] = await Promise.all([
    rows(env, `SELECT id,slug,name,status,primary_objective,automation_mode,brand_tone,target_audience,
                      core_offer,agent_instructions,content_retention_days,daily_generation_limit,updated_at
                 FROM ai_projects WHERE id=?`, projectId),
    rows(env, "SELECT * FROM ai_social_policies WHERE project_id=?", projectId),
    rows(env, `SELECT id,version,status,profile_json,source_sha256,source_object_key,
                      created_at,approved_at,updated_at
                 FROM ai_social_design_profiles WHERE project_id=? ORDER BY version`, projectId),
    rows(env, `SELECT provider,account_label,connection_status,allowed_actions_json,
                      last_analyzed_at,last_synced_at,last_error_code,updated_at
                 FROM ai_project_channels WHERE project_id=? ORDER BY provider`, projectId),
    rows(env, `SELECT assigned.agent_slug,assigned.role,assigned.status,assigned.autonomy,
                      assigned.capabilities_json,assigned.instructions,assigned.quality_score,
                      registry.current_version
                 FROM ai_project_agents assigned JOIN ai_agents registry ON registry.slug=assigned.agent_slug
                WHERE assigned.project_id=? ORDER BY assigned.role`, projectId),
    rows(env, `SELECT provider,capability,billing_mode,status,requires_approval,max_calls_per_day,
                      notes,last_checked_at,updated_at
                 FROM ai_social_tool_policies WHERE project_id=? ORDER BY provider,capability`, projectId),
  ]);
  const data: BackupCollections = { project, policy, designProfiles, channels, agents, toolPolicies };

  if (scope === "content" || scope === "full") {
    const [content, variants, assets, reviews] = await Promise.all([
      rows(env, `SELECT id,generated_by_agent,format,objective,channels_json,title,caption,visual_direction,
                        cta,hashtags_json,status,scheduled_at,published_at,expires_at,created_at,updated_at
                   FROM ai_content_items WHERE project_id=? ORDER BY created_at`, projectId),
      rows(env, `SELECT variant.id,variant.content_id,variant.channel,variant.caption,variant.hashtags_json,
                        variant.media_brief,variant.accessibility_alt,variant.cta,variant.scheduled_at,variant.status,
                        variant.remote_id,variant.link_url,variant.link_strategy,variant.native_elements_json,
                        variant.safe_zone_json,variant.background_direction,variant.asset_group_id,
                        variant.quality_score,variant.published_preview_object_key,variant.created_at,variant.updated_at
                   FROM ai_social_variants variant JOIN ai_content_items content ON content.id=variant.content_id
                  WHERE content.project_id=? ORDER BY variant.created_at`, projectId),
      rows(env, `SELECT id,content_id,asset_group_id,channel,role,r2_bucket,object_key,mime_type,width,height,
                        duration_ms,byte_size,sha256,provenance_json,status,created_at,updated_at
                   FROM ai_social_assets WHERE project_id=? ORDER BY created_at`, projectId),
      rows(env, `SELECT review.id,review.content_id,review.reviewer_agent,review.decision,review.score,
                        review.checks_json,review.notes,review.created_at
                   FROM ai_social_quality_reviews review JOIN ai_content_items content ON content.id=review.content_id
                  WHERE content.project_id=? ORDER BY review.created_at`, projectId),
    ]);
    Object.assign(data, { content, variants, assets, reviews });
  }

  if (scope === "full") {
    const [sources, jobs] = await Promise.all([
      rows(env, `SELECT id,kind,title,canonical_url,source_label,scope,evidence_hash,evidence_json,insight,
                        status,observed_at,expires_at,created_at,updated_at
                   FROM ai_social_sources WHERE project_id=? ORDER BY observed_at`, projectId),
      rows(env, `SELECT id,schedule_key,kind,format,primary_channel,topic,brief_json,status,due_at,
                        content_id,blog_post_id,attempt_count,last_error_code,created_at,updated_at,completed_at
                   FROM ai_social_jobs WHERE project_id=? ORDER BY due_at`, projectId),
    ]);
    Object.assign(data, { sources, jobs });
  }
  return data;
}

export async function createSocialStudioBackup(
  env: Env,
  projectId: string,
  actorUserId: string,
  scope: SocialBackupScope = "configuration",
) {
  const backupId = identifier("asb");
  const timestamp = now();
  const objectKey = socialBackupObjectKey(projectId, backupId, timestamp);
  await env.DB.prepare(
    `INSERT INTO ai_social_backup_runs
      (id,project_id,scope,status,schema_version,created_by,started_at)
     VALUES (?,?,?,'creating',?,?,?)`,
  ).bind(backupId, projectId, scope, SOCIAL_BACKUP_SCHEMA_VERSION, actorUserId, timestamp).run();

  try {
    const data = await collectBackupData(env, projectId, scope);
    const document = buildSocialBackupDocument(projectId, scope, timestamp, data);
    const payload = JSON.stringify(document, null, 2);
    const checksum = await sha256(payload);
    const bytes = new TextEncoder().encode(payload).byteLength;
    await env.FILES.put(objectKey, payload, {
      httpMetadata: { contentType: "application/json; charset=UTF-8" },
      customMetadata: {
        projectId,
        backupId,
        scope,
        schemaVersion: String(SOCIAL_BACKUP_SCHEMA_VERSION),
        sha256: checksum,
      },
    });
    const completedAt = now();
    await env.DB.prepare(
      `UPDATE ai_social_backup_runs
          SET status='verified',manifest_object_key=?,manifest_sha256=?,byte_size=?,
              row_counts_json=?,completed_at=?,verified_at=?,last_error_code=NULL
        WHERE id=? AND project_id=?`,
    ).bind(
      objectKey, checksum, bytes, JSON.stringify(document.rowCounts),
      completedAt, completedAt, backupId, projectId,
    ).run();
    return { id: backupId, status: "verified" as const, sha256: checksum, byteSize: bytes, rowCounts: document.rowCounts };
  } catch (error) {
    await env.DB.prepare(
      "UPDATE ai_social_backup_runs SET status='failed',last_error_code=?,completed_at=? WHERE id=? AND project_id=?",
    ).bind(String((error as Error).message || "backup_failed").slice(0, 160), now(), backupId, projectId).run();
    throw error;
  }
}
