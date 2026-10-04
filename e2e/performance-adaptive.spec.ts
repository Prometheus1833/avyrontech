import { expect, test } from "@playwright/test";

const consent = () => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({
  necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12",
}));

test("critical public routes stay fluid and keep heavy visual engines lazy", async ({ page }) => {
  const assets: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/assets/")) assets.push(response.url());
  });
  await page.addInitScript(consent);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(assets.some((url) => /three-|postfx-|gsap-/i.test(url))).toBe(false);

  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return { responseStart: entry.responseStart, domInteractive: entry.domInteractive, transferSize: entry.transferSize };
  });
  expect(navigation.responseStart).toBeLessThan(2_000);
  expect(navigation.domInteractive).toBeLessThan(5_000);
});

test("low-end phones receive the lighter cinematic tier without losing the effect", async ({ page }) => {
  const assets: string[] = [];
  page.on("response", (response) => { if (response.url().includes("/assets/")) assets.push(response.url()); });
  await page.addInitScript(() => {
    localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 2 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, get: () => 2 });
    Object.defineProperty(navigator, "connection", { configurable: true, get: () => ({ saveData: false, effectiveType: "3g" }) });
  });
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/servicii/website-prezentare-profesional", { waitUntil: "domcontentloaded" });
  const intro = page.locator("[data-service-intro]");
  await expect(intro).toHaveAttribute("data-quality", "usor");
  await expect(page.locator("html")).toHaveAttribute("data-motion-fps", "30");
  await expect(intro).toBeHidden({ timeout: 3_100 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(assets.some((url) => /three-|postfx-|gsap-/i.test(url))).toBe(false);
});

test("reduced-motion users skip blocking cinematic loaders", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(consent);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/servicii/magazin-online", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-service-intro]")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-motion-tier", "none");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
