import { test, expect } from "@playwright/test";
import { ROUTE_ALTERNATES } from "../src/i18n/routes";
import { SERVICE_ROUTES } from "../src/data/serviceRoutes";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
const images: Record<string, string> = JSON.parse(readFileSync("src/seo/serviceSocialImages.json", "utf8"));
const pairs = ROUTE_ALTERNATES.filter(pair => /^\/servicii(?:\/|$)/.test(pair.ro) || pair.ro === "/mentenanta-si-colaborari");

test("prerendered service HTML and real JPEGs are available without JavaScript", async ({ request }) => {
  const seen = new Set<string>();
  for (const pair of pairs) for (const lang of ["ro", "en"] as const) {
    // Vite preview has an SPA fallback for extensionless requests; Cloudflare's
    // native ASSETS route matching is covered by the separate Worker smoke.
    const response = await request.get(`${pair[lang]}/index.html`, { headers: { "User-Agent": "facebookexternalhit/1.1", accept: "text/html" } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    const dom = new JSDOM(html);
    const head = dom.window.document;
    const image = head.querySelector('meta[property="og:image"]')?.getAttribute("content")?.replace("https://avyron.ro", "");
    expect(image).toMatch(/-(ro|en)-[a-f0-9]{12}\.jpg$/);
    expect(image).toContain(`-${lang}-`);
    expect(Object.values(images)).toContain(image);
    seen.add(image!);
    expect(head.querySelector('meta[property="og:description"]')!.getAttribute("content")!.length).toBeGreaterThan(30);
    expect(head.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe("summary_large_image");
    dom.window.close();
    const asset = await request.get(image!);
    expect(asset.status()).toBe(200);
    expect(asset.headers()["content-type"]).toContain("image/jpeg");
    expect((await asset.body()).subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);
  }
  expect(seen.size).toBe(pairs.length * 2);
});

test("SPA related-service navigation replaces cover, title, description and canonical", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ json: {} }));
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" })));
  const website = SERVICE_ROUTES.website;
  const social = SERVICE_ROUTES.socialIdentity;
  await page.goto(website.ro);
  const og = page.locator('meta[property="og:image"]');
  await expect(og).toHaveAttribute("content", `https://avyron.ro${images["website:ro"]}`);
  const oldTitle = await page.title();
  const oldDescription = await page.locator('meta[name="description"]').getAttribute("content");
  await page.locator(`[data-testid="related-product-list"] a[href="${social.ro}"]`).click();
  await expect(og).toHaveAttribute("content", `https://avyron.ro${images["social:ro"]}`);
  await expect(page).not.toHaveTitle(oldTitle);
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute("content", oldDescription!);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://avyron.ro${social.ro}`);
});
