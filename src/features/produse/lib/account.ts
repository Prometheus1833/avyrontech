import { useCallback, useEffect, useState } from "react";

import type { AccountState, CopyChannel, CopyResult, LimitBucket } from "@/lib/produseApi";
import type { CatalogItem } from "../data/types";

/**
 * Legătura dintre pagina publică și contul din AVYRON OS.
 *
 * Pagina funcționează și fără cont — codul produselor gratuite e public
 * oricum. Contul adaugă trei lucruri: colecția care te urmează pe alt
 * dispozitiv, limitele zilnice ale parteneriatului și dreptul de descărcare
 * pentru produsele plătite.
 *
 * Modulul de cont (`@/lib/produseApi`, care aduce clientul de autentificare) se
 * încarcă târziu și doar în browser, ca să nu intre în primul ecran.
 */

export type AccountSnapshot = {
  /** `null` cât timp nu știm încă; `false` = vizitator fără cont. */
  signedIn: boolean | null;
  state: AccountState | null;
};

const EMPTY: AccountSnapshot = { signedIn: null, state: null };

const loadApi = () => import("@/lib/produseApi").then((module) => module.produseApi);

export function bucketOf(item: Pick<CatalogItem, "type">): LimitBucket {
  if (item.type === "section") return "sections";
  if (item.type === "template") return "templates";
  return "components";
}

export function useProduseAccount(enabled = true) {
  const [snapshot, setSnapshot] = useState<AccountSnapshot>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      const api = await loadApi();
      const state = await api.state();
      // `day` gol înseamnă fie vizitator, fie magazin nemigrat; în ambele
      // cazuri interfața se poartă la fel: fără limite, fără colecție în cont.
      setSnapshot({ signedIn: state.day !== "", state: state.day !== "" ? state : null });
    } catch {
      setSnapshot({ signedIn: false, state: null });
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    // Lăsăm pagina să se așeze: starea contului nu e necesară la primul cadru.
    const timer = window.setTimeout(() => void refresh(), 1200);
    return () => window.clearTimeout(timer);
  }, [enabled, refresh]);

  const copy = useCallback(
    async (slug: string, channel: CopyChannel): Promise<CopyResult | null> => {
      if (!snapshot.signedIn) return null;
      const api = await loadApi();
      const result = await api.copy(slug, channel);
      void refresh();
      return result;
    },
    [snapshot.signedIn, refresh],
  );

  const favorite = useCallback(
    async (slug: string, add: boolean) => {
      if (!snapshot.signedIn) return;
      const api = await loadApi();
      const data = add ? await api.collection.add(slug) : await api.collection.remove(slug);
      setSnapshot((current) => (current.state ? { ...current, state: { ...current.state, collection: data } } : current));
    },
    [snapshot.signedIn],
  );

  const checkout = useCallback(
    async (input: { kind: "plan" | "item"; id: string; provider: "revolut" | "stripe"; savePaymentMethod?: boolean }) => {
      const api = await loadApi();
      return api.checkout(input);
    },
    [],
  );

  return { ...snapshot, refresh, copy, favorite, checkout };
}

/** „Ți-au mai rămas 7 componente azi.” */
export function remainingLabel(state: AccountState | null, bucket: LimitBucket, ro: boolean): string | null {
  if (!state) return null;
  const { used, limit } = state.limits[bucket];
  const left = Math.max(0, limit - used);
  const noun = bucket === "components" ? (ro ? "componente" : "components") : bucket === "sections" ? (ro ? "secțiuni" : "sections") : ro ? "template-uri" : "templates";
  return ro ? `Ți-au mai rămas ${left} ${noun} azi, din ${limit}.` : `${left} of ${limit} ${noun} left today.`;
}
