import { describe, expect, it } from "vitest";
import { PLANS } from "@/features/produse/data/plans";
import { mergeLivePlans } from "@/features/produse/lib/useLivePlans";

describe("sincronizarea parteneriatelor cu D1", () => {
  it("folosește prețul și limitele din catalogul Worker-ului fără să modifice datele statice", () => {
    const source = PLANS.find(plan => plan.id === "pro")!;
    const merged = mergeLivePlans(PLANS, [{
      id: "pro", name: "AVY Pro actualizat", price_ron_cents: 32000, price_eur_cents: 6200,
      components_per_day: 12, sections_per_day: 6, templates_per_day: 4,
    }]);
    const pro = merged.find(plan => plan.id === "pro")!;
    expect(pro.name).toBe("AVY Pro actualizat");
    expect(pro.priceRon).toBe(320);
    expect(pro.priceEur).toBe(62);
    expect(pro.limits).toEqual({ components: 12, sections: 6, templates: 4 });
    expect(source.priceRon).toBe(270);
    expect(merged.find(plan => plan.id === "studio")).toBe(PLANS.find(plan => plan.id === "studio"));
  });

  it("ignoră prețurile invalide și nu afișează un preț de listă sub cel curent", () => {
    const invalid = mergeLivePlans(PLANS, [{
      id: "pro", name: "Invalid", price_ron_cents: -1, price_eur_cents: 5000,
      components_per_day: 1, sections_per_day: 1, templates_per_day: 1,
    }]);
    expect(invalid.find(plan => plan.id === "pro")).toBe(PLANS.find(plan => plan.id === "pro"));
    const raised = mergeLivePlans(PLANS, [{
      id: "pro", name: "AVY Pro", price_ron_cents: 40000, price_eur_cents: 8000,
      components_per_day: 10, sections_per_day: 5, templates_per_day: 3,
    }]);
    expect(raised.find(plan => plan.id === "pro")?.listRon).toBeUndefined();
    expect(raised.find(plan => plan.id === "pro")?.listEur).toBeUndefined();
  });
});
