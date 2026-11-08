import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CookieBanner from "@/components/site/CookieBanner";
import { COOKIE_CONSENT_STORAGE_KEY, COOKIE_SETTINGS_EVENT, saveCookieConsent } from "@/lib/cookieConsent";
const { updateConsent } = vi.hoisted(() => ({ updateConsent: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ updateConsent }));
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
describe("cookie preferences across tabs", () => {
  it("keeps settings and unsaved edits open after a timestamp-only storage write", () => {
    saveCookieConsent({ necessary: true, analytics: false, marketing: false });
    render(<MemoryRouter><CookieBanner /></MemoryRouter>);
    act(() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT)));
    fireEvent.click(screen.getByRole("switch", { name: "Analiză" }));
    act(() => { saveCookieConsent({ necessary: true, analytics: false, marketing: false }); window.dispatchEvent(new StorageEvent("storage", { key: COOKIE_CONSENT_STORAGE_KEY })); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Analiză" })).toHaveAttribute("aria-checked", "true");
  });
  it("applies actual withdrawal without dismissing a settings panel being edited", () => {
    saveCookieConsent({ necessary: true, analytics: true, marketing: false });
    render(<MemoryRouter><CookieBanner /></MemoryRouter>);
    act(() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT)));
    act(() => { saveCookieConsent({ necessary: true, analytics: false, marketing: false }); window.dispatchEvent(new StorageEvent("storage", { key: COOKIE_CONSENT_STORAGE_KEY })); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Analiză" })).toHaveAttribute("aria-checked", "false");
    expect(updateConsent).toHaveBeenLastCalledWith(expect.objectContaining({ analytics: false }));
  });
  it("applies withdrawal immediately and reopens a decision after site storage is cleared", () => {
    saveCookieConsent({ necessary: true, analytics: true, marketing: false });
    render(<MemoryRouter><CookieBanner /></MemoryRouter>);
    expect(updateConsent).toHaveBeenLastCalledWith(expect.objectContaining({ analytics: true }));
    act(() => {
      saveCookieConsent({ necessary: true, analytics: false, marketing: false });
      window.dispatchEvent(new StorageEvent("storage", { key: COOKIE_CONSENT_STORAGE_KEY }));
    });
    expect(updateConsent).toHaveBeenLastCalledWith(expect.objectContaining({ analytics: false }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    act(() => { localStorage.clear(); window.dispatchEvent(new StorageEvent("storage", { key: null })); });
    expect(screen.getByRole("dialog", { name: "Setări cookies" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-cookie-panel-open");
  });
});
