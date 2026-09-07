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

export type StepperConfig = {
  min: number;
  max: number;
  /** Quantities up to (and including) this value are part of the base package. */
  freeUpTo: number;
  /** Price per unit above `freeUpTo`, in RON. */
  unitPrice: number;
  unit: Bi;
  unitPlural: Bi;
};

export type ConfigGroup = {
  id: string;
  kind: "single" | "multi" | "stepper";
  title: Bi;
  hint?: Bi;
  options: ConfigOption[];
  /** Default selected option id (single-select groups). */
  defaultId?: string;
  /** Quantity control configuration (stepper groups). */
  stepper?: StepperConfig;
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
            desc: { ro: "Expertiză și trafic organic.", en: "Expertise and organic traffic." },
            price: 0,
            included: true,
          },
          {
            id: "expert",
            label: { ro: "Personal Brand", en: "Personal brand" },
            desc: { ro: "Autoritate personală.", en: "Personal authority." },
            price: 0,
            included: true,
          },
          {
            id: "hub",
            label: { ro: "Content Hub", en: "Content hub" },
            desc: { ro: "Ghiduri și resurse scalabile.", en: "Guides and resources at scale." },
            price: 600,
          },
          {
            id: "magazine",
            label: { ro: "Publicație", en: "Publication" },
            desc: { ro: "Volum mare, autori multipli.", en: "High volume, multiple authors." },
            price: 1200,
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
      ro: "Nu taxăm numărul de articole publicate.",
      en: "We never charge per published article.",
    },
    groups: [
      {
        id: "categories",
        kind: "single",
        defaultId: "cat-5",
        title: { ro: "Categorii", en: "Categories" },
        options: [
          { id: "cat-5", label: { ro: "Până la 5", en: "Up to 5" }, price: 0, included: true },
          { id: "cat-15", label: { ro: "6–15", en: "6–15" }, price: 200 },
          { id: "cat-tax", label: { ro: "Taxonomie complexă", en: "Complex taxonomy" }, price: 400 },
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
          { id: "auth-roles", label: { ro: "Nelimitat + roluri", en: "Unlimited + roles" }, price: 500 },
        ],
      },
    ],
  },
  {
    id: "premium",
    num: "03",
    title: { ro: "Funcții premium", en: "Premium features" },
    lead: {
      ro: "Adaugă doar ce folosești. Totul rămâne modular.",
      en: "Add only what you use. Everything stays modular.",
    },
    groups: [
      {
        id: "premium",
        kind: "multi",
        title: { ro: "Selectează funcțiile", en: "Select features" },
        options: [
          { id: "search", label: { ro: "Căutare avansată", en: "Advanced search" }, price: 300 },
          { id: "reading-list", label: { ro: "Reading list", en: "Reading list" }, price: 250 },
          { id: "comments", label: { ro: "Comentarii + moderare", en: "Comments + moderation" }, price: 300 },
          { id: "push", label: { ro: "Web push", en: "Web push" }, price: 350 },
          { id: "members", label: { ro: "Members area", en: "Members area" }, price: 700 },
          {
            id: "paywall",
            label: { ro: "Conținut plătit", en: "Paid content" },
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
          { id: "lead-form", label: { ro: "Formular lead", en: "Lead form" }, price: 0, included: true },
          { id: "newsletter", label: { ro: "Newsletter", en: "Newsletter" }, price: 250 },
          { id: "whatsapp", label: { ro: "WhatsApp CTA", en: "WhatsApp CTA" }, price: 150 },
          { id: "crm", label: { ro: "Integrare CRM", en: "CRM integration" }, price: 400 },
          { id: "booking", label: { ro: "Calendly / Booking", en: "Calendly / booking" }, price: 200 },
          {
            id: "tracking",
            label: { ro: "Pixeluri & conversii", en: "Pixels & conversions" },
            desc: { ro: "Meta, Google Ads, TikTok.", en: "Meta, Google Ads, TikTok." },
            price: 150,
          },
          {
            id: "webhooks",
            label: { ro: "Webhooks / API", en: "Webhooks / API" },
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
    title: { ro: "SEO, growth & AI", en: "SEO, growth & AI" },
    lead: {
      ro: "SEO tehnic este inclus. Aici adaugi instrumentele de creștere.",
      en: "Technical SEO is included. Here you add growth tooling.",
    },
    note: {
      ro: "Costurile externe de API/consum nu sunt incluse în estimare.",
      en: "External API/usage costs are not part of the estimate.",
    },
    groups: [
      {
        id: "seo",
        kind: "multi",
        title: { ro: "Instrumente SEO", en: "SEO tooling" },
        options: [
          { id: "seo-dashboard", label: { ro: "SEO dashboard", en: "SEO dashboard" }, price: 400 },
          { id: "internal-linking", label: { ro: "Internal linking", en: "Internal linking" }, price: 350 },
          { id: "content-scoring", label: { ro: "Content scoring", en: "Content scoring" }, price: 400 },
          {
            id: "geo-aeo",
            label: { ro: "Optimizare GEO / AEO", en: "GEO / AEO optimisation" },
            desc: { ro: "Conținut citabil de motoarele AI.", en: "Content citable by AI engines." },
            price: 400,
          },
        ],
      },
      {
        id: AI_GROUP_ID,
        kind: "multi",
        title: { ro: "Module AVYRON AI", en: "AVYRON AI modules" },
        options: [
          {
            id: "ai-writing",
            label: { ro: "AI writing assistant", en: "AI writing assistant" },
            desc: { ro: "Claude · ChatGPT — schițe și titluri.", en: "Claude · ChatGPT — drafts and headlines." },
            price: 400,
          },
          {
            id: "ai-seo",
            label: { ro: "AI SEO assistant", en: "AI SEO assistant" },
            desc: { ro: "Gemini · ChatGPT — meta și structură.", en: "Gemini · ChatGPT — meta and structure." },
            price: 350,
          },
          {
            id: "ai-related",
            label: { ro: "AI related content", en: "AI related content" },
            desc: { ro: "Embeddings — articole conexe.", en: "Embeddings — related articles." },
            price: 350,
          },
          {
            id: "ai-refresh",
            label: { ro: "AI content refresh", en: "AI content refresh" },
            desc: { ro: "Claude — articole de actualizat.", en: "Claude — articles to refresh." },
            price: 500,
          },
          {
            id: AI_PACK_ID,
            label: { ro: "AI Content Intelligence Pack", en: "AI Content Intelligence Pack" },
            desc: { ro: "Include toate modulele AI.", en: "Includes every AI module." },
            price: 1000,
          },
        ],

      },
    ],
  },
  {
    id: "scale",
    num: "06",
    title: { ro: "Limbi & migrare", en: "Languages & migration" },
    note: {
      ro: "Traducerea integrală a conținutului se cotează separat.",
      en: "Full content translation is quoted separately.",
    },
    groups: [
      {
        id: "multilingual",
        kind: "stepper",
        title: { ro: "Limbi", en: "Languages" },
        hint: {
          ro: "Primele două limbi sunt incluse. De la a 3-a: +100 lei/limbă.",
          en: "The first two languages are included. From the 3rd: +100 lei/language.",
        },
        stepper: {
          min: 1,
          max: 8,
          freeUpTo: 2,
          unitPrice: 100,
          unit: { ro: "limbă", en: "language" },
          unitPlural: { ro: "limbi", en: "languages" },
        },
        options: [],
      },

      {
        id: "migration",
        kind: "single",
        defaultId: "mig-none",
        title: { ro: "Migrare blog existent", en: "Existing blog migration" },
        options: [
          { id: "mig-none", label: { ro: "Fără migrare", en: "No migration" }, price: 0, included: true },
          { id: "mig-25", label: { ro: "Până la 25 articole", en: "Up to 25 articles" }, price: 300 },
          { id: "mig-100", label: { ro: "26–100 articole", en: "26–100 articles" }, price: 600 },
          {
            id: "mig-max",
            label: { ro: "Peste 100 articole", en: "Over 100 articles" },
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
export const AI_BUNDLED_IDS = CONFIG_STEPS.flatMap((s) => s.groups)
  .find((g) => g.id === AI_GROUP_ID)!
  .options.filter((o) => o.id !== AI_PACK_ID)
  .map((o) => o.id);

export type Selection = Record<string, string[]>;

export function defaultSelection(): Selection {
  const sel: Selection = {};
  for (const step of CONFIG_STEPS) {
    for (const group of step.groups) {
      if (group.kind === "stepper" && group.stepper) sel[group.id] = [String(group.stepper.min)];
      else sel[group.id] = group.defaultId ? [group.defaultId] : [];
    }
  }
  return sel;
}

/** Reads the numeric quantity of a stepper group from the selection. */
export function stepperValue(selection: Selection, group: ConfigGroup): number {
  const cfg = group.stepper;
  if (!cfg) return 0;
  const raw = Number((selection[group.id] ?? [])[0]);
  if (!Number.isFinite(raw)) return cfg.min;
  return Math.min(cfg.max, Math.max(cfg.min, Math.round(raw)));
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
