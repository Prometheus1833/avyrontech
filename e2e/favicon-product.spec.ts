import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({
    necessary: true, analytics: false, marketing: false,
    savedAt: new Date().toISOString(), policyVersion: "2026-09-12",
  })));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("catalogue displays Favicon and several real images without hover", async ({ page }) => {
  await page.goto("/produse#catalog");
  const catalogue = page.locator("#catalog");
  const first = catalogue.locator("article").first();
  await expect(first.getByRole("link", { name: "Generator de favicon" })).toHaveAttribute("href", "/produse/unelte/generator-favicon");
  for (const slug of ["generator-favicon", "card-contur-luminos", "convertor-csv-json"]) {
    const preview = catalogue.locator(`[data-product-preview="${slug}"] img`);
    await preview.scrollIntoViewIfNeeded();
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 480)).toBe(true);
  }
  await page.goto("/produse/unelte");
  await expect(page.locator("article").first().getByRole("link", { name: "Generator de favicon" })).toBeVisible();
});

test("Favicon editor imports raster artwork, rejects unsafe files and exports valid PNG and ICO", async ({ page }) => {
  await page.goto("/produse/unelte/generator-favicon");
  const editor = page.getByRole("region", { name: "Editor Favicon" });
  await expect(editor.getByRole("img", { name: "Previzualizare favicon" })).toBeVisible();
  await editor.getByRole("textbox", { name: "Inițiale" }).fill("RO");
  await editor.getByRole("combobox", { name: "Fundal", exact: true }).selectOption("transparent");
  await editor.getByRole("combobox", { name: "Formă", exact: true }).selectOption("circle");
  const input = editor.getByLabel("Importă imagine sau schiță");
  await input.setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from('<svg onload="alert(1)"/>') });
  await expect(editor.getByRole("alert")).toContainText("PNG, JPEG sau WebP");
  const large = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,32,0,0,0,32,0]);
  await input.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: large });
  await expect(editor.getByRole("alert")).toContainText("4096 px");

  for (const format of ["jpeg", "webp", "png"] as const) {
    const buffer = await sharp({ create: { width: 80, height: 60, channels: 3, background: "#18a183" } }).toFormat(format).toBuffer();
    await input.setInputFiles({ name: `schita.${format}`, mimeType: `image/${format}`, buffer });
    await expect(editor.getByText(`schita.${format}`, { exact: true })).toBeVisible();
  }
  await editor.getByRole("combobox", { name: "Dimensiune PNG" }).selectOption("192");
  const [png] = await Promise.all([page.waitForEvent("download"), editor.getByRole("button", { name: "Descarcă PNG" }).click()]);
  expect(png.suggestedFilename()).toBe("favicon-192.png");
  const bytes = await readFile((await png.path())!);
  await expect(sharp(bytes).metadata()).resolves.toMatchObject({ width: 192, height: 192, format: "png", hasAlpha: true });
  const pixel = await sharp(bytes).extract({ left: 96, top: 96, width: 1, height: 1 }).raw().toBuffer();
  expect([...pixel]).toEqual([24, 161, 131, 255]);
  const [ico] = await Promise.all([page.waitForEvent("download"), editor.getByRole("button", { name: /^ICO/ }).click()]);
  const packageBytes = await readFile((await ico.path())!);
  expect(ico.suggestedFilename()).toBe("favicon.ico");
  expect(packageBytes.readUInt16LE(2)).toBe(1);
  expect(packageBytes.readUInt16LE(4)).toBe(3);
  for (const [index, size] of [16,32,48].entries()) {
    const start = 6 + 16 * index;
    const offset = packageBytes.readUInt32LE(start + 12);
    const length = packageBytes.readUInt32LE(start + 8);
    await expect(sharp(packageBytes.subarray(offset, offset + length)).metadata()).resolves.toMatchObject({ width: size, height: size, format: "png" });
  }
  await editor.getByRole("button", { name: "Resetează editorul" }).click();
  await expect(editor.getByRole("textbox", { name: "Inițiale" })).toHaveValue("AV");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("English product route keeps the Favicon controls available with reduced motion", async ({ page }) => {
  await page.goto("/en/products/tools/generator-favicon");
  const editor = page.getByRole("region", { name: "Favicon Editor" });
  await expect(editor.getByRole("textbox", { name: "Initials" })).toHaveValue("AV");
  await expect(editor.getByLabel("Import an image or sketch")).toBeVisible();
});
