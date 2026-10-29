import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import {
  discountFor,
  isValidPromotionCode,
  normalizePromotionCode,
  priceOrderItems,
  promotionDiscountFor,
  normalizeAccountCartItems,
  promotionsRouter,
} from "../../cloudflare/workers/api/src/promotions";
import { ANNUAL_DISCOUNT_PERCENT, annualSubscriptionTotal } from "@/lib/subscriptionCheckout";
import type { AppBindings } from "../../cloudflare/workers/api/src/types";

describe("server-authoritative commerce pricing", () => {
  it("uses catalog prices and never accepts a browser supplied price", () => {
    const quote = priceOrderItems([{ sku: "website-starter", quantity: 2, price: 1 }]);
    expect(quote).toMatchObject({ subtotalCents: 98_000, requiresManualQuote: false });
    expect(quote?.items[0]).toMatchObject({ unitPriceCents: 49_000, lineTotalCents: 98_000 });
  });

  it("marks custom products for a manual quote without inventing a price", () => {
    const quote = priceOrderItems([{ sku: "custom-request", description: "Platformă internă", quantity: 1 }]);
    expect(quote).toMatchObject({ subtotalCents: 0, requiresManualQuote: true });
    expect(quote?.items[0].lineTotalCents).toBeNull();
  });

  it("uses reviewed commercial codes for payment and keeps unverified codes at manual quote", () => {
    const approved = { sku: "svc-qa-testing", entity_key: "qa-testing", entity_type: "service" as const, display_name: "Testare QA", accounting_code: "SVC-QA", base_price_minor: 160_000, currency: "RON", price_model: "fixed", tax_status: "verified", payment_status: "active", active: 1 };
    const paid = priceOrderItems([{ sku: approved.sku, quantity: 1, price: 1 }], 5, [approved]);
    expect(paid).toMatchObject({ subtotalCents: 160_000, requiresManualQuote: false });
    expect(paid?.items[0]).toMatchObject({ accountingCode: "SVC-QA", type: "service", lineTotalCents: 160_000 });
    const unverified = priceOrderItems([{ sku: approved.sku, quantity: 1, price: 1 }], 5, [{ ...approved, tax_status: "unverified" }]);
    expect(unverified).toMatchObject({ subtotalCents: 0, requiresManualQuote: true });
    const withoutPrice = priceOrderItems([{ sku: approved.sku, quantity: 1 }], 5, [{ ...approved, base_price_minor: null }]);
    expect(withoutPrice?.items[0]).toMatchObject({ referenceUnitPriceCents: null, lineTotalCents: null });
    expect(priceOrderItems([{ sku: approved.sku, quantity: 1 }], 5, [{ ...approved, active: 0 }])).toBeNull();
    const product = { ...approved, sku: "product-card-holografic", entity_key: "card-holografic", entity_type: "product" as const, display_name: "Card holografic" };
    expect(priceOrderItems([{ sku: product.sku, quantity: 1, productSlug: "another-product" }], 5, [product])).toBeNull();
    expect(priceOrderItems([{ sku: product.sku, quantity: 1 }], 5, [product])?.items[0].productSlug).toBe("card-holografic");
  });

  it("keeps the selected service on an annual subscription without accepting unknown service keys", () => {
    const valid = priceOrderItems([{ sku: "sub-site-plus", quantity: 1, period: "annual", serviceKey: "premium-website" }]);
    expect(valid?.items[0].serviceKey).toBe("premium-website");
    expect(priceOrderItems([{ sku: "sub-site-plus", quantity: 1, period: "annual", serviceKey: "unknown" }])).toBeNull();
  });

  it("rejects unknown products and unsafe quantities", () => {
    expect(priceOrderItems([{ sku: "unknown", quantity: 1 }])).toBeNull();
    expect(priceOrderItems([{ sku: "website-starter", quantity: 99 }])).toBeNull();
  });

  it("prices the EUR care plans in RON and multiplies only annual billing by 12", () => {
    const monthly = priceOrderItems([{ sku: "care-plus", quantity: 1, period: "monthly" }], 5);
    const annual = priceOrderItems([{ sku: "care-plus", quantity: 1, period: "annual" }], 5);
    expect(monthly).toMatchObject({ subtotalCents: 25_000 });
    expect(monthly?.items[0]).toMatchObject({ referenceUnitPriceCents: 5_000, referenceCurrency: "EUR", billingMonths: 1 });
    expect(annual).toMatchObject({ subtotalCents: 300_000 });
    expect(annual?.items[0]).toMatchObject({ period: "annual", billingMonths: 12, lineTotalCents: 300_000 });
  });

  it("accepts one canonical subscription selection and rejects ambiguous periods or quantities", () => {
    expect(priceOrderItems([{ sku: "care-plus", quantity: 1, period: "12 luni" }], 5)).toBeNull();
    expect(priceOrderItems([{ sku: "care-plus", quantity: 2, period: "annual" }], 5)).toBeNull();
    expect(priceOrderItems([
      { sku: "care-plus", quantity: 1, period: "annual" },
      { sku: "care-pro", quantity: 1, period: "annual" },
    ], 5)).toBeNull();
  });

  it("rounds discounts in integer cents and caps 100% at the subtotal", () => {
    expect(discountFor(49_000, 10)).toBe(4_900);
    expect(discountFor(49_001, 5)).toBe(2_450);
    expect(discountFor(49_000, 100)).toBe(49_000);
  });

  it("scopes ANUALAVY20 to the selected annual subscription in a mixed cart", () => {
    const quote = priceOrderItems([
      { sku: "care-pro", quantity: 1, period: "annual" },
      { sku: "website-starter", quantity: 1 },
    ], 5)!;
    expect(quote.subtotalCents).toBe(900_000 + 49_000);
    expect(promotionDiscountFor(quote, 20, "annual_subscription")).toEqual({
      discountBaseCents: 900_000,
      discountCents: 180_000,
    });
    expect(promotionDiscountFor(quote, 20, "order")).toEqual({
      discountBaseCents: 949_000,
      discountCents: 189_800,
    });
  });

  it("makes the annual scope ineligible for monthly subscriptions and standalone products", () => {
    const monthly = priceOrderItems([{ sku: "care-pro-active", quantity: 1, period: "monthly" }], 5)!;
    const product = priceOrderItems([{ sku: "website-starter", quantity: 1 }], 5)!;
    expect(promotionDiscountFor(monthly, 20, "annual_subscription").discountBaseCents).toBe(0);
    expect(promotionDiscountFor(product, 20, "annual_subscription").discountBaseCents).toBe(0);
  });
});

describe("promotion controls", () => {
  it("shows the same 20% annual advantage that the server promotion applies", () => {
    expect(ANNUAL_DISCOUNT_PERCENT).toBe(20);
    expect(annualSubscriptionTotal(25_000)).toBe(240_000);
  });

  it("normalizes codes consistently and rejects malformed values", () => {
    expect(normalizePromotionCode(" avy 10 ")).toBe("AVY10");
    expect(isValidPromotionCode("SOCIALAVY")).toBe(true);
    expect(isValidPromotionCode("<script>")).toBe(false);
  });

  it("seeds all approved promotion codes", () => {
    const migration = readFileSync(resolve(process.cwd(), "cloudflare/d1/migrations/0009_promotions.sql"), "utf8");
    const annualMigration = readFileSync(resolve(process.cwd(), "cloudflare/d1/migrations/0010_annual_subscription_promotion.sql"), "utf8");
    for (const code of ["AVY10", "AVYONG", "SOCIALAVY", "PROMETHAVY", "EXCEPTIEAVY"]) {
      expect(migration).toContain(`'${code}'`);
    }
    for (const [code, percent] of [
      ["AVY10", 10],
      ["AVYONG", 10],
      ["SOCIALAVY", 5],
      ["PROMETHAVY", 100],
      ["EXCEPTIEAVY", 50],
    ] as const) {
      expect(migration).toMatch(new RegExp(`'${code}'[^\\n]*,\\s*${percent},\\s*1,\\s*1,\\s*1,`));
    }
    expect(migration).toContain("promotion_redemptions");
    expect(migration).toContain("commerce_orders");
    expect(annualMigration).toContain("'ANUALAVY20'");
    expect(annualMigration).toContain("'annual_subscription'");
    expect(annualMigration).toContain("discount_base_cents");
  });
});

describe("registered account cart", () => {
  it("keeps products, subscriptions and services while dropping browser prices", () => {
    const cart = normalizeAccountCartItems([
      { id: "s1", source: "subscriptions", sku: "sub-site-plus", type: "subscription", name: "Site Plus", period: "annual", price_estimate: 1 },
      { id: "p1", source: "products", sku: "product-button", type: "product", name: "Button", productSlug: "button", price_estimate: 1 },
      { id: "v1", source: "services", sku: "custom-request", type: "service", name: "Website profesional", price_estimate: 1 },
    ]);
    expect(cart).toHaveLength(3);
    expect(cart?.[0]).not.toHaveProperty("price_estimate");
    expect(cart?.map((item) => item.type)).toEqual(["subscription", "product", "service"]);
  });

  it("rejects malformed product and subscription lines", () => {
    expect(normalizeAccountCartItems([{ id: "p", source: "products", sku: "p", type: "product", name: "P" }])).toBeNull();
    expect(normalizeAccountCartItems([{ id: "s", source: "subscriptions", sku: "s", type: "subscription", name: "S" }])).toBeNull();
  });
});

describe("commerce order retry", () => {
  it("returns the original order for an identical request and rejects reuse with different items", async () => {
    let saved: { id: string; status: string; total_cents: number; currency: string; client_request_json: string } | null = null;
    const db = {
      prepare: (sql: string) => {
        let params: unknown[] = [];
        const statement = {
          bind: (...values: unknown[]) => { params = values; return statement; },
          first: async () => sql.includes("client_request_id") ? saved : null,
          params: () => params,
          sql,
        };
        return statement;
      },
      batch: async (statements: Array<{ params: () => unknown[]; sql: string }>) => {
        const insert = statements.find((statement) => statement.sql.includes("INSERT INTO commerce_orders"))!;
        const values = insert.params();
        saved = { id: String(values[0]), status: "requested", total_cents: Number(values[5]), currency: "RON", client_request_json: String(values[10]) };
        return [{ meta: { changes: 1 } }];
      },
    };
    const app = new Hono<AppBindings>();
    app.use("*", async (c, next) => { c.set("userId", "account-1"); await next(); });
    app.route("/", promotionsRouter);
    const env = { DB: db } as unknown as AppBindings["Bindings"];
    const request = { items: [{ sku: "website-starter", quantity: 1 }], clientRequestId: "a".repeat(64) };
    const first = await app.request("http://localhost/api/commerce/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) }, env);
    expect(first.status).toBe(201);
    const repeat = await app.request("http://localhost/api/commerce/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) }, env);
    expect(repeat.status).toBe(200);
    expect((await repeat.json() as {order: {id: string; replay: boolean}}).order).toMatchObject({ id: saved!.id, replay: true });
    const conflict = await app.request("http://localhost/api/commerce/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...request, items: [{ sku: "website-business", quantity: 1 }] }) }, env);
    expect(conflict.status).toBe(409);
  });
});
