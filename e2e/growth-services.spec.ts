import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const socialImages: Record<string, string> = JSON.parse(readFileSync(join(process.cwd(), "src/seo/serviceSocialImages.json"), "utf8"));

const pages = [
  {
    path: "/servicii/seo-ai-visibility-performance",
    name: "SEO & AI Performance and Visibility",
    image: socialImages["seo:ro"],
    faqQuestion: "De ce Google a descoperit o pagină, dar nu a indexat-o?",
    faqQuestionEn: "Why has Google discovered a page but not indexed it?",
  },
  {
    path: "/servicii/digital-marketing-ads",
    name: "Digital Marketing & Ads",
    image: socialImages["ads:ro"],
    faqQuestion: "Cum aleg între Google Ads și Meta Ads?",
    faqQuestionEn: "How do I choose between Google Ads and Meta Ads?",
  },
] as const;

test("new services are linked from the catalog and extended homepage list", async ({ page }) => {
  const homepageHtml = readFileSync(join(process.cwd(), "dist/index.html"), "utf8");
  for (const service of pages) {
    expect(homepageHtml).toContain(`href="${service.path}"`);
  }
  const englishHomepageHtml = readFileSync(join(process.cwd(), "dist/en/index.html"), "utf8");
  for (const service of pages) {
    expect(englishHomepageHtml).toContain(`href="${service.path.replace("/servicii/", "/en/services/")}"`);
  }
  await page.goto("/servicii");
  for (const service of pages) {
    await expect(page.locator('[data-testid="services-list"] a[href="' + service.path + '"]')).toBeVisible();
  }

  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");
  const serviceList = page.locator('[data-testid="service-list"]');
  for (const service of pages) {
    await expect(serviceList.locator('a[href="' + service.path + '"]')).toBeVisible();
  }
  const growthLinks = serviceList.getByRole("navigation", { name: "SEO și publicitate digitală" }).getByRole("link");
  const [seo, ads] = await growthLinks.evaluateAll(links => links.map(link => {
    const { top, left, right, height } = link.getBoundingClientRect();
    return { top, left, right, height };
  }));
  expect(seo.top).toBeCloseTo(ads.top);
  expect(seo.right).toBeLessThan(ads.left);
  expect(Math.max(seo.height, ads.height)).toBeLessThan(55);
  await serviceList.getByRole("button", { name: "Vezi toate serviciile" }).click();
  for (const service of pages) {
    await expect(serviceList.locator('a[href="' + service.path + '"]')).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("catalog card content opens details and the contact action remains separate", async ({ page }, info) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/public/service-pages/**", route => route.fulfill({ json: { values: {} } }));
  for (const { width, catalog, key, path, feature } of [
    { width: 1440, catalog: "/servicii", key: "seo-ai", path: pages[0].path, feature: "SEO/GEO/AEO extins" },
    { width: 320, catalog: "/en/services", key: "marketing-ads", path: "/en/services/digital-marketing-ads", feature: "search terms and negative keywords" },
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(catalog);
    const hero = page.locator("#prezentare");
    await expect(hero).not.toContainText(/690|990|free initial|inițial gratuit/i);
    const card = page.getByTestId("service-card").and(page.locator(`[data-service="${key}"]`));
    await expect(card).toContainText(feature);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const contact = card.locator('a[href^="https://wa.me/"]');
    await contact.scrollIntoViewIfNeeded();
    expect(await contact.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest("a") === el;
    })).toBe(true);
    await card.screenshot({ path: info.outputPath(`catalog-${width}.png`) });
    await card.getByRole("heading", { level: 2 }).click({ force: true });
    await expect(page).toHaveURL(path);
  }
});

test("the service catalogue includes the website plan after apps with both actions on one row", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/public/service-pages/**", route => route.fulfill({ json: { values: {} } }));
  for (const [catalog, offer] of [
    ["/servicii", "/servicii/website-prin-abonament"],
    ["/en/services", "/en/services/website-subscription"],
  ]) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(catalog);
    const services = page.getByTestId("services-list");
    const card = services.locator('[data-service="apps"] + [data-service="website-subscription"]');
    await expect(card.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(card.locator('a[href="' + offer + '"]')).toHaveCount(1);
    for (const service of await services.getByTestId("service-card").all()) {
      const [details, contact] = await service.getByRole("link").all();
      const [first, second] = await Promise.all([details.boundingBox(), contact.boundingBox()]);
      expect(second!.y).toBeCloseTo(first!.y);
      expect(second!.x).toBeGreaterThanOrEqual(first!.x + first!.width);
      expect(second!.x + second!.width).toBeLessThanOrEqual(320);
    }
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
