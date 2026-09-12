// Măsurare proprie (Cloudflare D1) + Google Analytics, în paralel.
//
// Trimitem doar după consimțământ evenimente agregate: nicio dată de contact și niciun cookie.
// Identificatorul de sesiune trăiește în sessionStorage și dispare la închiderea tab-ului.

import { apiUrl } from "./apiBase";
import { trackEvent } from "./analytics";
import { hasAnalyticsConsent } from "./cookieConsent";

export type FunnelEvent =
  | "page_view"
  | "view_configurator"
  | "view_lead_form"
  | "cta_click"
  | "generate_lead";

const KEY = "avyron:sid";
let memorySession = "";

function sessionId(): string {
  if (typeof window === "undefined") return "";
  if (memorySession) return memorySession;
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored) {
      memorySession = stored;
      return stored;
    }
  } catch {
    /* storage blocat — folosim doar memoria */
  }
  memorySession = crypto.randomUUID();
  try {
    window.sessionStorage.setItem(KEY, memorySession);
  } catch {
    /* ignorat */
  }
  return memorySession;
}

/**
 * Trimite evenimentul către baza noastră (D1) și către GA4.
 * Nu aruncă niciodată: măsurarea nu poate strica experiența paginii.
 */
export function trackFunnel(
  event: FunnelEvent,
  page: string,
  gaParams: Record<string, string | number | boolean | undefined> = {},
) {
  if (!hasAnalyticsConsent()) return;
  trackEvent(event === "page_view" ? "page_view_product" : event, { location: page, ...gaParams });
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    event,
    page,
    sessionId: sessionId(),
    lang: document.documentElement.lang || "ro",
    path: window.location.pathname,
    referrer: document.referrer ? new URL(document.referrer).hostname : "",
  });

  try {
    const url = apiUrl("/api/analytics/event");
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.(url, blob)) return;
    void fetch(url, { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true })
      .catch(() => undefined);
  } catch {
    /* ignorat */
  }
}
