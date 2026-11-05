import ServiceContentProvider from "@/components/services/ServiceContentProvider";
import logo from "@/assets/avyron-logo.jpg";
import ServiceCinematicIntro from "@/components/services/ServiceCinematicIntro";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import CurrencySwitch from "@/components/site/CurrencySwitch";
import Footer from "@/components/site/Footer";
import LangSwitch from "@/components/site/LangSwitch";
import LibraryLink from "@/components/site/LibraryLink";
import PageBackLink from "@/components/site/PageBackLink";
import QuickNav from "@/components/site/QuickNav";
import Reveal from "@/components/site/Reveal";
import ThemeToggle from "@/components/site/ThemeToggle";
import { SERVICE_INLINE_QA } from '@/data/managedServiceCopy/inline-qa';
import { QA_PAGE_COPY } from '@/data/managedServiceCopy/qa';
import { useCurrency } from "@/hooks/useCurrency";
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import {
ArrowRight,
Bug,
Check,
Clock,
FlaskConical,
Globe,
Layers,
MessageCircle,
Monitor,
RefreshCw,
Smartphone,
Sparkles,
Workflow
} from "lucide-react";
import { useEffect,useState } from "react";

const WHATSAPP = "https://wa.me/40734605055?text=";

const QaTestingPage = () => {
 const serviceInlineCopy=useServicePageContent("qa-testing","inline",SERVICE_INLINE_QA);

  const { lang } = useLang();
  const ro = lang === "ro";
  const {faq,modes,types,steps,packages}=useServicePageContent("qa-testing","qa",QA_PAGE_COPY)[lang];
  const { formatFixedPrice: fmt } = useCurrency(ro ? "ro-RO" : "en-IE");
  const [mode, setMode] = useState<"manual" | "auto">("manual");

  const path = ro ? "/servicii/qa-testing-web-mobile" : "/en/services/web-mobile-qa-testing";



  useEffect(() => {
    window.scrollTo(0, 0);
    const title = (ro ? serviceInlineCopy.text_25c9845c7fee.ro : serviceInlineCopy.text_25c9845c7fee.en);
    const description = (ro ? serviceInlineCopy.text_0cbfe04e1470.ro : serviceInlineCopy.text_0cbfe04e1470.en);
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, offerCatalogLd, faqPageLd }]) => {
        setPageMeta({
          title,
          description,
          path,
          alternates: {
            ro: "/servicii/qa-testing-web-mobile",
            en: "/en/services/web-mobile-qa-testing",
          },
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-service",
          serviceLd({
            name: ro ? "QA Testing Web/Mobile" : "QA Testing Web/Mobile",
            description,
            path,
            priceRon: 1600,
            priceEur: 300,
          }),
        );
        setJsonLd(
          "ld-offercatalog",
          offerCatalogLd({
            name: ro ? "Pachete de testare QA" : "QA testing packages",
            path,
            items: [
              {
                name: ro ? "Rundă esențială" : "Essential round",
                description: ro
                  ? "Testare manuală funcțională, cross-browser și mobil pentru un site de prezentare, cu raport de defecte și o retestare inclusă."
                  : "Manual functional, cross-browser and mobile testing for a presentation website, with a defect report and one retest included.",
                priceEur: 300,
              },
              {
                name: ro ? "Rundă completă" : "Full round" ,
                description: ro
                  ? "Testare manuală extinsă pentru magazine online și aplicații: conturi, coș, plăți, emailuri, performanță, securitate de bază și accesibilitate."
                  : "Extended manual testing for stores and apps: accounts, cart, payments, emails, performance, baseline security and accessibility.",
                priceEur: 700,
              },
              {
                name: ro ? "Automatizare end-to-end" : "End-to-end automation",
                description: ro
                  ? "Suită de teste automate Playwright pentru fluxurile critice, integrată în pipeline, livrată o singură dată și rămâne a ta."
                  : "A Playwright automated suite for your critical flows, wired into the pipeline, delivered once and yours to keep.",
                priceEur: 1200,
              },
            ],
          }),
        );
        setJsonLd("ld-faq", faqPageLd(faq));
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Servicii AVYRON" : "AVYRON Services", path: ro ? "/servicii" : "/en/services" },
            { name: "QA Testing Web/Mobile", path },
          ]),
        );
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ro]);









  const active = modes[mode];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <ServiceCinematicIntro service="qa-testing" />
      <QuickNav
        items={[
          { id: "moduri", label: ro ? "Moduri de testare" : "Testing modes", icon: FlaskConical },
          { id: "tipuri", label: ro ? "Tipuri de teste" : "Test types", icon: Layers },
          { id: "proces", label: ro ? "Proces" : "Process", icon: Workflow },
          { id: "preturi", label: ro ? "Prețuri" : "Pricing", icon: Sparkles },
          { id: "intrebari", label: ro ? "Întrebări" : "FAQ", icon: MessageCircle },
        ]}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(132,204,22,0.16),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.14),transparent_50%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-6 sm:pt-8 pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <PageBackLink
            to={ro ? "/servicii" : "/en/services"}
            label={ro ? "Înapoi" : "Back"}
            title={ro ? "Înapoi la servicii" : "Back to services"}
          />
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
              <LangSwitch />
              <span aria-hidden className="w-px h-3 bg-foreground/15" />
              <ThemeToggle />
            </div>
            <a
              href={ro ? "/#hero" : "/en#hero"}
              aria-label={ro ? "Acasă" : "Home"}
              className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-foreground/5 transition-colors"
            >
              <img src={logo} alt="Avyron" width={32} height={32} className="size-7 sm:size-8 rounded-md ring-1 ring-foreground/15" />
              <span className="font-display tracking-[0.2em] text-xs sm:text-sm">AVYRON</span>
            </a>
          </div>
        </div>

        <Breadcrumbs
          className="mt-6"
          items={[
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Servicii AVYRON" : "AVYRON Services", path: ro ? "/servicii" : "/en/services" },
            { name: "QA Testing Web/Mobile", path },
          ]}
        />

        {/* Hero */}
        <Reveal as="section" className="mt-8 sm:mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-lime-700 dark:text-lime-200">
            <Bug className="size-3.5" aria-hidden />
            {(ro ? serviceInlineCopy.text_ba5b15e4766b.ro : serviceInlineCopy.text_ba5b15e4766b.en)}
          </div>
          <h1 className="mt-5 font-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.08] tracking-tight">
            <span className="bg-gradient-to-r from-lime-400 to-cyan-500 bg-clip-text text-transparent">
              QA Testing Web/Mobile
            </span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">
            {(ro ? serviceInlineCopy.text_8c090dd5849a.ro : serviceInlineCopy.text_8c090dd5849a.en)}
          </p>
          <p className="mt-5 max-w-2xl text-base md:text-lg text-foreground/75 leading-relaxed">
            {(ro ? serviceInlineCopy.text_1ab37e15fdbe.ro : serviceInlineCopy.text_1ab37e15fdbe.en)}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={`${WHATSAPP}${encodeURIComponent(
                ro
                  ? "Bună! Aș dori o ofertă de QA Testing pentru produsul meu web / mobil."
                  : "Hi! I'd like a QA testing quote for my web / mobile product.",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "qa_hero" })}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-lime-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
            >
              {(ro ? serviceInlineCopy.text_c5594aef05cf.ro : serviceInlineCopy.text_c5594aef05cf.en)}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </a>
            <a
              href="#preturi"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-3 text-sm font-semibold transition-all hover:bg-foreground/[0.12]"
            >
              {(ro ? serviceInlineCopy.text_6c33a40d7f61.ro : serviceInlineCopy.text_6c33a40d7f61.en)}
            </a>
            <CurrencySwitch compact fixedPricing accent="emerald" />
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: (ro ? serviceInlineCopy.text_805afc9c847a.ro : serviceInlineCopy.text_805afc9c847a.en), v: fmt(1600, 300) },
              { k: (ro ? serviceInlineCopy.text_859e040a3ae9.ro : serviceInlineCopy.text_859e040a3ae9.en), v: (ro ? serviceInlineCopy.text_7ec4f9454d36.ro : serviceInlineCopy.text_7ec4f9454d36.en) },
              { k: (ro ? serviceInlineCopy.text_7df636a75c6b.ro : serviceInlineCopy.text_7df636a75c6b.en), v: (ro ? serviceInlineCopy.text_c1e79fc2295c.ro : serviceInlineCopy.text_c1e79fc2295c.en) },
              { k: (ro ? serviceInlineCopy.text_2e77f60b61a3.ro : serviceInlineCopy.text_2e77f60b61a3.en), v: (ro ? serviceInlineCopy.text_d437510b768d.ro : serviceInlineCopy.text_d437510b768d.en) },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 text-center backdrop-blur">
                <dt className="text-[10px] uppercase tracking-[0.2em] text-foreground/50">{s.k}</dt>
                <dd className="mt-1 font-display text-lg font-extrabold">{s.v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* Testing modes */}
        <section id="moduri" className="mt-16 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {(ro ? serviceInlineCopy.text_a8789a9f2a91.ro : serviceInlineCopy.text_a8789a9f2a91.en)}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-foreground/70 leading-relaxed">
              {(ro ? serviceInlineCopy.text_4af6a27b93ca.ro : serviceInlineCopy.text_4af6a27b93ca.en)}
            </p>
          </Reveal>

          <div className="mt-6 inline-flex rounded-full border border-foreground/15 bg-foreground/[0.04] p-1 backdrop-blur" role="tablist" aria-label={ro ? "Moduri de testare" : "Testing modes"}>
            {(["manual", "auto"] as const).map((m) => {
              const Icon = modes[m].icon;
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  aria-controls={`mode-panel-${m}`}
                  id={`mode-tab-${m}`}
                  onClick={() => setMode(m)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    mode === m ? "bg-gradient-to-r from-lime-500 to-emerald-600 text-white shadow" : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  {modes[m].label}
                </button>
              );
            })}
          </div>

          <div
            id={`mode-panel-${mode}`}
            role="tabpanel"
            aria-labelledby={`mode-tab-${mode}`}
            className="mt-5 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur"
          >
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{active.lead}</p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {active.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-foreground/85">
                  <Check className="mt-0.5 size-4 shrink-0 text-lime-600 dark:text-lime-400" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {active.tools.map((t) => (
                <span key={t} className="rounded-full border border-foreground/15 bg-foreground/[0.05] px-3 py-1 text-[11px] font-mono text-foreground/70">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Test types */}
        <section id="tipuri" className="mt-16 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {(ro ? serviceInlineCopy.text_d14bf9279135.ro : serviceInlineCopy.text_d14bf9279135.en)}
            </h2>
          </Reveal>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((t, i) => (
              <Reveal key={t.title} delay={i * 40} as="article">
                <div className="group h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-lime-300/35">
                  <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-lime-400 to-emerald-600 text-white transition-transform duration-300 group-hover:scale-110">
                    <t.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold">{t.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">{t.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Devices */}
        <section className="mt-16">
          <Reveal>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur">
              <h2 className="font-display text-xl md:text-2xl font-extrabold">
                {(ro ? serviceInlineCopy.text_52c8ef8178b5.ro : serviceInlineCopy.text_52c8ef8178b5.en)}
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                {[
                  {
                    icon: Smartphone,
                    title: (ro ? serviceInlineCopy.text_c21d155b91d3.ro : serviceInlineCopy.text_c21d155b91d3.en),
                    list: ["iPhone (Safari, iOS)", "Android (Chrome, Samsung Internet)", (ro ? serviceInlineCopy.text_d311c76bc945.ro : serviceInlineCopy.text_d311c76bc945.en)],
                  },
                  {
                    icon: Monitor,
                    title: "Desktop",
                    list: ["Chrome, Edge", "Safari (macOS)", "Firefox", "1280 → 2560 px"],
                  },
                  {
                    icon: Globe,
                    title: (ro ? serviceInlineCopy.text_5ea5a40715ee.ro : serviceInlineCopy.text_5ea5a40715ee.en),
                    list: [(ro ? serviceInlineCopy.text_b26bf67235e0.ro : serviceInlineCopy.text_b26bf67235e0.en), (ro ? serviceInlineCopy.text_aa4ab03eeac1.ro : serviceInlineCopy.text_aa4ab03eeac1.en), (ro ? serviceInlineCopy.text_9ecc7f9698ff.ro : serviceInlineCopy.text_9ecc7f9698ff.en)],
                  },
                ].map((d) => (
                  <div key={d.title}>
                    <div className="flex items-center gap-2">
                      <d.icon className="size-4 text-lime-600 dark:text-lime-400" aria-hidden />
                      <h3 className="font-display text-sm font-bold uppercase tracking-wider">{d.title}</h3>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {d.list.map((l) => (
                        <li key={l} className="text-sm text-foreground/70">{l}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* Process */}
        <section id="proces" className="mt-16 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {(ro ? serviceInlineCopy.text_b296e1b9359a.ro : serviceInlineCopy.text_b296e1b9359a.en)}
            </h2>
          </Reveal>
          <ol className="mt-7 space-y-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 60} as="li">
                <div className="flex gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lime-400 to-emerald-600 font-display text-sm font-extrabold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/70">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <section id="preturi" className="mt-16 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {(ro ? serviceInlineCopy.text_39b11b386e26.ro : serviceInlineCopy.text_39b11b386e26.en)}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-foreground/70 leading-relaxed">
              {(ro ? serviceInlineCopy.text_f4bdd7d241b5.ro : serviceInlineCopy.text_f4bdd7d241b5.en)}
            </p>
          </Reveal>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {packages.map((p, i) => (
              <Reveal key={p.key} delay={i * 70} as="article">
                <div
                  className={`relative h-full rounded-2xl border p-6 backdrop-blur transition-all duration-500 hover:-translate-y-1.5 ${
                    p.highlight
                      ? "border-emerald-300/40 bg-gradient-to-b from-emerald-500/10 to-foreground/[0.02] shadow-[0_30px_80px_-30px_rgba(16,185,129,0.4)]"
                      : "border-foreground/10 bg-foreground/[0.03] hover:border-foreground/25"
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-background">
                      {(ro ? serviceInlineCopy.text_ec3e71150dd9.ro : serviceInlineCopy.text_ec3e71150dd9.en)}
                    </div>
                  )}
                  <div className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${p.accent} text-white`}>
                    <p.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-extrabold">{p.name}</h3>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-foreground/60">
                    <Clock className="size-3.5" aria-hidden />
                    {p.time}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-xs text-foreground/50">{(ro ? serviceInlineCopy.text_d9e6b8bc2f02.ro : serviceInlineCopy.text_d9e6b8bc2f02.en)}</span>
                    <span className="font-display text-3xl font-extrabold">{fmt(p.ron, p.eur)}</span>
                    <span className="text-xs text-foreground/50">{(ro ? serviceInlineCopy.text_0669bd572317.ro : serviceInlineCopy.text_0669bd572317.en)}</span>
                  </div>
                  <p className="mt-4 text-sm text-foreground/70">
                    <span className="font-semibold text-foreground/85">{(ro ? serviceInlineCopy.text_fb351a39ff8d.ro : serviceInlineCopy.text_fb351a39ff8d.en)}</span>
                    {p.bestFor}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                        <Check className="mt-0.5 size-4 shrink-0 text-lime-600 dark:text-lime-400" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`${WHATSAPP}${encodeURIComponent(
                      ro ? `Bună! Vreau ${p.name} pentru produsul meu.` : `Hi! I'd like the ${p.name} for my product.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "qa_package", product: p.key })}
                    className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                      p.highlight
                        ? "bg-emerald-400 text-background hover:bg-emerald-300"
                        : "border border-foreground/15 bg-foreground/[0.06] hover:bg-foreground/[0.12]"
                    }`}
                  >
                    {(ro ? serviceInlineCopy.text_b16a46159d55.ro : serviceInlineCopy.text_b16a46159d55.en)}
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-5 rounded-xl border border-lime-300/25 bg-lime-400/[0.06] p-3 text-center text-xs text-foreground/70">
            {(ro ? serviceInlineCopy.text_ec6aada91f16.ro : serviceInlineCopy.text_ec6aada91f16.en)}
          </p>
        </section>

        {/* Deliverables */}
        <section className="mt-16">
          <Reveal>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur">
              <h2 className="font-display text-xl md:text-2xl font-extrabold">
                {(ro ? serviceInlineCopy.text_fffd7d37dbc5.ro : serviceInlineCopy.text_fffd7d37dbc5.en)}
              </h2>
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {(ro
                  ? [
                      "Plan de testare adaptat fluxurilor tale",
                      "Scenarii de test documentate, care rămân ale tale",
                      "Raport de defecte cu severitate și pași de reproducere",
                      "Capturi de ecran și înregistrări video pentru fiecare problemă",
                      "Prioritizarea remedierilor după impactul asupra afacerii",
                      "Retestare după remedieri și rundă de regresie",
                      "Recomandări de prevenire pentru lansările viitoare",
                      "Ședință de prezentare a rezultatelor (30 de minute)",
                    ]
                  : [
                      "A test plan tailored to your flows",
                      "Documented test cases that stay with you",
                      "Defect report with severity and reproduction steps",
                      "Screenshots and video recordings for every issue",
                      "Fix prioritisation by business impact",
                      "Retesting after fixes and a regression pass",
                      "Prevention recommendations for future releases",
                      "A 30-minute results walkthrough session",
                    ]
                ).map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-foreground/85">
                    <RefreshCw className="mt-0.5 size-4 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="intrebari" className="mt-16 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {(ro ? serviceInlineCopy.text_48a83c853f46.ro : serviceInlineCopy.text_48a83c853f46.en)}
            </h2>
          </Reveal>
          <div className="mt-6 space-y-3">
            {faq.map((f, i) => (
              <Reveal key={f.q} delay={i * 40}>
                <details className="group rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur">
                  <summary className="cursor-pointer list-none font-display text-base font-bold marker:hidden">
                    <span className="flex items-start justify-between gap-3">
                      {f.q}
                      <ArrowRight className="mt-1 size-4 shrink-0 transition-transform duration-300 group-open:rotate-90" aria-hidden />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/75">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="mt-16 scroll-mt-28">
          <Reveal>
            <div className="rounded-3xl border border-lime-300/25 bg-gradient-to-br from-lime-400/10 to-cyan-500/[0.06] p-7 text-center backdrop-blur">
              <h2 className="font-display text-2xl md:text-3xl font-extrabold">
                {(ro ? serviceInlineCopy.text_cc6ea0ed3d71.ro : serviceInlineCopy.text_cc6ea0ed3d71.en)}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground/75 leading-relaxed">
                {(ro ? serviceInlineCopy.text_3b3ccec80a6b.ro : serviceInlineCopy.text_3b3ccec80a6b.en)}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`${WHATSAPP}${encodeURIComponent(
                    ro ? "Bună! Aș dori o ofertă de QA Testing." : "Hi! I'd like a QA testing quote.",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "qa_cta" })}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-lime-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  {(ro ? serviceInlineCopy.text_559b84309428.ro : serviceInlineCopy.text_559b84309428.en)}
                </a>
                <a
                  href="mailto:contact@avyron.ro?subject=QA%20Testing"
                  onClick={() => trackEvent("contact_click", { method: "email", location: "qa_cta" })}
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-6 py-3 text-sm font-semibold transition-all hover:bg-foreground/[0.12]"
                >
                  contact@avyron.ro
                </a>
              </div>
            </div>
          </Reveal>
        </section>

        <LibraryLink />
      </div>

      <Footer />
    </main>
  );
};

export default function ManagedQaTestingPage(){return <ServiceContentProvider><QaTestingPage/></ServiceContentProvider>;}
