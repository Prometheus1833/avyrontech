const MEASUREMENT_ID =
  import.meta.env.VITE_GOOGLE_ANALYTICS_ID ||
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY;

export const GA_ENABLED = Boolean(MEASUREMENT_ID);
let initialized = false;

function ensureAnalytics() {
  if (!GA_ENABLED || initialized || typeof window === "undefined") return;
  initialized = true;
  const state = window as unknown as { dataLayer: unknown[][]; gtag: (...args: unknown[]) => void };
  state.dataLayer = state.dataLayer || [];
  state.gtag = (...args: unknown[]) => state.dataLayer.push(args);
  state.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  state.gtag("js", new Date());
  state.gtag("config", MEASUREMENT_ID, { send_page_view: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

/**
 * Safe gtag wrapper. No-ops when GA is not configured or when running server-side.
 */
export function gtag(...args: unknown[]) {
  if (typeof window === "undefined" || !GA_ENABLED || !initialized) return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  w.gtag?.(...args);
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
export type ConsentPreferences = {
  analytics: boolean;
  marketing: boolean;
};

export function updateConsent({ analytics, marketing }: ConsentPreferences) {
  if (!GA_ENABLED) return;
  if (analytics || marketing) ensureAnalytics();
  if (!initialized) return;
  gtag("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
  if (analytics) pageView(window.location.pathname, document.title);
}

/**
 * Initialize default consent to denied. Safe to call repeatedly; only affects GA.
 */
export function initConsent() {
  if (!GA_ENABLED || !initialized) return;
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}
