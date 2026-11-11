import {
  commerceItemBySku,
  type CommerceCatalogItem,
} from "@/data/commerceCatalog";
import type { AccountCartItem } from "./accountCart";
export type CartCatalogEntry = {
  key: string;
  name: string;
  category: string;
  sku: string | null;
  priceMinor: number | null;
  currency: string;
  payable: boolean;
  priceModel?: string;
  billingCycle?: string;
};
export type Catalog = {
  services: CartCatalogEntry[];
  products: CartCatalogEntry[];
  subscriptions?: CommerceCatalogItem[];
};
export function cartDisplayItem(
  item: AccountCartItem,
  catalog: Catalog,
): AccountCartItem {
  const entry =
    item.serviceKey && item.type !== "subscription"
      ? catalog.services.find((e) => e.key === item.serviceKey)
      : item.productSlug
        ? catalog.products.find((e) => e.key === item.productSlug)
        : [...catalog.services, ...catalog.products].find(
            (e) => e.sku === item.sku,
          );
  if (entry) {
    const recurring = item.type === "service" && entry.sku && commerceItemBySku(entry.sku)?.type === "subscription";
    return {
      ...item,
      name: entry.name,
      sku: entry.sku || "custom-request",
      ...(recurring ? { type: "subscription", period: item.period ?? "monthly" } as const : {}),
      price_estimate: ["RON", "EUR"].includes(entry.currency)
        ? (entry.priceMinor ?? undefined)
        : undefined,
      price_currency: entry.currency === "EUR" ? "EUR" : "RON",
    };
  }
  const preset =
    (catalog.subscriptions || []).find((p) => p.sku === item.sku) ||
    commerceItemBySku(item.sku);
  if (preset)
    return {
      ...item,
      name: preset.name,
      price_estimate: preset.unitPriceCents ?? undefined,
      price_currency: preset.currency,
    };
  return { ...item, price_estimate: undefined, price_currency: undefined };
}
export function safeInvoiceDownload(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (/^\/api\/workspace\/invoices\/[A-Za-z0-9_%.-]+\/content$/.test(url))
    return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      ["oblio.eu", "www.oblio.eu", "api.oblio.eu"].includes(parsed.hostname)
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

/** Provider redirects never receive the AVYRON bearer token. */
export function safePaymentRedirect(raw: string | null | undefined, provider: "stripe" | "revolut") {
  let url: URL;
  try{url=new URL(raw || "")}catch{throw Error("Procesatorul nu a returnat o adresă de plată sigură.")}
  const allowed = provider === "stripe" ? ["checkout.stripe.com", "billing.stripe.com"] : ["checkout.revolut.com", "pay.revolut.com", "revolut.me"];
  if (url.protocol !== "https:" || url.username || url.password || url.port || !allowed.includes(url.hostname)) throw Error("Procesatorul nu a returnat o adresă de plată sigură.");
  return url.href;
}
