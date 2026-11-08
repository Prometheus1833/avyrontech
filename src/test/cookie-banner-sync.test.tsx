import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CookieBanner from "@/components/site/CookieBanner";
import { COOKIE_CONSENT_STORAGE_KEY, saveCookieConsent } from "@/lib/cookieConsent";
const { updateConsent } = vi.hoisted(() => ({ updateConsent: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ updateConsent }));
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
describe("cookie preferences across tabs", () => {
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
