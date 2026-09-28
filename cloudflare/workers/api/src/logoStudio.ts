// Avyron Logo Studio — public endpoints.
//
//   POST /api/logo-studio/generate   brief → 4 concepts, chosen by a Workers AI model
//                                    in JSON mode from a closed vocabulary. The browser
//                                    draws them; nothing here renders images.
//   POST /api/logo-studio/orders     a finished concept + contact → lead in the CRM
//                                    (source logo-studio:static|dynamic) and an email to the
//                                    agency with a link that reproduces the exact logo.
//
// Free by design: the model runs on the account's Workers AI allocation, with per-IP
// and global daily caps. When AI is unavailable the page falls back to its local generator.

import { Hono } from "hono";
import type { Env } from "./types";
import { checkRateLimit, verifyTurnstile, clientIp, hashKey } from "./antispam";
import { deliverMail, logDelivery } from "./mailer";
import {
  CONCEPT_JSON_SCHEMA,
  STUDIO_PRICES,
  buildPrompt,
  cleanBrief,
  cleanConcept,
  encodeDesign,
  localConcepts,
  type LogoConcept,
} from "../../../../src/data/logoStudio";

export const logoStudioRouter = new Hono<{ Bindings: Env }>();

const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

type StudioEnv = Env & { LOGO_STUDIO_MODEL?: string; LOGO_STUDIO_DAILY_CAP?: string };

function parseModelOutput(output: unknown): unknown[] {
  const o = output as { response?: unknown } | null;
  let body: unknown = o && typeof o === "object" && "response" in o ? o.response : output;
  if (typeof body === "string") {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start < 0 || end <= start) return [];
    body = JSON.parse(body.slice(start, end + 1));
  }
  const concepts = (body as { concepts?: unknown })?.concepts;
  return Array.isArray(concepts) ? concepts : [];
}

logoStudioRouter.post("/api/logo-studio/generate", async (c) => {
  const env = c.env as StudioEnv;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const brief = cleanBrief((body.brief ?? {}) as Record<string, unknown>);
  if (!brief) return c.json({ error: "invalid_brief" }, 400);

  const ip = await hashKey(clientIp(c.req.raw));
  const cap = Math.max(1, Number(env.LOGO_STUDIO_DAILY_CAP) || 400);
  const rate = await checkRateLimit(env.DB, [
    { key: `logo-studio:ip:${ip}:h`, limit: 10, windowSec: 3600 },
    { key: `logo-studio:ip:${ip}:d`, limit: 30, windowSec: 86400 },
    { key: "logo-studio:global:d", limit: cap, windowSec: 86400 },
  ]);
  if (!rate.ok) return c.json({ error: "rate_limited", retryAfter: rate.retryAfter }, 429);
  if (!env.AI) return c.json({ error: "ai_unavailable" }, 503);

  const { system, user } = buildPrompt(brief);
  const fallback = localConcepts(brief, 4, "ai-fallback");
  try {
    const output = await env.AI.run(env.LOGO_STUDIO_MODEL || DEFAULT_MODEL, {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: CONCEPT_JSON_SCHEMA },
      max_tokens: 1100,
      temperature: 0.85,
    });
    const raw = parseModelOutput(output).slice(0, 4);
    if (raw.length === 0) return c.json({ error: "ai_empty" }, 502);
    const concepts: LogoConcept[] = raw.map((r, i) => cleanConcept(r, brief, fallback[i % fallback.length]));
    return c.json({ source: "ai", concepts });
  } catch (error) {
    console.error("logo-studio generate failed", error);
    return c.json({ error: "ai_failed" }, 502);
  }
});

logoStudioRouter.post("/api/logo-studio/orders", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const brief = cleanBrief((body.brief ?? {}) as Record<string, unknown>);
  const kind = body.kind === "dynamic" ? "dynamic" : "static";
  const name = clean(body.name, 120);
  const email = clean(body.email, 255).toLowerCase();
  const phone = clean(body.phone, 30);
  const company = clean(body.company, 160);
  const cui = clean(body.cui, 20);
  const turnstileToken = clean(body.turnstileToken, 4000);
  if (!brief || name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || phone.length < 5)
    return c.json({ error: "invalid_fields" }, 400);
  if (body.consent !== true) return c.json({ error: "consent_required" }, 400);
  const concept = cleanConcept(body.concept, brief, localConcepts(brief, 1)[0]);

  const ip = clientIp(c.req.raw);
  const emailKey = await hashKey(email);
  const rate = await checkRateLimit(
    c.env.DB,
    [
      { key: `logo-order:ip:${await hashKey(ip)}:h`, limit: 6, windowSec: 3600 },
      { key: `logo-order:mail:${emailKey}:d`, limit: 5, windowSec: 86400 },
    ],
    { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `logo-order:${emailKey}` },
  );
  if (!rate.ok) return c.json({ error: "rate_limited", retryAfter: rate.retryAfter }, 429);

  const turnstile = await verifyTurnstile(c.env.TURNSTILE_SECRET, turnstileToken, ip, {
    expectedAction: "logo-studio-order",
    allowedHostnames: c.env.TURNSTILE_ALLOWED_HOSTNAMES,
  });
  if (!turnstile.ok) return c.json({ error: "captcha_failed", reason: turnstile.reason }, 403);

  const price = STUDIO_PRICES[kind];
  const token = encodeDesign(brief, concept);
  const path = brief.lang === "en" ? "/en/services/logo/create" : "/servicii/logo/creeaza";
  const link = `https://avyron.ro${path}?design=${token}`;
  const id = crypto.randomUUID();
  const ts = Date.now();
  const message = [
    `Logo creat în Avyron Logo Studio (${kind === "dynamic" ? "dinamic 3D" : "static"}), ${price} lei.`,
    `Nume: ${brief.name}${brief.tagline ? ` — ${brief.tagline}` : ""}`,
    `Domeniu: ${brief.industry}, stil: ${brief.style}`,
    company ? `Firmă: ${company}${cui ? ` (CUI ${cui})` : ""}` : "",
    `Design: ${link}`,
  ]
    .filter(Boolean)
    .join("\n");

  await c.env.DB.prepare(
    `INSERT INTO leads (id,source,name,business,phone,email,message,website,language,attachments_json,product,config_json,estimate_ron,status,delivery_status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'new','pending',?,?)`,
  )
    .bind(
      id,
      `logo-studio:${kind}`,
      name,
      company || brief.name,
      phone,
      email,
      message,
      null,
      brief.lang,
      "[]",
      "logo-studio",
      JSON.stringify({ kind, price, brief, concept, cui: cui || null, link }),
      price,
      ts,
      ts,
    )
    .run();

  const to = c.env.LEAD_TO || c.env.SMTP_FROM;
  if (!to) {
    await c.env.DB.prepare("UPDATE leads SET delivery_status='failed',updated_at=? WHERE id=?").bind(Date.now(), id).run();
    return c.json({ ok: true, orderId: id, delivered: false }, 201);
  }
  const result = await deliverMail(c.env, {
    to,
    replyTo: email,
    subject: `Logo Studio — ${kind === "dynamic" ? "dinamic" : "static"} — ${brief.name} (${price} lei)`,
    text: `${message}\n\nClient: ${name}\nEmail: ${email}\nTelefon: ${phone}\nID: ${id}\n\nDeschide linkul de mai sus logat ca staff pentru a exporta fișierele după confirmarea plății.`,
  });
  await c.env.DB.prepare("UPDATE leads SET delivery_status=?,updated_at=? WHERE id=?")
    .bind(result.delivered ? "sent" : "failed", Date.now(), id)
    .run();
  await logDelivery(c.env, { kind: "logo_studio_order", entityId: id, recipient: to, result }).catch(() => undefined);
  return c.json({ ok: true, orderId: id, delivered: result.delivered }, 201);
});
