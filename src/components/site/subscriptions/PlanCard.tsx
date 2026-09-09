import { Check, ChevronDown, Crown, Shield, Sparkle, Zap } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { usePointerGlow } from "@/hooks/usePointerGlow";
import type { PlanTier, SubscriptionCategory, SubscriptionPlan } from "@/data/subscriptionPlans";

const TIER_ICONS: Record<PlanTier, React.ComponentType<{ className?: string }>> = {
  plus: Shield,
  pro: Zap,
  proactiv: Crown,
};

type Props = {
  plan: SubscriptionPlan;
  category: SubscriptionCategory;
  active: boolean;
  /** Copiile din bandă nu intră în ordinea de tabulare. */
  duplicate?: boolean;
  price: string;
  secondaryPrice: string;
  converted: boolean;
  onOpen: (plan: SubscriptionPlan, element: HTMLElement) => void;
};

/**
 * Cardul unui abonament din carusel: urmărește cursorul cu o lumină discretă și
 * se înclină foarte puțin, ca să pară un obiect fizic, nu o casetă.
 */
const PlanCard = ({ plan, category, active, duplicate, price, secondaryPrice, converted, onOpen }: Props) => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const glowRef = usePointerGlow<HTMLDivElement>();
  const text = plan.copy[lang];
  const theme = category.theme;
  const Icon = TIER_ICONS[plan.tier];

  return (
    <button
      type="button"
      tabIndex={duplicate ? -1 : undefined}
      onClick={(event) => onOpen(plan, event.currentTarget)}
      aria-expanded={active}
      aria-label={`${plan.name} — ${ro ? "vezi detalii și specificații" : "see details and specifications"}`}
      className={`group block h-full w-full select-none text-left transition-transform duration-500 focus-visible:outline-none ${
        active ? "-translate-y-1.5" : "hover:-translate-y-1.5"
      }`}
    >
      <div
        ref={glowRef}
        className={`relative h-full overflow-hidden rounded-3xl border p-5 backdrop-blur transition-[border-color,box-shadow,transform] duration-500 group-focus-visible:ring-2 group-focus-visible:ring-foreground/50 ${
          plan.recommended
            ? `${theme.border} bg-gradient-to-b from-foreground/[0.10] to-foreground/[0.02] shadow-[0_30px_70px_-45px_rgba(0,0,0,0.65)]`
            : "border-foreground/10 bg-foreground/[0.03] hover:border-foreground/25"
        } ${active ? `ring-2 ${theme.ring}` : ""}`}
        style={{
          transform: "perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          transformStyle: "preserve-3d",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[var(--glow,0)] transition-opacity duration-300"
          style={{
            background: `radial-gradient(240px circle at var(--px, 50%) var(--py, 0%), hsl(${theme.hue} / 0.18), transparent 72%)`,
          }}
        />

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
          <span className="font-display text-3xl font-extrabold tabular-nums">{price}</span>
          <span className="text-xs text-foreground/50">/{ro ? "lună" : "mo"}</span>
        </div>
        <p className="relative mt-1 text-[11px] text-foreground/50">
          {converted ? `${ro ? "facturat" : "billed"} ` : "≈ "}{secondaryPrice} {ro ? "pe lună" : "per month"}
        </p>

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
          <span className="inline-flex items-center gap-1 text-[11px] text-foreground/45">
            <Sparkle className="size-3" aria-hidden />
            {ro ? "lunar" : "monthly"}
          </span>
        </div>
      </div>
    </button>
  );
};

export default PlanCard;
