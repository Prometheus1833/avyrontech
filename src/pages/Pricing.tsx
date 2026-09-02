import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowRight, ScanSearch, Gauge, Accessibility, Check, CreditCard, Building2, Link2, FileText, Zap, Crown, Shield, RefreshCw, Hourglass, Globe, Instagram, Facebook, Music2, Image as ImageIcon, MessageCircle, Share2, Calendar, BadgeCheck, ShoppingBag, Package, Truck, Tag, BarChart3, Smartphone, Apple, Layers, Code2, Bell, Cloud, Cpu, Bug, FlaskConical, HeartHandshake } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import logo from "@/assets/avyron-logo.jpg";
import premiumTech352Avif from "@/assets/premium-website-mockup-352.avif";
import premiumTech704Avif from "@/assets/premium-website-mockup-704.avif";
import premiumTech352Webp from "@/assets/premium-website-mockup-352.webp";
import premiumTech704Webp from "@/assets/premium-website-mockup-704.webp";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import CurrencySwitch from "@/components/site/CurrencySwitch";
import PageBackLink from "@/components/site/PageBackLink";
import { useCurrency } from "@/hooks/useCurrency";

/**
 * PlayStation-inspired pricing page.
 * - Deep navy/black background with neon-blue accents
 * - PS shape glyphs (▲ ◯ ✕ ◻) as decorative tags for each tier
 * - Glass cards, sharp grid, monospaced labels
 */

const PS_SHAPES = {
  triangle: "△",
  circle: "○",
  cross: "✕",
  square: "□",
};

type Tier = {
  key: "plus" | "pro" | "proactiv";
  shape: keyof typeof PS_SHAPES;
  name: string;
  price: string;
  annualPrice: string;
  bestFor: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
  icon: React.ReactNode;
  accent: string; // tailwind classes for shape color
};

const PRODUCT_SUMMARY_LIMIT = 7;

const Pricing = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { formatEur: fmt } = useCurrency(ro ? "ro-RO" : "en-IE");

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro
      ? "Produse digitale personalizate & prețuri | Avyron"
      : "Custom Digital Products & Pricing | Avyron";
    const description = ro
      ? "Descoperă produse digitale Avyron proiectate distinct: site-uri, magazine online, aplicații și soluții AI cu funcționalități, infrastructură și integrări adaptate fiecărui proiect."
      : "Explore distinct Avyron digital products: websites, online stores, apps and AI solutions with features, infrastructure and integrations tailored to each project.";
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd }]) => {
        setPageMeta({
          title,
          description,
          path: ro ? "/costurisiproduse" : "/en/pricing",
          alternates: { ro: "/costurisiproduse", en: "/en/pricing" },
          image: "/og/pricing.jpg",
          imageAlt: ro
            ? "Pachete de prețuri Avyron — site-uri web, magazine online și mentenanță"
            : "Avyron pricing packages — websites, online stores and care plans",
        });

        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Costuri & Produse" : "Pricing & Products",
              path: ro ? "/costurisiproduse" : "/en/pricing",
            },
          ]),
        );
      },
    );
  }, [ro]);

  const main = {
    title: ro ? "Website Prezentare Premium" : "Premium Presentation Website",
    desc: ro
      ? "Site complet, livrat la cheie — pregătit pentru obiectivele agreate, cu suport tehnic definit clar în ofertă."
      : "A turnkey website prepared for the agreed goals, with technical support clearly defined in the proposal.",
    includes: ro
      ? [
          "Design și cod custom, dezvoltate de la zero pe identitatea ta",
          "Texte, imagini și galerii optimizate — le putem crea noi",
          "SEO tehnic și on-page, performanță și scor Lighthouse înalt",
          "Securizat (HTTPS, headere, anti-spam) și mobile-ready",
          "Email pe domeniul tău + panou de administrare complet",
          "Pagină GDPR conformă, backup inițial și certificat SSL",
          "Ghid de administrare + sesiune live de instruire",
          "Suport și runde de revizie definite în oferta proiectului",
        ]
      : [
          "Custom design and code, built from scratch around your identity",
          "Optimized copy, images and galleries — we can create them for you",
          "Technical and on-page SEO, performance and a high Lighthouse score",
          "Secure (HTTPS, headers, anti-spam) and mobile-ready",
          "Email on your own domain + full admin panel",
          "Compliant GDPR page, initial backup and SSL certificate",
          "Admin guide + live walkthrough session",
          "Support period and revision rounds defined in the proposal",
        ],
  };


  const tiers: Tier[] = [
    {
      key: "plus",
      shape: "square",
      name: "Plus",
      price: fmt(50),
      annualPrice: fmt(50 * 12 * 0.8),
      bestFor: ro ? "Site-uri de prezentare, cataloage de produse și bloguri" : "Presentation websites, product catalogues and blogs",
      tagline: ro ? "Esențial pentru liniște" : "Essential peace of mind",
      icon: <Shield className="size-5" />,
      accent: "text-pink-400",
      features: ro
        ? ["Actualizări tehnice", "Backup periodic", "Monitorizare uptime", "Modificări text (3/lună)", "Hosting", "Domeniu gratuit", "Suport prioritar"]
        : ["Technical updates", "Periodic backups", "Uptime monitoring", "Text changes (3/month)", "Hosting", "Free domain", "Priority support"],
    },
    {
      key: "pro",
      shape: "triangle",
      name: "Pro",
      price: fmt(150),
      annualPrice: fmt(150 * 12 * 0.8),
      bestFor: ro ? "Magazine online, primării și organizații cu actualizări frecvente" : "Online stores, municipalities and organisations with frequent updates",
      tagline: ro ? "Cel mai ales de clienți" : "Most chosen by clients",
      highlight: true,
      icon: <Zap className="size-5" />,
      accent: "text-emerald-400",
      features: ro
        ? [
            "Plus +",
            "10 modificări de conținut (texte, imagini)",
            "Backup zilnic automat",
            "Rapoarte lunare de trafic și statistici",
            "Optimizări de performanță",
            "Ajustări SEO de bază",
            "Administrare rețele sociale (Facebook / Instagram / TikTok)",
          ]
        : [
            "Everything in Plus",
            "10 content changes (text, images)",
            "Automatic daily backups",
            "Monthly traffic & statistics reports",
            "Performance optimizations",
            "Basic SEO adjustments",
            "Social media management (Facebook / Instagram / TikTok)",
          ],
    },
    {
      key: "proactiv",
      shape: "circle",
      name: "Pro activ",
      price: fmt(300),
      annualPrice: fmt(300 * 12 * 0.8),
      bestFor: ro ? "Instituții publice, platforme și servicii digitale complexe" : "Public institutions, platforms and complex digital services",
      tagline: ro ? "Creștere continuă" : "Continuous growth",
      icon: <Crown className="size-5" />,
      accent: "text-cyan-300",
      features: ro
        ? [
            "Pro +",
            "Modificări / actualizări / postări nelimitate",
            "Optimizare SEO continuă",
            "Monitorizare și analiză trafic",
            "Intervenții rapide",
            "Consultanță digitală lunară",
          ]
        : [
            "Everything in Pro",
            "Unlimited changes / updates / posts",
            "Continuous SEO optimization",
            "Traffic monitoring and analytics",
            "Rapid interventions",
            "Monthly digital consulting",
          ],
    },
  ];

  const payments = [
    {
      icon: <CreditCard className="size-5" />,
      title: ro ? "Card bancar" : "Bank card",
      desc: ro ? "Plăți rapide și securizate prin procesator autorizat." : "Fast, secure payments via certified processor.",
    },
    {
      icon: <Building2 className="size-5" />,
      title: ro ? "Transfer bancar" : "Bank transfer",
      desc: ro ? "Plată direct în contul firmei pe baza facturii emise." : "Direct payment into the company account against an issued invoice.",
    },
    {
      icon: <Link2 className="size-5" />,
      title: ro ? "Link de plată" : "Payment link",
      desc: ro ? "Pentru servicii rapide sau abonamente lunare." : "For quick services or monthly subscriptions.",
    },
    {
      icon: <FileText className="size-5" />,
      title: ro ? "Factură & ordin de plată" : "Invoice & payment order",
      desc: ro ? "Disponibil pentru clienți business." : "Available for business clients.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* PS-style background: starfield + grid + glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,112,243,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.18),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pt-6 sm:pt-8 pb-20">
        {/* Top bar */}
        <nav
          aria-label={ro ? "Acțiuni pagină produse" : "Product page actions"}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3"
        >
          <PageBackLink to={ro ? "/" : "/en"} label={ro ? "Înapoi" : "Back"} />

          <a
            href={ro ? "/#hero" : "/en#hero"}
            aria-label={ro ? "Acasă Avyron" : "Avyron home"}
            className="flex min-w-0 items-center justify-self-center gap-2 rounded-full px-1.5 py-1 transition-colors hover:bg-foreground/5"
          >
            <img src={logo} alt="Avyron" className="size-7 rounded-md ring-1 ring-white/20 sm:size-8" />
            <span className="hidden font-display text-xs tracking-[0.2em] min-[380px]:inline sm:text-sm sm:tracking-[0.25em]">AVYRON</span>
          </a>

          <div className="inline-flex min-h-9 items-center justify-self-end gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
            <LangSwitch />
            <span aria-hidden className="h-3 w-px bg-foreground/15" />
            <ThemeToggle />
          </div>
        </nav>

        <Breadcrumbs
          className="mt-4 sm:mt-6"
          items={[
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Costuri & Produse" : "Pricing & Products",
              path: ro ? "/costurisiproduse" : "/en/pricing",
            },
          ]}
        />

        {/* Hero */}
        <section className="mt-12 text-center">
          <h1 className="mt-6 font-display text-3xl sm:text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight px-2">
            <span className="bg-gradient-to-r from-foreground via-cyan-500 to-blue-600 dark:from-white dark:via-cyan-200 dark:to-blue-400 bg-clip-text text-transparent">
              {ro
                ? "Produse digitale create pentru fiecare proiect"
                : "Digital products created for every project"}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-foreground/70 text-base md:text-lg">
            {ro
              ? "Fiecare produs Avyron este construit cu atenție, nu ales dintr-un șablon. Designul, funcționalitățile, infrastructura, integrările și avantajele sunt adaptate scopului și nevoilor fiecărui proiect."
              : "Every Avyron product is carefully built, not selected from a template. Its design, features, infrastructure, integrations and advantages are tailored to the purpose and needs of each project."}
          </p>

          <CurrencySwitch className="mt-7" />
        </section>

        {/* Audit — product overview entry; the request continues in the protected form. */}
        <section data-testid="free-audit-card" className="relative mt-8 overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-400/[0.08] via-card to-orange-500/[0.06] p-4 sm:p-5">
          <div aria-hidden className="absolute -right-10 -top-12 size-36 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative grid items-start gap-5 md:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">
                <ScanSearch className="size-3.5" aria-hidden />
                {ro ? "Audit gratuit" : "Free audit"}
              </div>
              <h2 className="mt-3 font-display text-xl font-extrabold sm:text-2xl">
                {ro ? "Audit Produs Digital" : "Digital Product Audit"}
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-foreground/70 sm:text-sm">
                {ro
                  ? "Evaluăm website-ul sau aplicația și primești prioritățile clare care merită rezolvate mai întâi."
                  : "We evaluate your website or app and return the clear priorities worth addressing first."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground/65">
                <span className="font-display text-xl font-extrabold text-amber-600 dark:text-amber-300">
                  {ro ? "Gratuit" : "Free"}
                </span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Hourglass className="size-3.5" aria-hidden />
                  {ro ? "Raport în 2–4 zile" : "Report in 2–4 days"}
                </span>
              </div>
              <Link
                to={ro ? "/?request=audit#cta" : "/en?request=audit#cta"}
                onClick={() => trackEvent("audit_form_click", { location: "pricing_product" })}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
              >
                <ScanSearch className="size-4" aria-hidden />
                {ro ? "Vreau auditul" : "I want an audit"}
              </Link>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/50">
                {ro ? "Ce acoperă auditul" : "What the audit covers"}
              </p>
              <ul data-testid="audit-coverage-list" className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {(ro
                  ? [
                      { icon: <Shield className="size-4" />, text: "Securitate și vulnerabilități" },
                      { icon: <Gauge className="size-4" />, text: "Performanță și Core Web Vitals" },
                      { icon: <Globe className="size-4" />, text: "SEO tehnic și indexare" },
                      { icon: <Accessibility className="size-4" />, text: "Accesibilitate, UI/UX și conversie" },
                      { icon: <Check className="size-4" />, text: "Recomandări prioritizate după impact" },
                    ]
                  : [
                      { icon: <Shield className="size-4" />, text: "Security and vulnerabilities" },
                      { icon: <Gauge className="size-4" />, text: "Performance and Core Web Vitals" },
                      { icon: <Globe className="size-4" />, text: "Technical SEO and indexing" },
                      { icon: <Accessibility className="size-4" />, text: "Accessibility, UI/UX and conversion" },
                      { icon: <Check className="size-4" />, text: "Recommendations prioritized by impact" },
                    ]
                ).map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2 text-xs text-foreground/85 sm:text-sm">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-amber-400/15 text-amber-600 dark:text-amber-300">
                      {feature.icon}
                    </span>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Main product */}

        <section className="mt-8 grid md:grid-cols-5 gap-4 items-start">
            <div className="md:col-span-2 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-card to-background p-5 sm:p-6 relative overflow-hidden text-center">
            {/* Decorative glow */}
            <div aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-cyan-200">
                <BadgeCheck className="size-3.5" />
                {ro ? "Produs principal" : "Main product"}
              </div>
              <div className="mt-5 mx-auto w-40 h-40 sm:w-44 sm:h-44 rounded-2xl ring-1 ring-cyan-300/20 overflow-hidden shadow-[0_20px_60px_-20px_rgba(34,211,238,0.45)]">
                <picture>
                  <source type="image/avif" srcSet={`${premiumTech352Avif} 352w, ${premiumTech704Avif} 704w`} sizes="176px" />
                  <source type="image/webp" srcSet={`${premiumTech352Webp} 352w, ${premiumTech704Webp} 704w`} sizes="176px" />
                  <img src={premiumTech352Webp} alt="Website Prezentare Premium — exemplu" width={176} height={176} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </picture>
              </div>
              <h2 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold">{main.title}</h2>
              <div className="mt-3 flex items-baseline justify-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-semibold text-foreground/70">{ro ? "de la" : "from"}</span>
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent break-words">
                  {fmt(300)}
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-foreground/70 leading-snug text-left">{main.desc}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-[11px] text-cyan-700 dark:text-cyan-100">
                <Hourglass className="size-3.5" />
                {ro ? "Timp aproximativ dezvoltare: 2–5 zile" : "Approx. development time: 2–5 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">{ro ? "Include:" : "Includes:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {main.includes.slice(0, PRODUCT_SUMMARY_LIMIT).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                  <Check className="size-4 mt-0.5 text-cyan-300 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/40734605055?text=Bună! Sunt interesat de Website Prezentare Premium."
                onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "pricing_product" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] px-5 py-2.5 text-sm font-bold text-white transition-colors"
              >
                <MessageCircle className="size-4" />
                {ro ? "Vreau Website Prezentare Premium" : "I want a Premium Presentation Website"}
              </a>
              <Link
                to={ro ? "/produse/website-prezentare-premium" : "/en/products/premium-presentation-website"}
                onClick={() => trackEvent("product_details_click", { product: "/produse/website-prezentare-premium" })}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-2.5 text-sm font-semibold hover:bg-foreground/[0.12] hover:border-foreground/35 transition-all duration-300"
              >
                {ro ? "Vezi detalii" : "See details"}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Identitate Social Media */}
        <section className="mt-8 grid md:grid-cols-5 gap-4 items-start">
          <div className="md:col-span-2 rounded-2xl border border-pink-300/20 bg-gradient-to-br from-card to-background p-5 sm:p-6 relative overflow-hidden text-center">
            <div aria-hidden className="absolute -top-16 -left-16 size-48 rounded-full bg-pink-400/15 blur-3xl" />
            <div aria-hidden className="absolute -bottom-16 -right-16 size-48 rounded-full bg-purple-500/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/30 bg-pink-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-pink-700 dark:text-pink-200">
                <MessageCircle className="size-3.5" />
                {ro ? "Identitate digitală" : "Digital identity"}
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="size-12 rounded-xl bg-gradient-to-br from-[#1877F2] to-[#0a4fb3] grid place-items-center shadow-[0_0_24px_-6px_rgba(24,119,242,0.6)]">
                  <Facebook className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] grid place-items-center shadow-[0_0_24px_-6px_rgba(220,39,67,0.6)]">
                  <Instagram className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-[#25F4EE] via-[#000] to-[#FE2C55] grid place-items-center shadow-[0_0_24px_-6px_rgba(254,44,85,0.6)]">
                  <Music2 className="size-6 text-white" />
                </div>
              </div>
              <h2 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold">
                {ro ? "Identitate Social Media" : "Social Media Identity"}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">
                {ro ? "Facebook · Instagram · TikTok" : "Facebook · Instagram · TikTok"}
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-semibold text-foreground/70">{ro ? "de la" : "from"}</span>
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-pink-300 to-purple-500 bg-clip-text text-transparent break-words">
                  {fmt(250)}
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-foreground/70 leading-snug text-left">
                {ro
                  ? "Construim de la zero identitatea ta în social media — conturi profesionale, coerente vizual și pregătite să convertească. Configurăm tot ce ține de prezență, descrieri, design, postări inițiale și butoane de acțiune, sincronizate cu website-ul tău pentru o experiență unitară între online și client."
                  : "We build your social media identity from scratch — professional accounts, visually coherent and conversion-ready. We set up presence, bios, design, initial posts and action buttons, all synced with your website for a seamless online experience."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-300/[0.06] px-3 py-1.5 text-[11px] text-pink-700 dark:text-pink-100">
                <Hourglass className="size-3.5" />
                {ro ? "Timp aproximativ dezvoltare: 2–5 zile" : "Approx. development time: 2–5 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">{ro ? "Include:" : "Includes:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {(ro
                ? [
                    { icon: <BadgeCheck className="size-4" />, text: "Creare conturi Facebook, Instagram și TikTok Business" },
                    { icon: <FileText className="size-4" />, text: "Descrieri (bio) profesionale, optimizate cu cuvinte cheie" },
                    { icon: <ImageIcon className="size-4" />, text: "Poză de profil, cover și template-uri vizuale coerente cu brandul" },
                    { icon: <Crown className="size-4" />, text: "Pachet de 6–9 postări inițiale (grid estetic Instagram)" },
                    { icon: <Calendar className="size-4" />, text: "Repere și calendar editorial pentru primele 30 de zile" },
                    { icon: <MessageCircle className="size-4" />, text: "Butoane de comenzi & contact (WhatsApp, Mesaj, Sună, Rezervă)" },
                    { icon: <Share2 className="size-4" />, text: "Sincronizare conturi cu website și pixeluri (Meta, TikTok)" },
                    { icon: <Instagram className="size-4" />, text: "Linkuri unificate (link-in-bio) și redirect către produse / servicii" },
                    { icon: <Music2 className="size-4" />, text: "Recomandări de conținut TikTok adaptat domeniului tău" },
                    { icon: <Shield className="size-4" />, text: "Setări de siguranță, verificare e-mail și recuperare cont" },
                  ]
                : [
                    { icon: <BadgeCheck className="size-4" />, text: "Facebook, Instagram and TikTok Business account setup" },
                    { icon: <FileText className="size-4" />, text: "Professional bios, optimized with relevant keywords" },
                    { icon: <ImageIcon className="size-4" />, text: "Profile picture, cover and visual templates aligned to your brand" },
                    { icon: <Crown className="size-4" />, text: "Initial 6–9 posts pack (aesthetic Instagram grid)" },
                    { icon: <Calendar className="size-4" />, text: "Milestones and editorial calendar for the first 30 days" },
                    { icon: <MessageCircle className="size-4" />, text: "Order & contact buttons (WhatsApp, Message, Call, Book)" },
                    { icon: <Share2 className="size-4" />, text: "Accounts synced with website and pixels (Meta, TikTok)" },
                    { icon: <Instagram className="size-4" />, text: "Unified link-in-bio and redirects to products / services" },
                    { icon: <Music2 className="size-4" />, text: "TikTok content recommendations tailored to your niche" },
                    { icon: <Shield className="size-4" />, text: "Safety settings, email verification and account recovery" },
                  ]
              ).slice(0, PRODUCT_SUMMARY_LIMIT).map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm text-foreground/85">
                  <span className="mt-0.5 size-5 rounded-md bg-pink-400/15 text-pink-300 grid place-items-center shrink-0">
                    {f.icon}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/40734605055?text=Bună! Sunt interesat de pachetul Identitate Social Media (Facebook, Instagram, TikTok)."
                onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "pricing_product" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <BadgeCheck className="size-4" />
                {ro ? "Vreau Identitate Social Media" : "I want the Social Identity pack"}
              </a>
              <Link
                to={ro ? "/produse/identitate-social-media" : "/en/products/social-media-identity"}
                onClick={() => trackEvent("product_details_click", { product: "/produse/identitate-social-media" })}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-2.5 text-sm font-semibold hover:bg-foreground/[0.12] hover:border-foreground/35 transition-all duration-300"
              >
                {ro ? "Vezi detalii" : "See details"}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Magazin Online (eCommerce / Shopify) */}
        <section className="mt-8 grid md:grid-cols-5 gap-4 items-start">
          <div className="md:col-span-2 rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-card to-background p-5 sm:p-6 relative overflow-hidden text-center">
            <div aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-emerald-400/15 blur-3xl" />
            <div aria-hidden className="absolute -bottom-16 -left-16 size-48 rounded-full bg-teal-500/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-200">
                <ShoppingBag className="size-3.5" />
                {ro ? "Magazin online" : "Online store"}
              </div>
              <div className="mt-5 mx-auto size-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center shadow-[0_0_40px_-8px_rgba(16,185,129,0.6)]">
                <ShoppingBag className="size-8 text-white" />
              </div>
              <h2 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold">
                {ro ? "Magazin Online" : "Online Store"}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">
                {"eCommerce / Shopify · WooCommerce · Custom"}
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-semibold text-foreground/70">{ro ? "de la" : "from"}</span>
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-300 to-teal-500 bg-clip-text text-transparent break-words">
                  {fmt(1000)}
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-foreground/70 leading-snug text-left">
                {ro
                  ? "Magazin online complet, optimizat pentru vânzări reale — catalog de produse, coș, checkout securizat și plăți online integrate. Construim pe Shopify sau pe stack custom, în funcție de scară, cu accent pe viteză, conversie și un panou ușor de administrat de oricine din echipa ta."
                  : "A full online store optimized for real sales — product catalog, cart, secure checkout and integrated online payments. We build on Shopify or on a custom stack depending on scale, focused on speed, conversion and an admin panel anyone on your team can use."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-100">
                <Hourglass className="size-3.5" />
                {ro ? "Timp aproximativ dezvoltare: 7–21 zile" : "Approx. development time: 7–21 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">{ro ? "Include:" : "Includes:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {(ro
                ? [
                    { icon: <Package className="size-4" />, text: "Catalog produse cu variante, stocuri și categorii nelimitate" },
                    { icon: <ShoppingBag className="size-4" />, text: "Coș, checkout securizat și pagini de produs orientate spre conversie" },
                    { icon: <CreditCard className="size-4" />, text: "Plăți online (card, Apple Pay, Google Pay) + ramburs" },
                    { icon: <Truck className="size-4" />, text: "Integrare curieri (FAN, Sameday, DPD) cu AWB automat" },
                    { icon: <ShoppingBag className="size-4" />, text: "Integrare marketplace eMAG + Sameday cu livrare în România, Ungaria și Bulgaria" },
                    { icon: <FileText className="size-4" />, text: "Facturare automată (SmartBill / Oblio) și conformitate ANAF" },
                    { icon: <Tag className="size-4" />, text: "Coduri promo, reduceri, bundle-uri și campanii sezoniere" },
                    { icon: <BarChart3 className="size-4" />, text: "Pixel Meta / TikTok, GA4 și conversion tracking complet" },
                    { icon: <Globe className="size-4" />, text: "Multilingv, multi-monedă și SEO tehnic pentru fiecare produs" },
                    { icon: <MessageCircle className="size-4" />, text: "Email-uri automate: comandă, expediere, abandon coș" },
                    { icon: <Shield className="size-4" />, text: "GDPR, termeni & condiții, politici și backup-uri zilnice" },
                  ]
                : [
                    { icon: <Package className="size-4" />, text: "Scalable product catalog with variants, stock and categories" },
                    { icon: <ShoppingBag className="size-4" />, text: "Cart, secure checkout and conversion-focused product pages" },
                    { icon: <CreditCard className="size-4" />, text: "Online payments (card, Apple Pay, Google Pay) + COD" },
                    { icon: <Truck className="size-4" />, text: "Courier integrations (FAN, Sameday, DPD) with automatic AWB" },
                    { icon: <ShoppingBag className="size-4" />, text: "eMAG marketplace integration + Sameday delivery across Romania, Hungary and Bulgaria" },
                    { icon: <FileText className="size-4" />, text: "Automated invoicing (SmartBill / Oblio) and tax compliance" },
                    { icon: <Tag className="size-4" />, text: "Promo codes, discounts, bundles and seasonal campaigns" },
                    { icon: <BarChart3 className="size-4" />, text: "Meta / TikTok pixel, GA4 and complete conversion tracking" },
                    { icon: <Globe className="size-4" />, text: "Multilingual, multi-currency and per-product technical SEO" },
                    { icon: <MessageCircle className="size-4" />, text: "Automated emails: order, shipping, abandoned cart" },
                    { icon: <Shield className="size-4" />, text: "GDPR, terms, policies and daily backups" },
                  ]
              ).slice(0, PRODUCT_SUMMARY_LIMIT).map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm text-foreground/85">
                  <span className="mt-0.5 size-5 rounded-md bg-emerald-400/15 text-emerald-300 grid place-items-center shrink-0">
                    {f.icon}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/40734605055?text=Bună! Sunt interesat de un magazin online (Platformă eCommerce / Shopify)."
                onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "pricing_product" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <ShoppingBag className="size-4" />
                {ro ? "Vreau magazin online" : "I want an online store"}
              </a>
              <Link
                to={ro ? "/produse/magazin-online" : "/en/products/online-store"}
                onClick={() => trackEvent("product_details_click", { product: "/produse/magazin-online" })}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-2.5 text-sm font-semibold hover:bg-foreground/[0.12] hover:border-foreground/35 transition-all duration-300"
              >
                {ro ? "Vezi detalii" : "See details"}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Aplicații Mobile & Web */}
        <section className="mt-8 grid md:grid-cols-5 gap-4 items-start">
          <div className="md:col-span-2 rounded-2xl border border-indigo-300/20 bg-gradient-to-br from-card to-background p-5 sm:p-6 relative overflow-hidden text-center">
            <div aria-hidden className="absolute -top-16 -left-16 size-48 rounded-full bg-indigo-400/15 blur-3xl" />
            <div aria-hidden className="absolute -bottom-16 -right-16 size-48 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-indigo-700 dark:text-indigo-200">
                <Smartphone className="size-3.5" />
                {ro ? "Produs dedicat" : "Dedicated product"}
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(99,102,241,0.6)]">
                  <Smartphone className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)]">
                  <Layers className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]">
                  <Code2 className="size-6 text-white" />
                </div>
              </div>
              <h2 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold">
                {ro ? "Aplicații Mobile & Web" : "Mobile & Web Apps"}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">
                {ro ? "iOS · Android · PWA · SaaS" : "iOS · Android · PWA · SaaS"}
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-semibold text-foreground/70">{ro ? "de la" : "from"}</span>
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-300 to-violet-500 bg-clip-text text-transparent break-words">
                  {fmt(1500)}
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-foreground/70 leading-snug text-left">
                {ro
                  ? "Construim aplicații mobile și web custom — de la idee, prototip și UX, până la publicare în App Store, Google Play sau pe propriul tău domeniu. Lucrăm cu tehnologii moderne (React, React Native, Node, Supabase) care îți dau viteză, scalare reală și un cost de mentenanță predictibil pe termen lung."
                  : "We build custom mobile and web apps — from idea, prototype and UX through to publishing on the App Store, Google Play or your own domain. We use modern technologies (React, React Native, Node, Supabase) that deliver speed, real scalability and predictable long-term maintenance cost."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-300/[0.06] px-3 py-1.5 text-[11px] text-indigo-700 dark:text-indigo-100">
                <Hourglass className="size-3.5" />
                {ro ? "Timp aproximativ dezvoltare: 7–30 zile" : "Approx. development time: 7–30 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">{ro ? "Include:" : "Includes:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {(ro
                ? [
                    { icon: <Crown className="size-4" />, text: "Sesiune de discovery + wireframe-uri și prototip Figma" },
                    { icon: <Layers className="size-4" />, text: "Design UX/UI custom, sistem de componente și dark mode" },
                    { icon: <Code2 className="size-4" />, text: "Cod nativ-friendly (React Native) sau Web App / PWA" },
                    { icon: <Apple className="size-4" />, text: "Publicare App Store & Google Play (cont, build, review)" },
                    { icon: <Cloud className="size-4" />, text: "Backend, bază de date, autentificare și API-uri securizate" },
                    { icon: <Bell className="size-4" />, text: "Notificări push, deep links și onboarding utilizator" },
                    { icon: <BarChart3 className="size-4" />, text: "Analytics, crash reporting și A/B testing integrate" },
                    { icon: <Cpu className="size-4" />, text: "Integrări AI / API-uri externe (plăți, hărți, OCR, chat)" },
                    { icon: <Shield className="size-4" />, text: "GDPR, criptare, roluri de utilizator și audit de securitate" },
                    { icon: <RefreshCw className="size-4" />, text: "Update-uri OTA, versionare și roadmap pe minim 12 luni" },
                  ]
                : [
                    { icon: <Crown className="size-4" />, text: "Discovery session + wireframes and Figma prototype" },
                    { icon: <Layers className="size-4" />, text: "Custom UX/UI design, component system and dark mode" },
                    { icon: <Code2 className="size-4" />, text: "Native-friendly code (React Native) or Web App / PWA" },
                    { icon: <Apple className="size-4" />, text: "App Store & Google Play publishing (account, build, review)" },
                    { icon: <Cloud className="size-4" />, text: "Backend, database, authentication and secure APIs" },
                    { icon: <Bell className="size-4" />, text: "Push notifications, deep links and user onboarding" },
                    { icon: <BarChart3 className="size-4" />, text: "Built-in analytics, crash reporting and A/B testing" },
                    { icon: <Cpu className="size-4" />, text: "AI integrations / external APIs (payments, maps, OCR, chat)" },
                    { icon: <Shield className="size-4" />, text: "GDPR, encryption, user roles and security audit" },
                    { icon: <RefreshCw className="size-4" />, text: "OTA updates, versioning and 12+ month roadmap" },
                  ]
              ).slice(0, PRODUCT_SUMMARY_LIMIT).map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm text-foreground/85">
                  <span className="mt-0.5 size-5 rounded-md bg-indigo-400/15 text-indigo-300 grid place-items-center shrink-0">
                    {f.icon}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/40734605055?text=Bună! Sunt interesat de o aplicație mobilă sau web (iOS / Android / PWA)."
                onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "pricing_product" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Smartphone className="size-4" />
                {ro ? "Vreau aplicație Mobile / Web" : "I want a Mobile / Web app"}
              </a>
              <Link
                to={ro ? "/produse/aplicatii-web-si-mobile" : "/en/products/web-and-mobile-apps"}
                onClick={() => trackEvent("product_details_click", { product: "/produse/aplicatii-web-si-mobile" })}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-2.5 text-sm font-semibold hover:bg-foreground/[0.12] hover:border-foreground/35 transition-all duration-300"
              >
                {ro ? "Vezi detalii" : "See details"}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Agent AI personalizat */}
        <section className="mt-8 grid md:grid-cols-5 gap-4 items-start">
          <div className="md:col-span-2 rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-card to-background p-5 sm:p-6 relative overflow-hidden text-center">
            <div aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-fuchsia-400/15 blur-3xl" />
            <div aria-hidden className="absolute -bottom-16 -left-16 size-48 rounded-full bg-purple-500/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-fuchsia-700 dark:text-fuchsia-200">
                <Cpu className="size-3.5" />
                {ro ? "Serviciu AI dedicat" : "Dedicated AI service"}
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="size-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(217,70,239,0.6)]">
                  <Cpu className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)]">
                  <MessageCircle className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)]">
                  <Zap className="size-6 text-white" />
                </div>
              </div>
              <h2 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold">
                {ro ? "Agentul tău AI personalizat" : "Your personalized AI Agent"}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">
                {ro ? "Chat site · WhatsApp · Automatizări" : "Site chat · WhatsApp · Automations"}
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-semibold text-foreground/70">{ro ? "de la" : "from"}</span>
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-fuchsia-300 to-purple-500 bg-clip-text text-transparent break-words">
                  {fmt(500)}
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-foreground/70 leading-snug text-left">
                {ro
                  ? "Un asistent AI construit special pentru afacerea ta — răspunde clienților 24/7 pe site și WhatsApp, preia comenzi, programează întâlniri și automatizează sarcini repetitive. Antrenat pe baza ta de date, produsele, prețurile și tonul brandului tău, devine un coleg digital care nu doarme niciodată."
                  : "An AI assistant built specifically for your business — replies to clients 24/7 on your site and WhatsApp, takes orders, books appointments and automates repetitive tasks. Trained on your database, products, prices and brand tone, it becomes a digital teammate that never sleeps."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/[0.06] px-3 py-1.5 text-[11px] text-fuchsia-700 dark:text-fuchsia-100">
                <Hourglass className="size-3.5" />
                {ro ? "Timp aproximativ implementare: 5–14 zile" : "Approx. implementation time: 5–14 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">{ro ? "Include:" : "Includes:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {(ro
                ? [
                    { icon: <MessageCircle className="size-4" />, text: "Chat AI interactiv pe site, integrabil în orice pagină" },
                    { icon: <Share2 className="size-4" />, text: "Integrare WhatsApp Business — același agent, același ton" },
                    { icon: <Cloud className="size-4" />, text: "Bază de date privată cu produsele, prețurile și politicile tale" },
                    { icon: <Crown className="size-4" />, text: "Personalitate, ton și răspunsuri configurate pe brandul tău" },
                    { icon: <Cpu className="size-4" />, text: "Automatizări: comenzi, programări, lead-uri, follow-up" },
                    { icon: <Bell className="size-4" />, text: "Notificări către echipă când clientul cere intervenție umană" },
                    { icon: <BarChart3 className="size-4" />, text: "Dashboard cu conversații, conversii și subiecte frecvente" },
                    { icon: <Shield className="size-4" />, text: "GDPR-friendly, log-uri criptate și control pe ce date învață" },
                    { icon: <Globe className="size-4" />, text: "Multilingv (RO / EN +) și SEO-optimized pentru indexare" },
                    { icon: <RefreshCw className="size-4" />, text: "Reantrenare periodică pe noile informații din afacerea ta" },
                  ]
                : [
                    { icon: <MessageCircle className="size-4" />, text: "Interactive AI chat on your site, embeddable on any page" },
                    { icon: <Share2 className="size-4" />, text: "WhatsApp Business integration — same agent, same voice" },
                    { icon: <Cloud className="size-4" />, text: "Private database with your products, pricing and policies" },
                    { icon: <Crown className="size-4" />, text: "Personality, tone and replies tuned to your brand" },
                    { icon: <Cpu className="size-4" />, text: "Automations: orders, bookings, leads, follow-ups" },
                    { icon: <Bell className="size-4" />, text: "Notifications to your team when human handoff is needed" },
                    { icon: <BarChart3 className="size-4" />, text: "Dashboard with conversations, conversions and hot topics" },
                    { icon: <Shield className="size-4" />, text: "GDPR-friendly, encrypted logs and full control over training data" },
                    { icon: <Globe className="size-4" />, text: "Multilingual (RO / EN +) and SEO-optimized for indexing" },
                    { icon: <RefreshCw className="size-4" />, text: "Periodic retraining on new information from your business" },
                  ]
              ).slice(0, PRODUCT_SUMMARY_LIMIT).map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm text-foreground/85">
                  <span className="mt-0.5 size-5 rounded-md bg-fuchsia-400/15 text-fuchsia-300 grid place-items-center shrink-0">
                    {f.icon}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/40734605055?text=Bună! Sunt interesat de un Agent AI personalizat pentru afacerea mea."
                onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "pricing_product" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Zap className="size-4" />
                {ro ? "Vreau un Agent AI" : "I want an AI Agent"}
              </a>
              <Link
                to={ro ? "/produse/agent-ai-personalizat" : "/en/products/personalized-ai-agent"}
                onClick={() => trackEvent("product_details_click", { product: "/produse/agent-ai-personalizat" })}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-2.5 text-sm font-semibold hover:bg-foreground/[0.12] hover:border-foreground/35 transition-all duration-300"
              >
                {ro ? "Vezi detalii" : "See details"}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </section>


        {/* Testare QA Web & Mobile */}
        <section className="mt-8 grid md:grid-cols-5 gap-4 items-start">
          <div className="md:col-span-2 rounded-2xl border border-lime-300/20 bg-gradient-to-br from-card to-background p-5 sm:p-6 relative overflow-hidden text-center transition-transform duration-500 hover:-translate-y-1">
            <div aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-lime-400/15 blur-3xl" />
            <div aria-hidden className="absolute -bottom-16 -left-16 size-48 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-lime-700 dark:text-lime-200">
                <Bug className="size-3.5" aria-hidden />
                {ro ? "Calitate garantată" : "Guaranteed quality"}
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="size-12 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-600 grid place-items-center shadow-[0_0_24px_-6px_rgba(132,204,22,0.6)]">
                  <Bug className="size-6 text-white" aria-hidden />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)]">
                  <FlaskConical className="size-6 text-white" aria-hidden />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(14,165,233,0.6)]">
                  <Smartphone className="size-6 text-white" aria-hidden />
                </div>
              </div>
              <h2 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold">
                {ro ? "Testare QA Web & Mobile" : "QA Testing Web & Mobile"}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">
                {ro ? "Funcțional · Regresie · Mobil · Automatizat" : "Functional · Regression · Mobile · Automated"}
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-semibold text-foreground/70">{ro ? "de la" : "from"}</span>
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-lime-300 to-emerald-500 bg-clip-text text-transparent break-words">
                  {fmt(300)}
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-foreground/70 leading-snug text-left">
                {ro
                  ? "Testăm site-uri, magazine online și aplicații mobile exact cum o face un client real. Primești un raport de defecte cu severitate și pași de reproducere, plus retestare după remedieri."
                  : "We test websites, online stores and mobile apps exactly the way a real customer would. You get a defect report with severity and reproduction steps, plus retesting after fixes."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/[0.06] px-3 py-1.5 text-[11px] text-lime-700 dark:text-lime-100">
                <Hourglass className="size-3.5" aria-hidden />
                {ro ? "Durată: 3–10 zile" : "Duration: 3–10 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">{ro ? "Acoperim:" : "We cover:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {(ro
                ? [
                    { icon: <Check className="size-4" />, text: "Testare funcțională pe toate fluxurile critice" },
                    { icon: <Smartphone className="size-4" />, text: "Dispozitive și browsere reale (Android, iOS, desktop)" },
                    { icon: <FlaskConical className="size-4" />, text: "Teste automate end-to-end, rulate la fiecare update" },
                    { icon: <Gauge className="size-4" />, text: "Performanță, internet lent și trafic simultan" },
                    { icon: <Shield className="size-4" />, text: "Securitate de bază: validări, roluri, sesiuni" },
                    { icon: <Accessibility className="size-4" />, text: "Accesibilitate: tastatură, contrast, WCAG" },
                    { icon: <FileText className="size-4" />, text: "Raport de defecte cu severitate și pași de reproducere" },
                    { icon: <RefreshCw className="size-4" />, text: "Retestare și regresie după remedieri" },
                  ]
                : [
                    { icon: <Check className="size-4" />, text: "Functional testing across every critical flow" },
                    { icon: <Smartphone className="size-4" />, text: "Real devices and browsers (Android, iOS, desktop)" },
                    { icon: <FlaskConical className="size-4" />, text: "Automated end-to-end tests on every release" },
                    { icon: <Gauge className="size-4" />, text: "Performance, slow networks and concurrent traffic" },
                    { icon: <Shield className="size-4" />, text: "Baseline security: validation, roles, sessions" },
                    { icon: <Accessibility className="size-4" />, text: "Accessibility: keyboard, contrast, WCAG" },
                    { icon: <FileText className="size-4" />, text: "Defect report with severity and reproduction steps" },
                    { icon: <RefreshCw className="size-4" />, text: "Retesting and regression after fixes" },
                  ]
              ).slice(0, PRODUCT_SUMMARY_LIMIT).map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm text-foreground/85">
                  <span className="mt-0.5 size-5 rounded-md bg-lime-400/15 text-lime-500 grid place-items-center shrink-0">
                    {f.icon}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/40734605055?text=Bună! Aș dori o ofertă de testare QA pentru produsul meu web / mobil."
                onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "pricing_product" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-lime-500 to-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Bug className="size-4" aria-hidden />
                {ro ? "Vreau testare QA" : "I want QA testing"}
              </a>
              <Link
                to={ro ? "/produse/testare-qa-web-mobile" : "/en/products/qa-testing-web-mobile"}
                onClick={() => trackEvent("product_details_click", { product: "/produse/testare-qa-web-mobile" })}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-2.5 text-sm font-semibold hover:bg-foreground/[0.12] hover:border-foreground/35 transition-all duration-300"
              >
                {ro ? "Vezi detalii" : "See details"}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </section>


        {/* Care plans */}
        <section className="mt-16">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold">
              {ro ? "Pachete de mentenanță" : "Care plans"}
            </h2>
            <p className="mt-3 text-sm text-foreground/60 max-w-xl mx-auto">
              {ro
                ? "Dacă vrei să-ți administrezi singur produsul, e perfect. Dacă vrei să ne ocupăm noi — alege un pachet."
                : "Run it yourself or let us handle it — pick a plan that fits."}
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {tiers.map((tier) => (
              <article
                key={tier.key}
                className={`relative rounded-2xl border p-6 backdrop-blur transition-all hover:-translate-y-1 ${
                  tier.highlight
                    ? "border-emerald-300/40 bg-gradient-to-b from-emerald-500/10 to-white/[0.02] shadow-[0_30px_80px_-30px_rgba(16,185,129,0.4)]"
                    : "border-foreground/10 bg-foreground/[0.03] hover:border-foreground/20"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 text-background text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                    {tier.tagline}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-3xl ${tier.accent} drop-shadow-[0_0_12px_currentColor]`}>{PS_SHAPES[tier.shape]}</span>
                  <span className="size-9 rounded-lg bg-foreground/10 grid place-items-center">{tier.icon}</span>
                </div>
                <h3 className="mt-5 font-display text-2xl font-extrabold">{tier.name}</h3>
                {!tier.highlight && <p className="text-xs text-foreground/50 mt-1">{tier.tagline}</p>}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold">{tier.price}</span>
                  <span className="text-xs text-foreground/50">/{ro ? "lună" : "mo"}</span>
                </div>
                <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">{tier.annualPrice}/{ro ? "an" : "year"} · ANUALAVY20</p>
                <p className="mt-4 text-sm text-foreground/70 leading-relaxed"><span className="font-semibold text-foreground/85">{ro ? "Recomandat pentru: " : "Recommended for: "}</span>{tier.bestFor}</p>
                <ul className="mt-6 space-y-2.5">
                  {tier.features.slice(0, PRODUCT_SUMMARY_LIMIT).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                      <Check className={`size-4 mt-0.5 shrink-0 ${tier.accent}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#cta"
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    tier.highlight
                      ? "bg-emerald-400 text-background hover:bg-emerald-300"
                      : "border border-foreground/15 bg-foreground/[0.06] hover:bg-foreground/[0.12]"
                  }`}
                >
                  {ro ? "Alege pachet" : "Choose plan"}
                </a>
              </article>
            ))}
          </div>

          <p className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-400/[0.06] p-3 text-center text-xs text-foreground/70">
            <strong className="font-mono text-emerald-700 dark:text-emerald-300">ANUALAVY20</strong>{" "}
            {ro ? "oferă 20% reducere exclusiv abonamentului ales pentru 12 luni; celelalte produse din coș nu sunt incluse." : "gives 20% off only the subscription selected for 12 months; other cart products are excluded."}
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              to={ro ? "/pachete-mentenanta" : "/en/care-plans"}
              onClick={() => trackEvent("care_plans_click", { location: "pricing_list" })}
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-6 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200 transition-all duration-300 hover:bg-emerald-400/20 hover:border-emerald-400/50 hover:-translate-y-0.5"
            >
              <HeartHandshake className="size-4" aria-hidden />
              {ro ? "Vezi toate detaliile pachetelor" : "See full care plan details"}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </section>


        {/* Self-serve note */}
        <section className="mt-14 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur">
          <p className="text-sm md:text-base text-foreground/75 leading-relaxed">
            {ro
              ? "Dacă alegi să administrezi singur site-ul, totul este pregătit pentru asta. Fiecare client primește la livrare un produs complet funcțional, optimizat și gata de scalare, găzduit la partenerii noștri de încredere cu care colaborăm de mulți ani — fără costuri suplimentare ascunse. Securitatea, viteza de încărcare și performanța pe toate dispozitivele sunt validate riguros prin testări automate și manuale în mediile noastre de dezvoltare, iar la predare primești documentație clară și acces complet la panoul de administrare."
              : "If you choose to manage the site yourself, everything is set up for it. Each client receives a fully functional, optimized and scale-ready product on delivery, hosted with our long-trusted partners — with no hidden additional costs. Security, load speed and cross-device performance are rigorously validated through automated and manual testing in our development environments, and at handover you receive clear documentation and full access to the admin panel."}
          </p>
        </section>

        {/* Payments */}
        <div className="mt-12">
          <PaymentMethods />
        </div>

        {/* CTA */}
        <section id="cta" className="mt-16 rounded-3xl border border-foreground/10 bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-pink-500/15 p-8 md:p-10 text-center backdrop-blur relative overflow-hidden">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold">
            {ro ? "Începem cu o evaluare gratuită" : "Let's start with a free evaluation"}
          </h2>
          <p className="mt-3 text-foreground/70 max-w-xl mx-auto">
            {ro
              ? "Spune-ne ce vrei să construiești sau ce vrei să îmbunătățim — îți răspundem în maxim 24h."
              : "Tell us what you want to build or improve — we reply within 24h."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://wa.me/40734605055"
              onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "pricing_footer" })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] px-6 py-3 text-sm font-bold text-white transition-colors"
            >
              WhatsApp
            </a>
            <a
              href="mailto:contact@avyron.ro"
              onClick={() => trackEvent("contact_click", { method: "email", location: "pricing_footer" })}
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 py-3 text-sm font-bold transition-colors"
            >
              contact@avyron.ro
            </a>
            <Link
              to="/#examples"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 text-background hover:bg-cyan-300 px-6 py-3 text-sm font-bold transition-colors"
            >
              {ro ? "Vreau un demo" : "I want a demo"}
            </Link>
            <a
              href="tel:+40734605055"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.06] hover:bg-foreground/[0.12] px-6 py-3 text-sm font-bold text-foreground transition-colors"
            >
              {ro ? "Telefon" : "Phone"}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Pricing;
