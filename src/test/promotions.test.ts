import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROMOTION_OWNER_EMAIL,
  discountFor,
  isValidPromotionCode,
  normalizePromotionCode,
  priceOrderItems,
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

  it("rounds discounts in integer cents and caps 100% at the subtotal", () => {
    expect(discountFor(49_000, 10)).toBe(4_900);
    expect(discountFor(49_001, 5)).toBe(2_450);
    expect(discountFor(49_000, 100)).toBe(49_000);
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
    for (const code of ["AVY10", "AVYONG", "SOCIALAVY", "PROMETHAVY", "EXCEPTIEAVY"]) {
      expect(migration).toContain(`'${code}'`);
    }
    expect(migration).toContain("promotion_redemptions");
    expect(migration).toContain("commerce_orders");
  });
});
