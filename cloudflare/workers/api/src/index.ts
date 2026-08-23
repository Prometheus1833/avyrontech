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

import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

export type Env = {
  DB: D1Database;
  KV: KVNamespace;
  FILES: R2Bucket;   // documente private per proiect
  MEDIA: R2Bucket;   // active publice (portfolio, logos, og images)
  JWT_SECRET: string;
  SEED_TOKEN?: string;
  ALLOWED_ORIGINS: string;
  // SMTP (formularul public de lead-uri)
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  LEAD_TO?: string;
};

type Role = "user" | "staff" | "admin";

const app = new Hono<{ Bindings: Env; Variables: { userId: string; roles: Role[] } }>();

app.use("*", async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return cors({
    origin: (origin) => {
      if (!origin) return allowed[0] || "";
      if (allowed.includes(origin)) return origin;
      // Permite orice preview/subdomeniu Lovable + avyron.ro
      try {
        const h = new URL(origin).hostname;
        if (h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com") || h === "avyron.ro" || h === "www.avyron.ro") {
          return origin;
        }
      } catch {}
      return allowed[0] || "";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })(c, next);
});

// ─── Crypto helpers (PBKDF2 + JWT HS256) ─────────────────────────────────
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
const now = () => Date.now();

// ─── Auth middleware ────────────────────────────────────────────────────
async function requireAuth(c: any, next: any) {
  const auth = c.req.header("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return c.json({ error: { code: "unauthenticated", message: "Missing token" } }, 401);
  const payload = await verifyJwt<{ sub: string; roles: Role[] }>(token, c.env.JWT_SECRET);
  if (!payload?.sub) return c.json({ error: { code: "unauthenticated", message: "Invalid token" } }, 401);
  c.set("userId", payload.sub);
  c.set("roles", payload.roles ?? ["user"]);
  await next();
}
const requireRole = (...roles: Role[]) => async (c: any, next: any) => {
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
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(id, "signup", c.req.header("cf-connecting-ip") || null, t),
  ]);
  return createSession(c, id, ["user"]);
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const row = await c.env.DB.prepare("SELECT id, password_hash FROM users WHERE email = ?").bind(email).first<{ id: string; password_hash: string }>();
  if (!row || !(await verifyPassword(password, row.password_hash)))
    return c.json({ error: { code: "invalid_credentials" } }, 401);
  const roles = await rolesFor(c.env.DB, row.id);
  await c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
    .bind(row.id, "login", c.req.header("cf-connecting-ip") || null, now()).run();
  return createSession(c, row.id, roles.length ? roles : ["user"]);
});

async function createSession(c: any, userId: string, roles: Role[]) {
  const sid = randomHex(32);
  const t = now();
  const exp = t + 30 * 24 * 60 * 60 * 1000; // 30d
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
  const row = await c.env.DB.prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?").bind(sid).first<{ user_id: string; expires_at: number }>();
  if (!row || row.expires_at < now()) {
    deleteCookie(c, "sid", { path: "/" });
    return c.json({ error: { code: "expired" } }, 401);
  }
  await c.env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(now(), sid).run();
  const roles = await rolesFor(c.env.DB, row.user_id);
  const access = await signJwt({ sub: row.user_id, roles }, c.env.JWT_SECRET, 900);
  return c.json({ access_token: access, expires_in: 900, user: { id: row.user_id, roles } });
});

app.get("/api/auth/me", requireAuth, async (c) => {
  const u = await c.env.DB.prepare("SELECT id,email,display_name,avatar_url,email_verified,created_at FROM users WHERE id = ?")
    .bind(c.get("userId")).first();
  return c.json({ user: u, roles: c.get("roles") });
});

app.post("/api/auth/forgot", async (c) => {
  const { email } = (await c.req.json().catch(() => ({}))) as { email?: string };
  const u = email ? await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first<{ id: string }>() : null;
  if (u) {
    const token = randomHex(32);
    const t = now();
    await c.env.DB.prepare("INSERT INTO password_resets (token,user_id,created_at,expires_at) VALUES (?,?,?,?)")
      .bind(token, u.id, t, t + 60 * 60 * 1000).run();
    // TODO: trimite emailul prin worker-ul avyron-email cu link-ul `https://avyron.ro/reset-password?token=${token}`
  }
  return c.json({ ok: true }); // răspuns generic — anti enumeration
});

app.post("/api/auth/reset", async (c) => {
  const { token, password } = (await c.req.json().catch(() => ({}))) as { token?: string; password?: string };
  if (!token || !password || password.length < 8) return c.json({ error: { code: "invalid_input" } }, 400);
  const row = await c.env.DB.prepare("SELECT user_id, expires_at, used_at FROM password_resets WHERE token = ?").bind(token).first<{ user_id: string; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at || row.expires_at < now()) return c.json({ error: { code: "invalid_token" } }, 400);
  const hash = await hashPassword(password);
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").bind(hash, t, row.user_id),
    c.env.DB.prepare("UPDATE password_resets SET used_at = ? WHERE token = ?").bind(t, token),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.user_id),
  ]);
  return c.json({ ok: true });
});

// ─── Business CRUD (exemplu: clients) ───────────────────────────────────
app.get("/api/clients", requireAuth, requireRole("staff", "admin"), async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM clients ORDER BY created_at DESC LIMIT 200").all();
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

// ─── Content (KV) ───────────────────────────────────────────────────────
app.get("/api/content/:key", requireAuth, requireRole("staff", "admin"), async (c) => {
  const v = await c.env.KV.get(c.req.param("key"), "json");
  return c.json({ data: v });
});
app.put("/api/content/:key", requireAuth, requireRole("admin"), async (c) => {
  await c.env.KV.put(c.req.param("key"), JSON.stringify(await c.req.json()));
  return c.json({ ok: true });
});

// ─── Media (R2) ─────────────────────────────────────────────────────────
app.put("/api/media/:path{.+}", requireAuth, requireRole("staff", "admin"), async (c) => {
  const path = c.req.param("path");
  await c.env.FILES.put(path, c.req.raw.body, { httpMetadata: { contentType: c.req.header("content-type") || "application/octet-stream" } });
  return c.json({ ok: true, path });
});

// ─── Platformă internă (proiecte + propuneri + linkuri + metadata) ──────
import { projectsRouter } from "./projects";
import { seedRouter } from "./seed";
import { mediaRouter } from "./media";
import { contactRouter } from "./contact";
app.use("/api/projects/*", requireAuth);
app.use("/api/proposals/*", requireAuth);
app.use("/api/links/*", requireAuth);
app.use("/api/metadata/*", requireAuth);
app.use("/api/media/*", requireAuth);
app.route("/", projectsRouter);
app.route("/", mediaRouter);
// Formularul public (fără auth)
app.route("/", contactRouter);
// Seed-ul are propria gardă (X-Seed-Token / bootstrap fără admin) — NU necesită requireAuth.
app.route("/", seedRouter);

export default app;
