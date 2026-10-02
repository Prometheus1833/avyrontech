import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "avyron:chunk-reload";

/**
 * lazy() cu o singură reîncărcare automată la eșec de import.
 *
 * După un deploy nou, un tab vechi poate cere un chunk care nu mai există
 * pe server („Importing a module script failed") și ecranul se golește.
 * Reîncărcăm o dată ca să aducem manifestul proaspăt; dacă nici după
 * reload nu merge, lăsăm eroarea să ajungă la ErrorBoundary.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
      if (!alreadyReloaded && typeof window !== "undefined") {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        // Nu rezolvăm promisiunea: pagina se reîncarcă oricum.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

/** Curățăm flag-ul după ce aplicația a pornit cu succes. */
export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* storage indisponibil */
  }
}
