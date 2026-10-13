// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { produseAdminRouter } from "../../cloudflare/workers/api/src/produseAdmin";
import { catalogCodesRouter } from "../../cloudflare/workers/api/src/catalogCodes";
import { SERVICE_COMMERCIAL_SOURCES } from "../data/serviceCommercialSources";
import { SERVICES } from "../data/services";

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
  const send = (path: string, body?: unknown, method = "POST") => app.request(path, body === undefined ? { method: method === "POST" ? "GET" : method } : {
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }, { DB: {
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
    expect((await send("/api/finance/commercial-codes")).status).toBe(403);
    expect((await send("/api/finance/commercial-codes/sync", {})).status).toBe(403);
    expect((await send("/api/produse/admin/items/new", { slug: "test-demo", type: "effect", category: "Test", nameRo: "Efect test", nameEn: "Test effect", access: "free", priceRonCents: null })).status).toBe(403);
    const publicResponse = await send("/api/produse/public/plans");
    expect(publicResponse.status).toBe(200);
    const publicBody = await publicResponse.json() as { data: Array<Record<string, unknown>> };
    expect(publicBody.data).toHaveLength(3);
    expect(publicBody.data[0]).not.toHaveProperty("created_by");
  });

  it("păstrează identitatea serviciilor identică cu paginile publice", () => {
    for (const service of SERVICES) {
      const commercial = SERVICE_COMMERCIAL_SOURCES.find((item) => item.entity_key === service.key);
      expect(commercial).toMatchObject({ display_name: service.copy.ro.name, category: service.category, base_price_minor: service.priceRon > 0 ? service.priceRon * 100 : null });
    }
    // Auditul este o ofertă la cerere, iar blogul are o pagină separată.
    expect(SERVICE_COMMERCIAL_SOURCES).toHaveLength(SERVICES.length + 2);
  });

  it("înregistrează lipsurile idempotent, păstrează codurile editate și separă referințele test/live", async () => {
    const first = await send("/api/finance/commercial-codes/sync", {});
    expect(first.status).toBe(200);
    const firstBody = await first.json() as { created: number; total: number; requiresSku: number };
    expect(firstBody.created).toBe(firstBody.total);
    expect(firstBody.requiresSku).toBe(0);
    expect(db.prepare("SELECT sku,tax_status,accounting_code,price_model FROM commercial_catalog_codes WHERE entity_type='service' AND entity_key='premium-website'").get())
      .toMatchObject({ sku: "svc-premium-website", tax_status: "unverified", accounting_code: null, price_model: "starting_at" });
    expect(db.prepare("SELECT sku,base_price_minor FROM commercial_catalog_codes WHERE entity_type='product' AND entity_key='logo-studio-3d'").get())
      .toMatchObject({ sku: "product-logo-studio-3d", base_price_minor: 7500 });
    const prematureActivation = {
      displayName: "Site Prezentare Profesional", accountingCode: null, sku: "svc-premium-website", category: "presence",
      basePriceMinor: 145000, currency: "RON", vatBasisPoints: 0, paymentRoute: "stripe",
      preferredPaymentProvider: "stripe", invoiceProvider: "oblio", paymentStatus: "active",
      promotionCode: null, active: true, notes: "", unitLabel: "serviciu", priceModel: "starting_at",
      billingCycle: "one_time", taxStatus: "unverified",
    };
    expect((await send("/api/finance/commercial-codes/service/premium-website", prematureActivation, "PUT")).status).toBe(409);
    const second = await (await send("/api/finance/commercial-codes/sync", {})).json() as { created: number; existing: number };
    expect(second).toMatchObject({ created: 0, existing: firstBody.total });

    const refPath = "/api/finance/commercial-codes/service/premium-website/provider-refs/stripe/test/product";
    expect((await send(refPath, { externalId: "prod_test_avyron" }, "PUT")).status).toBe(200);
    expect((await send(refPath.replace("/test/", "/live/"), { externalId: "prod_live_avyron" }, "PUT")).status).toBe(200);
    expect((await send(refPath.replace("premium-website", "logo-3d"), { externalId: "prod_test_avyron" }, "PUT")).status).toBe(409);
    expect((await send(refPath.replace("stripe/test/product", "oblio/test/article"), { externalId: "ART-01" }, "PUT")).status).toBe(200);
    expect((await send(refPath.replace("stripe/test/product", "oblio/test/price"), { externalId: "bad" }, "PUT")).status).toBe(400);
    expect((await send(refPath, { externalId: "sk_live_should_never_be_saved" }, "PUT")).status).toBe(400);
    const listing = await (await send("/api/finance/commercial-codes")).json() as { references: Array<{ external_id: string }> };
    expect(listing.references.map(ref => ref.external_id)).toContain("prod_test_avyron");
    expect((await send(refPath, undefined, "DELETE")).status).toBe(200);
    expect(db.prepare("SELECT COUNT(*) AS n FROM commercial_catalog_provider_ref_audit").get()).toMatchObject({ n: 4 });
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
