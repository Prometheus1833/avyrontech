import { useEffect, useMemo, useSyncExternalStore } from "react";
import { logoOperationsApi } from "@/lib/logoOperationsApi";
import type { CatalogItem } from "../data/types";
let price: number | null = null,
  lastCheck = 0,
  pending: Promise<void> | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
async function refresh() {
  if (pending || Date.now() - lastCheck < 2000) return pending;
  pending = (async () => {
    try {
      const data = await logoOperationsApi.price();
      price =
        Number.isSafeInteger(data.priceMinor) && Number(data.priceMinor) > 0
          ? data.priceMinor
          : null;
    } catch {
      price = null;
    } finally {
      lastCheck = Date.now();
      pending = null;
      listeners.forEach((fn) => fn());
    }
  })();
  return pending;
}
export function useLiveLogoPrice(enabled = true) {
  const current = useSyncExternalStore(
    subscribe,
    () => price,
    () => null,
  );
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const update = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [enabled]);
  return current;
}
export function usePricedLogoItem(source: CatalogItem) {
  const price = useLiveLogoPrice(source.slug === "logo-studio-3d");
  return useMemo(
    () =>
      source.slug === "logo-studio-3d"
        ? { ...source, priceRon: price === null ? undefined : price / 100 }
        : source,
    [source, price],
  );
}
