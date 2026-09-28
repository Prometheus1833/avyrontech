import {
  Box,
  BookOpen,
  Bot,
  Bug,
  Code2,
  Gauge,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";
import { FEATURES } from "@/config/features";
import { homePath as produsePath } from "@/features/produse/lib/paths";
import { PRODUSE_COUNTS } from "@/features/produse/data/counts";

import { useLang } from "@/i18n/LanguageContext";

const copy = {
  ro: {
    eyebrow: "Soluții digitale gândite pentru rezultate",
    title: "Alegi punctul de pornire. Noi construim sistemul potrivit.",
    intro:
      "De la un site de prezentare clar până la un magazin, o aplicație sau o platformă internă, fiecare serviciu pornește de la obiectivul real și rămâne ușor de extins.",
    cta: "Descoperă",
    items: [
      {
        title: "Site Prezentare Profesional",
        text: "O prezență rapidă și credibilă, construită să transforme interesul în solicitări.",
        path: "/servicii/website-prezentare-profesional",
        Icon: Code2,
        tone: "from-cyan-400/25 to-blue-500/10 text-cyan-600 dark:text-cyan-300",
      },
      {
        title: "Logo Dinamic 3D",
        text: "Un logo original gândit pentru print, volum și mișcare, gata pentru site, video și social media.",
        path: "/servicii/creare-logo-3d-dinamic-cinematic",
        Icon: Box,
        tone: "from-violet-400/25 to-sky-500/10 text-violet-600 dark:text-violet-300",
      },
      {
        title: "Magazin online",
        text: "Un traseu simplu de la produs la comandă, optimizat pentru mobil și creștere.",
        path: "/servicii/magazin-online",
        Icon: ShoppingBag,
        tone: "from-amber-400/25 to-orange-500/10 text-orange-600 dark:text-amber-300",
      },
      {
        title: "Blog Profesional",
        text: "Un content hub rapid și optimizat SEO, care transformă expertiza în trafic și cereri.",
        path: "/servicii/blog-profesional",
        Icon: BookOpen,
        tone: "from-rose-400/25 to-pink-500/10 text-rose-600 dark:text-rose-300",
      },
      {
        title: "Aplicații și platforme",
        text: "Fluxuri, conturi și date organizate într-un produs fluid, sigur și scalabil.",
        path: "/servicii/aplicatii-si-platforme",
        Icon: Gauge,
        tone: "from-indigo-400/25 to-violet-500/10 text-indigo-600 dark:text-indigo-300",
      },
      {
        title: "Automatizări și AI",
        text: "Asistenți și procese inteligente care reduc munca repetitivă fără să piardă controlul.",
        path: "/servicii/automatizari-si-ai",
        Icon: Bot,
        tone: "from-fuchsia-400/25 to-purple-500/10 text-fuchsia-600 dark:text-fuchsia-300",
      },
      {
        title: "QA Testing Web/Mobile",
        text: "Testare manuală și automată pe dispozitive reale, cu raport clar de defecte. Fără abonament.",
        path: "/servicii/qa-testing-web-mobile",
        Icon: Bug,
        tone: "from-emerald-400/25 to-teal-500/10 text-emerald-600 dark:text-emerald-300",
      },
    ],
  },
  en: {
    eyebrow: "Digital solutions designed around outcomes",
    title: "Choose the starting point. We build the right system.",
    intro:
      "From a clear business website to a store, an app, or an internal platform, every service starts with the real objective and remains easy to extend.",
    cta: "Discover",
    items: [
      {
        title: "Business websites",
        text: "A fast, credible presence designed to turn genuine interest into enquiries.",
        path: "/en/services/professional-presentation-website",
        Icon: Code2,
        tone: "from-cyan-400/25 to-blue-500/10 text-cyan-600 dark:text-cyan-300",
      },
      {
        title: "Dynamic 3D Logo",
        text: "An original logo designed for print, volume and motion, ready for web, video and social media.",
        path: "/en/services/cinematic-dynamic-3d-logo-design",
        Icon: Box,
        tone: "from-violet-400/25 to-sky-500/10 text-violet-600 dark:text-violet-300",
      },
      {
        title: "Online stores",
        text: "A simple path from product to order, optimized for mobile and sustainable growth.",
        path: "/en/services/online-store",
        Icon: ShoppingBag,
        tone: "from-amber-400/25 to-orange-500/10 text-orange-600 dark:text-amber-300",
      },
      {
        title: "Professional Blog",
        text: "A fast, SEO-ready content hub that turns expertise into traffic and enquiries.",
        path: "/en/services/professional-blog",
        Icon: BookOpen,
        tone: "from-rose-400/25 to-pink-500/10 text-rose-600 dark:text-rose-300",
      },
      {
        title: "Apps and platforms",
        text: "Workflows, accounts, and data organized into a fluid, secure, scalable product.",
        path: "/en/services/apps-and-platforms",
        Icon: Gauge,
        tone: "from-indigo-400/25 to-violet-500/10 text-indigo-600 dark:text-indigo-300",
      },
      {
        title: "Automation and AI",
        text: "Smart assistants and processes that reduce repetitive work while keeping you in control.",
        path: "/en/services/automation-and-ai",
        Icon: Bot,
        tone: "from-fuchsia-400/25 to-purple-500/10 text-fuchsia-600 dark:text-fuchsia-300",
      },
      {
        title: "QA Testing Web/Mobile",
        text: "Manual and automated testing on real devices, with a clear defect report. No subscription.",
        path: "/en/services/web-mobile-qa-testing",
        Icon: Bug,
        tone: "from-emerald-400/25 to-teal-500/10 text-emerald-600 dark:text-emerald-300",
      },
    ],
  },
} as const;

const AgencyServices = () => {
  const { lang } = useLang();
  const content = copy[lang];

  return (
    <section id="servicii" aria-labelledby="agency-services-title" className="relative py-8 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-start gap-7 md:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] md:gap-10 lg:gap-14">
          <div className="max-w-xl md:sticky md:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{content.eyebrow}</p>
            <h2 id="agency-services-title" className="mt-2.5 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {content.title}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {content.intro}
            </p>
          </div>

          <div data-testid="service-list" className="overflow-hidden rounded-2xl border border-border/70 bg-card/65 shadow-soft">
            {content.items.map(({ title, text, path, Icon, tone }) => (
              <Link
                key={path}
                to={path}
                aria-label={`${content.cta}: ${title}`}
                className="group grid min-h-[4.1rem] grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-3 py-2.5 transition-colors duration-200 last:border-b-0 hover:bg-muted/65 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/60 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:px-4"
              >
                <span className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br sm:size-10 ${tone}`}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-semibold tracking-tight sm:text-[0.95rem]">{title}</span>
                  <span className="mt-0.5 hidden truncate text-xs leading-snug text-muted-foreground sm:block">{text}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background/75 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-all duration-200 group-hover:border-brand/35 group-hover:text-brand sm:px-3">
                  {content.cta}<span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Produsele digitale (Artefacte) stau sub servicii: alt public, alt
            traseu de cumpărare. Cardul apare doar cât timp pagina e activată. */}
        {FEATURES.produse && (
          <Link
            to={produsePath(lang)}
            data-testid="produse-avyron-card"
            className="group mt-4 grid gap-3 overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/12 via-brand-2/[0.06] to-transparent p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/45 hover:shadow-elev sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-brand">
                {lang === "ro" ? "Produse Avyron" : "Avyron Products"}
              </span>
              <span className="mt-1 block font-display text-lg font-bold tracking-tight sm:text-xl">Avyron Artefacte</span>
              <span className="mt-1 block max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                {lang === "ro"
                  ? `${PRODUSE_COUNTS.total} componente, secțiuni, template-uri, efecte 3D și integrări API pentru agenții, freelanceri și programatori. ${PRODUSE_COUNTS.free} gratuite, cu cod gata de copiat.`
                  : `${PRODUSE_COUNTS.total} components, sections, templates, 3D effects and API integrations for agencies, freelancers and developers. ${PRODUSE_COUNTS.free} free, with code ready to copy.`}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-brand-2 px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_-16px_hsl(264_90%_60%)]">
              {lang === "ro" ? "Deschide produsele" : "Open the products"}
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
};

export default AgencyServices;
