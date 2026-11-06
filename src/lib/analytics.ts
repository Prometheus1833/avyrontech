import { robotsDirectiveForPath } from "@/seo/publicRoutes";

const MEASUREMENT_ID =
  import.meta.env.VITE_GOOGLE_ANALYTICS_ID ||
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY ||
  "G-5KMPKNG8WS";

export const GA_ENABLED = Boolean(MEASUREMENT_ID);
let initialized = false;
let analyticsAllowed = false;

export const isPrivateAnalyticsSurface = () => typeof window !== "undefined" && (
  !["avyron.ro", "www.avyron.ro", "localhost", "127.0.0.1"].includes(window.location.hostname)
  || new URLSearchParams(window.location.search).has("servicePreview")
  || robotsDirectiveForPath(window.location.pathname.replace(/\/+$/, "") || "/") === "noindex, nofollow"
);

// Queries/fragments can contain recovery tokens, emails or document identifiers.
const publicLocation = () => `${window.location.origin}${window.location.pathname}`;
const publicReferrer = () => {
  try { const url = new URL(document.referrer); return url.origin; } catch { return ""; }
};
const syncMeasurementGate = () => {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[`ga-disable-${MEASUREMENT_ID}`] = !analyticsAllowed || isPrivateAnalyticsSurface();
  }
};

function ensureAnalytics() {
  if (isPrivateAnalyticsSurface()) return;
  if (!GA_ENABLED || initialized || typeof window === "undefined") return;
  initialized = true;
  const state = window as unknown as { dataLayer: IArguments[]; gtag: (...args: unknown[]) => void };
  state.dataLayer = state.dataLayer || [];
  // gtag.js consumes an Arguments queue, as specified by Google. Arrays are
  // ignored: the script loads successfully but no GA4 collect event is sent.
  state.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    state.dataLayer.push(arguments);
  };
  state.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  state.gtag("js", new Date());
  state.gtag("config", MEASUREMENT_ID, { send_page_view: false, page_location: publicLocation(), page_referrer: publicReferrer() });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

/**
 * Safe gtag wrapper. No-ops when GA is not configured or when running server-side.
 */
export function gtag(...args: unknown[]) {
  syncMeasurementGate();
  if (isPrivateAnalyticsSurface() || typeof window === "undefined" || !GA_ENABLED || !initialized) return;
  if (args[0] === "event" && !analyticsAllowed) return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  w.gtag?.(...args);
}

/**
 * Send a GA4 page_view event. Should be called on every client-side route change.
 */
export function pageView(path: string, title?: string) {
  syncMeasurementGate();
  if (!GA_ENABLED || typeof window === "undefined" || isPrivateAnalyticsSurface()) return;
  gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    page_location: publicLocation(),
    page_referrer: publicReferrer(),
  });
}

/**
 * Send a custom GA4 event.
 */
export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  if (!GA_ENABLED || typeof window === "undefined" || isPrivateAnalyticsSurface()) return;
  gtag("event", name, { ...params, page_location: publicLocation(), page_referrer: publicReferrer() });
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
  analyticsAllowed = analytics;
  syncMeasurementGate();
  if (!GA_ENABLED || isPrivateAnalyticsSurface()) return;
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
