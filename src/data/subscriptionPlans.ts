import type { Lang } from "@/i18n/translations";
import type { ServiceKey } from "@/data/services";
import { subscriptionPriceCents } from "@/data/commerceCatalog";

/**
 * Abonamentele de mentenanță și colaborare Avyron.
 *
 * Prețurile de bază sunt în RON (bani), citite din COMMERCE_CATALOG, care este
 * și sursa de adevăr pentru Worker. Nicio pagină nu-și scrie propriile prețuri:
 * pagina /mentenanta-si-colaborari, cardurile de pe paginile de serviciu și
 * contul clientului citesc toate din acest fișier.
 */

export type PlanTier = "plus" | "pro" | "proactiv";

export type PlanCategoryKey = "site" | "shop" | "blog" | "ai" | "app";

export type SpecKey =
  | "response"
  | "backup"
  | "hours"
  | "changes"
  | "monitoring"
  | "reports"
  | "channel"
  | "articles"
  | "conversations"
  | "updates";

export const SPEC_LABELS: Record<SpecKey, Record<Lang, string>> = {
  response: { ro: "Timp de răspuns", en: "Response time" },
  backup: { ro: "Backup", en: "Backups" },
  hours: { ro: "Ore incluse", en: "Included hours" },
  changes: { ro: "Modificări incluse", en: "Included changes" },
  monitoring: { ro: "Monitorizare", en: "Monitoring" },
  reports: { ro: "Rapoarte", en: "Reports" },
  channel: { ro: "Canal de suport", en: "Support channel" },
  articles: { ro: "Articole", en: "Articles" },
  conversations: { ro: "Conversații", en: "Conversations" },
  updates: { ro: "Actualizări", en: "Updates" },
};

export type PlanSpec = { key: SpecKey; ro: string; en: string };

export type PlanText = {
  /** „Nivel 2 · Site care crește lună de lună" */
  level: string;
  tagline: string;
  bestFor: string;
  summary: string;
  /** 6 puncte, afișate pe card. */
  features: string[];
  /** 5 detalii, afișate doar în mini-dashboard. */
  includes: string[];
  /** Ce se adaugă față de treapta anterioară. */
  extras: string[];
};

export type SubscriptionPlan = {
  key: string;
  tier: PlanTier;
  sku: string;
  name: string;
  /** Preț lunar în bani (RON * 100), din catalogul de comerț. */
  priceCents: number;
  recommended?: boolean;
  specs: PlanSpec[];
  copy: Record<Lang, PlanText>;
};

export type CategoryTheme = {
  /** Gradient pentru iconuri și accente. */
  from: string;
  to: string;
  text: string;
  border: string;
  glow: string;
  ring: string;
  /** Culoare HSL folosită de fundalurile canvas/SVG ale secțiunii. */
  hue: string;
  /** Variantă de fundal specifică tipului de serviciu. */
  backdrop: "grid" | "shelf" | "editorial" | "neural" | "device";
};

export type SubscriptionCategory = {
  key: PlanCategoryKey;
  icon: "globe" | "store" | "pen" | "cpu" | "smartphone";
  /**
   * Tipurile de proiect din platforma internă acoperite de categorie
   * (`projects.kind`). Valorile `blog` și `agent_ai` nu există încă în
   * platformă — sunt pregătite aici pentru când se sincronizează lista de
   * abonamente din `/intern`, într-un task separat.
   */
  internProjectKinds: string[];
  /** Serviciile pentru care se afișează planurile acestei categorii. */
  services: ServiceKey[];
  servicePath: { ro: string; en: string } | null;
  theme: CategoryTheme;
  copy: Record<Lang, {
    title: string;
    kicker: string;
    lead: string;
    /** Notă scurtă sub carusel. */
    note: string;
  }>;
  plans: SubscriptionPlan[];
};

const plan = (
  key: string,
  tier: PlanTier,
  sku: string,
  name: string,
  specs: PlanSpec[],
  copy: Record<Lang, PlanText>,
  recommended = false,
): SubscriptionPlan => ({
  key,
  tier,
  sku,
  name,
  priceCents: subscriptionPriceCents(sku),
  recommended,
  specs,
  copy,
});

const SITE: SubscriptionCategory = {
  key: "site",
  icon: "globe",
  internProjectKinds: ["website_prezentare", "prezentare_premium"],
  services: ["premium-website"],
  servicePath: {
    ro: "/servicii/website-prezentare-profesional",
    en: "/en/services/professional-presentation-website",
  },
  theme: {
    from: "from-cyan-400", to: "to-blue-600", text: "text-cyan-600 dark:text-cyan-300",
    border: "border-cyan-300/30", glow: "bg-cyan-400/15", ring: "ring-cyan-300/40",
    hue: "190 92% 55%", backdrop: "grid",
  },
  copy: {
    ro: {
      title: "Site de prezentare",
      kicker: "Colaborare lunară",
      lead: "Un site lăsat nesupravegheat pierde întâi viteză, apoi poziții în Google și abia la final clienți. Abonamentele de mai jos țin site-ul actualizat, rapid și indexat corect, cu un om din echipă care îți răspunde direct.",
      note: "Hosting, certificat SSL și email pe domeniu sunt incluse în toate cele trei trepte.",
    },
    en: {
      title: "Presentation website",
      kicker: "Monthly collaboration",
      lead: "An unattended website loses speed first, then Google rankings, and only at the end customers. These plans keep your site updated, fast and properly indexed, with a real person from the team answering you directly.",
      note: "Hosting, SSL certificate and email on your domain are included in all three tiers.",
    },
  },
  plans: [
    plan("site-plus", "plus", "sub-site-plus", "Plus", [
      { key: "response", ro: "24 de ore", en: "24 hours" },
      { key: "backup", ro: "Săptămânal, păstrat 14 zile", en: "Weekly, kept 14 days" },
      { key: "changes", ro: "3 pe lună", en: "3 per month" },
      { key: "monitoring", ro: "Uptime la 5 minute", en: "Uptime every 5 minutes" },
      { key: "reports", ro: "La fiecare intervenție", en: "After every intervention" },
      { key: "channel", ro: "Email și WhatsApp", en: "Email and WhatsApp" },
    ], {
      ro: {
        level: "Nivel 1 · Site care funcționează impecabil",
        tagline: "Esențial pentru liniște",
        bestFor: "Site-uri cu conținut stabil, unde contează uptime-ul și securitatea, nu volumul de modificări.",
        summary: "Ne ocupăm de toată partea tehnică — actualizări, backup, monitorizare și mici corecturi de text. Tu nu mai atingi nimic și nu mai plătești separat hostingul.",
        features: [
          "Actualizări tehnice și de securitate lunare",
          "Backup săptămânal cu restaurare la cerere",
          "Monitorizare uptime din 5 în 5 minute",
          "3 modificări de text sau imagine pe lună",
          "Hosting, SSL și email pe domeniu incluse",
          "Suport pe email și WhatsApp, răspuns în 24h",
        ],
        includes: [
          "Verificare lunară de securitate: dependențe, headere, protecție anti-spam pe formulare",
          "Certificatul SSL se reînnoiește automat, fără să te anunțăm în ultima zi",
          "Raport scurt după fiecare intervenție, scris pe înțelesul tău",
          "Restaurare din backup în maximum 4 ore de la sesizare",
          "Fără contract pe termen lung — oprești reînnoirea cu 15 zile înainte",
        ],
        extras: ["Punctul de plecare pentru orice colaborare cu Avyron"],
      },
      en: {
        level: "Level 1 · A site that simply keeps working",
        tagline: "Essential peace of mind",
        bestFor: "Sites with stable content where uptime and security matter more than the number of edits.",
        summary: "We handle the whole technical side — updates, backups, monitoring and small copy fixes. You stop touching anything and stop paying separately for hosting.",
        features: [
          "Monthly technical and security updates",
          "Weekly backups with restore on request",
          "Uptime monitoring every 5 minutes",
          "3 text or image changes per month",
          "Hosting, SSL and email on your domain included",
          "Email and WhatsApp support, 24h response",
        ],
        includes: [
          "Monthly security review: dependencies, headers, anti-spam protection on forms",
          "The SSL certificate renews automatically — no last-day surprises",
          "A short report after every intervention, written in plain language",
          "Restore from backup within 4 hours of your report",
          "No long-term contract — stop the renewal 15 days in advance",
        ],
        extras: ["The starting point for any collaboration with Avyron"],
      },
    }),
    plan("site-pro", "pro", "sub-site-pro", "Pro", [
      { key: "response", ro: "8 ore", en: "8 hours" },
      { key: "backup", ro: "Zilnic, păstrat 30 de zile", en: "Daily, kept 30 days" },
      { key: "changes", ro: "10 pe lună", en: "10 per month" },
      { key: "monitoring", ro: "Uptime la 1 minut", en: "Uptime every minute" },
      { key: "reports", ro: "Raport lunar de trafic", en: "Monthly traffic report" },
      { key: "channel", ro: "Email, WhatsApp, telefon", en: "Email, WhatsApp, phone" },
    ], {
      ro: {
        level: "Nivel 2 · Site care crește lună de lună",
        tagline: "Cel mai ales de clienți",
        bestFor: "Firme care publică des, fac campanii și vor să urce în rezultatele Google.",
        summary: "Pe lângă partea tehnică, lucrăm activ la conținut, viteză și SEO. La final de lună primești un raport cu ce s-a schimbat și ce urmează.",
        features: [
          "Tot din pachetul Plus",
          "10 modificări de conținut pe lună",
          "Backup zilnic automat, păstrat 30 de zile",
          "Optimizări de viteză și Core Web Vitals",
          "Ajustări SEO on-page și date structurate",
          "Raport lunar de trafic cu recomandări",
        ],
        includes: [
          "Analiză lunară în Search Console: interogări, poziții pierdute, erori de indexare",
          "Optimizare imagini și cod pentru scoruri Lighthouse peste 90",
          "Rescriem titlurile și descrierile paginilor care pierd clicuri",
          "O pagină nouă de serviciu adăugată lunar în structura existentă",
          "Un om dedicat din echipă, care cunoaște proiectul fără să-i explici de fiecare dată",
        ],
        extras: [
          "+7 modificări față de Plus",
          "Backup zilnic în loc de săptămânal",
          "Raport lunar cu recomandări concrete",
          "Timp de răspuns înjumătățit, de la 24h la 8h",
        ],
      },
      en: {
        level: "Level 2 · A site that grows month after month",
        tagline: "Most chosen by clients",
        bestFor: "Companies that publish often, run campaigns and want to climb in Google results.",
        summary: "Beyond the technical side we actively work on content, speed and SEO. At the end of the month you get a report on what changed and what comes next.",
        features: [
          "Everything in Plus",
          "10 content changes per month",
          "Automatic daily backups, kept 30 days",
          "Speed and Core Web Vitals optimisation",
          "On-page SEO tuning and structured data",
          "Monthly traffic report with recommendations",
        ],
        includes: [
          "Monthly Search Console review: queries, lost positions, indexing errors",
          "Image and code optimisation for Lighthouse scores above 90",
          "We rewrite titles and descriptions for pages losing clicks",
          "One new service page added every month into the existing structure",
          "A dedicated person who knows the project without being briefed every time",
        ],
        extras: [
          "+7 changes compared to Plus",
          "Daily backups instead of weekly",
          "Monthly report with concrete recommendations",
          "Response time halved, from 24h to 8h",
        ],
      },
    }, true),
    plan("site-proactiv", "proactiv", "sub-site-proactiv", "Pro Activ", [
      { key: "response", ro: "2 ore", en: "2 hours" },
      { key: "backup", ro: "Zilnic + copie off-site", en: "Daily + off-site copy" },
      { key: "changes", ro: "Nelimitate (fair use)", en: "Unlimited (fair use)" },
      { key: "monitoring", ro: "1 minut + alerte SMS", en: "1 minute + SMS alerts" },
      { key: "reports", ro: "Lunar + audit trimestrial", en: "Monthly + quarterly audit" },
      { key: "channel", ro: "Canal dedicat cu echipa", en: "Dedicated team channel" },
    ], {
      ro: {
        level: "Nivel 3 · Parteneriat de creștere",
        tagline: "Creștere continuă",
        bestFor: "Afaceri care își aduc clienții din site și pentru care o oră de downtime înseamnă bani pierduți.",
        summary: "Devenim echipa ta digitală: modificări nelimitate, SEO continuu, intervenții prioritare și o ședință lunară în care decidem împreună următorii pași.",
        features: [
          "Tot din pachetul Pro",
          "Modificări și pagini noi nelimitate",
          "SEO continuu: conținut, linkuri interne, tehnic",
          "Analiză de trafic și comportament pe site",
          "Prioritate maximă la intervenții, răspuns în 2h",
          "Ședință lunară de strategie, unu la unu",
        ],
        includes: [
          "Plan de creștere trimestrial, construit și actualizat împreună cu tine",
          "Teste A/B pe secțiunile care aduc cereri de ofertă",
          "Audit tehnic complet la fiecare trei luni, cu listă de priorități",
          "Intervenții de urgență și în afara programului de lucru",
          "Alertă SMS către echipă din primul minut de indisponibilitate",
        ],
        extras: [
          "Fără limită de modificări sau pagini noi",
          "Prioritate maximă în coada de intervenții",
          "Ședință lunară de strategie inclusă",
          "Audit tehnic trimestrial inclus",
        ],
      },
      en: {
        level: "Level 3 · Growth partnership",
        tagline: "Continuous growth",
        bestFor: "Businesses that get their customers from the website and for which an hour of downtime means lost money.",
        summary: "We become your digital team: unlimited changes, continuous SEO, priority interventions and a monthly session where we decide the next steps together.",
        features: [
          "Everything in Pro",
          "Unlimited changes and new pages",
          "Continuous SEO: content, internal links, technical",
          "Traffic and on-site behaviour analysis",
          "Top priority interventions, 2h response",
          "Monthly one-to-one strategy session",
        ],
        includes: [
          "A quarterly growth plan, built and updated together with you",
          "A/B tests on the sections that bring in enquiries",
          "Full technical audit every three months, with a prioritised list",
          "Emergency interventions outside working hours as well",
          "SMS alert to the team from the first minute of downtime",
        ],
        extras: [
          "No cap on changes or new pages",
          "Top priority in the intervention queue",
          "Monthly strategy session included",
          "Quarterly technical audit included",
        ],
      },
    }),
  ],
};

const SHOP: SubscriptionCategory = {
  key: "shop",
  icon: "store",
  internProjectKinds: ["magazin_online"],
  services: ["online-store"],
  servicePath: { ro: "/servicii/magazin-online", en: "/en/services/online-store" },
  theme: {
    from: "from-emerald-400", to: "to-teal-600", text: "text-emerald-600 dark:text-emerald-300",
    border: "border-emerald-300/30", glow: "bg-emerald-400/15", ring: "ring-emerald-300/40",
    hue: "160 84% 45%", backdrop: "shelf",
  },
  copy: {
    ro: {
      title: "Magazin online",
      kicker: "Mentenanță e-commerce",
      lead: "Într-un magazin online, o eroare la plată nu se vede în design — se vede în încasări. Testăm lunar tot drumul de la produs la confirmarea comenzii și ținem platforma, integrările și stocurile în ordine.",
      note: "Toate treptele includ testarea completă a fluxului de comandă și verificarea integrărilor de curierat și facturare.",
    },
    en: {
      title: "Online store",
      kicker: "E-commerce maintenance",
      lead: "In an online store a checkout error doesn't show up in the design — it shows up in revenue. Every month we test the whole path from product to order confirmation and keep the platform, integrations and stock in order.",
      note: "Every tier includes full checkout-flow testing and verification of courier and invoicing integrations.",
    },
  },
  plans: [
    plan("shop-plus", "plus", "sub-shop-plus", "Plus", [
      { key: "response", ro: "12 ore", en: "12 hours" },
      { key: "backup", ro: "Zilnic (comenzi și produse)", en: "Daily (orders and products)" },
      { key: "changes", ro: "10 produse pe lună", en: "10 products per month" },
      { key: "monitoring", ro: "Checkout la 5 minute", en: "Checkout every 5 minutes" },
      { key: "reports", ro: "Raport lunar de vânzări", en: "Monthly sales report" },
      { key: "channel", ro: "Email și WhatsApp", en: "Email and WhatsApp" },
    ], {
      ro: {
        level: "Nivel 1 · Magazin care rulează fără opriri",
        tagline: "Stabilitate zi de zi",
        bestFor: "Magazine cu până la 200 de produse și un volum constant de comenzi.",
        summary: "Ținem platforma, modulele de plată și integrările actualizate, iar coșul și checkout-ul sub observație permanentă.",
        features: [
          "Actualizări de platformă, module și metode de plată",
          "Backup zilnic al comenzilor și al catalogului",
          "Monitorizarea coșului și a plății la 5 minute",
          "10 actualizări de produse pe lună",
          "Hosting optimizat pentru trafic de magazin",
          "Suport pe email și WhatsApp, răspuns în 12h",
        ],
        includes: [
          "Testăm lunar tot fluxul de comandă, de la coș până la confirmarea plății",
          "Verificăm integrările de curierat și facturare după fiecare actualizare",
          "Curățăm comenzile eșuate și coșurile abandonate din baza de date",
          "Un import lunar de stocuri și prețuri din fișierul tău",
          "Restaurare din backup în maximum 2 ore",
        ],
        extras: ["Nivelul minim recomandat pentru un magazin cu comenzi zilnice"],
      },
      en: {
        level: "Level 1 · A store that runs without stopping",
        tagline: "Day-to-day stability",
        bestFor: "Stores with up to 200 products and a steady flow of orders.",
        summary: "We keep the platform, payment modules and integrations up to date, with the cart and checkout under permanent watch.",
        features: [
          "Platform, module and payment-method updates",
          "Daily backups of orders and catalogue",
          "Cart and checkout monitoring every 5 minutes",
          "10 product updates per month",
          "Hosting tuned for store traffic",
          "Email and WhatsApp support, 12h response",
        ],
        includes: [
          "We test the entire order flow monthly, from cart to payment confirmation",
          "We verify courier and invoicing integrations after every update",
          "We clean failed orders and abandoned carts from the database",
          "One monthly stock and price import from your file",
          "Restore from backup within 2 hours",
        ],
        extras: ["The minimum level we recommend for a store with daily orders"],
      },
    }),
    plan("shop-pro", "pro", "sub-shop-pro", "Pro", [
      { key: "response", ro: "6 ore", en: "6 hours" },
      { key: "backup", ro: "Zilnic + snapshot săptămânal", en: "Daily + weekly snapshot" },
      { key: "changes", ro: "30 de produse pe lună", en: "30 products per month" },
      { key: "monitoring", ro: "Checkout la 1 minut", en: "Checkout every minute" },
      { key: "reports", ro: "Vânzări + coș abandonat", en: "Sales + abandoned cart" },
      { key: "channel", ro: "Email, WhatsApp, telefon", en: "Email, WhatsApp, phone" },
    ], {
      ro: {
        level: "Nivel 2 · Magazin optimizat pentru vânzări",
        tagline: "Cel mai ales de magazine",
        bestFor: "Magazine care adaugă produse constant și investesc în campanii plătite.",
        summary: "Trecem de la „merge” la „vinde mai bine”: analizăm unde pierzi clienții între produs și plată și corectăm lună de lună.",
        features: [
          "Tot din pachetul Plus",
          "30 de produse noi sau actualizate pe lună",
          "Optimizare viteză pe categorii și pagini de produs",
          "SEO de e-commerce: titluri, descrieri, date structurate",
          "Configurare campanii și coduri de reducere",
          "Raport lunar de vânzări și comportament în coș",
        ],
        includes: [
          "Analiza pâlniei de vânzare: unde pierzi clienții între produs și plată",
          "Emailuri automate pentru coșul abandonat, scrise și configurate de noi",
          "Feed Google Merchant și Meta actualizat lunar",
          "Optimizarea paginilor de categorie pentru căutările comerciale",
          "Un om dedicat care cunoaște catalogul și sezonalitatea ta",
        ],
        extras: [
          "+20 de produse față de Plus",
          "Feed-uri de shopping întreținute lunar",
          "Raport de coș abandonat și rată de conversie",
          "Timp de răspuns 6h în loc de 12h",
        ],
      },
      en: {
        level: "Level 2 · A store tuned for sales",
        tagline: "Most chosen by stores",
        bestFor: "Stores adding products constantly and investing in paid campaigns.",
        summary: "We move from \"it works\" to \"it sells better\": we analyse where you lose customers between product and payment and fix it month after month.",
        features: [
          "Everything in Plus",
          "30 new or updated products per month",
          "Speed optimisation on category and product pages",
          "E-commerce SEO: titles, descriptions, structured data",
          "Campaign and discount-code setup",
          "Monthly sales and cart-behaviour report",
        ],
        includes: [
          "Sales funnel analysis: where you lose customers between product and payment",
          "Automated abandoned-cart emails, written and configured by us",
          "Google Merchant and Meta feeds refreshed monthly",
          "Category pages optimised for commercial searches",
          "A dedicated person who knows your catalogue and seasonality",
        ],
        extras: [
          "+20 products compared to Plus",
          "Shopping feeds maintained monthly",
          "Abandoned-cart and conversion-rate report",
          "6h response time instead of 12h",
        ],
      },
    }, true),
    plan("shop-proactiv", "proactiv", "sub-shop-proactiv", "Pro Activ", [
      { key: "response", ro: "1 oră", en: "1 hour" },
      { key: "backup", ro: "Zilnic + copie off-site", en: "Daily + off-site copy" },
      { key: "changes", ro: "Nelimitate (fair use)", en: "Unlimited (fair use)" },
      { key: "monitoring", ro: "30 de secunde + alerte SMS", en: "30 seconds + SMS alerts" },
      { key: "reports", ro: "Săptămânal", en: "Weekly" },
      { key: "channel", ro: "Canal dedicat + telefon direct", en: "Dedicated channel + direct line" },
    ], {
      ro: {
        level: "Nivel 3 · Parteneriat de e-commerce",
        tagline: "Pentru volume mari",
        bestFor: "Magazine cu trafic mare, campanii de sezon și zile în care fiecare minut de downtime costă.",
        summary: "Lucrăm ca departamentul tău de e-commerce: campanii, integrări noi, optimizarea continuă a conversiei și intervenții în orice zi a săptămânii.",
        features: [
          "Tot din pachetul Pro",
          "Produse și campanii nelimitate",
          "Optimizare continuă a ratei de conversie",
          "Integrări noi: ERP, curieri, marketplace-uri",
          "Prioritate maximă, răspuns în 1 oră",
          "Ședință lunară de strategie comercială",
        ],
        includes: [
          "Teste A/B pe pagina de produs și pe pașii de finalizare a comenzii",
          "Plan de campanii pentru sezon, sărbători și Black Friday",
          "Audit de performanță și test de încărcare înainte de vârfurile de trafic",
          "Intervenții de urgență șapte zile din șapte",
          "Raport săptămânal cu vânzări, stocuri critice și erori de plată",
        ],
        extras: [
          "Fără limită de produse sau campanii",
          "Integrări noi incluse în abonament",
          "Pregătire dedicată pentru Black Friday",
          "Răspuns în 1 oră, inclusiv în weekend",
        ],
      },
      en: {
        level: "Level 3 · E-commerce partnership",
        tagline: "For high volumes",
        bestFor: "High-traffic stores with seasonal campaigns and days where every minute of downtime costs.",
        summary: "We work as your e-commerce department: campaigns, new integrations, continuous conversion optimisation and interventions any day of the week.",
        features: [
          "Everything in Pro",
          "Unlimited products and campaigns",
          "Continuous conversion-rate optimisation",
          "New integrations: ERP, couriers, marketplaces",
          "Top priority, 1 hour response",
          "Monthly commercial strategy session",
        ],
        includes: [
          "A/B tests on the product page and on the checkout steps",
          "Campaign plan for the season, holidays and Black Friday",
          "Performance audit and load test before traffic peaks",
          "Emergency interventions seven days a week",
          "Weekly report with sales, critical stock and payment errors",
        ],
        extras: [
          "No cap on products or campaigns",
          "New integrations included in the subscription",
          "Dedicated Black Friday preparation",
          "1 hour response, weekends included",
        ],
      },
    }),
  ],
};

const BLOG: SubscriptionCategory = {
  key: "blog",
  icon: "pen",
  internProjectKinds: ["blog", "retele_sociale", "identitate_completa"],
  services: ["social-identity"],
  servicePath: { ro: "/servicii/blog-profesional", en: "/en/services/professional-blog" },
  theme: {
    from: "from-amber-400", to: "to-orange-600", text: "text-amber-600 dark:text-amber-300",
    border: "border-amber-300/30", glow: "bg-amber-400/15", ring: "ring-amber-300/40",
    hue: "35 95% 55%", backdrop: "editorial",
  },
  copy: {
    ro: {
      title: "Blog profesional",
      kicker: "Colaborare editorială",
      lead: "Un blog abandonat spune despre firma ta exact opusul a ceea ce vrei. Scriem, publicăm și actualizăm articole care răspund întrebărilor reale ale clienților tăi — și care aduc căutări noi în fiecare lună.",
      note: "Fiecare articol primește date structurate, imagine de copertă optimizată și linkuri interne către paginile tale de serviciu.",
    },
    en: {
      title: "Professional blog",
      kicker: "Editorial collaboration",
      lead: "An abandoned blog tells your customers the exact opposite of what you want. We write, publish and refresh articles that answer real customer questions — and bring in new searches every month.",
      note: "Every article gets structured data, an optimised cover image and internal links to your service pages.",
    },
  },
  plans: [
    plan("blog-plus", "plus", "sub-blog-plus", "Plus", [
      { key: "response", ro: "24 de ore", en: "24 hours" },
      { key: "articles", ro: "2 publicate pe lună", en: "2 published per month" },
      { key: "backup", ro: "Săptămânal", en: "Weekly" },
      { key: "monitoring", ro: "Uptime și erori 404", en: "Uptime and 404 errors" },
      { key: "reports", ro: "La cerere", en: "On request" },
      { key: "channel", ro: "Email", en: "Email" },
    ], {
      ro: {
        level: "Nivel 1 · Blog îngrijit",
        tagline: "Publicare fără bătăi de cap",
        bestFor: "Firme care scriu singure, dar nu vor să se lupte cu formatarea și cu SEO-ul.",
        summary: "Tu trimiți textul, noi îl transformăm în articol care arată bine și e citit corect de Google.",
        features: [
          "Publicăm lunar 2 articole primite de la tine",
          "Formatare, imagini și linkuri interne incluse",
          "Backup săptămânal al conținutului",
          "Monitorizare uptime și erori 404",
          "Optimizarea titlurilor și a descrierilor",
          "Suport pe email, răspuns în 24h",
        ],
        includes: [
          "Structurare pe H2 și H3, pentru citire ușoară și pentru indexare",
          "Imagine de copertă optimizată și descrisă pentru accesibilitate",
          "Linkuri interne către paginile de serviciu potrivite fiecărui articol",
          "Date structurate Article, ca articolul să apară corect în Google",
          "Categorii, etichete și arhivă ținute curate",
        ],
        extras: ["Ideal dacă ai deja cine scrie, dar nu ai cine publica"],
      },
      en: {
        level: "Level 1 · A well-kept blog",
        tagline: "Publishing without the hassle",
        bestFor: "Companies that write themselves but don't want to fight formatting and SEO.",
        summary: "You send the text, we turn it into an article that looks good and is read correctly by Google.",
        features: [
          "We publish 2 articles you send us each month",
          "Formatting, images and internal links included",
          "Weekly content backups",
          "Uptime and 404 monitoring",
          "Title and description optimisation",
          "Email support, 24h response",
        ],
        includes: [
          "H2 and H3 structure, for easy reading and for indexing",
          "Optimised cover image, described for accessibility",
          "Internal links to the service pages matching each article",
          "Article structured data so the post shows up correctly in Google",
          "Categories, tags and archive kept clean",
        ],
        extras: ["Ideal if you already have someone writing, but nobody publishing"],
      },
    }),
    plan("blog-pro", "pro", "sub-blog-pro", "Pro", [
      { key: "response", ro: "8 ore", en: "8 hours" },
      { key: "articles", ro: "2 scrise + 2 publicate", en: "2 written + 2 published" },
      { key: "backup", ro: "Zilnic", en: "Daily" },
      { key: "updates", ro: "1 articol vechi optimizat", en: "1 old article refreshed" },
      { key: "reports", ro: "Raport lunar pe articole", en: "Monthly per-article report" },
      { key: "channel", ro: "Email și WhatsApp", en: "Email and WhatsApp" },
    ], {
      ro: {
        level: "Nivel 2 · Blog care aduce trafic",
        tagline: "Cel mai ales pentru conținut",
        bestFor: "Firme care vor articole scrise profesionist, fără să angajeze un om intern.",
        summary: "Alegem subiectele după ce caută clienții tăi, scriem articolele și le distribuim. Tu doar aprobi planul editorial.",
        features: [
          "Tot din pachetul Plus",
          "2 articole scrise de noi (800–1200 de cuvinte)",
          "Cercetare de cuvinte cheie în fiecare lună",
          "Distribuire pe rețelele sociale",
          "Actualizarea articolelor vechi care pierd poziții",
          "Raport lunar de trafic pe fiecare articol",
        ],
        includes: [
          "Plan editorial pe 30 de zile, aprobat de tine înainte de scriere",
          "Cuvinte cheie alese după volum real de căutare și intenție",
          "Fiecare articol are un scop clar: informare, comparație sau vânzare",
          "Postări pentru Facebook, Instagram și LinkedIn pe baza articolului",
          "Un refresh lunar pentru un articol vechi cu potențial",
        ],
        extras: [
          "Scriem noi articolele, nu doar le publicăm",
          "Plan editorial și cercetare de cuvinte cheie incluse",
          "Distribuire pe rețelele sociale",
          "Raport lunar cu articolele care aduc trafic",
        ],
      },
      en: {
        level: "Level 2 · A blog that brings traffic",
        tagline: "Most chosen for content",
        bestFor: "Companies that want professionally written articles without hiring in-house.",
        summary: "We pick topics from what your customers actually search, write the articles and distribute them. You only approve the editorial plan.",
        features: [
          "Everything in Plus",
          "2 articles written by us (800–1200 words)",
          "Monthly keyword research",
          "Distribution on social networks",
          "Refresh of older articles losing positions",
          "Monthly per-article traffic report",
        ],
        includes: [
          "A 30-day editorial plan, approved by you before we write",
          "Keywords chosen by real search volume and intent",
          "Every article has a clear goal: inform, compare or sell",
          "Facebook, Instagram and LinkedIn posts based on the article",
          "One monthly refresh for an older article with potential",
        ],
        extras: [
          "We write the articles, not just publish them",
          "Editorial plan and keyword research included",
          "Distribution on social networks",
          "Monthly report on the articles bringing traffic",
        ],
      },
    }, true),
    plan("blog-proactiv", "proactiv", "sub-blog-proactiv", "Pro Activ", [
      { key: "response", ro: "2 ore", en: "2 hours" },
      { key: "articles", ro: "4 scrise + publicare nelimitată", en: "4 written + unlimited publishing" },
      { key: "backup", ro: "Zilnic + copie off-site", en: "Daily + off-site copy" },
      { key: "updates", ro: "Optimizare continuă", en: "Continuous optimisation" },
      { key: "reports", ro: "Lunar + analiză trimestrială", en: "Monthly + quarterly analysis" },
      { key: "channel", ro: "Canal dedicat", en: "Dedicated channel" },
    ], {
      ro: {
        level: "Nivel 3 · Redacție externalizată",
        tagline: "Conținut la ritm constant",
        bestFor: "Firme care vor să domine un subiect în Google și în răspunsurile AI.",
        summary: "Preluăm complet partea de conținut: calendar editorial, scriere, publicare, newsletter și optimizare continuă.",
        features: [
          "Tot din pachetul Pro",
          "4 articole scrise pe lună plus newsletter",
          "Strategie de conținut pe trei luni",
          "Optimizare continuă a articolelor existente",
          "Prioritate la publicare, răspuns în 2h",
          "Ședință lunară de conținut",
        ],
        includes: [
          "Calendar editorial trimestrial, aliniat cu sezonalitatea afacerii tale",
          "Newsletter lunar către lista ta, construit din articolele publicate",
          "Analiză de concurență pe subiectele care aduc trafic în domeniul tău",
          "Optimizare pentru răspunsuri AI și fragmente evidențiate în Google",
          "Raport trimestrial: ce subiecte aduc clienți, nu doar vizite",
        ],
        extras: [
          "Dublul volumului de articole față de Pro",
          "Newsletter lunar inclus",
          "Strategie de conținut pe trei luni",
          "Optimizare pentru răspunsuri generate de AI",
        ],
      },
      en: {
        level: "Level 3 · Outsourced editorial team",
        tagline: "Content at a steady pace",
        bestFor: "Companies that want to own a topic in Google and in AI answers.",
        summary: "We take over content completely: editorial calendar, writing, publishing, newsletter and continuous optimisation.",
        features: [
          "Everything in Pro",
          "4 articles written per month plus a newsletter",
          "Three-month content strategy",
          "Continuous optimisation of existing articles",
          "Publishing priority, 2h response",
          "Monthly content session",
        ],
        includes: [
          "Quarterly editorial calendar aligned with your business seasonality",
          "Monthly newsletter to your list, built from the published articles",
          "Competitor analysis on the topics driving traffic in your field",
          "Optimisation for AI answers and Google featured snippets",
          "Quarterly report: which topics bring customers, not just visits",
        ],
        extras: [
          "Double the article volume compared to Pro",
          "Monthly newsletter included",
          "Three-month content strategy",
          "Optimisation for AI-generated answers",
        ],
      },
    }),
  ],
};

const AI: SubscriptionCategory = {
  key: "ai",
  icon: "cpu",
  internProjectKinds: ["agent_ai"],
  services: ["ai-agent"],
  servicePath: { ro: "/servicii/automatizari-si-ai", en: "/en/services/automation-and-ai" },
  theme: {
    from: "from-fuchsia-500", to: "to-purple-600", text: "text-fuchsia-600 dark:text-fuchsia-300",
    border: "border-fuchsia-300/30", glow: "bg-fuchsia-400/15", ring: "ring-fuchsia-300/40",
    hue: "292 84% 60%", backdrop: "neural",
  },
  copy: {
    ro: {
      title: "Agent AI",
      kicker: "Supraveghere și antrenare",
      lead: "Un agent AI lăsat singur începe să răspundă greșit exact acolo unde te costă: prețuri vechi, servicii care nu mai există, promisiuni pe care nu le poți ține. Îl citim, îl corectăm și îl antrenăm în fiecare lună pe conversații reale.",
      note: "Costul de procesare AI este inclus în limita de conversații a fiecărei trepte, fără facturi surpriză.",
    },
    en: {
      title: "AI agent",
      kicker: "Supervision and training",
      lead: "An AI agent left alone starts answering wrongly exactly where it costs you: old prices, services that no longer exist, promises you can't keep. We read it, correct it and train it every month on real conversations.",
      note: "AI processing cost is included within each tier's conversation limit — no surprise invoices.",
    },
  },
  plans: [
    plan("ai-plus", "plus", "sub-ai-plus", "Plus", [
      { key: "response", ro: "24 de ore", en: "24 hours" },
      { key: "conversations", ro: "1.000 pe lună", en: "1,000 per month" },
      { key: "updates", ro: "O actualizare pe lună", en: "One update per month" },
      { key: "monitoring", ro: "Verificare zilnică", en: "Daily review" },
      { key: "reports", ro: "Raport lunar de întrebări", en: "Monthly question report" },
      { key: "channel", ro: "Email", en: "Email" },
    ], {
      ro: {
        level: "Nivel 1 · Agent supravegheat",
        tagline: "Răspunsuri corecte, mereu",
        bestFor: "Agenți de răspuns pe site sau WhatsApp, cu volum mic și mediu de conversații.",
        summary: "Citim conversațiile, corectăm răspunsurile greșite și ținem informațiile la zi, ca agentul să nu-ți promită ce nu poți livra.",
        features: [
          "Verificarea zilnică a conversațiilor și a erorilor",
          "Actualizarea bazei de cunoștințe cu informații noi",
          "Până la 1.000 de conversații pe lună",
          "Backup al configurației și al istoricului",
          "Raport lunar cu întrebările frecvente",
          "Suport pe email, răspuns în 24h",
        ],
        includes: [
          "Corectăm în baza de cunoștințe fiecare răspuns greșit pe care îl găsim",
          "Actualizăm prețurile și serviciile menționate în răspunsuri",
          "Primești alertă când agentul nu reușește să răspundă prea des",
          "Istoric păstrat 90 de zile, exportabil oricând",
          "Costul de procesare AI inclus în limita de conversații",
        ],
        extras: ["Minimul necesar ca un agent AI să rămână corect în timp"],
      },
      en: {
        level: "Level 1 · Supervised agent",
        tagline: "Correct answers, always",
        bestFor: "Site or WhatsApp answering agents with small to medium conversation volume.",
        summary: "We read the conversations, correct wrong answers and keep the information current, so the agent never promises what you can't deliver.",
        features: [
          "Daily review of conversations and errors",
          "Knowledge base updated with new information",
          "Up to 1,000 conversations per month",
          "Backup of configuration and history",
          "Monthly report of frequent questions",
          "Email support, 24h response",
        ],
        includes: [
          "We fix every wrong answer we find directly in the knowledge base",
          "We update prices and services mentioned in the answers",
          "You get an alert when the agent fails to answer too often",
          "History kept for 90 days, exportable at any time",
          "AI processing cost included in the conversation limit",
        ],
        extras: ["The minimum needed to keep an AI agent accurate over time"],
      },
    }),
    plan("ai-pro", "pro", "sub-ai-pro", "Pro", [
      { key: "response", ro: "8 ore", en: "8 hours" },
      { key: "conversations", ro: "5.000 pe lună", en: "5,000 per month" },
      { key: "updates", ro: "Săptămânal", en: "Weekly" },
      { key: "monitoring", ro: "Verificare la fiecare oră", en: "Hourly review" },
      { key: "reports", ro: "Conversii din conversații", en: "Conversions from chats" },
      { key: "channel", ro: "Email și WhatsApp", en: "Email and WhatsApp" },
    ], {
      ro: {
        level: "Nivel 2 · Agent care aduce lead-uri",
        tagline: "Cel mai ales pentru agenți",
        bestFor: "Firme care folosesc agentul ca prim contact cu clientul și vor lead-uri calificate.",
        summary: "Transformăm agentul dintr-un răspunzător politicos într-un instrument de vânzare: scenarii, preluare de lead-uri și predare către un om la momentul potrivit.",
        features: [
          "Tot din pachetul Plus",
          "Până la 5.000 de conversații pe lună",
          "Ajustarea tonului și a scenariilor de conversație",
          "Preluarea lead-urilor în cont sau pe email",
          "Integrare cu formularele și calendarul tău",
          "Raport lunar de conversii din conversații",
        ],
        includes: [
          "Scenarii separate pentru client nou, client existent și reclamație",
          "Predare către un om în momentul în care discuția devine complexă",
          "Etichetarea automată a lead-urilor după interes și buget",
          "Testare lunară cu 20 de întrebări reale ale clienților tăi",
          "Ajustăm agentul după ce spun clienții, nu după presupuneri",
        ],
        extras: [
          "De cinci ori mai multe conversații decât la Plus",
          "Scenarii de conversație construite pentru vânzare",
          "Lead-urile ajung direct în contul tău Avyron",
          "Ajustări săptămânale, nu lunare",
        ],
      },
      en: {
        level: "Level 2 · An agent that brings leads",
        tagline: "Most chosen for agents",
        bestFor: "Companies using the agent as first contact and wanting qualified leads.",
        summary: "We turn the agent from a polite responder into a sales tool: scenarios, lead capture and handover to a human at the right moment.",
        features: [
          "Everything in Plus",
          "Up to 5,000 conversations per month",
          "Tone and conversation scenario tuning",
          "Leads captured in your account or by email",
          "Integration with your forms and calendar",
          "Monthly report of conversions from conversations",
        ],
        includes: [
          "Separate scenarios for new customer, existing customer and complaint",
          "Handover to a human the moment the conversation gets complex",
          "Automatic lead tagging by interest and budget",
          "Monthly testing with 20 real questions from your customers",
          "We tune the agent based on what customers say, not on assumptions",
        ],
        extras: [
          "Five times more conversations than Plus",
          "Conversation scenarios built for selling",
          "Leads land straight in your Avyron account",
          "Weekly tuning instead of monthly",
        ],
      },
    }, true),
    plan("ai-proactiv", "proactiv", "sub-ai-proactiv", "Pro Activ", [
      { key: "response", ro: "2 ore", en: "2 hours" },
      { key: "conversations", ro: "Nelimitate (fair use)", en: "Unlimited (fair use)" },
      { key: "updates", ro: "Antrenare continuă", en: "Continuous training" },
      { key: "monitoring", ro: "În timp real", en: "Real time" },
      { key: "reports", ro: "Lunar + analiză trimestrială", en: "Monthly + quarterly analysis" },
      { key: "channel", ro: "Canal dedicat", en: "Dedicated channel" },
    ], {
      ro: {
        level: "Nivel 3 · Agent antrenat continuu",
        tagline: "Se îmbunătățește singur, cu noi lângă el",
        bestFor: "Firme care primesc zilnic zeci de întrebări și vor ca agentul să facă treaba unui om.",
        summary: "Agentul se conectează la datele tale reale — stocuri, comenzi, programări — și se îmbunătățește săptămânal pe baza conversațiilor purtate.",
        features: [
          "Tot din pachetul Pro",
          "Conversații nelimitate (fair use)",
          "Antrenare continuă pe conversațiile reale",
          "Scenarii și integrări noi la cerere",
          "Prioritate maximă, răspuns în 2h",
          "Ședință lunară de optimizare",
        ],
        includes: [
          "Îmbunătățim săptămânal răspunsurile pe baza discuțiilor reale",
          "Conectăm agentul la stocuri, comenzi sau sistemul de programări",
          "Versionare completă: revenim oricând la o configurație anterioară",
          "Testare automată înainte de fiecare schimbare majoră",
          "Raport trimestrial: câte discuții s-au transformat în clienți",
        ],
        extras: [
          "Fără limită de conversații",
          "Integrări cu sistemele tale interne",
          "Antrenare săptămânală pe date reale",
          "Versionare și revenire rapidă la o configurație stabilă",
        ],
      },
      en: {
        level: "Level 3 · Continuously trained agent",
        tagline: "It improves itself, with us beside it",
        bestFor: "Companies receiving dozens of questions daily who want the agent to do a person's job.",
        summary: "The agent connects to your real data — stock, orders, bookings — and improves weekly based on the conversations it has.",
        features: [
          "Everything in Pro",
          "Unlimited conversations (fair use)",
          "Continuous training on real conversations",
          "New scenarios and integrations on request",
          "Top priority, 2h response",
          "Monthly optimisation session",
        ],
        includes: [
          "We improve answers weekly based on real conversations",
          "We connect the agent to stock, orders or your booking system",
          "Full versioning: we can roll back to a previous configuration any time",
          "Automated testing before every major change",
          "Quarterly report: how many conversations turned into customers",
        ],
        extras: [
          "No conversation cap",
          "Integrations with your internal systems",
          "Weekly training on real data",
          "Versioning and fast rollback to a stable configuration",
        ],
      },
    }),
  ],
};

const APP: SubscriptionCategory = {
  key: "app",
  icon: "smartphone",
  internProjectKinds: ["aplicatie"],
  services: ["apps"],
  servicePath: { ro: "/servicii/aplicatii-si-platforme", en: "/en/services/apps-and-platforms" },
  theme: {
    from: "from-indigo-500", to: "to-violet-600", text: "text-indigo-600 dark:text-indigo-300",
    border: "border-indigo-300/30", glow: "bg-indigo-400/15", ring: "ring-indigo-300/40",
    hue: "250 84% 62%", backdrop: "device",
  },
  copy: {
    ro: {
      title: "Aplicație web sau mobilă",
      kicker: "Mentenanță și dezvoltare continuă",
      lead: "O aplicație nu se termină la lansare. Sistemele de operare se actualizează, certificatele expiră, utilizatorii găsesc erori pe care nu le-a găsit nimeni în teste. Abonamentele de mai jos includ și orele de dezvoltare pentru toate acestea.",
      note: "Orele neconsumate se reportează o lună, iar publicarea în App Store și Google Play este inclusă în toate treptele.",
    },
    en: {
      title: "Web or mobile app",
      kicker: "Maintenance and ongoing development",
      lead: "An app doesn't end at launch. Operating systems update, certificates expire, users find bugs nobody found in testing. These plans include the development hours for all of that.",
      note: "Unused hours roll over for one month, and App Store / Google Play releases are included in every tier.",
    },
  },
  plans: [
    plan("app-plus", "plus", "sub-app-plus", "Plus", [
      { key: "response", ro: "12 ore", en: "12 hours" },
      { key: "hours", ro: "5 ore pe lună", en: "5 hours per month" },
      { key: "backup", ro: "Zilnic (bază de date)", en: "Daily (database)" },
      { key: "monitoring", ro: "Erori în timp real", en: "Real-time error tracking" },
      { key: "reports", ro: "Raport lunar de stabilitate", en: "Monthly stability report" },
      { key: "channel", ro: "Email și WhatsApp", en: "Email and WhatsApp" },
    ], {
      ro: {
        level: "Nivel 1 · Aplicație stabilă",
        tagline: "Fără surprize după lansare",
        bestFor: "Aplicații lansate, cu funcționalitate stabilă și utilizatori activi.",
        summary: "Ținem aplicația compatibilă, sigură și publicată, cu ore incluse pentru corecturile care apar inevitabil.",
        features: [
          "Actualizări de securitate și de dependențe",
          "Backup zilnic al bazei de date",
          "Monitorizarea erorilor și a disponibilității 24/7",
          "5 ore de dezvoltare pentru corecturi pe lună",
          "Publicarea actualizărilor în App Store și Google Play",
          "Suport pe email și WhatsApp, răspuns în 12h",
        ],
        includes: [
          "Rezolvăm erorile raportate de utilizatori, nu doar pe cele vizibile în teste",
          "Ținem aplicația compatibilă cu noile versiuni de iOS și Android",
          "Reînnoim certificatele și cheile de semnare înainte să expire",
          "Verificăm lunar consumul de infrastructură și costurile de rulare",
          "Mediu de test separat, unde vezi schimbările înainte de publicare",
        ],
        extras: ["Nivelul minim pentru o aplicație aflată în producție"],
      },
      en: {
        level: "Level 1 · A stable app",
        tagline: "No surprises after launch",
        bestFor: "Launched apps with stable functionality and active users.",
        summary: "We keep the app compatible, secure and published, with hours included for the fixes that inevitably come up.",
        features: [
          "Security and dependency updates",
          "Daily database backups",
          "24/7 error and availability monitoring",
          "5 development hours for fixes per month",
          "Update releases to the App Store and Google Play",
          "Email and WhatsApp support, 12h response",
        ],
        includes: [
          "We fix bugs reported by users, not only the ones visible in testing",
          "We keep the app compatible with new iOS and Android versions",
          "We renew certificates and signing keys before they expire",
          "We review infrastructure usage and running costs monthly",
          "A separate test environment where you see changes before release",
        ],
        extras: ["The minimum level for an app running in production"],
      },
    }),
    plan("app-pro", "pro", "sub-app-pro", "Pro", [
      { key: "response", ro: "6 ore", en: "6 hours" },
      { key: "hours", ro: "15 ore pe lună", en: "15 hours per month" },
      { key: "backup", ro: "Zilnic + snapshot săptămânal", en: "Daily + weekly snapshot" },
      { key: "monitoring", ro: "Timp real + alerte", en: "Real time + alerts" },
      { key: "reports", ro: "Stabilitate și adopție", en: "Stability and adoption" },
      { key: "channel", ro: "Email, WhatsApp, telefon", en: "Email, WhatsApp, phone" },
    ], {
      ro: {
        level: "Nivel 2 · Aplicație în dezvoltare",
        tagline: "Cel mai ales pentru aplicații",
        bestFor: "Produse care evoluează lunar și au nevoie de funcționalități noi, nu doar de corecturi.",
        summary: "Un backlog comun, prioritizat împreună la început de lună, și livrări în două tranșe, ca să vezi progresul des.",
        features: [
          "Tot din pachetul Plus",
          "15 ore de dezvoltare pe lună",
          "Funcționalități noi mici, livrate lunar",
          "Optimizare de performanță și consum de baterie",
          "Analiza comportamentului utilizatorilor",
          "Raport lunar de stabilitate și adopție",
        ],
        includes: [
          "Backlog comun, prioritizat împreună la începutul fiecărei luni",
          "Livrări în două tranșe pe lună, ca să vezi progresul des",
          "Urmărim rata de erori și o ținem sub 1% din sesiuni",
          "Teste automate pentru fluxurile critice ale aplicației",
          "Un dezvoltator dedicat, care cunoaște codul aplicației tale",
        ],
        extras: [
          "Triplul orelor de dezvoltare față de Plus",
          "Funcționalități noi incluse în abonament",
          "Analiza comportamentului utilizatorilor",
          "Timp de răspuns 6h în loc de 12h",
        ],
      },
      en: {
        level: "Level 2 · An app under development",
        tagline: "Most chosen for apps",
        bestFor: "Products that evolve monthly and need new features, not just fixes.",
        summary: "A shared backlog, prioritised together at the start of the month, and deliveries in two batches so you see progress often.",
        features: [
          "Everything in Plus",
          "15 development hours per month",
          "Small new features delivered monthly",
          "Performance and battery-usage optimisation",
          "User behaviour analysis",
          "Monthly stability and adoption report",
        ],
        includes: [
          "Shared backlog, prioritised together at the start of each month",
          "Deliveries in two batches per month, so you see progress often",
          "We track the crash rate and keep it under 1% of sessions",
          "Automated tests for the app's critical flows",
          "A dedicated developer who knows your app's codebase",
        ],
        extras: [
          "Triple the development hours compared to Plus",
          "New features included in the subscription",
          "User behaviour analysis",
          "6h response time instead of 12h",
        ],
      },
    }, true),
    plan("app-proactiv", "proactiv", "sub-app-proactiv", "Pro Activ", [
      { key: "response", ro: "1 oră, 24/7", en: "1 hour, 24/7" },
      { key: "hours", ro: "30 de ore pe lună", en: "30 hours per month" },
      { key: "backup", ro: "Zilnic + copie off-site", en: "Daily + off-site copy" },
      { key: "monitoring", ro: "24/7 + alerte SMS", en: "24/7 + SMS alerts" },
      { key: "reports", ro: "Bilunar + roadmap trimestrial", en: "Bi-weekly + quarterly roadmap" },
      { key: "channel", ro: "Canal dedicat + telefon direct", en: "Dedicated channel + direct line" },
    ], {
      ro: {
        level: "Nivel 3 · Echipă de produs",
        tagline: "Ca și cum ai avea echipa internă",
        bestFor: "Aplicații cu utilizatori plătitori, unde o eroare în producție trebuie rezolvată în aceeași oră.",
        summary: "Roadmap de produs, release-uri planificate și intervenții de urgență la orice oră. Practic, o echipă de produs pe care nu trebuie să o angajezi.",
        features: [
          "Tot din pachetul Pro",
          "30 de ore de dezvoltare pe lună",
          "Roadmap de produs actualizat trimestrial",
          "Intervenții de urgență 24/7, răspuns în 1 oră",
          "Optimizarea continuă a conversiei în aplicație",
          "Ședințe de produs la două săptămâni",
        ],
        includes: [
          "Roadmap pe trei luni, revizuit împreună la fiecare trimestru",
          "Release-uri planificate, cu note de versiune pentru utilizatori",
          "Teste A/B pe fluxurile de înregistrare și de plată",
          "Plan de recuperare în caz de incident, testat de două ori pe an",
          "Rapoarte de produs: retenție, activare, funcționalități efectiv folosite",
        ],
        extras: [
          "Dublul orelor de dezvoltare față de Pro",
          "Intervenții de urgență 24/7",
          "Roadmap de produs actualizat trimestrial",
          "Ședințe de produs la două săptămâni",
        ],
      },
      en: {
        level: "Level 3 · Product team",
        tagline: "As if you had the team in-house",
        bestFor: "Apps with paying users, where a production bug has to be fixed within the hour.",
        summary: "Product roadmap, planned releases and emergency interventions at any hour. Effectively a product team you don't have to hire.",
        features: [
          "Everything in Pro",
          "30 development hours per month",
          "Product roadmap updated quarterly",
          "24/7 emergency interventions, 1 hour response",
          "Continuous in-app conversion optimisation",
          "Product sessions every two weeks",
        ],
        includes: [
          "A three-month roadmap, reviewed together every quarter",
          "Planned releases with release notes for your users",
          "A/B tests on the sign-up and payment flows",
          "Disaster recovery plan, tested twice a year",
          "Product reports: retention, activation, features actually used",
        ],
        extras: [
          "Double the development hours compared to Pro",
          "24/7 emergency interventions",
          "Product roadmap updated quarterly",
          "Product sessions every two weeks",
        ],
      },
    }),
  ],
};

export const SUBSCRIPTION_CATEGORIES: SubscriptionCategory[] = [SITE, SHOP, BLOG, AI, APP];

export const categoryByKey = (key: PlanCategoryKey) =>
  SUBSCRIPTION_CATEGORIES.find((c) => c.key === key) ?? null;

/** Categoria de abonamente afișată pe o pagină de produs. */
export const categoryForService = (service: ServiceKey) =>
  SUBSCRIPTION_CATEGORIES.find((category) => category.services.includes(service)) ?? null;

export const planBySku = (sku: string) => {
  for (const category of SUBSCRIPTION_CATEGORIES) {
    const found = category.plans.find((p) => p.sku === sku);
    if (found) return { category, plan: found };
  }
  return null;
};

/** Cel mai mic preț lunar din toate categoriile, în bani. */
export const lowestPlanPriceCents = () =>
  Math.min(...SUBSCRIPTION_CATEGORIES.flatMap((c) => c.plans.map((p) => p.priceCents)));

/** Categoria de abonamente potrivită unui proiect din platforma internă. */
export const categoryForProjectKind = (kind: string | null | undefined) =>
  kind ? SUBSCRIPTION_CATEGORIES.find((category) => category.internProjectKinds.includes(kind)) ?? null : null;

/**
 * Abonamentele care se pot atașa unui proiect din platforma internă. Fără un
 * tip cunoscut, întoarce toate treptele, ca alegerea să rămână posibilă.
 */
export const plansForProjectKind = (kind: string | null | undefined) => {
  const category = categoryForProjectKind(kind);
  return category
    ? category.plans.map((plan) => ({ category, plan }))
    : SUBSCRIPTION_CATEGORIES.flatMap((item) => item.plans.map((plan) => ({ category: item, plan })));
};

export const SUBSCRIPTION_PATH = { ro: "/mentenanta-si-colaborari", en: "/en/maintenance-and-partnerships" } as const;
