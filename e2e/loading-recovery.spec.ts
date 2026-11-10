import { expect, test } from "@playwright/test";

const service = "/servicii/website-prezentare-profesional";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" })));
});

for (const method of ["button", "keyboard"] as const) {
  test(`cinematic intro can be skipped by ${method} and releases scrolling`, async ({ page }) => {
    // Hold the decorative timeout while exercising the manual exit. The real
    // bounded auto-exit is covered separately in performance-adaptive.spec.ts.
    // Otherwise a slow traced layout can consume the entire intro between
    // Playwright's visibility assertion and its click, before input is sent.
    await page.clock.install({ time: new Date("2026-11-10T08:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-10T08:01:00Z"));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(service, { waitUntil: "domcontentloaded" });
    const intro = page.locator("[data-service-intro]");
    await expect(intro).toBeVisible();
    if (method === "button") await intro.getByRole("button", { name: "Vezi pagina" }).click();
    else await page.keyboard.press("Escape");
    await expect(intro).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 350));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
}

test("no WebGL and reduced motion retain readable service content without a blocking intro", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === "webgl" || type === "webgl2") return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto(service);
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("[data-service-intro]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
