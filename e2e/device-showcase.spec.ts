import { expect, test, type Locator } from "@playwright/test";

// Each journey deliberately visits every variant, including scroll transitions.
test.setTimeout(60_000);

async function settledDevice(showcase: Locator, stage: string) {
  await expect(showcase).toHaveAttribute("data-active-stage", stage, { timeout: 10_000 });
  const device = showcase.getByTestId(`showcase-device-${stage}`);
  await expect.poll(() => device.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
  return device;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" })));
});

test("homepage keeps six website reasons in three paired cards and a compact demo form", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-deferred-pending]').first().scrollIntoViewIfNeeded();
  const reasons = page.getByTestId("problem-reasons");
  await expect(reasons.locator("article")).toHaveCount(3);
  await expect(reasons.locator("h3, h4")).toHaveCount(6);
  await reasons.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect.poll(() => reasons.locator('article[data-active="true"]').count()).toBe(3);
  await page.goto("/#cta");
  const cta = page.locator("#cta");
  await expect(cta.locator("details")).toHaveCount(1);
  await expect(cta.getByLabel("Nume", { exact: true })).toBeVisible();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 390, height: 667 }]) {
  test(`all screen variants fit and reverse scroll restores the selected website at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/#domenii");
    const showcase = page.getByTestId("industry-device-showcase");
    await showcase.getByRole("button", { name: "Website", exact: true }).click();
    const laptop = await settledDevice(showcase, "laptop");
    await expect(laptop.locator(".laptop-key-row")).toHaveCount(6);
    await expect(laptop.locator(".laptop-trackpad")).toBeVisible();
    const wellnessImage = laptop.locator('[data-screen-variant="beauty"] .web-hero-photo');
    await expect(wellnessImage).toBeVisible();
    await expect.poll(() => wellnessImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("wellness-laptop.png") });
    const laptopWidths = await laptop.evaluate((el) => {
      const width = (selector: string) => el.querySelector(selector)!.getBoundingClientRect().width;
      return {
        screen: width(".laptop-display"),
        lid: width(".laptop-lid"),
        deck: width(".laptop-deck"),
        edge: width(".laptop-edge"),
      };
    });
    expect(laptopWidths.screen / laptopWidths.deck, "screen must be comfortably inside the base").toBeGreaterThan(0.88);
    expect(laptopWidths.screen / laptopWidths.deck, "screen must never overhang the base").toBeLessThan(0.95);
    expect(laptopWidths.lid / laptopWidths.deck, "lid and keyboard must meet naturally at the hinge").toBeGreaterThan(0.90);
    expect(laptopWidths.lid / laptopWidths.deck, "lid must remain narrower than the base").toBeLessThan(0.99);
    expect(laptopWidths.edge / laptopWidths.deck, "front edge must match the keyboard chassis").toBeGreaterThan(0.96);
    expect(laptopWidths.edge / laptopWidths.deck, "front edge must not extend too far past the chassis").toBeLessThan(1.05);
    const heroes = new Set<string>();
    for (const key of ["beauty", "resto", "public", "turism", "pro", "local", "auto", "ecommerce", "national", "other"]) {
      await showcase.getByRole("button", { name: "Domenii", exact: true }).click();
      await expect(showcase.locator(".domain-menu")).toBeInViewport({ ratio: 1 });
      const buttons = showcase.getByRole("group", { name: "Domeniul website-ului" }).getByRole("button");
      const index = ["beauty", "resto", "public", "turism", "pro", "local", "auto", "ecommerce", "national", "other"].indexOf(key);
      await buttons.nth(index).click();
      await expect(showcase).toHaveAttribute("data-domain", key);
      await expect(showcase.locator(".domain-notes li")).toHaveCount(6);
      heroes.add(await showcase.locator(".web-hero h4").innerText());
      expect(await showcase.locator(".web-hero").evaluate((el) => {
        const hero = el.getBoundingClientRect();
        const action = el.querySelector(".web-hero-action")!.getBoundingClientRect();
        return action.bottom - hero.bottom;
      }), `${key}: website action must stay above the service strip`).toBeLessThanOrEqual(2);
    }
    expect(heroes.size).toBe(10);
    await expect(page.locator("#exemple article")).toHaveCount(0);

    await showcase.getByRole("button", { name: "Aplicație", exact: true }).click();
    const phone = await settledDevice(showcase, "phone");
    await expect(showcase.locator(".domain-notes").first()).not.toBeVisible();
    for (const [label, mode, heading] of [["Web/Mobile App", "app", "Următoarea ta pauză."], ["Joc", "game", "Dincolo de orizont."], ["CRM", "crm", "Fiecare oportunitate, la locul ei."], ["Platformă", "platform", "Echipa ta. Un singur spațiu."]]) {
      await showcase.getByRole("button", { name: label, exact: true }).click();
      await expect(phone.locator("[data-screen-variant]")).toHaveAttribute("data-screen-variant", mode);
      await expect(phone.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      expect(await phone.locator(".phone-app-content").evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(2);
    }
    await page.screenshot({ path: testInfo.outputPath("phone.png") });

    await showcase.getByRole("button", { name: "Automatizări", exact: true }).click();
    const tablet = await settledDevice(showcase, "tablet");
    const tabletBounds = await tablet.locator(".tablet-object").boundingBox();
    const viewportBounds = await showcase.locator(".scene-viewport").boundingBox();
    const controlsBounds = await showcase.locator(".scene-controls").boundingBox();
    expect(tabletBounds!.y).toBeGreaterThanOrEqual(viewportBounds!.y - 2);
    expect(tabletBounds!.y + tabletBounds!.height).toBeLessThanOrEqual(controlsBounds!.y - 2);
    for (const [label, mode, content] of [["Agent AI Social Media", "social", "Calendar editorial"], ["Leads", "leads", "Aprobă mesajul propus"], ["ChatBot AI web și WhatsApp", "chat", "Context salvat · Predare către echipă"], ["Alte automatizări", "other", "CRM actualizat"]]) {
      await showcase.getByRole("button", { name: label, exact: true }).click();
      await expect(tablet.locator("[data-screen-variant]")).toHaveAttribute("data-screen-variant", mode);
      await expect(tablet.getByText(content, { exact: true })).toBeVisible();
      expect(await tablet.locator(".tablet-workspace").evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(2);
    }
    await page.screenshot({ path: testInfo.outputPath("tablet.png") });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    // Use actual reverse scrolling, not the stage buttons, to test the timeline.
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
    const top = await showcase.evaluate((el) => window.scrollY + el.getBoundingClientRect().top);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    await settledDevice(showcase, "laptop");
    await expect(showcase).toHaveAttribute("data-domain", "other");
    await expect(showcase.locator(".domain-notes").first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("website.png") });
  });
}

test("reduced motion keeps every service accessible without a forced scroll journey", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#domenii");
  const showcase = page.getByTestId("industry-device-showcase");
  await expect(showcase).toHaveAttribute("data-motion", "reduced");
  await showcase.getByRole("button", { name: "Automatizări", exact: true }).click();
  await settledDevice(showcase, "tablet");
  await expect(showcase.getByRole("button", { name: "Leads", exact: true })).toBeVisible();
  await showcase.getByRole("button", { name: "Website", exact: true }).click();
  await settledDevice(showcase, "laptop");
  await expect(showcase.locator(".domain-notes li")).toHaveCount(6);
});

test("stage controls recover when a mobile browser cancels smooth scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#domenii");
  const showcase = page.getByTestId("industry-device-showcase");
  await settledDevice(showcase, "laptop");
  await page.evaluate(() => {
    const original = window.scrollTo.bind(window);
    window.scrollTo = ((options: ScrollToOptions) => {
      if (options.behavior !== "smooth") original(options);
    }) as typeof window.scrollTo;
  });
  await showcase.getByRole("button", { name: "Aplicație", exact: true }).click();
  await settledDevice(showcase, "phone");
});

test("English interfaces fit on mobile and the industry picker supports Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en#domenii");
  const showcase = page.getByTestId("industry-device-showcase");
  await showcase.getByRole("button", { name: "Website", exact: true }).click();
  await settledDevice(showcase, "laptop");
  const trigger = showcase.getByRole("button", { name: "Industries", exact: true });
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  for (let i = 0; i < 10; i++) {
    await trigger.click();
    await showcase.getByRole("group", { name: "Website industry" }).getByRole("button").nth(i).click();
    await expect(trigger).toBeFocused();
    // Browser subpixel rounding can differ by less than a CSS pixel on CI.
    expect(await showcase.locator(".web-hero").evaluate((el) => el.querySelector(".web-hero-action")!.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(3);
  }
  await showcase.getByRole("button", { name: "Application", exact: true }).click();
  const phone = await settledDevice(showcase, "phone");
  for (const label of ["Web/Mobile App", "Game", "CRM", "Platform"]) {
    await showcase.getByRole("button", { name: label, exact: true }).click();
    expect(await phone.locator(".phone-app-content").evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(2);
  }
  await showcase.getByRole("button", { name: "Automations", exact: true }).click();
  const tablet = await settledDevice(showcase, "tablet");
  const tabletBounds = await tablet.locator(".tablet-object").boundingBox();
  const controlsBounds = await showcase.locator(".scene-controls").boundingBox();
  expect(tabletBounds!.y + tabletBounds!.height).toBeLessThanOrEqual(controlsBounds!.y - 2);
  for (const label of ["Social Media AI Agent", "Leads", "Web & WhatsApp AI ChatBot", "Other automations"]) {
    await showcase.getByRole("button", { name: label, exact: true }).click();
    expect(await tablet.locator(".tablet-workspace").evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(2);
  }
});
