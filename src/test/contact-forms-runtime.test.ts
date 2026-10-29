// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("never stores or forwards public attachments without a clean scan verdict", async () => {
    const put = vi.fn(async () => undefined);
    env.FILES = { put, delete: async () => undefined } as unknown as R2Bucket;
    let attempt = 0;
    const submit = (twoFiles = false) => {
      attempt += 1;
      const form = new FormData();
      form.set("name", "Client Test");
      form.set("business", "Atelier Test");
      form.set("phone", "0712345678");
      form.set("email", `client${attempt}@example.test`);
      form.set("files", new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), "synthetic.png");
      if (twoFiles) form.append("files", new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), "second.png");
      return app.request("https://avyron.test/api/contact/demo", { method: "POST", headers: { "CF-Connecting-IP": `203.0.113.${attempt}` }, body: form }, env, executionCtx);
    };
    const leadCount = () => (db.prepare("SELECT COUNT(*) AS total FROM leads").get() as { total: number }).total;

    expect((await submit()).status).toBe(503);
    expect(leadCount()).toBe(0);
    expect(put).not.toHaveBeenCalled();

    env.MALWARE_SCANNER = { fetch: async () => Response.json({ verdict: "rejected" }) };
    expect((await submit()).status).toBe(400);
    expect(leadCount()).toBe(0);
    expect(put).not.toHaveBeenCalled();

    let scanCalls = 0;
    env.MALWARE_SCANNER = { fetch: async () => Response.json({ verdict: ++scanCalls === 2 ? "rejected" : "clean" }) };
    expect((await submit(true)).status).toBe(400);
    expect(scanCalls).toBe(2);
    expect(leadCount()).toBe(0);
    expect(put).not.toHaveBeenCalled();

    env.MALWARE_SCANNER = { fetch: async () => Response.json({ verdict: "clean" }) };
    const accepted = await submit();
    expect(accepted.status).toBe(503); // No mail destination in this isolated fixture.
    expect((await accepted.json() as { saved: boolean }).saved).toBe(true);
    expect(leadCount()).toBe(1);
    expect(put).toHaveBeenCalledOnce();
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
