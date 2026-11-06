import { cfAuth } from "@/lib/cfAuth";
import type {
  CommerceCurrency,
  CommerceItemType,
} from "@/data/commerceCatalog";

export type AccountCartSource =
  | "dashboard"
  | "subscriptions"
  | "services"
  | "products";
export type AccountCartType =
  | CommerceItemType
  | "service"
  | "product"
  | "partnership";

export type AccountCartItem = {
  id: string;
  source: AccountCartSource;
  sku: string;
  type: AccountCartType;
  name: string;
  period?: "monthly" | "annual";
  notes?: string;
  productSlug?: string;
  serviceKey?: string;
  /** Exclusiv pentru afișarea locală; Worker-ul nu îl persistă și nu îl crede. */
  price_estimate?: number;
  price_currency?: CommerceCurrency;
};

export const ACCOUNT_CART_KEY = "avyron_cart_v2";
export const ACCOUNT_CART_OWNER_KEY = "avyron_cart_owner_v1";
export const ACCOUNT_CART_EVENT = "avyron:cart-updated";
const transient = new Map<string, string | null>(),
  unavailable = new Set<string>();
let activeOwner: string | null = null;
function foreignCartStorage() {
  if (!activeOwner) return false;
  try {
    return localStorage.getItem(ACCOUNT_CART_OWNER_KEY) !== activeOwner;
  } catch {
    return false;
  }
}
/** Browser storage may be denied; authenticated synchronization still uses the active draft. */
export const cartStorage = {
  getItem(key: string): string | null {
    if (foreignCartStorage())
      return key === ACCOUNT_CART_OWNER_KEY
        ? activeOwner
        : (transient.get(key) ?? null);
    if (unavailable.has(key)) return transient.get(key) ?? null;
    try {
      return localStorage.getItem(key);
    } catch {
      return transient.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    transient.set(key, value);
    if (key !== ACCOUNT_CART_OWNER_KEY && foreignCartStorage()) {
      unavailable.add(key);
      return;
    }
    try {
      localStorage.setItem(key, value);
      unavailable.delete(key);
    } catch {
      unavailable.add(key);
    }
  },
  removeItem(key: string) {
    transient.set(key, null);
    if (key !== ACCOUNT_CART_OWNER_KEY && foreignCartStorage()) {
      unavailable.add(key);
      return;
    }
    try {
      localStorage.removeItem(key);
      unavailable.delete(key);
    } catch {
      unavailable.add(key);
    }
  },
};
const PENDING_KEY = "avyron_cart_pending_v1";
type Pending = {
  version: string;
  upserts: Record<string, AccountCartItem>;
  removed: string[];
};
export function pendingAccountCart(): Pending {
  try {
    const value = JSON.parse(cartStorage.getItem(PENDING_KEY) || "null");
    if (
      !value ||
      typeof value.version !== "string" ||
      !value.upserts ||
      typeof value.upserts !== "object" ||
      !Array.isArray(value.removed)
    )
      throw new Error("invalid_pending");
    const upserts = Object.fromEntries(
      Object.values(value.upserts)
        .slice(0, 20)
        .filter((item): item is AccountCartItem =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as AccountCartItem).id === "string" &&
              typeof (item as AccountCartItem).name === "string" &&
              typeof (item as AccountCartItem).sku === "string" &&
              CART_SOURCES.includes((item as AccountCartItem).source),
          ),
        )
        .map((item) => [identity(item), item]),
    );
    return {
      version: value.version,
      upserts,
      removed: value.removed
        .filter((key: unknown) => typeof key === "string")
        .slice(0, 100),
    };
  } catch {
    return { version: "", upserts: {}, removed: [] };
  }
}
export const hasPendingCart = () => {
  const p = pendingAccountCart();
  return Object.keys(p.upserts).length > 0 || p.removed.length > 0;
};
export function prepareCartOwner(owner: string) {
  const previous = cartStorage.getItem(ACCOUNT_CART_OWNER_KEY);
  let sharedOwner = previous;
  try {
    sharedOwner = localStorage.getItem(ACCOUNT_CART_OWNER_KEY);
  } catch {
    /* private browsing */
  }
  if (previous !== owner) {
    for (const request of requests) request.abort();
    requests.clear();
  }
  activeOwner = owner;
  cartStorage.setItem(ACCOUNT_CART_OWNER_KEY, owner);
  if (
    (previous && previous !== owner && previous !== "guest") ||
    (sharedOwner && sharedOwner !== owner && sharedOwner !== "guest")
  ) {
    cartStorage.removeItem(ACCOUNT_CART_KEY);
    cartStorage.removeItem(PENDING_KEY);
  }
}
export function replayPendingCart(cloud: AccountCartItem[]): AccountCartItem[] {
  const p = pendingAccountCart();
  return mergeAccountCartItems(
    cloud.filter((item) => !p.removed.includes(identity(item))),
    Object.values(p.upserts),
  );
}
let cartBridge: null | (() => Promise<AccountCartItem[]>) = null;
export const setCartBridge = (bridge: typeof cartBridge) => {
  cartBridge = bridge;
};
let writeQueue: Promise<unknown> = Promise.resolve();
const requests = new Set<AbortController>();
async function cartRequest<T>(
  path: string,
  init: RequestInit = {},
  controller = new AbortController(),
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      cfAuth.request<T>(path, { ...init, signal: controller.signal }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("cart_request_timeout"));
        }, 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
function serializeCart<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.catch(() => {}).then(operation);
  writeQueue = run;
  return run;
}
function confirmPending(version: string, source?: AccountCartSource) {
  try {
    const pending = pendingAccountCart();
    if (pending.version !== version) return;
    if (source) {
      for (const key of Object.keys(pending.upserts))
        if (pending.upserts[key].source === source) delete pending.upserts[key];
      pending.removed = pending.removed.filter(
        (key) => !key.startsWith(source + ":"),
      );
      cartStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    } else cartStorage.removeItem(PENDING_KEY);
  } catch {
    /* Active state remains usable without storage. */
  }
}

const identity = (item: Pick<AccountCartItem, "source" | "id">) =>
  `${item.source}:${item.id}`;
const CART_SOURCES: AccountCartSource[] = [
  "dashboard",
  "subscriptions",
  "services",
  "products",
];

export function mergeAccountCartItems(
  ...groups: AccountCartItem[][]
): AccountCartItem[] {
  const merged = new Map<string, AccountCartItem>();
  for (const item of groups.flat()) merged.set(identity(item), item);
  return [...merged.values()].slice(0, 20);
}

export function readLocalAccountCart(): AccountCartItem[] {
  try {
    const parsed = JSON.parse(
      cartStorage.getItem(ACCOUNT_CART_KEY) || "[]",
    ) as Array<Partial<AccountCartItem>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 20).flatMap((item) => {
      const name = String(item.name ?? "")
        .trim()
        .slice(0, 120);
      if (!name) return [];
      return [
        {
          id: String(item.id || crypto.randomUUID()).slice(0, 100),
          source: CART_SOURCES.includes(item.source as AccountCartSource)
            ? (item.source as AccountCartSource)
            : "dashboard",
          sku: String(item.sku || "custom-request").slice(0, 80),
          type: item.type || "custom",
          name,
          ...(item.period === "monthly" || item.period === "annual"
            ? { period: item.period }
            : {}),
          ...(item.notes ? { notes: String(item.notes).slice(0, 1000) } : {}),
          ...(item.productSlug
            ? { productSlug: String(item.productSlug).slice(0, 100) }
            : {}),
          ...(item.serviceKey
            ? { serviceKey: String(item.serviceKey).slice(0, 120) }
            : {}),
          ...(Number.isFinite(item.price_estimate)
            ? { price_estimate: Number(item.price_estimate) }
            : {}),
          ...(item.price_currency === "RON" || item.price_currency === "EUR"
            ? { price_currency: item.price_currency }
            : {}),
        } satisfies AccountCartItem,
      ];
    });
  } catch {
    return [];
  }
}

export function writeLocalAccountCart(items: AccountCartItem[], track = true) {
  try {
    if (track) {
      const previous = readLocalAccountCart(),
        pending = pendingAccountCart(),
        next = new Map(items.map((item) => [identity(item), item]));
      for (const item of previous)
        if (!next.has(identity(item))) {
          delete pending.upserts[identity(item)];
          pending.removed = [...new Set([...pending.removed, identity(item)])];
        }
      for (const item of items)
        if (
          JSON.stringify(
            previous.find((old) => identity(old) === identity(item)),
          ) !== JSON.stringify(item)
        ) {
          pending.upserts[identity(item)] = item;
          pending.removed = pending.removed.filter(
            (key) => key !== identity(item),
          );
        }
      pending.version = crypto.randomUUID();
      cartStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    }
    cartStorage.setItem(ACCOUNT_CART_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {
    // Safari private mode can reject storage; the active React state still works.
  }
  window.dispatchEvent(
    new CustomEvent(ACCOUNT_CART_EVENT, {
      detail: { items: items.slice(0, 20) },
    }),
  );
}

export function addLocalAccountCartItem(item: AccountCartItem) {
  const previous = readLocalAccountCart();
  if (
    previous.some(
      (entry) =>
        entry.sku === item.sku &&
        entry.type === item.type &&
        entry.serviceKey === item.serviceKey &&
        entry.productSlug === item.productSlug &&
        entry.period === item.period &&
        entry.name === item.name,
    )
  )
    return previous;
  if (previous.length >= 20) return previous;
  const withoutReplacedSubscription =
    item.type === "subscription"
      ? previous.filter((entry) => entry.type !== "subscription")
      : previous;
  const items = mergeAccountCartItems(withoutReplacedSubscription, [item]);
  writeLocalAccountCart(items);
  return items;
}

const stripDisplayPrices = (items: AccountCartItem[]) =>
  items.map(
    ({ price_estimate: _price, price_currency: _currency, ...item }) => item,
  );

export const accountCartApi = {
  async load(): Promise<AccountCartItem[]> {
    await writeQueue.catch(() => {});
    const response = await cartRequest<{
      data: AccountCartItem[];
      unavailable?: string;
    }>("/api/commerce/cart");
    if (response.unavailable) throw new Error("cart_unavailable");
    return Array.isArray(response.data) ? response.data : [];
  },
  async save(items: AccountCartItem[]): Promise<AccountCartItem[]> {
    const owner = cartStorage.getItem(ACCOUNT_CART_OWNER_KEY),
      version = pendingAccountCart().version;
    const request = new AbortController();
    requests.add(request);
    return serializeCart(async () => {
      try {
        if (owner !== cartStorage.getItem(ACCOUNT_CART_OWNER_KEY))
          throw new Error("cart_owner_changed");
        const response = await cartRequest<{ data: AccountCartItem[] }>(
          "/api/commerce/cart",
          {
            method: "PUT",
            body: JSON.stringify({ items: stripDisplayPrices(items) }),
          },
          request,
        );
        if (owner === cartStorage.getItem(ACCOUNT_CART_OWNER_KEY))
          confirmPending(version);
        return response.data ?? [];
      } finally {
        requests.delete(request);
      }
    });
  },
  async replaceSource(
    source: AccountCartSource,
    items: AccountCartItem[],
  ): Promise<AccountCartItem[]> {
    const owner = cartStorage.getItem(ACCOUNT_CART_OWNER_KEY),
      version = pendingAccountCart().version;
    const request = new AbortController();
    requests.add(request);
    return serializeCart(async () => {
      try {
        if (owner !== cartStorage.getItem(ACCOUNT_CART_OWNER_KEY))
          throw new Error("cart_owner_changed");
        const response = await cartRequest<{ data: AccountCartItem[] }>(
          "/api/commerce/cart/sync",
          {
            method: "POST",
            body: JSON.stringify({
              source,
              items: stripDisplayPrices(
                items.map((item) => ({ ...item, source })),
              ),
            }),
          },
          request,
        );
        if (owner === cartStorage.getItem(ACCOUNT_CART_OWNER_KEY)) {
          confirmPending(version, source);
          writeLocalAccountCart(replayPendingCart(response.data ?? []), false);
        }
        return response.data ?? [];
      } finally {
        requests.delete(request);
      }
    });
  },
};

/** Sincronizează doar compartimentul care tocmai s-a schimbat. */
export function syncLocalAccountCartSource(source: AccountCartSource) {
  if (cartBridge) return cartBridge();
  return accountCartApi.replaceSource(
    source,
    readLocalAccountCart().filter((item) => item.source === source),
  );
}
