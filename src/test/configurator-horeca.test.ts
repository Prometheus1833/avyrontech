import { describe, expect, it } from "vitest";
import { getAlternateForPath, ROUTE_ALTERNATES } from "@/i18n/routes";
import {
  AVYRON_SERVICE_OPTIONS,
  DOMAIN_PREFERENCES,
  HORECA_BUSINESSES,
  HORECA_GOALS,
  WEBSITE_FEATURE_OPTIONS,
} from "@/data/horecaConfigurator";

describe("AVYRON business website configurator", () => {
  it("publishes reciprocal Romanian and English routes", () => {
    expect(ROUTE_ALTERNATES).toContainEqual({ ro: "/configurator", en: "/en/configurator" });
    expect(getAlternateForPath("/configurator", "en")).toBe("/en/configurator");
    expect(getAlternateForPath("/en/configurator", "ro")).toBe("/configurator");
  });

  it("offers multiple activities, services, features and domain directions", () => {
    expect(HORECA_BUSINESSES.length).toBeGreaterThanOrEqual(12);
    expect(HORECA_BUSINESSES.map((item) => item.id)).toEqual(expect.arrayContaining([
      "restaurant", "clinic", "beauty", "professional", "construction", "real-estate", "education", "fitness", "retail",
    ]));
    expect(HORECA_GOALS.map((item) => item.id)).toEqual(["booking", "menu", "order", "events"]);
    expect(AVYRON_SERVICE_OPTIONS.map((item) => item.id)).toEqual(expect.arrayContaining(["presentation", "store", "application", "automation", "maintenance"]));
    expect(WEBSITE_FEATURE_OPTIONS.map((item) => item.id)).toEqual(expect.arrayContaining(["contact", "booking", "multilingual", "seo", "client-area"]));
    expect(DOMAIN_PREFERENCES.map((item) => item.id)).toEqual(expect.arrayContaining(["ro", "com", "eu", "tech", "shop"]));
  });
});
