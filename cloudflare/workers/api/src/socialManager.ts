import type { Env } from "./types";
import type { SocialView } from "../../../../src/shared/socialEditorial";
import { socialAgentSnapshot, SOCIAL_DAY } from "./socialEditorial";
export const editorialStates = [
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "published",
  "rejected",
] as const;
export const socialContentColumns =
  "id,generated_by_agent,format,objective,channels_json,title,caption,visual_direction,cta,hashtags_json,status,scheduled_at,published_at,expires_at,created_at,updated_at,reusable,source_ref,source_revision,source_metadata_json,reused_from_id,archived_at";

export async function socialManagerSnapshot(
  env: Env,
  project: { id: string; slug: string; name: string; automation_mode: string },
  options: {
    status?: string;
    offset: number;
    view?: SocialView;
    query?: string;
  },
  canReview: boolean,
  canCreate: boolean,
  canPlan = false,
) {
  const timestamp = Date.now(),
    start = timestamp - SOCIAL_DAY,
    end = timestamp + SOCIAL_DAY,
    view = options.view || "focus";
  const valid =
    "(status IN('scheduled','published') OR ((expires_at IS NULL OR expires_at>?) AND created_at>?))";
  let scope = "project_id=?";
  const params: (string | number)[] = [project.id];
  if (view === "library") scope += " AND reusable=1";
  else if (view === "history") {
    scope +=
      " AND (archived_at IS NOT NULL OR status IN('published','rejected') OR coalesce(scheduled_at,created_at)<?)";
    params.push(start);
  } else {
    scope += ` AND archived_at IS NULL AND ${valid}`;
    params.push(
      timestamp,
      project.slug === "avyron-web" ? timestamp - 3 * SOCIAL_DAY : 0,
    );
    if (view === "upcoming") {
      scope += " AND scheduled_at>? AND status NOT IN('published','rejected')";
      params.push(timestamp);
    } else {
      scope +=
        " AND status NOT IN('published','rejected') AND coalesce(scheduled_at,created_at)>=? AND coalesce(scheduled_at,created_at)<=?";
      params.push(start, end);
    }
  }
  if (options.query) {
    scope += " AND (title LIKE ? OR caption LIKE ?)";
    params.push(`%${options.query}%`, `%${options.query}%`);
  }
  const jobScope =
    view === "history"
      ? "(archived_at IS NOT NULL OR due_at<? OR status IN('completed','skipped'))"
      : "archived_at IS NULL AND status NOT IN('completed','skipped') AND due_at>=?";
  const jobParams: (string | number)[] = [
    project.id,
    view === "upcoming" ? timestamp : start,
  ];
  const jobEnd =
    view === "focus"
      ? " AND due_at<=? AND (due_at>=? OR status<>'approved')"
      : "";
  if (view === "focus") jobParams.push(end, timestamp);
  const jobSearch = options.query ? " AND topic LIKE ?" : "";
  if (options.query) jobParams.push(`%${options.query}%`);
  const [counts, content, jobs, summary, integration] = await Promise.all([
    env.DB.prepare(
      `SELECT status,count(*) total,sum(CASE WHEN status IN('draft','pending_approval') OR scheduled_at>? THEN 1 ELSE 0 END) focus_total FROM ai_content_items WHERE ${scope} GROUP BY status`,
    )
      .bind(timestamp, ...params)
      .all<{ status: string; total: number; focus_total: number }>(),
    env.DB.prepare(
      `SELECT ${socialContentColumns} FROM ai_content_items WHERE ${scope} ${options.status ? "AND status=?" : view === "focus" ? "AND (status IN('draft','pending_approval') OR scheduled_at>?)" : ""} ORDER BY CASE status WHEN 'pending_approval' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,coalesce(scheduled_at,created_at),id LIMIT 30 OFFSET ?`,
    )
      .bind(
        ...params,
        ...(options.status ? [options.status] : []),
        ...(!options.status && view === "focus" ? [timestamp] : []),
        options.offset,
      )
      .all(),
    env.DB.prepare(
      `SELECT id,kind,format,primary_channel,topic,status,due_at,content_id,blog_post_id,last_error_code,updated_at,plan_review_state,plan_reviewed_by,plan_reviewed_at,archived_at,brief_json FROM ai_social_jobs WHERE project_id=? AND ${jobScope}${jobEnd}${jobSearch} ORDER BY due_at ${view === "history" ? "DESC" : "ASC"},id LIMIT 60`,
    )
      .bind(...jobParams)
      .all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT sum(CASE WHEN reusable=1 THEN 1 ELSE 0 END) reusable,sum(CASE WHEN archived_at IS NOT NULL THEN 1 ELSE 0 END) archived FROM ai_content_items WHERE project_id=?`,
    )
      .bind(project.id)
      .first(),
    socialAgentSnapshot(env, project.id),
  ]);
  const contentIds = [
    ...new Set(
      jobs.results.map((job) => String(job.content_id || "")).filter(Boolean),
    ),
  ];
  const linked = contentIds.length
    ? await env.DB.prepare(
        `SELECT ${socialContentColumns} FROM ai_content_items WHERE project_id=? AND id IN(SELECT value FROM json_each(?))`,
      )
        .bind(project.id, JSON.stringify(contentIds))
        .all()
    : { results: [] };
  const totals = Object.fromEntries(
    editorialStates.map((state) => [
      state,
      Number(counts.results.find((r) => r.status === state)?.total || 0),
    ]),
  );
  const total = options.status
    ? totals[options.status]
    : counts.results.reduce(
        (sum, row) =>
          sum + Number(view === "focus" ? row.focus_total : row.total),
        0,
      );
  return {
    project,
    permission: { canReview, canCreate, canPlan },
    counts: totals,
    content: content.results,
    total,
    nextOffset:
      options.offset + content.results.length < total
        ? options.offset + content.results.length
        : null,
    activities: view === "library" ? [] : jobs.results,
    activityContent: linked.results,
    scheduled: [],
    summary,
    integration,
    window: {
      start,
      end,
      view,
      timezone: integration.policy?.timezone || "Europe/Bucharest",
    },
    generatedAt: timestamp,
  };
}
