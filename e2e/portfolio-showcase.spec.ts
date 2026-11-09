import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const defaults = JSON.parse(
  readFileSync("src/shared/exampleCarouselDefaults.json", "utf8"),
);
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    localStorage.setItem(
      "avyron-cookie-consent-v2",
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        savedAt: new Date().toISOString(),
        policyVersion: "2026-09-12",
      }),
    ),
  );
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/refresh") return route.fulfill({ status: 204 });
    if (path === "/api/auth/me")
      return route.fulfill({
        status: 401,
        json: { error: { code: "unauthorized" } },
      });
    if (path === "/api/public/example-carousels/premium-website")
      return route.fulfill({ json: { config: defaults } });
    return route.fulfill({ json: { data: [] } });
  });
});

for (const width of [320, 390, 768, 1440]) {
  test(`portfolio presents all six projects without overflow at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/portofoliu");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Proiecte digitale",
    );
    await expect(page.locator(".pf-case")).toHaveCount(6);
    await expect(page.locator(".pf-steps li")).toHaveCount(5);
    const nav = page.getByRole("navigation", {
      name: "Domenii din portofoliu",
    });
    for (const name of [
      "Wellness & Beauty",
      "Marketing & Comerț",
      "Servicii & Platforme",
      "Juridic & Încredere",
    ]) {
      await nav.getByRole("link", { name: new RegExp(name) }).click();
      await expect(page.locator(new URL(page.url()).hash)).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    }
    for (const image of await page.locator(".pf-case-image img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await expect(page.locator("#proiect-retuvo")).toContainText("în pregătire");
    await expect(page.locator(".pf-legal-directions")).toContainText(
      "proiecte viitoare",
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator("#portfolio-title")).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`portfolio-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
}

test("portfolio direct sector links preserve their destination after startup", async ({
  page,
}) => {
  await page.goto("/portofoliu#juridic");
  await expect(
    page
      .getByRole("navigation", { name: "Domenii din portofoliu" })
      .getByRole("link", { name: /Juridic/ }),
  ).toHaveAttribute("aria-current", "location");
  await expect
    .poll(() =>
      page.locator("#juridic").evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBeGreaterThanOrEqual(0);
  await expect
    .poll(() =>
      page.locator("#juridic").evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBeLessThan(200);
});

test("portfolio has its own English canonical, structured data and language switch", async ({
  page,
}) => {
  await page.goto("/en/portfolio");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Digital projects",
  );
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://avyron.ro/en/portfolio",
  );
  await expect(page.locator("link[hreflang=ro]")).toHaveAttribute(
    "href",
    "https://avyron.ro/portofoliu",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://avyron.ro/og/portfolio-2026.jpg",
  );
  const graph = await page.locator("#ld-graph").textContent();
  expect(graph).toContain("CollectionPage");
  expect(graph).toContain('"numberOfItems":6');
  await expect(page.locator("#proiect-retuvo")).toContainText("in preparation");
  await page
    .getByRole("button", {
      name: /Change language|Schimbă limba/,
    })
    .click();
  await page.getByRole("option", { name: "ro", exact: true }).click();
  await expect(page).toHaveURL(/\/portofoliu$/);
});

test("website service opens the portfolio from the button below its carousel", async ({
  page,
}) => {
  await page.goto("/servicii/website-prezentare-profesional#portofoliu");
  const button = page.getByRole("link", {
    name: "Explorează portofoliul Avyron",
    exact: true,
  });
  const carousel = page.getByTestId("portfolio-carousel");
  await expect(button).toBeVisible();
  expect((await button.boundingBox())!.y).toBeGreaterThan(
    (await carousel.boundingBox())!.y,
  );
  await button.click();
  await expect(page).toHaveURL(/\/portofoliu$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Proiecte digitale",
  );
  await expect(page.locator("#avyron-portfolio-styles")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Website-uri de prezentare", exact: true })
    .click();
  await expect(page).toHaveURL(/\/servicii\/website-prezentare-profesional$/);
  await expect(page.locator("#avyron-portfolio-styles")).toHaveCount(0);
});

test("portfolio is keyboard accessible, readable and usable without WebGL", async ({
  page,
  browserName,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      return /webgl/.test(type)
        ? null
        : Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/portofoliu");
  await expect(page.locator("#portfolio-title")).toBeVisible();
  // The shared AVY launcher precedes route content in the app shell.
  // Bypass navigation must still be reachable before traversing the header.
  for (let i = 0; i < 3; i++) {
    // This macOS WebKit runner uses Safari's Option+Tab navigation mode.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    if (
      await page
        .locator(".pf-skip")
        .evaluate((el) => el === document.activeElement)
    )
      break;
  }
  await expect(
    page.getByRole("link", { name: "Sari la conținut", exact: true }).first(),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#portfolio-content")).toBeFocused();
  await expect(page.locator(".pf-case")).toHaveCount(6);
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: Element,
            options: unknown,
          ) => Promise<{
            violations: {
              id: string;
              impact: string;
              nodes: { target: string[] }[];
            }[];
          }>;
        };
      }
    ).axe;
    const result = await axe.run(document.querySelector(".pf-page")!, {
      runOnly: {
        type: "tag",
        values: [
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22a",
          "wcag22aa",
        ],
      },
    });
    return result.violations;
  });
  expect(violations).toEqual([]);
  await page
    .getByRole("link", { name: "Hai să discutăm", exact: true })
    .focus();
  await expect(
    page.getByRole("link", { name: "Hai să discutăm", exact: true }),
  ).toHaveAttribute("href", /wa\.me\/40734605055\?text=/);
});

test("data saving stops decorative motion and AVY stays clear of the header", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/portofoliu");
  await expect(page.locator("#portfolio-title")).toBeVisible();
  await expect(page.locator(".pf-motion")).toBeDisabled();
  await expect(page.locator(".pf-scene")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  const chat = page.getByRole("button", {
    name: "Discută cu AVY, asistentul Avyron",
    exact: true,
  });
  await expect(chat).toHaveCSS("bottom", "16px");
  expect((await chat.boundingBox())!.y).toBeGreaterThan(700);
  await chat.click();
  await expect(
    page.getByRole("button", { name: "Închide conversația", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Închide conversația", exact: true })
    .click();
});

test("cinematic introduction is bounded and motion can be paused", async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  if (browserName === "chromium")
    await page.addInitScript(() => {
      const state = window as unknown as { portfolioCLS: number };
      state.portfolioCLS = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!shift.hadRecentInput) state.portfolioCLS += shift.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
  await page.goto("/portofoliu", { waitUntil: "domcontentloaded" });
  const intro = page.getByTestId("portfolio-intro");
  await expect(intro).toBeVisible();
  // A transformed route container must never become the fixed intro's origin.
  expect(await intro.evaluate((el) => el.parentElement === document.body)).toBe(
    true,
  );
  const introBox = (await intro.boundingBox())!;
  expect(introBox.y).toBe(0);
  expect(introBox.height).toBe(900);
  await expect(page.getByTestId("portfolio-intro")).toHaveCount(0, {
    timeout: 4000,
  });
  if (browserName === "chromium")
    expect(
      await page.evaluate(
        () => (window as unknown as { portfolioCLS: number }).portfolioCLS,
      ),
    ).toBeLessThan(0.1);
  await page.setViewportSize({ width: 390, height: 844 });
  const pause = page.getByRole("button", {
    name: "Oprește animația portofoliului",
    exact: true,
  });
  await pause.click();
  await expect(page.locator(".pf-scene")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await expect(
    page.getByRole("button", {
      name: "Pornește animația portofoliului",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".pf-motion")).toBeDisabled();
});

test("mobile opens directly into the cinematic hero without a fullscreen loader", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    (window as unknown as { introShown: boolean }).introShown = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="portfolio-intro"]'))
        (window as unknown as { introShown: boolean }).introShown = true;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/portofoliu");
  await expect(page.locator("#portfolio-title")).toBeVisible();
  await expect(page.locator(".pf-motion")).toBeEnabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { introShown: boolean }).introShown,
    ),
  ).toBe(false);
  await page.locator(".pf-scene").scrollIntoViewIfNeeded();
  await expect(page.locator(".pf-screen")).toHaveCount(3);
  await page.getByRole("button", { name: "Meniu", exact: true }).click();
  await page
    .getByTestId("mobile-nav-menu")
    .getByRole("link", { name: "Workflow", exact: true })
    .click();
  await expect(page).toHaveURL(/#workflow$/);
  await expect(page.getByTestId("mobile-nav-menu")).toHaveCount(0);
});

test("a slow initial download keeps the readable page instead of replaying an intro", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/assets/Portfolio-*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    await route.continue();
  });
  await page.addInitScript(() => {
    (window as unknown as { introShown: boolean }).introShown = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="portfolio-intro"]'))
        (window as unknown as { introShown: boolean }).introShown = true;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/portofoliu", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#portfolio-title")).toBeVisible();
  await expect(page.locator(".pf-motion")).toBeEnabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { introShown: boolean }).introShown,
    ),
  ).toBe(false);
});

test("the prerendered portfolio keeps projects and navigation usable without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    // Vite's SPA preview does not emulate the edge directory-index dispatch.
    // Request the generated document explicitly; the real Worker canonicalizes it.
    await page.goto("/portofoliu/index.html");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Proiecte digitale",
    );
    await expect(page.locator(".pf-case")).toHaveCount(6);
    await expect(page.locator(".pf-scene")).toHaveAttribute(
      "data-motion",
      "paused",
    );
    await expect(page.locator(".pf-motion")).toBeDisabled();
    await expect(page.locator(".pf-screen-2")).toHaveCSS(
      "animation-play-state",
      "paused",
    );
    const legalLink = page
      .getByRole("navigation", { name: "Domenii din portofoliu" })
      .getByRole("link", { name: /Juridic/ });
    await legalLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#juridic$/);
    await expect(page.locator("#proiect-detectiv-icm")).toBeVisible();
  } finally {
    await context.close();
  }
});
