import { Hono, type Context } from "hono";
import type { AppBindings } from "./types";
import { checkRateLimit, clientIp, hashKey, verifyTurnstile } from "./antispam";
import { deliverMail, logDelivery } from "./mailer";
import {
  createResendBroadcast,
  resendMarketingStatus,
  ResendMarketingError,
  sendResendBroadcast,
  suppressResendContact,
  syncResendContact,
  verifyResendWebhook,
} from "./resendMarketing";
import { now, randomHex, sha256, signJwt, verifyJwt } from "./security";

type NewsletterSettings = {
  enabled: number;
  prompt_enabled: number;
  delay_seconds: number;
  min_page_views: number;
  scroll_percent: number;
  cooldown_days: number;
  title_ro: string;
  title_en: string;
  body_ro: string;
  body_en: string;
  cta_ro: string;
  cta_en: string;
  frequency_ro: string;
  frequency_en: string;
  consent_policy_version: string;
  updated_at: number;
};

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  language: "ro" | "en";
  status: "pending" | "active" | "unsubscribed" | "suppressed";
  source: string;
  interest: string | null;
  consent_policy_version: string;
  requested_at: number;
  confirmed_at: number | null;
  unsubscribed_at: number | null;
  last_seen_at: number;
  updated_at: number;
  resend_contact_id?: string | null;
  resend_synced_at?: number | null;
  resend_sync_error?: string | null;
};

const router = new Hono<AppBindings>();
const uuid = () => crypto.randomUUID();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const UNSUBSCRIBE_TTL_SECONDS = 10 * 365 * 24 * 60 * 60;

const cleanText = (value: unknown, max: number) => String(value || "").trim().slice(0, max);
const safeLanguage = (value: unknown): "ro" | "en" => value === "en" ? "en" : "ro";
const safeSource = (value: unknown) => cleanText(value, 80).replace(/[^a-zA-Z0-9_./:-]/g, "-") || "website";
const safeInterest = (value: unknown) => cleanText(value, 80).replace(/[^a-zA-Z0-9_./:-]/g, "-") || null;

const marketingError = (error: unknown) => error instanceof Error ? error.message.slice(0, 500) : "Eroare Resend";

async function syncSubscriberMarketing(env: AppBindings["Bindings"], subscriberId: string) {
  const subscriber = await env.DB.prepare(
    "SELECT id,email,name,language,status,interest FROM newsletter_subscribers WHERE id = ?",
  ).bind(subscriberId).first<Subscriber>();
  if (!subscriber) return;
  try {
    if (subscriber.status === "active") {
      const contactId = await syncResendContact(env, subscriber);
      await env.DB.prepare(
        "UPDATE newsletter_subscribers SET resend_contact_id=COALESCE(?,resend_contact_id),resend_synced_at=?,resend_sync_error=NULL WHERE id=?",
      ).bind(contactId, now(), subscriber.id).run();
    } else {
      await suppressResendContact(env, subscriber.email);
      await env.DB.prepare(
        "UPDATE newsletter_subscribers SET resend_synced_at=?,resend_sync_error=NULL WHERE id=?",
      ).bind(now(), subscriber.id).run();
    }
  } catch (error) {
    await env.DB.prepare("UPDATE newsletter_subscribers SET resend_sync_error=? WHERE id=?")
      .bind(marketingError(error), subscriber.id).run();
    throw error;
  }
}

const backgroundMarketingSync = (c: Context<AppBindings>, subscriberId: string) => {
  if (!resendMarketingStatus(c.env).configured) return;
  c.executionCtx.waitUntil(syncSubscriberMarketing(c.env, subscriberId).catch((error) =>
    console.error(JSON.stringify({ event: "newsletter_resend_sync_failed", subscriberId, error: marketingError(error) })),
  ));
};

async function settings(db: D1Database): Promise<NewsletterSettings> {
  const row = await db.prepare("SELECT * FROM newsletter_settings WHERE id = 'global'").first<NewsletterSettings>();
  if (!row) throw new Error("newsletter_settings_missing");
  return row;
}

const publicBaseUrl = (env: AppBindings["Bindings"]) => (env.APP_URL || "https://avyron.ro").replace(/\/$/, "");

const subscriberEvent = (
  db: D1Database,
  subscriberId: string,
  action: string,
  source: string,
  actorUserId: string | null,
  evidence: Record<string, unknown> = {},
) => db.prepare(
  "INSERT INTO newsletter_events (id,subscriber_id,action,source,actor_user_id,evidence_json,created_at) VALUES (?,?,?,?,?,?,?)",
).bind(uuid(), subscriberId, action, source, actorUserId, JSON.stringify(evidence), now());

async function unsubscribeToken(env: AppBindings["Bindings"], subscriberId: string) {
  return signJwt({ sub: subscriberId, purpose: "newsletter_unsubscribe" }, env.JWT_SECRET, UNSUBSCRIBE_TTL_SECONDS);
}

async function unsubscribeSubscriberId(env: AppBindings["Bindings"], token: string): Promise<string | null> {
  const payload = await verifyJwt<{ sub?: string; purpose?: string }>(token, env.JWT_SECRET);
  return payload?.sub && payload.purpose === "newsletter_unsubscribe" ? payload.sub : null;
}

router.get("/api/newsletter/config", async (c) => {
  const row = await settings(c.env.DB);
  c.header("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=3600");
  return c.json({
    data: {
      enabled: Boolean(row.enabled),
      promptEnabled: Boolean(row.prompt_enabled),
      delaySeconds: row.delay_seconds,
      minPageViews: row.min_page_views,
      scrollPercent: row.scroll_percent,
      cooldownDays: row.cooldown_days,
      title: { ro: row.title_ro, en: row.title_en },
      body: { ro: row.body_ro, en: row.body_en },
      cta: { ro: row.cta_ro, en: row.cta_en },
      frequency: { ro: row.frequency_ro, en: row.frequency_en },
      consentPolicyVersion: row.consent_policy_version,
      updatedAt: row.updated_at,
    },
  });
});

router.post("/api/newsletter/subscribe", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  if (cleanText(body.company, 200)) return c.json({ ok: true, confirmationRequired: true }, 202);

  const email = cleanText(body.email, 254).toLowerCase();
  const name = cleanText(body.name, 120) || null;
  const language = safeLanguage(body.language);
  const source = safeSource(body.source);
  const interest = safeInterest(body.interest);
  const turnstileToken = cleanText(body.turnstileToken, 4000);
  if (!EMAIL_RE.test(email)) return c.json({ error: { code: "invalid_email", message: "Adresa de email nu este validă" } }, 400);
  if (body.consent !== true) return c.json({ error: { code: "consent_required", message: "Consimțământul explicit este obligatoriu" } }, 400);

  const currentSettings = await settings(c.env.DB);
  if (!currentSettings.enabled) return c.json({ error: { code: "newsletter_disabled", message: "Înscrierile sunt momentan oprite" } }, 503);

  const ipHash = await hashKey(clientIp(c.req.raw));
  const emailHash = await hashKey(email);
  const rate = await checkRateLimit(c.env.DB, [
    { key: `newsletter:ip:${ipHash}:h`, limit: 8, windowSec: 3600 },
    { key: `newsletter:email:${emailHash}:d`, limit: 3, windowSec: 86400 },
  ], { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `newsletter:${ipHash}` });
  if (!rate.ok) return c.json({ error: { code: "rate_limited", message: "Ai încercat prea des. Revino puțin mai târziu." } }, 429, { "Retry-After": String(rate.retryAfter || 60) });

  const captcha = await verifyTurnstile(c.env.TURNSTILE_SECRET, turnstileToken, clientIp(c.req.raw), {
    expectedAction: "newsletter-subscribe",
    allowedHostnames: c.env.TURNSTILE_ALLOWED_HOSTNAMES,
  });
  if (!captcha.ok) return c.json({ error: { code: "captcha_failed", message: "Verificarea anti-spam a eșuat" } }, 403);

  const existing = await c.env.DB.prepare(
    "SELECT id,status FROM newsletter_subscribers WHERE email = ? COLLATE NOCASE",
  ).bind(email).first<{ id: string; status: Subscriber["status"] }>();

  // The response intentionally does not reveal whether an address already exists.
  if (existing?.status === "active" || existing?.status === "suppressed") {
    await c.env.DB.prepare("UPDATE newsletter_subscribers SET last_seen_at = ?, updated_at = ? WHERE id = ?")
      .bind(now(), now(), existing.id).run();
    return c.json({ ok: true, confirmationRequired: true }, 202);
  }

  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const timestamp = now();
  const subscriberId = existing?.id || uuid();
  const action = existing?.status === "unsubscribed" ? "resubscribed" : "requested";
  const evidence = language === "en"
    ? "Explicit consent in the AVYRON website newsletter form"
    : "Consimțământ explicit în formularul de newsletter al site-ului AVYRON";

  if (existing) {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE newsletter_subscribers SET name = ?, language = ?, status = 'pending', source = ?, interest = ?,
          consent_policy_version = ?, consent_evidence = ?, consent_ip_hash = ?, confirmation_token_hash = ?,
          confirmation_expires_at = ?, requested_at = ?, unsubscribed_at = NULL, last_seen_at = ?, updated_at = ? WHERE id = ?`,
      ).bind(name, language, source, interest, currentSettings.consent_policy_version, evidence, ipHash, tokenHash,
        timestamp + CONFIRMATION_TTL_MS, timestamp, timestamp, timestamp, subscriberId),
      subscriberEvent(c.env.DB, subscriberId, action, source, null, { language, interest, policyVersion: currentSettings.consent_policy_version }),
    ]);
  } else {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO newsletter_subscribers
          (id,email,name,language,status,source,interest,consent_policy_version,consent_evidence,consent_ip_hash,
           confirmation_token_hash,confirmation_expires_at,requested_at,last_seen_at,updated_at)
         VALUES (?,?,?,?,'pending',?,?,?,?,?,?,?,?,?,?)`,
      ).bind(subscriberId, email, name, language, source, interest, currentSettings.consent_policy_version,
        evidence, ipHash, tokenHash, timestamp + CONFIRMATION_TTL_MS, timestamp, timestamp, timestamp),
      subscriberEvent(c.env.DB, subscriberId, "requested", source, null, { language, interest, policyVersion: currentSettings.consent_policy_version }),
    ]);
  }

  const confirmationUrl = `${publicBaseUrl(c.env)}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const mail = await deliverMail(c.env, language === "en" ? {
    to: email,
    subject: "Confirm your AVYRON newsletter subscription",
    text: `Confirm your subscription using this link (valid for 24 hours):\n\n${confirmationUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Confirm your AVYRON newsletter subscription.</p><p><a href="${confirmationUrl}">Confirm subscription</a></p><p>The link is valid for 24 hours. If you did not request this, ignore this email.</p>`,
  } : {
    to: email,
    subject: "Confirmă abonarea la newsletterul AVYRON",
    text: `Confirmă abonarea folosind linkul de mai jos (valabil 24 de ore):\n\n${confirmationUrl}\n\nDacă nu ai făcut această solicitare, ignoră emailul.`,
    html: `<p>Confirmă abonarea la newsletterul AVYRON.</p><p><a href="${confirmationUrl}">Confirmă abonarea</a></p><p>Linkul este valabil 24 de ore. Dacă nu ai făcut această solicitare, ignoră emailul.</p>`,
  });
  c.executionCtx.waitUntil(logDelivery(c.env, { kind: "newsletter_confirmation", entityId: subscriberId, recipient: email, result: mail })
    .catch((error) => console.error(JSON.stringify({ event: "newsletter_delivery_log_failed", error: String(error) }))));
  if (!mail.delivered) console.error(JSON.stringify({ event: "newsletter_confirmation_delivery_failed", subscriberId, error: mail.error }));
  return c.json({ ok: true, confirmationRequired: true }, 202);
});

router.get("/api/newsletter/confirm", async (c) => {
  const token = cleanText(c.req.query("token"), 200);
  const destination = new URL(publicBaseUrl(c.env));
  destination.searchParams.set("newsletter", "confirmed");
  if (!token) {
    destination.searchParams.set("newsletter", "invalid");
    return c.redirect(destination.toString(), 302);
  }
  const tokenHash = await sha256(token);
  const row = await c.env.DB.prepare(
    "SELECT id,status,confirmation_expires_at FROM newsletter_subscribers WHERE confirmation_token_hash = ?",
  ).bind(tokenHash).first<{ id: string; status: Subscriber["status"]; confirmation_expires_at: number | null }>();
  if (!row || row.status !== "pending" || !row.confirmation_expires_at || row.confirmation_expires_at < now()) {
    destination.searchParams.set("newsletter", "invalid");
    return c.redirect(destination.toString(), 302);
  }
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE newsletter_subscribers SET status = 'active', confirmed_at = ?, confirmation_token_hash = NULL, confirmation_expires_at = NULL, updated_at = ? WHERE id = ?",
    ).bind(timestamp, timestamp, row.id),
    subscriberEvent(c.env.DB, row.id, "confirmed", "email_confirmation", null),
  ]);
  backgroundMarketingSync(c, row.id);
  return c.redirect(destination.toString(), 302);
});

router.get("/api/newsletter/unsubscribe", async (c) => {
  const subscriberId = await unsubscribeSubscriberId(c.env, cleanText(c.req.query("token"), 3000));
  if (!subscriberId) return c.json({ valid: false, reason: "invalid" }, 400);
  const row = await c.env.DB.prepare("SELECT status FROM newsletter_subscribers WHERE id = ?")
    .bind(subscriberId).first<{ status: Subscriber["status"] }>();
  if (!row) return c.json({ valid: false, reason: "invalid" }, 404);
  return c.json({ valid: row.status === "active", reason: row.status === "unsubscribed" ? "already_unsubscribed" : undefined });
});

router.post("/api/newsletter/unsubscribe", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const subscriberId = await unsubscribeSubscriberId(c.env, cleanText(body.token, 3000));
  if (!subscriberId) return c.json({ error: { code: "invalid_token" } }, 400);
  const row = await c.env.DB.prepare("SELECT status FROM newsletter_subscribers WHERE id = ?")
    .bind(subscriberId).first<{ status: Subscriber["status"] }>();
  if (!row) return c.json({ error: { code: "invalid_token" } }, 400);
  if (row.status === "unsubscribed") return c.json({ ok: true, reason: "already_unsubscribed" });
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = ?, updated_at = ? WHERE id = ?")
      .bind(timestamp, timestamp, subscriberId),
    subscriberEvent(c.env.DB, subscriberId, "unsubscribed", "self_service", null),
  ]);
  backgroundMarketingSync(c, subscriberId);
  return c.json({ ok: true });
});

router.post("/api/newsletter/resend/webhook", async (c) => {
  const payload = await c.req.text();
  let event;
  try {
    event = verifyResendWebhook(c.env, payload, c.req.raw.headers);
  } catch (error) {
    console.warn(JSON.stringify({ event: "resend_webhook_rejected", error: marketingError(error) }));
    return c.json({ error: { code: "invalid_signature" } }, 400);
  }
  const eventId = cleanText(c.req.header("svix-id"), 200);
  if (!eventId) return c.json({ error: { code: "missing_event_id" } }, 400);
  const data = event.data || {};
  const email = cleanText(data.email || (Array.isArray(data.to) ? data.to[0] : ""), 254).toLowerCase() || null;
  const campaign = typeof data.broadcast_id === "string"
    ? await c.env.DB.prepare("SELECT id FROM newsletter_campaigns WHERE provider_broadcast_id = ?")
      .bind(data.broadcast_id).first<{ id: string }>()
    : null;
  const recorded = await c.env.DB.prepare(
    `INSERT OR IGNORE INTO newsletter_provider_events
      (id,provider,event_type,email,campaign_id,payload_json,created_at,processed_at) VALUES (?,'resend',?,?,?,?,?,?)`,
  ).bind(eventId, event.type, email, campaign?.id || null, payload, Date.parse(event.created_at || "") || now(), 0).run();
  if (!recorded.meta.changes) {
    const stored = await c.env.DB.prepare("SELECT processed_at FROM newsletter_provider_events WHERE id=?")
      .bind(eventId).first<{ processed_at: number }>();
    if (stored?.processed_at) return c.json({ ok: true, duplicate: true });
  }

  if (email && event.type === "contact.updated" && data.unsubscribed === true) {
    const row = await c.env.DB.prepare("SELECT id,status FROM newsletter_subscribers WHERE email=? COLLATE NOCASE")
      .bind(email).first<{ id: string; status: Subscriber["status"] }>();
    if (row && row.status !== "unsubscribed") {
      const timestamp = now();
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE newsletter_subscribers SET status='unsubscribed',unsubscribed_at=?,resend_synced_at=?,resend_sync_error=NULL,updated_at=? WHERE id=?")
          .bind(timestamp, timestamp, timestamp, row.id),
        subscriberEvent(c.env.DB, row.id, "unsubscribed", "resend_webhook", null, { eventId }),
      ]);
    }
  }
  if (email && ["email.bounced", "email.complained", "email.suppressed"].includes(event.type)) {
    const row = await c.env.DB.prepare("SELECT id,status FROM newsletter_subscribers WHERE email=? COLLATE NOCASE")
      .bind(email).first<{ id: string; status: Subscriber["status"] }>();
    if (row && row.status !== "suppressed") {
      const timestamp = now();
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE newsletter_subscribers SET status='suppressed',resend_synced_at=?,resend_sync_error=NULL,updated_at=? WHERE id=?")
          .bind(timestamp, timestamp, row.id),
        subscriberEvent(c.env.DB, row.id, "suppressed", "resend_webhook", null, { eventId, type: event.type }),
      ]);
    }
  }
  await c.env.DB.prepare("UPDATE newsletter_provider_events SET processed_at=? WHERE id=?").bind(now(), eventId).run();
  return c.json({ ok: true });
});

router.get("/api/newsletter/admin", async (c) => {
  const status = ["pending", "active", "unsubscribed", "suppressed"].includes(c.req.query("status") || "") ? c.req.query("status")! : "";
  const query = cleanText(c.req.query("q"), 120);
  const page = Math.max(1, Math.min(10000, Number(c.req.query("page")) || 1));
  const limit = Math.max(10, Math.min(100, Number(c.req.query("limit")) || 50));
  const filters: string[] = [];
  const bindings: unknown[] = [];
  if (status) { filters.push("status = ?"); bindings.push(status); }
  if (query) { filters.push("(email LIKE ? OR name LIKE ? OR interest LIKE ? OR source LIKE ?)"); bindings.push(...Array(4).fill(`%${query}%`)); }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [summary, total, rows] = await Promise.all([
    c.env.DB.prepare("SELECT status, COUNT(*) AS count FROM newsletter_subscribers GROUP BY status").all<{ status: string; count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS count FROM newsletter_subscribers ${where}`).bind(...bindings).first<{ count: number }>(),
    c.env.DB.prepare(
      `SELECT id,email,name,language,status,source,interest,consent_policy_version,requested_at,confirmed_at,unsubscribed_at,last_seen_at,updated_at,
              resend_contact_id,resend_synced_at,resend_sync_error
       FROM newsletter_subscribers ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    ).bind(...bindings, limit, (page - 1) * limit).all<Subscriber>(),
  ]);
  const counts = Object.fromEntries(summary.results.map((item) => [item.status, item.count]));
  return c.json({ data: rows.results, meta: { page, limit, total: total?.count || 0, counts } });
});

router.get("/api/newsletter/admin/settings", async (c) => c.json({ data: await settings(c.env.DB) }));

router.get("/api/newsletter/admin/provider", async (c) => {
  const provider = resendMarketingStatus(c.env);
  const sync = await c.env.DB.prepare(
    `SELECT
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status='active' AND (resend_synced_at IS NULL OR resend_synced_at < updated_at OR resend_sync_error IS NOT NULL) THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN resend_sync_error IS NOT NULL THEN 1 ELSE 0 END) AS failed
     FROM newsletter_subscribers`,
  ).first<{ active: number | null; pending: number | null; failed: number | null }>();
  return c.json({ data: { ...provider, active: sync?.active || 0, pending: sync?.pending || 0, failed: sync?.failed || 0 } });
});

router.post("/api/newsletter/admin/provider/sync", async (c) => {
  if (!resendMarketingStatus(c.env).configured) {
    return c.json({ error: { code: "resend_unconfigured", message: "Configurează cheia, segmentul și expeditorul Resend" } }, 503);
  }
  const { results } = await c.env.DB.prepare(
    `SELECT id FROM newsletter_subscribers
      WHERE status='active' AND (resend_synced_at IS NULL OR resend_synced_at < updated_at OR resend_sync_error IS NOT NULL)
      ORDER BY updated_at ASC LIMIT 25`,
  ).all<{ id: string }>();
  let synced = 0;
  const failed: string[] = [];
  for (let index = 0; index < results.length; index += 3) {
    const chunk = results.slice(index, index + 3);
    await Promise.all(chunk.map(async ({ id }) => {
      try { await syncSubscriberMarketing(c.env, id); synced += 1; }
      catch { failed.push(id); }
    }));
  }
  return c.json({ data: { processed: results.length, synced, failed: failed.length, more: results.length === 25 } });
});

router.patch("/api/newsletter/admin/settings", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const current = await settings(c.env.DB);
  const booleanValue = (key: string, fallback: number) => typeof body[key] === "boolean" ? Number(body[key]) : fallback;
  const integerValue = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(body[key]);
    return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  };
  const textValue = (key: keyof NewsletterSettings, max: number) => cleanText(body[key], max) || String(current[key]);
  await c.env.DB.prepare(
    `UPDATE newsletter_settings SET enabled=?,prompt_enabled=?,delay_seconds=?,min_page_views=?,scroll_percent=?,cooldown_days=?,
      title_ro=?,title_en=?,body_ro=?,body_en=?,cta_ro=?,cta_en=?,frequency_ro=?,frequency_en=?,consent_policy_version=?,updated_by=?,updated_at=?
     WHERE id='global'`,
  ).bind(
    booleanValue("enabled", current.enabled), booleanValue("prompt_enabled", current.prompt_enabled),
    integerValue("delay_seconds", current.delay_seconds, 10, 600), integerValue("min_page_views", current.min_page_views, 1, 20),
    integerValue("scroll_percent", current.scroll_percent, 10, 95), integerValue("cooldown_days", current.cooldown_days, 1, 365),
    textValue("title_ro", 160), textValue("title_en", 160), textValue("body_ro", 600), textValue("body_en", 600),
    textValue("cta_ro", 100), textValue("cta_en", 100), textValue("frequency_ro", 220), textValue("frequency_en", 220),
    textValue("consent_policy_version", 80), c.get("userId"), now(),
  ).run();
  return c.json({ data: await settings(c.env.DB) });
});

router.post("/api/newsletter/admin/subscribers", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const email = cleanText(body.email, 254).toLowerCase();
  const evidence = cleanText(body.consentEvidence, 1000);
  if (!EMAIL_RE.test(email)) return c.json({ error: { code: "invalid_email", message: "Adresa nu este validă" } }, 400);
  if (evidence.length < 10) return c.json({ error: { code: "consent_evidence_required", message: "Notează dovada consimțământului (minimum 10 caractere)" } }, 400);
  const existing = await c.env.DB.prepare("SELECT id FROM newsletter_subscribers WHERE email = ? COLLATE NOCASE").bind(email).first();
  if (existing) return c.json({ error: { code: "subscriber_exists", message: "Adresa există deja în bază" } }, 409);
  const currentSettings = await settings(c.env.DB);
  const subscriberId = uuid();
  const timestamp = now();
  const source = safeSource(body.source || "manual-dashboard");
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO newsletter_subscribers
       (id,email,name,language,status,source,interest,consent_policy_version,consent_evidence,requested_at,confirmed_at,last_seen_at,updated_at)
       VALUES (?,?,?,?,'active',?,?,?,?,?,?,?,?)`,
    ).bind(subscriberId, email, cleanText(body.name, 120) || null, safeLanguage(body.language), source, safeInterest(body.interest),
      currentSettings.consent_policy_version, evidence, timestamp, timestamp, timestamp, timestamp),
    subscriberEvent(c.env.DB, subscriberId, "admin_added", source, c.get("userId"), { consentEvidence: evidence }),
  ]);
  backgroundMarketingSync(c, subscriberId);
  return c.json({ ok: true, id: subscriberId }, 201);
});

router.patch("/api/newsletter/admin/subscribers/:id", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const existing = await c.env.DB.prepare("SELECT * FROM newsletter_subscribers WHERE id = ?").bind(c.req.param("id")).first<Subscriber>();
  if (!existing) return c.json({ error: { code: "not_found", message: "Abonatul nu există" } }, 404);
  const status = ["pending", "active", "unsubscribed", "suppressed"].includes(String(body.status))
    ? String(body.status) as Subscriber["status"] : existing.status;
  if (status === "active" && existing.status !== "active") {
    return c.json({ error: { code: "fresh_consent_required", message: "Reactivarea necesită un nou acord confirmat prin email" } }, 409);
  }
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE newsletter_subscribers SET name=?,language=?,status=?,interest=?,source=?,
       confirmed_at=?,unsubscribed_at=?,updated_at=? WHERE id=?`,
    ).bind(
      body.name === undefined ? existing.name : cleanText(body.name, 120) || null,
      body.language === undefined ? existing.language : safeLanguage(body.language), status,
      body.interest === undefined ? existing.interest : safeInterest(body.interest),
      body.source === undefined ? existing.source : safeSource(body.source),
      status === "active" ? existing.confirmed_at || timestamp : existing.confirmed_at,
      status === "unsubscribed" ? existing.unsubscribed_at || timestamp : null,
      timestamp, existing.id,
    ),
    subscriberEvent(c.env.DB, existing.id, status === "suppressed" ? "suppressed" : "admin_updated", "dashboard", c.get("userId"), { status }),
  ]);
  if (status !== existing.status) backgroundMarketingSync(c, existing.id);
  return c.json({ ok: true });
});

const csvCell = (value: unknown) => {
  const raw = String(value ?? "").replace(/^([=+@-])/, "'$1");
  return `"${raw.replace(/"/g, '""')}"`;
};

router.get("/api/newsletter/admin/export.csv", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id,email,name,language,source,interest,confirmed_at FROM newsletter_subscribers WHERE status='active' ORDER BY confirmed_at DESC",
  ).all<Subscriber>();
  const records = await Promise.all(results.map(async (row) => [
    row.email, row.name, row.language, row.source, row.interest, row.confirmed_at,
    `${publicBaseUrl(c.env)}/unsubscribe?token=${encodeURIComponent(await unsubscribeToken(c.env, row.id))}`,
  ]));
  const csv = [
    ["email", "name", "language", "source", "interest", "confirmed_at", "unsubscribe_url"],
    ...records,
  ].map((record) => record.map(csvCell).join(",")).join("\r\n");
  c.header("content-type", "text/csv; charset=utf-8");
  c.header("content-disposition", `attachment; filename="avyron-newsletter-${new Date().toISOString().slice(0, 10)}.csv"`);
  return c.body(`\uFEFF${csv}`);
});

router.get("/api/newsletter/admin/campaigns", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM newsletter_campaigns ORDER BY updated_at DESC").all();
  return c.json({ data: results });
});

router.post("/api/newsletter/admin/campaigns", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const name = cleanText(body.name, 120);
  const subject = cleanText(body.subject, 160);
  const content = cleanText(body.content, 20000);
  if (name.length < 3 || subject.length < 3 || content.length < 10) {
    return c.json({ error: { code: "invalid_campaign", message: "Completează numele, subiectul și conținutul campaniei" } }, 400);
  }
  const timestamp = now();
  const id = uuid();
  const language = ["ro", "en", "all"].includes(String(body.language)) ? String(body.language) : "ro";
  await c.env.DB.prepare(
    `INSERT INTO newsletter_campaigns (id,name,language,subject,preheader,content,status,segment_json,created_by,updated_by,created_at,updated_at)
     VALUES (?,?,?,?,?,?,'draft',?,?,?, ?,?)`,
  ).bind(id, name, language, subject, cleanText(body.preheader, 220), content,
    JSON.stringify(typeof body.segment === "object" && body.segment ? body.segment : {}), c.get("userId"), c.get("userId"), timestamp, timestamp).run();
  return c.json({ ok: true, id }, 201);
});

router.patch("/api/newsletter/admin/campaigns/:id", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const existing = await c.env.DB.prepare("SELECT * FROM newsletter_campaigns WHERE id = ?").bind(c.req.param("id")).first<Record<string, unknown>>();
  if (!existing) return c.json({ error: { code: "not_found", message: "Campania nu există" } }, 404);
  if (existing.provider_broadcast_id && ["name", "language", "subject", "preheader", "content", "segment"].some((key) => body[key] !== undefined)) {
    return c.json({ error: { code: "provider_draft_locked", message: "Draftul creat în Resend este blocat; creează o campanie nouă pentru alt conținut" } }, 409);
  }
  const status = ["draft", "ready", "archived"].includes(String(body.status)) ? String(body.status) : String(existing.status);
  const language = ["ro", "en", "all"].includes(String(body.language)) ? String(body.language) : String(existing.language);
  await c.env.DB.prepare(
    "UPDATE newsletter_campaigns SET name=?,language=?,subject=?,preheader=?,content=?,status=?,segment_json=?,updated_by=?,updated_at=? WHERE id=?",
  ).bind(
    cleanText(body.name ?? existing.name, 120), language, cleanText(body.subject ?? existing.subject, 160),
    cleanText(body.preheader ?? existing.preheader, 220), cleanText(body.content ?? existing.content, 20000), status,
    body.segment === undefined ? String(existing.segment_json) : JSON.stringify(body.segment || {}), c.get("userId"), now(), c.req.param("id"),
  ).run();
  return c.json({ ok: true });
});

router.post("/api/newsletter/admin/campaigns/:id/resend-draft", async (c) => {
  const campaign = await c.env.DB.prepare("SELECT * FROM newsletter_campaigns WHERE id = ?")
    .bind(c.req.param("id")).first<Record<string, unknown>>();
  if (!campaign) return c.json({ error: { code: "not_found", message: "Campania nu există" } }, 404);
  if (campaign.provider_broadcast_id) {
    return c.json({ error: { code: "draft_exists", message: "Campania are deja un draft Resend" } }, 409);
  }
  if (campaign.status !== "ready") {
    return c.json({ error: { code: "campaign_not_ready", message: "Marchează campania ca pregătită înainte de exportul în Resend" } }, 409);
  }
  try {
    const providerId = await createResendBroadcast(c.env, {
      name: String(campaign.name), subject: String(campaign.subject), preheader: String(campaign.preheader || ""),
      content: String(campaign.content), language: campaign.language as "ro" | "en" | "all",
    });
    await c.env.DB.prepare(
      "UPDATE newsletter_campaigns SET provider_broadcast_id=?,provider_status='provider_draft',provider_error=NULL,updated_by=?,updated_at=? WHERE id=?",
    ).bind(providerId, c.get("userId"), now(), c.req.param("id")).run();
    return c.json({ data: { providerBroadcastId: providerId, providerStatus: "provider_draft" } }, 201);
  } catch (error) {
    await c.env.DB.prepare("UPDATE newsletter_campaigns SET provider_status='failed',provider_error=?,updated_by=?,updated_at=? WHERE id=?")
      .bind(marketingError(error), c.get("userId"), now(), c.req.param("id")).run();
    const status = error instanceof ResendMarketingError ? error.status : 502;
    return c.json({ error: { code: "resend_draft_failed", message: marketingError(error) } }, status as 400);
  }
});

router.post("/api/newsletter/admin/campaigns/:id/send", async (c) => {
  const campaign = await c.env.DB.prepare("SELECT * FROM newsletter_campaigns WHERE id = ?")
    .bind(c.req.param("id")).first<Record<string, unknown>>();
  if (!campaign) return c.json({ error: { code: "not_found", message: "Campania nu există" } }, 404);
  if (!campaign.provider_broadcast_id || campaign.provider_status !== "provider_draft") {
    return c.json({ error: { code: "provider_draft_required", message: "Creează și verifică mai întâi draftul Resend" } }, 409);
  }
  const provider = resendMarketingStatus(c.env);
  if (!provider.configured || !provider.webhook) {
    return c.json({ error: { code: "provider_safety_incomplete", message: "Configurează complet Resend și webhookul de feedback înainte de trimitere" } }, 503);
  }
  const unsynced = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM newsletter_subscribers WHERE status='active' AND (resend_synced_at IS NULL OR resend_synced_at < updated_at OR resend_sync_error IS NOT NULL)",
  ).first<{ count: number }>();
  if ((unsynced?.count || 0) > 0) {
    return c.json({ error: { code: "subscribers_not_synced", message: `Sincronizează mai întâi cei ${unsynced?.count || 0} abonați activi rămași` } }, 409);
  }
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const expected = `TRIMITE ${String(campaign.name)}`;
  if (body.confirmation !== expected) {
    return c.json({ error: { code: "confirmation_required", message: `Pentru confirmare scrie exact: ${expected}` } }, 400);
  }
  const scheduledAt = cleanText(body.scheduledAt, 80);
  if (scheduledAt && (!Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt) < Date.now() + 5 * 60 * 1000)) {
    return c.json({ error: { code: "invalid_schedule", message: "Programarea trebuie să fie cu minimum 5 minute în viitor" } }, 400);
  }
  try {
    await sendResendBroadcast(c.env, String(campaign.provider_broadcast_id), scheduledAt || undefined);
    const timestamp = now();
    const providerStatus = scheduledAt ? "scheduled" : "queued";
    await c.env.DB.prepare(
      "UPDATE newsletter_campaigns SET provider_status=?,scheduled_at=?,sent_at=?,provider_error=NULL,updated_by=?,updated_at=? WHERE id=?",
    ).bind(providerStatus, scheduledAt ? Date.parse(scheduledAt) : null, scheduledAt ? null : timestamp, c.get("userId"), timestamp, c.req.param("id")).run();
    return c.json({ data: { providerStatus, scheduledAt: scheduledAt || null } });
  } catch (error) {
    await c.env.DB.prepare("UPDATE newsletter_campaigns SET provider_status='provider_draft',provider_error=?,updated_by=?,updated_at=? WHERE id=?")
      .bind(marketingError(error), c.get("userId"), now(), c.req.param("id")).run();
    const status = error instanceof ResendMarketingError ? error.status : 502;
    return c.json({ error: { code: "resend_send_failed", message: marketingError(error) } }, status as 400);
  }
});

export const newsletterRouter = router;
