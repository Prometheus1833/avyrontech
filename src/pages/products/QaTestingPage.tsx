import { useEffect, useState } from "react";
import {
  Accessibility,
  ArrowRight,
  Bug,
  Check,
  ClipboardList,
  Clock,
  Cpu,
  FileSearch,
  FlaskConical,
  Gauge,
  Globe,
  Hand,
  Layers,
  Lock,
  MessageCircle,
  Monitor,
  RefreshCw,
  Repeat,
  Smartphone,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageBackLink from "@/components/site/PageBackLink";
import QuickNav from "@/components/site/QuickNav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import CurrencySwitch from "@/components/site/CurrencySwitch";
import logo from "@/assets/avyron-logo.jpg";
import { trackEvent } from "@/lib/analytics";
import { useCurrency } from "@/hooks/useCurrency";

const WHATSAPP = "https://wa.me/40734605055?text=";

const QaTestingPage = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { formatEur: fmt } = useCurrency(ro ? "ro-RO" : "en-IE");
  const [mode, setMode] = useState<"manual" | "auto">("manual");

  const path = ro ? "/produse/testare-qa-web-mobile" : "/en/products/qa-testing-web-mobile";

  const faq = ro
    ? [
        { q: "Este un abonament lunar?", a: "Nu. Testarea QA se contractează pe proiect sau pe sprint, cu preț fix agreat înainte de start. Plătești o singură dată pentru runda de testare, iar retestarea defectelor raportate este inclusă." },
        { q: "Ce înseamnă testare manuală și ce înseamnă testare automată?", a: "Testarea manuală înseamnă că un tester parcurge fluxurile ca un client real, pe dispozitive fizice, și caută inclusiv problemele pe care un script nu le vede. Testarea automată înseamnă scripturi end-to-end care repetă aceleași verificări la fiecare actualizare, în câteva minute." },
        { q: "Testați și aplicații mobile native?", a: "Da. Testăm aplicații Android și iOS, native sau hibride, inclusiv build-uri din TestFlight sau Google Play Internal Testing, pe dispozitive reale și emulatoare." },
        { q: "Ce primesc la final?", a: "Un raport de defecte cu severitate, pași de reproducere, capturi sau înregistrări video, impactul asupra utilizatorului și recomandarea de remediere, plus setul de scenarii de test care rămâne al tău." },
        { q: "Reparați și defectele găsite?", a: "Putem. Remedierea se cotează separat, în funcție de complexitate. Dacă lucrezi cu altă echipă de dezvoltare, raportul este suficient de detaliat ca ei să intervină direct." },
        { q: "Cât durează o rundă de testare?", a: "Între 3 și 10 zile lucrătoare pentru majoritatea proiectelor. Un site de prezentare se acoperă în 3–4 zile, un magazin online sau o aplicație cu conturi și plăți în 7–10 zile." },
        { q: "Cât costă?", a: "De la 300€ pentru o rundă completă pe un site de prezentare. Pentru magazine online, aplicații și platforme cotăm în funcție de numărul de fluxuri critice și de dispozitivele acoperite." },
      ]
    : [
        { q: "Is this a monthly subscription?", a: "No. QA testing is contracted per project or per sprint, at a fixed price agreed before we start. You pay once for the testing round, and retesting of reported defects is included." },
        { q: "What is manual testing and what is automated testing?", a: "Manual testing means a tester walks your flows like a real customer, on physical devices, catching issues a script never sees. Automated testing means end-to-end scripts that repeat the same checks on every release, in minutes." },
        { q: "Do you test native mobile apps?", a: "Yes. We test Android and iOS apps, native or hybrid, including TestFlight and Google Play Internal Testing builds, on real devices and emulators." },
        { q: "What do I receive at the end?", a: "A defect report with severity, reproduction steps, screenshots or video recordings, user impact and a fix recommendation, plus the test case set which stays yours." },
        { q: "Do you also fix the defects you find?", a: "We can. Fixing is quoted separately based on complexity. If you work with another development team, the report is detailed enough for them to act directly." },
        { q: "How long does a testing round take?", a: "Between 3 and 10 working days for most projects. A presentation website is covered in 3–4 days; an online store or an app with accounts and payments in 7–10 days." },
        { q: "How much does it cost?", a: "From €300 for a full round on a presentation website. For stores, apps and platforms we quote based on the number of critical flows and the devices covered." },
      ];

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro
      ? "QA Testing Web/Mobile — testare manuală și automată, de la 300€ | Avyron"
      : "QA Testing Web/Mobile — manual and automated testing, from €300 | Avyron";
    const description = ro
      ? "Servicii QA Testing pentru web și mobile: testare funcțională, regresie, cross-browser, dispozitive reale, performanță, securitate, accesibilitate și automatizare end-to-end. Pe proiect, fără abonament, de la 300€."
      : "QA testing services for web and mobile: functional, regression, cross-browser, real devices, performance, security, accessibility and end-to-end automation. Per project, no subscription, from €300.";
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, offerCatalogLd, faqPageLd }]) => {
        setPageMeta({
          title,
          description,
          path,
          alternates: {
            ro: "/produse/testare-qa-web-mobile",
            en: "/en/products/qa-testing-web-mobile",
          },
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-service",
          serviceLd({
            name: ro ? "QA Testing Web/Mobile" : "QA Testing Web/Mobile",
            description,
            path,
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
            { name: ro ? "Costuri & Produse" : "Pricing & Products", path: ro ? "/costurisiproduse" : "/en/pricing" },
            { name: "QA Testing Web/Mobile", path },
          ]),
        );
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ro]);

  const modes = {
    manual: {
      label: ro ? "Testare manuală" : "Manual testing",
      icon: Hand,
      lead: ro
        ? "Un tester parcurge produsul exact ca un client real: greșește, se răzgândește, pierde semnalul, apasă butonul de două ori. Aici apar problemele pe care niciun script nu le anticipează."
        : "A tester walks your product exactly like a real customer: makes mistakes, changes their mind, loses signal, taps a button twice. This is where the issues no script anticipates show up.",
      points: ro
        ? [
            "Testare exploratorie pe fluxurile tale de business",
            "Scenarii negative: date greșite, stoc epuizat, plată refuzată",
            "Verificare pe dispozitive fizice Android și iOS",
            "Control vizual: layout, texte, imagini, stări de eroare",
            "Testare de acceptanță (UAT) împreună cu tine",
            "Verificarea emailurilor tranzacționale și a facturilor",
          ]
        : [
            "Exploratory testing across your business flows",
            "Negative scenarios: bad data, out of stock, declined payment",
            "Checks on physical Android and iOS devices",
            "Visual control: layout, copy, images, error states",
            "User acceptance testing (UAT) together with you",
            "Transactional email and invoice verification",
          ],
      tools: ["Dispozitive fizice", "BrowserStack", "Charles Proxy", "TestRail / Notion", "DevTools"],
    },
    auto: {
      label: ro ? "Testare automată" : "Automated testing",
      icon: Terminal,
      lead: ro
        ? "Scripturile rulează aceleași verificări la fiecare actualizare, în câteva minute, și prind regresiile înainte să ajungă la clienți. Suita rămâne a ta și poate fi extinsă oricând."
        : "Scripts run the same checks on every release, in minutes, catching regressions before they reach customers. The suite stays yours and can be extended any time.",
      points: ro
        ? [
            "Teste end-to-end pe fluxurile critice (Playwright)",
            "Testare de regresie automată la fiecare deploy",
            "Verificări API și contract pentru integrări",
            "Teste de performanță și încărcare simultană (k6)",
            "Audit automat de accesibilitate (axe) și Lighthouse",
            "Rulare în pipeline CI, cu raport și capturi la fiecare eșec",
          ]
        : [
            "End-to-end tests on critical flows (Playwright)",
            "Automated regression testing on every deploy",
            "API and contract checks for your integrations",
            "Performance and concurrent load tests (k6)",
            "Automated accessibility (axe) and Lighthouse audits",
            "CI pipeline runs, with a report and screenshots on each failure",
          ],
      tools: ["Playwright", "Vitest", "k6", "axe-core", "Lighthouse CI", "GitHub Actions"],
    },
  } as const;

  const types = ro
    ? [
        { icon: Check, title: "Funcțional", desc: "Cont, căutare, coș, checkout, plată, formulare, notificări, zona de administrare." },
        { icon: Repeat, title: "Regresie", desc: "Ne asigurăm că o modificare nouă nu strică ce funcționa deja înainte." },
        { icon: FileSearch, title: "Exploratoriu", desc: "Testare liberă, fără scenariu fix, exact acolo unde apar defectele neașteptate." },
        { icon: Monitor, title: "Cross-browser", desc: "Chrome, Safari, Firefox și Edge, pe rezoluții și sisteme de operare diferite." },
        { icon: Smartphone, title: "Mobil real", desc: "Telefoane Android și iPhone fizice, tablete, ecrane mici și telefoane vechi." },
        { icon: Gauge, title: "Performanță", desc: "Core Web Vitals, timpi de răspuns, internet lent și trafic simultan crescut." },
        { icon: Lock, title: "Securitate de bază", desc: "Validări de input, protecția formularelor, roluri, sesiuni și expunerea datelor." },
        { icon: Accessibility, title: "Accesibilitate", desc: "Navigare din tastatură, contrast, etichete pentru cititoare de ecran, criterii WCAG." },
        { icon: Layers, title: "API și integrări", desc: "Plăți, curierat, facturare, CRM, email — verificate inclusiv pe erorile lor." },
        { icon: Globe, title: "Localizare și SEO tehnic", desc: "Limbi, monede, formate de dată, titluri, meta, canonice și date structurate." },
        { icon: Cpu, title: "Compatibilitate", desc: "Comportament pe conexiuni instabile, browsere vechi și moduri de economisire." },
        { icon: ClipboardList, title: "Acceptanță (UAT)", desc: "Validarea finală înainte de lansare, împreună cu tine, pe criterii agreate." },
      ]
    : [
        { icon: Check, title: "Functional", desc: "Account, search, cart, checkout, payment, forms, notifications, admin area." },
        { icon: Repeat, title: "Regression", desc: "We make sure a new change doesn't break what already worked." },
        { icon: FileSearch, title: "Exploratory", desc: "Free-form testing with no fixed script, right where unexpected defects live." },
        { icon: Monitor, title: "Cross-browser", desc: "Chrome, Safari, Firefox and Edge across resolutions and operating systems." },
        { icon: Smartphone, title: "Real mobile", desc: "Physical Android phones and iPhones, tablets, small screens and older devices." },
        { icon: Gauge, title: "Performance", desc: "Core Web Vitals, response times, slow networks and increased concurrent traffic." },
        { icon: Lock, title: "Baseline security", desc: "Input validation, form protection, roles, sessions and data exposure." },
        { icon: Accessibility, title: "Accessibility", desc: "Keyboard navigation, contrast, screen reader labels, WCAG criteria." },
        { icon: Layers, title: "API and integrations", desc: "Payments, shipping, invoicing, CRM, email — including their failure paths." },
        { icon: Globe, title: "Localization and technical SEO", desc: "Languages, currencies, date formats, titles, meta, canonicals, structured data." },
        { icon: Cpu, title: "Compatibility", desc: "Behaviour on unstable connections, older browsers and data-saving modes." },
        { icon: ClipboardList, title: "Acceptance (UAT)", desc: "The final validation before launch, together with you, on agreed criteria." },
      ];

  const steps = ro
    ? [
        { title: "Analiză și plan", desc: "Stabilim ce testăm, pe ce dispozitive și care sunt fluxurile critice pentru afacere." },
        { title: "Scenarii de test", desc: "Scriem cazurile de test, inclusiv cele negative, și le agreăm împreună înainte de start." },
        { title: "Execuție", desc: "Rulăm manual pe dispozitive reale și automat acolo unde repetabilitatea aduce valoare." },
        { title: "Raportare", desc: "Fiecare defect primește severitate, pași de reproducere, dovadă vizuală și impact." },
        { title: "Retestare", desc: "După remedieri retestăm defectele și rulăm o rundă de regresie pe zonele atinse." },
      ]
    : [
        { title: "Analysis and plan", desc: "We define what we test, on which devices, and which flows are business critical." },
        { title: "Test scenarios", desc: "We write the test cases, negative ones included, and agree them before we start." },
        { title: "Execution", desc: "We run manually on real devices and automatically where repeatability pays off." },
        { title: "Reporting", desc: "Every defect gets severity, reproduction steps, visual evidence and impact." },
        { title: "Retesting", desc: "After fixes we retest the defects and run a regression pass on the affected areas." },
      ];

  const packages = [
    {
      key: "esential",
      eur: 300,
      icon: Bug,
      accent: "from-lime-400 to-emerald-600",
      name: ro ? "Rundă esențială" : "Essential round",
      time: ro ? "3–4 zile" : "3–4 days",
      bestFor: ro ? "Site de prezentare, blog, pagină de campanie" : "Presentation site, blog, campaign page",
      features: ro
        ? ["Testare manuală funcțională", "Cross-browser desktop + mobil", "Formulare, emailuri, SEO tehnic de bază", "Raport de defecte cu severitate", "O retestare inclusă"]
        : ["Manual functional testing", "Cross-browser desktop + mobile", "Forms, emails, baseline technical SEO", "Defect report with severity", "One retest included"],
    },
    {
      key: "complet",
      eur: 700,
      icon: FlaskConical,
      highlight: true,
      accent: "from-emerald-400 to-cyan-600",
      name: ro ? "Rundă completă" : "Full round",
      time: ro ? "7–10 zile" : "7–10 days",
      bestFor: ro ? "Magazin online, aplicație cu conturi și plăți" : "Online store, app with accounts and payments",
      features: ro
        ? ["Tot din runda esențială", "Conturi, coș, checkout, plăți, facturare", "Dispozitive fizice Android și iOS", "Performanță, securitate de bază, accesibilitate", "Două retestări și regresie inclusă"]
        : ["Everything in the essential round", "Accounts, cart, checkout, payments, invoicing", "Physical Android and iOS devices", "Performance, baseline security, accessibility", "Two retests and regression included"],
    },
    {
      key: "automat",
      eur: 1200,
      icon: Workflow,
      accent: "from-cyan-400 to-blue-600",
      name: ro ? "Automatizare end-to-end" : "End-to-end automation",
      time: ro ? "10–15 zile" : "10–15 days",
      bestFor: ro ? "Produse cu lansări frecvente și echipă de dezvoltare" : "Products with frequent releases and a dev team",
      features: ro
        ? ["Suită Playwright pe fluxurile critice", "Rulare automată în pipeline la fiecare deploy", "Teste API și verificări de performanță", "Rapoarte cu capturi la fiecare eșec", "Cod și documentație predate ție"]
        : ["Playwright suite on your critical flows", "Automatic pipeline runs on every deploy", "API tests and performance checks", "Reports with screenshots on every failure", "Code and documentation handed over to you"],
    },
  ];

  const active = modes[mode];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
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
            to={ro ? "/costurisiproduse" : "/en/pricing"}
            label={ro ? "Înapoi" : "Back"}
            title={ro ? "Înapoi la produse" : "Back to products"}
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
            { name: ro ? "Costuri & Produse" : "Pricing & Products", path: ro ? "/costurisiproduse" : "/en/pricing" },
            { name: "QA Testing Web/Mobile", path },
          ]}
        />

        {/* Hero */}
        <Reveal as="section" className="mt-8 sm:mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-lime-700 dark:text-lime-200">
            <Bug className="size-3.5" aria-hidden />
            {ro ? "Pe proiect · fără abonament" : "Per project · no subscription"}
          </div>
          <h1 className="mt-5 font-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.08] tracking-tight">
            <span className="bg-gradient-to-r from-lime-400 to-cyan-500 bg-clip-text text-transparent">
              QA Testing Web/Mobile
            </span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">
            {ro
              ? "Manual · Automat · Funcțional · Regresie · Performanță · Securitate"
              : "Manual · Automated · Functional · Regression · Performance · Security"}
          </p>
          <p className="mt-5 max-w-2xl text-base md:text-lg text-foreground/75 leading-relaxed">
            {ro
              ? "Testăm site-ul, magazinul sau aplicația ta exact cum o face un client real — manual, pe telefoane și browsere adevărate, și automat, prin scripturi care se repetă la fiecare actualizare. Primești un raport clar, cu fiecare defect reprodus pas cu pas și cu prioritatea de remediere."
              : "We test your site, store or app exactly the way a real customer does — manually, on real phones and browsers, and automatically, through scripts that repeat on every release. You get a clear report with every defect reproduced step by step and a fix priority."}
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
              {ro ? "Vreau o ofertă de testare" : "I want a testing quote"}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </a>
            <a
              href="#preturi"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-3 text-sm font-semibold transition-all hover:bg-foreground/[0.12]"
            >
              {ro ? "Vezi prețurile" : "See pricing"}
            </a>
            <CurrencySwitch compact accent="emerald" />
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: ro ? "De la" : "From", v: fmt(300) },
              { k: ro ? "Durată" : "Duration", v: ro ? "3–10 zile" : "3–10 days" },
              { k: ro ? "Retestare" : "Retesting", v: ro ? "Inclusă" : "Included" },
              { k: ro ? "Abonament" : "Subscription", v: ro ? "Niciunul" : "None" },
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
              {ro ? "Două moduri de testare, un singur raport" : "Two testing modes, one report"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-foreground/70 leading-relaxed">
              {ro
                ? "Testarea manuală găsește ce nu poate fi anticipat. Testarea automată se asigură că nu revine. Pe proiectele reale le folosim împreună, în proporția potrivită produsului tău."
                : "Manual testing finds what can't be anticipated. Automated testing makes sure it doesn't come back. On real projects we combine them in the proportion your product needs."}
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
              {ro ? "Ce testăm, concret" : "What we test, concretely"}
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
                {ro ? "Pe ce testăm" : "Where we test"}
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                {[
                  {
                    icon: Smartphone,
                    title: ro ? "Mobil" : "Mobile",
                    list: ["iPhone (Safari, iOS)", "Android (Chrome, Samsung Internet)", ro ? "Telefoane vechi și ecrane mici" : "Older phones and small screens"],
                  },
                  {
                    icon: Monitor,
                    title: "Desktop",
                    list: ["Chrome, Edge", "Safari (macOS)", "Firefox", "1280 → 2560 px"],
                  },
                  {
                    icon: Globe,
                    title: ro ? "Condiții reale" : "Real conditions",
                    list: [ro ? "Internet lent (3G)" : "Slow network (3G)", ro ? "Trafic simultan" : "Concurrent traffic", ro ? "Mod întunecat și zoom 200%" : "Dark mode and 200% zoom"],
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
              {ro ? "Cum decurge o rundă de testare" : "How a testing round works"}
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
              {ro ? "Preț fix pe rundă, fără abonament" : "Fixed price per round, no subscription"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-foreground/70 leading-relaxed">
              {ro
                ? "Plătești o singură dată pentru runda de testare agreată. Nu există reînnoire automată și nici costuri lunare — dacă vrei o nouă rundă după o lansare, o comanzi atunci."
                : "You pay once for the agreed testing round. There is no automatic renewal and no monthly cost — if you want another round after a release, you order it then."}
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
                      {ro ? "Cel mai ales" : "Most chosen"}
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
                    <span className="text-xs text-foreground/50">{ro ? "de la" : "from"}</span>
                    <span className="font-display text-3xl font-extrabold">{fmt(p.eur)}</span>
                    <span className="text-xs text-foreground/50">{ro ? "· o singură plată" : "· one-time"}</span>
                  </div>
                  <p className="mt-4 text-sm text-foreground/70">
                    <span className="font-semibold text-foreground/85">{ro ? "Potrivit pentru: " : "Best for: "}</span>
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
                    {ro ? "Cere ofertă" : "Request a quote"}
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-5 rounded-xl border border-lime-300/25 bg-lime-400/[0.06] p-3 text-center text-xs text-foreground/70">
            {ro
              ? "Prețurile sunt orientative și se confirmă după o discuție scurtă despre fluxurile critice. Remedierea defectelor se cotează separat."
              : "Prices are indicative and confirmed after a short discussion about your critical flows. Fixing defects is quoted separately."}
          </p>
        </section>

        {/* Deliverables */}
        <section className="mt-16">
          <Reveal>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur">
              <h2 className="font-display text-xl md:text-2xl font-extrabold">
                {ro ? "Ce primești la final" : "What you receive"}
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
              {ro ? "Întrebări frecvente" : "Frequently asked questions"}
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
                {ro ? "Lansezi în curând sau ai deja probleme raportate?" : "Launching soon or already getting bug reports?"}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground/75 leading-relaxed">
                {ro
                  ? "Spune-ne ce produs ai și primești un plan de testare și o cotație clară în 24 de ore. Fără abonament și fără costuri ascunse."
                  : "Tell us about your product and get a test plan and a clear quote within 24 hours. No subscription, no hidden costs."}
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
                  {ro ? "Discută pe WhatsApp" : "Chat on WhatsApp"}
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
      </div>

      <Footer />
    </main>
  );
};

export default QaTestingPage;
