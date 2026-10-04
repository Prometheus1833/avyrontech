import { expect, test, type Page } from "@playwright/test";

const consent = () => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({
  necessary: true,
  analytics: false,
  marketing: false,
  savedAt: new Date().toISOString(),
  policyVersion: "2026-09-12",
}));

async function mockStaff(page: Page) {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/refresh") return route.fulfill({ json: { access_token: "final-audit", expires_in: 900 } });
    if (path === "/api/auth/me") return route.fulfill({ json: {
      user: { id: "final-audit", email: "audit@example.test", display_name: "Audit final", must_change_password: 0 },
      profile: { display_name: "Audit final" }, roles: ["admin"], superadmin: true,
    } });
    if (path === "/api/os/overview") return route.fulfill({ json: {
      generatedAt: Date.now(),
      metrics: { projects: 2, activeProjects: 1, openLeads: 1, leads: 1, clients: 1, visits: 0, revenuesMinor: 0, expensesMinor: 0 },
      briefing: "Date conectate pentru verificare.", attention: [], approvals: [], agentRuns: [], health: [], integrations: [],
    } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.addInitScript(consent);
}

test("public pages remain indexable and fluid on mobile", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(consent);

  for (const path of ["/", "/configurator", "/servicii/website-prezentare-profesional", "/produse", "/de/produkte"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${path} must not overflow`).toBe(true);
  }

  await page.goto("/servicii/website-prezentare-profesional", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("product-hero-facts")).toContainText(/1[.\s]?150 RON/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "Configurează site-ul potrivit afacerii tale" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Site-uri create de noi" })).toBeVisible();
  const portfolioLinks = new Map([
    ["Lumina Botez", "https://demo1.avyron.eu"],
    ["VERDIA", "https://demo2.avyron.eu"],
    ["PungiPlast", "https://exemplu1.avyron.eu"],
    ["Detectiv ICM", "https://detectiv-icm.avyron.eu"],
    ["Crăița Dinulescu", "https://dinulescu-craita-consultant-financiar.avyron.eu"],
    ["Tipografia UMC", "https://umc.avyron.eu"],
    ["CGC Imobiliare", "https://demo3.avyron.eu"],
    ["Cabane Sucevița", "https://demo4.avyron.eu"],
    ["Cofetăria Dulce Dor", "/examples/cofetariadulcedor.ro"],
    ["Studio Mara Design", "/examples/studiomaradesign.ro"],
    ["Pensiunea Cerbul", "/examples/pensiuneacerbul.ro"],
  ]);
  for (const [name, href] of portfolioLinks) {
    await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toHaveAttribute("href", href);
  }

  await page.goto("/produse", { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[href="/de/produkte"]')).toBeVisible();
  await expect(page.locator('a[href="/fr/produits"]')).toBeVisible();
  await expect(page.locator('a[href="/pl/produkty"]')).toBeVisible();
  await page.locator('a[href="/de/produkte"]').click();
  await expect(page).toHaveURL(/\/de\/produkte$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://avyron.ro/de/produkte");
});

test("AVYRON OS quick access and dashboard fit key breakpoints", async ({ page }) => {
  await mockStaff(page);

  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const trigger = page.getByRole("button", { name: "Deschide accesul rapid AVYRON OS" });
    await expect(trigger).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.x + triggerBox!.width).toBeLessThanOrEqual(viewport.width);

    await trigger.click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profil?tab=overview", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Bună ziua, Audit final." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
