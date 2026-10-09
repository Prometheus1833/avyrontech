import { Check, Sparkles } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { PLANS, PROGRESSION } from "../data/plans";
import { store } from "../lib/store";
import { Pill, Reveal } from "./Primitives";

/**
 * Parteneriatele AVY. Prețurile sunt anuale, afișate în lei și euro, iar
 * limitele zilnice sunt puse una sub alta ca să se compare din prima privire.
 * Butonul adaugă în coș; plata continuă prin Revolut Pay sau Stripe, iar
 * factura se emite prin Oblio numai după confirmarea încasării.
 */
export default function Plans({ lang }: { lang: Lang }) {
  const ro = lang === "ro";
  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-3">
        {PLANS.map((plan, index) => (
          <Reveal key={plan.id} index={index}>
            <div
              className={`pa-edge relative flex h-full flex-col rounded-3xl border p-5 ${
                plan.recommended ? "border-brand/40 bg-gradient-to-b from-brand/12 to-brand-2/[0.04]" : "border-foreground/10 bg-card/45"
              }`}
              style={{ "--pa-hue": plan.id === "studio" ? 330 : plan.id === "pro" ? 265 : 150 } as never}
            >
              {plan.recommended && (
                <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand to-brand-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                  <Sparkles className="size-3" aria-hidden /> {ro ? "Recomandat" : "Recommended"}
                </span>
              )}
              <p className="font-display text-lg font-bold text-foreground">{plan.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{plan.tagline[lang]}</p>
              <div className="mt-4 flex items-end gap-2">
                {plan.priceRon === 0 ? (
                  <span className="font-display text-3xl font-bold text-foreground">{ro ? "0 lei" : "Free"}</span>
                ) : (
                  <>
                    <span className="font-display text-3xl font-bold tabular-nums text-foreground">{plan.priceRon} lei</span>
                    <span className="pb-1 text-sm text-muted-foreground">· {plan.priceEur} €</span>
                  </>
                )}
                {plan.priceRon > 0 && <span className="pb-1 text-xs text-muted-foreground">/{ro ? "an" : "yr"}</span>}
              </div>
              {plan.listRon && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  <s className="opacity-60">
                    {plan.listRon} lei · {plan.listEur} €
                  </s>{" "}
                  {ro ? "preț de listă" : "list price"}
                </p>
              )}

              <dl className="mt-4 grid gap-1.5 rounded-2xl border border-foreground/8 bg-foreground/[0.03] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{ro ? "Acces" : "Access"}</dt>
                  <dd className="font-medium text-foreground">{plan.access[lang]}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{ro ? "Componente / zi" : "Components / day"}</dt>
                  <dd className="pa-mono tabular-nums text-foreground">{plan.limits.components}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{ro ? "Secțiuni / zi" : "Sections / day"}</dt>
                  <dd className="pa-mono tabular-nums text-foreground">{plan.limits.sections}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{ro ? "Template-uri / zi" : "Templates / day"}</dt>
                  <dd className="pa-mono tabular-nums text-foreground">{plan.limits.templates}</dd>
                </div>
              </dl>

              <ul className="mt-3 grid flex-1 list-none gap-1.5 p-0 text-xs text-muted-foreground">
                {plan.perks[lang].map((perk) => (
                  <li key={perk} className="flex gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              {plan.id === "free" ? (
                <a
                  href="/auth"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-foreground/15 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand/40"
                  data-ripple
                >
                  {plan.cta[lang]}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => store.addToCart({ kind: "plan", plan: plan.id as "pro" | "studio" })}
                  className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    plan.recommended ? "bg-gradient-to-br from-brand to-brand-2 text-white shadow-[0_14px_40px_-18px_hsl(264_90%_60%)]" : "border border-foreground/15 text-foreground hover:border-brand/40"
                  }`}
                  data-ripple
                >
                  {plan.cta[lang]}
                </button>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal index={3} className="mt-4">
        <div className="pa-glass rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground">{ro ? "Intră acum și păstrezi prețul de azi" : "Join now and keep today's price"}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {ro
              ? `Prețul rămâne al tău cât timp parteneriatul e activ, în timp ce adăugăm produse noi. Produsele apărute după ce te-ai abonat intră singure în planul tău: imediat în Studio, după ${PROGRESSION.proAfterDays} de zile în Pro, iar cele de bază devin gratuite după un an.`
              : `Your price stays yours while the partnership is active, as we keep adding products. New products enter your plan on their own: instantly in Studio, after ${PROGRESSION.proAfterDays} days in Pro, and foundation products become free after a year.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone="free">{ro ? "Gratuit: fără card" : "Free: no card"}</Pill>
            <Pill tone="price">{ro ? "Separat: 30–150 lei / produs" : "Separately: 30–150 lei / product"}</Pill>
            <Pill tone="neutral">{ro ? "Licență comercială inclusă" : "Commercial licence included"}</Pill>
            <Pill tone="neutral">{ro ? "Facturi și e-Factura" : "Invoices and e-Invoice"}</Pill>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
