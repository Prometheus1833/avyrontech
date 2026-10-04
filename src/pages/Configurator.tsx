import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Languages,
  Loader2,
  MapPin,
  Menu,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import PageBackLink from "@/components/site/PageBackLink";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Footer from "@/components/site/Footer";
import websitePreviewImage from "@/assets/premium-website-mockup-704.webp";
import { cn } from "@/lib/utils";
import {
  AVYRON_SERVICE_OPTIONS,
  DOMAIN_PREFERENCES,
  HORECA_BUSINESSES,
  HORECA_GOALS,
  HORECA_MODULES,
  HORECA_STYLES,
  WEBSITE_FEATURE_OPTIONS,
  type Localized,
} from "@/data/horecaConfigurator";
import { Input } from "@/components/ui/input";
import Turnstile from "@/components/site/Turnstile";
import { TURNSTILE_SITE_KEY } from "@/config/turnstile";
import { apiUrl } from "@/lib/apiBase";
import { trackFunnel } from "@/lib/siteAnalytics";
import { toast } from "sonner";

type L = Localized;
type LangKey = keyof L;

const PAGE_COPY = {
  ro: {
    eyebrow: "Configurator website AVYRON",
    title: "Construiește direcția digitală potrivită afacerii tale.",
    description:
      "Combină domeniul de activitate, serviciile AVYRON și funcțiile de care ai nevoie. Primești un concept coerent, iar configurația poate ajunge direct în dashboardul echipei.",
    helper: "Poți selecta mai multe variante. Preview-ul se adaptează instant; datele de contact sunt trimise doar când confirmi formularul.",
    business: "1. Domenii și activități",
    objective: "2. Obiectivele proiectului",
    services: "3. Servicii AVYRON",
    features: "4. Funcții pentru website",
    domains: "5. Preferințe pentru domeniu",
    atmosphere: "6. Direcția vizuală",
    modules: "Detalii utile suplimentare",
    preview: "Preview live",
    demo: "Brand demonstrativ",
    today: "Deschis astăzi · 12:00–23:00",
    popular: "Selecția casei",
    conceptSummary: "Conceptul tău",
    builtFor: "Experiență gândită pentru",
    cta: "Trimite configurația",
    ctaHint: "Configurația este salvată în AVYRON OS și apare în pipeline-ul Configurator.",
    proofTitle: "Ce demonstrează această experiență",
    proofLead: "Un website bine configurat scurtează drumul dintre interes, încredere și acțiune.",
    proof: [
      ["Decizia devine simplă", "Serviciile, avantajele și acțiunea principală sunt vizibile fără căutări inutile."],
      ["Brandul rămâne coerent", "Conținutul, direcția vizuală și interacțiunile susțin aceeași identitate pe orice ecran."],
      ["Conversia rămâne directă", "Solicitarea, programarea sau comanda pornesc dintr-un singur punct clar."],
    ],
  },
  en: {
    eyebrow: "AVYRON website configurator",
    title: "Build the right digital direction for your business.",
    description:
      "Combine your field of activity, AVYRON services and the features you need. You get a coherent concept and can send the configuration directly to the team dashboard.",
    helper: "You can select multiple options. The preview updates instantly; contact details are sent only when you confirm the form.",
    business: "1. Fields and activities",
    objective: "2. Project goals",
    services: "3. AVYRON services",
    features: "4. Website features",
    domains: "5. Domain preferences",
    atmosphere: "6. Visual direction",
    modules: "Additional useful details",
    preview: "Live preview",
    demo: "Demonstration brand",
    today: "Open today · 12:00–23:00",
    popular: "House selection",
    conceptSummary: "Your concept",
    builtFor: "Experience designed for",
    cta: "Send configuration",
    ctaHint: "Your configuration is saved in AVYRON OS and appears in the Configurator pipeline.",
    proofTitle: "What this experience demonstrates",
    proofLead: "A well-configured website shortens the path between interest, trust and action.",
    proof: [
      ["The decision feels simple", "Services, benefits and the primary action stay visible without unnecessary searching."],
      ["The brand stays coherent", "Content, visual direction and interactions support one identity across every screen."],
      ["Conversion stays direct", "An enquiry, booking or order starts from one clear point."],
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

  const [businessIds, setBusinessIds] = useState<string[]>(["restaurant"]);
  const [goalIds, setGoalIds] = useState<string[]>(["booking"]);
  const [serviceIds, setServiceIds] = useState<string[]>(["presentation"]);
  const [featureIds, setFeatureIds] = useState<string[]>(["contact", "seo"]);
  const [domainIds, setDomainIds] = useState<string[]>(["ro"]);
  const [styleId, setStyleId] = useState("warm");
  const [modules, setModules] = useState<string[]>(["languages", "location"]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const selectedBusinesses = HORECA_BUSINESSES.filter((item) => businessIds.includes(item.id));
  const selectedGoals = HORECA_GOALS.filter((item) => goalIds.includes(item.id));
  const selectedServices = AVYRON_SERVICE_OPTIONS.filter((item) => serviceIds.includes(item.id));
  const selectedFeatures = WEBSITE_FEATURE_OPTIONS.filter((item) => featureIds.includes(item.id));
  const selectedDomains = DOMAIN_PREFERENCES.filter((item) => domainIds.includes(item.id));
  const business = selectedBusinesses[0] ?? HORECA_BUSINESSES[0];
  const goal = selectedGoals[0] ?? HORECA_GOALS[0];
  const style = HORECA_STYLES.find((item) => item.id === styleId) ?? HORECA_STYLES[0];
  const selectedModules = HORECA_MODULES.filter((item) => modules.includes(item.id));

  useEffect(() => {
    window.scrollTo(0, 0);
    const path = ro ? "/configurator" : "/en/configurator";
    import("@/lib/seo").then(({ setPageMeta, setJsonLd }) => {
      setPageMeta({
        title: ro ? "Configurator website pentru afaceri | AVYRON" : "Business website configurator | AVYRON",
        description: copy.description,
        path,
        alternates: { ro: "/configurator", en: "/en/configurator" },
        image: websitePreviewImage,
        imageAlt: ro
          ? "Configurator pentru website, servicii și funcții digitale AVYRON"
          : "AVYRON configurator for websites, services and digital features",
      });
      setJsonLd("ld-configurator", {
        "@type": "WebApplication",
        "@id": `https://avyron.ro${path}#configurator`,
        name: ro ? "Configurator website AVYRON" : "AVYRON website configurator",
        description: copy.description,
        url: `https://avyron.ro${path}`,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        inLanguage: ro ? "ro-RO" : "en",
        isAccessibleForFree: true,
        creator: { "@id": "https://avyron.ro/#organization" },
      });
    });
    trackEvent("configurator_view", { lang: language, concept: "business-website" });
    trackFunnel("page_view", "configurator", { language });
    trackFunnel("view_configurator", "configurator", { language });
  }, [copy.description, language, ro]);

  const message = ro
    ? `Bună! Am configurat un proiect AVYRON pentru ${selectedBusinesses.map((item) => tx(item.label)).join(", ")}. Servicii: ${selectedServices.map((item) => tx(item.label)).join(", ")}. Funcții: ${selectedFeatures.map((item) => tx(item.label)).join(", ")}.`
    : `Hello! I configured an AVYRON project for ${selectedBusinesses.map((item) => tx(item.label)).join(", ")}. Services: ${selectedServices.map((item) => tx(item.label)).join(", ")}. Features: ${selectedFeatures.map((item) => tx(item.label)).join(", ")}.`;
  const whatsappHref = `https://wa.me/40734605055?text=${encodeURIComponent(message)}`;

  const toggleModule = (id: string) =>
    setModules((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const toggleRequired = (id: string, current: string[], update: (next: string[]) => void) => {
    if (current.includes(id)) {
      if (current.length > 1) update(current.filter((item) => item !== id));
      return;
    }
    update([...current, id]);
  };
  const toggleOptional = (id: string, current: string[], update: (next: string[]) => void) =>
    update(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const submitConfiguration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || phone.trim().length < 6) {
      toast.error(ro ? "Completează numele, e-mailul și telefonul." : "Complete your name, email and phone number.");
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error(ro ? "Confirmă verificarea anti-spam." : "Complete the anti-spam check.");
      return;
    }
    const configuration = {
      businesses: selectedBusinesses.map((item) => item.id),
      goals: selectedGoals.map((item) => item.id),
      services: selectedServices.map((item) => item.id),
      features: selectedFeatures.map((item) => item.id),
      domains: selectedDomains.map((item) => item.id),
      style: style.id,
      modules,
    };
    const form = new FormData();
    form.set("name", name.trim());
    form.set("business", selectedBusinesses.map((item) => tx(item.label)).join(", "));
    form.set("phone", phone.trim());
    form.set("email", email.trim());
    form.set("description", message);
    form.set("lang", language);
    form.set("product", "configurator-website");
    form.set("config", JSON.stringify(configuration));
    form.set("turnstileToken", turnstileToken);
    form.set("company_url", "");
    setSubmitting(true);
    try {
      const response = await fetch(apiUrl("/api/contact/demo"), { method: "POST", body: form });
      const result = await response.json().catch(() => ({})) as { leadId?: string; error?: string };
      if (!response.ok && !result.leadId) throw new Error(result.error || "request_failed");
      setSubmittedId(result.leadId || "saved");
      trackFunnel("generate_lead", "configurator", { language, services: selectedServices.length, features: selectedFeatures.length });
      toast.success(ro ? "Configurația a fost salvată în AVYRON OS." : "Your configuration was saved in AVYRON OS.");
    } catch {
      setTurnstileToken("");
      setTurnstileResetKey((value) => value + 1);
      toast.error(ro ? "Configurația nu a putut fi trimisă. Încearcă din nou." : "The configuration could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
                  <OptionCard key={item.id} active={businessIds.includes(item.id)} icon={item.icon} title={tx(item.label)} onClick={() => toggleRequired(item.id, businessIds, setBusinessIds)} />
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
                    active={goalIds.includes(item.id)}
                    icon={item.icon}
                    title={tx(item.label)}
                    hint={tx(item.hint)}
                    onClick={() => toggleRequired(item.id, goalIds, setGoalIds)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="my-6 h-px bg-border/70" />

            <fieldset>
              <legend className="font-display text-xl font-bold tracking-tight">{copy.services}</legend>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {AVYRON_SERVICE_OPTIONS.map((item) => (
                  <OptionCard
                    key={item.id}
                    active={serviceIds.includes(item.id)}
                    icon={item.icon}
                    title={tx(item.label)}
                    hint={tx(item.hint)}
                    onClick={() => toggleRequired(item.id, serviceIds, setServiceIds)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="my-6 h-px bg-border/70" />

            <fieldset>
              <legend className="font-display text-xl font-bold tracking-tight">{copy.features}</legend>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {WEBSITE_FEATURE_OPTIONS.map((item) => (
                  <OptionCard
                    key={item.id}
                    active={featureIds.includes(item.id)}
                    icon={item.icon}
                    title={tx(item.label)}
                    hint={tx(item.hint)}
                    onClick={() => toggleOptional(item.id, featureIds, setFeatureIds)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="my-6 h-px bg-border/70" />

            <fieldset>
              <legend className="font-display text-xl font-bold tracking-tight">{copy.domains}</legend>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {DOMAIN_PREFERENCES.map((item) => (
                  <OptionCard
                    key={item.id}
                    active={domainIds.includes(item.id)}
                    icon={item.icon}
                    title={tx(item.label)}
                    hint={tx(item.hint)}
                    onClick={() => toggleOptional(item.id, domainIds, setDomainIds)}
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
                    src={websitePreviewImage}
                    alt={ro ? "Previzualizare pentru un website de prezentare profesional" : "Professional business website preview"}
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
                      <p className="mt-1 font-display text-xl font-black">{ro ? "Clar, relevant, pregătit pentru conversie." : "Clear, relevant and ready to convert."}</p>
                    </div>
                    <span className="rounded-full border border-[#172018]/10 px-3 py-1.5 text-[10px] font-semibold">{tx(business.label)}</span>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {business.menu.map((item) => (
                      <div key={item.ro} className="flex items-center justify-between gap-4 rounded-xl bg-white/55 px-3.5 py-3">
                        <span className="text-xs font-semibold">{tx(item)}</span>
                        <span className="shrink-0 text-[10px] font-bold text-[#9b6948]">{ro ? "INCLUS" : "INCLUDED"}</span>
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
                {copy.builtFor} {selectedBusinesses.map((item) => tx(item.label)).join(", ").toLocaleLowerCase(language === "ro" ? "ro-RO" : "en-US")}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                {selectedGoals.map((item) => <span key={item.id} className="rounded-full bg-muted px-2.5 py-1">{tx(item.label)}</span>)}
                {selectedServices.map((item) => <span key={item.id} className="rounded-full bg-brand/10 px-2.5 py-1 text-foreground">{tx(item.label)}</span>)}
                <span className="rounded-full bg-muted px-2.5 py-1">{tx(style.label)}</span>
                {selectedModules.map((item) => <span key={item.id} className="rounded-full bg-muted px-2.5 py-1">{tx(item.label)}</span>)}
              </div>
              {submittedId ? (
                <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-700 dark:text-emerald-200">
                  <p className="font-semibold">{ro ? "Configurație sincronizată" : "Configuration synced"}</p>
                  <p className="mt-1 text-xs opacity-80">{ro ? "Rezultatul este acum disponibil în AVYRON OS → Configurator." : "The result is now available in AVYRON OS → Configurator."}</p>
                </div>
              ) : (
                <form onSubmit={submitConfiguration} className="mt-5 space-y-2.5">
                  <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder={ro ? "Numele tău" : "Your name"} className="h-11 rounded-xl" />
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" maxLength={120} required placeholder="email@exemplu.ro" className="h-11 rounded-xl" />
                  <Input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" maxLength={30} required placeholder={ro ? "Telefon" : "Phone"} className="h-11 rounded-xl" />
                  <Turnstile action="contact-demo" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
                  <button type="submit" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                    {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                    {copy.cta}
                  </button>
                </form>
              )}
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("cta_click", { location: "website_configurator", action: "whatsapp", business: business.id, goal: goal.id })}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background/65 px-5 py-3 text-sm font-bold text-foreground transition hover:border-brand/35 hover:bg-brand/[0.05] active:scale-[0.98]"
              >
                <MessageCircle className="size-4" aria-hidden />
                {ro ? "Discută pe WhatsApp" : "Continue on WhatsApp"}
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
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">AVYRON · Website profesional</p>
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
