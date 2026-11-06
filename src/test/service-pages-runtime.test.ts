// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type {
  DatabaseSync as SqliteDatabase,
  SQLInputValue,
} from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { servicePagesRouter } from "../../cloudflare/workers/api/src/servicePages";
import manifest from "../shared/serviceContentManifest.json";
import { applyServiceText } from "../shared/servicePagePolicy";
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
class Statement {
  values: SQLInputValue[] = [];
  constructor(
    readonly db: SqliteDatabase,
    readonly sql: string,
  ) {}
  bind(...values: SQLInputValue[]) {
    this.values = values;
    return this;
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.values) ?? null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    return { meta: this.db.prepare(this.sql).run(...this.values) };
  }
}
describe("Service page configuration: actual routers, migrations and authorization", () => {
  let db: SqliteDatabase, app: Hono, actor: string, requiredMfa: boolean;
  const field = Object.keys(manifest.overview.values)[0],
    text = "Text verificat pentru prezentarea serviciului.";
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys=ON");
    for (const file of readdirSync("cloudflare/d1/migrations")
      .filter((file) => file.endsWith(".sql"))
      .sort())
      db.exec(readFileSync("cloudflare/d1/migrations/" + file, "utf8"));
    for (const [id, email, role] of [
      ["owner", "prometheus@avyron.ro", "admin"],
      ["staff", "service-staff@example.test", "staff"],
      ["client", "service-client@example.test", "user"],
    ]) {
      db.prepare(
        "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)",
      ).run(id, email, "fixture");
      db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
    }
    actor = "owner";
    requiredMfa = false;
    const DB = {
      prepare: (sql: string) => new Statement(db, sql),
      batch: async (statements: Statement[]) => {
        db.exec("BEGIN");
        try {
          const result = [];
          for (const s of statements) result.push(await s.run());
          db.exec("COMMIT");
          return result;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    };
    app = new Hono();
    app.use("*", async (c, next) => {
      Object.assign(c.env, {
        DB,
        ADMIN_MFA_POLICY: requiredMfa
          ? "required"
          : "optional_until_enrollment",
      });
      c.set("userId", actor);
      c.set(
        "roles",
        db
          .prepare("SELECT role FROM user_roles WHERE user_id=?")
          .all(actor)
          .map((row) => row.role),
      );
      c.set("mfaVerified", false);
      await next();
    });
    app.onError(() => new Response("safe failure", { status: 500 }));
    app.route("/", servicePagesRouter);
  });
  afterEach(() => db.close());
  const get = (path: string) => app.request(path, {}, {});
  const save = (
    revision = 0,
    values: Record<string, string> = { [field]: text },
    key = "service-save-fixture-123",
    page = "overview",
  ) =>
    app.request(
      "/api/admin/service-pages/" + page,
      {
        method: "PUT",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify({ revision, values }),
      },
      {},
    );
  const publish = (revision: number, confirmed = true) =>
    app.request(
      "/api/admin/service-pages/overview/publish",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision, confirmed }),
      },
      {},
    );
  it("keeps drafts private and exposes only the human-approved published revision", async () => {
    expect((await save()).status).toBe(200);
    expect(
      await (await get("/api/public/service-pages/overview")).json(),
    ).toEqual({ values: {}, revision: 0 });
    actor = "client";
    expect((await get("/api/admin/service-pages/overview")).status).toBe(403);
    expect(
      (await get("/api/admin/service-pages/overview/versions/1")).status,
    ).toBe(403);
    actor = "staff";
    expect(
      (await (await get("/api/admin/service-pages/overview")).json()).canManage,
    ).toBe(false);
    expect((await save()).status).toBe(403);
    expect((await publish(1)).status).toBe(403);
    actor = "owner";
    expect((await publish(1, false)).status).toBe(400);
    expect((await publish(2)).status).toBe(409);
    expect((await publish(1)).status).toBe(200);
    expect((await publish(1)).status).toBe(200);
    const response = await get("/api/public/service-pages/overview");
    expect(response.headers.get("cache-control")).toContain("must-revalidate");
    expect(await response.json()).toEqual({
      values: { [field]: text },
      revision: 1,
    });
    expect(
      (
        await app.request(
          "/api/public/service-pages/overview",
          { headers: { "if-none-match": response.headers.get("etag")! } },
          {},
        )
      ).status,
    ).toBe(304);
    expect(
      db
        .prepare(
          "SELECT count(*) total FROM security_events WHERE action='service_page.published'",
        )
        .get()!.total,
    ).toBe(1);
    expect(
      await (await get("/api/public/service-pages/premium-website")).json(),
    ).toEqual({ values: {}, revision: 0 });
  });
  it("deduplicates retries and rejects stale concurrent edits atomically", async () => {
    expect((await save()).status).toBe(200);
    expect((await save()).status).toBe(200);
    expect(
      db.prepare("SELECT count(*) total FROM service_page_versions").get()!
        .total,
    ).toBe(1);
    expect(
      (await save(1, { [field]: "Versiunea a doua" }, "service-version-two"))
        .status,
    ).toBe(200);
    expect(
      (await save(1, { [field]: "Editare veche" }, "service-stale-save"))
        .status,
    ).toBe(409);
    expect(
      (await (await get("/api/admin/service-pages/overview")).json()).values,
    ).toEqual({ [field]: "Versiunea a doua" });
    expect(
      db.prepare("SELECT count(*) total FROM service_page_versions").get()!
        .total,
    ).toBe(2);
    expect((await save(0, { [field]: "Cheie refolosită" })).status).toBe(409);
  });
  it("restores a prior snapshot as a new draft without overwriting history or publication", async () => {
    await save();
    await publish(1);
    await save(1, { [field]: "A doua variantă" }, "second-service-version");
    const old = await (
      await get("/api/admin/service-pages/overview/versions/1")
    ).json();
    expect((await save(2, old.values, "restored-service-version")).status).toBe(
      200,
    );
    expect(
      await (await get("/api/public/service-pages/overview")).json(),
    ).toMatchObject({ revision: 1 });
    expect(
      db.prepare("SELECT revision FROM service_page_configs").get()!.revision,
    ).toBe(3);
    expect(() =>
      db.exec(
        "UPDATE service_page_versions SET content_json='{}' WHERE revision=1",
      ),
    ).toThrow(/immutable/);
    expect(() =>
      db.exec("DELETE FROM service_page_versions WHERE revision=1"),
    ).toThrow(/immutable/);
  });
  it("rejects unknown fields, prices, routing and oversized payloads", async () => {
    for (const field of [
      "service.category",
      "service.priceRon",
      "service.path.ro",
      "service.accent.from",
      "unknown",
    ])
      expect(
        (await save(0, { [field]: "modified" }, crypto.randomUUID())).status,
      ).toBe(400);
    expect((await save(0, {}, crypto.randomUUID(), "nonexistent")).status).toBe(
      404,
    );
    expect(
      (
        await app.request(
          "/api/admin/service-pages/overview",
          {
            method: "PUT",
            headers: {
              "content-type": "application/json",
              "idempotency-key": crypto.randomUUID(),
            },
            body: JSON.stringify({
              revision: 0,
              values: { [field]: "a".repeat(140000) },
            }),
          },
          {},
        )
      ).status,
    ).toBe(413);
    expect((await save(0, { [field]: "" }, crypto.randomUUID())).status).toBe(
      400,
    );
  });
  it("rechecks roles and MFA before an idempotent response can be replayed", async () => {
    await save();
    requiredMfa = true;
    expect((await save()).status).toBe(403);
    requiredMfa = false;
    db.exec("DELETE FROM user_roles WHERE user_id='owner'");
    expect((await save()).status).toBe(403);
  });
  it("rolls back page, version and retry reservation if audit persistence fails", async () => {
    db.exec(
      "CREATE TRIGGER reject_service_audit BEFORE INSERT ON security_events WHEN NEW.action='service_page.draft_saved' BEGIN SELECT RAISE(ABORT,'fixture_audit_unavailable'); END",
    );
    expect((await save()).status).toBe(500);
    for (const table of [
      "service_page_configs",
      "service_page_versions",
      "idempotency_keys",
    ])
      expect(
        db.prepare(`SELECT count(*) total FROM ${table}`).get()!.total,
      ).toBe(0);
  });
  it("applies text values while preserving code, prices, URLs, icons and styles", () => {
    const icon = () => null;
    const source = {
      copy: { ro: { title: "Titlu inițial" } },
      priceRon: 100,
      path: { ro: "/servicii" },
      accent: { from: "from-violet-400" },
      icon,
    };
    const output = applyServiceText(source, "service", {
      "service.copy.ro.title": "Titlu nou",
      "service.priceRon": "1",
      "service.path.ro": "javascript:alert(1)",
      "service.accent.from": "hidden",
      "service.icon": "invalid",
    });
    expect(output.copy.ro.title).toBe("Titlu nou");
    expect(output.priceRon).toBe(100);
    expect(output.path.ro).toBe("/servicii");
    expect(output.accent).toEqual(source.accent);
    expect(output.icon).toBe(icon);
    expect(source.copy.ro.title).toBe("Titlu inițial");
  });
});
