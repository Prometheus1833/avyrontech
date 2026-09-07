/**
 * Pricing model + configuration data for the "Blog Profesional & Content Hub"
 * service landing page (/produse/blog-profesional).
 *
 * Single source of truth: every price shown on the page (calculator, summary,
 * badges) is derived from this file. No pricing literals inside components.
 */

export type Bi = { ro: string; en: string };

export type ConfigOption = {
  id: string;
  label: Bi;
  desc?: Bi;
  /** Amount added to the estimate, in RON. */
  price: number;
  /** Shown instead of the raw price (e.g. "de la +1.000 lei"). */
  display?: Bi;
  /** Option requires a bespoke quote — never added to the numeric total. */
  customQuote?: boolean;
  /** Part of the base package (price 0, rendered as "Inclus"). */
  included?: boolean;
};

export type ConfigGroup = {
  id: string;
  kind: "single" | "multi";
  title: Bi;
  hint?: Bi;
  options: ConfigOption[];
  /** Default selected option id (single-select groups). */
  defaultId?: string;
};

export type ConfigStep = {
  id: string;
  num: string;
  title: Bi;
  lead?: Bi;
  note?: Bi;
  groups: ConfigGroup[];
};

export const BASE_PRICE = 1500;
export const ORIGINAL_PRICE = 2400;
export const AI_PACK_ID = "ai-pack";
export const AI_GROUP_ID = "ai";

export const CONFIG_STEPS: ConfigStep[] = [
  {
    id: "type",
    num: "01",
    title: { ro: "Tipul blogului", en: "Blog type" },
    lead: {
      ro: "Structura editorială pornește de la modelul tău de business.",
      en: "The editorial structure starts from your business model.",
    },
    groups: [
      {
        id: "type",
        kind: "single",
        defaultId: "business",
        title: { ro: "Alege direcția", en: "Choose the direction" },
        options: [
          {
            id: "business",
            label: { ro: "Blog Business", en: "Business blog" },
            desc: {
              ro: "Expertiză, noutăți și trafic organic pentru companie.",
              en: "Expertise, news and organic traffic for the company.",
            },
            price: 0,
            included: true,
          },
          {
            id: "expert",
            label: { ro: "Blog Expert / Personal Brand", en: "Expert / personal brand blog" },
            desc: {
              ro: "Experiența profesională devine autoritate și oportunități.",
              en: "Professional experience becomes authority and opportunity.",
            },
            price: 0,
            included: true,
          },
          {
            id: "hub",
            label: { ro: "Content Hub", en: "Content hub" },
            desc: {
              ro: "Ghiduri, resurse și articole organizate scalabil.",
              en: "Guides, resources and articles organised to scale.",
            },
            price: 600,
          },
          {
            id: "magazine",
            label: { ro: "Publicație / Magazine", en: "Publication / magazine" },
            desc: {
              ro: "Structuri complexe, volume mari de conținut, autori multipli.",
              en: "Complex structures, high content volume, multiple authors.",
            },
            price: 1200,
          },
          {
            id: "newsroom",
            label: { ro: "Newsroom", en: "Newsroom" },
            desc: {
              ro: "Comunicate, apariții media și resurse pentru presă.",
              en: "Press releases, media coverage and press resources.",
            },
            price: 400,
          },
        ],
      },
    ],
  },
  {
    id: "structure",
    num: "02",
    title: { ro: "Structură editorială", en: "Editorial structure" },
    note: {
      ro: "Nu taxăm numărul de articole publicate. CMS-ul rămâne scalabil.",
      en: "We never charge per published article. The CMS stays scalable.",
    },
    groups: [
      {
        id: "categories",
        kind: "single",
        defaultId: "cat-5",
        title: { ro: "Categorii", en: "Categories" },
        options: [
          {
            id: "cat-5",
            label: { ro: "Până la 5 categorii", en: "Up to 5 categories" },
            price: 0,
            included: true,
          },
          { id: "cat-15", label: { ro: "6–15 categorii", en: "6–15 categories" }, price: 200 },
          {
            id: "cat-tax",
            label: { ro: "Taxonomie complexă / subcategorii", en: "Complex taxonomy / subcategories" },
            price: 400,
          },
        ],
      },
      {
        id: "authors",
        kind: "single",
        defaultId: "auth-3",
        title: { ro: "Autori", en: "Authors" },
        options: [
          { id: "auth-3", label: { ro: "1–3 autori", en: "1–3 authors" }, price: 0, included: true },
          { id: "auth-10", label: { ro: "4–10 autori", en: "4–10 authors" }, price: 250 },
          {
            id: "auth-roles",
            label: { ro: "Autori nelimitați + roluri", en: "Unlimited authors + roles" },
            price: 500,
          },
        ],
      },
    ],
  },
  {
    id: "premium",
    num: "03",
    title: { ro: "Funcții premium", en: "Premium features" },
    lead: {
      ro: "Adaugă doar ce folosești. Fiecare funcție rămâne modulară.",
      en: "Add only what you use. Every feature stays modular.",
    },
    groups: [
      {
        id: "premium",
        kind: "multi",
        title: { ro: "Selectează funcțiile", en: "Select features" },
        options: [
          {
            id: "search",
            label: { ro: "Căutare avansată", en: "Advanced search" },
            desc: { ro: "Autocomplete și filtre.", en: "Autocomplete and filters." },
            price: 300,
          },
          {
            id: "reading-list",
            label: { ro: "Favorite / Reading list", en: "Favourites / reading list" },
            price: 250,
          },
          {
            id: "comments",
            label: { ro: "Comentarii + moderare", en: "Comments + moderation" },
            price: 300,
          },
          { id: "trending", label: { ro: "Trending / Popular", en: "Trending / popular" }, price: 200 },
          { id: "push", label: { ro: "Web push notifications", en: "Web push notifications" }, price: 350 },
          {
            id: "downloads",
            label: { ro: "Resource downloads", en: "Resource downloads" },
            desc: { ro: "PDF, ebook, whitepaper.", en: "PDF, ebook, whitepaper." },
            price: 250,
          },
          {
            id: "members",
            label: { ro: "Members area", en: "Members area" },
            desc: { ro: "Conturi și conținut privat.", en: "Accounts and private content." },
            price: 700,
          },
          {
            id: "paywall",
            label: { ro: "Paid content / abonamente", en: "Paid content / subscriptions" },
            desc: { ro: "Paywall și acces plătit.", en: "Paywall and paid access." },
            price: 1000,
            display: { ro: "de la +1.000 lei", en: "from +1,000 lei" },
          },
        ],
      },
    ],
  },
  {
    id: "marketing",
    num: "04",
    title: { ro: "Marketing & conversie", en: "Marketing & conversion" },
    groups: [
      {
        id: "marketing",
        kind: "multi",
        title: { ro: "Canale și integrări", en: "Channels and integrations" },
        options: [
          {
            id: "lead-form",
            label: { ro: "Formular lead principal", en: "Primary lead form" },
            price: 0,
            included: true,
          },
          { id: "newsletter", label: { ro: "Newsletter integration", en: "Newsletter integration" }, price: 250 },
          {
            id: "newsletter-auto",
            label: { ro: "Automatizare newsletter avansată", en: "Advanced newsletter automation" },
            price: 500,
          },
          { id: "whatsapp", label: { ro: "WhatsApp CTA inteligent", en: "Smart WhatsApp CTA" }, price: 150 },
          {
            id: "forms-context",
            label: { ro: "Formulare contextuale multiple", en: "Multiple contextual forms" },
            price: 200,
          },
          { id: "crm", label: { ro: "Integrare CRM", en: "CRM integration" }, price: 400 },
          { id: "booking", label: { ro: "Calendly / Booking", en: "Calendly / booking" }, price: 200 },
          { id: "meta-pixel", label: { ro: "Meta Pixel", en: "Meta Pixel" }, price: 100 },
          {
            id: "ads-tracking",
            label: { ro: "Google Ads conversion tracking", en: "Google Ads conversion tracking" },
            price: 100,
          },
          { id: "tiktok-pixel", label: { ro: "TikTok Pixel", en: "TikTok Pixel" }, price: 100 },
          {
            id: "webhooks",
            label: { ro: "Webhooks / API custom", en: "Custom webhooks / API" },
            price: 400,
            display: { ro: "de la +400 lei", en: "from +400 lei" },
          },
        ],
      },
    ],
  },
  {
    id: "seo",
    num: "05",
    title: { ro: "SEO & growth", en: "SEO & growth" },
    lead: {
      ro: "Fundația de SEO tehnic este inclusă. Aici adaugi instrumentele de creștere.",
      en: "Technical SEO groundwork is included. Here you add growth tooling.",
    },
    groups: [
      {
        id: "seo",
        kind: "multi",
        title: { ro: "Instrumente opționale", en: "Optional tooling" },
        options: [
          { id: "seo-dashboard", label: { ro: "SEO advanced dashboard", en: "Advanced SEO dashboard" }, price: 400 },
          {
            id: "internal-linking",
            label: { ro: "Internal linking intelligence", en: "Internal linking intelligence" },
            price: 350,
          },
          { id: "content-scoring", label: { ro: "SEO content scoring", en: "SEO content scoring" }, price: 400 },
          { id: "redirects", label: { ro: "Redirect manager", en: "Redirect manager" }, price: 200 },
          {
            id: "search-analytics",
            label: { ro: "Advanced search analytics", en: "Advanced search analytics" },
            price: 250,
          },
          {
            id: "geo-aeo",
            label: { ro: "Optimizare GEO / AEO", en: "GEO / AEO optimisation" },
            desc: {
              ro: "Structură suplimentară pentru conținut ușor de înțeles, extras și citat de motoarele moderne și sistemele AI.",
              en: "Extra structure so content is easy to parse, extract and cite for modern engines and AI systems.",
            },
            price: 400,
          },
        ],
      },
    ],
  },
  {
    id: "ai",
    num: "06",
    title: { ro: "AVYRON AI", en: "AVYRON AI" },
    note: {
      ro: "Costurile externe de API/consum, unde există, nu sunt incluse în estimare.",
      en: "External API/usage costs, where applicable, are not part of the estimate.",
    },
    groups: [
      {
        id: AI_GROUP_ID,
        kind: "multi",
        title: { ro: "Module AI opționale", en: "Optional AI modules" },
        options: [
          { id: "ai-writing", label: { ro: "AI writing assistant", en: "AI writing assistant" }, price: 400 },
          { id: "ai-seo", label: { ro: "AI SEO assistant", en: "AI SEO assistant" }, price: 350 },
          { id: "ai-brief", label: { ro: "AI content brief", en: "AI content brief" }, price: 300 },
          { id: "ai-related", label: { ro: "AI related content", en: "AI related content" }, price: 350 },
          { id: "ai-refresh", label: { ro: "AI content refresh", en: "AI content refresh" }, price: 500 },
          { id: "ai-translate", label: { ro: "AI translation", en: "AI translation" }, price: 350 },
          {
            id: AI_PACK_ID,
            label: { ro: "AVYRON AI Content Intelligence Pack", en: "AVYRON AI Content Intelligence Pack" },
            desc: {
              ro: "Pachet complet — include toate modulele AI de mai sus.",
              en: "Complete bundle — includes every AI module above.",
            },
            price: 1500,
          },
        ],
      },
    ],
  },
  {
    id: "multilingual",
    num: "07",
    title: { ro: "Multilingv", en: "Multilingual" },
    note: {
      ro: "Costul include infrastructura multilingvă. Traducerea integrală a conținutului se cotează separat.",
      en: "The price covers multilingual infrastructure. Full content translation is quoted separately.",
    },
    groups: [
      {
        id: "multilingual",
        kind: "single",
        defaultId: "lang-ro",
        title: { ro: "Limbi disponibile", en: "Available languages" },
        options: [
          { id: "lang-ro", label: { ro: "Română", en: "Romanian" }, price: 0, included: true },
          { id: "lang-ro-en", label: { ro: "Română + Engleză", en: "Romanian + English" }, price: 400 },
          { id: "lang-3", label: { ro: "3 limbi", en: "3 languages" }, price: 650 },
          {
            id: "lang-4",
            label: { ro: "4+ limbi", en: "4+ languages" },
            price: 0,
            customQuote: true,
            display: { ro: "Ofertă personalizată", en: "Custom quote" },
          },
        ],
      },
    ],
  },
  {
    id: "migration",
    num: "08",
    title: { ro: "Migrare blog existent", en: "Existing blog migration" },
    note: {
      ro: "Migrarea poate include maparea URL-urilor, redirecturi 301, imagini, metadata, categorii și autori, în funcție de platforma sursă și de calitatea datelor.",
      en: "Migration may cover URL mapping, 301 redirects, images, metadata, categories and authors, depending on the source platform and data quality.",
    },
    groups: [
      {
        id: "migration",
        kind: "single",
        defaultId: "mig-none",
        title: { ro: "Volum de conținut", en: "Content volume" },
        options: [
          { id: "mig-none", label: { ro: "Fără migrare", en: "No migration" }, price: 0, included: true },
          { id: "mig-25", label: { ro: "Până la 25 articole", en: "Up to 25 articles" }, price: 300 },
          { id: "mig-100", label: { ro: "26–100 articole", en: "26–100 articles" }, price: 600 },
          { id: "mig-500", label: { ro: "100–500 articole", en: "100–500 articles" }, price: 1200 },
          {
            id: "mig-max",
            label: { ro: "Peste 500 articole", en: "Over 500 articles" },
            price: 0,
            customQuote: true,
            display: { ro: "Ofertă personalizată", en: "Custom quote" },
          },
        ],
      },
    ],
  },
];

/** Individual AI modules covered by the bundle (never double-charged). */
export const AI_BUNDLED_IDS = CONFIG_STEPS.find((s) => s.id === "ai")!
  .groups[0].options.filter((o) => o.id !== AI_PACK_ID)
  .map((o) => o.id);

export type Selection = Record<string, string[]>;

export function defaultSelection(): Selection {
  const sel: Selection = {};
  for (const step of CONFIG_STEPS) {
    for (const group of step.groups) {
      sel[group.id] = group.defaultId ? [group.defaultId] : [];
    }
  }
  return sel;
}

export type PricedItem = { id: string; label: Bi; price: number; customQuote?: boolean };

export type Estimate = {
  items: PricedItem[];
  addons: number;
  total: number;
  hasCustomQuote: boolean;
};

export function computeEstimate(selection: Selection): Estimate {
  const aiPackSelected = (selection[AI_GROUP_ID] ?? []).includes(AI_PACK_ID);
  const items: PricedItem[] = [];
  let hasCustomQuote = false;

  for (const step of CONFIG_STEPS) {
    for (const group of step.groups) {
      const chosen = selection[group.id] ?? [];
      for (const option of group.options) {
        if (!chosen.includes(option.id)) continue;
        if (option.customQuote) {
          hasCustomQuote = true;
          items.push({ id: option.id, label: option.label, price: 0, customQuote: true });
          continue;
        }
        // The AI pack absorbs the individual AI modules.
        if (aiPackSelected && AI_BUNDLED_IDS.includes(option.id)) continue;
        if (option.price <= 0) continue;
        items.push({ id: option.id, label: option.label, price: option.price });
      }
    }
  }

  const addons = items.reduce((sum, it) => sum + it.price, 0);
  return { items, addons, total: BASE_PRICE + addons, hasCustomQuote };
}

export type LevelKey = "essential" | "professional" | "advanced" | "platform";

export const LEVELS: Array<{ key: LevelKey; min: number; label: Bi }> = [
  { key: "essential", min: 0, label: { ro: "Blog Profesional", en: "Professional blog" } },
  { key: "professional", min: 600, label: { ro: "Blog Avansat", en: "Advanced blog" } },
  { key: "advanced", min: 1600, label: { ro: "Content Hub", en: "Content hub" } },
  {
    key: "platform",
    min: 3000,
    label: { ro: "Platformă editorială inteligentă", en: "Intelligent content platform" },
  },
];

export function levelFor(addons: number) {
  let current = LEVELS[0];
  for (const level of LEVELS) if (addons >= level.min) current = level;
  const progress = Math.min(1, addons / 4000);
  return { ...current, progress };
}

const nf = new Intl.NumberFormat("ro-RO");

/** 1500 -> "1.500 lei" */
export function formatLei(value: number): string {
  return `${nf.format(value)} lei`;
}
