import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Languages,
  MapPin,
  Menu,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import PageBackLink from "@/components/site/PageBackLink";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Footer from "@/components/site/Footer";
import restaurantImage from "@/assets/work-restaurant-new.jpg";
import { cn } from "@/lib/utils";
import {
  HORECA_BUSINESSES,
  HORECA_GOALS,
  HORECA_MODULES,
  HORECA_STYLES,
  type Localized,
} from "@/data/horecaConfigurator";

type L = Localized;
type LangKey = keyof L;

const PAGE_COPY = {
  ro: {
    eyebrow: "Concept digital HoReCa",
    title: "Dintr-un local bun, într-o experiență care începe online.",
    description:
      "Acesta este un concept demonstrativ AVYRON, creat pentru a arăta cum poate deveni o afacere HoReCa o experiență digitală clară, premium și ușor de folosit.",
    helper: "Alege trei repere. Preview-ul se adaptează instant, fără să trimită date și fără să plaseze o comandă reală.",
    business: "1. Ce tip de afacere ai?",
    objective: "2. Care este obiectivul principal?",
    atmosphere: "3. Ce atmosferă te reprezintă?",
    modules: "Module utile incluse în concept",
    preview: "Preview live",
    demo: "Brand demonstrativ",
    today: "Deschis astăzi · 12:00–23:00",
    popular: "Selecția casei",
    conceptSummary: "Conceptul tău",
    builtFor: "Experiență gândită pentru",
    cta: "Vreau un proiect HoReCa real",
    ctaHint: "Trimite configurația pe WhatsApp și discută direct cu echipa AVYRON.",
    proofTitle: "Ce demonstrează această experiență",
    proofLead: "Un website HoReCa bun scurtează drumul dintre poftă, încredere și acțiune.",
    proof: [
      ["Decizia devine simplă", "Meniul, programul, locația și acțiunea principală sunt vizibile fără căutări inutile."],
      ["Brandul se simte coerent", "Fotografia, vocea și detaliile de interacțiune susțin aceeași atmosferă pe orice ecran."],
      ["Conversia rămâne directă", "Rezervarea, comanda sau cererea pentru eveniment pornesc dintr-un singur punct clar."],
    ],
  },
  en: {
    eyebrow: "Digital HoReCa concept",
    title: "From a great venue to an experience that starts online.",
    description:
      "This AVYRON demonstration concept shows how a HoReCa business can become a clear, premium and easy-to-use digital experience.",
    helper: "Choose three directions. The preview adapts instantly without sending data or placing a real order.",
    business: "1. What kind of business do you run?",
    objective: "2. What is your main goal?",
    atmosphere: "3. Which atmosphere fits you?",
    modules: "Useful modules included in the concept",
    preview: "Live preview",
    demo: "Demonstration brand",
    today: "Open today · 12:00–23:00",
    popular: "House selection",
    conceptSummary: "Your concept",
    builtFor: "Experience designed for",
    cta: "I want a real HoReCa project",
    ctaHint: "Send this configuration on WhatsApp and speak directly with the AVYRON team.",
    proofTitle: "What this experience demonstrates",
    proofLead: "A strong HoReCa website shortens the path between appetite, trust and action.",
    proof: [
      ["The decision feels simple", "Menu, hours, location and the main action are visible without unnecessary searching."],
      ["The brand feels coherent", "Photography, voice and interaction details support the same atmosphere on every screen."],
      ["Conversion stays direct", "Booking, ordering or an event enquiry starts from one clear point."],
    ],
  },
} as const;

function OptionCard({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "group flex min-h-24 w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition duration-300 active:scale-[0.98]",
        active
          ? "border-brand/70 bg-brand/[0.08] shadow-[0_18px_45px_-30px_hsl(var(--brand)/0.9)]"
          : "border-border/70 bg-card/55 hover:border-brand/35 hover:bg-card",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl border transition",
          active
            ? "border-brand/30 bg-brand text-primary-foreground"
            : "border-border bg-background/75 text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {title}
          {active && <Check className="size-3.5 text-brand" aria-hidden />}
        </span>
        {hint && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

export default function Configurator() {
  const { lang } = useLang();
  const language: LangKey = lang === "en" ? "en" : "ro";
  const ro = language === "ro";
  const copy = PAGE_COPY[language];
  const tx = (value: L) => value[language];

  const [businessId, setBusinessId] = useState("restaurant");
  const [goalId, setGoalId] = useState("booking");
  const [styleId, setStyleId] = useState("warm");
  const [modules, setModules] = useState<string[]>(["languages", "location"]);

  const business = HORECA_BUSINESSES.find((item) => item.id === businessId) ?? HORECA_BUSINESSES[0];
  const goal = HORECA_GOALS.find((item) => item.id === goalId) ?? HORECA_GOALS[0];
  const style = HORECA_STYLES.find((item) => item.id === styleId) ?? HORECA_STYLES[0];
  const selectedModules = HORECA_MODULES.filter((item) => modules.includes(item.id));

  useEffect(() => {
    window.scrollTo(0, 0);
    const path = ro ? "/configurator" : "/en/configurator";
    import("@/lib/seo").then(({ setPageMeta, setJsonLd }) => {
      setPageMeta({
        title: ro ? "Configurator HoReCa demonstrativ | AVYRON" : "HoReCa concept configurator | AVYRON",
        description: copy.description,
        path,
        alternates: { ro: "/configurator", en: "/en/configurator" },
        image: restaurantImage,
        imageAlt: ro
          ? "Concept digital demonstrativ pentru o afacere HoReCa"
          : "Demonstration digital concept for a HoReCa business",
      });
      setJsonLd("ld-configurator", {
        "@type": "WebApplication",
        "@id": `https://avyron.ro${path}#configurator`,
        name: ro ? "Configurator demonstrativ HoReCa AVYRON" : "AVYRON HoReCa demonstration configurator",
        description: copy.description,
        url: `https://avyron.ro${path}`,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        inLanguage: ro ? "ro-RO" : "en",
        isAccessibleForFree: true,
        creator: { "@id": "https://avyron.ro/#organization" },
      });
    });
    trackEvent("configurator_view", { lang: language, concept: "horeca" });
  }, [copy.description, language, ro]);

  const message = ro
    ? `Bună! Vreau să discutăm despre un proiect HoReCa. Am configurat: ${tx(business.label)}, obiectiv „${tx(goal.label)}”, stil „${tx(style.label)}”, module: ${selectedModules.map((item) => tx(item.label)).join(", ") || "de stabilit"}.`
    : `Hello! I would like to discuss a HoReCa project. My configuration: ${tx(business.label)}, goal “${tx(goal.label)}”, style “${tx(style.label)}”, modules: ${selectedModules.map((item) => tx(item.label)).join(", ") || "to be decided"}.`;
  const whatsappHref = `https://wa.me/40734605055?text=${encodeURIComponent(message)}`;

  const toggleModule = (id: string) =>
    setModules((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <PageBackLink to={ro ? "/" : "/en"} label={ro ? "Înapoi la AVYRON" : "Back to AVYRON"} />
        <div className="flex items-center gap-2">
          <LangSwitch />
          <ThemeToggle />
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-4 pb-14 pt-7 sm:px-6 sm:pb-20 sm:pt-12 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_18%_10%,hsl(var(--brand)/0.16),transparent_34%),radial-gradient(circle_at_80%_0%,hsl(var(--foreground)/0.08),transparent_28%)]" />

        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-brand sm:text-[11px]">
            <Sparkles className="size-3.5" aria-hidden />
            {copy.eyebrow}
          </div>
          <h1 className="mx-auto mt-5 max-w-4xl font-display text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            {copy.title}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{copy.description}</p>
          <p className="mx-auto mt-3 max-w-2xl text-xs leading-5 text-muted-foreground/80 sm:text-sm">{copy.helper}</p>
        </div>

        <div className="mt-10 grid items-start gap-5 lg:mt-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-8">
          <div className="rounded-[2rem] border border-border/70 bg-card/65 p-4 shadow-[0_30px_90px_-58px_hsl(var(--foreground)/0.45)] backdrop-blur sm:p-6">
            <fieldset>
              <legend className="font-display text-xl font-bold tracking-tight">{copy.business}</legend>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {HORECA_BUSINESSES.map((item) => (
                  <OptionCard key={item.id} active={businessId === item.id} icon={item.icon} title={tx(item.label)} onClick={() => setBusinessId(item.id)} />
                ))}
              </div>
            </fieldset>

            <div className="my-6 h-px bg-border/70" />

            <fieldset>
              <legend className="font-display text-xl font-bold tracking-tight">{copy.objective}</legend>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {HORECA_GOALS.map((item) => (
                  <OptionCard
                    key={item.id}
                    active={goalId === item.id}
                    icon={item.icon}
                    title={tx(item.label)}
                    hint={tx(item.hint)}
                    onClick={() => setGoalId(item.id)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="my-6 h-px bg-border/70" />

            <fieldset>
              <legend className="font-display text-xl font-bold tracking-tight">{copy.atmosphere}</legend>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                {HORECA_STYLES.map((item) => {
                  const active = styleId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStyleId(item.id)}
                      className={cn(
                        "rounded-2xl border p-3.5 text-left transition duration-300 active:scale-[0.98]",
                        active ? "border-brand/70 bg-brand/[0.08]" : "border-border/70 bg-card/55 hover:border-brand/35",
                      )}
                    >
                      <span className="flex -space-x-1.5" aria-hidden>
                        {item.swatches.map((color) => <span key={color} className="size-6 rounded-full border-2 border-card" style={{ backgroundColor: color }} />)}
                      </span>
                      <span className="mt-3 flex items-center gap-1.5 text-sm font-semibold">
                        {tx(item.label)}
                        {active && <Check className="size-3.5 text-brand" aria-hidden />}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{tx(item.hint)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{copy.modules}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {HORECA_MODULES.map((item) => {
                  const active = modules.includes(item.id);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleModule(item.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition",
                        active ? "border-brand/40 bg-brand/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      {tx(item.label)}
                      {active && <Check className="size-3.5 text-brand" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-5">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#101713] p-3 text-[#f8f3e8] shadow-[0_38px_100px_-45px_rgba(0,0,0,0.9)] sm:p-4">
              <div className="flex items-center justify-between px-2 py-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
                <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#8fd19e]" />{copy.preview}</span>
                <span>{copy.demo}</span>
              </div>

              <div className="overflow-hidden rounded-[1.45rem] bg-[#f5efe2] text-[#172018]">
                <div className="relative min-h-[23rem] overflow-hidden">
                  <img
                    src={restaurantImage}
                    alt={ro ? "Interior de restaurant folosit în conceptul demonstrativ" : "Restaurant interior used in the demonstration concept"}
                    width={1024}
                    height={768}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="eager"
                  />
                  <div className={cn("absolute inset-0 bg-gradient-to-b", style.preview)} />
                  <div className="relative flex min-h-[23rem] flex-col p-5 text-white sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display text-xl font-black tracking-[-0.035em]">{business.previewName}</p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-white/65">{tx(business.category)}</p>
                      </div>
                      <span className="grid size-9 place-items-center rounded-full border border-white/20 bg-black/20 backdrop-blur"><Menu className="size-4" /></span>
                    </div>

                    <div className="mt-auto max-w-sm">
                      <p className="text-xs font-medium text-white/75">{copy.today}</p>
                      <h2 className="mt-2 font-display text-4xl font-black leading-[0.96] tracking-[-0.04em] sm:text-5xl">
                        {tx(goal.label)}<span className="text-[#f0ad78]">.</span>
                      </h2>
                      <p className="mt-3 max-w-xs text-sm leading-6 text-white/78">{tx(goal.hint)}</p>
                      <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f5efe2] px-4 py-2.5 text-xs font-bold text-[#172018] shadow-lg">
                        {tx(goal.cta)} <ArrowRight className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9b6948]">{copy.popular}</p>
                      <p className="mt-1 font-display text-xl font-black">{ro ? "Gust, fără zgomot." : "Taste, without noise."}</p>
                    </div>
                    <span className="rounded-full border border-[#172018]/10 px-3 py-1.5 text-[10px] font-semibold">{tx(business.label)}</span>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {business.menu.map((item, index) => (
                      <div key={item.ro} className="flex items-center justify-between gap-4 rounded-xl bg-white/55 px-3.5 py-3">
                        <span className="text-xs font-semibold">{tx(item)}</span>
                        <span className="shrink-0 text-[10px] font-bold text-[#9b6948]">{index === 0 ? "49" : "42"} RON</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-[#172018]/10 px-3.5 py-3 text-[10px] font-semibold">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{ro ? "Iași · centru" : "Iași · city centre"}</span>
                    <span className="inline-flex items-center gap-1.5"><Languages className="size-3.5" />RO / EN</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.75rem] border border-border/70 bg-card/75 p-5 shadow-soft backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">{copy.conceptSummary}</p>
              <p className="mt-2 text-sm font-semibold">
                {copy.builtFor} {tx(business.label).toLocaleLowerCase(language === "ro" ? "ro-RO" : "en-US")}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-muted px-2.5 py-1">{tx(goal.label)}</span>
                <span className="rounded-full bg-muted px-2.5 py-1">{tx(style.label)}</span>
                {selectedModules.map((item) => <span key={item.id} className="rounded-full bg-muted px-2.5 py-1">{tx(item.label)}</span>)}
              </div>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("cta_click", { location: "horeca_configurator", action: "whatsapp", business: business.id, goal: goal.id })}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:opacity-90 active:scale-[0.98]"
              >
                <MessageCircle className="size-4" aria-hidden />
                {copy.cta}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">{copy.ctaHint}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-border/65 bg-muted/25">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">AVYRON · HoReCa</p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.035em] sm:text-4xl">{copy.proofTitle}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{copy.proofLead}</p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {copy.proof.map(([title, description], index) => (
              <article key={title} className="rounded-[1.5rem] border border-border/70 bg-card/65 p-5 sm:p-6">
                <span className="font-mono text-[10px] text-brand">0{index + 1}</span>
                <h3 className="mt-5 font-display text-xl font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
