import {
  Activity, ArrowRight, BarChart3, Clock, Database, MessageCircle, MessagesSquare,
  Newspaper, PencilRuler, RefreshCw, Sparkles, Timer, X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";
import { SPEC_LABELS, type SpecKey, type SubscriptionCategory, type SubscriptionPlan } from "@/data/subscriptionPlans";
import { useDualPrice } from "@/hooks/useDualPrice";
import { ANNUAL_DISCOUNT_PERCENT, addAnnualSubscriptionToCart, annualSubscriptionTotal } from "@/lib/subscriptionCheckout";

const SPEC_ICONS: Record<SpecKey, React.ComponentType<{ className?: string }>> = {
  response: Clock,
  backup: Database,
  hours: Timer,
  changes: PencilRuler,
  monitoring: Activity,
  reports: BarChart3,
  channel: MessagesSquare,
  articles: Newspaper,
  conversations: MessageCircle,
  updates: RefreshCw,
};

type Props = {
  plan: SubscriptionPlan;
  category: SubscriptionCategory;
  /** Poziția orizontală a cardului care a deschis panoul, în px. */
  caretX?: number;
  onClose: () => void;
  onSelect: (plan: SubscriptionPlan, category: SubscriptionCategory) => void;
};

/**
 * Mini-dashboard-ul care se deschide lângă abonamentul apăsat: specificații
 * măsurabile în stânga, detalii de colaborare în dreapta.
 */
const PlanMiniDash = ({ plan, category, caretX, onClose, onSelect }: Props) => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { primary, secondary, converted } = useDualPrice(ro ? "ro-RO" : "en-IE");
  const text = plan.copy[lang];
  const t = category.theme;
  const [added, setAdded] = useState(false);
  const annualTotal = annualSubscriptionTotal(plan.priceCents);

  return (
    <div
      data-testid={`plan-minidash-${plan.key}`}
      role="dialog"
      aria-label={`${category.copy[lang].title} — ${plan.name}`}
      className={`relative mt-4 overflow-hidden rounded-3xl border ${t.border} bg-background/80 p-5 shadow-[0_30px_90px_-45px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-6`}
      style={{ animation: "avyron-dash-in 380ms cubic-bezier(0.22,1,0.36,1) both" }}
    >
      {typeof caretX === "number" && (
        <span
          aria-hidden
          className={`absolute -top-px hidden h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-current to-transparent sm:block ${t.text}`}
          style={{ left: `${caretX}px` }}
        />
      )}
      <div aria-hidden className={`pointer-events-none absolute -right-16 -top-16 size-56 rounded-full blur-3xl ${t.glow}`} />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${t.text}`}>{text.level}</p>
          <h4 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">
            {category.copy[lang].title} · {plan.name}
          </h4>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/75">{text.summary}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-2xl font-extrabold leading-none">{primary(plan.priceCents)}</div>
            <div className="mt-1 text-[11px] text-foreground/70">
              {converted ? `${ro ? "facturat" : "billed"} ` : "≈ "}{secondary(plan.priceCents)} · {ro ? "pe lună" : "per month"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ro ? "Închide detaliile" : "Close details"}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-foreground/15 text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="relative mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/65">
            {ro ? "Specificații" : "Specifications"}
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {plan.specs.map((spec) => {
              const Icon = SPEC_ICONS[spec.key];
              return (
                <div
                  key={spec.key}
                  className="flex items-start gap-2.5 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2.5"
                >
                  <Icon className={`mt-0.5 size-4 shrink-0 ${t.text}`} aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-[10px] font-mono uppercase tracking-[0.16em] text-foreground/65">
                      {SPEC_LABELS[spec.key][lang]}
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold leading-snug">{ro ? spec.ro : spec.en}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/65">
            {ro ? "Ce înseamnă concret" : "What it means in practice"}
          </p>
          <ul className="mt-3 space-y-2">
            {text.includes.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/80">
                <span aria-hidden className={`mt-1.5 size-1.5 shrink-0 rounded-full bg-gradient-to-br ${t.from} ${t.to}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className={`mt-4 rounded-2xl border border-dashed ${t.border} bg-foreground/[0.02] p-3.5`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">
              {ro ? "Potrivit pentru" : "Best for"}
            </p>
            <p className="mt-1.5 text-sm text-foreground/80">{text.bestFor}</p>
          </div>

          <div className={`mt-4 rounded-2xl border ${t.border} bg-foreground/[0.035] p-3.5`}>
            <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${t.text}`}>{ro ? "Pachet anual avantajos" : "Better-value annual package"}</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div><p className="font-display text-xl font-extrabold">{primary(annualTotal)} / {ro ? "an" : "year"}</p><p className="text-xs text-foreground/70">{ro ? `Reducere ${ANNUAL_DISCOUNT_PERCENT}% față de 12 plăți lunare.` : `${ANNUAL_DISCOUNT_PERCENT}% less than 12 monthly payments.`}</p></div>
              {added ? <Link to="/profil?tab=cart" className={`text-sm font-semibold ${t.text}`}>{ro ? "Vezi coșul →" : "View cart →"}</Link> : <button type="button" onClick={() => setAdded(addAnnualSubscriptionToCart({ sku: plan.sku, name: `${category.copy.ro.title} · ${plan.name}`, monthlyPriceCents: plan.priceCents }))} className={`rounded-full border ${t.border} px-4 py-2 text-sm font-bold ${t.text} transition hover:bg-foreground/[0.06]`}>{ro ? "Adaugă anual în coș" : "Add annual plan to cart"}</button>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelect(plan, category)}
              className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${t.from} ${t.to} px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40`}
            >
              {ro ? `Alege ${plan.name}` : `Choose ${plan.name}`}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </button>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground/70">
              <Sparkles className="size-3.5" aria-hidden />
              {ro ? "Fără contract pe termen lung" : "No long-term contract"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanMiniDash;
