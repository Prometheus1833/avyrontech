import { type ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cookie,
  Database,
  Fingerprint,
  Gauge,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Footer from "@/components/site/Footer";
import PageBackLink from "@/components/site/PageBackLink";
import logo from "@/assets/avyron-logo.webp";
import { COMPANY } from "@/config/company";
import { useLang } from "@/i18n/LanguageContext";
import { COOKIE_POLICY_VERSION, COOKIE_SETTINGS_EVENT } from "@/lib/cookieConsent";

type PolicySection = {
  id: string;
  title: string;
  intro?: string;
  icon: typeof Cookie;
  body: ReactNode;
};

type Technology = {
  name: string;
  provider: string;
  purpose: string;
  storage: string;
  retention: string;
  category: "necessary" | "analytics";
};

const legalPillClass = "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-200/30 hover:bg-white/[0.1] hover:text-white";

const technologiesRo: Technology[] = [
  { name: "sid", provider: "Avyron · Cloudflare", purpose: "Menține în siguranță sesiunea după autentificare. Este HttpOnly și nu poate fi citit de JavaScript.", storage: "Cookie securizat", retention: "Maximum 30 de zile; este revocat la logout, expirare sau din lista de sesiuni.", category: "necessary" },
  { name: "avyron-cookie-consent-v2", provider: "Avyron", purpose: "Reține alegerile privind analiza și marketingul, împreună cu versiunea politicii.", storage: "Stocare locală", retention: "Până la retragere, ștergerea datelor browserului sau schimbarea versiunii politicii.", category: "necessary" },
  { name: "theme · webcore-lang · avyron-display-currency", provider: "Avyron", purpose: "Păstrează tema, limba și moneda alese expres de vizitator.", storage: "Stocare locală", retention: "Până la modificarea preferinței sau ștergerea datelor browserului.", category: "necessary" },
  { name: "avy_visitor · avy_bubble_pos", provider: "Avyron AI Assistant", purpose: "Continuitatea conversației inițiate de utilizator și poziția aleasă pentru butonul asistentului.", storage: "Stocare locală", retention: "Până la ștergerea datelor browserului; sunt create numai când funcția este utilizată.", category: "necessary" },
  { name: "avyron:blogpro:intro", provider: "Avyron", purpose: "Evită repetarea introducerii animate în aceeași filă.", storage: "Stocare de sesiune", retention: "Până la închiderea filei.", category: "necessary" },
  { name: "avyron:sid", provider: "Avyron · Cloudflare D1", purpose: "Măsoară agregat pașii parcurși pe anumite pagini de produs, fără a salva nume, email sau IP în eveniment.", storage: "Stocare de sesiune", retention: "Până la închiderea filei; este creat numai după acceptarea categoriei Analiză.", category: "analytics" },
  { name: "_ga · _ga_<container>", provider: "Google Analytics 4", purpose: "Diferențiază vizitele și produce statistici de utilizare atunci când analiza este acceptată.", storage: "Cookies de analiză", retention: "De regulă până la 2 ani, în funcție de configurația Google și de setările browserului.", category: "analytics" },
];

const technologiesEn: Technology[] = [
  { name: "sid", provider: "Avyron · Cloudflare", purpose: "Securely maintains the session after sign-in. It is HttpOnly and cannot be read by JavaScript.", storage: "Secure cookie", retention: "Up to 30 days; revoked on logout, expiry or from the session list.", category: "necessary" },
  { name: "avyron-cookie-consent-v2", provider: "Avyron", purpose: "Stores analytics and marketing choices together with the policy version.", storage: "Local storage", retention: "Until withdrawal, browser-data deletion or a policy-version change.", category: "necessary" },
  { name: "theme · webcore-lang · avyron-display-currency", provider: "Avyron", purpose: "Stores the theme, language and currency expressly selected by the visitor.", storage: "Local storage", retention: "Until the preference changes or browser data is deleted.", category: "necessary" },
  { name: "avy_visitor · avy_bubble_pos", provider: "Avyron AI Assistant", purpose: "Continuity for a user-initiated conversation and the selected assistant-button position.", storage: "Local storage", retention: "Until browser data is deleted; created only when the feature is used.", category: "necessary" },
  { name: "avyron:blogpro:intro", provider: "Avyron", purpose: "Prevents the animated introduction from repeating in the same tab.", storage: "Session storage", retention: "Until the tab is closed.", category: "necessary" },
  { name: "avyron:sid", provider: "Avyron · Cloudflare D1", purpose: "Measures aggregate steps on selected product pages without saving a name, email or IP in the event.", storage: "Session storage", retention: "Until the tab is closed; created only after Analytics is accepted.", category: "analytics" },
  { name: "_ga · _ga_<container>", provider: "Google Analytics 4", purpose: "Distinguishes visits and produces usage statistics when analytics is accepted.", storage: "Analytics cookies", retention: "Usually up to 2 years, depending on Google configuration and browser settings.", category: "analytics" },
];

const TechnologyList = ({ rows, ro }: { rows: Technology[]; ro: boolean }) => (
  <div className="grid gap-3">
    {rows.map((item) => (
      <article key={item.name} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <code className="break-all font-mono text-xs font-semibold text-cyan-200">{item.name}</code>
            <p className="mt-1 text-xs text-slate-500">{item.provider} · {item.storage}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${item.category === "analytics" ? "border-purple-300/25 bg-purple-400/10 text-purple-200" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"}`}>
            {item.category === "analytics" ? (ro ? "Analiză" : "Analytics") : (ro ? "Necesar / funcțional" : "Necessary / functional")}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.purpose}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400"><strong className="text-slate-300">{ro ? "Durată:" : "Retention:"}</strong> {item.retention}</p>
      </article>
    ))}
  </div>
);

export default function CookiePolicy() {
  const { lang } = useLang();
  const ro = lang === "ro";
  const path = ro ? "/politica-cookies" : "/en/cookie-policy";
  const homePath = ro ? "/#hero" : "/en#hero";
  const privacyPath = ro ? "/gdpr" : "/en/privacy";
  const termsPath = ro ? "/termeni" : "/en/terms";
  const technologies = ro ? technologiesRo : technologiesEn;
  const openSettings = () => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro ? "Politica de cookies și preferințe | Avyron" : "Cookie and Preference Policy | Avyron";
    const description = ro
      ? "Politica Avyron explică transparent cookies, stocarea locală, scopurile, furnizorii, duratele și modul de retragere a consimțământului."
      : "Avyron clearly explains cookies, local storage, purposes, providers, retention periods and how to withdraw consent.";
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd }]) => {
        setPageMeta({
          title,
          description,
          path,
          alternates: { ro: "/politica-cookies", en: "/en/cookie-policy" },
          image: "/og/home.jpg",
          imageAlt: ro ? "Avyron — control clar asupra cookie-urilor" : "Avyron — clear cookie controls",
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd("ld-breadcrumb", breadcrumbLd([
          { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
          { name: ro ? "Politica de cookies" : "Cookie policy", path },
        ]));
        setJsonLd("ld-cookie-policy", {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `https://avyron.ro${path}#webpage`,
          url: `https://avyron.ro${path}`,
          name: title,
          description,
          inLanguage: ro ? "ro-RO" : "en",
          dateModified: COOKIE_POLICY_VERSION,
          isPartOf: { "@id": "https://avyron.ro/#website" },
          about: { "@id": "https://avyron.ro/#organization" },
        });
      },
    );
  }, [path, ro]);

  const sections: PolicySection[] = [
    {
      id: "principii",
      title: ro ? "Alegerea ta, fără setări ascunse" : "Your choice, without hidden settings",
      intro: ro ? "Tehnologiile strict necesare susțin funcțiile cerute de tine. Analiza și marketingul sunt oprite implicit." : "Strictly necessary technologies support features you request. Analytics and marketing are off by default.",
      icon: ShieldCheck,
      body: <ul className="space-y-2">{(ro ? ["Poți continua cu doar tehnologiile necesare.", "Categoriile opționale se activează numai printr-o acțiune explicită.", "Refuzul nu limitează accesul la conținutul public.", "Preferințele pot fi schimbate sau retrase oricând."] : ["You can continue with necessary technologies only.", "Optional categories activate only through an explicit action.", "Refusal does not limit access to public content.", "Preferences can be changed or withdrawn at any time."]).map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" /><span>{item}</span></li>)}</ul>,
    },
    {
      id: "inventar",
      title: ro ? "Inventarul tehnologiilor utilizate" : "Technology inventory",
      intro: ro ? "Lista reflectă implementarea actuală a site-ului și include cookies, localStorage și sessionStorage." : "This list reflects the website's current implementation and covers cookies, localStorage and sessionStorage.",
      icon: Database,
      body: <TechnologyList rows={technologies} ro={ro} />,
    },
    {
      id: "categorii",
      title: ro ? "Cum funcționează categoriile" : "How categories work",
      icon: Gauge,
      body: <div className="grid gap-3 sm:grid-cols-3">{[
        { name: ro ? "Necesare" : "Necessary", text: ro ? "Securitate, autentificare și preferințe solicitate. Nu pot fi dezactivate din panou." : "Security, authentication and requested preferences. They cannot be disabled from the panel." },
        { name: ro ? "Analiză" : "Analytics", text: ro ? "Măsurare first-party și Google Analytics, numai după acceptare." : "First-party measurement and Google Analytics, only after acceptance." },
        { name: "Marketing", text: ro ? "Preferința este disponibilă, însă nu există în prezent un pixel publicitar separat activat de Avyron." : "The preference is available, but Avyron currently has no separate advertising pixel enabled." },
      ].map((item) => <div key={item.name} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><h3 className="font-semibold text-white">{item.name}</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">{item.text}</p></div>)}</div>,
    },
    {
      id: "control",
      title: ro ? "Modificare, retragere și ștergere" : "Change, withdrawal and deletion",
      icon: Settings2,
      body: <><p>{ro ? "Butonul de mai jos deschide același panou de preferințe disponibil în subsol. Retragerea produce efecte pentru utilizările viitoare și nu schimbă legalitatea prelucrărilor anterioare." : "The button below opens the same preference panel available in the footer. Withdrawal applies to future use and does not affect the lawfulness of prior processing."}</p><button type="button" onClick={openSettings} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Settings2 className="size-4" />{ro ? "Deschide setările cookies" : "Open cookie settings"}</button><p className="mt-4 text-xs text-slate-400">{ro ? "Poți șterge și datele site-ului din setările browserului. Aceasta poate reseta limba, tema, moneda, coșul sau conversația locală." : "You may also delete website data from your browser settings. This can reset language, theme, currency, cart or local conversation continuity."}</p></>,
    },
    {
      id: "terti",
      title: ro ? "Furnizori și transferuri" : "Providers and transfers",
      icon: Fingerprint,
      body: <><p>{ro ? "Infrastructura este livrată prin Cloudflare. Google Analytics este încărcat numai după consimțământul relevant. Atunci când un furnizor prelucrează date în afara Spațiului Economic European, sunt utilizate mecanismele juridice aplicabile descrise în politica de confidențialitate." : "Infrastructure is delivered through Cloudflare. Google Analytics loads only after relevant consent. Where a provider processes data outside the European Economic Area, the applicable legal mechanisms described in the privacy policy are used."}</p><div className="mt-4 flex flex-wrap gap-2"><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer" className={legalPillClass}>Cloudflare Privacy<ChevronRight className="size-3" /></a><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className={legalPillClass}>Google Privacy<ChevronRight className="size-3" /></a></div></>,
    },
    {
      id: "actualizari",
      title: ro ? "Actualizări și contact" : "Updates and contact",
      icon: Sparkles,
      body: <><p>{ro ? `Actualizăm inventarul înainte de activarea unei noi tehnologii opționale. O schimbare materială poate determina afișarea din nou a panoului de consimțământ. Operatorul și punctul principal de contact sunt ${COMPANY.primaryLegalEntity.legalName}.` : `We update the inventory before enabling a new optional technology. A material change may cause the consent panel to be displayed again. The controller and primary contact point are ${COMPANY.primaryLegalEntity.legalName}.`}</p><p>{ro ? "Pentru întrebări privind confidențialitatea:" : "For privacy questions:"} <a href={`mailto:${COMPANY.email}`} className="font-medium text-cyan-200 hover:underline">{COMPANY.email}</a>.</p><div className="mt-4 flex flex-wrap gap-2"><Link to={privacyPath} className={legalPillClass}>{ro ? "Confidențialitate & GDPR" : "Privacy & GDPR"}<ChevronRight className="size-3" /></Link><Link to={termsPath} className={legalPillClass}>{ro ? "Termeni de utilizare" : "Terms of use"}<ChevronRight className="size-3" /></Link></div></>,
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#050711] text-white antialiased selection:bg-cyan-300 selection:text-slate-950">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050711]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <PageBackLink to={homePath} label={ro ? "Înapoi" : "Back"} />
          <a href={homePath} className="inline-flex items-center gap-2" aria-label={ro ? "Avyron — mergi la hero" : "Avyron — go to hero"}><img src={logo} alt="Avyron" width={26} height={26} className="size-[26px] rounded-lg object-cover ring-1 ring-white/15" /><span className="font-display text-xs font-bold tracking-[0.22em]">AVYRON</span></a>
        </div>
      </header>

      <section className="relative px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <div className="pointer-events-none absolute inset-0" aria-hidden><div className="absolute left-1/2 top-[-24rem] size-[46rem] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" /><div className="absolute right-[-8rem] top-40 size-72 rounded-full bg-cyan-400/10 blur-[90px]" /><div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" /></div>
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200"><LockKeyhole className="size-3.5" /> {ro ? "Privacy control center" : "Privacy control centre"}</div>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">{ro ? "Cookies clare." : "Clear cookies."}<span className="block bg-gradient-to-r from-cyan-200 via-white to-purple-300 bg-clip-text text-transparent">{ro ? "Controlul rămâne la tine." : "You stay in control."}</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">{ro ? "O explicație precisă despre tehnologiile folosite, de ce există și cât timp rămân — cu opțiunile importante la un click distanță." : "A precise explanation of the technologies used, why they exist and how long they remain — with important choices one click away."}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2 text-[11px] text-slate-400"><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{ro ? "Versiune" : "Version"} · {COOKIE_POLICY_VERSION}</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{ro ? "Opționale oprite implicit" : "Optional tools off by default"}</span></div>
          <button type="button" onClick={openSettings} className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-200 to-purple-200 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_15px_45px_-18px_rgba(103,232,249,.8)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Settings2 className="size-4" />{ro ? "Gestionează preferințele" : "Manage preferences"}</button>
        </div>
      </section>

      <section className="relative px-4 pb-24 sm:px-6 sm:pb-28">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 lg:sticky lg:top-20"><p className="px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">{ro ? "Control rapid" : "Quick control"}</p><nav className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1" aria-label={ro ? "Cuprins politica cookies" : "Cookie policy contents"}>{sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-[11px] leading-tight text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white sm:text-xs"><span className="font-mono text-[9px] text-cyan-300/60">{String(index + 1).padStart(2, "0")}</span><span>{section.title}</span></a>)}</nav><div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3 text-xs leading-relaxed text-slate-300"><ShieldCheck className="mb-2 size-4 text-emerald-300" />{ro ? "Fără consimțământ, analiza și marketingul rămân dezactivate." : "Without consent, analytics and marketing remain disabled."}</div></aside>
          <div className="min-w-0 divide-y divide-white/10 rounded-3xl border border-white/10 bg-[#090c18]/80 px-4 shadow-[0_35px_120px_-60px_rgba(34,211,238,.35)] sm:px-7">{sections.map((section, index) => { const Icon = section.icon; return <article key={section.id} id={section.id} className="scroll-mt-24 py-8 sm:py-10"><div className="flex items-start gap-3 sm:gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-cyan-200 sm:size-11"><Icon className="size-[18px]" /></span><div className="min-w-0 flex-1"><div className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-purple-300/75">{ro ? "Control" : "Control"} {String(index + 1).padStart(2, "0")}</div><h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">{section.title}</h2>{section.intro && <p className="mt-3 text-sm leading-relaxed text-slate-400">{section.intro}</p>}<div className="terms-copy mt-4 space-y-3 text-[14px] leading-[1.75] text-slate-300 sm:text-[15px]">{section.body}</div></div></div></article>; })}</div>
        </div>
      </section>

      <section className="relative border-t border-white/10 px-4 py-16 sm:px-6"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(168,85,247,.15),transparent_55%)]" /><div className="relative mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.025] p-6 text-center sm:p-10"><BarChart3 className="mx-auto size-6 text-cyan-200" /><h2 className="mt-4 font-display text-2xl font-bold sm:text-4xl">{ro ? "Preferințe simple. Decizii reversibile." : "Simple preferences. Reversible choices."}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">{ro ? "Poți reveni oricând la setări, fără să cauți prin cont sau meniuri ascunse." : "You can return to your settings at any time, without searching through an account or hidden menus."}</p><button type="button" onClick={openSettings} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950"><Cookie className="size-4" />{ro ? "Revizuiește alegerea" : "Review your choice"}</button></div></section>
      <Footer />
    </main>
  );
}
