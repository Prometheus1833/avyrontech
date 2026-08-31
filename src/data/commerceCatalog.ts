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
 */
export const COMMERCE_CATALOG: readonly CommerceCatalogItem[] = [
  { sku: "website-starter", type: "package", name: "Pachet Starter Website", unitPriceCents: 49_000, currency: "RON", billing: "one_time" },
  { sku: "website-business", type: "package", name: "Pachet Business Website", unitPriceCents: 99_000, currency: "RON", billing: "one_time" },
  { sku: "website-premium-seo", type: "package", name: "Pachet Premium + SEO", unitPriceCents: 149_000, currency: "RON", billing: "one_time" },
  { sku: "care-plus", type: "subscription", name: "Abonament Plus", unitPriceCents: 5_000, currency: "EUR", billing: "monthly" },
  { sku: "care-pro", type: "subscription", name: "Abonament Pro", unitPriceCents: 15_000, currency: "EUR", billing: "monthly" },
  { sku: "care-pro-active", type: "subscription", name: "Abonament Pro Activ", unitPriceCents: 30_000, currency: "EUR", billing: "monthly" },
  { sku: "custom-request", type: "custom", name: "Produs personalizat", unitPriceCents: null, currency: "RON", billing: "one_time" },
] as const;

const LEGACY_SKU_ALIASES: Readonly<Record<string, string>> = {
  "maintenance-monthly": "care-plus",
};

export const commerceItemBySku = (sku: string) =>
  COMMERCE_CATALOG.find((item) => item.sku === (LEGACY_SKU_ALIASES[sku] ?? sku)) ?? null;

export const commerceItemByName = (name: string) =>
  COMMERCE_CATALOG.find((item) => item.name === name) ?? null;
