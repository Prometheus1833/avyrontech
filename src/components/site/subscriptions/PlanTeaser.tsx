import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Clock, Crown, Shield, Sparkles, Zap } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import Reveal from "@/components/site/Reveal";
import { useDualPrice } from "@/hooks/useDualPrice";
import { hasStoredCurrency } from "@/hooks/useCurrency";
import { usePointerGlow } from "@/hooks/usePointerGlow";
import { trackEvent } from "@/lib/analytics";
import { SUBSCRIPTION_PATH, type PlanTier, type SubscriptionCategory, type SubscriptionPlan } from "@/data/subscriptionPlans";

const TIER_ICONS: Record<PlanTier, React.ComponentType<{ className?: string }>> = {
  plus: Shield,
  pro: Zap,
  proactiv: Crown,
};

const WHATSAPP = "https://wa.me/40734605055?text=";

export type TeaserAccent = {
  from: string;
  to: string;
  text: string;
  border: string;
};

type CardProps = {
  plan: SubscriptionPlan;
  category: SubscriptionCategory;
  accent: TeaserAccent;
  anchor: string;
  productKey: string;
  price: string;
  secondaryPrice: string;
  converted: boolean;
};

const TeaserCard = ({ plan, category, accent, anchor, productKey, price, secondaryPrice, converted }: CardProps) => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const glowRef = usePointerGlow<HTMLDivElement>();
  const text = plan.copy[lang];
  const Icon = TIER_ICONS[plan.tier];
  const featured = plan.recommended;

  return (
    <div
      ref={glowRef}
      className={`group relative h-full overflow-hidden rounded-3xl border p-5 backdrop-blur transition-all duration-500 hover:-translate-y-1.5 ${
        featured
          ? `${accent.border} bg-gradient-to-b from-foreground/[0.10] to-foreground/[0.02] shadow-[0_30px_80px_-45px_rgba(0,0,0,0.6)] md:-my-4 md:scale-[1.04]`
          : "border-foreground/10 bg-foreground/[0.03] hover:border-foreground/25"
      }`}
      style={{ transform: "perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[var(--glow,0)] transition-opacity duration-300"
        style={{ background: `radial-gradient(240px circle at var(--px, 50%) var(--py, 0%), hsl(${category.theme.hue} / 0.16), transparent 72%)` }}
      />
      {featured && (
        <span className={`absolute -top-px left-1/2 -translate-x-1/2 rounded-b-full bg-gradient-to-r ${accent.from} ${accent.to} px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white`}>
          {ro ? "Cel mai potrivit" : "Best fit"}
        </span>
      )}
      <div className={`relative mt-3 grid size-10 place-items-center rounded-2xl bg-gradient-to-br ${accent.from} ${accent.to} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="size-5" aria-hidden />
      </div>
      <p className={`relative mt-4 font-mono text-[10px] uppercase tracking-[0.2em] ${accent.text}`}>{text.level}</p>
      <h3 className="relative mt-1 font-display text-xl font-extrabold">{plan.name}</h3>
      <div className="relative mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-extrabold tabular-nums">{price}</span>
        <span className="text-xs text-foreground/65">/{ro ? "lună" : "mo"}</span>
      </div>
      <p className="relative mt-0.5 text-[11px] text-foreground/65">
        {converted ? `${ro ? "facturat" : "billed"} ` : "≈ "}{secondaryPrice}
      </p>
      <p className="relative mt-3 text-[13px] leading-relaxed text-foreground/70">{text.bestFor}</p>
      <ul className="relative mt-4 space-y-2">
        {text.features.slice(0, category.key === "site" ? 6 : 4).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[13px] leading-snug text-foreground/85">
            <Check className={`mt-0.5 size-3.5 shrink-0 ${accent.text}`} aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to={anchor}
        onClick={() => trackEvent("subscription_teaser_click", { product: productKey, sku: plan.sku })}
        className={`relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${
          featured
            ? `bg-gradient-to-r ${accent.from} ${accent.to} text-white hover:-translate-y-0.5`
            : "border border-foreground/15 bg-foreground/[0.06] hover:bg-foreground/[0.12]"
        }`}
      >
        {ro ? `Alege ${plan.name}` : `Choose ${plan.name}`}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
};

type Props = {
  category: SubscriptionCategory;
  /** Culorile produsului pe care stă secțiunea. */
  accent: TeaserAccent;
  productName: string;
  productKey: string;
  hideAskButton?: boolean;
};

/**
 * Ultima subsecțiune de pe o pagină de produs: cele trei trepte de mentenanță
 * potrivite produsului, cu treapta din mijloc scoasă în față. Prețurile vin din
 * același catalog ca pagina dedicată, deci nu pot ieși din sincron.
 */
const PlanTeaser = ({ category, accent, productName, productKey, hideAskButton = false }: Props) => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { primary, secondary, converted, setCurrency } = useDualPrice(ro ? "ro-RO" : "en-IE");
  const path = ro ? SUBSCRIPTION_PATH.ro : SUBSCRIPTION_PATH.en;

  // Abonamentele se facturează în lei: vizitatorul care nu a ales încă o
  // monedă vede suma reală de pe factură, la fel ca pe pagina dedicată.
  useEffect(() => {
    if (!hasStoredCurrency()) setCurrency("RON");
  }, [setCurrency]);
  const anchor = `${path}#abonamente-${category.key}`;

  return (
    <section id="abonamente" className="mt-16 scroll-mt-28" aria-labelledby="plan-teaser-title">
      <Reveal className="text-center">
        <span className={`inline-flex items-center gap-2 rounded-full border ${accent.border} bg-foreground/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${accent.text}`}>
          <Sparkles className="size-3.5" aria-hidden />
          {ro ? "După livrare" : "After delivery"}
        </span>
        <h2 id="plan-teaser-title" className="mt-4 font-display text-2xl font-extrabold md:text-3xl">
          {ro ? "Continuăm lunar, împreună" : "We continue monthly, together"}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-foreground/70 md:text-base">
          {ro
            ? "Livrarea e doar începutul. Alege ritmul de mentenanță, actualizare și dezvoltare potrivit produsului tău — schimbi treapta oricând."
            : "Delivery is only the start. Choose the maintenance, update and development pace that fits your product — change tier at any time."}
        </p>
      </Reveal>

      <div className="mt-9 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:items-center md:overflow-visible md:pb-0">
        {category.plans.map((plan, index) => (
          <Reveal key={plan.key} delay={index * 70} as="article" className="h-full w-[78vw] max-w-[18rem] shrink-0 snap-center md:w-auto md:max-w-none">
            <TeaserCard
              plan={plan}
              category={category}
              accent={accent}
              anchor={anchor}
              productKey={productKey}
              price={primary(plan.priceCents)}
              secondaryPrice={secondary(plan.priceCents)}
              converted={converted}
            />
          </Reveal>
        ))}
      </div>

      <Reveal delay={140}>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={path}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background transition-all hover:-translate-y-0.5 hover:bg-foreground/90"
          >
            {ro ? "Vezi toate abonamentele" : "See all plans"}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          {!hideAskButton && (
            <a
              href={`${WHATSAPP}${encodeURIComponent(
                ro ? `Bună! Aș dori un abonament de mentenanță pentru ${productName}.` : `Hi! I'd like a maintenance plan for ${productName}.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "plan_teaser", product: productKey })}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:bg-foreground/[0.1]"
            >
              {ro ? "Întreabă un coleg" : "Ask a colleague"}
            </a>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground/65">
            <Clock className="size-3" aria-hidden />
            {ro ? "Fără contract pe termen lung · schimbi treapta oricând" : "No long-term contract · change tier any time"}
          </span>
        </div>
      </Reveal>
    </section>
  );
};

export default PlanTeaser;
