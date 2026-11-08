import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "avyron-cookie-consent-v2",
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        savedAt: new Date().toISOString(),
        policyVersion: "2026-09-12",
      }),
    );
  });
  await page.route("**/api/blog/posts?**", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
});
async function openPreview(
  page: import("@playwright/test").Page,
  language = "ro",
) {
  await page.goto(`${language === "en" ? "/en" : "/"}#blog-avyron`);
  await expect(page.locator("main[data-anchor-ready]")).toHaveAttribute(
    "data-anchor-ready",
    "true",
    { timeout: 10000 },
  );
  const section = page.locator("#blog-avyron");
  await expect(section).toBeAttached();
  await section.evaluate((el) => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo({
      top: window.scrollY + el.getBoundingClientRect().top - 105,
      behavior: "instant",
    });
  });
  await expect(section.getByRole("heading", { level: 2 })).toBeVisible();
  return section;
}
for (const width of [320, 1440])
  test(`latest articles are accessible and navigable at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const section = await openPreview(page);
    await expect(section.locator("article")).toHaveCount(6);
    await expect(
      section.getByRole("link", { name: "Explorează blogul" }),
    ).toHaveAttribute("href", "/blog");
    expect(
      await section.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(
      section.getByRole("button", { name: "Articolele următoare" }),
    ).toBeEnabled();
    await section.getByRole("button", { name: "Articolele următoare" }).click();
    await expect(section).toHaveAttribute("data-carousel-index", "1");
    await expect(section).toHaveAttribute("data-autoplay", "paused");
    await section
      .getByRole("button", { name: "Articolele anterioare" })
      .click();
    await expect(section).toHaveAttribute("data-carousel-index", "0");
    await expect
      .poll(() =>
        section
          .locator("article")
          .first()
          .locator("img")
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        section.evaluate((el) =>
          Math.abs(
            el.querySelector(".avy-blog-preview-card")!.getBoundingClientRect()
              .left -
              el
                .querySelector(".avy-blog-preview-viewport")!
                .getBoundingClientRect().left,
          ),
        ),
      )
      .toBeLessThan(1);
    await section.screenshot({
      path: info.outputPath(`landing-blog-${width}.png`),
    });
    await section.locator("article a").first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(section).toHaveAttribute("data-carousel-index", "1");
    await section.getByRole("link", { name: "Explorează blogul" }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.locator('[data-blog-card="lead"]')).toHaveCount(1);
    const cards = page.locator("[data-blog-card]");
    for (let i = 0; i < (await cards.count()); i++) {
      await cards.nth(i).evaluate((el) =>
        window.scrollTo({
          top: window.scrollY + el.getBoundingClientRect().top - 100,
          behavior: "instant",
        }),
      );
      await expect
        .poll(() =>
          cards
            .nth(i)
            .locator("img")
            .evaluate(
              (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
            ),
        )
        .toBe(true);
    }
  });
test("autoplay stops on focus and drag; reduced motion keeps manual controls", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 390, height: 1000 });
  const section = await openPreview(page);
  await page.mouse.move(1, 1);
  await expect(section).toHaveAttribute("data-autoplay", "playing");
  await expect(section).not.toHaveAttribute("data-carousel-index", "0", {
    timeout: 10000,
  });
  await section.locator("article a").nth(1).focus();
  await expect(section).toHaveAttribute("data-autoplay", "paused");
  const before = await section.getAttribute("data-carousel-index");
  await page.waitForTimeout(6200);
  expect(await section.getAttribute("data-carousel-index")).toBe(before);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
    const playback = await section
      .getByRole("button", { name: "Pornește rularea automată" })
      .boundingBox();
    if (!playback) throw Error("Missing playback control");
    await page.touchscreen.tap(
      playback.x + playback.width / 2,
      playback.y + playback.height / 2,
    );
    await expect(section).toHaveAttribute("data-autoplay", "playing");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("main[data-anchor-ready]")).toHaveAttribute(
    "data-anchor-ready",
    "true",
    { timeout: 10000 },
  );
  await section.evaluate((el) =>
    window.scrollTo({
      top: window.scrollY + el.getBoundingClientRect().top - 100,
      behavior: "instant",
    }),
  );
  await expect(section).toHaveAttribute("data-autoplay", "paused");
  await expect(section.locator("[data-blog-playback]")).toHaveCount(0);
  const viewport = section.getByRole("region", {
      name: "Ultimele articole Avyron",
    }),
    box = await viewport.boundingBox();
  if (!box) throw Error("Missing carousel viewport");
  await page.mouse.move(box.x + box.width * 0.85, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.15, box.y + 100, { steps: 14 });
  await page.mouse.up();
  await expect(section).not.toHaveAttribute("data-carousel-index", "0");
});
test("English preview uses English articles and routes", async ({ page }) => {
  const section = await openPreview(page, "en");
  await expect(
    section.getByRole("link", { name: "Explore the blog" }),
  ).toHaveAttribute("href", "/en/blog");
  await expect(section.locator("article a").first()).toHaveAttribute(
    "href",
    "/en/blog/ai-act-reguli-transparenta-2-august-2026",
  );
  await section.locator("article a").first().click();
  await expect(page).toHaveURL(
    /\/en\/blog\/ai-act-reguli-transparenta-2-august-2026$/,
  );
  await expect(page.locator("h1")).toContainText("AI Act");
});
test("a new published API article is shared by landing and blog, with cover recovery", async ({
  page,
}) => {
  const publishedAt = new Date(Date.now() - 60000).toISOString();
  const post = {
    id: "synthetic-public-article",
    language: "ro",
    status: "published",
    slug: "articol-publicat-test",
    title: "Articol publicat recent pentru verificare",
    excerpt:
      "Un rezumat editorial scurt care rămâne sincronizat cu pagina articolului.",
    content: "## Informații utile\nConținut editorial de test.",
    cover_image_url: "/news/unavailable-test.webp",
    category: "tech",
    tags: [],
    published_at: publishedAt,
    updated_at: publishedAt,
    created_at: publishedAt,
  };
  await page.route("**/api/blog/posts?**", (route) =>
    route.fulfill({ json: { data: [post] } }),
  );
  await page.route("**/news/unavailable-test.webp", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  const section = await openPreview(page);
  const first = section.locator("article").first();
  await expect(first).toContainText(post.title);
  await expect(first.locator("img")).toHaveAttribute(
    "data-blog-cover",
    "fallback",
  );
  await first.getByRole("link").click();
  await expect(page.locator("h1")).toContainText(post.title);
  await expect(page.locator("figure img")).toHaveAttribute(
    "data-blog-cover",
    "fallback",
  );
  await expect
    .poll(() =>
      page
        .locator("figure img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
});

test("deep link waits for a slow preceding section without moving the carousel out of view", async ({
  page,
}) => {
  await page.route(/\/assets\/Problem-[^/]+\.js$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/#blog-avyron");
  await expect(page.locator("main")).toHaveAttribute(
    "data-anchor-ready",
    "true",
    { timeout: 10000 },
  );
  const section = page.locator("#blog-avyron");
  await expect(section.getByRole("heading", { level: 2 })).toBeInViewport();
  await page.mouse.move(1, 1);
  await expect(section).toHaveAttribute("data-autoplay", "playing");
  await page.waitForTimeout(1800);
  await expect(section.getByRole("heading", { level: 2 })).toBeInViewport();
  await expect(section).toHaveAttribute("data-autoplay", "playing");
});
