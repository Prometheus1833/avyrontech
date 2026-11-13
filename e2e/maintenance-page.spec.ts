import { expect, test } from "@playwright/test";

const path = "/mentenanta-si-colaborari";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({
    necessary: true, analytics: false, marketing: false,
    savedAt: new Date().toISOString(), policyVersion: "2026-09-12",
  })));
  await page.route("**/api/**", route => route.fulfill({ status: 401, json: {} }));
});

test("maintenance intro uses the lightweight renderer without WebGL and dismisses", async ({ page }) => {
  await page.addInitScript(() => {
    const nav = performance.getEntriesByType.bind(performance);
    performance.getEntriesByType = type => type === "navigation" ? [] : nav(type);
    const canvas = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value(type: string, options?: unknown) {
      return type === "webgl2" ? null : Reflect.apply(canvas, this, [type, options]);
    } });
    const observer = new MutationObserver(() => {
      const intro = document.querySelector('[data-testid="maintenance-intro"][data-intro-tier="none"]');
      const button = intro?.querySelector("button");
      if (!button || !intro.querySelector("canvas")) return;
      document.documentElement.dataset.maintenanceSkipLabel = button.textContent?.trim();
      observer.disconnect();
      button.click();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const intro = page.getByTestId("maintenance-intro");
  await expect(page.locator("html")).toHaveAttribute("data-maintenance-skip-label", "Omite introducerea");
  await expect(intro).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("plan details stay stable on mobile, restore focus and reopen from an auth return", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path + "#abonamente-site");
  const plans = page.getByTestId("plan-carousel-site");
  await expect(plans.locator(":scope > li")).toHaveCount(3);
  await expect(page.getByTestId("maintenance-intro")).toHaveCount(0);
  const plus = plans.getByRole("button", { name: "Plus — vezi detalii și specificații", exact: true });
  await expect(plus).toBeInViewport();
  await plus.click();
  const details = page.getByRole("region", { name: "Site de prezentare — Plus" });
  await expect(details).toBeFocused();
  await expect(details.getByText("Specificații", { exact: true })).toBeVisible();
  await details.getByRole("button", { name: "Închide detaliile" }).click();
  await expect(plus).toBeFocused();
  await expect(details).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.goto(path + "?plan=sub-site-plus");
  await expect(page.getByRole("dialog", { name: "Site de prezentare · Plus" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("maintenance-intro")).toHaveCount(0);
});

test("the monthly work and prices are visible in prerendered English content", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(baseURL + "/en/maintenance-and-partnerships/");
    await expect(page.getByRole("heading", { name: "What we do every month" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Integrations and data flows" })).toBeVisible();
    await expect(page.getByTestId("plan-carousel-site").locator(":scope > li")).toHaveCount(3);
    await expect(page.getByTestId("maintenance-intro")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("a late monthly quote cannot overwrite the selected annual total", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/auth/refresh", route => route.fulfill({ json: {
    access_token: "synthetic-maintenance", expires_in: 900, user: { id: "synthetic-client", roles: ["user"] },
  } }));
  await page.route("**/api/auth/me", route => route.fulfill({ json: {
    user: { id: "synthetic-client", display_name: "Client de test", email: "client@example.test" },
    profile: { display_name: "Client de test" }, roles: ["user"],
  } }));
  await page.route("**/api/billing/account", route => route.fulfill({ json: {
    providers: { stripe: { enabled: false }, revolut: { enabled: false } },
  } }));
  let releaseMonthly: () => void;
  const monthlyHold = new Promise<void>(resolve => { releaseMonthly = resolve; });
  let monthlySent: () => void;
  const monthlyOpened = new Promise<void>(resolve => { monthlySent = resolve; });
  await page.route("**/api/commerce/quote", async route => {
    const annual = route.request().postDataJSON().items[0].period === "annual";
    if (!annual) {
      monthlySent();
      await monthlyHold;
    }
    await route.fulfill({ json: { quote: {
      currency: "RON", subtotalCents: annual ? 60000 : 5000,
      totalCents: annual ? 48000 : 5000, promotion: null, discountBaseCents: 0,
      discountCents: 0, requiresManualQuote: false,
    } } }).catch(() => undefined);
  });
  try {
    await page.goto(path + "?plan=sub-site-plus");
    const dialog = page.getByRole("dialog", { name: "Site de prezentare · Plus" });
    await monthlyOpened;
    await dialog.getByRole("button", { name: /^Anual/ }).click();
    await expect(dialog.getByText("480 RON", { exact: true })).toBeVisible();
    releaseMonthly();
    await expect(dialog.getByRole("button", { name: /^Anual/ })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByText("480 RON", { exact: true })).toBeVisible();
  } finally {
    releaseMonthly!();
  }
});
