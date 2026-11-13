import { Suspense, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import type { SubscriptionCategory, SubscriptionPlan } from "@/data/subscriptionPlans";
import type { useDualPrice } from "@/hooks/useDualPrice";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { annualSubscriptionTotal } from "@/lib/subscriptionCheckout";
import PlanCard from "./PlanCard";

const PlanMiniDash = lazyWithRetry(() => import("./PlanMiniDash"));

type Props = {
  category: SubscriptionCategory;
  prices: Pick<ReturnType<typeof useDualPrice>, "primary" | "secondary" | "converted">;
  onSelect: (plan: SubscriptionPlan, category: SubscriptionCategory) => void;
};

export default function PlanCarousel({ category, prices, onSelect }: Props) {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { primary, secondary, converted } = prices;
  const [openPlan, setOpenPlan] = useState<SubscriptionPlan | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = `plan-details-${category.key}`;

  const showDetails = (plan: SubscriptionPlan, element: HTMLElement) => {
    if (openPlan?.key === plan.key) {
      setOpenPlan(null);
      return;
    }
    trigger.current = element;
    setOpenPlan(plan);
    // The panel itself renders immediately, even before the details chunk arrives.
    requestAnimationFrame(() => panel.current?.focus());
  };

  const closeDetails = () => {
    setOpenPlan(null);
    trigger.current?.focus();
  };

  return (
    <div>
      <ul
        role="list"
        data-testid={`plan-carousel-${category.key}`}
        aria-label={category.copy[lang].title}
        className="grid auto-cols-[min(84%,21rem)] grid-flow-col snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 py-2 lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible"
      >
        {category.plans.map(plan => (
          <li key={plan.key} className="min-w-0 snap-start">
            <PlanCard
              plan={plan}
              category={category}
              active={openPlan?.key === plan.key}
              detailsId={panelId}
              price={primary(plan.priceCents)}
              annualPrice={primary(annualSubscriptionTotal(plan.priceCents))}
              secondaryPrice={secondary(plan.priceCents)}
              converted={converted}
              onOpen={showDetails}
            />
          </li>
        ))}
      </ul>
      {category.servicePath && (
        <Link
          to={category.servicePath[lang]}
          className="mx-auto mt-3 flex min-h-10 w-fit items-center gap-2 rounded-full border border-foreground/15 px-4 text-xs font-semibold text-foreground/75 hover:bg-foreground/[0.06] hover:text-foreground"
        >
          {ro ? "Vezi serviciul" : "Explore the service"}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      )}
      {openPlan && (
        <div
          ref={panel}
          id={panelId}
          tabIndex={-1}
          role="region"
          aria-label={`${category.copy[lang].title} — ${openPlan.name}`}
          className="scroll-mt-32 rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/55"
          onKeyDown={event => { if (event.key === "Escape") closeDetails(); }}
        >
          <Suspense fallback={<p role="status" className="mt-4 p-4 text-sm">{ro ? "Se încarcă detaliile…" : "Loading plan details…"}</p>}>
            <PlanMiniDash key={openPlan.sku} plan={openPlan} category={category} onClose={closeDetails} onSelect={onSelect} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
