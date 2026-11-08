import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import {
  resendMarketingStatus,
  retrieveResendBroadcast,
} from "./resendMarketing";
const root = "/api/newsletter/admin";
export const newsletterOperationsRouter = new Hono<AppBindings>();
newsletterOperationsRouter.use(root + "/*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  if (!(await platformRoleForUser(c.env.DB, c.get("userId"))))
    return c.json({ error: { code: "forbidden" } }, 403);
  if (c.req.method !== "GET" && !(await privilegedMfaSatisfied(c)))
    return c.json({ error: { code: "mfa_required" } }, 403);
  await next();
});
newsletterOperationsRouter.get(root + "/operations", async (c) => {
  const db = c.env.DB;
  const [campaigns, events, interests, staff, contacts, last] =
    await Promise.all([
      db
        .prepare(
          "SELECT c.id,c.name,c.subject,c.language,c.status,c.provider_status,c.provider_raw_status,c.provider_checked_at,c.provider_error,c.provider_broadcast_id,c.assigned_user_id,c.operations_revision,c.scheduled_at,c.sent_at,c.updated_at,COALESCE(p.pseudonym,p.display_name,u.display_name) assigned_name FROM newsletter_campaigns c LEFT JOIN users u ON u.id=c.assigned_user_id LEFT JOIN profiles p ON p.id=u.id ORDER BY c.updated_at DESC LIMIT 200",
        )
        .all(),
      db
        .prepare(
          "SELECT event_type,count(*) events,count(DISTINCT email) recipients,max(created_at) latest FROM newsletter_provider_events WHERE processed_at>0 AND created_at>=? GROUP BY event_type",
        )
        .bind(Date.now() - 30 * 86400000)
        .all(),
      db
        .prepare(
          "SELECT COALESCE(NULLIF(interest,''),'General') interest,language,count(*) total FROM newsletter_subscribers WHERE status='active' GROUP BY interest,language ORDER BY total DESC LIMIT 50",
        )
        .all(),
      db
        .prepare(
          "SELECT u.id,COALESCE(p.pseudonym,p.display_name,u.display_name,'Membru staff') name FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.disabled_at IS NULL AND u.email_verified=1 AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin')) ORDER BY name LIMIT 200",
        )
        .all(),
      db
        .prepare(
          "SELECT count(*) total,SUM(status='active') active,SUM(status='pending') pending,SUM(status='active' AND (resend_synced_at IS NULL OR resend_synced_at<updated_at OR resend_sync_error IS NOT NULL)) awaitingSync,SUM(resend_sync_error IS NOT NULL) errors,max(resend_synced_at) lastSync FROM newsletter_subscribers",
        )
        .first(),
      db
        .prepare(
          "SELECT max(processed_at) lastWebhook FROM newsletter_provider_events WHERE processed_at>0",
        )
        .first(),
    ]);
  return c.json({
    provider: resendMarketingStatus(c.env),
    contacts,
    events: events.results,
    interests: interests.results,
    staff: staff.results,
    campaigns: campaigns.results,
    ...last,
    generatedAt: Date.now(),
    source: "D1 + webhookuri Resend verificate",
    periodDays: 30,
  });
});
newsletterOperationsRouter.patch(
  root + "/campaigns/:id/assignment",
  async (c) => {
    const parsed = z
      .object({
        userId: z.string().max(96).nullable(),
        revision: z.number().int().positive(),
      })
      .strict()
      .safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      return c.json({ error: { code: "invalid_assignment" } }, 400);
    const b = parsed.data,
      db = c.env.DB,
      id = c.req.param("id");
    if (
      b.userId &&
      !(await db
        .prepare(
          "SELECT 1 FROM users u WHERE u.id=? AND disabled_at IS NULL AND email_verified=1 AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))",
        )
        .bind(b.userId)
        .first())
    )
      return c.json({ error: { code: "invalid_staff" } }, 400);
    const before = await db
      .prepare(
        "SELECT operations_revision FROM newsletter_campaigns WHERE id=?",
      )
      .bind(id)
      .first<{ operations_revision: number }>();
    if (!before) return c.json({ error: { code: "not_found" } }, 404);
    if (before.operations_revision !== b.revision)
      return c.json({ error: { code: "revision_conflict" } }, 409);
    try {
      await db.batch([
        db
          .prepare(
            "UPDATE newsletter_campaigns SET assigned_user_id=?,operations_revision=CASE WHEN operations_revision=? THEN operations_revision+1 ELSE NULL END WHERE id=?",
          )
          .bind(b.userId, b.revision, id),
        db
          .prepare(
            "INSERT INTO audit_log(user_id,action,meta_json,created_at) VALUES(?,'newsletter.assignment',?,?)",
          )
          .bind(
            c.get("userId"),
            JSON.stringify({ id, userId: b.userId, revision: b.revision }),
            Date.now(),
          ),
      ]);
    } catch (error) {
      if (
        String(error).includes(
          "NOT NULL constraint failed: newsletter_campaigns.operations_revision",
        )
      )
        return c.json({ error: { code: "revision_conflict" } }, 409);
      throw error;
    }
    return c.json({ ok: true, revision: b.revision + 1 });
  },
);
newsletterOperationsRouter.post(root + "/operations/reconcile", async (c) => {
  if (!resendMarketingStatus(c.env).configured)
    return c.json(
      {
        error: {
          code: "resend_unconfigured",
          message:
            "Configurează Resend prin secretele existente ale Workerului.",
        },
      },
      503,
    );
  const rate = await checkRateLimit(c.env.DB, [
    { key: "newsletter:provider:reconcile", limit: 6, windowSec: 60 },
  ]);
  if (!rate.ok) return c.json({ error: { code: "rate_limited" } }, 429);
  const parsed = z
    .object({ campaignId: z.string().max(96).optional() })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json({ error: { code: "invalid_request" } }, 400);
  const rows = await c.env.DB.prepare(
    `SELECT id,provider_broadcast_id,operations_revision FROM newsletter_campaigns WHERE provider_broadcast_id IS NOT NULL ${parsed.data.campaignId ? "AND id=?" : ""} ORDER BY provider_checked_at,updated_at DESC LIMIT 5`,
  )
    .bind(...(parsed.data.campaignId ? [parsed.data.campaignId] : []))
    .all<{
      id: string;
      provider_broadcast_id: string;
      operations_revision: number;
    }>();
  if (parsed.data.campaignId && !rows.results.length)
    return c.json({ error: { code: "not_found" } }, 404);
  const result: { id: string; status: string; error?: string }[] = [];
  for (const row of rows.results) {
    try {
      const value = await retrieveResendBroadcast(
        c.env,
        row.provider_broadcast_id,
      );
      if (value.segmentId !== c.env.RESEND_MARKETING_SEGMENT_ID)
        throw new Error(
          "Segmentul Resend diferă de segmentul AVYRON configurat.",
        );
      const mapped = (
        {
          draft: "provider_draft",
          queued: "queued",
          scheduled: "scheduled",
          sent: "sent",
          failed: "failed",
          canceled: "failed",
        } as Record<string, string>
      )[value.status];
      if (!mapped)
        throw new Error(
          "Stare Resend nerecunoscută; înregistrarea locală este păstrată.",
        );
      const t = Date.now();
      const changed = await c.env.DB.prepare(
        "UPDATE newsletter_campaigns SET provider_status=?,provider_raw_status=?,provider_checked_at=?,sent_at=?,scheduled_at=?,provider_error=NULL,operations_revision=operations_revision+1 WHERE id=? AND operations_revision=? AND provider_broadcast_id=?",
      )
        .bind(
          mapped,
          value.status,
          t,
          Number.isFinite(value.sentAt) ? value.sentAt : null,
          Number.isFinite(value.scheduledAt) ? value.scheduledAt : null,
          row.id,
          row.operations_revision,
          row.provider_broadcast_id,
        )
        .run();
      result.push({
        id: row.id,
        status: changed.meta.changes ? mapped : "conflict",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 250)
          : "Citirea Resend nu a reușit.";
      result.push({ id: row.id, status: "failed", error: message });
    }
  }
  await c.env.DB.prepare(
    "INSERT INTO audit_log(user_id,action,meta_json,created_at) VALUES(?,'newsletter.reconcile',?,?)",
  )
    .bind(c.get("userId"), JSON.stringify({ result }), Date.now())
    .run();
  return c.json({ data: result, more: rows.results.length === 5 });
});
