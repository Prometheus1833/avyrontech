import { useSyncExternalStore } from "react";

/**
 * Starea locală a vizitatorului: colecția (favorite), coșul și căutările
 * recente. Stă în localStorage până la F2, când colecția se sincronizează cu
 * contul (tabel `product_collections`). Orice acces la storage e protejat —
 * în modul privat sau cu datele blocate pagina funcționează la fel, doar fără
 * memorie între vizite.
 */

export type CartLine =
  | { kind: "item"; slug: string }
  | { kind: "plan"; plan: "pro" | "studio" };

type State = {
  favorites: string[];
  cart: CartLine[];
  recent: string[];
  /** Produse obținute (copiate) — istoricul din Colecția mea. */
  copied: Array<{ slug: string; at: number }>;
};

const KEY = "avyron-produse-v1";
const EMPTY: State = { favorites: [], cart: [], recent: [], copied: [] };

function read(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.slice(0, 500) : [],
      cart: Array.isArray(parsed.cart) ? parsed.cart.slice(0, 50) : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent.slice(0, 8) : [],
      copied: Array.isArray(parsed.copied) ? parsed.copied.slice(0, 200) : [],
    };
  } catch {
    return EMPTY;
  }
}

let state: State = typeof window === "undefined" ? EMPTY : read();
const listeners = new Set<() => void>();

function commit(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage indisponibil — rămânem în memorie */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProduseStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(EMPTY));
}

export const store = {
  get: () => state,
  toggleFavorite(slug: string) {
    const has = state.favorites.includes(slug);
    commit({ ...state, favorites: has ? state.favorites.filter((s) => s !== slug) : [slug, ...state.favorites] });
    return !has;
  },
  addToCart(line: CartLine) {
    const exists = state.cart.some((l) => JSON.stringify(l) === JSON.stringify(line));
    if (exists) return false;
    // Un singur parteneriat în coș: alegerea nouă îl înlocuiește pe cel vechi.
    const cart = line.kind === "plan" ? state.cart.filter((l) => l.kind !== "plan") : state.cart;
    commit({ ...state, cart: [...cart, line] });
    return true;
  },
  removeFromCart(index: number) {
    commit({ ...state, cart: state.cart.filter((_, i) => i !== index) });
  },
  clearCart() {
    commit({ ...state, cart: [] });
  },
  pushRecent(query: string) {
    const q = query.trim();
    if (q.length < 2) return;
    commit({ ...state, recent: [q, ...state.recent.filter((r) => r !== q)].slice(0, 8) });
  },
  markCopied(slug: string) {
    commit({ ...state, copied: [{ slug, at: Date.now() }, ...state.copied.filter((c) => c.slug !== slug)].slice(0, 200) });
  },
};
