import { expect, test } from "@playwright/test";

const pages = [
  {
    path: "/servicii/seo-ai-visibility-performance",
    name: "SEO & AI Performance and Visibility",
    image: "/og/seo-ai.png",
    faqQuestion: "De ce Google a descoperit o pagină, dar nu a indexat-o?",
    faqQuestionEn: "Why has Google discovered a page but not indexed it?",
  },
  {
    path: "/servicii/digital-marketing-ads",
    name: "Digital Marketing & Ads",
    image: "/og/marketing-ads.png",
    faqQuestion: "Cum aleg între Google Ads și Meta Ads?",
    faqQuestionEn: "How do I choose between Google Ads and Meta Ads?",
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
    await expect(page.locator(".growth-faq")).toContainText(service.faqQuestion);
    await expect(page.locator(".growth-offer")).toHaveCount(3);
    await expect(page.getByRole("link", { name: /Configuratorul AVYRON/ })).toHaveAttribute("href", "/configurator");
    if (service.path.includes("seo-ai")) {
      await expect(page.locator(".growth-one-time-list a")).toHaveCount(3);
      await expect(page.locator(".growth-pricing")).toContainText("690 lei");
      await expect(page.locator(".growth-pricing")).toContainText("550 lei");
    } else {
      await expect(page.locator(".growth-pricing")).toContainText("990 lei");
      await expect(page.locator(".growth-pricing")).toContainText("de la 2.990 lei");
    }
    await expect(page.locator('[data-service-intro]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://avyron.ro" + service.path);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://avyron.ro" + service.image);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test(service.name + " keeps a three-column pricing layout on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(service.path);
    const cards = page.locator(".growth-offer");
    await expect(cards).toHaveCount(3);
    const positions = await cards.evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().x)));
    expect(new Set(positions).size).toBe(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  });
}

test("English service pages retain translated offers and reciprocal language metadata", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const service of pages) {
    const englishPath = service.path.replace("/servicii/", "/en/services/");
    await page.goto(englishPath);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toContainText(service.name);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://avyron.ro" + englishPath);
    await expect(page.locator('link[rel="alternate"][hreflang="ro"]')).toHaveAttribute("href", "https://avyron.ro" + service.path);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", "https://avyron.ro" + englishPath);
    await expect(page.locator(".growth-offer")).toHaveCount(3);
    await expect(page.locator(".growth-faq")).toContainText(service.faqQuestionEn);
    if (service.path.includes("seo-ai")) {
      await expect(page.locator(".growth-pricing")).toContainText("free");
      await expect(page.locator(".growth-one-time-list")).toContainText("1,290 RON");
    } else {
      await expect(page.locator(".growth-pricing")).toContainText("990 RON");
      await expect(page.locator(".growth-pricing")).toContainText("from 2,990 RON");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /1,690 RON\/month/);
    }
  }
});

test("SEO and Ads plans appear in the subscription catalog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/mentenanta-si-colaborari#abonamente-seo");
  await expect(page.locator("#abonamente-seo")).toContainText("Essential");
  await expect(page.locator("#abonamente-seo")).toContainText("2.490 RON");
  await expect(page.locator("#abonamente-ads")).toContainText("Ads Performance");
  await expect(page.locator("#abonamente-ads")).toContainText("de la 2.990 RON");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
