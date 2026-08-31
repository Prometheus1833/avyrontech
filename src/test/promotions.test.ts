import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROMOTION_OWNER_EMAIL,
  discountFor,
  isValidPromotionCode,
  normalizePromotionCode,
  priceOrderItems,
  promotionDiscountFor,
} from "../../cloudflare/workers/api/src/promotions";

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
  it("normalizes codes consistently and rejects malformed values", () => {
    expect(normalizePromotionCode(" avy 10 ")).toBe("AVY10");
    expect(isValidPromotionCode("SOCIALAVY")).toBe(true);
    expect(isValidPromotionCode("<script>")).toBe(false);
  });

  it("reserves management for the requested account and seeds all approved codes", () => {
    expect(PROMOTION_OWNER_EMAIL).toBe("prometheus@avyron.ro");
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
