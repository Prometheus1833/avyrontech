// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { antivirusRouter } from "../../cloudflare/workers/api/src/antivirus";
import {
  scanUpload,
  putScannedObject,
  getScannedObject,
  scanJob,
  releaseQuarantine,
} from "../../cloudflare/workers/api/src/malware";
import {
  safeBouncerUploadUrl,
  bouncerUsage,
} from "../../cloudflare/workers/api/src/bouncer";
import {
  bouncerFixture,
  fixtureScannerSettings,
  malwareBucket,
} from "./helpers/bouncerFixture";
import type { Env, AppBindings } from "../../cloudflare/workers/api/src/types";
class Statement {
  values: SQLInputValue[] = [];
  constructor(
    readonly db: DatabaseSync,
    readonly sql: string,
  ) {}
  bind(...v: SQLInputValue[]) {
    this.values = v;
    return this;
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.values) || null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    return { meta: this.db.prepare(this.sql).run(...this.values) };
  }
}
let db: DatabaseSync,
  env: Env,
  files: ReturnType<typeof malwareBucket>,
  media: ReturnType<typeof malwareBucket>,
  provider: ReturnType<typeof bouncerFixture>,
  app: Hono<AppBindings>,
  actor: string,
  mfa: boolean;
const bytes = new TextEncoder().encode("%PDF-1.7\nSynthetic public fixture."),
  opts = {
    source: "documents" as const,
    scope: "fixture-document",
    mimeType: "application/pdf",
    actorId: "owner",
  };
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync("cloudflare/d1/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(readFileSync("cloudflare/d1/migrations/" + file, "utf8"));
  for (const [id, email, role] of [
    ["owner", "prometheus@avyron.ro", "admin"],
    ["staff", "staff@fixture.test", "staff"],
    ["client", "client@fixture.test", "user"],
  ]) {
    db.prepare(
      "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)",
    ).run(id, email, "synthetic");
    db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
  }
  files = malwareBucket();
  media = malwareBucket();
  env = {
    ...fixtureScannerSettings,
    MFA_AUTH_ENABLED: "false",
    FILES: files,
    MEDIA: media,
    DB: {
      prepare: (sql: string) => new Statement(db, sql),
      batch: async (stmts: Statement[]) => {
        db.exec("BEGIN");
        try {
          const out = [];
          for (const s of stmts) out.push(await s.run());
          db.exec("COMMIT");
          return out;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    },
  } as unknown as Env;
  provider = bouncerFixture();
  actor = "owner";
  mfa = false;
  app = new Hono<AppBindings>();
  app.use("*", async (c, next) => {
    c.set("userId", actor);
    c.set("roles", [
      actor === "owner" ? "admin" : actor === "staff" ? "staff" : "user",
    ]);
    c.set("mfaVerified", mfa);
    await next();
  });
  app.route("/", antivirusRouter);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  db.close();
});
const root = "/api/antivirus";
const request = (path = "", body?: object, id = crypto.randomUUID()) =>
  app.request(
    root + path,
    {
      method: body ? "POST" : "GET",
      headers: body
        ? { "content-type": "application/json", "idempotency-key": id }
        : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
    env,
  );
it("blocks confidential bytes before R2/provider transfer when any compliance or storage gate is absent", async () => {
  for (const field of [
    "BOUNCER_SENSITIVE_PROCESSING_APPROVED",
    "BOUNCER_DPA_REFERENCE",
    "BOUNCER_TRANSFER_REVIEW_REFERENCE",
    "BOUNCER_STORAGE_PRIVACY_VERIFIED",
    "BOUNCER_API_KEY",
    "BOUNCER_ENABLED",
  ] as const) {
    const value = env[field];
    delete env[field];
    expect((await scanUpload(env, bytes, opts)).status).toBe("blocked");
    env[field] = value;
  }
  expect(provider.creates).toBe(0);
  expect(files.data.size).toBe(0);
  expect(
    db.prepare("SELECT count(*) n FROM malware_audit_events").get()!.n,
  ).toBe(6);
});
it("accepts only an exact CLEAN hash and binds access to the immutable R2 object version", async () => {
  const ticket = await scanUpload(env, bytes, opts);
  expect(ticket.status).toBe("clean");
  expect(provider.creates).toBe(1);
  await putScannedObject(
    env,
    "FILES",
    "documents/final",
    bytes,
    { httpMetadata: { contentType: "application/pdf" } },
    ticket,
  );
  expect(
    await (await getScannedObject(env, "FILES", "documents/final"))!.text(),
  ).toContain("Synthetic");
  expect(files.data.size).toBe(1);
  expect(
    db.prepare("SELECT held_bytes FROM malware_storage_budget").get()!
      .held_bytes,
  ).toBe(0);
  // Even a byte-identical R2 replacement requires a fresh binding to that version.
  await files.put("documents/final", bytes);
  expect(await getScannedObject(env, "FILES", "documents/final")).toBeNull();
});
for (const verdict of [
  "malicious",
  "suspicious",
  "failed",
  "hash_mismatch",
  "contradiction",
] as const)
  it(`never releases ${verdict} files or creates a readable object`, async () => {
    provider.setVerdict(verdict);
    const ticket = await scanUpload(env, bytes, opts);
    expect(ticket.status).not.toBe("clean");
    expect(await getScannedObject(env, "FILES", "unregistered")).toBeNull();
    await expect(
      putScannedObject(env, "FILES", "forbidden", bytes, {}, ticket),
    ).rejects.toThrow("clean_verdict_required");
    expect(files.data.has("forbidden")).toBe(false);
  });
it("atomically reserves the last free scan under concurrent different uploads", async () => {
  const period = new Date().toISOString().slice(0, 7);
  db.prepare("INSERT INTO malware_monthly_usage VALUES(?,499,499,500,?)").run(
    period,
    Date.now(),
  );
  provider.setUsed(499);
  const results = await Promise.all([
    scanUpload(env, bytes, opts),
    scanUpload(env, new TextEncoder().encode("Another harmless file"), opts),
  ]);
  expect(results.filter((r) => r.status === "clean")).toHaveLength(1);
  expect(provider.creates).toBe(1);
  expect(
    db.prepare("SELECT reserved FROM malware_monthly_usage").get()!.reserved,
  ).toBe(500);
});
it("reuses one in-flight scan for concurrent retries but never deduplicates across actors", async () => {
  const results = await Promise.all([
    scanUpload(env, bytes, opts),
    scanUpload(env, bytes, opts),
  ]);
  expect(provider.creates).toBe(1);
  expect(results.some((r) => r.status === "clean")).toBe(true);
  expect((await scanUpload(env, bytes, opts)).status).toBe("clean");
  expect(provider.creates).toBe(1);
  expect(
    (await scanUpload(env, bytes, { ...opts, actorId: "staff" })).status,
  ).toBe("clean");
  expect(provider.creates).toBe(2);
});
it("fails closed on account quota exhaustion and never attempts a paid plan", async () => {
  provider.setUsed(500);
  const r = await scanUpload(env, bytes, opts);
  expect(r).toMatchObject({ status: "blocked", code: "quota_exceeded" });
  expect(provider.creates).toBe(0);
  const paid = vi.fn(async () =>
    Response.json({ status: "success", data: { tier: "pro" } }),
  );
  await expect(bouncerUsage("fixture", paid)).rejects.toThrow(
    "free_plan_required",
  );
});
it("retains an uncertain POST reservation and never automatically submits the same file again", async () => {
  const original = provider.fetcher;
  let posts = 0;
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/v2/scan") && init?.method === "POST") {
        posts++;
        throw new Error("network error with sensitive transport detail");
      }
      return original(input, init);
    },
  );
  const first = await scanUpload(env, bytes, opts);
  expect(first.status).toBe("unknown");
  expect((await scanUpload(env, bytes, opts)).status).toBe("unknown");
  expect(posts).toBe(1);
  expect(
    db.prepare("SELECT reserved FROM malware_monthly_usage").get()!.reserved,
  ).toBe(1);
  const audit = JSON.stringify(
    db.prepare("SELECT * FROM malware_audit_events").all(),
  );
  expect(audit).not.toContain("sensitive transport");
  expect(audit).not.toContain("bnc_live");
  expect(audit).not.toContain("x-amz");
});
it("reconciles a known scan after an uncertain storage upload without another POST or reservation", async () => {
  const original = provider.fetcher;
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const r = await original(input, init);
      if (String(input).includes(".s3."))
        throw new Error("synthetic connection lost after upload");
      return r;
    },
  );
  const first = await scanUpload(env, bytes, opts);
  expect(first.status).toBe("clean"); // Immediate read-only poll resolves the known scan.
  expect(provider.creates).toBe(1);
  expect(
    db.prepare("SELECT reserved FROM malware_monthly_usage").get()!.reserved,
  ).toBe(1);
});
it("caps local quarantine storage and rejects oversize files before any provider call", async () => {
  db.prepare("UPDATE malware_storage_budget SET held_bytes=49999999").run();
  expect(await scanUpload(env, new Uint8Array(2), opts)).toMatchObject({
    status: "blocked",
    code: "quarantine_full",
  });
  expect(await scanUpload(env, new Uint8Array(25000001), opts)).toMatchObject({
    status: "blocked",
    code: "file_too_large",
  });
  expect(provider.creates).toBe(0);
});
it("cleans ambiguous R2 writes without silently losing the storage reservation", async () => {
  const put = files.put.bind(files);
  files.put = async (...args) => {
    await put(...args);
    throw new Error("fixture failed after write");
  };
  const r = await scanUpload(env, bytes, opts);
  expect(r.status).toBe("failed");
  expect(files.data.size).toBe(0);
  expect(
    db.prepare("SELECT held_bytes FROM malware_storage_budget").get()!
      .held_bytes,
  ).toBe(0);
});
it("fails closed for historical objects and exposes no operator APIs to clients or staff", async () => {
  await files.put("legacy/unverified.pdf", bytes);
  expect(
    await getScannedObject(env, "FILES", "legacy/unverified.pdf"),
  ).toBeNull();
  for (const id of ["client", "staff"]) {
    actor = id;
    expect((await request()).status).toBe(403);
    expect(
      (await request("/test", { confirmed: true, sample: "clean" })).status,
    ).toBe(403);
  }
  actor = "owner";
  expect((await request()).status).toBe(200);
  db.prepare(
    "UPDATE users SET email='revoked@fixture.test' WHERE id='owner'",
  ).run();
  expect((await request()).status).toBe(403);
});
it("requires explicit confirmation, native MFA and body-bound idempotency for synthetic tests", async () => {
  expect((await request("/test", { sample: "clean" })).status).toBe(400);
  env.MFA_AUTH_ENABLED = "true";
  expect(
    (await request("/test", { confirmed: true, sample: "clean" })).status,
  ).toBe(403);
  mfa = true;
  const key = crypto.randomUUID();
  expect(
    (await request("/test", { confirmed: true, sample: "clean" }, key)).status,
  ).toBe(200);
  expect(
    (await request("/test", { confirmed: true, sample: "clean" }, key)).status,
  ).toBe(200);
  expect(provider.creates).toBe(1);
  expect(
    (await request("/test", { confirmed: true, sample: "eicar" }, key)).status,
  ).toBe(409);
  expect(provider.creates).toBe(1);
});
it("blocks sensitive historical scans without reading or transmitting their content when compliance is missing", async () => {
  await files.put("legacy/private.pdf", bytes);
  db.prepare(
    "INSERT INTO malware_object_verdicts(id,bucket,object_key,source,registered_at) VALUES('legacy','FILES','legacy/private.pdf','documents',1)",
  ).run();
  delete env.BOUNCER_DPA_REFERENCE;
  expect(
    (await request("/legacy/legacy/scan", { confirmed: true })).status,
  ).toBe(503);
  expect(provider.creates).toBe(0);
});
it("does not allow the dashboard to turn suspicious files CLEAN or download quarantine bytes", async () => {
  provider.setVerdict("suspicious");
  const ticket = await scanUpload(env, bytes, opts);
  expect(
    (await request("/jobs/" + ticket.id + "/retry", { confirmed: true }))
      .status,
  ).toBe(409);
  expect(
    (await request("/jobs/" + ticket.id + "/clean", { confirmed: true }))
      .status,
  ).toBe(404);
  expect((await request("/jobs/" + ticket.id + "/download")).status).toBe(404);
});
it("does not expose provider upload credentials or allow arbitrary redirect/upload destinations", () => {
  for (const u of [
    "http://bouncer-dev-uploads-fixture.s3.amazonaws.com/",
    "https://evil.example/",
    "https://api.usebouncer.dev/",
    "https://bouncer-test.s3.amazonaws.com.evil.example/",
    "https://bouncer-test.s3.amazonaws.com/?signature=secret",
    "https://127.0.0.1/",
  ])
    expect(safeBouncerUploadUrl(u)).toBe(false);
  expect(
    safeBouncerUploadUrl(
      "https://bouncer-dev-uploads-fixture.s3.ap-south-1.amazonaws.com/",
    ),
  ).toBe(true);
});
it("purges only quarantine bytes while preserving the original bound object and its CLEAN history", async () => {
  const ticket = await scanUpload(env, bytes, opts);
  await putScannedObject(env, "FILES", "documents/original", bytes, {}, ticket);
  const job = (await scanJob(env, ticket.id!))!;
  await releaseQuarantine(env, job);
  expect(
    await getScannedObject(env, "FILES", "documents/original"),
  ).not.toBeNull();
  expect((await scanJob(env, ticket.id!))!.status).toBe("clean");
});
it("keeps pending scans quarantined and resolves them only by reading the existing provider ID", async () => {
  provider.setVerdict("pending");
  const r = await scanUpload(env, bytes, opts);
  expect(r.status).toBe("pending");
  expect(await getScannedObject(env, "FILES", "not-published")).toBeNull();
  provider.setVerdict("clean");
  db.prepare("UPDATE malware_scan_jobs SET checked_at=0 WHERE id=?").run(r.id!);
  const refreshed = await request("/jobs/" + r.id + "/poll", {
    confirmed: true,
  });
  expect((await refreshed.json()).status).toBe("clean");
  expect(provider.creates).toBe(1);
});
it("a rotated key or lower observed usage cannot reset the conservative local monthly quota", async () => {
  const period = new Date().toISOString().slice(0, 7);
  db.prepare("INSERT INTO malware_monthly_usage VALUES(?,500,500,500,?)").run(
    period,
    Date.now(),
  );
  provider.setUsed(0);
  env.BOUNCER_API_KEY = "bnc_live_different_synthetic_key";
  expect((await scanUpload(env, bytes, opts)).code).toBe("quota_exceeded");
  expect(provider.creates).toBe(0);
});
it("confirmed retries consume at most one new reservation per intent and never auto-retry failed engine work", async () => {
  provider.setVerdict("failed");
  const first = await scanUpload(env, bytes, opts);
  expect(first.status).toBe("failed");
  const key = crypto.randomUUID();
  expect(
    (await request("/jobs/" + first.id + "/retry", { confirmed: true }, key))
      .status,
  ).toBe(200);
  expect(provider.creates).toBe(2);
  expect(
    (await request("/jobs/" + first.id + "/retry", { confirmed: true }, key))
      .status,
  ).toBe(200);
  expect(provider.creates).toBe(2);
  provider.setVerdict("clean");
  const renewed = await request("/jobs/" + first.id + "/retry", {
    confirmed: true,
  });
  expect((await renewed.json()).status).toBe("clean");
  expect(provider.creates).toBe(3);
});
it("rejects unknown or mismatched completed responses rather than treating HTTP 200 as CLEAN", async () => {
  const original = provider.fetcher;
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/v2/scan/"))
        return Response.json({
          status: "success",
          data: {
            scan_id: "scan_wrong123",
            status: "completed",
            verdict: "clean",
          },
        });
      return original(input, init);
    },
  );
  expect((await scanUpload(env, bytes, opts)).status).toBe("failed");
});
it("inventories unlinked historical objects without transmitting bytes and invalidates replaced versions", async () => {
  const ticket = await scanUpload(env, bytes, opts);
  await putScannedObject(env, "FILES", "documents/existing", bytes, {}, ticket);
  await files.put("documents/unlinked", bytes);
  await files.put(
    "documents/existing",
    new TextEncoder().encode("Replaced bytes"),
  );
  const before = provider.creates;
  expect(
    (await request("/inventory/documents", { confirmed: true })).status,
  ).toBe(200);
  expect(provider.creates).toBe(before);
  expect(
    db
      .prepare(
        "SELECT scan_id FROM malware_object_verdicts WHERE object_key='documents/existing'",
      )
      .get()!.scan_id,
  ).toBeNull();
  expect(
    db
      .prepare(
        "SELECT count(*) n FROM malware_object_verdicts WHERE object_key='documents/unlinked'",
      )
      .get()!.n,
  ).toBe(1);
  expect(await getScannedObject(env, "FILES", "documents/existing")).toBeNull();
});
it("historical rescans bind their intent to an immutable version and never resubmit a changed object on retry", async () => {
  await files.put("legacy/file", bytes);
  db.prepare(
    "INSERT INTO malware_object_verdicts(id,bucket,object_key,source,registered_at) VALUES('legacy','FILES','legacy/file','documents',1)",
  ).run();
  const key = crypto.randomUUID();
  expect(
    (await request("/legacy/legacy/scan", { confirmed: true }, key)).status,
  ).toBe(200);
  expect(
    (await request("/legacy/legacy/scan", { confirmed: true }, key)).status,
  ).toBe(200);
  expect(provider.creates).toBe(1);
  await files.put("legacy/file", new TextEncoder().encode("Different bytes"));
  expect(
    (await request("/legacy/legacy/scan", { confirmed: true }, key)).status,
  ).toBe(409);
  expect(provider.creates).toBe(1);
});
it("a failed purge remains in-progress with its bytes reserved, and a retry can safely finish it", async () => {
  provider.setVerdict("suspicious");
  const r = await scanUpload(env, bytes, opts),
    key = crypto.randomUUID();
  files.failDelete = true;
  const failed = await request(
    "/jobs/" + r.id + "/purge",
    { confirmed: true },
    key,
  );
  expect(failed.status).toBe(500);
  expect((await scanJob(env, r.id!))!.status).toBe("purging");
  expect(
    db.prepare("SELECT held_bytes FROM malware_storage_budget").get()!
      .held_bytes,
  ).toBe(bytes.length);
  files.failDelete = false;
  expect(
    (await request("/jobs/" + r.id + "/purge", { confirmed: true }, key))
      .status,
  ).toBe(200);
  expect(
    db.prepare("SELECT held_bytes FROM malware_storage_budget").get()!
      .held_bytes,
  ).toBe(0);
  expect((await scanUpload(env, bytes, opts)).status).not.toBe("clean");
  expect(provider.creates).toBe(1);
});
it("reconciles a lost create response using history without creating another scan", async () => {
  const original = provider.fetcher;
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await original(input, init);
      if (String(input).endsWith("/v2/scan") && init?.method === "POST")
        throw new Error("lost create response after provider accepted it");
      return response;
    },
  );
  const first = await scanUpload(env, bytes, opts);
  expect(first.status).toBe("unknown");
  expect(provider.creates).toBe(1);
  const r = await request("/jobs/" + first.id + "/reconcile", {
    confirmed: true,
  });
  expect(r.status).toBe(200);
  expect((await scanJob(env, first.id!))!.provider_scan_id).toMatch(/^scan_/);
  expect(provider.creates).toBe(1);
  expect(
    db.prepare("SELECT reserved FROM malware_monthly_usage").get()!.reserved,
  ).toBe(1);
});
