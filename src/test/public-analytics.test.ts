import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AnalyticsWindow = Window & { dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void };
const analyticsWindow = () => window as AnalyticsWindow;
const commands = () => (analyticsWindow().dataLayer || []).map(entry => Array.from(entry));

describe("public GA4 measurement", () => {
  beforeEach(() => {
    vi.resetModules();
    history.replaceState({}, "", "/");
    delete analyticsWindow().dataLayer;
    delete analyticsWindow().gtag;
    document.querySelectorAll('script[src*="googletagmanager"]').forEach(node => node.remove());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("queues actual Google commands as Arguments and sends a page view only after consent", async () => {
    const { pageView, updateConsent } = await import("@/lib/analytics");
    pageView("/");
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    updateConsent({ analytics: true, marketing: false });
    const queue = analyticsWindow().dataLayer!;
    expect(queue.length).toBeGreaterThan(3);
    expect(queue.every(command => Object.prototype.toString.call(command) === "[object Arguments]")).toBe(true);
    expect(commands().filter(command => command[0] === "event").map(command => command[1])).toEqual(["page_view"]);
    expect(commands().find(command => command[0] === "config")?.[2]).toMatchObject({ send_page_view: false });
    updateConsent({ analytics: false, marketing: false });
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-5KMPKNG8WS"]).toBe(true);
    const before = commands().filter(command => command[0] === "event").length;
    pageView("/");
    expect(commands().filter(command => command[0] === "event")).toHaveLength(before);
  });

  it("suppresses the already loaded Google tag on entering the client account", async () => {
    const { updateConsent, pageView } = await import("@/lib/analytics");
    updateConsent({ analytics: true, marketing: false });
    const before = commands().filter(command => command[0] === "event").length;
    history.replaceState({}, "", "/profil?tab=documents");
    pageView("/profil");
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-5KMPKNG8WS"]).toBe(true);
    expect(commands().filter(command => command[0] === "event")).toHaveLength(before);
    history.replaceState({}, "", "/servicii");
    pageView("/servicii");
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-5KMPKNG8WS"]).toBe(false);
    expect(commands().filter(command => command[0] === "event")).toHaveLength(before + 1);
  });

  it("strips queries and fragments from event locations", async () => {
    history.replaceState({}, "", "/servicii?email=private%40example.test#secret");
    const { updateConsent, trackEvent } = await import("@/lib/analytics");
    updateConsent({ analytics: true, marketing: false });
    trackEvent("cta_click");
    const events = commands().filter(command => command[0] === "event");
    expect(events).toHaveLength(2);
    for (const command of events) {
      const data = command[2] as { page_location: string };
      expect(new URL(data.page_location).search).toBe("");
      expect(new URL(data.page_location).hash).toBe("");
      expect(JSON.stringify(data)).not.toContain("private");
    }
  });

  it.each(["/profil?tab=documents", "/intern/documents", "/reset-password?token=private", "/servicii?servicePreview=private", "/s/private"])("excludes %s from tracking", async path => {
    history.replaceState({}, "", path);
    const { updateConsent, pageView, trackEvent } = await import("@/lib/analytics");
    updateConsent({ analytics: true, marketing: false });
    pageView(path);
    trackEvent("cta_click");
    expect(commands()).toEqual([]);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it.each(["app.avyron.ro", "api.avyron.ro", "surveys.avyron.ro"])("does not initialize on %s", async hostname => {
    vi.stubGlobal("window", { location: new URL(`https://${hostname}/`) });
    const { updateConsent, isPrivateAnalyticsSurface } = await import("@/lib/analytics");
    expect(isPrivateAnalyticsSurface()).toBe(true);
    updateConsent({ analytics: true, marketing: false });
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });
});

describe("consent and lazy navigation regressions", () => {
  beforeEach(() => {
    vi.resetModules();
    history.replaceState({}, "", "/");
    delete analyticsWindow().dataLayer;
    delete analyticsWindow().gtag;
    document.head.innerHTML = '<title>Home</title><link rel="canonical" href="https://avyron.ro/">';
    document.cookie = "_ga=; Max-Age=0; Path=/";
    sessionStorage.clear();
  });
  it("does not load Google for marketing-only consent", async () => {
    const { updateConsent } = await import("@/lib/analytics");
    updateConsent({ analytics: false, marketing: true });
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });
  it("does not count saving identical preferences as another page view", async () => {
    const { updateConsent } = await import("@/lib/analytics");
    updateConsent({ analytics: true, marketing: false });
    updateConsent({ analytics: true, marketing: false });
    expect(commands().filter(c => c[0] === "event")).toHaveLength(1);
  });
  it("waits for the destination metadata before counting SPA navigation", async () => {
    const { updateConsent, trackPageViewWhenReady } = await import("@/lib/analytics");
    updateConsent({ analytics: true, marketing: false });
    history.replaceState({}, "", "/servicii");
    const stop = trackPageViewWhenReady("/servicii");
    expect(commands().filter(c => c[0] === "event")).toHaveLength(1);
    document.title = "Services";
    document.querySelector('link[rel="canonical"]')!.setAttribute("href", "https://avyron.ro/servicii");
    await Promise.resolve();
    const events = commands().filter(c => c[0] === "event");
    expect(events).toHaveLength(2);
    expect(events[1][2]).toMatchObject({ page_path: "/servicii", page_title: "Services" });
    stop();
  });
  it("removes optional identifiers on withdrawal and starts a fresh native session on re-consent", async () => {
    const { updateConsent } = await import("@/lib/analytics");
    const { trackFunnel } = await import("@/lib/siteAnalytics");
    const { saveCookieConsent } = await import("@/lib/cookieConsent");
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: sendBeacon });
    saveCookieConsent({ necessary: true, analytics: true, marketing: false });
    updateConsent({ analytics: true, marketing: false });
    trackFunnel("cta_click", "test");
    const previous = sessionStorage.getItem("avyron:sid");
    expect(previous).toBeTruthy();
    document.cookie = "_ga=synthetic; Path=/";
    document.cookie = "essential=keep; Path=/";
    updateConsent({ analytics: false, marketing: false });
    expect(document.cookie).not.toContain("_ga=");
    expect(document.cookie).toContain("essential=keep");
    expect(sessionStorage.getItem("avyron:sid")).toBeNull();
    updateConsent({ analytics: true, marketing: false });
    trackFunnel("cta_click", "test");
    expect(sessionStorage.getItem("avyron:sid")).not.toBe(previous);
  });
});

it("does not send a misconfigured connector credential to a Google tag URL", async () => {
  vi.resetModules();
  vi.stubEnv("VITE_GOOGLE_ANALYTICS_ID", "invalid-connector-value");
  document.querySelectorAll('script[src*="googletagmanager"]').forEach(node => node.remove());
  try {
    const { updateConsent, GA_ENABLED } = await import("@/lib/analytics");
    expect(GA_ENABLED).toBe(false);
    updateConsent({ analytics: true, marketing: false });
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  } finally { vi.unstubAllEnvs(); }
});
