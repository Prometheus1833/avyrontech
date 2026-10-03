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

describe("website pricing and estimator", () => {
  it("starts with RON and keeps a fixed rounded EUR counterpart", () => {
    const website = getService("premium-website");

    expect(DEFAULT_DISPLAY_CURRENCY).toBe("RON");
    expect(website.priceRon).toBe(890);
    expect(website.priceEur).toBe(170);
    expect(WEBSITE_BASE_PRICE_RON).toBe(890);
    expect(WEBSITE_BASE_PRICE_EUR).toBe(170);
    expect(fixedWebsiteEur(890)).toBe(170);
  });

  it("uses the 890 RON package as the minimum estimate", () => {
    expect(calculateWebsiteEstimate(DEFAULT_WEBSITE_ESTIMATOR_SELECTION)).toEqual({
      lowRon: 890,
      highRon: 990,
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

    expect(result.lowRon).toBe(4_740);
    expect(result.highRon).toBe(5_400);
    expect(result.daysMin).toBe(16);
    expect(result.daysMax).toBe(18);
    expect(result.profile).toBe("signature");
  });

  it("places the calculator immediately before the portfolio subsection", () => {
    const page = readFileSync(resolve(__dirname, "../pages/services/ServicePage.tsx"), "utf8");
    const calculator = page.indexOf("<WebsitePriceCalculator />");
    const portfolio = page.indexOf('id="portofoliu"');

    expect(calculator).toBeGreaterThan(-1);
    expect(portfolio).toBeGreaterThan(calculator);
  });
});
