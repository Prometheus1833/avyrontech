import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "avyron:chunk-reload";
let unloading = false;
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    unloading = true;
  });
  window.addEventListener("pagehide", () => { unloading = true; });
  const activeDocument = () => { unloading = false; };
  window.addEventListener("pageshow", activeDocument);
  // A timer can run while a new navigation is still in progress. Clearing the
  // guard there lets a failed import reload the old URL and cancel the new one.
  // After a cancelled unload, actual interaction restores normal recovery.
  window.addEventListener("pointerdown", activeDocument, { capture: true, passive: true });
  window.addEventListener("keydown", activeDocument, { capture: true });
}

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
      // A cancelled import from the old document must not override navigation.
      if (unloading) return new Promise<{ default: T }>(() => {});
      let alreadyReloaded = true;
      try { alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1"; } catch { /* No persistent retry guard: fail through to ErrorBoundary. */ }
      if (!alreadyReloaded && typeof window !== "undefined") {
        try { sessionStorage.setItem(RELOAD_FLAG, "1"); } catch { throw error; }
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
