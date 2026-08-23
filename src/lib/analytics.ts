const MEASUREMENT_ID =
  import.meta.env.VITE_GOOGLE_ANALYTICS_ID ||
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY;

export const GA_ENABLED = Boolean(MEASUREMENT_ID);

/**
 * Safe gtag wrapper. No-ops when GA is not configured or when running server-side.
 */
export function gtag(...args: unknown[]) {
  if (typeof window === "undefined" || !GA_ENABLED) return;
  window.gtag?.(...args);
}

/**
 * Send a GA4 page_view event. Should be called on every client-side route change.
 */
export function pageView(path: string, title?: string) {
  if (!GA_ENABLED) return;
  gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Send a custom GA4 event.
 */
export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  if (!GA_ENABLED) return;
  gtag("event", name, params);
}

/**
 * Update GA consent mode. Call this whenever the user changes cookie preferences.
 * Defaults to denied until the user explicitly opts in.
 */
export function updateConsent(allowed: boolean) {
  if (!GA_ENABLED) return;
  gtag("consent", "update", {
    analytics_storage: allowed ? "granted" : "denied",
    ad_storage: allowed ? "granted" : "denied",
    ad_user_data: allowed ? "granted" : "denied",
    ad_personalization: allowed ? "granted" : "denied",
  });
}

/**
 * Initialize default consent to denied. Safe to call repeatedly; only affects GA.
 */
export function initConsent() {
  if (!GA_ENABLED) return;
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}
