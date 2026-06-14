// Avyron Worker — servește SPA (assets) + API same-origin pe /api/*
// Auth: PBKDF2-SHA256 + JWT HS256 + cookie de sesiune `sid` (30d).

import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

export type Env = {
  ASSETS: Fetcher;
  DB: D1Database;
  KV: KVNamespace;
  FILES: R2Bucket;
  JWT_SECRET: string;
  APP_ORIGIN: string;
};

type Role = "user" | "staff" | "admin";

const app = new Hono<{ Bindings: Env; Variables: { userId: string; roles: Role[] } }>();

// ─── Crypto helpers ────────────────────────────────────────────────────
const ITER = 210_000;
const enc = new TextEncoder();
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const b64url = (b: ArrayBuffer | Uint8Array) => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, key, 256);
  return `${ITER}$${b64(salt.buffer)}$${b64(bits)}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [iterStr, saltB64, hashB64] = stored.split("$");
  if (!iterStr || !saltB64 || !hashB64) return false;
  const salt = fromB64(saltB64);
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: parseInt(iterStr), hash: "SHA-256" }, key, 256);
  return b64(bits) === hashB64;
}
async function signJwt(payload: object, secret: string, ttlSec = 900): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSec };
  const data = `${b64url(enc.encode(JSON.stringify(header)))}.${b64url(enc.encode(JSON.stringify(body)))}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64url(sig)}`;
}
async function verifyJwt<T = any>(token: string, secret: string): Promise<T | null> {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, fromB64(s.replace(/-/g, "+").replace(/_/g, "/")), enc.encode(`${h}.${p}`));
  if (!ok) return null;
  const payload = JSON.parse(new TextDecoder().decode(fromB64(p.replace(/-/g, "+").replace(/_/g, "/"))));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload as T;
}
const randomHex = (bytes = 32) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes))).map((b) => b.toString(16).padStart(2, "0")).join("");
const uuid = () => crypto.randomUUID();
const nowMs = () => Date.now();

// ─── Auth middleware ───────────────────────────────────────────────────
async function requireAuth(c: any, next: any) {
  const auth = c.req.header("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return c.json({ error: { code: "unauthenticated" } }, 401);
  const payload = await verifyJwt<{ sub: string; roles: Role[] }>(token, c.env.JWT_SECRET);
  if (!payload?.sub) return c.json({ error: { code: "unauthenticated" } }, 401);
  c.set("userId", payload.sub);
  c.set("roles", payload.roles ?? ["user"]);
  await next();
}
const requireRole = (...roles: Role[]) => async (c: any, next: any) => {
  const userRoles: Role[] = c.get("roles") ?? [];
  if (!userRoles.some((r) => roles.includes(r)))
    return c.json({ error: { code: "forbidden" } }, 403);
  await next();
};
async function rolesFor(db: D1Database, userId: string): Promise<Role[]> {
  const { results } = await db.prepare("SELECT role FROM user_roles WHERE user_id = ?").bind(userId).all<{ role: Role }>();
  return results.map((r) => r.role);
}

// ─── Health ────────────────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ ok: true, ts: nowMs() }));

// ─── AUTH ──────────────────────────────────────────────────────────────
app.post("/api/auth/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const displayName = body.displayName ? String(body.displayName) : null;
  const entityType = body.entityType ? String(body.entityType) : "individual";
  if (!/^\S+@\S+\.\S+$/.test(email)) return c.json({ error: { code: "invalid_email" } }, 400);
  if (password.length < 8) return c.json({ error: { code: "weak_password" } }, 400);

  const exists = await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
  if (exists) return c.json({ error: { code: "email_taken", message: "Email deja înregistrat" } }, 409);

  const id = uuid();
  const hash = await hashPassword(password);
  const t = nowMs();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO users (id,email,password_hash,display_name,email_verified,created_at,updated_at) VALUES (?,?,?,?,0,?,?)")
      .bind(id, email, hash, displayName, t, t),
    c.env.DB.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'user')").bind(id),
    c.env.DB.prepare("INSERT INTO profiles (id,display_name,entity_type,language,theme,updated_at) VALUES (?,?,?,?,?,?)")
      .bind(id, displayName, entityType, "ro", "system", t),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(id, "signup", c.req.header("cf-connecting-ip") || null, t),
  ]);
  return createSession(c, id, ["user"]);
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const row = await c.env.DB.prepare("SELECT id, password_hash FROM users WHERE email = ?").bind(email)
    .first<{ id: string; password_hash: string }>();
  if (!row || !(await verifyPassword(password, row.password_hash)))
    return c.json({ error: { code: "invalid_credentials", message: "Email sau parolă greșite" } }, 401);
  const roles = await rolesFor(c.env.DB, row.id);
  await c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
    .bind(row.id, "login", c.req.header("cf-connecting-ip") || null, nowMs()).run();
  return createSession(c, row.id, roles.length ? roles : ["user"]);
});

async function createSession(c: any, userId: string, roles: Role[]) {
  const sid = randomHex(32);
  const t = nowMs();
  const exp = t + 30 * 24 * 60 * 60 * 1000;
  await c.env.DB.prepare(
    "INSERT INTO sessions (id,user_id,user_agent,ip,created_at,last_seen_at,expires_at) VALUES (?,?,?,?,?,?,?)"
  ).bind(sid, userId, c.req.header("user-agent") || null, c.req.header("cf-connecting-ip") || null, t, t, exp).run();
  setCookie(c, "sid", sid, { httpOnly: true, secure: true, sameSite: "Lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  const access = await signJwt({ sub: userId, roles }, c.env.JWT_SECRET, 900);
  return c.json({ user: { id: userId, roles }, access_token: access, expires_in: 900 });
}

app.post("/api/auth/logout", async (c) => {
  const sid = getCookie(c, "sid");
  if (sid) await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
  deleteCookie(c, "sid", { path: "/" });
  return c.json({ ok: true });
});

app.post("/api/auth/refresh", async (c) => {
  const sid = getCookie(c, "sid");
  if (!sid) return c.json({ error: { code: "no_session" } }, 401);
  const row = await c.env.DB.prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?").bind(sid)
    .first<{ user_id: string; expires_at: number }>();
  if (!row || row.expires_at < nowMs()) {
    deleteCookie(c, "sid", { path: "/" });
    return c.json({ error: { code: "expired" } }, 401);
  }
  await c.env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(nowMs(), sid).run();
  const roles = await rolesFor(c.env.DB, row.user_id);
  const access = await signJwt({ sub: row.user_id, roles }, c.env.JWT_SECRET, 900);
  return c.json({ access_token: access, expires_in: 900, user: { id: row.user_id, roles } });
});

app.get("/api/auth/me", requireAuth, async (c) => {
  const uid = c.get("userId");
  const u = await c.env.DB.prepare(
    "SELECT id,email,display_name,avatar_url,email_verified,created_at FROM users WHERE id = ?"
  ).bind(uid).first();
  const p = await c.env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(uid).first();
  return c.json({ user: u, profile: p, roles: c.get("roles") });
});

app.post("/api/auth/forgot", async (c) => {
  const { email } = (await c.req.json().catch(() => ({}))) as { email?: string };
  const u = email ? await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase())
    .first<{ id: string }>() : null;
  if (u) {
    const token = randomHex(32);
    const t = nowMs();
    await c.env.DB.prepare("INSERT INTO password_resets (token,user_id,created_at,expires_at) VALUES (?,?,?,?)")
      .bind(token, u.id, t, t + 60 * 60 * 1000).run();
    // TODO: trimite email cu link: ${APP_ORIGIN}/reset-password?token=${token}
    console.log(`[forgot] reset link: ${c.env.APP_ORIGIN}/reset-password?token=${token}`);
  }
  return c.json({ ok: true });
});

app.post("/api/auth/reset", async (c) => {
  const { token, password } = (await c.req.json().catch(() => ({}))) as { token?: string; password?: string };
  if (!token || !password || password.length < 8) return c.json({ error: { code: "invalid_input" } }, 400);
  const row = await c.env.DB.prepare("SELECT user_id, expires_at, used_at FROM password_resets WHERE token = ?").bind(token)
    .first<{ user_id: string; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at || row.expires_at < nowMs()) return c.json({ error: { code: "invalid_token" } }, 400);
  const hash = await hashPassword(password);
  const t = nowMs();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").bind(hash, t, row.user_id),
    c.env.DB.prepare("UPDATE password_resets SET used_at = ? WHERE token = ?").bind(t, token),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.user_id),
  ]);
  return c.json({ ok: true });
});

// ─── PROFILE ───────────────────────────────────────────────────────────
const PROFILE_FIELDS = [
  "display_name", "phone", "address", "entity_type", "company_name", "cui",
  "social_facebook", "social_instagram", "social_tiktok", "website",
  "language", "theme", "pseudonym",
] as const;

app.put("/api/profile", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const uid = c.get("userId");
  const isAdmin = (c.get("roles") as Role[]).includes("admin");

  const cols: string[] = [];
  const vals: any[] = [];
  for (const f of PROFILE_FIELDS) {
    if (f in body) { cols.push(`${f} = ?`); vals.push(body[f] ?? null); }
  }
  if (isAdmin && "staff_role" in body) { cols.push("staff_role = ?"); vals.push(body.staff_role ?? null); }
  cols.push("updated_at = ?"); vals.push(nowMs());
  vals.push(uid);

  await c.env.DB.prepare(`UPDATE profiles SET ${cols.join(", ")} WHERE id = ?`).bind(...vals).run();
  const p = await c.env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(uid).first();
  return c.json({ profile: p });
});

app.post("/api/profile/avatar", requireAuth, async (c) => {
  const uid = c.get("userId");
  const ct = c.req.header("content-type") || "application/octet-stream";
  const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
  const key = `avatars/${uid}/${nowMs()}.${ext}`;
  await c.env.FILES.put(key, c.req.raw.body, { httpMetadata: { contentType: ct } });
  const url = `${c.env.APP_ORIGIN}/api/files/${key}`;
  await c.env.DB.prepare("UPDATE profiles SET avatar_url = ?, updated_at = ? WHERE id = ?")
    .bind(url, nowMs(), uid).run();
  return c.json({ avatar_url: url });
});

// ─── R2 public read (avatars/website-media) ────────────────────────────
app.get("/api/files/:path{.+}", async (c) => {
  const path = c.req.param("path");
  const obj = await c.env.FILES.get(path);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
});

// ─── Generic CRUD scaffolds (extinde după nevoie) ──────────────────────
app.get("/api/clients", requireAuth, requireRole("staff", "admin"), async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM clients ORDER BY created_at DESC LIMIT 200").all();
  return c.json({ data: results });
});

// ─── Fallback: SPA assets ──────────────────────────────────────────────
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
