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
