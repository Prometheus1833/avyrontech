import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_POLICY_VERSION,
  hasAnalyticsConsent,
  readCookieConsent,
  saveCookieConsent,
} from "@/lib/cookieConsent";
import { trackFunnel } from "@/lib/siteAnalytics";

describe("cookie consent", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("preserves the current preference model and rejects stale policy records", () => {
    saveCookieConsent({ necessary: true, analytics: true, marketing: false });
    expect(readCookieConsent()).toMatchObject({
      necessary: true,
      analytics: true,
      marketing: false,
      policyVersion: COOKIE_POLICY_VERSION,
    });
    expect(hasAnalyticsConsent()).toBe(true);

    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      savedAt: new Date().toISOString(),
      policyVersion: "stale",
    }));
    expect(readCookieConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("does not create first-party analytics storage before consent", () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    trackFunnel("page_view", "cookie-test");
    expect(sessionStorage.getItem("avyron:sid")).toBeNull();
    expect(beacon).not.toHaveBeenCalled();
  });
});
