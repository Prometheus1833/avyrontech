import { expect, test } from "@playwright/test";

const pages = [
  {
    path: "/servicii/seo-ai-visibility-performance",
    name: "SEO & AI Visibility and Performance",
    image: "/og/seo-ai.png",
  },
  {
    path: "/servicii/digital-marketing-ads",
    name: "Digital Marketing & Ads",
    image: "/og/marketing-ads.png",
  },
] as const;

test("new services are linked from the catalog and extended homepage list", async ({ page }) => {
  await page.goto("/servicii");
  for (const service of pages) {
    await expect(page.locator('[data-testid="services-list"] a[href="' + service.path + '"]')).toBeVisible();
  }

  await page.goto("/");
  const serviceList = page.locator('[data-testid="service-list"]');
  await serviceList.getByRole("button", { name: "Vezi toate serviciile" }).click();
  for (const service of pages) {
    await expect(serviceList.locator('a[href="' + service.path + '"]')).toBeVisible();
  }
});

for (const service of pages) {
  test(service.name + " has a complete indexable mobile page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(service.path);
    await expect(page.locator("h1")).toContainText(service.name);
    await expect(page.locator(".growth-faq details")).toHaveCount(3);
    await expect(page.locator('[data-service-intro]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://avyron.ro" + service.path);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://avyron.ro" + service.image);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}
