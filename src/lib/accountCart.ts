import { cfAuth } from "@/lib/cfAuth";
import type { CommerceCurrency, CommerceItemType } from "@/data/commerceCatalog";

export type AccountCartSource = "dashboard" | "subscriptions" | "services" | "products";
export type AccountCartType = CommerceItemType | "service" | "product" | "partnership";

export type AccountCartItem = {
  id: string;
  source: AccountCartSource;
  sku: string;
  type: AccountCartType;
  name: string;
  period?: "monthly" | "annual";
  notes?: string;
  productSlug?: string;
  /** Exclusiv pentru afișarea locală; Worker-ul nu îl persistă și nu îl crede. */
  price_estimate?: number;
  price_currency?: CommerceCurrency;
};

export const ACCOUNT_CART_KEY = "avyron_cart_v2";
export const ACCOUNT_CART_EVENT = "avyron:cart-updated";

const identity = (item: Pick<AccountCartItem, "source" | "id">) => `${item.source}:${item.id}`;
const CART_SOURCES: AccountCartSource[] = ["dashboard", "subscriptions", "services", "products"];

export function mergeAccountCartItems(...groups: AccountCartItem[][]): AccountCartItem[] {
  const merged = new Map<string, AccountCartItem>();
  for (const item of groups.flat()) merged.set(identity(item), item);
  return [...merged.values()].slice(0, 20);
}

export function readLocalAccountCart(): AccountCartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNT_CART_KEY) || "[]") as Array<Partial<AccountCartItem>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 20).flatMap((item) => {
      const name = String(item.name ?? "").trim().slice(0, 120);
      if (!name) return [];
      return [{
        id: String(item.id || crypto.randomUUID()).slice(0, 100),
        source: CART_SOURCES.includes(item.source as AccountCartSource)
          ? item.source as AccountCartSource
          : "dashboard",
        sku: String(item.sku || "custom-request").slice(0, 80),
        type: item.type || "custom",
        name,
        ...(item.period === "monthly" || item.period === "annual" ? { period: item.period } : {}),
        ...(item.notes ? { notes: String(item.notes).slice(0, 1000) } : {}),
        ...(item.productSlug ? { productSlug: String(item.productSlug).slice(0, 100) } : {}),
        ...(Number.isFinite(item.price_estimate) ? { price_estimate: Number(item.price_estimate) } : {}),
        ...(item.price_currency === "RON" || item.price_currency === "EUR" ? { price_currency: item.price_currency } : {}),
      } satisfies AccountCartItem];
    });
  } catch {
    return [];
  }
}

export function writeLocalAccountCart(items: AccountCartItem[]) {
  try {
    localStorage.setItem(ACCOUNT_CART_KEY, JSON.stringify(items.slice(0, 20)));
    window.dispatchEvent(new CustomEvent(ACCOUNT_CART_EVENT));
  } catch {
    // Safari private mode can reject storage; the active React state still works.
  }
}

export function addLocalAccountCartItem(item: AccountCartItem) {
  const previous = readLocalAccountCart();
  const withoutReplacedSubscription = item.type === "subscription"
    ? previous.filter((entry) => entry.type !== "subscription")
    : previous;
  const items = mergeAccountCartItems(withoutReplacedSubscription, [item]);
  writeLocalAccountCart(items);
  return items;
}

const stripDisplayPrices = (items: AccountCartItem[]) => items.map(({ price_estimate: _price, price_currency: _currency, ...item }) => item);

export const accountCartApi = {
  async load(): Promise<AccountCartItem[]> {
    const response = await cfAuth.request<{ data: AccountCartItem[] }>("/api/commerce/cart");
    return Array.isArray(response.data) ? response.data : [];
  },
  async save(items: AccountCartItem[]): Promise<AccountCartItem[]> {
    const response = await cfAuth.request<{ data: AccountCartItem[] }>("/api/commerce/cart", {
      method: "PUT",
      body: JSON.stringify({ items: stripDisplayPrices(items) }),
    });
    return response.data ?? [];
  },
  async replaceSource(source: AccountCartSource, items: AccountCartItem[]): Promise<AccountCartItem[]> {
    const response = await cfAuth.request<{ data: AccountCartItem[] }>("/api/commerce/cart/sync", {
      method: "POST",
      body: JSON.stringify({ source, items: stripDisplayPrices(items.map((item) => ({ ...item, source }))) }),
    });
    return response.data ?? [];
  },
};

/** Sincronizează doar compartimentul care tocmai s-a schimbat. */
export function syncLocalAccountCartSource(source: AccountCartSource) {
  return accountCartApi.replaceSource(
    source,
    readLocalAccountCart().filter((item) => item.source === source),
  );
}
