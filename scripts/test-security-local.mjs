/** Native workerd/D1 security smoke. Only synthetic identities in disposable local bindings. */
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  openSync,
  closeSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { scryptSync, randomBytes, createHash, createHmac } from "node:crypto";
import assert from "node:assert/strict";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const work = mkdtempSync(join(tmpdir(), "avyron-security-local-"));
const logPath = join(work, "runtime.log"),
  log = openSync(logPath, "w", 0o600);
const cli = resolve(root, "node_modules/wrangler/bin/wrangler.js");
const configPath = join(work, "wrangler.json"),
  state = join(work, "state");
const base = ts.parseConfigFileTextToJson(
  "wrangler.jsonc",
  readFileSync(join(root, "wrangler.jsonc"), "utf8"),
).config;
const preview = base.env.preview;
const jwtKey = "synthetic-native-session-key-for-local-security-only";
const password = "Synthetic-Local-Password-2026!";
const seed = "synthetic-native-seed-key";
let worker;
const checks = [];
const childEnv = { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "true" };
const config = {
  ...base,
  ...preview,
  name: "avyron-security-local",
  main: resolve(root, base.main),
  account_id: "00000000000000000000000000000001",
  env: undefined,
  routes: [],
  workers_dev: false,
  preview_urls: false,
  ai: undefined,
  send_email: undefined,
  secrets: undefined,
  triggers: { crons: [] },
  observability: { enabled: false },
  assets: { ...base.assets, directory: join(work, "assets") },
  d1_databases: [
    {
      binding: "DB",
      database_name: "avyron-security-local",
      database_id: "00000000-0000-0000-0000-000000000001",
      migrations_dir: resolve(root, "cloudflare/d1/migrations"),
    },
  ],
  vars: {
    ...preview.vars,
    APP_ENV: "production",
    JWT_SECRET: jwtKey,
    MFA_ENCRYPTION_KEY: "synthetic-native-vault-key-for-local-security-only",
    SEED_TOKEN: seed,
    SECURITY_BOUNDARY_MODE: "off",
  },
};
mkdirSync(config.assets.directory);
writeFileSync(
  join(config.assets.directory, "index.html"),
  "<!doctype html><html><head><title>Local security fixture</title></head><body><main>Local</main></body></html>",
);
writeFileSync(
  join(config.assets.directory, "_shell.html"),
  readFileSync(join(config.assets.directory, "index.html")),
);
writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
function run(args) {
  return execFileSync(
    process.execPath,
    [cli, ...args, "--config", configPath],
    {
      cwd: work,
      env: childEnv,
      encoding: "utf8",
      stdio: ["ignore", log, log],
      timeout: 180000,
    },
  );
}
const literal = (value) => "'" + String(value).replaceAll("'", "''") + "'";
function sql(text) {
  const file = join(work, "operation.sql");
  writeFileSync(file, text, { mode: 0o600 });
  run([
    "d1",
    "execute",
    "avyron-security-local",
    "--local",
    "--persist-to",
    state,
    "--file",
    file,
  ]);
}
function tokenFor(sub, sid, exp = Math.floor(Date.now() / 1000) + 900) {
  const enc = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const a = enc({ alg: "HS256", typ: "JWT" }),
    b = enc({ sub, sid, iat: Math.floor(Date.now() / 1000) - 1, exp });
  return (
    a +
    "." +
    b +
    "." +
    createHmac("sha256", jwtKey)
      .update(a + "." + b)
      .digest("base64url")
  );
}
const sha = (value) => createHash("sha256").update(value).digest("base64url");
const cookie = (response) =>
  response.headers
    .getSetCookie()
    .find((s) => s.startsWith("__Host-sid="))
    ?.split(";")[0];
const payload = (token) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
const check = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
};
try {
  run([
    "d1",
    "migrations",
    "apply",
    "avyron-security-local",
    "--local",
    "--persist-to",
    state,
  ]);
  const salt = randomBytes(16),
    hash = scryptSync(password, salt, 32, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
  const stored =
    "scrypt$16384$8$1$" +
    salt.toString("base64") +
    "$" +
    hash.toString("base64");
  const now = Date.now(),
    legacySecret = randomBytes(32).toString("hex"),
    legacyId = sha(legacySecret);
  const statements = [];
  for (const [id, email, role] of [
    ["local-owner", "security-owner@example.test", "admin"],
    ["local-a", "security-a@example.test", "user"],
    ["local-b", "security-b@example.test", "user"],
  ]) {
    statements.push(
      `INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(${literal(id)},${literal(email)},${literal(stored)},1,${now},${now});`,
    );
    statements.push(
      `INSERT INTO user_roles(user_id,role) VALUES(${literal(id)},'user');`,
    );
    if (role === "admin")
      statements.push(
        `INSERT INTO user_roles(user_id,role) VALUES(${literal(id)},'admin');`,
      );
  }
  statements.push(
    `INSERT INTO platform_principals(email,role,status,created_by,created_at,updated_at) VALUES('security-owner@example.test','platform_owner','active','local-security-fixture',${now},${now});`,
  );
  statements.push(
    `INSERT INTO sessions(id,user_id,created_at,last_seen_at,expires_at) VALUES(${literal(legacyId)},'local-a',${now},${now},${now + 7 * 86400000});`,
  );
  sql(statements.join("\n"));
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const origin = "http://127.0.0.1:" + port;
  worker = spawn(
    process.execPath,
    [
      cli,
      "dev",
      "--config",
      configPath,
      "--local",
      "--persist-to",
      state,
      "--port",
      String(port),
    ],
    { cwd: work, env: childEnv, stdio: ["ignore", log, log] },
  );
  let ready = false;
  for (let n = 0; n < 60; n++) {
    try {
      const response = await fetch(origin + "/api/health", {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, "local workerd startup");
  async function request(
    path,
    {
      token,
      cookie,
      body,
      method = body === undefined ? "GET" : "POST",
      headers = {},
    } = {},
  ) {
    return fetch(origin + path, {
      method,
      headers: {
        ...(token ? { authorization: "Bearer " + token } : {}),
        ...(cookie ? { cookie } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  }
  async function login(email) {
    const response = await request("/api/auth/login", {
      body: { email, password, remember: true },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(body.access_token);
    assert.ok(cookie(response));
    return { token: body.access_token, cookie: cookie(response) };
  }
  for (const path of [
    "/api/documents/context",
    "/api/documents?view=company",
    "/api/admin/security",
    "/api/finance/overview",
  ]) {
    const response = await request(path);
    check(
      "anonymous denied " + path,
      response.status === 401 &&
        response.headers.get("cache-control")?.includes("no-store"),
    );
  }
  const owner = await login("security-owner@example.test"),
    a = await login("security-a@example.test"),
    b = await login("security-b@example.test");
  check("host-only session cookie", a.cookie.startsWith("__Host-sid="));
  const privileged = await request("/api/admin/security", {
    token: owner.token,
  });
  const status = await privileged.json();
  check(
    "owner status without MFA activation",
    privileged.status === 200 &&
      status.mode === "off" &&
      status.mfaEnabled === false,
  );
  check(
    "client cannot read owner security",
    (await request("/api/admin/security", { token: a.token })).status === 403,
  );
  check(
    "seed alone cannot import",
    (
      await request("/api/admin/import-users", {
        body: { users: [] },
        headers: { "x-seed-token": seed },
      })
    ).status === 401,
  );
  check(
    "client plus seed cannot import",
    (
      await request("/api/admin/import-users", {
        token: a.token,
        body: { users: [] },
        headers: { "x-seed-token": seed },
      })
    ).status === 403,
  );
  check(
    "owner still needs the import credential",
    (
      await request("/api/admin/import-users", {
        token: owner.token,
        body: { users: [] },
      })
    ).status === 403,
  );
  const upgraded = await request("/api/auth/refresh", {
    cookie: "sid=" + legacySecret,
    body: {},
  });
  check(
    "legacy upgrade succeeds",
    upgraded.status === 200 && !!cookie(upgraded),
  );
  const upgradedBody = await upgraded.json();
  check(
    "legacy upgrade stable session",
    payload(upgradedBody.access_token).sid === legacyId,
  );
  const upgradedAgain = await request("/api/auth/refresh", {
    cookie: cookie(upgraded),
    body: {},
  });
  check("host refresh is valid", upgradedAgain.status === 200);
  const legacyBody = await upgradedAgain.json();
  check(
    "legacy session ID preserved",
    payload(legacyBody.access_token).sid === legacyId,
  );
  const sid = payload(a.token).sid;
  sql(
    `UPDATE sessions SET refresh_rotated_at=${Date.now() - 1200000} WHERE id=${literal(sid)};`,
  );
  const concurrent = await Promise.all([
    request("/api/auth/refresh", { cookie: a.cookie, body: {} }),
    request("/api/auth/refresh", { cookie: a.cookie, body: {} }),
  ]);
  check(
    "concurrent refresh both succeed",
    concurrent.every((r) => r.status === 200),
  );
  check(
    "only one concurrent cookie winner",
    concurrent.filter((r) => cookie(r)).length === 1,
  );
  const current = concurrent.map(cookie).find(Boolean);
  const old = await request("/api/auth/refresh", {
    cookie: a.cookie,
    body: {},
  });
  check(
    "grace never overwrites new cookie",
    old.status === 200 && !cookie(old),
  );
  const downgraded = await request("/api/auth/refresh", {
    cookie: current.replace("__Host-sid=", "sid="),
    body: {},
  });
  check(
    "new secret cannot downgrade to legacy",
    downgraded.status === 204 && !cookie(downgraded),
  );
  sql(
    `UPDATE sessions SET previous_refresh_expires_at=1 WHERE id=${literal(sid)};`,
  );
  const stale = await request("/api/auth/refresh", {
    cookie: a.cookie,
    body: {},
  });
  check(
    "stale refresh cannot clear a newer cookie",
    stale.status === 204 && !stale.headers.has("set-cookie"),
  );
  check(
    "other user session cannot be revoked",
    (
      await request("/api/auth/sessions/" + payload(b.token).sid, {
        method: "DELETE",
        token: a.token,
      })
    ).status === 404,
  );
  check(
    "expired signed access denied",
    (
      await request("/api/auth/me", {
        token: tokenFor("local-a", sid, Math.floor(Date.now() / 1000) - 1),
      })
    ).status === 401,
  );
  check(
    "CSRF origin denied",
    (
      await request("/api/auth/refresh", {
        cookie: current,
        body: {},
        headers: { origin: "https://attacker.example.test" },
      })
    ).status === 403,
  );
  check(
    "fetch-metadata cross-site cookie POST denied",
    (
      await request("/api/auth/refresh", {
        cookie: current,
        body: {},
        headers: { "sec-fetch-site": "cross-site" },
      })
    ).status === 403,
  );
  const cors = await request("/api/auth/me", {
    method: "OPTIONS",
    headers: {
      origin: "https://attacker.example.test",
      "access-control-request-method": "GET",
    },
  });
  check(
    "CORS never reflects an untrusted origin",
    cors.headers.get("access-control-allow-origin") !==
      "https://attacker.example.test",
  );
  check(
    "wrong logout-all password denied",
    (
      await request("/api/auth/logout-all", {
        token: a.token,
        body: { currentPassword: "wrong" },
      })
    ).status === 403,
  );
  check(
    "logout-all succeeds",
    (
      await request("/api/auth/logout-all", {
        token: a.token,
        body: { currentPassword: password },
      })
    ).status === 200,
  );
  check(
    "revoked access JWT denied immediately",
    (await request("/api/auth/me", { token: a.token })).status === 401,
  );
  check(
    "revoked refresh denied immediately",
    (await request("/api/auth/refresh", { cookie: current, body: {} }))
      .status === 204,
  );
  check(
    "another client session survives",
    (await request("/api/auth/me", { token: b.token })).status === 200,
  );
  const csp = await request("/api/security/csp-report", {
    body: {
      "csp-report": {
        "effective-directive": "script-src",
        "document-uri": "https://example.test/?token=sensitive",
        "script-sample": "Bearer sensitive",
      },
    },
  });
  check("bounded CSP telemetry accepted", csp.status === 204);
  console.log(
    JSON.stringify({
      passed: checks.length,
      checks,
      localOnly: true,
      remoteWrites: false,
      mfaActivated: false,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({ error: error.message, checksCompleted: checks.length }),
  );
  console.error(readFileSync(logPath, "utf8").slice(-4000));
  process.exitCode = 1;
} finally {
  if (worker) {
    const exited = new Promise((resolve) => worker.once("exit", resolve));
    worker.kill("SIGTERM");
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    if (worker.exitCode === null) worker.kill("SIGKILL");
  }
  closeSync(log);
  rmSync(work, { recursive: true, force: true });
}
