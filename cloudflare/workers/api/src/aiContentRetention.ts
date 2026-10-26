import type { Env } from "./types";
import { now } from "./security";

const THREE_DAYS = 3 * 86_400_000;
const TEMPORARY_STATES = "'draft','pending_approval','approved','rejected'";

type ExpiredContent = { id: string; r2_object_key: string | null };
type LinkedAsset = { id: string; r2_bucket: "files" | "media"; object_key: string };

/** Bounded hourly purge. Scheduled and published material stays in the audit trail. */
export async function cleanupAvyronEditorialContent(env: Env, timestamp = now()) {
  const project = await env.DB.prepare("SELECT id FROM ai_projects WHERE slug='avyron-web'").first<{ id: string }>();
  if (!project) return { content: 0, backups: 0 };
  const cutoff = timestamp - THREE_DAYS;
  const expired = await env.DB.prepare(
    `SELECT id,r2_object_key FROM ai_content_items WHERE project_id=?
       AND status IN (${TEMPORARY_STATES}) AND created_at<=? ORDER BY created_at LIMIT 50`,
  ).bind(project.id, cutoff).all<ExpiredContent>();
  let content = 0;
  for (const item of expired.results) {
    const assets = await env.DB.prepare(
      "SELECT id,r2_bucket,object_key FROM ai_social_assets WHERE content_id=?",
    ).bind(item.id).all<LinkedAsset>();
    for (const asset of assets.results) {
      await (asset.r2_bucket === "media" ? env.MEDIA : env.FILES).delete(asset.object_key);
    }
    if (item.r2_object_key) {
      const shared = await env.DB.prepare(
        `SELECT 1 AS found FROM ai_content_items WHERE r2_object_key=? AND id<>?
         UNION SELECT 1 AS found FROM ai_social_assets WHERE object_key=? AND (content_id IS NULL OR content_id<>?) LIMIT 1`,
      ).bind(item.r2_object_key, item.id, item.r2_object_key, item.id).first();
      if (!shared && !assets.results.some((asset) => asset.object_key === item.r2_object_key)) {
        await env.FILES.delete(item.r2_object_key);
        await env.MEDIA.delete(item.r2_object_key);
      }
    }
    await env.DB.batch([
      env.DB.prepare("DELETE FROM ai_social_assets WHERE content_id=?").bind(item.id),
      env.DB.prepare(
        `DELETE FROM ai_content_items WHERE id=? AND project_id=? AND status IN (${TEMPORARY_STATES}) AND created_at<=?`,
      ).bind(item.id, project.id, cutoff),
    ]);
    content++;
  }

  // Existing content backup manifests can contain drafts of any age. Remove
  // them immediately; Avyron WEB now allows configuration-only backups.
  const backups = await env.DB.prepare(
    `SELECT id,manifest_object_key FROM ai_social_backup_runs WHERE project_id=?
      AND scope IN ('content','full') ORDER BY started_at LIMIT 20`,
  ).bind(project.id).all<{ id: string; manifest_object_key: string | null }>();
  for (const backup of backups.results) {
    if (backup.manifest_object_key) await env.FILES.delete(backup.manifest_object_key);
    await env.DB.prepare("DELETE FROM ai_social_backup_runs WHERE id=? AND project_id=?")
      .bind(backup.id, project.id).run();
  }
  return { content, backups: backups.results.length };
}
