import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    if (window !== window.top) return;
    localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" }));
    let callback: (token: string) => void = () => {};
    window.turnstile = { render: (_element, options) => { callback = options.callback as (token: string) => void; queueMicrotask(() => callback("synthetic-audit")); return "synthetic"; }, remove: () => {}, reset: () => { queueMicrotask(() => callback("synthetic-audit-reset")); } };
  });
  // All writes are intercepted. These journeys never create live leads or emails.
  await page.route("**/api/**", route => route.fulfill({ status: 401, json: { error: { code: "unauthenticated" } } }));
  await page.route("**/challenges.cloudflare.com/**", route => route.fulfill({ contentType: "application/javascript", body: "" }));
});

for (const width of [320, 390, 768, 1440]) test(`public layouts and intrinsic social image at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  for (const path of ["/", "/servicii", "/configurator", "/blog", "/biblioteca"]) {
    await page.goto(path);
    await page.waitForFunction(() => Object.keys(window).some(key => key.startsWith("ga-disable-")));
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("/configurator");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "704");
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute("content", "image/webp");
});

for (const path of ["/", "/servicii", "/configurator", "/biblioteca"]) test(`accessible controls and contrast: ${path}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(1);
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (root: Document, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
    return (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }));
  });
  expect(violations).toEqual([]);
});

test("configurator rejects an empty receipt, preserves entries, and accepts a saved CRM receipt despite email failure", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/contact/demo", route => { calls++; return route.fulfill(calls === 1 ? { json: {} } : { status: 503, json: { saved: true, leadId: "synthetic-receipt", delivered: false } }); });
  await page.goto("/configurator");
  await page.locator("#configuration-name").fill("Audit sintetic");
  await page.locator("#configuration-email").fill("audit@example.test");
  await page.locator("#configuration-phone").fill("0712345678");
  const form = page.locator("form");
  await form.getByRole("button", { name: /Trimite/ }).click();
  await expect(form.getByRole("alert")).toContainText("Trimiterea nu a putut fi confirmată");
  await expect(page.locator("#configuration-email")).toHaveValue("audit@example.test");
  await form.getByRole("button", { name: /Trimite/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Configurație sincronizată" })).toBeVisible();
  expect(calls).toBe(2);
});

test("configurator sends once when two submits arrive in the same render", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/contact/demo", async route => { calls++; await new Promise(resolve => setTimeout(resolve, 100)); return route.fulfill({ json: { saved: true, leadId: "synthetic-receipt" } }); });
  await page.goto("/configurator");
  await page.locator("#configuration-name").fill("Audit sintetic");
  await page.locator("#configuration-email").fill("audit@example.test");
  await page.locator("#configuration-phone").fill("0712345678");
  await page.locator("form").evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByRole("status").filter({ hasText: "Configurație sincronizată" })).toBeVisible();
  expect(calls).toBe(1);
});

test("cookie settings remain scrollable on a short viewport and restore the contact rail", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 320 });
  await page.goto("/");
  await page.evaluate(() => window.dispatchEvent(new Event("avyron:cookie-settings")));
  const settings = page.getByRole("dialog", { name: "Setări cookies" });
  await expect(settings).toBeVisible();
  await expect(page.getByTestId("floating-contact-bar")).toBeHidden();
  await expect(settings.getByRole("button", { name: "Doar necesare", exact: true })).toBeVisible();
  await settings.getByRole("button", { name: "Doar necesare", exact: true }).click();
  await expect(settings).toBeHidden();
  await expect(page.getByTestId("floating-contact-bar")).toBeVisible();
});

test("library quote works before any effects are selected and traps keyboard focus", async ({ page }) => {
  await page.goto("/biblioteca#brief");
  const quote = page.locator("#brief").getByRole("button", { name: "Cere ofertă", exact: true });
  await quote.click();
  const dialog = page.getByRole("dialog", { name: /Solicită un exemplu/ });
  await expect(dialog).toBeVisible();
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  expect(await dialog.evaluate(async node => {
    const axe = (window as unknown as { axe: { run: (root: Element, options: unknown) => Promise<{ violations: { id: string }[] }> } }).axe;
    return (await axe.run(node, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => v.id);
  })).toEqual([]);
  for (let count = 0; count < 9; count++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(quote).toBeFocused();
});

test("Mara demo serves all four original photos from the local build", async ({ page }) => {
  await page.goto("/examples/studiomaradesign.ro");
  await page.waitForFunction(() => Object.keys(window).some(key => key.startsWith("ga-disable-")));
  const photos = page.locator("#proiecte img");
  await expect(photos).toHaveCount(4);
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toHaveAttribute("src", /^\/assets\/mara-/);
    await expect.poll(() => photo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1024);
  }
});

test("configurator keeps optional lists compact and carries custom activity into the enquiry", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/contact/demo", route => {
    const body = route.request().postData() || "";
    const match = body.match(/name="config"\r?\n\r?\n([^\r\n]+)/);
    payload = match ? JSON.parse(match[1]) : undefined;
    return route.fulfill({ json: { saved: true, leadId: "synthetic-configurator" } });
  });
  await page.goto("/configurator");
  await expect(page.locator("h1")).toHaveText("Configurează-ți site-ul sau proiectul digital");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://avyron.ro/configurator");
  await expect(page.getByText("Website la 0 lei", { exact: false })).toHaveCount(0);
  const activity = page.getByRole("button", { name: /^Domenii și activități/ });
  const style = page.getByRole("button", { name: /^Direcția vizuală/ });
  await expect(activity).toHaveAttribute("aria-expanded", "false");
  await expect(style).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Caută o activitate")).toBeHidden();
  await expect(page.getByRole("group", { name: "Stiluri vizuale" })).toBeHidden();
  await expect(page.getByText(/Preferințe pentru domeniu|Ce demonstrează această experiență/)).toHaveCount(0);
  const launcher = page.getByRole("button", { name: "Discută cu AVY, asistentul Avyron", exact: true });
  await expect(launcher).toBeVisible();
  await expect.poll(async () => (await launcher.boundingBox())?.y || 0).toBeGreaterThan(650);
  await page.screenshot({ path: info.outputPath("configurator-compact-390.png") });
  await activity.click();
  await page.getByLabel("Caută o activitate").fill("inchirieri agricole");
  await expect(page.getByText("Nu am găsit activitatea căutată.")).toBeVisible();
  await page.getByLabel(/Nu găsești domeniul/).fill("Închirieri agricole");
  await activity.click();
  await style.click();
  const direction = page.getByRole("group", { name: "Stiluri vizuale" }).getByRole("button", { name: /Cinematic & premium/ });
  await direction.click();
  await expect(direction).toHaveAttribute("aria-pressed", "true");
  await style.click();
  const contacts = page.getByRole("region", { name: "Contactează echipa AVYRON" });
  await expect(contacts.getByRole("link", { name: "Sună" })).toHaveAttribute("href", "tel:+40734605055");
  await expect(contacts.getByRole("link", { name: "E-mail" })).toHaveAttribute("href", "mailto:contact@avyron.ro");
  const wa = await contacts.getByRole("link", { name: "WhatsApp" }).getAttribute("href");
  expect(new URL(wa!).searchParams.get("text")).toContain("Închirieri agricole");
  await page.locator("#configuration-name").fill("Audit sintetic");
  await page.locator("#configuration-email").fill("audit@example.test");
  await page.locator("#configuration-phone").fill("0712345678");
  await page.getByRole("button", { name: "Trimite configurația" }).click();
  await expect(page.getByText("Configurație sincronizată")).toBeVisible();
  expect(payload).toMatchObject({ customActivity: "Închirieri agricole", style: "cinematic", services: ["presentation"] });
  expect(payload).not.toHaveProperty("domains");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/en/configurator");
  await expect(page.locator("h1")).toHaveText("Plan your website or digital project");
  await expect(page.locator('link[rel="alternate"][hreflang="ro"]')).toHaveAttribute("href", "https://avyron.ro/configurator");
  await expect(page.getByRole("region", { name: "Talk to the AVYRON team" })).toBeVisible();
});
