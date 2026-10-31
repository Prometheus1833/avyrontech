export type CommerceItemType = "package" | "subscription" | "website" | "custom";
export type CommerceCurrency = "RON" | "EUR";

export type CommerceCatalogItem = {
  sku: string;
  type: CommerceItemType;
  name: string;
  unitPriceCents: number | null;
  currency: CommerceCurrency;
  billing: "one_time" | "monthly";
};

/**
 * Public presentation data only. The Worker imports the same catalogue and is
 * the authority for every price calculation; browser-supplied prices are never
 * trusted.
 *
 * Abonamentele `sub-<categorie>-<treaptă>` sunt facturate lunar în lei și sunt
 * sursa de adevăr pentru pagina /mentenanta-si-colaborari, pentru cardurile de
 * pe paginile de produs și pentru contul clientului. Intrările `care-*` rămân
 * pentru comenzile și coșurile deja existente.
 */
export const COMMERCE_CATALOG: readonly CommerceCatalogItem[] = [
  { sku: "website-starter", type: "package", name: "Pachet Starter Website", unitPriceCents: 49_000, currency: "RON", billing: "one_time" },
  { sku: "website-business", type: "package", name: "Pachet Business Website", unitPriceCents: 99_000, currency: "RON", billing: "one_time" },
  { sku: "website-premium-seo", type: "package", name: "Pachet Premium + SEO", unitPriceCents: 149_000, currency: "RON", billing: "one_time" },
  { sku: "care-plus", type: "subscription", name: "Abonament Plus", unitPriceCents: 5_000, currency: "EUR", billing: "monthly" },
  { sku: "care-pro", type: "subscription", name: "Abonament Pro", unitPriceCents: 15_000, currency: "EUR", billing: "monthly" },
  { sku: "care-pro-active", type: "subscription", name: "Abonament Pro Activ", unitPriceCents: 30_000, currency: "EUR", billing: "monthly" },
  { sku: "sub-site-plus", type: "subscription", name: "Mentenanță Site de prezentare — Plus", unitPriceCents: 5_000, currency: "RON", billing: "monthly" },
  { sku: "sub-site-pro", type: "subscription", name: "Mentenanță Site de prezentare — Pro", unitPriceCents: 10_000, currency: "RON", billing: "monthly" },
  { sku: "sub-site-proactiv", type: "subscription", name: "Mentenanță Site de prezentare — Pro Activ", unitPriceCents: 20_000, currency: "RON", billing: "monthly" },

  { sku: "sub-shop-plus", type: "subscription", name: "Mentenanță Magazin online — Plus", unitPriceCents: 20_000, currency: "RON", billing: "monthly" },
  { sku: "sub-shop-pro", type: "subscription", name: "Mentenanță Magazin online — Pro", unitPriceCents: 40_000, currency: "RON", billing: "monthly" },
  { sku: "sub-shop-proactiv", type: "subscription", name: "Mentenanță Magazin online — Pro Activ", unitPriceCents: 60_000, currency: "RON", billing: "monthly" },

  { sku: "sub-blog-plus", type: "subscription", name: "Mentenanță Blog profesional — Plus", unitPriceCents: 10_000, currency: "RON", billing: "monthly" },
  { sku: "sub-blog-pro", type: "subscription", name: "Mentenanță Blog profesional — Pro", unitPriceCents: 20_000, currency: "RON", billing: "monthly" },
  { sku: "sub-blog-proactiv", type: "subscription", name: "Mentenanță Blog profesional — Pro Activ", unitPriceCents: 30_000, currency: "RON", billing: "monthly" },

  { sku: "sub-ai-plus", type: "subscription", name: "Mentenanță Agent AI — Plus", unitPriceCents: 25_000, currency: "RON", billing: "monthly" },
  { sku: "sub-ai-pro", type: "subscription", name: "Mentenanță Agent AI — Pro", unitPriceCents: 35_000, currency: "RON", billing: "monthly" },
  { sku: "sub-ai-proactiv", type: "subscription", name: "Mentenanță Agent AI — Pro Activ", unitPriceCents: 50_000, currency: "RON", billing: "monthly" },

  { sku: "sub-app-plus", type: "subscription", name: "Mentenanță Aplicație web/mobile — Plus", unitPriceCents: 50_000, currency: "RON", billing: "monthly" },
  { sku: "sub-app-pro", type: "subscription", name: "Mentenanță Aplicație web/mobile — Pro", unitPriceCents: 100_000, currency: "RON", billing: "monthly" },
  { sku: "sub-app-proactiv", type: "subscription", name: "Mentenanță Aplicație web/mobile — Pro Activ", unitPriceCents: 150_000, currency: "RON", billing: "monthly" },

  { sku: "sub-seo-essential", type: "subscription", name: "SEO & AI Performance and Visibility — Essential", unitPriceCents: 69_000, currency: "RON", billing: "monthly" },
  { sku: "sub-seo-growth", type: "subscription", name: "SEO & AI Performance and Visibility — Growth", unitPriceCents: 129_000, currency: "RON", billing: "monthly" },
  { sku: "sub-seo-premium", type: "subscription", name: "SEO & AI Performance and Visibility — Premium", unitPriceCents: 249_000, currency: "RON", billing: "monthly" },
  { sku: "sub-ads-start", type: "subscription", name: "Digital Marketing & Ads — Ads Start", unitPriceCents: 99_000, currency: "RON", billing: "monthly" },
  { sku: "sub-ads-growth", type: "subscription", name: "Digital Marketing & Ads — Ads Growth", unitPriceCents: 169_000, currency: "RON", billing: "monthly" },
  { sku: "sub-ads-performance", type: "custom", name: "Digital Marketing & Ads — Ads Performance (de la)", unitPriceCents: null, currency: "RON", billing: "monthly" },
  { sku: "seo-opt-5-15", type: "package", name: "Optimizare SEO unică — 5–15 pagini", unitPriceCents: 55_000, currency: "RON", billing: "one_time" },
  { sku: "seo-opt-15-30", type: "package", name: "Optimizare SEO unică — 15–30 pagini", unitPriceCents: 89_000, currency: "RON", billing: "one_time" },
  { sku: "seo-opt-30-50", type: "package", name: "Optimizare SEO unică — 30–50 pagini", unitPriceCents: 129_000, currency: "RON", billing: "one_time" },
  { sku: "ads-setup", type: "custom", name: "Configurare inițială Ads (de la)", unitPriceCents: null, currency: "RON", billing: "one_time" },

  { sku: "custom-request", type: "custom", name: "Produs personalizat", unitPriceCents: null, currency: "RON", billing: "one_time" },
] as const;

const LEGACY_SKU_ALIASES: Readonly<Record<string, string>> = {
  "maintenance-monthly": "care-plus",
};

export const commerceItemBySku = (sku: string) =>
  COMMERCE_CATALOG.find((item) => item.sku === (LEGACY_SKU_ALIASES[sku] ?? sku)) ?? null;

export const commerceItemByName = (name: string) =>
  COMMERCE_CATALOG.find((item) => item.name === name) ?? null;

const SUBSCRIPTION_SERVICE_PREFIXES: Readonly<Record<string, readonly string[]>> = {
  "sub-site-": ["premium-website"],
  "sub-shop-": ["online-store"],
  "sub-blog-": ["blog-profesional"],
  "sub-ai-": ["ai-agent"],
  "sub-app-": ["apps"],
  "sub-seo-": ["seo-ai"],
  "sub-ads-": ["marketing-ads"],
};

export const subscriptionServiceKeys = (sku: string): readonly string[] | null =>
  Object.entries(SUBSCRIPTION_SERVICE_PREFIXES).find(([prefix]) => sku.startsWith(prefix))?.[1] ?? null;

export const serviceMatchesSubscription = (sku: string, serviceKey: string) => {
  const keys = subscriptionServiceKeys(sku);
  return keys === null || keys.includes(serviceKey);
};

/** Bani (RON) pentru un abonament din catalog. Aruncă la build pentru SKU necunoscut. */
export const subscriptionPriceCents = (sku: string): number => {
  const item = commerceItemBySku(sku);
  if (!item || item.unitPriceCents === null || item.currency !== "RON") {
    throw new Error(`Unknown RON subscription SKU: ${sku}`);
  }
  return item.unitPriceCents;
};
