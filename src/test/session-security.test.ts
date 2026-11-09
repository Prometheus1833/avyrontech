// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  sessionCookie,
  writeSessionCookie,
  clearSessionCookie,
  refreshSession,
  findRefreshSession,
  ROTATION_INTERVAL_MS,
} from "../../cloudflare/workers/api/src/sessionSecurity";
import {
  signJwt,
  sha256,
  verifyJwt,
} from "../../cloudflare/workers/api/src/security";
import {
  signSessionJwt,
  verifySessionJwt,
} from "../../cloudflare/workers/api/src/sessionJwt";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";
let db: DatabaseSync, env: Env, app: Hono<AppBindings>;
class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly sql: string) {}
  bind(...values: SQLInputValue[]) {
    this.values = values;
    return this;
  }
  async first() {
    return db.prepare(this.sql).get(...this.values) || null;
  }
  async run() {
    return { meta: db.prepare(this.sql).run(...this.values) };
  }
}
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,disabled_at INTEGER,must_change_password INTEGER DEFAULT 0);
    INSERT INTO users(id) VALUES('user-a');
    CREATE TABLE sessions(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires_at INTEGER,revoked_at INTEGER,
      mfa_verified_at INTEGER,last_seen_at INTEGER,created_at INTEGER);`);
  db.exec(
    readFileSync(
      "cloudflare/d1/migrations/0110_security_session_rotation.sql",
      "utf8",
    ),
  );
  env = {
    APP_ENV: "production",
    JWT_SECRET: "synthetic-legacy-signing-secret-for-test",
    DB: { prepare: (sql: string) => new Statement(sql) },
  } as unknown as Env;
  app = new Hono<AppBindings>();
  app.post("/refresh", async (c) => {
    const secret = sessionCookie(c);
    const row = secret ? await refreshSession(c, secret) : null;
    return c.json({ id: row?.id ?? null });
  });
  app.get("/read", (c) => c.json({ value: sessionCookie(c) }));
  app.post("/write", (c) => {
    writeSessionCookie(c, "synthetic-current-value", 3600);
    return c.json({ ok: true });
  });
  app.post("/clear", (c) => {
    clearSessionCookie(c);
    return c.json({ ok: true });
  });
});
afterEach(() => {
  db.close();
  vi.useRealTimers();
});
async function legacy(
  secret = "synthetic-legacy-refresh-secret",
  persistent = true,
) {
  const id = await sha256(secret);
  const timestamp = Date.now();
  db.prepare(
    "INSERT INTO sessions(id,user_id,created_at,last_seen_at,expires_at) VALUES(?,'user-a',?,?,?)",
  ).run(
    id,
    timestamp,
    timestamp,
    timestamp + (persistent ? 7 * 86400000 : 12 * 3600000),
  );
  return { secret, id };
}
const call = (cookie: string, path = "/refresh") =>
  app.request(
    "https://api.example.test" + path,
    { method: path === "/read" ? "GET" : "POST", headers: { cookie } },
    env,
  );
const secretFrom = (r: Response) =>
  r.headers
    .getSetCookie()
    .find((s) => s.startsWith("__Host-sid="))
    ?.match(/^__Host-sid=([^;]+)/)?.[1];
it("writes a host-only Secure/HttpOnly cookie and clears the host-only legacy cookie", async () => {
  const response = await call("sid=synthetic-legacy", "/write");
  const cookies = response.headers.getSetCookie();
  expect(cookies[0]).toMatch(/^__Host-sid=/);
  expect(cookies[0]).toContain("Secure");
  expect(cookies[0]).toContain("HttpOnly");
  expect(cookies[0]).toContain("SameSite=Lax");
  expect(cookies[0]).toContain("Path=/");
  expect(cookies[0]).not.toContain("Domain=");
  expect(
    cookies.some((s) => s.startsWith("sid=") && s.includes("Max-Age=0")),
  ).toBe(true);
  await expect(
    (await call("sid=old; __Host-sid=new", "/read")).json(),
  ).resolves.toEqual({ value: "new" });
});
it("upgrades and rotates a real legacy SQLite session without changing its ID or extending its expiry", async () => {
  const { secret, id } = await legacy();
  const before = db
    .prepare("SELECT expires_at FROM sessions WHERE id=?")
    .get(id)!;
  const response = await call("sid=" + secret);
  expect(await response.json()).toEqual({ id });
  const rotated = secretFrom(response)!;
  expect(rotated).not.toBe(secret);
  const row = db.prepare("SELECT * FROM sessions WHERE id=?").get(id)!;
  expect(row.expires_at).toBe(before.expires_at);
  expect(row.refresh_token_hash).toBe(await sha256(rotated));
  expect(JSON.stringify(row)).not.toContain(rotated);
  expect((await findRefreshSession(env.DB, rotated))?.id).toBe(id);
  expect(response.headers.get("set-cookie")).toContain("Max-Age=");
});
it("allows concurrent tabs during the bounded grace without overwriting the winner's new cookie", async () => {
  const { secret, id } = await legacy();
  const results = await Promise.all([
    call("sid=" + secret),
    call("sid=" + secret),
  ]);
  expect(await Promise.all(results.map((r) => r.clone().json()))).toEqual([
    { id },
    { id },
  ]);
  expect(results.map(secretFrom).filter(Boolean)).toHaveLength(1);
  const old = await call("sid=" + secret);
  expect(await old.json()).toEqual({ id });
  expect(old.headers.has("set-cookie")).toBe(false);
  db.prepare(
    "UPDATE sessions SET previous_refresh_expires_at=? WHERE id=?",
  ).run(Date.now() - 1, id);
  expect(await findRefreshSession(env.DB, secret)).toBeNull();
});
it("does not rotate on every refresh, expires revoked sessions immediately and keeps opt-out nonpersistent", async () => {
  const { secret, id } = await legacy(undefined, false);
  const first = await call("sid=" + secret),
    current = secretFrom(first)!;
  expect(
    first.headers.getSetCookie().find((s) => s.startsWith("__Host-sid=")),
  ).not.toContain("Max-Age=");
  expect((await call("__Host-sid=" + current)).headers.has("set-cookie")).toBe(
    false,
  );
  db.prepare("UPDATE sessions SET refresh_rotated_at=? WHERE id=?").run(
    Date.now() - ROTATION_INTERVAL_MS - 1,
    id,
  );
  const rotated = await call("__Host-sid=" + current);
  expect(secretFrom(rotated)).toBeTruthy();
  db.prepare("UPDATE sessions SET revoked_at=? WHERE id=?").run(Date.now(), id);
  expect(await findRefreshSession(env.DB, secretFrom(rotated)!)).toBeNull();
});
it("does not authenticate expired or disabled users and clears both cookie names on explicit logout", async () => {
  const { secret, id } = await legacy();
  db.prepare("UPDATE sessions SET expires_at=? WHERE id=?").run(
    Date.now() - 1,
    id,
  );
  expect(await findRefreshSession(env.DB, secret)).toBeNull();
  db.prepare("UPDATE sessions SET expires_at=? WHERE id=?").run(
    Date.now() + 100000,
    id,
  );
  db.prepare("UPDATE users SET disabled_at=? WHERE id='user-a'").run(
    Date.now(),
  );
  expect(await findRefreshSession(env.DB, secret)).toBeNull();
  const response = await call("sid=" + secret, "/clear");
  expect(
    response.headers.getSetCookie().filter((s) => s.includes("Max-Age=0")),
  ).toHaveLength(2);
});
it("supports a bounded authentication key rotation without changing newsletter/link signing keys", async () => {
  const oldKey = "synthetic-old-session-secret-000000000";
  const newKey = "synthetic-new-session-secret-000000000";
  const token = await signJwt({ sub: "user-a", sid: "session-a" }, oldKey);
  const timestamp = Date.now();
  const configured = {
    ...env,
    SESSION_JWT_SECRET: newKey,
    SESSION_JWT_PREVIOUS_SECRET: oldKey,
    SESSION_JWT_ROTATED_AT: String(timestamp),
    SESSION_JWT_PREVIOUS_VALID_UNTIL: String(timestamp + 600000),
  };
  expect(await verifySessionJwt(token, configured, timestamp)).toMatchObject({
    sub: "user-a",
  });
  expect(
    await verifySessionJwt(token, configured, timestamp + 600001),
  ).toBeNull();
  expect(
    await verifySessionJwt(token, {
      ...configured,
      SESSION_JWT_PREVIOUS_VALID_UNTIL: String(timestamp + 3600000),
    }),
  ).toBeNull();
  const next = await signSessionJwt(
    { sub: "user-a", sid: "session-a" },
    configured,
  );
  expect(await verifyJwt(next, newKey)).toBeTruthy();
  expect(await verifyJwt(next, env.JWT_SECRET)).toBeNull();
  const link = await signJwt(
    { sub: "subscriber", purpose: "unsubscribe" },
    env.JWT_SECRET,
  );
  expect(await verifyJwt(link, env.JWT_SECRET)).toBeTruthy();
});
it("rejects malformed and expired signed JWTs and an invalid configured signing key", async () => {
  expect(
    await verifyJwt(
      await signJwt({ sub: "a" }, env.JWT_SECRET, -1),
      env.JWT_SECRET,
    ),
  ).toBeNull();
  const token = await signSessionJwt({ sub: "user-a", sid: "session-a" }, env);
  expect(await verifySessionJwt(token + ".extra", env)).toBeNull();
  expect(
    await verifySessionJwt(token, { ...env, SESSION_JWT_SECRET: "weak" }),
  ).toBeNull();
});

it("does not accept a new host-only secret relabelled as a legacy cookie", async () => {
  const { secret, id } = await legacy();
  const first = await call("sid=" + secret);
  const current = secretFrom(first)!;
  expect(await (await call("sid=" + current)).json()).toEqual({ id: null });
  expect(await (await call("__Host-sid=" + current)).json()).toEqual({ id });
});

it("never reopens the legacy cookie window when a host-only refresh rotates again", async () => {
  const { secret, id } = await legacy();
  const upgraded = await call("sid=" + secret);
  const hostSecret = secretFrom(upgraded)!;
  db.prepare(
    "UPDATE sessions SET legacy_refresh_expires_at=?,refresh_rotated_at=? WHERE id=?",
  ).run(Date.now() - 1, Date.now() - ROTATION_INTERVAL_MS - 1, id);
  const rotated = await call("__Host-sid=" + hostSecret);
  expect(secretFrom(rotated)).toBeTruthy();
  expect(await (await call("sid=" + hostSecret)).json()).toEqual({ id: null });
  expect(await (await call("__Host-sid=" + hostSecret)).json()).toEqual({ id });
});

it("never treats the session ID disclosed in an access JWT as a refresh credential", async () => {
  const { id } = await legacy();
  expect(await findRefreshSession(env.DB, id)).toBeNull();
  expect(await (await call("sid=" + id)).json()).toEqual({ id: null });
});

it("rejects correctly HMAC-signed tokens with missing expiry, future nbf or an unexpected algorithm", async () => {
  const signed = async (claims: Record<string, unknown>, alg = "HS256") => {
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = encode({ alg, typ: "JWT" }) + "." + encode(claims);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(unsigned),
    );
    return unsigned + "." + Buffer.from(signature).toString("base64url");
  };
  const now = Math.floor(Date.now() / 1000);
  for (const claims of [
    { sub: "a", iat: now },
    { sub: "a", iat: now, exp: now + 900, nbf: now + 300 },
    { sub: "a", iat: now, exp: "invalid" },
  ]) {
    expect(await verifyJwt(await signed(claims), env.JWT_SECRET)).toBeNull();
  }
  expect(
    await verifyJwt(
      await signed({ sub: "a", iat: now, exp: now + 900 }, "none"),
      env.JWT_SECRET,
    ),
  ).toBeNull();
});
