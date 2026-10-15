import { useEffect, useState } from "react";
import { PLANS, type Plan, type PlanId } from "../data/plans";

export type LivePlan = {
  id: PlanId; name: string; price_ron_cents: number; price_eur_cents: number;
  components_per_day: number; sections_per_day: number; templates_per_day: number;
};

export function mergeLivePlans(source: Plan[], livePlans: LivePlan[]): Plan[] {
  const current = new Map(livePlans.map(plan => [plan.id, plan]));
  return source.map(plan => {
    const live = current.get(plan.id);
    if (!live || !Number.isSafeInteger(live.price_ron_cents) || live.price_ron_cents < 0 || !Number.isSafeInteger(live.price_eur_cents) || live.price_eur_cents < 0) return plan;
    return {
      ...plan,
      name: live.name,
      priceRon: live.price_ron_cents / 100,
      priceEur: live.price_eur_cents / 100,
      listRon: plan.listRon && plan.listRon > live.price_ron_cents / 100 ? plan.listRon : undefined,
      listEur: plan.listEur && plan.listEur > live.price_eur_cents / 100 ? plan.listEur : undefined,
      limits: { components: live.components_per_day, sections: live.sections_per_day, templates: live.templates_per_day },
    };
  });
}

export function useLivePlans(): Plan[] {
  const [plans, setPlans] = useState(PLANS);
  useEffect(() => {
    if (typeof fetch !== "function") return;
    const controller = new AbortController();
    void fetch("/api/produse/public/plans", { signal: controller.signal, cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<{ data: LivePlan[] }> : null)
      .then(result => {
        if (!result || controller.signal.aborted) return;
        if (Array.isArray(result.data)) setPlans(mergeLivePlans(PLANS, result.data));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return plans;
}
