// Avyron API — Cloudflare Workers + D1 + KV + R2
// Auth: PBKDF2-SHA256 password hashing + signed JWT (HS256) + rolling sessions.
//
// Routes:
//   POST /api/auth/signup       { email, password, displayName? }
//   POST /api/auth/login        { email, password }
//   POST /api/auth/logout
//   GET  /api/auth/me
//   POST /api/auth/refresh
//   POST /api/auth/forgot       { email }
//   POST /api/auth/reset        { token, password }
//   GET  /api/clients           (staff/admin)
//   ... extinde după nevoie (vezi cloudflare/workers/README.md)

import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { AppBindings, Role } from "./types";
import { hashPassword, now, randomHex, sha256, signJwt, verifyJwt, verifyPassword } from "./security";
import { deliverMail, logDelivery } from "./mailer";
import { checkRateLimit, clientIp, hashKey, verifyTurnstile } from "./antispam";
import { MAX_CONTENT_CONFIG_BYTES, avatarObjectKey, contentConfigKey, jsonByteLength } from "./storage";

const app = new Hono<AppBindings>();

const allowedOrigin = (env: AppBindings["Bindings"], origin: string | undefined): string => {
  const configured = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!origin) return configured[0] || "";
  if (configured.includes(origin)) return origin;
  try {
    const hostname = new URL(origin).hostname;
    if (hostname === "avyrontech.pages.dev" || hostname.endsWith(".avyrontech.pages.dev")) return origin;
  } catch {
    // Invalid Origin is denied below.
  }
  return "";
};

app.use("*", async (c, next) => {
  return cors({
    origin: (origin) => allowedOrigin(c.env, origin),
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })(c, next);
});

app.use("/api/auth/*", async (c, next) => {
  await next();
  c.header("cache-control", "no-store");
  c.header("pragma", "no-cache");
});

const uuid = () => crypto.randomUUID();
const PROFILE_SELECT = "id,display_name,avatar_url,phone,address,entity_type,company_name,cui,social_facebook,social_instagram,social_tiktok,website,language,theme,pseudonym,staff_role,updated_at";

async function sendVerification(c: Context<AppBindings>, userId: string, email: string) {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM email_verifications WHERE user_id = ? OR expires_at < ?").bind(userId, timestamp),
    c.env.DB.prepare("INSERT INTO email_verifications (token,user_id,created_at,expires_at) VALUES (?,?,?,?)")
      .bind(tokenHash, userId, timestamp, timestamp + 24 * 60 * 60 * 1000),
  ]);
  const verifyUrl = `${(c.env.APP_URL || "https://avyron.ro").replace(/\/$/, "")}/auth?verify=${encodeURIComponent(token)}`;
  const result = await deliverMail(c.env, {
    to: email,
    subject: "Confirmă adresa de email pentru contul Avyron",
    text: `Confirmă adresa de email folosind linkul de mai jos. Linkul este valabil 24 de ore:\n\n${verifyUrl}`,
    html: `<p>Confirmă adresa de email pentru contul Avyron.</p><p><a href="${verifyUrl}">Confirmă adresa</a></p><p>Linkul este valabil 24 de ore.</p>`,
  });
  await logDelivery(c.env, { kind: "email_verification", entityId: userId, recipient: email, result }).catch((error) =>
    console.error(JSON.stringify({ event: "email_log_failed", kind: "email_verification", error: String(error) })),
  );
  if (!result.delivered) console.error(JSON.stringify({ event: "verification_delivery_failed", userId, error: result.error }));
  return result;
}

// ─── Auth middleware ────────────────────────────────────────────────────
async function requireAuth(c: Context<AppBindings>, next: Next) {
  const auth = c.req.header("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return c.json({ error: { code: "unauthenticated", message: "Missing token" } }, 401);
  const payload = await verifyJwt<{ sub: string; roles: Role[] }>(token, c.env.JWT_SECRET);
  if (!payload?.sub) return c.json({ error: { code: "unauthenticated", message: "Invalid token" } }, 401);
  c.set("userId", payload.sub);
  c.set("roles", payload.roles ?? ["user"]);
  await next();
}
const requireRole = (...roles: Role[]) => async (c: Context<AppBindings>, next: Next) => {
  const userRoles: Role[] = c.get("roles") ?? [];
  if (!userRoles.some((r) => roles.includes(r)))
    return c.json({ error: { code: "forbidden", message: "Insufficient role" } }, 403);
  await next();
};

async function rolesFor(db: D1Database, userId: string): Promise<Role[]> {
  const { results } = await db.prepare("SELECT role FROM user_roles WHERE user_id = ?").bind(userId).all<{ role: Role }>();
  return results.map((r) => r.role);
}

// ─── Health ─────────────────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ ok: true, ts: now() }));

// ─── AUTH ───────────────────────────────────────────────────────────────
app.post("/api/auth/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const displayName = body.displayName ? String(body.displayName) : null;
  const turnstileToken = String(body.turnstileToken || "").slice(0, 4000);
  const entityType = ["individual", "srl", "pfa", "ii", "other"].includes(String(body.entityType))
    ? String(body.entityType)
    : "individual";
  const signupIpKey = await hashKey(clientIp(c.req.raw));
  const signupRate = await checkRateLimit(c.env.DB, [
    { key: `signup:ip:${signupIpKey}:h`, limit: 5, windowSec: 3600 },
  ], { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `signup:${signupIpKey}` });
  if (!signupRate.ok) return c.json({ error: { code: "rate_limited" } }, 429, { "Retry-After": String(signupRate.retryAfter) });
  const captcha = await verifyTurnstile(c.env.TURNSTILE_SECRET, turnstileToken, clientIp(c.req.raw), {
    expectedAction: "signup",
    allowedHostnames: c.env.TURNSTILE_ALLOWED_HOSTNAMES,
  });
  if (!captcha.ok) return c.json({ error: { code: "captcha_failed", message: "Verificarea anti-spam a eșuat" } }, 403);
  if (!/^\S+@\S+\.\S+$/.test(email)) return c.json({ error: { code: "invalid_email" } }, 400);
  if (password.length < 8) return c.json({ error: { code: "weak_password", message: "Min 8 chars" } }, 400);

  const exists = await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
  if (exists) return c.json({ error: { code: "email_taken" } }, 409);

  const id = uuid();
  const hash = await hashPassword(password);
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO users (id,email,password_hash,display_name,email_verified,created_at,updated_at) VALUES (?,?,?,?,0,?,?)")
      .bind(id, email, hash, displayName, t, t),
    c.env.DB.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'user')").bind(id),
    c.env.DB.prepare("INSERT INTO profiles (id,display_name,entity_type,language,theme,updated_at) VALUES (?,?,?,'ro','system',?)")
      .bind(id, displayName, entityType, t),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(id, "signup", c.req.header("cf-connecting-ip") || null, t),
  ]);
  const delivery = await sendVerification(c, id, email);
  return c.json({ ok: true, verification_required: true, verification_email_sent: delivery.delivered }, delivery.delivered ? 202 : 503);
});

app.post("/api/auth/resend-verification", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const verificationEmailKey = await hashKey(email);
  const rate = await checkRateLimit(c.env.DB, [
    { key: `verify:ip:${await hashKey(clientIp(c.req.raw))}:h`, limit: 8, windowSec: 3600 },
    { key: `verify:mail:${verificationEmailKey}:h`, limit: 3, windowSec: 3600 },
  ], { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `verify:${verificationEmailKey}` });
  if (!rate.ok) return c.json({ ok: true });
  const user = await c.env.DB.prepare("SELECT id,email_verified FROM users WHERE email = ? AND disabled_at IS NULL")
    .bind(email).first<{ id: string; email_verified: number }>();
  if (user && !user.email_verified) await sendVerification(c, user.id, email);
  return c.json({ ok: true });
});

app.post("/api/auth/verify-email", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = String(body.token || "");
  if (!token) return c.json({ error: { code: "invalid_token" } }, 400);
  const tokenHash = await sha256(token);
  const row = await c.env.DB.prepare("SELECT token,user_id,expires_at,used_at FROM email_verifications WHERE token IN (?, ?) LIMIT 1")
    .bind(tokenHash, token).first<{ token: string; user_id: string; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at || row.expires_at < now()) return c.json({ error: { code: "invalid_or_expired_token" } }, 400);
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?").bind(timestamp, row.user_id),
    c.env.DB.prepare("UPDATE email_verifications SET used_at = ? WHERE token = ?").bind(timestamp, row.token),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(row.user_id, "email_verified", c.req.header("cf-connecting-ip") || null, timestamp),
  ]);
  return c.json({ ok: true });
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const loginEmailKey = await hashKey(email);
  const loginRate = await checkRateLimit(c.env.DB, [
    { key: `login:ip:${await hashKey(clientIp(c.req.raw))}:15m`, limit: 20, windowSec: 900 },
    { key: `login:mail:${loginEmailKey}:15m`, limit: 8, windowSec: 900 },
  ], { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `login:${loginEmailKey}` });
  if (!loginRate.ok) return c.json({ error: { code: "rate_limited", message: "Prea multe încercări" } }, 429, { "Retry-After": String(loginRate.retryAfter) });
  const row = await c.env.DB.prepare("SELECT id, password_hash, disabled_at, email_verified FROM users WHERE email = ?").bind(email).first<{ id: string; password_hash: string; disabled_at: number | null; email_verified: number }>();
  if (!row) {
    await hashPassword(password); // Keep missing-user timing close to a real password check.
    return c.json({ error: { code: "invalid_credentials" } }, 401);
  }
  if (!(await verifyPassword(password, row.password_hash)))
    return c.json({ error: { code: "invalid_credentials" } }, 401);
  if (row.disabled_at) return c.json({ error: { code: "account_disabled", message: "Contul este dezactivat" } }, 403);
  if (!row.email_verified) return c.json({ error: { code: "verification_required", message: "Confirmă adresa de email înainte de autentificare" } }, 403);
  const roles = await rolesFor(c.env.DB, row.id);
  const loginAt = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(loginAt, row.id),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(row.id, "login", c.req.header("cf-connecting-ip") || null, loginAt),
  ]);
  return createSession(c, row.id, roles.length ? roles : ["user"]);
});

async function createSession(c: Context<AppBindings>, userId: string, roles: Role[]) {
  const sid = randomHex(32);
  const sessionId = await sha256(sid);
  const t = now();
  const exp = t + 30 * 24 * 60 * 60 * 1000; // 30d
  await c.env.DB.prepare(
    "INSERT INTO sessions (id,user_id,user_agent,ip,created_at,last_seen_at,expires_at) VALUES (?,?,?,?,?,?,?)"
  ).bind(sessionId, userId, c.req.header("user-agent") || null, c.req.header("cf-connecting-ip") || null, t, t, exp).run();
  setCookie(c, "sid", sid, { httpOnly: true, secure: true, sameSite: "None", path: "/", maxAge: 30 * 24 * 60 * 60 });
  const access = await signJwt({ sub: userId, roles }, c.env.JWT_SECRET, 900);
  return c.json({ user: { id: userId, roles }, access_token: access, expires_in: 900 });
}

app.post("/api/auth/logout", async (c) => {
  const origin = c.req.header("origin");
  if (origin && !allowedOrigin(c.env, origin)) return c.json({ error: { code: "forbidden_origin" } }, 403);
  const sid = getCookie(c, "sid");
  if (sid) await c.env.DB.prepare("DELETE FROM sessions WHERE id IN (?, ?)").bind(await sha256(sid), sid).run();
  deleteCookie(c, "sid", { path: "/" });
  return c.json({ ok: true });
});

app.post("/api/auth/refresh", async (c) => {
  const origin = c.req.header("origin");
  if (origin && !allowedOrigin(c.env, origin)) return c.json({ error: { code: "forbidden_origin" } }, 403);
  const sid = getCookie(c, "sid");
  if (!sid) return c.json({ error: { code: "no_session" } }, 401);
  const hashedSid = await sha256(sid);
  const row = await c.env.DB.prepare("SELECT id,user_id,expires_at FROM sessions WHERE id IN (?, ?) LIMIT 1").bind(hashedSid, sid).first<{ id: string; user_id: string; expires_at: number }>();
  if (!row || row.expires_at < now()) {
    if (row) await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(row.id).run();
    deleteCookie(c, "sid", { path: "/" });
    return c.json({ error: { code: "expired" } }, 401);
  }
  await c.env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(now(), row.id).run();
  const roles = await rolesFor(c.env.DB, row.user_id);
  const access = await signJwt({ sub: row.user_id, roles }, c.env.JWT_SECRET, 900);
  return c.json({ access_token: access, expires_in: 900, user: { id: row.user_id, roles } });
});

app.get("/api/auth/me", requireAuth, async (c) => {
  const u = await c.env.DB.prepare("SELECT id,email,display_name,avatar_url,email_verified,must_change_password,created_at FROM users WHERE id = ? AND disabled_at IS NULL")
    .bind(c.get("userId")).first();
  if (!u) return c.json({ error: { code: "account_unavailable" } }, 401);
  let profile = await c.env.DB.prepare(`SELECT ${PROFILE_SELECT} FROM profiles WHERE id = ?`).bind(c.get("userId")).first();
  if (!profile) {
    await c.env.DB.prepare("INSERT INTO profiles (id,display_name,entity_type,language,theme,updated_at) VALUES (?,?,'individual','ro','system',?)")
      .bind(c.get("userId"), (u as { display_name?: string }).display_name || null, now()).run();
    profile = await c.env.DB.prepare(`SELECT ${PROFILE_SELECT} FROM profiles WHERE id = ?`).bind(c.get("userId")).first();
  }
  return c.json({ user: u, profile, roles: c.get("roles") });
});

app.post("/api/auth/forgot", async (c) => {
  const { email } = (await c.req.json().catch(() => ({}))) as { email?: string };
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const forgotEmailKey = await hashKey(normalizedEmail);
  const forgotRate = await checkRateLimit(c.env.DB, [
    { key: `forgot:ip:${await hashKey(clientIp(c.req.raw))}:h`, limit: 8, windowSec: 3600 },
    { key: `forgot:mail:${forgotEmailKey}:h`, limit: 3, windowSec: 3600 },
  ], { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `forgot:${forgotEmailKey}` });
  if (!forgotRate.ok) return c.json({ ok: true });
  const u = normalizedEmail ? await c.env.DB.prepare("SELECT id FROM users WHERE email = ? AND disabled_at IS NULL").bind(normalizedEmail).first<{ id: string }>() : null;
  if (u) {
    const token = randomHex(32);
    const tokenHash = await sha256(token);
    const t = now();
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?").bind(u.id, t),
      c.env.DB.prepare("INSERT INTO password_resets (token,user_id,created_at,expires_at) VALUES (?,?,?,?)")
        .bind(tokenHash, u.id, t, t + 60 * 60 * 1000),
    ]);
    const resetUrl = `${(c.env.APP_URL || "https://avyron.ro").replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    const result = await deliverMail(c.env, {
      to: normalizedEmail,
      subject: "Resetarea parolei contului Avyron",
      text: `Ai solicitat resetarea parolei. Linkul este valabil 60 de minute:\n\n${resetUrl}\n\nDacă nu ai solicitat resetarea, ignoră acest mesaj.`,
      html: `<p>Ai solicitat resetarea parolei contului Avyron.</p><p><a href="${resetUrl}">Setează o parolă nouă</a></p><p>Linkul este valabil 60 de minute. Dacă nu ai solicitat resetarea, ignoră acest mesaj.</p>`,
    });
    await logDelivery(c.env, { kind: "password_reset", entityId: u.id, recipient: normalizedEmail, result }).catch((error) =>
      console.error(JSON.stringify({ event: "email_log_failed", kind: "password_reset", error: String(error) })),
    );
    if (!result.delivered) console.error(JSON.stringify({ event: "password_reset_delivery_failed", userId: u.id, error: result.error }));
  }
  return c.json({ ok: true }); // răspuns generic — anti enumeration
});

app.post("/api/auth/reset", async (c) => {
  const { token, password } = (await c.req.json().catch(() => ({}))) as { token?: string; password?: string };
  if (!token || !password || password.length < 8) return c.json({ error: { code: "invalid_input" } }, 400);
  const tokenHash = await sha256(token);
  const row = await c.env.DB.prepare("SELECT token,user_id,expires_at,used_at FROM password_resets WHERE token IN (?, ?) LIMIT 1").bind(tokenHash, token).first<{ token: string; user_id: string; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at || row.expires_at < now()) return c.json({ error: { code: "invalid_token" } }, 400);
  const hash = await hashPassword(password);
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?").bind(hash, t, row.user_id),
    c.env.DB.prepare("UPDATE password_resets SET used_at = ? WHERE token = ?").bind(t, row.token),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.user_id),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(row.user_id, "password_reset", c.req.header("cf-connecting-ip") || null, t),
  ]);
  return c.json({ ok: true });
});

app.post("/api/auth/change-password", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as { currentPassword?: string; newPassword?: string };
  if (!body.currentPassword || !body.newPassword || body.newPassword.length < 10)
    return c.json({ error: { code: "invalid_input", message: "Parola nouă trebuie să aibă minimum 10 caractere" } }, 400);
  const userId = c.get("userId");
  const row = await c.env.DB.prepare("SELECT password_hash FROM users WHERE id = ? AND disabled_at IS NULL").bind(userId).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(body.currentPassword, row.password_hash)))
    return c.json({ error: { code: "invalid_password", message: "Parola curentă nu este corectă" } }, 401);
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?")
      .bind(await hashPassword(body.newPassword), timestamp, userId),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(userId, "password_change", c.req.header("cf-connecting-ip") || null, timestamp),
  ]);
  deleteCookie(c, "sid", { path: "/" });
  return c.json({ ok: true });
});

const PROFILE_FIELDS = ["display_name", "phone", "address", "entity_type", "company_name", "cui", "social_facebook", "social_instagram", "social_tiktok", "website", "language", "theme", "pseudonym"] as const;
const profileLimits: Record<(typeof PROFILE_FIELDS)[number], number> = {
  display_name: 100, phone: 40, address: 500, entity_type: 20, company_name: 160, cui: 40,
  social_facebook: 300, social_instagram: 300, social_tiktok: 300, website: 300,
  language: 2, theme: 10, pseudonym: 80,
};

app.put("/api/profile", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const patch = PROFILE_FIELDS.flatMap((field) => field in body ? [[field, String(body[field] ?? "").trim().slice(0, profileLimits[field])]] as const : []);
  if (!patch.length) return c.json({ error: { code: "empty_patch" } }, 400);
  const values = Object.fromEntries(patch);
  if (values.entity_type && !["individual", "srl", "pfa", "ii", "other"].includes(values.entity_type)) return c.json({ error: { code: "invalid_entity_type" } }, 400);
  if (values.language && !["ro", "en"].includes(values.language)) return c.json({ error: { code: "invalid_language" } }, 400);
  if (values.theme && !["light", "dark", "system"].includes(values.theme)) return c.json({ error: { code: "invalid_theme" } }, 400);
  const userId = c.get("userId");
  await c.env.DB.prepare(`UPDATE profiles SET ${patch.map(([field]) => `${field} = ?`).join(", ")}, updated_at = ? WHERE id = ?`)
    .bind(...patch.map(([, value]) => value || null), now(), userId).run();
  if (values.display_name !== undefined) await c.env.DB.prepare("UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?")
    .bind(values.display_name || null, now(), userId).run();
  const profile = await c.env.DB.prepare(`SELECT ${PROFILE_SELECT} FROM profiles WHERE id = ?`).bind(userId).first();
  return c.json({ profile });
});

app.post("/api/profile/avatar", requireAuth, async (c) => {
  const type = c.req.header("content-type") || "";
  const length = Number(c.req.header("content-length") || 0);
  if (!/^image\/(png|jpe?g|webp|avif)$/i.test(type)) return c.json({ error: { code: "unsupported_type" } }, 415);
  if (length > 5 * 1024 * 1024) return c.json({ error: { code: "too_large" } }, 413);
  const bytes = await c.req.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) return c.json({ error: { code: "too_large" } }, 413);
  const userId = c.get("userId");
  const key = avatarObjectKey(userId);
  await c.env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: type, cacheControl: "public, max-age=3600" },
    customMetadata: { userId, kind: "avatar" },
  });
  const avatarUrl = `/api/profile/avatar/${userId}?v=${now()}`;
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?").bind(avatarUrl, now(), userId),
    c.env.DB.prepare("UPDATE profiles SET avatar_url = ?, updated_at = ? WHERE id = ?").bind(avatarUrl, now(), userId),
  ]);
  return c.json({ avatar_url: avatarUrl });
});

app.get("/api/profile/avatar/:userId", async (c) => {
  const object = await c.env.MEDIA.get(avatarObjectKey(c.req.param("userId")));
  if (!object) return c.body(null, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-length", String(object.size));
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
  return new Response(object.body, { headers });
});

// ─── Business CRUD (exemplu: clients) ───────────────────────────────────
app.get("/api/clients", requireAuth, requireRole("staff", "admin"), async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id,company_name,contact_name,email,phone,status,created_at FROM clients ORDER BY created_at DESC LIMIT 200").all();
  return c.json({ data: results });
});

app.get("/api/admin/users", requireAuth, requireRole("staff", "admin"), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id,u.email,u.display_name,u.avatar_url,u.email_verified,u.must_change_password,u.disabled_at,u.last_login_at,u.created_at,
            p.phone,p.entity_type,p.company_name,p.pseudonym,p.staff_role,
            GROUP_CONCAT(r.role) AS roles
       FROM users u
       LEFT JOIN profiles p ON p.id=u.id
       LEFT JOIN user_roles r ON r.user_id=u.id
      GROUP BY u.id
      ORDER BY COALESCE(p.display_name,u.display_name,u.email) COLLATE NOCASE`,
  ).all();
  return c.json({ data: results });
});

app.get("/api/admin/email-failures", requireAuth, requireRole("staff", "admin"), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id,kind,entity_id,recipient,status,error,created_at
       FROM email_delivery_log
      WHERE status = 'failed'
      ORDER BY created_at DESC
      LIMIT 200`,
  ).all();
  return c.json({ data: results });
});

app.post("/api/clients", requireAuth, requireRole("staff", "admin"), async (c) => {
  const b = await c.req.json();
  if (!b.company_name || !b.email) return c.json({ error: { code: "invalid_input" } }, 400);
  const id = uuid();
  await c.env.DB.prepare(
    "INSERT INTO clients (id,company_name,contact_name,email,phone,status,created_at) VALUES (?,?,?,?,?,?,?)"
  ).bind(id, b.company_name, b.contact_name ?? null, b.email, b.phone ?? null, b.status ?? "active", now()).run();
  return c.json({ id }, 201);
});

app.get("/api/example-requests", requireAuth, requireRole("staff", "admin"), async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id,email,phone,source_slug,source_category,source_name,user_agent,status,delivery_status,created_at FROM example_requests ORDER BY created_at DESC LIMIT 500",
  ).all();
  return c.json({ data: results });
});

// ─── Content (KV) ───────────────────────────────────────────────────────
app.get("/api/content/:key", requireAuth, requireRole("staff", "admin"), async (c) => {
  const key = contentConfigKey(c.req.param("key") || "");
  if (!key) return c.json({ error: { code: "invalid_content_key" } }, 400);
  const v = await c.env.KV.get(key, "json");
  return c.json({ data: v });
});
app.put("/api/content/:key", requireAuth, requireRole("admin"), async (c) => {
  const key = contentConfigKey(c.req.param("key") || "");
  if (!key) return c.json({ error: { code: "invalid_content_key" } }, 400);
  const value = await c.req.json().catch(() => undefined);
  if (value === undefined) return c.json({ error: { code: "invalid_json" } }, 400);
  if (jsonByteLength(value) > MAX_CONTENT_CONFIG_BYTES) return c.json({ error: { code: "content_too_large" } }, 413);
  await c.env.KV.put(key, JSON.stringify(value), {
    metadata: { schema: "content:v1", updatedAt: now(), updatedBy: c.get("userId") },
  });
  return c.json({ ok: true });
});

// ─── Platformă internă (proiecte + propuneri + linkuri + metadata) ──────
import { projectsRouter } from "./projects";
import { seedRouter } from "./seed";
import { mediaRouter } from "./media";
import { contactRouter } from "./contact";
import { blogRouter, getBlogSitemapEntries, getPublishedBlogPost } from "./blog";
import { injectBlogHtml, mergeBlogSitemap } from "../../../../src/worker/blogHtml";
import { BLOG_SLUGS } from "../../../../src/data/blogSlugs";
app.use("/api/projects/*", requireAuth);
app.use("/api/proposals/*", requireAuth);
app.use("/api/links/*", requireAuth);
app.use("/api/metadata/*", requireAuth);
app.use("/api/media/*", requireAuth);
// Editorial mutations are authorized server-side. Public article reads and
// immutable R2 cover images remain accessible to crawlers and visitors.
app.use("/api/blog/staff/*", requireAuth, requireRole("staff", "admin"));
app.route("/", projectsRouter);
app.route("/", mediaRouter);
app.route("/", blogRouter);
// Formularul public (fără auth)
app.route("/", contactRouter);
// Importul administrativ are propria gardă constant-time X-Seed-Token.
app.route("/", seedRouter);

async function publicBlogPage(c: Context<AppBindings>, language: "ro" | "en") {
  const slug = c.req.param("slug") || "";
  const post = await getPublishedBlogPost(c.env.DB, language, slug);
  if (!post) {
    // Source-controlled articles are already prerendered. Unknown slugs must
    // return a hard 404 instead of Cloudflare's SPA asset fallback.
    if ((BLOG_SLUGS as readonly string[]).includes(slug)) return c.env.ASSETS.fetch(c.req.raw);
    const notFound = await c.env.ASSETS.fetch(new Request(new URL("/404.html", c.req.url)));
    const headers = new Headers(notFound.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(notFound.body, { status: 404, headers });
  }
  const shell = await c.env.ASSETS.fetch(new Request(new URL("/_shell.html", c.req.url)));
  if (!shell.ok) return c.text("Site shell unavailable", 503, { "X-Robots-Tag": "noindex, nofollow" });
  const headers = new Headers(shell.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
  headers.set("Vary", "Accept-Encoding");
  return new Response(injectBlogHtml(await shell.text(), post), { status: 200, headers });
}

app.get("/blog/:slug", (c) => publicBlogPage(c, "ro"));
app.get("/en/blog/:slug", (c) => publicBlogPage(c, "en"));
app.get("/sitemap.xml", async (c) => {
  const asset = await c.env.ASSETS.fetch(c.req.raw);
  if (!asset.ok) return asset;
  const entries = await getBlogSitemapEntries(c.env.DB);
  const headers = new Headers(asset.headers);
  headers.set("content-type", "application/xml; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, s-maxage=900, stale-while-revalidate=86400");
  return new Response(mergeBlogSitemap(await asset.text(), entries), { status: 200, headers });
});

app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: { code: "not_found", message: "Ruta nu există" } }, 404);
  }

  // Only auth/private paths are configured to reach this branch. Public pages
  // and hashed assets stay on Cloudflare's asset-first fast path.
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
  const headers = new Headers(assetResponse.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Cache-Control", "private, no-store");
  headers.set("Pragma", "no-cache");
  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
});
app.onError((error, c) => {
  const requestId = c.req.header("cf-ray") || crypto.randomUUID();
  console.error(JSON.stringify({ event: "unhandled_error", requestId, path: c.req.path, method: c.req.method, error: error.message }));
  return c.json({ error: { code: "internal_error", message: "A apărut o eroare internă", requestId } }, 500);
});

async function cleanupExpiredData(env: AppBindings["Bindings"]) {
  const timestamp = now();
  const timestampSeconds = Math.floor(timestamp / 1000);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM rate_limit_counters WHERE expires_at < ?").bind(timestampSeconds),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(timestamp),
    env.DB.prepare("DELETE FROM password_resets WHERE expires_at < ? AND (used_at IS NULL OR used_at < ?)").bind(timestamp, timestamp - 24 * 60 * 60 * 1000),
    env.DB.prepare("DELETE FROM email_verifications WHERE expires_at < ? AND (used_at IS NULL OR used_at < ?)").bind(timestamp, timestamp - 24 * 60 * 60 * 1000),
  ]);
}

export default {
  fetch: (request, env, ctx) => app.fetch(request, env, ctx),
  scheduled: (_controller, env, ctx) => ctx.waitUntil(cleanupExpiredData(env)),
} satisfies ExportedHandler<AppBindings["Bindings"]>;
