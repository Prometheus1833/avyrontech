export const WEBSITE_BASE_PRICE_RON = 1150;
export const WEBSITE_BASE_PRICE_EUR = 220;

export type WebsitePageScope = "compact" | "business" | "extended";
export type WebsiteContentScope = "ready" | "assisted" | "complete";
export type WebsiteAddon = "bilingual" | "booking" | "catalog" | "motion" | "integrations";
export type WebsiteDiscount = "avyron-credit" | "nonprofit";

export type WebsiteEstimatorSelection = {
  pages: WebsitePageScope;
  content: WebsiteContentScope;
  addons: WebsiteAddon[];
  emailAccounts?: number;
  discounts?: WebsiteDiscount[];
};

type PricedOption = { priceRon: number; days: number };

export const WEBSITE_PAGE_OPTIONS: Record<WebsitePageScope, PricedOption> = {
  compact: { priceRon: 0, days: 0 },
  business: { priceRon: 250, days: 2 },
  extended: { priceRon: 500, days: 4 },
};

export const WEBSITE_CONTENT_OPTIONS: Record<WebsiteContentScope, PricedOption> = {
  ready: { priceRon: 0, days: 0 },
  assisted: { priceRon: 250, days: 1 },
  complete: { priceRon: 500, days: 3 },
};

export const WEBSITE_ADDON_OPTIONS: Record<WebsiteAddon, PricedOption> = {
  bilingual: { priceRon: 100, days: 2 },
  booking: { priceRon: 350, days: 2 },
  catalog: { priceRon: 550, days: 3 },
  motion: { priceRon: 600, days: 3 },
  integrations: { priceRon: 400, days: 2 },
};

export const DEFAULT_WEBSITE_ESTIMATOR_SELECTION: WebsiteEstimatorSelection = {
  pages: "compact",
  content: "ready",
  addons: [],
  emailAccounts: 0,
  discounts: [],
};

export type WebsiteEstimate = {
  lowRon: number;
  highRon: number;
  subtotalRon: number;
  discountRon: number;
  daysMin: number;
  daysMax: number;
  profile: "essential" | "growth" | "signature";
};

const roundToTen = (value: number) => Math.round(value / 10) * 10;

/**
 * Estimare comercială, nu ofertă automată. RON este sursa de adevăr;
 * intervalul superior păstrează loc pentru dependențele descoperite în brief.
 */
export function calculateWebsiteEstimate(selection: WebsiteEstimatorSelection): WebsiteEstimate {
  const pageOption = WEBSITE_PAGE_OPTIONS[selection.pages];
  const contentOption = WEBSITE_CONTENT_OPTIONS[selection.content];
  const addons = selection.addons.map((addon) => WEBSITE_ADDON_OPTIONS[addon]);
  const subtotalRon = WEBSITE_BASE_PRICE_RON
    + pageOption.priceRon
    + contentOption.priceRon
    + addons.reduce((sum, addon) => sum + addon.priceRon, 0)
    + Math.min(4, Math.max(0, selection.emailAccounts ?? 0)) * 50;
  const discountRate = Math.min(0.2, (selection.discounts ?? []).length * 0.1);
  const discountRon = roundToTen(subtotalRon * discountRate);
  const lowRon = subtotalRon - discountRon;
  const discoveryMargin = Math.max(100, roundToTen(lowRon * (0.09 + selection.addons.length * 0.01)));
  const rawDays = 4 + pageOption.days + contentOption.days + addons.reduce((sum, addon) => sum + addon.days, 0);
  const daysMax = Math.max(5, Math.ceil(rawDays * 0.78));
  const daysMin = Math.max(2, daysMax - 2);

  const profile = selection.pages === "extended" || lowRon >= 2_600
    ? "signature"
    : selection.pages === "business" || selection.addons.length >= 2 || lowRon >= 1_500
      ? "growth"
      : "essential";

  return {
    lowRon,
    highRon: roundToTen(lowRon + discoveryMargin),
    subtotalRon,
    discountRon,
    daysMin,
    daysMax,
    profile,
  };
}

/** Echivalent EUR comercial, fix și rotunjit; nu depinde de cursul zilei. */
export const fixedWebsiteEur = (amountRon: number) => amountRon === 0
  ? 0
  : Math.max(10, Math.round(amountRon / 5.25 / 10) * 10);
