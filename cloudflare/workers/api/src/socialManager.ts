import type { Env } from "./types";

export const editorialStates = [
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "published",
  "rejected",
] as const;
export async function socialManagerSnapshot(
  env: Env,
  project: { id: string; slug: string; name: string; automation_mode: string },
  options: { status?: string; offset: number },
  canReview: boolean,
  canCreate: boolean,
) {
  const timestamp = Date.now();
  const valid = `project_id=? AND status<>'expired' AND (status IN ('scheduled','published') OR ((expires_at IS NULL OR expires_at>?) AND created_at>?))`;
  const values = [
    project.id,
    timestamp,
    project.slug === "avyron-web" ? timestamp - 3 * 86400000 : 0,
  ];
  const [counts, content, jobs, scheduled] = await Promise.all([
    env.DB.prepare(
      `SELECT status,count(*) total FROM ai_content_items WHERE ${valid} GROUP BY status`,
    )
      .bind(...values)
      .all<{ status: string; total: number }>(),
    env.DB.prepare(
      `SELECT id,generated_by_agent,format,objective,channels_json,title,caption,visual_direction,cta,hashtags_json,status,scheduled_at,published_at,expires_at,created_at,updated_at FROM ai_content_items WHERE ${valid} ${options.status ? "AND status=?" : "AND status IN ('draft','pending_approval')"} ORDER BY created_at DESC,id LIMIT 30 OFFSET ?`,
    )
      .bind(
        ...values,
        ...(options.status ? [options.status] : []),
        options.offset,
      )
      .all(),
    env.DB.prepare(
      `SELECT id,kind,format,primary_channel,topic,status,due_at,content_id,blog_post_id,last_error_code,updated_at FROM ai_social_jobs WHERE project_id=? AND status IN('queued','generating','draft_ready','awaiting_budget','awaiting_approval','approved','failed') ORDER BY due_at,id LIMIT 60`,
    )
      .bind(project.id)
      .all(),
    env.DB.prepare(
      `SELECT id,title,channels_json,scheduled_at,status FROM ai_content_items WHERE project_id=? AND status='scheduled' ORDER BY scheduled_at,id LIMIT 60`,
    )
      .bind(project.id)
      .all(),
  ]);
  const totals = Object.fromEntries(
    editorialStates.map((state) => [
      state,
      Number(counts.results.find((r) => r.status === state)?.total || 0),
    ]),
  );
  const total = options.status
    ? totals[options.status]
    : totals.draft + totals.pending_approval;
  return {
    project,
    permission: { canReview, canCreate },
    counts: totals,
    content: content.results,
    total,
    nextOffset:
      options.offset + content.results.length < total
        ? options.offset + content.results.length
        : null,
    activities: jobs.results,
    scheduled: scheduled.results,
    generatedAt: timestamp,
  };
}
