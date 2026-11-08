import type { Env } from "./types";
import { editorialExpiry } from "./aiProjectPolicy";
import { sha256 } from "./security";
import type { SocialDraft } from "../../../../src/shared/socialEditorial";

export const SOCIAL_DAY = 86400000;
const id = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;

/** Only the queue is archived. Reusable materials, approvals and delivery evidence survive. */
export async function archivePastSocialJobs(
  env: Pick<Env, "DB">,
  timestamp: number,
  projectId?: string,
) {
  const result = await env.DB.prepare(
    `UPDATE ai_social_jobs SET archived_at=?
    WHERE archived_at IS NULL AND due_at<? AND status<>'generating' ${projectId ? "AND project_id=?" : ""}`,
  )
    .bind(timestamp, timestamp - SOCIAL_DAY, ...(projectId ? [projectId] : []))
    .run();
  return Number(result.meta.changes || 0);
}

export async function createSocialDraft(
  env: Pick<Env, "DB">,
  project: { id: string; slug: string; content_retention_days: number },
  actor: string | null,
  draft: SocialDraft,
  reusedFrom: string | null = null,
  intentKey?: string,
) {
  const hash = await sha256(JSON.stringify(draft));
  // A source/revision or stable UI intent identifies one import, never a second copy on retry.
  const sourceRef =
    draft.sourceRef || (intentKey ? `manual:${actor}:${intentKey}` : null);
  const sourceRevision = draft.sourceRevision || (sourceRef ? "1" : null);
  const previous = sourceRef
    ? await env.DB.prepare(
        "SELECT id,source_metadata_json FROM ai_content_items WHERE project_id=? AND source_ref=? AND source_revision=?",
      )
        .bind(project.id, sourceRef, sourceRevision)
        .first<{ id: string; source_metadata_json: string }>()
    : null;
  if (previous)
    return JSON.parse(previous.source_metadata_json).inputHash === hash
      ? { id: previous.id, replayed: true }
      : { error: "source_revision_changed" as const };
  if (draft.provenance.assetIds.length) {
    const assets = await env.DB.prepare(
      "SELECT count(*) total FROM ai_social_assets WHERE project_id=? AND status='active' AND id IN(SELECT value FROM json_each(?))",
    )
      .bind(project.id, JSON.stringify([...new Set(draft.provenance.assetIds)]))
      .first<{ total: number }>();
    if (assets?.total !== new Set(draft.provenance.assetIds).size)
      return { error: "asset_not_authorized" as const };
  }
  const timestamp = Date.now(),
    contentId = id("aic"),
    metadata = JSON.stringify({
      ...draft.provenance,
      variants: draft.variants,
      inputHash: hash,
    });
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO ai_content_items(id,project_id,created_by,generated_by_agent,format,objective,channels_json,title,caption,visual_direction,cta,hashtags_json,
      status,scheduled_at,expires_at,created_at,updated_at,reusable,source_ref,source_revision,source_metadata_json,reused_from_id)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      contentId,
      project.id,
      actor,
      sourceRef?.startsWith("manual:") ? null : "ai-prod-content",
      draft.format,
      draft.objective,
      JSON.stringify(draft.channels),
      draft.title,
      draft.caption,
      draft.visualDirection,
      draft.cta,
      JSON.stringify(draft.hashtags),
      draft.requestApproval ? "pending_approval" : "draft",
      draft.scheduledAt,
      editorialExpiry(timestamp, project.slug, project.content_retention_days),
      timestamp,
      timestamp,
      draft.reusable ? 1 : 0,
      sourceRef,
      sourceRevision,
      metadata,
      reusedFrom,
    ),
    env.DB.prepare(
      `INSERT INTO ai_project_events(id,project_id,actor_user_id,action,target_type,target_id,metadata_json,created_at)
      VALUES(?,?,?,'social_studio.draft.import','ai_content',?,?,?)`,
    ).bind(
      id("aipe"),
      project.id,
      actor,
      contentId,
      JSON.stringify({ sourceRef, sourceRevision, reusedFrom }),
      timestamp,
    ),
  ]);
  return { id: contentId, replayed: false };
}

export async function socialAgentSnapshot(
  env: Pick<Env, "DB">,
  projectId: string,
) {
  const [agent, operators, policy, handoff, channels] = await Promise.all([
    env.DB.prepare(
      "SELECT slug,name,status,current_version,model,updated_at FROM ai_agents WHERE slug='ai-prod-content'",
    ).first(),
    env.DB.prepare(
      "SELECT agent_slug,operator_role,status,synced_at FROM agent_operator_bindings WHERE project_id=? AND agent_slug='ai-prod-content'",
    )
      .bind(projectId)
      .all(),
    env.DB.prepare(
      "SELECT strategy_json,timezone,status,last_planned_at,time_slots_json FROM ai_social_policies WHERE project_id=?",
    )
      .bind(projectId)
      .first<{
        strategy_json: string;
        timezone: string;
        status: string;
        last_planned_at: number | null;
        time_slots_json: string;
      }>(),
    env.DB.prepare(
      "SELECT max(created_at) lastHandoffAt FROM ai_project_events WHERE project_id=? AND action IN('social_studio.codex.import','social_studio.draft.import')",
    )
      .bind(projectId)
      .first(),
    env.DB.prepare(
      `SELECT ch.provider,ch.account_label,ch.connection_status,cn.status verified_status,cn.last_validated_at
      FROM ai_project_channels ch LEFT JOIN source_connections cn ON cn.id=ch.connection_id WHERE ch.project_id=?`,
    )
      .bind(projectId)
      .all(),
  ]);
  return {
    agent,
    operators: operators.results,
    policy: policy
      ? { ...policy, strategy: JSON.parse(policy.strategy_json) }
      : null,
    handoff,
    channels: channels.results,
  };
}
