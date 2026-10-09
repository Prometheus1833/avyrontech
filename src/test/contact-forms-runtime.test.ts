// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { contactRouter } from "../../cloudflare/workers/api/src/contact";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly db: SqliteDatabase, readonly sql: string) {}
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.values) ?? null) as T | null; }
  async all<T>() { return { results: this.db.prepare(this.sql).all(...this.values) as T[] }; }
  async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}

describe("public free-example forms", () => {
  let db: SqliteDatabase;
  let app: Hono<AppBindings>;
  let env: Env;
  const executionCtx = {
    waitUntil: (_promise: Promise<unknown>) => undefined,
    passThroughOnException: () => undefined,
  } as ExecutionContext;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const file of readdirSync("cloudflare/d1/migrations").filter((name) => name.endsWith(".sql")).sort()) {
      db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
    }
    env = {
      DB: { prepare: (sql: string) => new Statement(db, sql) },
      FILES: { put: async () => undefined, delete: async () => undefined },
      PUBLIC_API_RATE_LIMITER: { limit: async () => ({ success: true }) },
    } as unknown as Env;
    app = new Hono<AppBindings>();
    app.route("/", contactRouter);
  });

  afterEach(() => db.close());

  it("persists the landing form before reporting an unavailable email notification", async () => {
    const form = new FormData();
    form.set("name", "Ana Popescu");
    form.set("business", "Atelier floral");
    form.set("phone", "0712345678");
    form.set("email", "ana@example.ro");
    form.set("description", "Doresc un exemplu gratuit.");

    const response = await app.request("https://avyron.test/api/contact/demo", { method: "POST", body: form }, env, executionCtx);
    const body = await response.json() as { saved: boolean; delivered: boolean; leadId: string };

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ saved: true, delivered: false });
    expect(db.prepare("SELECT source,email,delivery_status FROM leads WHERE id=?").get(body.leadId))
      .toMatchObject({ source: "website:cta-demo", email: "ana@example.ro", delivery_status: "failed" });
  });

  it("persists compact example requests in the staff inbox even when email is unavailable", async () => {
    const response = await app.request("https://avyron.test/api/contact/example", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "client@example.ro",
        phone: "0722333444",
        source_slug: "site-prezentare",
        source_category: "website",
        source_name: "Site de prezentare",
      }),
    }, env, executionCtx);
    const body = await response.json() as { saved: boolean; delivered: boolean; requestId: string };

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ saved: true, delivered: false });
    expect(db.prepare("SELECT email,source_slug,delivery_status FROM example_requests WHERE id=?").get(body.requestId))
      .toMatchObject({ email: "client@example.ro", source_slug: "site-prezentare", delivery_status: "failed" });
  });
});
