import { Check, ChevronDown, Crown, Shield, Sparkle, Zap } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import type { PlanTier, SubscriptionCategory, SubscriptionPlan } from "@/data/subscriptionPlans";
import { ANNUAL_DISCOUNT_PERCENT } from "@/lib/subscriptionCheckout";

const TIER_ICONS: Record<PlanTier, React.ComponentType<{ className?: string }>> = {
  plus: Shield,
  pro: Zap,
  proactiv: Crown,
};

type Props = {
  plan: SubscriptionPlan;
  category: SubscriptionCategory;
  active: boolean;
  detailsId: string;
  price: string;
  annualPrice: string;
  secondaryPrice: string;
  converted: boolean;
  onOpen: (plan: SubscriptionPlan, element: HTMLElement) => void;
};

const PlanCard = ({ plan, category, active, detailsId, price, annualPrice, secondaryPrice, converted, onOpen }: Props) => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const text = plan.copy[lang];
  const theme = category.theme;
  const Icon = TIER_ICONS[plan.tier];

  return (
    <button
      type="button"
      onClick={(event) => onOpen(plan, event.currentTarget)}
      aria-expanded={active}
      aria-controls={active ? detailsId : undefined}
      aria-label={`${plan.name} — ${ro ? "vezi detalii și specificații" : "see details and specifications"}`}
      className="group block h-full w-full text-left focus-visible:outline-none"
    >
      <div
        className={`relative h-full overflow-hidden rounded-3xl border p-5 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-foreground/50 ${
          plan.recommended
            ? `${theme.border} bg-gradient-to-b from-foreground/[0.10] to-foreground/[0.02] shadow-[0_30px_70px_-45px_rgba(0,0,0,0.65)]`
            : "border-foreground/10 bg-foreground/[0.03] hover:border-foreground/25"
        } ${active ? `ring-2 ${theme.ring}` : ""}`}
      >
        <div className="relative flex items-start justify-between gap-3">
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${theme.from} ${theme.to} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon className="size-5" aria-hidden />
          </div>
          {plan.recommended && (
            <span className={`rounded-full border ${theme.border} bg-foreground/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${theme.text}`}>
              {text.tagline}
            </span>
          )}
        </div>

        <p className={`relative mt-4 font-mono text-[10px] uppercase tracking-[0.2em] ${theme.text}`}>{text.level}</p>
        <h3 className="relative mt-1 font-display text-2xl font-extrabold">{plan.name}</h3>

        <div className="relative mt-3 flex items-baseline gap-2">
          <span className="font-display text-3xl font-extrabold tabular-nums">{plan.startingAt ? (ro ? "de la " : "from ") : ""}{price}</span>
          <span className="text-xs text-foreground/65">/{ro ? "lună" : "mo"}</span>
        </div>
        <p className="relative mt-1 text-[11px] text-foreground/65">
          {converted ? `${ro ? "facturat" : "billed"} ` : "≈ "}{secondaryPrice} {ro ? "pe lună" : "per month"}
        </p>
        {!category.inquiryOnly && <p className={`relative mt-2 text-xs font-semibold ${theme.text}`}>
          {ro ? `Anual: ${annualPrice} · economisești ${ANNUAL_DISCOUNT_PERCENT}%` : `Annual: ${annualPrice} · save ${ANNUAL_DISCOUNT_PERCENT}%`}
        </p>}

        <p className="relative mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/70">{text.summary}</p>

        <ul className="relative mt-4 space-y-2">
          {text.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[13px] leading-snug text-foreground/85">
              <Check className={`mt-0.5 size-3.5 shrink-0 ${theme.text}`} aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-foreground/10 pt-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${theme.text}`}>
            {active ? (ro ? "Ascunde detaliile" : "Hide details") : (ro ? "Detalii și specificații" : "Details and specs")}
            <ChevronDown className={`size-3.5 transition-transform duration-300 ${active ? "rotate-180" : ""}`} aria-hidden />
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-foreground/65">
            <Sparkle className="size-3" aria-hidden />
            {ro ? "lunar" : "monthly"}
          </span>
        </div>
      </div>
    </button>
  );
};

export default PlanCard;
