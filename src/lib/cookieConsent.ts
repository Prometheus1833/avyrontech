export type CookieConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type StoredCookieConsent = CookieConsentPreferences & {
  savedAt: string;
  policyVersion: string;
};

export const COOKIE_POLICY_VERSION = "2026-09-12";
export const COOKIE_CONSENT_STORAGE_KEY = "avyron-cookie-consent-v2";
export const COOKIE_SETTINGS_EVENT = "avyron:cookie-settings";

export function readCookieConsent(): StoredCookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredCookieConsent>;
    if (value.policyVersion !== COOKIE_POLICY_VERSION) return null;
    return {
      necessary: true,
      analytics: value.analytics === true,
      marketing: value.marketing === true,
      savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
      policyVersion: COOKIE_POLICY_VERSION,
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(preferences: CookieConsentPreferences) {
  const value: StoredCookieConsent = {
    ...preferences,
    savedAt: new Date().toISOString(),
    policyVersion: COOKIE_POLICY_VERSION,
  };
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(value));
  return value;
}

export function hasAnalyticsConsent() {
  return readCookieConsent()?.analytics === true;
}
