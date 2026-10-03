import { useMemo, useState } from "react";
import { ArrowUpRight, Calculator, Check, Clock3, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { trackEvent } from "@/lib/analytics";
import {
  DEFAULT_WEBSITE_ESTIMATOR_SELECTION,
  WEBSITE_ADDON_OPTIONS,
  WEBSITE_BASE_PRICE_EUR,
  WEBSITE_BASE_PRICE_RON,
  WEBSITE_CONTENT_OPTIONS,
  WEBSITE_PAGE_OPTIONS,
  calculateWebsiteEstimate,
  fixedWebsiteEur,
  type WebsiteAddon,
  type WebsiteContentScope,
  type WebsiteEstimatorSelection,
  type WebsitePageScope,
} from "@/data/websiteEstimator";

type Localized = { ro: string; en: string };

const PAGE_COPY: Array<{ id: WebsitePageScope; title: Localized; detail: Localized }> = [
  {
    id: "compact",
    title: { ro: "Prezență esențială", en: "Essential presence" },
    detail: { ro: "1–3 pagini clare", en: "1–3 focused pages" },
  },
  {
    id: "business",
    title: { ro: "Site de business", en: "Business website" },
    detail: { ro: "4–6 pagini și servicii", en: "4–6 pages and services" },
  },
  {
    id: "extended",
    title: { ro: "Structură extinsă", en: "Extended structure" },
    detail: { ro: "7–10 pagini și secțiuni", en: "7–10 pages and sections" },
  },
];

const CONTENT_COPY: Array<{ id: WebsiteContentScope; title: Localized; detail: Localized }> = [
  {
    id: "ready",
    title: { ro: "Materiale pregătite", en: "Content ready" },
    detail: { ro: "Texte și imagini furnizate", en: "Copy and images supplied" },
  },
  {
    id: "assisted",
    title: { ro: "Conținut asistat", en: "Assisted content" },
    detail: { ro: "Rescriere și selecție vizuală", en: "Copy editing and visual selection" },
  },
  {
    id: "complete",
    title: { ro: "Conținut de la zero", en: "Content from scratch" },
    detail: { ro: "Structură, texte și direcție vizuală", en: "Structure, copy and visual direction" },
  },
];

const ADDON_COPY: Array<{ id: WebsiteAddon; title: Localized; detail: Localized }> = [
  {
    id: "bilingual",
    title: { ro: "A doua limbă", en: "Second language" },
    detail: { ro: "Structură și SEO bilingv", en: "Bilingual structure and SEO" },
  },
  {
    id: "booking",
    title: { ro: "Programări / rezervări", en: "Bookings" },
    detail: { ro: "Flux conectat la calendar", en: "Calendar-connected flow" },
  },
  {
    id: "catalog",
    title: { ro: "Catalog de servicii", en: "Service catalogue" },
    detail: { ro: "Categorii, filtre și cerere rapidă", en: "Categories, filters and quick enquiry" },
  },
  {
    id: "motion",
    title: { ro: "Experiență cinematică", en: "Cinematic experience" },
    detail: { ro: "Animații avansate și 3D", en: "Advanced motion and 3D" },
  },
  {
    id: "integrations",
    title: { ro: "Integrări business", en: "Business integrations" },
    detail: { ro: "CRM, newsletter sau automatizări", en: "CRM, newsletter or automations" },
  },
];

const PROFILE_COPY: Record<ReturnType<typeof calculateWebsiteEstimate>["profile"], { name: Localized; detail: Localized }> = {
  essential: {
    name: { ro: "Essential", en: "Essential" },
    detail: { ro: "O lansare rapidă, concentrată pe încredere și contact.", en: "A fast launch focused on trust and contact." },
  },
  growth: {
    name: { ro: "Growth", en: "Growth" },
    detail: { ro: "Structură pregătită pentru campanii, lead-uri și extindere.", en: "A structure ready for campaigns, leads and growth." },
  },
  signature: {
    name: { ro: "Signature", en: "Signature" },
    detail: { ro: "Experiență de brand amplă, cu funcții și mișcare avansată.", en: "A richer brand experience with advanced features and motion." },
  },
};

const WHATSAPP = "https://wa.me/40734605055?text=";

export default function WebsitePriceCalculator() {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { currency } = useCurrency(ro ? "ro-RO" : "en-IE");
  const [selection, setSelection] = useState<WebsiteEstimatorSelection>(() => ({
    ...DEFAULT_WEBSITE_ESTIMATOR_SELECTION,
    addons: [],
  }));
  const estimate = useMemo(() => calculateWebsiteEstimate(selection), [selection]);
  const profile = PROFILE_COPY[estimate.profile];
  const formatter = useMemo(() => new Intl.NumberFormat(ro ? "ro-RO" : "en-IE"), [ro]);

  const money = (amountRon: number) => currency === "RON"
    ? `${formatter.format(amountRon)} RON`
    : `${formatter.format(fixedWebsiteEur(amountRon))} €`;
  const baseMoney = currency === "RON"
    ? `${formatter.format(WEBSITE_BASE_PRICE_RON)} RON`
    : `${formatter.format(WEBSITE_BASE_PRICE_EUR)} €`;
  const priceDelta = (amountRon: number) => amountRon === 0
    ? (ro ? "inclus" : "included")
    : `+${money(amountRon)}`;

  const toggleAddon = (addon: WebsiteAddon) => {
    setSelection((current) => ({
      ...current,
      addons: current.addons.includes(addon)
        ? current.addons.filter((item) => item !== addon)
        : [...current.addons, addon],
    }));
  };

  const selectedSummary = [
    PAGE_COPY.find((item) => item.id === selection.pages)?.title[lang],
    CONTENT_COPY.find((item) => item.id === selection.content)?.title[lang],
    ...selection.addons.map((addon) => ADDON_COPY.find((item) => item.id === addon)?.title[lang]),
  ].filter(Boolean).join(", ");
  const whatsappMessage = ro
    ? `Bună! Am configurat un Site Prezentare Profesional. Profil recomandat: ${profile.name.ro}. Estimare: ${formatter.format(estimate.lowRon)}–${formatter.format(estimate.highRon)} RON, aproximativ ${estimate.daysMin}–${estimate.daysMax} zile lucrătoare. Selecție: ${selectedSummary}. Aș dori să verificăm oferta.`
    : `Hi! I configured a Professional Presentation Website. Recommended profile: ${profile.name.en}. Estimate: ${formatter.format(estimate.lowRon)}–${formatter.format(estimate.highRon)} RON, approximately ${estimate.daysMin}–${estimate.daysMax} working days. Selection: ${selectedSummary}. I'd like to review the quote.`;

  const reset = () => setSelection({ ...DEFAULT_WEBSITE_ESTIMATOR_SELECTION, addons: [] });

  return (
    <section id="calculator" data-testid="website-price-calculator" className="mt-16 scroll-mt-28">
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
          {ro ? "Calculator inteligent" : "Smart estimator"}
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {ro ? "Configurează site-ul potrivit afacerii tale" : "Configure the right website for your business"}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {ro
            ? `Pachetul pornește de la ${baseMoney}. Alege doar ce îți este util și vezi instant un interval realist de buget și livrare.`
            : `The package starts at ${baseMoney}. Choose only what is useful and instantly see a realistic budget and delivery range.`}
        </p>
      </div>

      <div className="relative mt-7 overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.08] via-card to-blue-600/[0.06] shadow-[0_28px_90px_-52px_rgba(34,211,238,0.65)]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
          <div className="space-y-8 p-5 sm:p-7 lg:p-8">
            <fieldset>
              <legend className="flex w-full items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-cyan-500 text-[11px] font-black text-white">01</span>
                <span className="font-display text-base font-bold">{ro ? "Cât conținut trebuie organizat?" : "How much content needs structuring?"}</span>
              </legend>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {PAGE_COPY.map((option) => {
                  const active = selection.pages === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelection((current) => ({ ...current, pages: option.id }))}
                      className={`rounded-2xl border p-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${active ? "border-cyan-400/70 bg-cyan-400/12 shadow-[0_0_28px_rgba(34,211,238,0.08)]" : "border-foreground/10 bg-background/35 hover:border-foreground/25 hover:bg-foreground/[0.04]"}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold leading-tight">{option.title[lang]}</span>
                        <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${active ? "border-cyan-400 bg-cyan-400 text-slate-950" : "border-foreground/20"}`}>
                          {active && <Check className="size-3" aria-hidden />}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-xs leading-snug text-muted-foreground">{option.detail[lang]}</span>
                      <span className="mt-3 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
                        {priceDelta(WEBSITE_PAGE_OPTIONS[option.id].priceRon)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="flex w-full items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-blue-600 text-[11px] font-black text-white">02</span>
                <span className="font-display text-base font-bold">{ro ? "În ce stare este conținutul?" : "What state is your content in?"}</span>
              </legend>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {CONTENT_COPY.map((option) => {
                  const active = selection.content === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelection((current) => ({ ...current, content: option.id }))}
                      className={`rounded-2xl border p-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${active ? "border-blue-400/70 bg-blue-400/10" : "border-foreground/10 bg-background/35 hover:border-foreground/25 hover:bg-foreground/[0.04]"}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold leading-tight">{option.title[lang]}</span>
                        <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${active ? "border-blue-400 bg-blue-500 text-white" : "border-foreground/20"}`}>
                          {active && <Check className="size-3" aria-hidden />}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-xs leading-snug text-muted-foreground">{option.detail[lang]}</span>
                      <span className="mt-3 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-300">
                        {priceDelta(WEBSITE_CONTENT_OPTIONS[option.id].priceRon)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="flex w-full items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-violet-600 text-[11px] font-black text-white">03</span>
                <span className="font-display text-base font-bold">{ro ? "Ce ar face site-ul mai valoros?" : "What would make the website more valuable?"}</span>
              </legend>
              <p className="mt-2 text-xs text-muted-foreground">{ro ? "Poți alege mai multe. Nu bifăm automat funcții de care nu ai nevoie." : "Choose several if needed. We do not add features you have not asked for."}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {ADDON_COPY.map((option) => {
                  const active = selection.addons.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleAddon(option.id)}
                      className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${active ? "border-violet-400/60 bg-violet-400/10" : "border-foreground/10 bg-background/35 hover:border-foreground/25 hover:bg-foreground/[0.04]"}`}
                    >
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${active ? "border-violet-400 bg-violet-500 text-white" : "border-foreground/20"}`}>
                        {active && <Check className="size-3" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-semibold leading-tight">{option.title[lang]}</span>
                          <span className="shrink-0 font-mono text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                            {priceDelta(WEBSITE_ADDON_OPTIONS[option.id].priceRon)}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-snug text-muted-foreground">{option.detail[lang]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <aside className="border-t border-cyan-400/15 bg-slate-950/[0.035] p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
            <div className="lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                  <Sparkles className="size-3" aria-hidden />
                  {ro ? "Recomandare AVYRON" : "AVYRON recommendation"}
                </span>
                <button type="button" onClick={reset} className="grid size-8 place-items-center rounded-full border border-foreground/10 text-muted-foreground transition hover:border-foreground/25 hover:text-foreground" aria-label={ro ? "Resetează calculatorul" : "Reset estimator"}>
                  <RotateCcw className="size-3.5" aria-hidden />
                </button>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{ro ? "Profil potrivit" : "Best-fit profile"}</p>
                <p className="mt-1 font-display text-3xl font-black tracking-tight">{profile.name[lang]}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{profile.detail[lang]}</p>
              </div>

              <div aria-live="polite" className="mt-6 rounded-2xl border border-cyan-400/20 bg-background/55 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  <Calculator className="size-4 text-cyan-500" aria-hidden />
                  {ro ? "Buget orientativ" : "Indicative budget"}
                </div>
                <p className="mt-2 font-display text-2xl font-black tabular-nums sm:text-3xl">
                  {money(estimate.lowRon)} <span className="text-muted-foreground">–</span> {money(estimate.highRon)}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {currency === "RON"
                    ? (ro ? "RON este prețul comercial principal." : "RON is the primary commercial price.")
                    : (ro ? "Echivalent EUR fix și rotunjit; oferta se confirmă în RON." : "Fixed, rounded EUR equivalent; the quote is confirmed in RON.")}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-foreground/10 bg-background/40 p-4">
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="size-4 text-blue-500" aria-hidden />
                  {ro ? "Livrare estimată" : "Estimated delivery"}
                </span>
                <strong className="text-sm">{estimate.daysMin}–{estimate.daysMax} {ro ? "zile" : "days"}</strong>
              </div>

              <a
                href={`${WHATSAPP}${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "website_estimator", profile: estimate.profile, estimate_ron: estimate.lowRon })}
                className="group mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-center text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <MessageCircle className="size-4" aria-hidden />
                {ro ? "Trimite configurația" : "Send configuration"}
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </a>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                {ro ? "Primești confirmarea umană a structurii, bugetului și termenului înainte de orice plată." : "You receive human confirmation of scope, budget and timing before any payment."}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
