import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY_CURRENCY } from "@/hooks/useCurrency";
import { getService } from "@/data/services";
import {
  DEFAULT_WEBSITE_ESTIMATOR_SELECTION,
  WEBSITE_BASE_PRICE_EUR,
  WEBSITE_BASE_PRICE_RON,
  calculateWebsiteEstimate,
  fixedWebsiteEur,
} from "@/data/websiteEstimator";
import { categoryByKey } from "@/data/subscriptionPlans";

describe("website pricing and estimator", () => {
  it("starts with RON and keeps a fixed rounded EUR counterpart", () => {
    const website = getService("premium-website");

    expect(DEFAULT_DISPLAY_CURRENCY).toBe("RON");
    expect(website.priceRon).toBe(1150);
    expect(website.priceEur).toBe(220);
    expect(WEBSITE_BASE_PRICE_RON).toBe(1150);
    expect(WEBSITE_BASE_PRICE_EUR).toBe(220);
    expect(fixedWebsiteEur(1150)).toBe(220);
  });

  it("uses the 1,150 RON package as the minimum estimate", () => {
    expect(calculateWebsiteEstimate(DEFAULT_WEBSITE_ESTIMATOR_SELECTION)).toEqual({
      lowRon: 1150,
      highRon: 1250,
      subtotalRon: 1150,
      discountRon: 0,
      daysMin: 3,
      daysMax: 5,
      profile: "essential",
    });
  });

  it("raises budget, delivery and recommendation from the selected scope", () => {
    const result = calculateWebsiteEstimate({
      pages: "extended",
      content: "complete",
      addons: ["bilingual", "booking", "catalog", "motion", "integrations"],
    });

    expect(result.lowRon).toBe(4_150);
    expect(result.highRon).toBe(4_730);
    expect(result.daysMin).toBe(16);
    expect(result.daysMax).toBe(18);
    expect(result.profile).toBe("signature");
  });

  it("prices custom email accounts and stacks the two 10% discounts", () => {
    const result = calculateWebsiteEstimate({
      pages: "compact",
      content: "ready",
      addons: ["bilingual"],
      emailAccounts: 4,
      discounts: ["avyron-credit", "nonprofit"],
    });

    expect(result.subtotalRon).toBe(1_450);
    expect(result.discountRon).toBe(290);
    expect(result.lowRon).toBe(1_160);
  });

  it("places the calculator immediately before the portfolio subsection", () => {
    const page = readFileSync(resolve(__dirname, "../pages/services/ServicePage.tsx"), "utf8");
    const calculator = page.indexOf("<WebsitePriceCalculator />");
    const portfolio = page.indexOf('id="portofoliu"');

    expect(calculator).toBeGreaterThan(-1);
    expect(portfolio).toBeGreaterThan(calculator);
  });

  it("keeps the effects library below the calculator and plans below FAQ", () => {
    const page = readFileSync(resolve(__dirname, "../pages/services/ServicePage.tsx"), "utf8");
    expect(page.indexOf("<LibraryLink />")).toBeGreaterThan(page.indexOf("<WebsitePriceCalculator />"));
    expect(page.indexOf("<PlanTeaser")).toBeGreaterThan(page.indexOf('id="faq"'));
    expect(page).not.toContain("RON este prețul comercial principal");
  });

  it("uses the requested 50, 100 and 200 RON website maintenance tiers", () => {
    const sitePlans = categoryByKey("site");
    expect(sitePlans?.plans.map((plan) => plan.priceCents)).toEqual([5_000, 10_000, 20_000]);
    expect(sitePlans?.plans[1]?.recommended).toBe(true);
    for (const plan of sitePlans?.plans ?? []) {
      expect(plan.copy.ro.features.join(" ")).toMatch(/Hosting.*mentenanță/i);
    }
  });
});
