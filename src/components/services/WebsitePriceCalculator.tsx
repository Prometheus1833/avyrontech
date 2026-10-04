import { useMemo, useState } from "react";
import { ArrowUpRight, Calculator, Check, ChevronDown, ChevronUp, Clock3, Mail, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type WebsiteDiscount,
  type WebsiteEstimatorSelection,
  type WebsitePageScope,
} from "@/data/websiteEstimator";

type Localized = { ro: string; en: string };
type Choice<T extends string> = { id: T; title: Localized; detail: Localized; distinction: Localized };

const PAGE_COPY: Choice<WebsitePageScope>[] = [
  { id: "compact", title: { ro: "Landing page", en: "Landing page" }, detail: { ro: "5–15 pagini", en: "5–15 pages" }, distinction: { ro: "Un traseu clar spre cerere, apel sau programare.", en: "One clear path to an enquiry, call or booking." } },
  { id: "business", title: { ro: "Business profile", en: "Business profile" }, detail: { ro: "15–30 pagini", en: "15–30 pages" }, distinction: { ro: "Servicii, echipă și dovezi organizate pentru vânzare.", en: "Services, team and proof organised to support sales." } },
  { id: "extended", title: { ro: "Structură extinsă", en: "Extended structure" }, detail: { ro: "Produse sau blog", en: "Products or blog" }, distinction: { ro: "Arhitectură scalabilă pentru catalog ori conținut editorial.", en: "Scalable architecture for a catalogue or editorial content." } },
];

const CONTENT_COPY: Choice<WebsiteContentScope>[] = [
  { id: "ready", title: { ro: "Materiale pregătite", en: "Content ready" }, detail: { ro: "Texte și imagini furnizate", en: "Copy and images supplied" }, distinction: { ro: "Le structurăm și le optimizăm pentru web.", en: "We structure and optimise them for the web." } },
  { id: "assisted", title: { ro: "Conținut asistat", en: "Assisted content" }, detail: { ro: "Rescriere și selecție vizuală", en: "Copy editing and visual selection" }, distinction: { ro: "Clarificăm mesajul și alegem imaginile potrivite.", en: "We sharpen the message and select fitting imagery." } },
  { id: "complete", title: { ro: "Conținut de la zero", en: "Content from scratch" }, detail: { ro: "Structură, texte și direcție", en: "Structure, copy and direction" }, distinction: { ro: "Construim povestea completă pornind de la brief.", en: "We build the complete story from your brief." } },
];

const ADDON_COPY: Array<{ id: WebsiteAddon; title: Localized; detail: Localized }> = [
  { id: "bilingual", title: { ro: "A doua limbă", en: "Second language" }, detail: { ro: "Structură și SEO bilingv", en: "Bilingual structure and SEO" } },
  { id: "booking", title: { ro: "Programări / rezervări", en: "Bookings" }, detail: { ro: "Flux conectat la calendar", en: "Calendar-connected flow" } },
  { id: "catalog", title: { ro: "Catalog de servicii", en: "Service catalogue" }, detail: { ro: "Categorii, filtre și cerere rapidă", en: "Categories, filters and quick enquiry" } },
  { id: "motion", title: { ro: "Experiență cinematică", en: "Cinematic experience" }, detail: { ro: "Animații avansate și 3D", en: "Advanced motion and 3D" } },
  { id: "integrations", title: { ro: "Integrări business", en: "Business integrations" }, detail: { ro: "CRM, newsletter sau automatizări", en: "CRM, newsletter or automations" } },
];

const DISCOUNT_COPY: Array<{ id: WebsiteDiscount; title: Localized; detail: Localized }> = [
  { id: "avyron-credit", title: { ro: "Logo Avyron în subsol", en: "Avyron credit in footer" }, detail: { ro: "Reducere 10%", en: "10% discount" } },
  { id: "nonprofit", title: { ro: "ONG / Asociație", en: "NGO / Association" }, detail: { ro: "Reducere 10%", en: "10% discount" } },
];

const PROFILE_COPY: Record<ReturnType<typeof calculateWebsiteEstimate>["profile"], { name: Localized; detail: Localized }> = {
  essential: { name: { ro: "Essential", en: "Essential" }, detail: { ro: "Prezență concentrată pe încredere și contact.", en: "A focused presence built for trust and contact." } },
  growth: { name: { ro: "Growth", en: "Growth" }, detail: { ro: "Pregătit pentru campanii, lead-uri și extindere.", en: "Ready for campaigns, leads and expansion." } },
  signature: { name: { ro: "Signature", en: "Signature" }, detail: { ro: "Experiență amplă, cu funcții și mișcare avansată.", en: "A richer experience with advanced features and motion." } },
};

const WHATSAPP = "https://wa.me/40734605055?text=";

export default function WebsitePriceCalculator() {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { currency } = useCurrency(ro ? "ro-RO" : "en-IE");
  const [selection, setSelection] = useState<WebsiteEstimatorSelection>(() => ({ ...DEFAULT_WEBSITE_ESTIMATOR_SELECTION, addons: [], discounts: [] }));
  const estimate = useMemo(() => calculateWebsiteEstimate(selection), [selection]);
  const profile = PROFILE_COPY[estimate.profile];
  const formatter = useMemo(() => new Intl.NumberFormat(ro ? "ro-RO" : "en-IE"), [ro]);
  const money = (amountRon: number) => currency === "RON" ? `${formatter.format(amountRon)} RON` : `${formatter.format(fixedWebsiteEur(amountRon))} €`;
  const baseMoney = currency === "RON" ? `${formatter.format(WEBSITE_BASE_PRICE_RON)} RON` : `${formatter.format(WEBSITE_BASE_PRICE_EUR)} €`;
  const priceDelta = (amountRon: number) => amountRon === 0 ? (ro ? "inclus" : "included") : `+${money(amountRon)}`;

  const toggleAddon = (addon: WebsiteAddon) => setSelection((current) => ({ ...current, addons: current.addons.includes(addon) ? current.addons.filter((item) => item !== addon) : [...current.addons, addon] }));
  const toggleDiscount = (discount: WebsiteDiscount) => setSelection((current) => {
    const discounts = current.discounts ?? [];
    return { ...current, discounts: discounts.includes(discount) ? discounts.filter((item) => item !== discount) : [...discounts, discount] };
  });
  const setEmailAccounts = (value: number) => setSelection((current) => ({ ...current, emailAccounts: Math.max(0, Math.min(4, value)) }));

  const selectedSummary = [
    PAGE_COPY.find((item) => item.id === selection.pages)?.title[lang],
    CONTENT_COPY.find((item) => item.id === selection.content)?.title[lang],
    ...selection.addons.map((addon) => ADDON_COPY.find((item) => item.id === addon)?.title[lang]),
    (selection.emailAccounts ?? 0) > 0 ? `${selection.emailAccounts} ${ro ? "adrese email" : "email accounts"}` : null,
    ...(selection.discounts ?? []).map((discount) => DISCOUNT_COPY.find((item) => item.id === discount)?.title[lang]),
  ].filter(Boolean).join(", ");
  const whatsappMessage = ro
    ? `Bună! Am configurat un Site Prezentare Profesional. Profil: ${profile.name.ro}. Estimare: ${formatter.format(estimate.lowRon)}–${formatter.format(estimate.highRon)} RON, ${estimate.daysMin}–${estimate.daysMax} zile lucrătoare. Selecție: ${selectedSummary}. Aș dori confirmarea ofertei.`
    : `Hi! I configured a Professional Presentation Website. Profile: ${profile.name.en}. Estimate: ${formatter.format(estimate.lowRon)}–${formatter.format(estimate.highRon)} RON, ${estimate.daysMin}–${estimate.daysMax} working days. Selection: ${selectedSummary}. I'd like the quote confirmed.`;
  const reset = () => setSelection({ ...DEFAULT_WEBSITE_ESTIMATOR_SELECTION, addons: [], discounts: [] });

  const optionClass = (active: boolean) => `rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "border-primary/60 bg-primary/10" : "border-border bg-background/40 hover:border-foreground/25"}`;

  return (
    <section id="calculator" data-testid="website-price-calculator" className="mt-16 scroll-mt-28">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{ro ? "Calculator de proiect" : "Project estimator"}</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{ro ? "Alege structura, funcțiile și avantajele" : "Choose the structure, features and benefits"}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{ro ? `Pornim de la ${baseMoney}. Totalul se actualizează imediat, fără pași inutili.` : `Starting at ${baseMoney}. The total updates immediately, without unnecessary steps.`}</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-primary/20 bg-card shadow-soft">
        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,.7fr)]">
          <div className="space-y-6 p-4 sm:p-6">
            <fieldset>
              <legend className="font-display text-sm font-bold">01 · {ro ? "Structura site-ului" : "Website structure"}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {PAGE_COPY.map((option) => {
                  const active = selection.pages === option.id;
                  return <Button key={option.id} type="button" variant="ghost" aria-pressed={active} onClick={() => setSelection((current) => ({ ...current, pages: option.id }))} className={`${optionClass(active)} h-auto whitespace-normal`}>
                    <span className="block w-full"><span className="flex items-start justify-between gap-2"><strong className="text-sm">{option.title[lang]}</strong><span className="font-mono text-[10px] text-primary">{priceDelta(WEBSITE_PAGE_OPTIONS[option.id].priceRon)}</span></span><span className="mt-1 block text-xs font-medium text-foreground/70">{option.detail[lang]}</span><span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{option.distinction[lang]}</span></span>
                  </Button>;
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-display text-sm font-bold">02 · {ro ? "Conținut" : "Content"}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {CONTENT_COPY.map((option) => {
                  const active = selection.content === option.id;
                  return <Button key={option.id} type="button" variant="ghost" aria-pressed={active} onClick={() => setSelection((current) => ({ ...current, content: option.id }))} className={`${optionClass(active)} h-auto whitespace-normal`}>
                    <span className="block w-full"><span className="flex items-start justify-between gap-2"><strong className="text-sm">{option.title[lang]}</strong><span className="font-mono text-[10px] text-primary">{priceDelta(WEBSITE_CONTENT_OPTIONS[option.id].priceRon)}</span></span><span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{option.distinction[lang]}</span></span>
                  </Button>;
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-display text-sm font-bold">03 · {ro ? "Funcții opționale" : "Optional features"}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {ADDON_COPY.map((option) => {
                  const active = selection.addons.includes(option.id);
                  return <Button key={option.id} type="button" variant="ghost" aria-pressed={active} onClick={() => toggleAddon(option.id)} className={`${optionClass(active)} h-auto justify-start whitespace-normal`}>
                    <span className={`grid size-5 shrink-0 place-items-center rounded border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{active && <Check className="size-3" aria-hidden />}</span>
                    <span className="min-w-0 flex-1"><span className="flex justify-between gap-2 text-sm font-semibold"><span>{option.title[lang]}</span><span className="font-mono text-[10px] text-primary">{priceDelta(WEBSITE_ADDON_OPTIONS[option.id].priceRon)}</span></span><span className="mt-0.5 block text-[11px] text-muted-foreground">{option.detail[lang]}</span></span>
                  </Button>;
                })}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3 sm:col-span-2">
                  <span className="flex items-center gap-2"><Mail className="size-4 text-primary" aria-hidden /><span><strong className="block text-sm">{ro ? "Email personalizat" : "Custom email"}</strong><span className="block text-[11px] text-muted-foreground">{ro ? "Până la 4 adrese · 50 RON fiecare" : "Up to 4 accounts · 50 RON each"}</span></span></span>
                  <span className="flex items-center gap-1"><Button type="button" size="icon" variant="outline" className="size-8" onClick={() => setEmailAccounts((selection.emailAccounts ?? 0) - 1)} disabled={(selection.emailAccounts ?? 0) === 0} aria-label={ro ? "Elimină o adresă" : "Remove an account"}><ChevronDown /></Button><output className="w-6 text-center font-bold tabular-nums">{selection.emailAccounts ?? 0}</output><Button type="button" size="icon" variant="outline" className="size-8" onClick={() => setEmailAccounts((selection.emailAccounts ?? 0) + 1)} disabled={(selection.emailAccounts ?? 0) === 4} aria-label={ro ? "Adaugă o adresă" : "Add an account"}><ChevronUp /></Button></span>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-display text-sm font-bold">04 · {ro ? "Reduceri eligibile" : "Eligible discounts"}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {DISCOUNT_COPY.map((option) => {
                  const active = (selection.discounts ?? []).includes(option.id);
                  return <Button key={option.id} type="button" variant="ghost" aria-pressed={active} onClick={() => toggleDiscount(option.id)} className={`${optionClass(active)} h-auto justify-start whitespace-normal`}><span className={`grid size-5 shrink-0 place-items-center rounded border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{active && <Check className="size-3" aria-hidden />}</span><span><strong className="block text-sm">{option.title[lang]}</strong><span className="block text-[11px] text-muted-foreground">{option.detail[lang]}</span></span></Button>;
                })}
              </div>
            </fieldset>
          </div>

          <aside className="border-t border-primary/15 bg-primary/[0.035] p-5 lg:border-l lg:border-t-0">
            <div className="lg:sticky lg:top-24">
              <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-primary"><Sparkles className="size-3" aria-hidden />{ro ? "Configurația ta" : "Your configuration"}</span><Button type="button" variant="outline" size="icon" className="size-8 rounded-full" onClick={reset} aria-label={ro ? "Resetează calculatorul" : "Reset estimator"}><RotateCcw /></Button></div>
              <p className="mt-5 text-xs uppercase tracking-[0.16em] text-muted-foreground">{ro ? "Profil recomandat" : "Recommended profile"}</p>
              <p className="mt-1 font-display text-2xl font-black">{profile.name[lang]}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{profile.detail[lang]}</p>
              <div aria-live="polite" className="mt-5 rounded-lg border border-primary/20 bg-background/60 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Calculator className="size-4 text-primary" aria-hidden />{ro ? "Buget orientativ" : "Indicative budget"}</div>
                {estimate.discountRon > 0 && <p className="mt-2 text-xs text-muted-foreground"><span className="line-through">{money(estimate.subtotalRon)}</span> · {ro ? "reducere" : "discount"} −{money(estimate.discountRon)}</p>}
                <p className="mt-1 font-display text-2xl font-black tabular-nums">{money(estimate.lowRon)} <span className="text-muted-foreground">–</span> {money(estimate.highRon)}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{ro ? "Estimare transparentă; oferta finală se confirmă după brief." : "Transparent estimate; the final quote is confirmed after the brief."}</p>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"><span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-4 text-primary" aria-hidden />{ro ? "Livrare" : "Delivery"}</span><strong className="text-sm">{estimate.daysMin}–{estimate.daysMax} {ro ? "zile" : "days"}</strong></div>
              <Button asChild className="mt-4 h-auto min-h-11 w-full whitespace-normal rounded-lg px-4 py-3">
                <a href={`${WHATSAPP}${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "website_estimator", profile: estimate.profile, estimate_ron: estimate.lowRon })}><MessageCircle aria-hidden />{ro ? "Trimite configurația" : "Send configuration"}<ArrowUpRight aria-hidden /></a>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
