import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const service = "/servicii/creare-logo-3d-dinamic-cinematic";
test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" })));
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  test(`compact studio and selectable 3D examples at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/#logo-studio");
    const studio = page.locator("#logo-studio");
    await expect(studio.getByRole("heading", { name: "Un nume. Patru direcții." })).toBeVisible();
    expect((await studio.boundingBox())!.height).toBeLessThan(viewport.width >= 1024 ? 350 : 640);
    await expect(studio).not.toContainText("150 lei");
    await studio.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("compact-studio.png") });
    await studio.getByRole("link", { name: /Dincolo de 2D/ }).click();
    await expect(page).toHaveURL(service);
    await expect(page.locator(".l3d-loader")).toHaveCount(0);
    // Keep material and selection checks deterministic on software-rendered CI GPUs.
    await page.getByRole("button", { name: "Oprește animațiile", exact: true }).click();
    const picker = page.getByRole("group", { name: "Alege un concept" });
    for (const name of ["Fluxa", "Nordis Clinic", "Maison Olea", "Irisa Studio", "Lex & Varga", "Brava Coffee"]) {
      const button = picker.getByRole("button", { name: new RegExp(name) });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".l3d-hero-view")).toHaveAttribute("aria-label", new RegExp(name));
    }
    const materials = page.locator("#prezentare").getByRole("group", { name: "Material", exact: true });
    for (const name of ["Metal", "Sticlă", "Neon", "Mat"]) {
      const button = materials.getByRole("button", { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
    }
    await expect(page.locator("html")).toHaveAttribute("data-logo3d-paused", "");
    await page.screenshot({ path: testInfo.outputPath("service.png") });
    const gallery = page.locator("#exemple");
    await gallery.getByRole("button", { name: "Startupuri", exact: true }).click();
    await expect(gallery.locator(".l3d-card:visible")).toHaveCount(1);
    await expect(gallery.locator(".l3d-card:visible")).toContainText("Fluxa");
    await gallery.getByRole("button", { name: "Toate", exact: true }).click();
    await expect(gallery.locator(".l3d-card:visible")).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const whatsapp = page.locator('a[aria-label="Scrie-ne pe WhatsApp"]');
    expect(decodeURIComponent((await whatsapp.getAttribute("href"))!)).toContain("logo dinamic 3D");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://avyron.ro${service}`);
  });
}

test("WebGL exports a complete nonblank PNG and survives context loss", async ({ page }) => {
  await page.goto(service);
  await expect(page.locator("html")).toHaveAttribute("data-logo3d", "on", { timeout: 20_000 });
  await page.locator("#numele-tau").getByLabel("Numele tău sau al afacerii").fill("Nord Atelier");
  await expect(page.locator(".l3d-name-view")).toHaveAttribute("aria-label", /Nord Atelier/);
  await page.locator("#numele-tau").getByRole("button", { name: "1:1", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#numele-tau").getByRole("button", { name: /Descarcă/ }).click();
  const download = await downloadPromise;
  const file = await download.path();
  const png = readFileSync(file!);
  expect(download.suggestedFilename()).toBe("nord-atelier-3d-avyron.png");
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1920);
  expect(png.readUInt32BE(20)).toBe(1920);
  expect(png.length).toBeGreaterThan(5000);
  await page.evaluate(() => document.querySelector<HTMLCanvasElement>(".l3d-canvas")!.getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext());
  await expect(page.locator("html")).toHaveAttribute("data-logo3d", "off");
  await expect(page.locator(".l3d-name-view .l3d-fallback")).toHaveCSS("opacity", "1");
  await expect(page.locator("#numele-tau").getByRole("button", { name: /Descarcă/ })).toHaveCount(0);
});

test("no WebGL and reduced motion retain all content and native scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === "webgl2") return null;
      return Reflect.apply(getContext, this, [type, ...args]);
    } as typeof getContext;
  });
  await page.goto(service);
  await expect(page.locator("html")).toHaveAttribute("data-logo3d", "off");
  await expect(page.locator(".l3d-genesis-sticky")).toHaveCSS("position", "relative");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await expect(page.locator(".l3d-hero-view .l3d-fallback")).toHaveCSS("opacity", "1");
  await page.locator(".l3d-faq summary").first().click();
  await expect(page.locator(".l3d-faq details").first()).toHaveAttribute("open", "");
  await expect(page.locator("#creeaza-singur")).not.toContainText("150 lei");
});
