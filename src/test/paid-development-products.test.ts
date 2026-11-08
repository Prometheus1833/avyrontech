// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync as Database, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { produseShopRouter } from "../../cloudflare/workers/api/src/produseShop";
import { recordPaidOrder } from "../../cloudflare/workers/api/src/billing";
import type { PaidProductHistory } from "@/shared/paidProducts";
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly db: Database, readonly sql: string) {}
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  async first() { return this.db.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}

describe("paid Development product history", () => {
  let db: Database, app: Hono, actor: string;
  const env = () => ({ DB: {
    prepare: (sql: string) => new Statement(db, sql),
    batch: async (statements: Statement[]) => {
      db.exec("BEGIN");
      try { const result = statements.map(s => ({ meta: db.prepare(s.sql).run(...s.values) })); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  } });
  const send = (query = "") => app.request(`/api/produse/account/purchases${query}`, {}, env() as never);
  const line = { type: "product", productSlug: "logo-studio-3d", sku: "product-logo-studio-3d", name: "Logo Studio 3D", quantity: 1, lineTotalCents: 7500 };
  const order = (id: string, status = "paid", owner = "a", items: unknown[] = [line], createdAt = 1) => {
    db.prepare("INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,status,created_at,updated_at) VALUES (?,?,?,7500,7500,?,?,?)").run(id, owner, JSON.stringify(items), status, createdAt, createdAt);
  };
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const file of readdirSync("cloudflare/d1/migrations").filter(f => f.endsWith(".sql")).sort()) db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
    for (const id of ["a", "b"]) db.prepare("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,1,1)").run(id, `${id}@example.test`, "fixture");
    actor = "a";
    app = new Hono();
    app.use("*", async (c, next) => { if (!actor) return c.json({error:{code:"unauthorized"}},401); c.set("userId", actor); await next(); });
    app.route("/", produseShopRouter);
  });
  afterEach(() => db.close());
  it("exposes only the current customer's paid products; a forged user/cursor cannot reveal another customer", async () => {
    order("a-paid"); order("b-paid", "paid", "b");
    for (const status of ["requested", "accepted", "quoted", "cancelled"]) order(`a-${status}`, status);
    order("services", "paid", "a", [{ type:"service",name:"Website" }]);
    const result = await (await send("?userId=b")).json() as PaidProductHistory;
    expect(result.data.map(row => row.id)).toEqual(["a-paid"]);
    const cursor = btoa(JSON.stringify({at:100,id:"b-paid"}));
    expect((await (await send(`?cursor=${encodeURIComponent(cursor)}`)).json() as PaidProductHistory).data.map(row => row.id)).toEqual(["a-paid"]);
    actor = ""; expect((await send()).status).toBe(401);
  });
  it("uses the real fulfillment transaction once and preserves history after entitlement expiry/revocation", async () => {
    order("confirmed", "accepted");
    const snapshot = db.prepare("SELECT * FROM commerce_orders WHERE id='confirmed'").get();
    expect((await send()).status).toBe(200);
    expect((await (await send()).json() as PaidProductHistory).data).toEqual([]);
    const input = { provider:"stripe" as const, providerReference:"synthetic-payment", order:snapshot };
    await recordPaidOrder(env() as never, input as never);
    await recordPaidOrder(env() as never, input as never);
    expect(db.prepare("SELECT COUNT(*) n FROM product_entitlements WHERE order_id='confirmed'").get()).toMatchObject({n:1});
    db.prepare("UPDATE product_entitlements SET revoked_at=1,expires_at=1 WHERE order_id='confirmed'").run();
    const history = await (await send()).json() as PaidProductHistory;
    expect(history.data).toHaveLength(1);
    expect(history.data[0]).toMatchObject({id:"confirmed",items:[{name:"Logo Studio 3D",slug:"logo-studio-3d"}]});
    expect(history.data[0].paidAt).toBeGreaterThan(1);
  });
  it("preserves licence snapshots and does not auto-issue an invoice selected as manual",async()=>{
    const conditions={...line,licenseName:"Licență achiziție",licenseTerms:"Condițiile originale ale achiziției.",invoiceProvider:"manual"};order("manual-order","accepted","a",[conditions]);
    const snapshot=db.prepare("SELECT * FROM commerce_orders WHERE id='manual-order'").get();
    await recordPaidOrder({...env(),OBLIO_AUTO_ISSUE_ENABLED:"true"} as never,{provider:"stripe",providerReference:"manual-ref",order:snapshot} as never);
    expect(db.prepare("SELECT error_code FROM billing_invoices WHERE order_id='manual-order'").get()).toMatchObject({error_code:"manual_invoice_required"});
    const history=await (await send()).json() as PaidProductHistory;expect(history.data[0].items[0]).toMatchObject({licenseName:conditions.licenseName,licenseTerms:conditions.licenseTerms});
  });
  it("paginates stable ties without duplicates and includes old item snapshots in mixed orders", async () => {
    for (let i=0;i<23;i++) order(`history-${String(i).padStart(2,"0")}`);
    order("legacy", "paid", "a", [{kind:"item",id:"old-product",name:"Produs istoric"},{type:"service",name:"Serviciu"}], 2);
    order("malformed-lines", "paid", "a", [null,"text",{type:"service"}], 3);
    const page = await (await send()).json() as PaidProductHistory;
    expect(page.data).toHaveLength(20); expect(page.data[0].items).toHaveLength(1);
    const second = await (await send(`?cursor=${encodeURIComponent(page.nextCursor!)}`)).json() as PaidProductHistory;
    expect(second.data).toHaveLength(4); expect(second.nextCursor).toBeNull();
    expect(new Set([...page.data,...second.data].map(row=>row.id)).size).toBe(24);
    expect((await send("?cursor=garbage")).status).toBe(400);
  });
});
