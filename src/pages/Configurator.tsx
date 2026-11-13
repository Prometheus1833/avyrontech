import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowRight, BriefcaseBusiness, Check, ChevronDown, Globe2, Mail, MessageCircle, Palette, Phone, Search, Send, SlidersHorizontal, Target } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { trackFunnel } from "@/lib/siteAnalytics";
import { isSavedContact, publicFormRequest, type ContactReceipt } from "@/lib/publicFormRequest";
import { apiUrl } from "@/lib/apiBase";
import { cn } from "@/lib/utils";
import { COMPANY } from "@/config/company";
import { TURNSTILE_SITE_KEY } from "@/config/turnstile";
import PageBackLink from "@/components/site/PageBackLink";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Footer from "@/components/site/Footer";
import Turnstile from "@/components/site/Turnstile";
import { Input } from "@/components/ui/input";
import websitePreviewImage from "@/assets/premium-website-mockup-704.webp";
import { AVYRON_SERVICE_OPTIONS, HORECA_BUSINESSES, HORECA_GOALS, HORECA_MODULES, HORECA_STYLES, WEBSITE_FEATURE_OPTIONS, type Localized } from "@/data/horecaConfigurator";

const seo = {
  ro: {
    title: "Configurator website și proiecte digitale | AVYRON",
    description: "Configurează un site de prezentare, magazin online sau aplicație. Alege funcțiile și stilul vizual, vezi o simulare și cere o ofertă personalizată de la AVYRON.",
  },
  en: {
    title: "Website and digital project configurator | AVYRON",
    description: "Plan a business website, online store or web app. Choose its features and visual style, explore a preview and request a tailored quote from AVYRON.",
  },
} as const;

const fold = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const toggle = (value: string, list: string[]) => list.includes(value) ? list.filter(item => item !== value) : [...list, value];
const card = "min-w-0 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-5";
const input = "h-11 rounded-xl bg-background text-base sm:text-sm";
const action = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold hover:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand";

function Choice({ label, checked, onClick, children }: { label: string; checked: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" aria-pressed={checked} onClick={onClick} className={cn(
      "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium focus-visible:ring-2 focus-visible:ring-brand",
      checked ? "border-brand/65 bg-brand/10 text-foreground" : "border-border bg-background/70 text-muted-foreground hover:border-brand/45 hover:text-foreground",
    )}>
      {children}<span className="min-w-0 flex-1 break-words">{label}</span>
      {checked && <Check className="size-4 shrink-0 text-brand" aria-hidden="true" />}
    </button>
  );
}

function Options({ title, summary, icon, children }: { title: string; summary: string; icon: ReactNode; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="group rounded-xl border border-border/75 bg-background/55" data-open={open}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-brand">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand" aria-hidden="true">{icon}</span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block break-words text-xs text-muted-foreground">{summary}</span></span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground group-data-[open=true]:rotate-180" aria-hidden="true" />
      </button>
      <div id={id} hidden={!open} className="space-y-3 border-t border-border/70 px-3 py-3">{children}</div>
    </div>
  );
}

export default function Configurator() {
  const { lang } = useLang();
  const language = lang === "en" ? "en" : "ro";
  const ro = language === "ro";
  const tx = (value: Localized) => value[language];
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [activityQuery, setActivityQuery] = useState("");
  const [customActivity, setCustomActivity] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>(["presentation"]);
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [featureIds, setFeatureIds] = useState<string[]>([]);
  const [styleId, setStyleId] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const inFlight = useRef(false);

  const business = HORECA_BUSINESSES.find(item => item.id === businessIds[0]);
  const activity = customActivity.trim();
  const activities = [...businessIds.flatMap(id => {
    const item = HORECA_BUSINESSES.find(value => value.id === id);
    return item ? [tx(item.label)] : [];
  }), ...(activity ? [activity] : [])];
  const visibleBusinesses = HORECA_BUSINESSES.filter(item => fold(tx(item.label)).includes(fold(activityQuery.trim())));
  const selectedServices = AVYRON_SERVICE_OPTIONS.filter(item => serviceIds.includes(item.id));
  const selectedGoals = HORECA_GOALS.filter(item => goalIds.includes(item.id));
  const selectedFeatures = WEBSITE_FEATURE_OPTIONS.filter(item => featureIds.includes(item.id));
  const selectedModules = HORECA_MODULES.filter(item => modules.includes(item.id));
  const extraCount = selectedFeatures.length + selectedModules.length + selectedServices.filter(item => AVYRON_SERVICE_OPTIONS.indexOf(item) >= 3).length;
  const style = HORECA_STYLES.find(item => item.id === styleId);
  const goal = HORECA_GOALS.find(item => item.id === goalIds[0]) || HORECA_GOALS[0];
  const activitySummary = activities.join(", ") || (ro ? "Alege din listă sau scrie activitatea ta" : "Choose from the list or enter your activity");
  const summaryParts = [
    ...(activities.length ? [activitySummary] : []),
    ...selectedServices.map(item => tx(item.label)),
    ...(style ? [tx(style.label)] : []),
  ];
  const labelList = (items: { label: Localized }[]) => items.map(item => tx(item.label)).join(", ");
  const description = [
    ro ? "Bună! Aș vrea să discutăm despre un proiect digital." : "Hello! I’d like to discuss a digital project.",
    activities.length ? `${ro ? "Activitate" : "Business activity"}: ${activities.join(", ")}` : "",
    selectedServices.length ? `${ro ? "Servicii" : "Services"}: ${labelList(selectedServices)}` : "",
    selectedGoals.length ? `${ro ? "Obiective" : "Goals"}: ${labelList(selectedGoals)}` : "",
    selectedFeatures.length ? `${ro ? "Funcții" : "Features"}: ${labelList(selectedFeatures)}` : "",
    style ? `${ro ? "Stil" : "Style"}: ${tx(style.label)}` : "",
    selectedModules.length ? `${ro ? "Detalii" : "Details"}: ${labelList(selectedModules)}` : "",
  ].filter(Boolean).join("\n");
  const whatsappHref = `https://wa.me/${COMPANY.phone.replace(/^\+/, "")}?text=${encodeURIComponent(description)}`;

  useEffect(() => {
    let active = true;
    const path = ro ? "/configurator" : "/en/configurator";
    void import("@/lib/seo").then(({ setPageMeta, setJsonLd }) => {
      if (!active) return;
      setPageMeta({
        ...seo[language], path, alternates: { ro: "/configurator", en: "/en/configurator" },
        image: websitePreviewImage, imageWidth: 704, imageHeight: 704,
        imageAlt: ro ? "Exemplu de website de prezentare creat de AVYRON" : "Example of a business website by AVYRON",
      });
      setJsonLd("ld-configurator", {
        "@type": "WebApplication", "@id": `https://avyron.ro${path}#configurator`,
        name: ro ? "Configurator de proiecte digitale AVYRON" : "AVYRON digital project configurator",
        description: seo[language].description, url: `https://avyron.ro${path}`, applicationCategory: "DesignApplication",
        operatingSystem: "Web", inLanguage: ro ? "ro-RO" : "en", isAccessibleForFree: true,
        creator: { "@id": "https://avyron.ro/#organization" },
      });
    });
    trackEvent("configurator_view", { lang: language, concept: "business-website" });
    trackFunnel("page_view", "configurator", { language });
    trackFunnel("view_configurator", "configurator", { language });
    return () => { active = false; };
  }, [language, ro]);

  const submitConfiguration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    setSubmitError("");
    if (name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || phone.trim().length < 6) {
      setSubmitError(ro ? "Completează numele, e-mailul și telefonul." : "Complete your name, email and phone number.");
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setSubmitError(ro ? "Confirmă verificarea anti-spam." : "Complete the anti-spam check.");
      return;
    }
    const form = new FormData();
    form.set("name", name.trim());
    form.set("business", (activities.join(", ") || (ro ? "Activitate de discutat" : "Activity to discuss")).slice(0, 80));
    form.set("email", email.trim());
    form.set("phone", phone.trim());
    form.set("description", description);
    form.set("lang", language);
    form.set("product", "configurator-website");
    form.set("config", JSON.stringify({
      businesses: businessIds, ...(activity ? { customActivity: activity } : {}), goals: goalIds,
      services: serviceIds, features: featureIds, ...(style ? { style: style.id } : {}), modules,
    }));
    form.set("turnstileToken", turnstileToken);
    form.set("company_url", "");
    inFlight.current = true;
    setSubmitting(true);
    try {
      const { response, body: result } = await publicFormRequest<ContactReceipt>(apiUrl("/api/contact/demo"), { method: "POST", body: form });
      if (!isSavedContact(response, result)) throw new Error("request_failed");
      setSubmittedId(result.leadId!);
      trackFunnel("generate_lead", "configurator", { language, services: selectedServices.length, features: selectedFeatures.length });
      toast.success(ro ? "Am primit configurația ta." : "We received your configuration.");
    } catch {
      setTurnstileToken("");
      setTurnstileResetKey(value => value + 1);
      setSubmitError(ro ? "Trimiterea nu a putut fi confirmată. Datele tale sunt păstrate; poți încerca din nou sau ne poți contacta pe WhatsApp." : "We could not confirm submission. Your details are preserved; try again or reach us on WhatsApp.");
    } finally {
      setSubmitting(false);
      inFlight.current = false;
    }
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <PageBackLink to={ro ? "/" : "/en"} label="AVYRON" />
        <div className="flex items-center gap-1.5"><LangSwitch /><ThemeToggle /></div>
      </header>
      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-8 sm:space-y-7 sm:px-6 sm:pb-12">
        <section className="rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/10 via-background to-card p-4 sm:p-7" aria-labelledby="config-title">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">AVYRON · {ro ? "Configurator" : "Project planner"}</p>
          <h1 id="config-title" className="mt-2 max-w-3xl text-balance font-display text-3xl font-bold tracking-tight sm:text-5xl">
            {ro ? "Configurează-ți site-ul sau proiectul digital" : "Plan your website or digital project"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {ro ? "Spune-ne ce faci și ce vrei să obții. Alege între un site de prezentare, un magazin online sau o aplicație și trimite-ne ideea pentru o ofertă personalizată." : "Tell us what you do and what you want to achieve. Choose a business website, online store or app, then send us your idea for a tailored quote."}
          </p>
          <a href="#configurator-proiect" className={cn(action, "mt-3")}>{ro ? "Începe configurarea" : "Start planning"}<ArrowDown className="size-4" aria-hidden="true" /></a>
        </section>
        <div id="configurator-proiect" className="grid scroll-mt-4 items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section className={cn(card, "space-y-3")} aria-labelledby="project-config-title">
            <h2 id="project-config-title" className="font-display text-xl font-bold">{ro ? "Proiectul tău" : "Your project"}</h2>
            <Options title={ro ? "Domenii și activități" : "Industries and business activities"} summary={activitySummary} icon={<BriefcaseBusiness className="size-4" />}>
              <label className="block space-y-1 text-sm font-medium">
                <span className="inline-flex items-center gap-1.5"><Search className="size-4" aria-hidden="true" />{ro ? "Caută o activitate" : "Search activities"}</span>
                <Input type="search" value={activityQuery} onChange={event => setActivityQuery(event.target.value)} className={input} />
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleBusinesses.map(item => <Choice key={item.id} checked={businessIds.includes(item.id)} label={tx(item.label)} onClick={() => setBusinessIds(list => toggle(item.id, list))}><item.icon className="size-4 shrink-0" aria-hidden="true" /></Choice>)}
              </div>
              {!visibleBusinesses.length && <p role="status" className="text-sm text-muted-foreground">{ro ? "Nu am găsit activitatea căutată." : "No matching activities."}</p>}
              <label className="block space-y-1 text-sm font-medium">
                <span>{ro ? "Nu găsești domeniul? Scrie activitatea ta" : "Can’t find your industry? Enter your activity"}</span>
                <Input value={customActivity} maxLength={80} onChange={event => setCustomActivity(event.target.value)} placeholder={ro ? "De exemplu: închirieri de echipamente" : "For example: equipment rental"} className={input} />
              </label>
            </Options>

            <fieldset className="min-w-0 space-y-2">
              <legend className="mb-1 text-sm font-semibold">{ro ? "Ce vrei să construiești?" : "What do you want to build?"}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {AVYRON_SERVICE_OPTIONS.slice(0, 3).map(item => <Choice key={item.id} checked={serviceIds.includes(item.id)} label={tx(item.label)} onClick={() => setServiceIds(list => toggle(item.id, list))} />)}
              </div>
            </fieldset>
            <Options title={ro ? "Obiective" : "Project goals"} summary={labelList(selectedGoals) || (ro ? "De la cereri de ofertă la comenzi și programări" : "From enquiries to orders and bookings")} icon={<Target className="size-4" />}>
              <div className="grid gap-2 sm:grid-cols-2">
                {HORECA_GOALS.map(item => <Choice key={item.id} checked={goalIds.includes(item.id)} label={tx(item.label)} onClick={() => setGoalIds(list => toggle(item.id, list))} />)}
              </div>
            </Options>
            <Options title={ro ? "Funcții și servicii suplimentare" : "Features and additional services"} summary={extraCount ? (ro ? `Selectate: ${extraCount}` : `Selected: ${extraCount}`) : (ro ? "SEO, formulare, automatizări și altele" : "SEO, forms, automation and more")} icon={<SlidersHorizontal className="size-4" />}>
              {[
                { title: ro ? "Servicii" : "Services", items: AVYRON_SERVICE_OPTIONS.slice(3), chosen: serviceIds, update: setServiceIds },
                { title: ro ? "Funcții" : "Features", items: WEBSITE_FEATURE_OPTIONS, chosen: featureIds, update: setFeatureIds },
                { title: ro ? "Detalii opționale" : "Optional extras", items: HORECA_MODULES, chosen: modules, update: setModules },
              ].map(group => <fieldset key={group.title} className="min-w-0">
                <legend className="mb-2 text-xs font-semibold text-muted-foreground">{group.title}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map(item => <Choice key={item.id} checked={group.chosen.includes(item.id)} label={tx(item.label)} onClick={() => group.update(list => toggle(item.id, list))} />)}
                </div>
              </fieldset>)}
            </Options>
            <Options title={ro ? "Direcția vizuală" : "Visual direction"} summary={style ? tx(style.label) : (ro ? "Alege un stil sau lasă-ne să îți propunem unul" : "Choose a style or let us suggest one")} icon={<Palette className="size-4" />}>
              <div role="group" aria-label={ro ? "Stiluri vizuale" : "Visual styles"} className="grid gap-2 sm:grid-cols-2">
                {HORECA_STYLES.map(item => (
                  <button key={item.id} type="button" aria-pressed={styleId === item.id} onClick={() => setStyleId(current => current === item.id ? "" : item.id)}
                    className={cn("min-w-0 rounded-xl border px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-brand", styleId === item.id ? "border-brand/65 bg-brand/10" : "border-border bg-background hover:border-brand/45")}>
                    <span className="flex items-center gap-1" aria-hidden="true">{item.swatches.map(colour => <span key={colour} style={{ backgroundColor: colour }} className="size-4 rounded-full border border-foreground/20" />)}{styleId === item.id && <Check className="ml-auto size-4 text-brand" />}</span>
                    <span className="mt-1.5 block text-sm font-semibold">{tx(item.label)}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{tx(item.hint)}</span>
                  </button>
                ))}
              </div>
            </Options>
            <a href="#configurator-oferta" className={action}>{ro ? "Mergi la cererea de ofertă" : "Go to quote request"}<ArrowRight className="size-4" aria-hidden="true" /></a>
          </section>

          <div className="min-w-0 space-y-4">
            <section className={card} aria-labelledby="config-preview-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="config-preview-title" className="font-display text-lg font-bold">{ro ? "Previzualizare" : "Preview"}</h2>
                <span className="text-xs text-muted-foreground">{ro ? "Simulare orientativă" : "Illustrative concept"}</span>
              </div>
              <div className={cn("mt-3 grid min-w-0 gap-3 rounded-xl border border-white/10 bg-[#161426] bg-gradient-to-br p-4 text-white", style?.preview || "from-[#19142b] via-[#241a42] to-[#3d2a55]")}>
                <p className="flex items-center gap-2 text-sm font-medium text-white"><Globe2 className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">{activity || business?.previewName || (ro ? "Afacerea ta" : "Your business")}</span></p>
                <p className="break-words font-display text-xl font-bold">{tx(goal.label)}</p>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900">{tx(goal.cta)}<ArrowRight className="size-3.5" aria-hidden="true" /></span>
              </div>
              {summaryParts.length > 0 && <p className="mt-2.5 break-words text-xs leading-relaxed text-muted-foreground">{summaryParts.join(" · ")}</p>}
            </section>
            <section id="configurator-oferta" className={cn(card, "scroll-mt-4")} aria-labelledby="config-request-title">
              <h2 id="config-request-title" className="font-display text-lg font-bold">{ro ? "Cere o ofertă" : "Request a quote"}</h2>
              <p className="mb-3 mt-1 text-sm text-muted-foreground">{ro ? "Lasă-ne datele de contact ca să discutăm ce se potrivește proiectului tău." : "Leave your contact details so we can discuss the right approach for your project."}</p>
              {submittedId ? (
                <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                  <p className="font-semibold">{ro ? "Configurație sincronizată" : "Configuration received"}</p>
                  <p>{ro ? "Am primit cererea ta. Îți putem răspunde la datele de contact trimise." : "We received your request and can reach you using the details you provided."}</p>
                </div>
              ) : (
                <form onSubmit={submitConfiguration} aria-busy={submitting} aria-describedby={submitError ? "configuration-error" : undefined} className="space-y-2.5">
                  <label htmlFor="configuration-name" className="sr-only">{ro ? "Numele tău" : "Your name"}</label>
                  <Input id="configuration-name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} required placeholder={ro ? "Numele tău" : "Your name"} className={input} />
                  <label htmlFor="configuration-email" className="sr-only">E-mail</label>
                  <Input id="configuration-email" autoComplete="email" type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={120} required placeholder="E-mail" className={input} />
                  <label htmlFor="configuration-phone" className="sr-only">{ro ? "Telefon" : "Phone"}</label>
                  <Input id="configuration-phone" autoComplete="tel" type="tel" value={phone} onChange={event => setPhone(event.target.value)} minLength={6} maxLength={30} required placeholder={ro ? "Telefon" : "Phone"} className={input} />
                  {submitError && <p id="configuration-error" role="alert" className="text-sm text-red-700 dark:text-red-300">{submitError}</p>}
                  <Turnstile action="contact-demo" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
                  <button type="submit" disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2 text-sm font-bold text-background focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60">
                    <Send className="size-4" aria-hidden="true" />{submitting ? (ro ? "Se trimite…" : "Sending…") : (ro ? "Trimite configurația" : "Send configuration")}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>

        <section className={cn(card, "flex flex-wrap items-center justify-between gap-4 bg-brand/5")} id="configurator-contact" aria-labelledby="config-contact-title">
          <div className="min-w-0">
            <h2 id="config-contact-title" className="font-display text-xl font-bold">{ro ? "Contactează echipa AVYRON" : "Talk to the AVYRON team"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{ro ? "Ai o întrebare sau preferi să ne povestești direct despre proiect? Alege cum vrei să vorbim." : "Have a question or prefer to talk through your project? Choose how to reach us."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className={action} href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("cta_click", { location: "website_configurator", action: "whatsapp", business: business?.id || "unspecified", goal: goalIds[0] || "unspecified" })}><MessageCircle className="size-4" aria-hidden="true" />WhatsApp</a>
            <a className={action} href={`tel:${COMPANY.phone}`}><Phone className="size-4" aria-hidden="true" />{ro ? "Sună" : "Call"}</a>
            <a className={action} href={`mailto:${COMPANY.email}`}><Mail className="size-4" aria-hidden="true" />E-mail</a>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
