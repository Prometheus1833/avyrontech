// Formularul public „Vreau exemplu gratuit”.
//   POST /api/contact/demo   (multipart/form-data)
//     câmpuri: name, business, phone, email, description?, website?
//     fișiere: files[] (imagini / documente, max 5 x 10MB)
//
// Fluxul: validare → salvare atașamente în R2 (FILES, prefix leads/) →
//         trimitere email prin SMTP (Cloudflare Workers TCP sockets) către LEAD_TO.

import { Hono } from "hono";
import type { Env } from "./index";
import { sendMailSmtp, type Attachment } from "./smtp";
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

  // Persistăm lead-ul în KV (backup, 90 zile) chiar dacă SMTP eșuează.
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

  const host = c.env.SMTP_HOST;
  const user = c.env.SMTP_USER;
  const pass = c.env.SMTP_PASS;
  const from = c.env.SMTP_FROM || user;
  const to = c.env.LEAD_TO || from;

  if (!host || !user || !pass) {
    console.error("SMTP not configured — lead saved only in KV/R2", leadId);
    return c.json({ ok: true, leadId, delivered: false, summary }, 202);
  }

  try {
    await sendMailSmtp(
      { host, port: c.env.SMTP_PORT ? parseInt(c.env.SMTP_PORT, 10) : 587, user, pass },
      {
        from: `Avyron Website <${from}>`,
        to: to!,
        replyTo: email,
        subject: `Cerere exemplu gratuit — ${name} (${business})`,
        text: lines.join("\n"),
        html,
        attachments,
      },
    );
  } catch (e) {
    console.error("lead smtp send failed", e);
    return c.json({ ok: true, leadId, delivered: false, summary }, 202);
  }

  return c.json({ ok: true, leadId, delivered: true, summary });
});

