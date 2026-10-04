import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";

export const surveyAdminRouter = new Hono<AppBindings>();

const surveyAccess = async (c: Context<AppBindings>) => {
  const roles = c.get("roles");
  const platformRole = await platformRoleForUser(c.env.DB, c.get("userId"));
  return { canRead: roles.includes("staff") || roles.includes("admin") || Boolean(platformRole), canEdit: roles.includes("admin") || Boolean(platformRole) };
};

const settingsSchema = z.object({
  retentionDays: z.number().int().min(7).max(1825),
  publicEnabled: z.boolean(),
  aiEnabled: z.boolean(),
}).strict();

const templateSchema = z.object({
  active: z.boolean(),
  publicVisible: z.boolean(),
}).strict();

surveyAdminRouter.get("/api/surveys/admin/overview", async (c) => {
  const access = await surveyAccess(c);
  if (!access.canRead) return c.json({ error: { code: "forbidden" } }, 403);
  try {
    const [settings, statuses, templates, recent, briefs] = await Promise.all([
      c.env.DB.prepare("SELECT retention_days,public_enabled,ai_enabled,updated_at FROM survey_settings WHERE id='global'").first(),
      c.env.DB.prepare("SELECT status,COUNT(*) AS total FROM surveys GROUP BY status ORDER BY total DESC").all(),
      c.env.DB.prepare("SELECT id,title,active,current_version_id,public_visible,updated_at FROM survey_templates ORDER BY active DESC,title").all(),
      c.env.DB.prepare(
        `SELECT s.id,s.title,s.status,s.completion,s.lead_id,s.client_id,s.project_id,s.updated_at,
                (SELECT r.revision FROM survey_responses r WHERE r.survey_id=s.id) AS response_revision,
                (SELECT b.status FROM survey_briefs b WHERE b.survey_id=s.id ORDER BY b.updated_at DESC LIMIT 1) AS brief_status
           FROM surveys s ORDER BY s.updated_at DESC LIMIT 50`,
      ).all(),
      c.env.DB.prepare("SELECT status,COUNT(*) AS total FROM survey_briefs GROUP BY status ORDER BY total DESC").all(),
    ]);
    return c.json({ settings, statuses: statuses.results, templates: templates.results, recent: recent.results, briefs: briefs.results, canEdit: access.canEdit });
  } catch (error) {
    if (/no such (table|column)/i.test(String(error))) return c.json({ error: { code: "surveys_unavailable" } }, 503);
    throw error;
  }
});

surveyAdminRouter.patch("/api/surveys/admin/settings", async (c) => {
  if (!(await surveyAccess(c)).canEdit) return c.json({ error: { code: "forbidden" } }, 403);
  const parsed = settingsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_survey_settings" } }, 400);
  const value = parsed.data;
  await c.env.DB.prepare(
    "UPDATE survey_settings SET retention_days=?,public_enabled=?,ai_enabled=?,updated_at=? WHERE id='global'",
  ).bind(value.retentionDays, value.publicEnabled ? 1 : 0, value.aiEnabled ? 1 : 0, Date.now()).run();
  return c.json({ ok: true });
});

surveyAdminRouter.patch("/api/surveys/admin/templates/:id", async (c) => {
  if (!(await surveyAccess(c)).canEdit) return c.json({ error: { code: "forbidden" } }, 403);
  const id = c.req.param("id");
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(id)) return c.json({ error: { code: "invalid_template" } }, 400);
  const parsed = templateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_template_settings" } }, 400);
  const result = await c.env.DB.prepare(
    "UPDATE survey_templates SET active=?,public_visible=?,retired_at=CASE WHEN ?=1 THEN NULL ELSE COALESCE(retired_at,?) END,updated_at=? WHERE id=?",
  ).bind(parsed.data.active ? 1 : 0, parsed.data.publicVisible ? 1 : 0, parsed.data.active ? 1 : 0, Date.now(), Date.now(), id).run();
  if (!result.meta.changes) return c.json({ error: { code: "template_not_found" } }, 404);
  return c.json({ ok: true });
});
