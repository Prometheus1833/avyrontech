import { expect, test } from "@playwright/test";

const pairs = [
  ["/servicii/website-prezentare-profesional", "/en/services/professional-presentation-website"],
  ["/servicii/qa-testing-web-mobile", "/en/services/web-mobile-qa-testing"],
  ["/servicii/blog-profesional", "/en/services/professional-blog"],
  ["/servicii/creare-logo-3d-dinamic-cinematic", "/en/services/cinematic-dynamic-3d-logo-design"],
  ["/servicii/creare-logo-3d-dinamic-cinematic/creeaza", "/en/services/cinematic-dynamic-3d-logo-design/create"],
];

for (const pair of pairs) for (const [index, path] of pair.entries()) {
  test(`visible AVYRON brand is included in its accessible home link: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" })));
    await page.goto(path);
    const link = page.getByRole("link", { name: index ? "AVYRON — Home" : "AVYRON — Acasă", exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveText("AVYRON");
    await link.click();
    await expect(page).toHaveURL(index ? /\/en#hero$/ : /\/#hero$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}
