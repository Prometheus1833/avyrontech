import { describe, expect, it } from "vitest";
import { getAlternateForPath, ROUTE_ALTERNATES } from "@/i18n/routes";
import { HORECA_BUSINESSES, HORECA_GOALS } from "@/data/horecaConfigurator";

describe("HoReCa demonstration configurator", () => {
  it("publishes reciprocal Romanian and English routes", () => {
    expect(ROUTE_ALTERNATES).toContainEqual({ ro: "/configurator", en: "/en/configurator" });
    expect(getAlternateForPath("/configurator", "en")).toBe("/en/configurator");
    expect(getAlternateForPath("/en/configurator", "ro")).toBe("/configurator");
  });

  it("offers focused HoReCa choices instead of the generic agency quote flow", () => {
    expect(HORECA_BUSINESSES.map((item) => item.id)).toEqual([
      "restaurant",
      "bistro",
      "cafe",
      "bakery",
      "hotel",
    ]);
    expect(HORECA_GOALS.map((item) => item.id)).toEqual(["booking", "menu", "order", "events"]);
  });
});
