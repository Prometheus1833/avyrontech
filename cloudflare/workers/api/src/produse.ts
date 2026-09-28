// Cererile venite din pagina Produse Avyron.
//   POST /api/produse/requests  (application/json)
//     { kind: "feature" | "brief", email, message, selection?, category?, urgency?, lang, turnstileToken? }
//
// Fluxul: anti-spam (honeypot implicit prin Turnstile + rate limit) → salvare
// în `leads` (deci cererea apare direct în Leaduri & CRM din AVYRON OS) →
// notificare pe e-mailul agenției prin SMTP.
//
// De ce `leads` și nu un tabel nou: cererile astea sunt leaduri. Tabelele
// proprii ale magazinului (catalog, drepturi de acces, limite zilnice) intră
// în migrarea 0025, odată cu checkout-ul.

import { Hono } from "hono";
import type { Env } from "./types";
import { deliverMail, logDelivery } from "./mailer";
import { checkRateLimit, clientIp, hashKey, verifyTurnstile } from "./antispam";

export const produseRouter = new Hono<{ Bindings: Env }>();

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const esc = (value: string) => value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const KINDS = new Set(["feature", "brief"]);

produseRouter.post("/api/produse/requests", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const kind = clean(body.kind, 16);
  const email = clean(body.email, 255).toLowerCase();
  const message = clean(body.message, 2000);
  const category = clean(body.category, 200);
  const urgency = clean(body.urgency, 24);
  const lang = clean(body.lang, 5) || "ro";
  const selection = Array.isArray(body.selection) ? body.selection.slice(0, 40).map((entry) => clean(entry, 120)) : [];
  const turnstileToken = clean(body.turnstileToken, 4000);

  if (!KINDS.has(kind)) return c.json({ error: "kind invalid" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: "email invalid" }, 400);
  if (kind === "feature" && message.length < 8) return c.json({ error: "mesaj prea scurt" }, 400);
  if (kind === "brief" && selection.length === 0) return c.json({ error: "selecție goală" }, 400);

  const ip = clientIp(c.req.raw);
  const emailKey = await hashKey(email);
  const rate = await checkRateLimit(
    c.env.DB,
    [
      { key: `produse:ip:${await hashKey(ip)}:h`, limit: 8, windowSec: 3600 },
      { key: `produse:mail:${emailKey}:d`, limit: 6, windowSec: 86400 },
    ],
    { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `produse:${emailKey}` },
  );
  if (!rate.ok) return c.json({ error: "rate_limited", retryAfter: rate.retryAfter }, 429, { "Retry-After": String(rate.retryAfter) });

  const turnstile = await verifyTurnstile(c.env.TURNSTILE_SECRET, turnstileToken, ip, {
    expectedAction: kind === "feature" ? "produse-feature" : "produse-brief",
    allowedHostnames: c.env.TURNSTILE_ALLOWED_HOSTNAMES,
  });
  if (!turnstile.ok) return c.json({ error: "captcha_failed", reason: turnstile.reason }, 403);

  const id = crypto.randomUUID();
  const now = Date.now();
  const source = kind === "feature" ? "produse:cerere-functie" : "produse:selector";
  const config = JSON.stringify({ kind, category, urgency, selection });

  await c.env.DB.prepare(
    `INSERT INTO leads (id,source,name,business,phone,email,message,website,language,attachments_json,product,config_json,status,delivery_status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'new','pending',?,?)`,
  )
    .bind(
      id,
      source,
      kind === "feature" ? "Cerere de funcție" : "Selecție produse și servicii",
      "—",
      "—",
      email,
      message || null,
      null,
      lang,
      "[]",
      "avyron-products",
      config,
      now,
      now,
    )
    .run();

  const subject = kind === "feature" ? `Cerere de funcție — Produse Avyron` : `Selecție din Produse Avyron (${selection.length})`;
  const lines = [
    `Tip: ${kind}`,
    `E-mail: ${email}`,
    category ? `Categorii: ${category}` : "",
    urgency ? `Urgență: ${urgency}` : "",
    selection.length ? `Selecție:\n${selection.map((entry) => `  • ${entry}`).join("\n")}` : "",
    "",
    "Mesaj:",
    message || "—",
    "",
    `Limbă: ${lang}`,
    `ID: ${id}`,
  ].filter(Boolean);

  const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#111">
    <h2 style="margin:0 0 12px">${esc(subject)}</h2>
    <p style="margin:0 0 6px"><b>E-mail:</b> ${esc(email)}</p>
    ${category ? `<p style="margin:0 0 6px"><b>Categorii:</b> ${esc(category)}</p>` : ""}
    ${urgency ? `<p style="margin:0 0 6px"><b>Urgență:</b> ${esc(urgency)}</p>` : ""}
    ${selection.length ? `<p style="margin:10px 0 4px"><b>Selecție</b></p><ul>${selection.map((entry) => `<li>${esc(entry)}</li>`).join("")}</ul>` : ""}
    <p style="margin:10px 0 4px"><b>Mesaj</b></p>
    <p style="white-space:pre-wrap;margin:0">${esc(message || "—")}</p>
    <p style="margin:14px 0 0;color:#666;font-size:12px">Produse Avyron · ${id}</p>
  </div>`;

  const to = c.env.LEAD_TO || c.env.SMTP_FROM;
  if (!to) {
    await c.env.DB.prepare("UPDATE leads SET delivery_status='failed',delivery_error=?,updated_at=? WHERE id=?")
      .bind("LEAD_TO is not configured", Date.now(), id)
      .run();
    return c.json({ error: "Livrarea emailului nu este configurată", requestId: id }, 503);
  }

  const result = await deliverMail(c.env, { to, replyTo: email, subject, text: lines.join("\n"), html });
  await c.env.DB.prepare("UPDATE leads SET delivery_status=?,delivery_error=?,updated_at=? WHERE id=?")
    .bind(result.delivered ? "sent" : "failed", result.delivered ? null : result.error, Date.now(), id)
    .run();
  await logDelivery(c.env, { kind: "produse_request", entityId: id, recipient: to, result }).catch(() => undefined);

  if (!result.delivered) return c.json({ error: "Cererea a fost salvată, dar emailul nu a fost livrat", requestId: id }, 502);
  return c.json({ ok: true, requestId: id }, 201);
});
