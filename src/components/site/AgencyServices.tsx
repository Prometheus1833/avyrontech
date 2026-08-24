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
    <section id="servicii" aria-labelledby="agency-services-title" className="relative py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{content.eyebrow}</p>
          <h2 id="agency-services-title" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {content.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {content.intro}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {content.items.map(({ title, text, path, Icon, tone }) => (
            <article key={path} className="group flex min-h-56 flex-col rounded-2xl border border-border/70 bg-card/65 p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/35 hover:bg-card hover:shadow-elev">
              <span className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br ${tone}`}>
                <Icon className="size-4.5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
              <Link to={path} className="mt-auto inline-flex pt-4 text-xs font-semibold text-brand underline-offset-4 hover:underline">
                {content.cta}<span aria-hidden> →</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AgencyServices;
