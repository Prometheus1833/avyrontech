export type CommerceItemType = "package" | "subscription" | "website" | "custom";

export type CommerceCatalogItem = {
  sku: string;
  type: CommerceItemType;
  name: string;
  unitPriceCents: number | null;
};

/**
 * Public presentation data only. The Worker imports the same catalogue and is
 * the authority for every price calculation; browser-supplied prices are never
 * trusted.
 */
export const COMMERCE_CATALOG: readonly CommerceCatalogItem[] = [
  { sku: "website-starter", type: "package", name: "Pachet Starter Website", unitPriceCents: 49_000 },
  { sku: "website-business", type: "package", name: "Pachet Business Website", unitPriceCents: 99_000 },
  { sku: "website-premium-seo", type: "package", name: "Pachet Premium + SEO", unitPriceCents: 149_000 },
  { sku: "maintenance-monthly", type: "package", name: "Pachet Mentenanță Lunar", unitPriceCents: 9_900 },
  { sku: "custom-request", type: "custom", name: "Produs personalizat", unitPriceCents: null },
] as const;

export const commerceItemBySku = (sku: string) =>
  COMMERCE_CATALOG.find((item) => item.sku === sku) ?? null;

export const commerceItemByName = (name: string) =>
  COMMERCE_CATALOG.find((item) => item.name === name) ?? null;
