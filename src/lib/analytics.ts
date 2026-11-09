import { robotsDirectiveForPath } from "@/seo/publicRoutes";

const configuredId =
  import.meta.env.VITE_GOOGLE_ANALYTICS_ID ||
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY ||
  "G-5KMPKNG8WS";
// A connector API key is not a GA4 measurement ID and must never enter a tag URL.
const MEASUREMENT_ID = /^G-[A-Z0-9]+$/.test(configuredId) ? configuredId : "";

export const GA_ENABLED = Boolean(MEASUREMENT_ID);
let initialized = false;
let analyticsAllowed = false;
let lastPageView = "";

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
  if (!GA_ENABLED || !analyticsAllowed || typeof window === "undefined" || isPrivateAnalyticsSurface()) return;
  const cleanPath = path.split(/[?#]/, 1)[0];
  if (lastPageView === cleanPath) return;
  lastPageView = cleanPath;
  gtag("event", "page_view", {
    page_path: cleanPath,
    page_title: title || document.title,
    page_location: publicLocation(),
    page_referrer: publicReferrer(),
  });
}

/** Lazy routes write their title after navigation; wait for their canonical. */
export function trackPageViewWhenReady(path: string) {
  syncMeasurementGate();
  if (isPrivateAnalyticsSurface()) return () => undefined;
  const ready = () => {
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical && new URL(canonical.href).pathname === path && window.location.pathname === path) {
      pageView(path);
      observer.disconnect();
    }
  };
  const observer = new MutationObserver(ready);
  observer.observe(document.head, { childList: true, subtree: true, attributes: true, characterData: true });
  ready();
  return () => observer.disconnect();
}

function clearAnalyticsIdentifiers() {
  // Only our optional measurement identifiers. Authentication/cart are untouched.
  const domains = window.location.hostname.split(".");
  const paths = window.location.pathname.split("/");
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=", 1)[0].trim();
    if (!/^_ga(?:_|$)/.test(name)) continue;
    for (let depth = 1; depth <= paths.length; depth++) {
      const path = paths.slice(0, depth).join("/") || "/";
      document.cookie = `${name}=; Max-Age=0; Path=${path}`;
      for (let part = 0; part < domains.length - 1; part++) {
        document.cookie = `${name}=; Max-Age=0; Path=${path}; Domain=${domains.slice(part).join(".")}`;
      }
    }
  }
  try { window.sessionStorage.removeItem("avyron:sid"); } catch { /* Storage may be blocked. */ }
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
  const newlyGranted = analytics && !analyticsAllowed;
  analyticsAllowed = analytics;
  if (!analytics && typeof window !== "undefined") {
    lastPageView = "";
    clearAnalyticsIdentifiers();
  }
  if (!marketing && typeof window !== "undefined") {
    for (const key of ["avyron-newsletter-prompt-v1", "avyron-newsletter-pages-v1", "avyron-context-notice-v1"]) {
      try { window.localStorage?.removeItem(key); window.sessionStorage?.removeItem(key); } catch { /* Optional storage. */ }
    }
  }
  syncMeasurementGate();
  if (typeof window !== "undefined") window.dispatchEvent?.(new CustomEvent("avyron:analytics-consent", { detail: { analytics } }));
  if (!GA_ENABLED || isPrivateAnalyticsSurface()) return;
  // Marketing permission alone must not load an analytics provider.
  if (analytics) ensureAnalytics();
  if (!initialized) return;
  gtag("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
  if (newlyGranted) pageView(window.location.pathname, document.title);
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
