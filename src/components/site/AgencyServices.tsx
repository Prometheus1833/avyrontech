import {
  Bot,
  Code2,
  Gauge,
  Search,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useLang } from "@/i18n/LanguageContext";

const copy = {
  ro: {
    eyebrow: "Agenție web din Iași · proiecte în România și UE",
    title: "Construim prezența digitală de la primul site până la platforma internă.",
    intro:
      "Avyron proiectează site-uri de prezentare profesionale, magazine online și aplicații web sau mobile pentru firme, profesii liberale și organizații. Combinăm strategie, design custom, dezvoltare, SEO tehnic, securitate și infrastructură Cloudflare într-un produs ușor de folosit și de extins.",
    cta: "Vezi produsul",
    items: [
      {
        title: "Site de prezentare profesional",
        text: "Website rapid și credibil pentru firmă, cabinet, salon, restaurant, pensiune sau servicii locale: pagini clare, formulare, WhatsApp, Google Maps, administrare și conținut adaptat clienților reali.",
        path: "/produse/website-prezentare-premium",
        Icon: Code2,
      },
      {
        title: "Vizibilitate Google, locală și AI",
        text: "Arhitectură indexabilă, metadata unică, Schema.org, hreflang română–engleză, sitemap, Core Web Vitals și texte utile care explică exact serviciile, zonele deservite și diferențiatorii afacerii.",
        path: "/produse/audit-website",
        Icon: Search,
      },
      {
        title: "Magazin online și conversie",
        text: "Catalog, filtre, comenzi, plăți, livrare, facturare și automatizări într-un flux optimizat pentru mobil, cu administrare simplă și o bază tehnică pregătită pentru creștere.",
        path: "/produse/magazin-online",
        Icon: ShoppingBag,
      },
      {
        title: "Aplicații și platforme scalabile",
        text: "Dashboarduri, portaluri pentru clienți, aplicații web, PWA, iOS și Android, API-uri și baze de date proiectate pentru roluri, permisiuni, observabilitate și extindere controlată.",
        path: "/produse/aplicatii-web-si-mobile",
        Icon: Gauge,
      },
      {
        title: "Automatizări și agenți AI",
        text: "Asistenți conectați la informațiile aprobate ale afacerii pentru suport, calificarea solicitărilor și procese repetitive, cu limite clare, trasabilitate și integrare în fluxurile existente.",
        path: "/produse/agent-ai-personalizat",
        Icon: Bot,
      },
      {
        title: "Mentenanță, QA și securitate",
        text: "Testare funcțională și accesibilă, actualizări, backup, monitorizare, protecție la abuz și optimizare continuă, cu obiective și responsabilități stabilite transparent pentru fiecare proiect.",
        path: "/pachete-mentenanta",
        Icon: ShieldCheck,
      },
    ],
  },
  en: {
    eyebrow: "Web agency in Iași · projects across Romania and the EU",
    title: "From a first business website to a scalable internal platform.",
    intro:
      "Avyron designs professional presentation websites, online stores, and web or mobile applications for companies, independent professionals, and organizations. We combine strategy, custom design, development, technical SEO, security, and Cloudflare infrastructure in a product that is easy to use and extend.",
    cta: "Explore the service",
    items: [
      {
        title: "Professional business websites",
        text: "Fast, trustworthy websites for companies, practices, salons, restaurants, guest houses, and local services—with clear pages, forms, WhatsApp, Google Maps, content management, and customer-focused copy.",
        path: "/en/products/premium-presentation-website",
        Icon: Code2,
      },
      {
        title: "Google, local, and AI visibility",
        text: "Crawlable architecture, unique metadata, Schema.org, Romanian–English hreflang, sitemaps, Core Web Vitals, and useful copy that clearly explains services, coverage, and genuine business differentiators.",
        path: "/en/products/website-audit",
        Icon: Search,
      },
      {
        title: "Ecommerce and conversion",
        text: "Catalogues, filters, orders, payments, delivery, invoicing, and automation in a mobile-first journey, with straightforward administration and a technical foundation designed for growth.",
        path: "/en/products/online-store",
        Icon: ShoppingBag,
      },
      {
        title: "Scalable apps and platforms",
        text: "Dashboards, customer portals, web apps, PWAs, iOS and Android apps, APIs, and databases designed for roles, permissions, observability, and controlled expansion.",
        path: "/en/products/web-and-mobile-apps",
        Icon: Gauge,
      },
      {
        title: "Automation and AI agents",
        text: "Assistants grounded in approved business information for support, lead qualification, and repetitive workflows, with clear guardrails, traceability, and integration into existing operations.",
        path: "/en/products/personalized-ai-agent",
        Icon: Bot,
      },
      {
        title: "Maintenance, QA, and security",
        text: "Functional and accessibility testing, updates, backups, monitoring, abuse protection, and continuous optimization, with measurable objectives and responsibilities agreed for every project.",
        path: "/en/care-plans",
        Icon: ShieldCheck,
      },
    ],
  },
} as const;

const AgencyServices = () => {
  const { lang } = useLang();
  const content = copy[lang];

  return (
    <section id="servicii" aria-labelledby="agency-services-title" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{content.eyebrow}</p>
          <h2 id="agency-services-title" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {content.title}
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {content.intro}
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {content.items.map(({ title, text, path, Icon }) => (
            <article key={path} className="group rounded-3xl border border-border/70 bg-card/70 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-elev">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
              <Link to={path} className="mt-5 inline-flex text-sm font-semibold text-brand underline-offset-4 hover:underline">
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
