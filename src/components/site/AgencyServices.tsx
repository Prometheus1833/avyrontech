import {
  Bot,
  Code2,
  Gauge,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useLang } from "@/i18n/LanguageContext";

const copy = {
  ro: {
    eyebrow: "Soluții digitale gândite pentru rezultate",
    title: "Alegi punctul de pornire. Noi construim sistemul potrivit.",
    intro:
      "De la un site de prezentare clar până la un magazin, o aplicație sau o platformă internă, fiecare produs pornește de la obiectivul real și rămâne ușor de extins.",
    cta: "Descoperă",
    items: [
      {
        title: "Site de prezentare",
        text: "O prezență rapidă și credibilă, construită să transforme interesul în solicitări.",
        path: "/produse/website-prezentare-premium",
        Icon: Code2,
        tone: "from-cyan-400/25 to-blue-500/10 text-cyan-600 dark:text-cyan-300",
      },
      {
        title: "Magazin online",
        text: "Un traseu simplu de la produs la comandă, optimizat pentru mobil și creștere.",
        path: "/produse/magazin-online",
        Icon: ShoppingBag,
        tone: "from-amber-400/25 to-orange-500/10 text-orange-600 dark:text-amber-300",
      },
      {
        title: "Aplicații și platforme",
        text: "Fluxuri, conturi și date organizate într-un produs fluid, sigur și scalabil.",
        path: "/produse/aplicatii-web-si-mobile",
        Icon: Gauge,
        tone: "from-indigo-400/25 to-violet-500/10 text-indigo-600 dark:text-indigo-300",
      },
      {
        title: "Automatizări și AI",
        text: "Asistenți și procese inteligente care reduc munca repetitivă fără să piardă controlul.",
        path: "/produse/agent-ai-personalizat",
        Icon: Bot,
        tone: "from-fuchsia-400/25 to-purple-500/10 text-fuchsia-600 dark:text-fuchsia-300",
      },
      {
        title: "Mentenanță și QA",
        text: "Monitorizare, testare și îmbunătățiri continue pentru un produs stabil și protejat.",
        path: "/pachete-mentenanta",
        Icon: ShieldCheck,
        tone: "from-emerald-400/25 to-teal-500/10 text-emerald-600 dark:text-emerald-300",
      },
    ],
  },
  en: {
    eyebrow: "Digital solutions designed around outcomes",
    title: "Choose the starting point. We build the right system.",
    intro:
      "From a clear business website to a store, an app, or an internal platform, every product starts with the real objective and remains easy to extend.",
    cta: "Discover",
    items: [
      {
        title: "Business websites",
        text: "A fast, credible presence designed to turn genuine interest into enquiries.",
        path: "/en/products/premium-presentation-website",
        Icon: Code2,
        tone: "from-cyan-400/25 to-blue-500/10 text-cyan-600 dark:text-cyan-300",
      },
      {
        title: "Online stores",
        text: "A simple path from product to order, optimized for mobile and sustainable growth.",
        path: "/en/products/online-store",
        Icon: ShoppingBag,
        tone: "from-amber-400/25 to-orange-500/10 text-orange-600 dark:text-amber-300",
      },
      {
        title: "Apps and platforms",
        text: "Workflows, accounts, and data organized into a fluid, secure, scalable product.",
        path: "/en/products/web-and-mobile-apps",
        Icon: Gauge,
        tone: "from-indigo-400/25 to-violet-500/10 text-indigo-600 dark:text-indigo-300",
      },
      {
        title: "Automation and AI",
        text: "Smart assistants and processes that reduce repetitive work while keeping you in control.",
        path: "/en/products/personalized-ai-agent",
        Icon: Bot,
        tone: "from-fuchsia-400/25 to-purple-500/10 text-fuchsia-600 dark:text-fuchsia-300",
      },
      {
        title: "Maintenance and QA",
        text: "Monitoring, testing, and continuous improvements for a stable, protected product.",
        path: "/en/care-plans",
        Icon: ShieldCheck,
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

          <div data-testid="product-list" className="overflow-hidden rounded-2xl border border-border/70 bg-card/65 shadow-soft">
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
      </div>
    </section>
  );
};

export default AgencyServices;
