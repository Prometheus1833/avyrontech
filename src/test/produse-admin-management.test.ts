// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { produseAdminRouter } from "../../cloudflare/workers/api/src/produseAdmin";
import { catalogCodesRouter } from "../../cloudflare/workers/api/src/catalogCodes";

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly db: SqliteDatabase, readonly sql: string) {}
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  async first() { return this.db.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}

describe("administrarea produselor și parteneriatelor", () => {
  let db: SqliteDatabase;
  let app: Hono;
  let actor: string;
  const send = (path: string, body?: unknown, method = "POST") => app.request(path, body ? {
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  } : { method: "GET" }, { DB: {
    prepare: (sql: string) => new Statement(db, sql),
    batch: async (statements: Statement[]) => {
      db.exec("BEGIN");
      try { const rows = statements.map(statement => ({ meta: db.prepare(statement.sql).run(...statement.values) })); db.exec("COMMIT"); return rows; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  } } as never);

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const file of readdirSync("cloudflare/d1/migrations").filter(file => file.endsWith(".sql")).sort()) {
      db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
    }
    db.prepare("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,1,1)").run("owner", "prometheus@avyron.ro", "fixture");
    db.prepare("INSERT INTO user_roles(user_id,role) VALUES (?,'admin')").run("owner");
    db.prepare("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,1,1)").run("client", "client@example.test", "fixture");
    db.prepare("INSERT INTO user_roles(user_id,role) VALUES (?,'user')").run("client");
    actor = "owner";
    app = new Hono();
    app.use("*", async (c, next) => { c.set("userId", actor); await next(); });
    app.route("/", produseAdminRouter);
    app.route("/", catalogCodesRouter);
  });

  it("ține scrierile private, dar oferă public numai prețurile și limitele planurilor", async () => {
    actor = "client";
    expect((await send("/api/produse/admin/overview")).status).toBe(403);
    expect((await send("/api/produse/admin/items/new", { slug: "test-demo", type: "effect", category: "Test", nameRo: "Efect test", nameEn: "Test effect", access: "free", priceRonCents: null })).status).toBe(403);
    const publicResponse = await send("/api/produse/public/plans");
    expect(publicResponse.status).toBe(200);
    const publicBody = await publicResponse.json() as { data: Array<Record<string, unknown>> };
    expect(publicBody.data).toHaveLength(3);
    expect(publicBody.data[0]).not.toHaveProperty("created_by");
  });

  it("creează drafturi, arhivează fără ștergere și sincronizează prețul comercial cu checkoutul", async () => {
    const created = await send("/api/produse/admin/items/new", { slug: "efect-test", type: "effect", category: "Motion", nameRo: "Efect test", nameEn: "Test effect", access: "pro", priceRonCents: 10000 });
    expect(created.status).toBe(201);
    expect(db.prepare("SELECT status FROM product_items WHERE slug='efect-test'").get()).toMatchObject({ status: "draft" });
    const code = { displayName: "Efect test", accountingCode: "EF-01", sku: "EF-TEST-01", category: "effect", basePriceMinor: 12000, currency: "RON", vatBasisPoints: 1900, paymentRoute: "stripe", preferredPaymentProvider: "stripe", invoiceProvider: "manual", paymentStatus: "test", promotionCode: null, active: true, notes: "" };
    expect((await send("/api/finance/commercial-codes/product/efect-test", code, "PUT")).status).toBe(200);
    expect(db.prepare("SELECT price_ron_cents FROM product_items WHERE slug='efect-test'").get()).toMatchObject({ price_ron_cents: 12000 });
    db.prepare("INSERT INTO product_copy_events(id,user_id,slug,day,channel,created_at) VALUES ('copy-1','owner','efect-test','2026-10-12','code',1)").run();
    expect((await send("/api/produse/admin/items", { slug: "efect-test", status: "archived" })).status).toBe(409);
    db.prepare("DELETE FROM product_copy_events WHERE id='copy-1'").run();
    expect((await send("/api/produse/admin/items", { slug: "efect-test", priceRonCents: 14000, status: "archived" })).status).toBe(200);
    expect(db.prepare("SELECT status,price_ron_cents FROM product_items WHERE slug='efect-test'").get()).toMatchObject({ status: "archived", price_ron_cents: 14000 });
    expect(db.prepare("SELECT base_price_minor FROM commercial_catalog_codes WHERE entity_type='product' AND entity_key='efect-test'").get()).toMatchObject({ base_price_minor: 14000 });
    expect(db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action LIKE 'produse_%'").get()).toMatchObject({ n: 2 });
  });

  it("propagă editarea parteneriatului la ruta citită de vitrina publică", async () => {
    const updated = await send("/api/produse/admin/plans/pro", { name: "AVY Pro", priceRonCents: 32000, priceEurCents: 6200, componentsPerDay: 12, sectionsPerDay: 6, templatesPerDay: 4 }, "PATCH");
    expect(updated.status).toBe(200);
    const body = await (await send("/api/produse/public/plans")).json() as { data: Array<{ id: string; price_ron_cents: number; components_per_day: number }> };
    expect(body.data.find(plan => plan.id === "pro")).toMatchObject({ price_ron_cents: 32000, components_per_day: 12 });
  });
});
