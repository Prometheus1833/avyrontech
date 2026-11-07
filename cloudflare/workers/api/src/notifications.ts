import { platformRoleForUser } from "./authorization";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { Hono } from "hono";
import type { AppBindings } from "./types";
import { readJsonBodyUpTo } from "./requestBody";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  notificationSettingsSchema,
  type NotificationSettings,
} from "../../../../src/shared/notifications";
import { filterNotifications, type StoredNotice } from "./notificationPolicy";

export const notificationsRouter = new Hono<AppBindings>();
notificationsRouter.use("/api/notifications*", async (c, next) => {
  if (c.req.path === "/api/notifications/config") return next();
  c.header("Cache-Control", "private, no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  if (!c.get("userId"))
    return c.json({ error: { code: "unauthenticated" } }, 401);
  if (c.req.path === "/api/notifications/admin") {
    if (!(await platformRoleForUser(c.env.DB, c.get("userId"))))
      return c.json({ error: { code: "forbidden" } }, 403);
    if (!(await privilegedMfaSatisfied(c)))
      return c.json({ error: { code: "mfa_required" } }, 403);
  }
  await next();
});

export async function notificationSettings(db: D1Database) {
  const row = await db
    .prepare(
      "SELECT revision,config_json,updated_at FROM notification_settings WHERE id=1",
    )
    .first<{ revision: number; config_json: string; updated_at: number }>();
  let config: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const parsed = notificationSettingsSchema.safeParse(
      JSON.parse(row?.config_json || "{}"),
    );
    if (parsed.success) config = parsed.data;
    else if (row?.config_json !== "{}")
      config = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        guest: { ...DEFAULT_NOTIFICATION_SETTINGS.guest, enabled: false },
      };
  } catch {
    config = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      guest: { ...DEFAULT_NOTIFICATION_SETTINGS.guest, enabled: false },
    };
  }
  return {
    config,
    revision: row?.revision ?? 0,
    updated_at: row?.updated_at ?? 0,
  };
}
notificationsRouter.get("/api/notifications/config", async (c) => {
  const { config } = await notificationSettings(c.env.DB);
  c.header("Cache-Control", "no-store");
  return c.json({ data: config.guest });
});
notificationsRouter.get("/api/notifications/admin", async (c) => {
  const settings = await notificationSettings(c.env.DB);
  const counts = await c.env.DB.prepare(
    "SELECT category,count(*) total,sum(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) unread FROM operation_notifications WHERE created_at>=? GROUP BY category",
  )
    .bind(Date.now() - 30 * 86400000)
    .all();
  return c.json({
    ...settings,
    counts: counts.results,
    transport: "in-app",
    windowDays: 30,
  });
});
notificationsRouter.put("/api/notifications/admin", async (c) => {
  const input = await readJsonBodyUpTo(c.req.raw, 16 * 1024);
  if (!input.ok) return c.json({ error: { code: input.error } }, 400);
  const body = input.value as { revision?: unknown; config?: unknown };
  const parsed = notificationSettingsSchema.safeParse(body?.config);
  if (
    !parsed.success ||
    !Number.isSafeInteger(body?.revision) ||
    Number(body.revision) < 0
  )
    return c.json(
      {
        error: {
          code: "invalid_settings",
          message: "Verifică textele și intervalele configurate.",
        },
      },
      400,
    );
  const revision = Number(body.revision),
    timestamp = Date.now(),
    json = JSON.stringify(parsed.data);
  // A failed CAS writes no history. batch is atomic; history records exactly the winning revision.
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE notification_settings SET config_json=?,revision=revision+1,updated_by=?,updated_at=? WHERE id=1 AND revision=?",
    ).bind(json, c.get("userId"), timestamp, revision),
    c.env.DB.prepare(
      "INSERT OR IGNORE INTO notification_settings_history(revision,config_json,actor_id,created_at) SELECT revision,config_json,updated_by,updated_at FROM notification_settings WHERE id=1 AND revision=? AND updated_by=? AND updated_at=?",
    ).bind(revision + 1, c.get("userId"), timestamp),
  ]);
  if (!result[0].meta.changes)
    return c.json(
      {
        error: {
          code: "revision_conflict",
          message:
            "Configurația a fost modificată. Reîncarcă înainte de salvare.",
        },
      },
      409,
    );
  return c.json({ revision: revision + 1, updated_at: timestamp });
});
async function visibleRows(
  db: D1Database,
  user: string,
  roles: AppBindings["Variables"]["roles"],
  before: number,
) {
  const rows = await db
    .prepare(
      "SELECT * FROM operation_notifications WHERE user_id=? AND created_at<=? ORDER BY created_at DESC,id DESC LIMIT 200",
    )
    .bind(user, before)
    .all<StoredNotice>();
  return filterNotifications(db, user, roles, rows.results);
}
notificationsRouter.get("/api/notifications", async (c) => {
  const user = c.get("userId"),
    db = c.env.DB,
    { config } = await notificationSettings(db);
  const preference = await db
    .prepare(
      "SELECT blog_enabled FROM notification_preferences WHERE user_id=?",
    )
    .bind(user)
    .first<{ blog_enabled: number }>();
  if (config.events.blog && preference?.blog_enabled !== 0) {
    // Bounded lazy fan-out: public articles only, never historical drafts or future publications.
    await db
      .prepare(
        `INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,resource_type,resource_id)
      SELECT lower(hex(randomblob(16))),?,'blog:'||b.id,b.title,b.excerpt,CASE WHEN b.language='en' THEN '/en/blog/' ELSE '/blog/' END||b.slug,b.published_at,'blog','blog',b.id
      FROM blog_posts b JOIN users u ON u.id=? WHERE b.status='published' AND b.language=? AND b.published_at BETWEEN max(u.created_at,?) AND ? ORDER BY b.published_at DESC LIMIT 5`,
      )
      .bind(
        user,
        user,
        c.req.query("lang") === "en" ? "en" : "ro",
        Date.now() - 14 * 86400000,
        Date.now(),
      )
      .run();
  }
  const items = await visibleRows(db, user, c.get("roles"), Date.now());
  const filtered =
    preference?.blog_enabled === 0
      ? items.filter((n) => n.category !== "blog")
      : items;
  return c.json({
    data: filtered
      .slice(0, 100)
      .map(
        ({
          id,
          title,
          body,
          destination,
          created_at,
          read_at,
          category,
          priority,
          deduplication_key,
        }) => ({
          id,
          title,
          body,
          destination,
          created_at,
          read_at,
          category: /^(document:|document-share:)/.test(deduplication_key || "")
            ? "document"
            : category,
          priority,
        }),
      ),
    blogEnabled: preference?.blog_enabled !== 0,
    windowLimit: 200,
  });
});
notificationsRouter.put("/api/notifications/preferences", async (c) => {
  const body = await readJsonBodyUpTo(c.req.raw, 1024);
  if (
    !body.ok ||
    typeof (body.value as { blogEnabled?: unknown })?.blogEnabled !== "boolean"
  )
    return c.json({ error: { code: "invalid_input" } }, 400);
  await c.env.DB.prepare(
    "INSERT INTO notification_preferences(user_id,blog_enabled,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET blog_enabled=excluded.blog_enabled,updated_at=excluded.updated_at",
  )
    .bind(
      c.get("userId"),
      (body.value as { blogEnabled: boolean }).blogEnabled ? 1 : 0,
      Date.now(),
    )
    .run();
  return c.json({ ok: true });
});
notificationsRouter.post("/api/notifications/:id/read", async (c) => {
  const user = c.get("userId"),
    id = c.req.param("id");
  const rows = await c.env.DB.prepare(
    "SELECT * FROM operation_notifications WHERE id=? AND user_id=?",
  )
    .bind(id, user)
    .all<StoredNotice>();
  const visible = await filterNotifications(
    c.env.DB,
    user,
    c.get("roles"),
    rows.results,
  );
  if (!visible.length) return c.json({ error: { code: "not_found" } }, 404);
  await c.env.DB.prepare(
    "UPDATE operation_notifications SET read_at=coalesce(read_at,?) WHERE id=? AND user_id=?",
  )
    .bind(Date.now(), id, user)
    .run();
  return c.json({ ok: true });
});
