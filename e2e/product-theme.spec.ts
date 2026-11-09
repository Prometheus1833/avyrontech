import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

for (const width of [390, 1440]) {
  for (const path of ["/produse", "/en/products"]) {
    test(`cinematic product catalogue stays readable with a light site preference: ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
      await page.addInitScript(() => {
        localStorage.setItem("theme", "light");
        localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" }));
      });
      await page.route("**/api/**", route => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === "/api/auth/refresh") return route.fulfill({ status: 204 });
        if (pathname === "/api/auth/me") return route.fulfill({ status: 401, json: { error: { code: "unauthorized" } } });
        return route.fulfill({ json: { data: [] } });
      });
      await page.goto(path);
      await expect(page.locator(".pa-root h1")).toBeVisible();
      await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
      // The backdrop is intrinsically dark even when the global site is light.
      const palette = await page.locator(".pa-root").evaluate(el => {
        const style = getComputedStyle(el);
        return { foreground: style.getPropertyValue("--foreground"), background: style.getPropertyValue("--background") };
      });
      expect(Number(palette.foreground.match(/([\d.]+)%\s*$/)?.[1])).toBeGreaterThan(75);
      expect(Number(palette.background.match(/([\d.]+)%\s*$/)?.[1])).toBeLessThan(20);
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const violations = await page.evaluate(async () => {
        const axe = (window as unknown as { axe: { run: (context: Element, options: unknown) => Promise<{ violations: unknown[] }> } }).axe;
        return (await axe.run(document.querySelector(".pa-root")!, { runOnly: { type: "rule", values: ["color-contrast"] } })).violations;
      });
      expect(violations).toEqual([]);
      expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("light");
    });
  }
}
