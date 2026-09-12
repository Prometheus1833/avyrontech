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
import { handleMappedHostname } from "./sites.config";
import { apiDiscovery, API_VERSION, isApiHostname, isApiSurfaceRequest, normalizeVersionedApiRequest, openApiDocument } from "./apiGateway";
import { publicApiCacheRequest } from "./apiCache";
import { domainRouter } from "./domain";
import { promotionsRouter } from "./promotions";
import { recordPageEvent, funnelSummary, leadPipeline } from "./analytics";
import { EXCHANGE_RATE_REFRESH_CRON, getPublicExchangeRate, refreshExchangeRate } from "./exchangeRate";
import { platformRoleForUser } from "./authorization";
import { base32Encode, decryptTotpSecret, encryptTotpSecret, generateTotpSecret, totpUri, verifyTotp } from "./totp";
import { engineRouter, runDueEngineDiscovery } from "./engine";

export { AvyronAgentRuntime } from "./agents/AvyronAgentRuntime";

const app = new Hono<AppBindings>();

// Hostname routing runs before API/auth middleware. Demo hosts therefore cannot
// fall through to the production API, D1, KV or private assets.
app.use("*", async (c, next) => {
  const mapped = await handleMappedHostname(c.req.raw, c.env.ASSETS);
  if (mapped) return mapped;
  await next();
});

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

const appendVary = (current: string | null, value: string) => {
  const values = (current || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) values.push(value);
  return values.join(", ");
};

// One response policy covers both the canonical API hostname and the existing
// same-origin /api service-binding routes. Private responses are never cached;
// public handlers must opt in explicitly with Cache-Control.
app.use("*", async (c, next) => {
  if (!isApiSurfaceRequest(c.req.raw)) return next();
  const requestId = c.req.header("cf-ray") || crypto.randomUUID();
  c.set("requestId", requestId);
  const origin = c.req.header("origin");
  const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(c.req.method);

  if (unsafeMethod && origin && !allowedOrigin(c.env, origin)) {
    c.res = c.json({ error: { code: "forbidden_origin", message: "Originea nu este permisă", requestId } }, 403);
  } else {
    await next();
  }

  c.header("X-Request-Id", requestId);
  c.header("X-API-Version", API_VERSION);
  c.header("X-Robots-Tag", "noindex, nofollow");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  c.header("Content-Security-Policy", "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  if (!c.res.headers.has("cache-control")) c.header("Cache-Control", "private, no-store");
  if (origin) c.header("Vary", appendVary(c.res.headers.get("vary"), "Origin"));
  return c.res;
});

const authUiBaseUrl = (c: Context<AppBindings>): string => {
  if (new URL(c.req.url).hostname.toLowerCase() === "app.avyron.ro") {
    return "https://app.avyron.ro";
  }
  const origin = allowedOrigin(c.env, c.req.header("origin"));
  return origin === "https://app.avyron.ro"
    ? origin
    : (c.env.APP_URL || "https://avyron.ro").replace(/\/$/, "");
};

app.use("*", async (c, next) => {
  return cors({
    origin: (origin) => allowedOrigin(c.env, origin),
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id", "Idempotency-Key"],
    exposeHeaders: ["X-Request-Id", "X-API-Version", "X-Avyron-Cache"],
    maxAge: 86_400,
  })(c, next);
});

// Cache only anonymous, explicitly public reads. The normalized key prevents
// query-string cache fragmentation and reduces D1/R2 reads on the Free tier.
app.use("/api/*", async (c, next) => {
  const cacheKey = publicApiCacheRequest(c.req.raw);
  if (!cacheKey || typeof caches === "undefined") return next();
  const edgeCache = (caches as unknown as { default: Cache }).default;
  try {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Avyron-Cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers });
    }
  } catch (error) {
    console.warn(JSON.stringify({ event: "api_cache_read_failed", path: c.req.path, error: String(error) }));
  }

  await next();
  const cacheControl = c.res.headers.get("cache-control") || "";
  if (c.res.ok && /^public\b/i.test(cacheControl) && !c.res.headers.has("set-cookie")) {
    const stored = c.res.clone();
    c.executionCtx.waitUntil(edgeCache.put(cacheKey, stored).catch((error) =>
      console.warn(JSON.stringify({ event: "api_cache_write_failed", path: c.req.path, error: String(error) })),
    ));
    c.header("X-Avyron-Cache", "MISS");
  }
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
  const verifyUrl = `${authUiBaseUrl(c)}/auth?verify=${encodeURIComponent(token)}`;
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
  const payload = await verifyJwt<{ sub: string; sid?: string }>(token, c.env.JWT_SECRET);
  if (!payload?.sub || !payload.sid) return c.json({ error: { code: "unauthenticated", message: "Invalid token" } }, 401);
  const session = await c.env.DB.prepare(
    `SELECT session.mfa_verified_at, group_concat(role.role) AS roles_csv
       FROM sessions AS session
       JOIN users AS account ON account.id = session.user_id AND account.disabled_at IS NULL
       LEFT JOIN user_roles AS role ON role.user_id = account.id
      WHERE session.id = ? AND session.user_id = ? AND session.revoked_at IS NULL AND session.expires_at > ?
      GROUP BY session.id`,
  ).bind(payload.sid, payload.sub, now()).first<{ mfa_verified_at: number | null; roles_csv: string | null }>();
  if (!session) return c.json({ error: { code: "session_revoked", message: "Sesiunea nu mai este activă" } }, 401);
  const liveRoles = (session.roles_csv || "user").split(",").filter((role): role is Role => ["user", "staff", "admin"].includes(role));
  c.set("userId", payload.sub);
  c.set("sessionId", payload.sid);
  c.set("roles", liveRoles.length ? liveRoles : ["user"]);
  c.set("mfaVerified", session.mfa_verified_at !== null);
  await next();
}
const requireRole = (...roles: Role[]) => async (c: Context<AppBindings>, next: Next) => {
  const userRoles: Role[] = c.get("roles") ?? [];
  if (!userRoles.some((r) => roles.includes(r)))
    return c.json({ error: { code: "forbidden", message: "Insufficient role" } }, 403);
  if (roles.some((role) => role === "staff" || role === "admin") && !c.get("mfaVerified"))
    return c.json({ error: { code: "mfa_required", message: "Confirmă autentificarea în doi pași" } }, 403);
  await next();
};

async function isSuperAdmin(c: Context<AppBindings>): Promise<boolean> {
  return (await platformRoleForUser(c.env.DB, c.get("userId"))) !== null;
}
const requireSuperAdmin = async (c: Context<AppBindings>, next: Next) => {
  if (!(await isSuperAdmin(c)))
    return c.json({ error: { code: "forbidden", message: "Doar super adminul are acces" } }, 403);
  if (!c.get("mfaVerified"))
    return c.json({ error: { code: "mfa_required", message: "MFA este obligatoriu pentru acces privilegiat" } }, 403);
  await next();
};

async function rolesFor(db: D1Database, userId: string): Promise<Role[]> {
  const { results } = await db.prepare("SELECT role FROM user_roles WHERE user_id = ?").bind(userId).all<{ role: Role }>();
  return results.map((r) => r.role);
}

const privilegedAccount = async (db: D1Database, userId: string, roles: Role[]): Promise<boolean> => {
  if (roles.includes("staff") || roles.includes("admin") || (await platformRoleForUser(db, userId)) !== null) return true;
  return Boolean(await db.prepare(
    `SELECT 1 FROM organization_memberships
      WHERE user_id = ? AND status = 'active' AND role IN ('owner','admin','manager','specialist') LIMIT 1`,
  ).bind(userId).first());
};

const requirePrivilegedMfa = async (c: Context<AppBindings>, next: Next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return next();
  if (await privilegedAccount(c.env.DB, c.get("userId"), c.get("roles") ?? []) && !c.get("mfaVerified")) {
    return c.json({ error: { code: "mfa_required", message: "MFA este obligatoriu pentru această acțiune" } }, 403);
  }
  await next();
};

async function recordSecurityEvent(
  c: Context<AppBindings>,
  userId: string | null,
  action: string,
  outcome: "allowed" | "denied" | "failed",
  severity: "info" | "warning" | "critical" = "info",
) {
  await c.env.DB.prepare(
    `INSERT INTO security_events
      (id,actor_user_id,actor_type,action,outcome,severity,request_id,ip_hash,metadata_json,created_at)
     VALUES (?,?,?, ?,?,?,?,?, '{}',?)`,
  ).bind(
    uuid(), userId, userId ? "user" : "anonymous", action, outcome, severity,
    c.get("requestId") || null, await hashKey(clientIp(c.req.raw)), now(),
  ).run();
}

// ─── Discovery & health ─────────────────────────────────────────────────
const healthPayload = () => ({ ok: true, service: "avyron-api", version: API_VERSION, ts: now() });

app.get("/", async (c, next) => {
  if (!isApiHostname(new URL(c.req.url).hostname)) return next();
  c.header("cache-control", "public, max-age=300, stale-while-revalidate=3600");
  return c.json(apiDiscovery);
});
app.get("/openapi.json", async (c, next) => {
  if (!isApiHostname(new URL(c.req.url).hostname)) return next();
  c.header("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
  return c.json(openApiDocument);
});
app.get("/healthz", async (c, next) => {
  if (!isApiHostname(new URL(c.req.url).hostname)) return next();
  c.header("cache-control", "no-store");
  return c.json(healthPayload());
});
app.get("/robots.txt", async (c, next) => {
  if (!isApiHostname(new URL(c.req.url).hostname)) return next();
  c.header("content-type", "text/plain; charset=utf-8");
  c.header("cache-control", "public, max-age=86400");
  return c.body("User-agent: *\nDisallow: /\n");
});
app.get("/.well-known/security.txt", async (c, next) => {
  if (!isApiHostname(new URL(c.req.url).hostname)) return next();
  return c.redirect("https://avyron.ro/.well-known/security.txt", 308);
});
app.get("/api/health", (c) => {
  c.header("cache-control", "no-store");
  return c.json(healthPayload());
});

app.get("/api/public/exchange-rate", async (c) => {
  const exchangeRate = await getPublicExchangeRate(c.env);
  if (exchangeRate.status === "stale") {
    c.executionCtx.waitUntil(refreshExchangeRate(c.env).catch((error) => {
      console.error(JSON.stringify({ event: "exchange_rate_revalidation_failed", error: String(error) }));
    }));
  }
  c.header("cache-control", exchangeRate.status === "fallback"
    ? "public, max-age=30, s-maxage=60"
    : "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400");
  return c.json({ data: exchangeRate });
});

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
  const resolvedRoles = roles.length ? roles : ["user"] as Role[];
  if (await privilegedAccount(c.env.DB, row.id, resolvedRoles)) {
    const factor = await c.env.DB.prepare(
      "SELECT id FROM mfa_factors WHERE user_id = ? AND kind = 'totp' AND status = 'active' LIMIT 1",
    ).bind(row.id).first<{ id: string }>();
    if (factor) {
      const challenge = randomHex(32);
      const timestamp = now();
      await c.env.DB.batch([
        c.env.DB.prepare("DELETE FROM mfa_challenges WHERE user_id = ? OR expires_at < ?").bind(row.id, timestamp),
        c.env.DB.prepare(
          `INSERT INTO mfa_challenges
            (token_hash,user_id,factor_id,ip_hash,attempts,expires_at,created_at)
           VALUES (?,?,?,?,0,?,?)`,
        ).bind(await sha256(challenge), row.id, factor.id, await hashKey(clientIp(c.req.raw)), timestamp + 5 * 60_000, timestamp),
      ]);
      await recordSecurityEvent(c, row.id, "auth.mfa_challenge_created", "allowed");
      return c.json({ mfa_required: true, challenge_token: challenge, expires_in: 300 });
    }
    return createSession(c, row.id, resolvedRoles, false, { mfa_enrollment_required: true });
  }
  return createSession(c, row.id, resolvedRoles, false);
});

async function createSession(
  c: Context<AppBindings>,
  userId: string,
  roles: Role[],
  mfaVerified: boolean,
  extra: Record<string, unknown> = {},
) {
  const sid = randomHex(32);
  const sessionId = await sha256(sid);
  const t = now();
  const exp = t + 30 * 24 * 60 * 60 * 1000; // 30d
  const userAgent = c.req.header("user-agent") || null;
  const deviceName = userAgent ? userAgent.slice(0, 120) : "Dispozitiv necunoscut";
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO sessions
        (id,user_id,user_agent,ip,device_name,mfa_verified_at,created_at,last_seen_at,expires_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).bind(sessionId, userId, userAgent, c.req.header("cf-connecting-ip") || null, deviceName, mfaVerified ? t : null, t, t, exp),
    c.env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(t, userId),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(userId, mfaVerified ? "login_mfa" : "login", c.req.header("cf-connecting-ip") || null, t),
  ]);
  setCookie(c, "sid", sid, { httpOnly: true, secure: true, sameSite: "None", path: "/", maxAge: 30 * 24 * 60 * 60 });
  const access = await signJwt({ sub: userId, sid: sessionId }, c.env.JWT_SECRET, 900);
  return c.json({ user: { id: userId, roles }, access_token: access, expires_in: 900, ...extra });
}

app.post("/api/auth/mfa/challenge", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { challengeToken?: string; code?: string };
  const challengeToken = String(body.challengeToken || "");
  const code = String(body.code || "").trim().toUpperCase();
  if (!challengeToken || !code) return c.json({ error: { code: "invalid_input" } }, 400);
  const tokenHash = await sha256(challengeToken);
  const ipHash = await hashKey(clientIp(c.req.raw));
  const rate = await checkRateLimit(c.env.DB, [
    { key: `mfa:ip:${ipHash}:15m`, limit: 20, windowSec: 900 },
    { key: `mfa:challenge:${tokenHash}:15m`, limit: 6, windowSec: 900 },
  ], { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `mfa:${tokenHash}` });
  if (!rate.ok) return c.json({ error: { code: "rate_limited", message: "Prea multe încercări" } }, 429);

  const challenge = await c.env.DB.prepare(
    `SELECT c.user_id,c.factor_id,c.ip_hash,c.attempts,c.expires_at,f.secret_ciphertext
       FROM mfa_challenges c
       JOIN mfa_factors f ON f.id = c.factor_id AND f.status = 'active'
      WHERE c.token_hash = ? AND c.used_at IS NULL AND c.attempts < 5`,
  ).bind(tokenHash).first<{
    user_id: string; factor_id: string; ip_hash: string; attempts: number;
    expires_at: number; secret_ciphertext: string;
  }>();
  if (!challenge || challenge.expires_at < now() || challenge.ip_hash !== ipHash) {
    await recordSecurityEvent(c, challenge?.user_id ?? null, "auth.mfa_challenge", "denied", "warning");
    return c.json({ error: { code: "invalid_or_expired_challenge" } }, 401);
  }

  let valid = false;
  let recoveryHash: string | null = null;
  if (/^\d{6}$/.test(code)) {
    try {
      const secret = await decryptTotpSecret(challenge.secret_ciphertext, c.env.MFA_ENCRYPTION_KEY);
      valid = await verifyTotp(secret, code);
    } catch (error) {
      console.error(JSON.stringify({ event: "mfa_secret_decrypt_failed", userId: challenge.user_id, error: String(error) }));
    }
  } else if (/^AVY-[A-F0-9]{5}-[A-F0-9]{5}$/.test(code)) {
    recoveryHash = await sha256(code);
    const recovery = await c.env.DB.prepare(
      "SELECT 1 FROM mfa_recovery_codes WHERE factor_id = ? AND code_hash = ? AND used_at IS NULL",
    ).bind(challenge.factor_id, recoveryHash).first();
    valid = Boolean(recovery);
  }

  if (!valid) {
    await c.env.DB.prepare(
      "UPDATE mfa_challenges SET attempts = attempts + 1 WHERE token_hash = ? AND attempts < 5",
    ).bind(tokenHash).run();
    await recordSecurityEvent(c, challenge.user_id, "auth.mfa_challenge", "denied", "warning");
    return c.json({ error: { code: "invalid_mfa_code", message: "Codul nu este valid" } }, 401);
  }

  const timestamp = now();
  const consumed = await c.env.DB.prepare(
    "UPDATE mfa_challenges SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND attempts < 5",
  ).bind(timestamp, tokenHash).run();
  if ((consumed.meta.changes ?? 0) !== 1) return c.json({ error: { code: "challenge_already_used" } }, 409);
  const writes = [
    c.env.DB.prepare("UPDATE mfa_factors SET last_used_at = ? WHERE id = ?").bind(timestamp, challenge.factor_id),
  ];
  if (recoveryHash) {
    writes.push(c.env.DB.prepare(
      "UPDATE mfa_recovery_codes SET used_at = ? WHERE factor_id = ? AND code_hash = ? AND used_at IS NULL",
    ).bind(timestamp, challenge.factor_id, recoveryHash));
  }
  await c.env.DB.batch(writes);
  await recordSecurityEvent(c, challenge.user_id, recoveryHash ? "auth.mfa_recovery_used" : "auth.mfa_challenge", "allowed", recoveryHash ? "warning" : "info");
  const roles = await rolesFor(c.env.DB, challenge.user_id);
  return createSession(c, challenge.user_id, roles.length ? roles : ["user"], true);
});

app.get("/api/auth/mfa", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id,kind,label,status,verified_at,last_used_at,created_at
       FROM mfa_factors WHERE user_id = ? AND status <> 'revoked' ORDER BY created_at DESC`,
  ).bind(c.get("userId")).all();
  return c.json({ data: results, session_verified: c.get("mfaVerified") });
});

app.post("/api/auth/mfa/totp/enroll", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as { currentPassword?: string; label?: string };
  const password = String(body.currentPassword || "");
  const userId = c.get("userId");
  const user = await c.env.DB.prepare(
    "SELECT email,password_hash FROM users WHERE id = ? AND disabled_at IS NULL",
  ).bind(userId).first<{ email: string; password_hash: string }>();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await recordSecurityEvent(c, userId, "auth.mfa_enroll", "denied", "warning");
    return c.json({ error: { code: "invalid_password", message: "Parola curentă nu este corectă" } }, 403);
  }
  const active = await c.env.DB.prepare(
    "SELECT 1 FROM mfa_factors WHERE user_id = ? AND kind = 'totp' AND status = 'active'",
  ).bind(userId).first();
  if (active) return c.json({ error: { code: "mfa_already_enabled" } }, 409);
  const secret = generateTotpSecret();
  const factorId = uuid();
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM mfa_factors WHERE user_id = ? AND kind = 'totp' AND status = 'pending'").bind(userId),
    c.env.DB.prepare(
      `INSERT INTO mfa_factors
        (id,user_id,kind,label,secret_ciphertext,status,created_at)
       VALUES (?,?,'totp',?,?,'pending',?)`,
    ).bind(factorId, userId, String(body.label || "Aplicație de autentificare").slice(0, 80), await encryptTotpSecret(secret, c.env.MFA_ENCRYPTION_KEY), timestamp),
  ]);
  await recordSecurityEvent(c, userId, "auth.mfa_enroll_started", "allowed");
  return c.json({ factorId, secret: base32Encode(secret), otpauthUri: totpUri(secret, user.email) });
});

app.post("/api/auth/mfa/totp/verify", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as { factorId?: string; code?: string };
  const factorId = String(body.factorId || "");
  const sid = getCookie(c, "sid");
  if (!sid) return c.json({ error: { code: "session_required" } }, 401);
  const hashedSid = await sha256(sid);
  const sessionId = c.get("sessionId");
  if (sessionId !== hashedSid && sessionId !== sid) return c.json({ error: { code: "session_mismatch" } }, 401);
  const factor = await c.env.DB.prepare(
    `SELECT secret_ciphertext FROM mfa_factors
      WHERE id = ? AND user_id = ? AND kind = 'totp' AND status = 'pending'`,
  ).bind(factorId, c.get("userId")).first<{ secret_ciphertext: string }>();
  if (!factor) return c.json({ error: { code: "factor_not_found" } }, 404);
  const secret = await decryptTotpSecret(factor.secret_ciphertext, c.env.MFA_ENCRYPTION_KEY);
  if (!(await verifyTotp(secret, String(body.code || "")))) {
    await recordSecurityEvent(c, c.get("userId"), "auth.mfa_enroll_verify", "denied", "warning");
    return c.json({ error: { code: "invalid_mfa_code", message: "Codul nu este valid" } }, 400);
  }
  const recoveryCodes = Array.from({ length: 10 }, () => {
    const value = randomHex(5).toUpperCase();
    return `AVY-${value.slice(0, 5)}-${value.slice(5)}`;
  });
  const timestamp = now();
  const recoveryStatements = await Promise.all(recoveryCodes.map(async (code) =>
    c.env.DB.prepare("INSERT INTO mfa_recovery_codes (factor_id,code_hash,created_at) VALUES (?,?,?)")
      .bind(factorId, await sha256(code), timestamp),
  ));
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE mfa_factors SET status = 'active', verified_at = ?, last_used_at = ? WHERE id = ? AND status = 'pending'",
    ).bind(timestamp, timestamp, factorId),
    ...recoveryStatements,
  ]);
  await c.env.DB.prepare(
    "UPDATE sessions SET mfa_verified_at = ? WHERE id IN (?, ?) AND user_id = ? AND revoked_at IS NULL",
  ).bind(timestamp, sessionId, sid, c.get("userId")).run();
  const access = await signJwt({ sub: c.get("userId"), sid: sessionId }, c.env.JWT_SECRET, 900);
  await recordSecurityEvent(c, c.get("userId"), "auth.mfa_enabled", "allowed");
  return c.json({ ok: true, access_token: access, expires_in: 900, recoveryCodes });
});

app.delete("/api/auth/mfa/:id", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as { currentPassword?: string; code?: string };
  const userId = c.get("userId");
  if (!c.get("mfaVerified")) return c.json({ error: { code: "mfa_required" } }, 403);
  const row = await c.env.DB.prepare(
    `SELECT u.password_hash,f.secret_ciphertext
       FROM users u JOIN mfa_factors f ON f.user_id = u.id
      WHERE u.id = ? AND f.id = ? AND f.kind = 'totp' AND f.status = 'active'`,
  ).bind(userId, c.req.param("id")).first<{ password_hash: string; secret_ciphertext: string }>();
  if (!row || !(await verifyPassword(String(body.currentPassword || ""), row.password_hash)))
    return c.json({ error: { code: "invalid_password" } }, 403);
  const secret = await decryptTotpSecret(row.secret_ciphertext, c.env.MFA_ENCRYPTION_KEY);
  if (!(await verifyTotp(secret, String(body.code || "")))) return c.json({ error: { code: "invalid_mfa_code" } }, 401);
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE mfa_factors SET status = 'revoked' WHERE id = ? AND user_id = ?").bind(c.req.param("id"), userId),
    c.env.DB.prepare("UPDATE sessions SET revoked_at = ?, revoked_reason = 'mfa_disabled' WHERE user_id = ? AND revoked_at IS NULL").bind(timestamp, userId),
  ]);
  deleteCookie(c, "sid", { path: "/" });
  await recordSecurityEvent(c, userId, "auth.mfa_disabled", "allowed", "warning");
  return c.json({ ok: true });
});

app.post("/api/auth/logout", async (c) => {
  const origin = c.req.header("origin");
  if (origin && !allowedOrigin(c.env, origin)) return c.json({ error: { code: "forbidden_origin" } }, 403);
  const sid = getCookie(c, "sid");
  if (sid) await c.env.DB.prepare(
    "UPDATE sessions SET revoked_at = ?, revoked_reason = 'logout' WHERE id IN (?, ?) AND revoked_at IS NULL",
  ).bind(now(), await sha256(sid), sid).run();
  deleteCookie(c, "sid", { path: "/" });
  return c.json({ ok: true });
});

app.post("/api/auth/refresh", async (c) => {
  const origin = c.req.header("origin");
  if (origin && !allowedOrigin(c.env, origin)) return c.json({ error: { code: "forbidden_origin" } }, 403);
  const sid = getCookie(c, "sid");
  if (!sid) return c.json({ error: { code: "no_session" } }, 401);
  const hashedSid = await sha256(sid);
  const row = await c.env.DB.prepare(
    "SELECT id,user_id,expires_at,mfa_verified_at FROM sessions WHERE id IN (?, ?) AND revoked_at IS NULL LIMIT 1",
  ).bind(hashedSid, sid).first<{ id: string; user_id: string; expires_at: number; mfa_verified_at: number | null }>();
  if (!row || row.expires_at < now()) {
    if (row) await c.env.DB.prepare(
      "UPDATE sessions SET revoked_at = ?, revoked_reason = 'expired' WHERE id = ? AND revoked_at IS NULL",
    ).bind(now(), row.id).run();
    deleteCookie(c, "sid", { path: "/" });
    return c.json({ error: { code: "expired" } }, 401);
  }
  await c.env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(now(), row.id).run();
  const roles = await rolesFor(c.env.DB, row.user_id);
  const resolvedRoles = roles.length ? roles : ["user"] as Role[];
  const access = await signJwt({ sub: row.user_id, sid: row.id }, c.env.JWT_SECRET, 900);
  return c.json({ access_token: access, expires_in: 900, user: { id: row.user_id, roles: resolvedRoles } });
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
  return c.json({ user: u, profile, roles: c.get("roles"), superadmin: await isSuperAdmin(c) });
});

app.get("/api/auth/sessions", requireAuth, async (c) => {
  const sid = getCookie(c, "sid");
  const currentId = sid ? await sha256(sid) : null;
  const { results } = await c.env.DB.prepare(
    `SELECT id, device_name, created_at, last_seen_at, expires_at, mfa_verified_at
       FROM sessions
      WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
      ORDER BY last_seen_at DESC`,
  ).bind(c.get("userId"), now()).all<{
    id: string; device_name: string | null; created_at: number; last_seen_at: number;
    expires_at: number; mfa_verified_at: number | null;
  }>();
  return c.json({
    data: results.map((session) => ({ ...session, current: session.id === currentId })),
  });
});

app.delete("/api/auth/sessions/:id", requireAuth, async (c) => {
  const sessionId = c.req.param("id") || "";
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(sessionId)) {
    return c.json({ error: { code: "invalid_session" } }, 400);
  }
  const result = await c.env.DB.prepare(
    `UPDATE sessions
        SET revoked_at = ?, revoked_reason = 'user_revoked'
      WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
  ).bind(now(), sessionId, c.get("userId")).run();
  if ((result.meta.changes ?? 0) !== 1) return c.json({ error: { code: "not_found" } }, 404);

  const currentSid = getCookie(c, "sid");
  if (currentSid && await sha256(currentSid) === sessionId) deleteCookie(c, "sid", { path: "/" });
  return c.json({ ok: true });
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
    const resetUrl = `${authUiBaseUrl(c)}/reset-password?token=${encodeURIComponent(token)}`;
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
    c.env.DB.prepare(
      "UPDATE sessions SET revoked_at = ?, revoked_reason = 'password_reset' WHERE user_id = ? AND revoked_at IS NULL",
    ).bind(t, row.user_id),
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
    return c.json({ error: { code: "invalid_password", message: "Parola curentă nu este corectă" } }, 403);
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?")
      .bind(await hashPassword(body.newPassword), timestamp, userId),
    c.env.DB.prepare(
      "UPDATE sessions SET revoked_at = ?, revoked_reason = 'password_change' WHERE user_id = ? AND revoked_at IS NULL",
    ).bind(timestamp, userId),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(userId, "password_change", c.req.header("cf-connecting-ip") || null, timestamp),
  ]);
  deleteCookie(c, "sid", { path: "/" });
  return c.json({ ok: true });
});

app.post("/api/auth/change-email/request", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as { currentPassword?: string; newEmail?: string };
  const newEmail = String(body.newEmail || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(newEmail)) return c.json({ error: { code: "invalid_email" } }, 400);
  const userId = c.get("userId");
  if (await privilegedAccount(c.env.DB, userId, c.get("roles") ?? []) && !c.get("mfaVerified")) {
    return c.json({ error: { code: "mfa_required", message: "MFA este obligatoriu pentru schimbarea emailului privilegiat" } }, 403);
  }
  const user = await c.env.DB.prepare(
    "SELECT email,password_hash FROM users WHERE id = ? AND disabled_at IS NULL",
  ).bind(userId).first<{ email: string; password_hash: string }>();
  if (!user || !(await verifyPassword(String(body.currentPassword || ""), user.password_hash))) {
    await recordSecurityEvent(c, userId, "auth.email_change_requested", "denied", "warning");
    return c.json({ error: { code: "invalid_password", message: "Parola curentă nu este corectă" } }, 403);
  }
  if (newEmail === user.email.toLowerCase()) return c.json({ error: { code: "email_unchanged" } }, 400);
  if (await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(newEmail).first()) {
    return c.json({ error: { code: "email_taken" } }, 409);
  }
  const rate = await checkRateLimit(c.env.DB, [
    { key: `email-change:user:${userId}:d`, limit: 3, windowSec: 86_400 },
    { key: `email-change:ip:${await hashKey(clientIp(c.req.raw))}:h`, limit: 6, windowSec: 3600 },
  ]);
  if (!rate.ok) return c.json({ error: { code: "rate_limited" } }, 429);
  const token = randomHex(32);
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE email_change_requests SET revoked_at = ? WHERE user_id = ? AND used_at IS NULL AND revoked_at IS NULL",
    ).bind(timestamp, userId),
    c.env.DB.prepare(
      `INSERT INTO email_change_requests
        (token_hash,user_id,old_email,new_email,expires_at,created_at) VALUES (?,?,?,?,?,?)`,
    ).bind(await sha256(token), userId, user.email, newEmail, timestamp + 60 * 60_000, timestamp),
  ]);
  const confirmationUrl = `${authUiBaseUrl(c)}/auth?email_change=${encodeURIComponent(token)}`;
  const confirmation = await deliverMail(c.env, {
    to: newEmail,
    subject: "Confirmă noua adresă de email Avyron",
    text: `Confirmă noua adresă de email folosind linkul de mai jos. Linkul este valabil 60 de minute:\n\n${confirmationUrl}`,
    html: `<p>Confirmă noua adresă de email pentru contul Avyron.</p><p><a href="${confirmationUrl}">Confirmă schimbarea</a></p><p>Linkul este valabil 60 de minute.</p>`,
  });
  await logDelivery(c.env, { kind: "email_change_confirmation", entityId: userId, recipient: newEmail, result: confirmation }).catch(() => {});
  const alert = await deliverMail(c.env, {
    to: user.email,
    subject: "Solicitare de schimbare a emailului Avyron",
    text: "A fost solicitată schimbarea adresei de email a contului tău. Dacă nu ai inițiat acțiunea, schimbă parola și contactează echipa Avyron.",
    html: "<p>A fost solicitată schimbarea adresei de email a contului tău.</p><p>Dacă nu ai inițiat acțiunea, schimbă parola și contactează echipa Avyron.</p>",
  });
  await logDelivery(c.env, { kind: "email_change_alert", entityId: userId, recipient: user.email, result: alert }).catch(() => {});
  await recordSecurityEvent(c, userId, "auth.email_change_requested", "allowed", "warning");
  return c.json({ ok: true, confirmation_email_sent: confirmation.delivered }, confirmation.delivered ? 202 : 503);
});

app.post("/api/auth/change-email/confirm", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as { token?: string };
  const token = String(body.token || "");
  if (!token) return c.json({ error: { code: "invalid_token" } }, 400);
  const tokenHash = await sha256(token);
  const request = await c.env.DB.prepare(
    `SELECT token_hash,user_id,old_email,new_email,expires_at
       FROM email_change_requests
      WHERE token_hash = ? AND user_id = ? AND used_at IS NULL AND revoked_at IS NULL`,
  ).bind(tokenHash, c.get("userId")).first<{
    token_hash: string; user_id: string; old_email: string; new_email: string; expires_at: number;
  }>();
  if (!request || request.expires_at < now()) return c.json({ error: { code: "invalid_or_expired_token" } }, 400);
  if (await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ? AND id <> ?").bind(request.new_email, request.user_id).first()) {
    return c.json({ error: { code: "email_taken" } }, 409);
  }
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET email = ?, updated_at = ? WHERE id = ? AND email = ?")
      .bind(request.new_email, timestamp, request.user_id, request.old_email),
    c.env.DB.prepare("UPDATE platform_principals SET email = ?, updated_at = ? WHERE email = ?")
      .bind(request.new_email, timestamp, request.old_email),
    c.env.DB.prepare("UPDATE email_change_requests SET used_at = ? WHERE token_hash = ? AND used_at IS NULL")
      .bind(timestamp, request.token_hash),
    c.env.DB.prepare("UPDATE sessions SET revoked_at = ?, revoked_reason = 'email_change' WHERE user_id = ? AND revoked_at IS NULL")
      .bind(timestamp, request.user_id),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,ip,created_at) VALUES (?,?,?,?)")
      .bind(request.user_id, "email_change", c.req.header("cf-connecting-ip") || null, timestamp),
  ]);
  deleteCookie(c, "sid", { path: "/" });
  await recordSecurityEvent(c, request.user_id, "auth.email_changed", "allowed", "warning");
  return c.json({ ok: true, reauthentication_required: true });
});

const PROFILE_FIELDS = ["display_name", "phone", "address", "entity_type", "company_name", "cui", "social_facebook", "social_instagram", "social_tiktok", "website", "language", "theme", "pseudonym"] as const;
const profileLimits: Record<(typeof PROFILE_FIELDS)[number], number> = {
  display_name: 100, phone: 40, address: 500, entity_type: 20, company_name: 160, cui: 40,
  social_facebook: 300, social_instagram: 300, social_tiktok: 300, website: 300,
  language: 2, theme: 10, pseudonym: 80,
};

// Privileged columns are never patchable through this endpoint. The allowlist
// already drops them; the explicit reject makes escalation attempts loud.
const PRIVILEGED_PROFILE_FIELDS = ["staff_role", "role", "roles", "id", "avatar_url"] as const;

app.put("/api/profile", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  if (PRIVILEGED_PROFILE_FIELDS.some((field) => field in body)) {
    return c.json({ error: { code: "forbidden_field", message: "Câmp privilegiat: doar un administrator îl poate modifica" } }, 403);
  }
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

const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!domain) return "";
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
};

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
  ).all<Record<string, unknown>>();
  if (await isSuperAdmin(c)) return c.json({ data: results });
  // Staff-ul vede doar ce îi trebuie pentru alocare; fără date personale complete.
  const masked = results.map((r) => ({
    id: r.id,
    display_name: r.display_name ?? r.pseudonym ?? null,
    avatar_url: r.avatar_url,
    company_name: r.company_name,
    staff_role: r.staff_role,
    roles: r.roles,
    email: maskEmail(String(r.email ?? "")),
  }));
  return c.json({ data: masked });
});

app.get("/api/admin/email-failures", requireAuth, requireSuperAdmin, async (c) => {
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

// Măsurare first-party a pâlniei (public, fără date personale).
app.post("/api/analytics/event", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const ipKey = await hashKey(clientIp(c.req.raw));
  const rate = await checkRateLimit(c.env.DB, [{ key: `evt:${ipKey}:h`, limit: 240, windowSec: 3600 }]);
  if (!rate.ok) return c.json({ ok: false, error: "rate_limited" }, 429);
  const result = await recordPageEvent(c.env.DB, {
    page: body.page,
    event: body.event,
    sessionId: body.sessionId,
    lang: body.lang,
    path: body.path,
    referrer: body.referrer,
  });
  return c.json(result, result.ok ? 202 : 400);
});

app.get("/api/admin/analytics/funnel", requireAuth, requireRole("staff", "admin"), async (c) => {
  const page = (c.req.query("page") || "blogpro").slice(0, 40);
  const days = Math.min(90, Math.max(1, Number.parseInt(c.req.query("days") || "30", 10) || 30));
  return c.json(await funnelSummary(c.env.DB, page, days));
});

app.get("/api/admin/leads/pipeline", requireAuth, requireRole("staff", "admin"), async (c) => {
  const product = (c.req.query("product") || "").slice(0, 60) || null;
  const days = Math.min(365, Math.max(1, Number.parseInt(c.req.query("days") || "90", 10) || 90));
  return c.json(await leadPipeline(c.env.DB, product, days));
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
import { organizationsRouter } from "./organizations";
import { aiOsRouter } from "./aiOs";
import { leadsRouter } from "./leads";
import { aiProjectsRouter } from "./aiProjects";
import { financeRouter } from "./finance";
import { seedRouter } from "./seed";
import { mediaRouter } from "./media";
import { contactRouter } from "./contact";
import { blogRouter, getBlogSitemapEntries, getPublishedBlogPost } from "./blog";
import { injectBlogHtml, mergeBlogSitemap } from "../../../../src/worker/blogHtml";
import { BLOG_SLUGS } from "../../../../src/data/blogSlugs";
import { decide, isKnownSpaRoute, normalizePath } from "../../../../src/worker/router";
import { serveCachedAsset } from "../../../../src/worker/assetCache";
app.use("/api/projects/*", requireAuth);
app.use("/api/organizations/*", requireAuth);
app.use("/api/organization-invitations/*", requireAuth);
app.use("/api/proposals/*", requireAuth);
app.use("/api/links/*", requireAuth);
app.use("/api/metadata/*", requireAuth);
app.use("/api/media/*", requireAuth);
app.use("/api/commerce/*", requireAuth);
app.use("/api/promotions/*", requireAuth);
app.use("/api/leads", requireAuth);
app.use("/api/leads/*", requireAuth);
app.use("/api/ai-projects", requireAuth);
app.use("/api/ai-projects/*", requireAuth);
app.use("/api/finance/*", requireAuth);
app.use("/api/engine/*", requireAuth);
app.use("/api/projects/*", requirePrivilegedMfa);
app.use("/api/organizations/*", requirePrivilegedMfa);
app.use("/api/organization-invitations/*", requirePrivilegedMfa);
app.use("/api/proposals/*", requirePrivilegedMfa);
app.use("/api/links/*", requirePrivilegedMfa);
app.use("/api/metadata/*", requirePrivilegedMfa);
app.use("/api/leads", requirePrivilegedMfa);
app.use("/api/leads/*", requirePrivilegedMfa);
app.use("/api/ai-projects", requirePrivilegedMfa);
app.use("/api/ai-projects/*", requirePrivilegedMfa);
app.use("/api/finance/*", requirePrivilegedMfa);
app.use("/api/engine/*", requirePrivilegedMfa);
// Editorial mutations are authorized server-side. Public article reads and
// immutable R2 cover images remain accessible to crawlers and visitors.
app.use("/api/blog/staff/*", requireAuth, requireRole("staff", "admin"));
// AI OS: consola de administrare este rezervată super adminilor; scrierile sunt
// limitate suplimentar la contul owner în interiorul routerului.
app.use("/api/ai/admin/*", requireAuth, requireSuperAdmin);
app.route("/", aiOsRouter);
app.route("/", leadsRouter);
app.route("/", aiProjectsRouter);
app.route("/", financeRouter);
app.route("/", engineRouter);
app.route("/", organizationsRouter);
app.route("/", projectsRouter);
app.route("/", mediaRouter);
app.route("/", blogRouter);
app.route("/", domainRouter);
app.route("/", promotionsRouter);
// Formularul public (fără auth)
app.route("/", contactRouter);
// Importul administrativ are propria gardă constant-time X-Seed-Token.
app.route("/", seedRouter);

async function publicBlogPage(c: Context<AppBindings>, language: "ro" | "en", requestedSlug?: string) {
  const requestUrl = new URL(c.req.url);
  const canonicalPath = normalizePath(requestUrl.pathname);
  if (canonicalPath !== requestUrl.pathname) return c.redirect(`${canonicalPath}${requestUrl.search}`, 301);
  const slug = requestedSlug || c.req.param("slug") || "";
  let post: Awaited<ReturnType<typeof getPublishedBlogPost>> = null;
  try {
    post = await getPublishedBlogPost(c.env.DB, language, slug);
  } catch (error) {
    // Source-controlled articles remain available while a newly provisioned
    // environment is waiting for its append-only D1 migration.
    if (!(BLOG_SLUGS as readonly string[]).includes(slug)) throw error;
    console.error(JSON.stringify({ event: "blog_database_unavailable", slug, error: String(error) }));
  }
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
  const html = injectBlogHtml(await shell.text(), post);
  return new Response(c.req.method === "HEAD" ? null : html, { status: 200, headers });
}

app.get("/blog/:slug", (c) => publicBlogPage(c, "ro"));
app.get("/en/blog/:slug", (c) => publicBlogPage(c, "en"));
app.get("/sitemap.xml", async (c) => {
  const asset = await c.env.ASSETS.fetch(c.req.raw);
  if (!asset.ok) return asset;
  let entries: Awaited<ReturnType<typeof getBlogSitemapEntries>> = [];
  try {
    entries = await getBlogSitemapEntries(c.env.DB);
  } catch (error) {
    console.error(JSON.stringify({ event: "blog_sitemap_database_unavailable", error: String(error) }));
  }
  const headers = new Headers(asset.headers);
  headers.set("content-type", "application/xml; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, s-maxage=900, stale-while-revalidate=86400");
  return new Response(mergeBlogSitemap(await asset.text(), entries), { status: 200, headers });
});

async function siteFile(c: Context<AppBindings>, file: string, status: number, noindex: boolean) {
  const method = c.req.method === "HEAD" ? "HEAD" : "GET";
  const response = await c.env.ASSETS.fetch(new Request(new URL(file, c.req.url), { method }));
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  if (noindex) headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, { status, headers });
}

// With run_worker_first=true and asset fallback disabled, the API Worker also
// owns redirects, hard error statuses and private-route indexing semantics.
// This keeps the direct Worker preview identical to the standalone site Worker.
app.all("*", async (c) => {
  const url = new URL(c.req.url);
  if (isApiHostname(url.hostname)) {
    return c.json({
      error: {
        code: "not_found",
        message: "Ruta API nu există",
        requestId: c.get("requestId") || c.req.header("cf-ray") || crypto.randomUUID(),
      },
    }, 404);
  }
  const decision = decide(url);
  if (decision.kind === "api") return c.json({ error: { code: "not_found", message: "Ruta nu există" } }, 404);
  if (c.req.method !== "GET" && c.req.method !== "HEAD") return c.json({ error: { code: "method_not_allowed" } }, 405);

  if (decision.kind === "redirect") return c.redirect(new URL(decision.location, url.origin).toString(), decision.status);
  if (decision.kind === "asset") return serveCachedAsset(c.env.ASSETS, c.req.raw);
  if (decision.kind === "static") return siteFile(c, decision.file, decision.status, decision.noindex);
  if (decision.kind === "blog") return publicBlogPage(c, decision.language, decision.slug);

  const path = normalizePath(url.pathname);
  const asset = await c.env.ASSETS.fetch(c.req.raw);
  if (asset.status === 404) {
    if (isKnownSpaRoute(path)) {
      const shell = await siteFile(c, "/_shell.html", 200, true);
      const headers = new Headers(shell.headers);
      headers.set("Cache-Control", "private, no-store");
      headers.set("Pragma", "no-cache");
      return new Response(shell.body, { status: shell.status, headers });
    }
    return siteFile(c, "/404.html", 404, true);
  }
  if (!decision.noindex) return asset;
  const headers = new Headers(asset.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Cache-Control", "private, no-store");
  headers.set("Pragma", "no-cache");
  return new Response(asset.body, { status: asset.status, headers });
});

app.onError((error, c) => {
  const requestId = c.get("requestId") || c.req.header("cf-ray") || crypto.randomUUID();
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
  fetch: (request, env, ctx) => app.fetch(normalizeVersionedApiRequest(request), env, ctx),
  scheduled: (controller, env, ctx) => {
    if (controller.cron === EXCHANGE_RATE_REFRESH_CRON) {
      ctx.waitUntil(refreshExchangeRate(env).catch((error) => {
        console.error(JSON.stringify({ event: "exchange_rate_refresh_failed", error: String(error) }));
        throw error;
      }));
      return;
    }
    ctx.waitUntil(Promise.all([
      cleanupExpiredData(env),
      runDueEngineDiscovery(env),
    ]).then(() => undefined).catch((error) => {
      console.error(JSON.stringify({ event: "maintenance_job_failed", error: String(error) }));
      throw error;
    }));
  },
} satisfies ExportedHandler<AppBindings["Bindings"]>;
