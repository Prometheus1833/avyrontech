import { expect, test, type Page } from "@playwright/test";

async function introFixture(page: Page, mode: "ultra" | "fallback" | "save-data" = "ultra") {
  await page.addInitScript(selected => {
    localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({
      necessary: true, analytics: false, marketing: false,
      savedAt: new Date().toISOString(), policyVersion: "2026-09-12",
    }));
    // Keep the renderer test deterministic even when CI is starting a cold browser.
    const entries = performance.getEntriesByType.bind(performance);
    performance.getEntriesByType = type => type === "navigation" ? [] : entries(type);
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 12 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 8 });
    Object.defineProperty(navigator, "connection", {
      configurable: true, value: { saveData: selected === "save-data", effectiveType: "4g" },
    });
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value(this: HTMLCanvasElement, type: string, options?: unknown) {
        if (type === "webgl2") return selected === "fallback" ? null : { getExtension: () => null };
        return Reflect.apply(original, this, [type, options]);
      },
    });
  }, mode);
  await page.route("**/api/**", route => route.fulfill({ status: 401, json: {} }));
}

test("home introduction renders and skips without waiting on assets", async ({ page }) => {
  await introFixture(page);
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const button = document.querySelector<HTMLButtonElement>('[data-testid="home-intro"] button');
      if (!button) return;
      document.documentElement.dataset.introSkipLabel = button.textContent?.trim();
      observer.disconnect();
      button.click();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const intro = page.getByTestId("home-intro");
  await expect(page.locator("html")).toHaveAttribute("data-intro-skip-label", "Omite introducerea");
  await expect(page.locator("#hero h1")).toBeVisible();
  await expect(intro).toHaveCount(0);
  await expect(page.locator("#hero")).toBeVisible();
});

test("home introduction uses the lightweight canvas without WebGL and ends automatically", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await introFixture(page, "fallback");
  await page.addInitScript(() => {
    // Record allocation before the short scene resets its bitmap on cleanup.
    const seen = new MutationObserver(records => {
      for (const { target } of records) {
        if (target instanceof HTMLCanvasElement && target.closest('[data-intro-tier="none"]') && target.width === 360) {
          document.documentElement.dataset.introCanvasSized = "true";
        }
      }
    });
    seen.observe(document, { subtree: true, attributes: true, attributeFilter: ["width"] });
  });
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  const intro = page.getByTestId("home-intro");
  await expect(page.locator("html")).toHaveAttribute("data-intro-canvas-sized", "true");
  await expect(intro).toHaveCount(0, { timeout: 3500 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("the desktop canvas supports 4K and Escape interrupts the animation", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      const match = window.matchMedia.bind(window);
      window.matchMedia = query => match(query === "(pointer: coarse)" ? "(min-width: 9999px)" : query);
    });
    await introFixture(page);
    await page.goto(baseURL + "/", { waitUntil: "domcontentloaded" });
    const intro = page.getByTestId("home-intro");
    const canvas = intro.locator("canvas[width='3840'][height='2160']");
    await expect(canvas).toBeAttached();
    await page.keyboard.press("Escape");
    await expect(intro).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("reduced motion and section anchors bypass the introduction", async ({ page }) => {
  await introFixture(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#hero h1")).toBeVisible();
  await expect(page.getByTestId("home-intro")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#de-ce");
  await expect(page.locator("#de-ce")).toBeVisible();
  await expect(page.getByTestId("home-intro")).toHaveCount(0);
});

test("data saver goes directly to the home content", async ({ page }) => {
  await introFixture(page, "save-data");
  await page.goto("/");
  await expect(page.locator("#hero h1")).toBeVisible();
  await expect(page.getByTestId("home-intro")).toHaveCount(0);
});

test("a slow initial load does not play a late introduction", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 401, json: {} }));
  await page.route("**/assets/index-*.js", async route => {
    await new Promise(resolve => setTimeout(resolve, 1300));
    await route.continue();
  });
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="home-intro"]')) document.documentElement.dataset.introObserved = "true";
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await expect(page.locator("#hero h1")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-motion-tier", /.+/);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro-observed", "true");
});

test("a fully prerendered homepage remains usable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(baseURL + "/");
    await expect(page.locator("#hero h1")).toBeVisible();
    await expect(page.getByTestId("home-intro")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
