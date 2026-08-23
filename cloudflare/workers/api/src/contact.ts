// Formularul public „Vreau exemplu gratuit”.
//   POST /api/contact/demo   (multipart/form-data)
//     câmpuri: name, business, phone, email, description?, website?
//     fișiere: files[] (imagini / documente, max 5 x 10MB)
//
// Fluxul: validare → salvare atașamente în R2 (FILES, prefix leads/) →
//         trimitere email prin SMTP (Cloudflare Workers TCP sockets) către LEAD_TO.

import { Hono } from "hono";
import type { Env } from "./types";
import type { Attachment } from "./smtp";
import { deliverMail, logDelivery } from "./mailer";
import { checkRateLimit, verifyTurnstile, clientIp, hashKey } from "./antispam";
import { syncLeadToTable } from "./leadSink";

export const contactRouter = new Hono<{ Bindings: Env }>();

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_CT =
  /^(image\/(png|jpe?g|webp|gif|heic|avif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|text\/plain|text\/csv)$/i;

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const safeName = (n: string) => n.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "fisier";

contactRouter.post("/api/contact/demo", async (c) => {
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Payload invalid" }, 400);
  }

  const name = clean(form.get("name"), 80);
  const business = clean(form.get("business"), 80);
  const phone = clean(form.get("phone"), 30);
  const email = clean(form.get("email"), 120);
  const description = clean(form.get("description"), 2000);
  const website = clean(form.get("website"), 200);
  const lang = clean(form.get("lang"), 5) || "ro";

  // 1) Honeypot — botul completează câmpul ascuns, omul nu.
  if (clean(form.get("company_url"), 200)) {
    console.warn("lead honeypot triggered");
    return c.json({ ok: true, leadId: crypto.randomUUID(), delivered: false, spam: true });
  }

  const ip = clientIp(c.req.raw);

  // 2) Rate limiting (IP: 3/oră, 10/zi · email: 3/zi)
  const ipKey = await hashKey(ip);
  const emailKey = await hashKey(email.toLowerCase());
  const rate = await checkRateLimit(c.env.KV, [
    { key: `demo:ip:${ipKey}:h`, limit: 3, windowSec: 3600 },
    { key: `demo:ip:${ipKey}:d`, limit: 10, windowSec: 86400 },
    { key: `demo:mail:${emailKey}:d`, limit: 3, windowSec: 86400 },
  ]);
  if (!rate.ok) {
    return c.json({ error: "rate_limited", retryAfter: rate.retryAfter }, 429, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  // 3) Turnstile
  const turnstile = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    clean(form.get("cf-turnstile-response") || form.get("turnstileToken"), 4000),
    ip,
    { expectedAction: "contact-demo", allowedHostnames: c.env.TURNSTILE_ALLOWED_HOSTNAMES },
  );
  if (!turnstile.ok) {
    console.warn("turnstile rejected:", turnstile.reason);
    return c.json({ error: "captcha_failed", reason: turnstile.reason }, 403);
  }

  const errors: string[] = [];
  if (name.length < 2) errors.push("name");
  if (business.length < 2) errors.push("business");
  if (phone.length < 6) errors.push("phone");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("email");
  if (errors.length) return c.json({ error: "Câmpuri invalide", fields: errors }, 400);


  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES) return c.json({ error: `Maxim ${MAX_FILES} fișiere` }, 400);

  const leadId = crypto.randomUUID();
  const attachments: Attachment[] = [];
  const stored: string[] = [];
  let total = 0;

  for (const f of files) {
    const ct = f.type || "application/octet-stream";
    if (!ALLOWED_CT.test(ct)) return c.json({ error: `Tip fișier neacceptat: ${f.name}` }, 400);
    if (f.size > MAX_FILE_BYTES) return c.json({ error: `Fișier prea mare: ${f.name}` }, 400);
    total += f.size;
    if (total > MAX_TOTAL_BYTES) return c.json({ error: "Dimensiune totală prea mare" }, 400);

    const bytes = new Uint8Array(await f.arrayBuffer());
    const key = `leads/${leadId}/${safeName(f.name)}`;
    try {
      await c.env.FILES.put(key, bytes, { httpMetadata: { contentType: ct } });
      stored.push(key);
    } catch (e) {
      console.error("lead attachment r2 put failed", e);
    }
    attachments.push({ filename: safeName(f.name), contentType: ct, content: bytes });
  }

  const submittedAt = new Date().toISOString();
  const lines = [
    `Nume: ${name}`,
    `Tip business: ${business}`,
    `Telefon: ${phone}`,
    `Email: ${email}`,
    website ? `Website actual: ${website}` : "Website actual: —",
    "",
    "Descriere:",
    description || "—",
    "",
    attachments.length ? `Atașamente (${attachments.length}): ${attachments.map((a) => a.filename).join(", ")}` : "Fără atașamente",
    stored.length ? `R2: ${stored.join(", ")}` : "",
    "",
    `Limbă: ${lang}`,
    `Trimis: ${submittedAt}`,
    `Lead ID: ${leadId}`,
  ].filter(Boolean);

  const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#111">
    <h2 style="margin:0 0 12px">Cerere exemplu gratuit</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><b>Nume</b></td><td>${esc(name)}</td></tr>
      <tr><td><b>Tip business</b></td><td>${esc(business)}</td></tr>
      <tr><td><b>Telefon</b></td><td>${esc(phone)}</td></tr>
      <tr><td><b>Email</b></td><td>${esc(email)}</td></tr>
      <tr><td><b>Website</b></td><td>${esc(website || "—")}</td></tr>
    </table>
    <p style="margin:14px 0 4px"><b>Descriere</b></p>
    <p style="white-space:pre-wrap;margin:0">${esc(description || "—")}</p>
    <p style="margin:14px 0 0;color:#666;font-size:12px">Lead ${leadId} · ${submittedAt}${
      stored.length ? ` · R2: ${esc(stored.join(", "))}` : ""
    }</p>
  </div>`;

  // D1 is the source of truth. KV remains a short-lived recovery/cache copy.
  await c.env.DB.prepare(
    `INSERT INTO leads (id,source,name,business,phone,email,message,website,language,attachments_json,status,delivery_status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?, 'new','pending',?,?)`,
  ).bind(
    leadId, "website:cta-demo", name, business, phone, email.toLowerCase(), description || null,
    website || null, lang, JSON.stringify(stored), Date.now(), Date.now(),
  ).run();

  try {
    await c.env.KV.put(
      `lead:${leadId}`,
      JSON.stringify({ leadId, name, business, phone, email, website, description, stored, submittedAt, lang }),
      { expirationTtl: 60 * 60 * 24 * 90 },
    );
  } catch (e) {
    console.error("lead kv put failed", e);
  }

  // Sincronizare în tabel (Airtable / Google Sheets prin webhook) — nu blocăm răspunsul.
  const sinkPromise = syncLeadToTable(c.env, {
    leadId,
    submittedAt,
    name,
    business,
    phone,
    email,
    website,
    description,
    files: attachments.map((a) => a.filename),
    lang,
    source: "website:cta-demo",
  });
  c.executionCtx?.waitUntil?.(sinkPromise.then(() => undefined));

  const summary = {
    leadId,
    submittedAt,
    name,
    business,
    phone,
    email,
    website,
    description,
    files: attachments.map((a) => ({ name: a.filename, size: a.content.byteLength })),
  };

  const to = c.env.LEAD_TO || c.env.SMTP_FROM;
  if (!to) {
    await c.env.DB.prepare("UPDATE leads SET delivery_status='failed',delivery_error=?,updated_at=? WHERE id=?")
      .bind("LEAD_TO is not configured", Date.now(), leadId).run();
    return c.json({ error: "Livrarea emailului nu este configurată", leadId, delivered: false, summary }, 503);
  }

  const result = await deliverMail(c.env, {
    from: c.env.SMTP_FROM ? `Avyron Website <${c.env.SMTP_FROM}>` : undefined,
    to,
    replyTo: email,
    subject: `Cerere exemplu gratuit — ${name} (${business})`,
    text: lines.join("\n"),
    html,
    attachments,
  });
  await c.env.DB.prepare("UPDATE leads SET delivery_status=?,delivery_error=?,updated_at=? WHERE id=?")
    .bind(result.delivered ? "sent" : "failed", result.delivered ? null : result.error, Date.now(), leadId).run();
  await logDelivery(c.env, { kind: "demo_request", entityId: leadId, recipient: to, result }).catch((error) =>
    console.error(JSON.stringify({ event: "email_log_failed", leadId, error: String(error) })),
  );
  if (!result.delivered) {
    console.error(JSON.stringify({ event: "lead_smtp_failed", leadId, error: result.error }));
    return c.json({ error: "Solicitarea a fost salvată, dar notificarea email nu a putut fi livrată", leadId, delivered: false, summary }, 502);
  }

  return c.json({ ok: true, leadId, delivered: true, summary }, 201);
});

contactRouter.post("/api/contact/example", async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const email = clean(body.email, 255).toLowerCase();
  const phone = clean(body.phone, 30);
  const sourceSlug = clean(body.source_slug, 120);
  const sourceCategory = clean(body.source_category, 120);
  const sourceName = clean(body.source_name, 160);
  const turnstileToken = clean(body.turnstileToken, 4000);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || phone.length < 5 || !sourceSlug)
    return c.json({ error: "Câmpuri invalide" }, 400);

  const ip = clientIp(c.req.raw);
  const rate = await checkRateLimit(c.env.KV, [
    { key: `example:ip:${await hashKey(ip)}:h`, limit: 5, windowSec: 3600 },
    { key: `example:mail:${await hashKey(email)}:d`, limit: 3, windowSec: 86400 },
  ]);
  if (!rate.ok) return c.json({ error: "rate_limited", retryAfter: rate.retryAfter }, 429);

  const turnstile = await verifyTurnstile(c.env.TURNSTILE_SECRET, turnstileToken, ip, {
    expectedAction: "request-example",
    allowedHostnames: c.env.TURNSTILE_ALLOWED_HOSTNAMES,
  });
  if (!turnstile.ok) return c.json({ error: "captcha_failed", reason: turnstile.reason }, 403);

  const id = crypto.randomUUID();
  const timestamp = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO example_requests (id,email,phone,source_slug,source_category,source_name,user_agent,status,delivery_status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,'new','pending',?,?)`,
  ).bind(id, email, phone, sourceSlug, sourceCategory || null, sourceName || null, clean(c.req.header("user-agent"), 500), timestamp, timestamp).run();

  const to = c.env.LEAD_TO || c.env.SMTP_FROM;
  if (!to) {
    await c.env.DB.prepare("UPDATE example_requests SET delivery_status='failed',delivery_error=?,updated_at=? WHERE id=?").bind("LEAD_TO is not configured", Date.now(), id).run();
    return c.json({ error: "Livrarea emailului nu este configurată", requestId: id }, 503);
  }
  const result = await deliverMail(c.env, {
    to,
    replyTo: email,
    subject: `Solicitare exemplu — ${sourceName || sourceSlug}`,
    text: `Email: ${email}\nTelefon: ${phone}\nSursă: ${sourceName || "—"}\nCategorie: ${sourceCategory || "—"}\nSlug: ${sourceSlug}\nID: ${id}`,
  });
  await c.env.DB.prepare("UPDATE example_requests SET delivery_status=?,delivery_error=?,updated_at=? WHERE id=?")
    .bind(result.delivered ? "sent" : "failed", result.delivered ? null : result.error, Date.now(), id).run();
  await logDelivery(c.env, { kind: "example_request", entityId: id, recipient: to, result }).catch(() => undefined);
  if (!result.delivered) return c.json({ error: "Solicitarea a fost salvată, dar emailul nu a fost livrat", requestId: id }, 502);
  return c.json({ ok: true, requestId: id }, 201);
});
