import { expect, test, type Page } from "@playwright/test";

async function session(page: Page, role: "user" | "staff" | "admin" | null, superadmin = false) {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/refresh") return route.fulfill({ status: role ? 200 : 401, json: role ? { access_token: "fixture", expires_in: 900 } : {} });
    if (path === "/api/auth/me") return route.fulfill({ json: {
      user: { id: "fixture", email: "staff@example.test", display_name: "Membru de test", must_change_password: 0 },
      profile: { display_name: "Membru de test" }, roles: [role], superadmin,
    } });
    if (path === "/api/os/overview") return route.fulfill({ json: {
      generatedAt: Date.now(), metrics: { projects: 2, activeProjects: 1, openLeads: 0, leads: 0, clients: 0, visits: 0, revenuesMinor: 0, expensesMinor: 0 },
      briefing: "Date de test", attention: [], approvals: [], agentRuns: [], health: [], integrations: [],
    } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" })));
}

for (const role of [null, "user", "staff", "admin"] as const) {
  test(`OS respects the ${role ?? "anonymous"} session`, async ({ page }) => {
    await session(page, role);
    await page.goto("/");
    await expect(page.locator("header").getByRole(role ? "button" : "link", { name: role ? "Profil" : /Conect|Autentific/i }).first()).toBeVisible();
    const trigger = page.getByRole("button", { name: "Deschide accesul rapid AVYRON OS" });
    if (!role || role === "user") return expect(trigger).toHaveCount(0);
    await trigger.click();
    await expect(page.getByRole("menuitem", { name: /Proiecte/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Agenți AI|Financiar/ })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Către Panoul de comandă" }).click();
    await expect(page).toHaveURL(/\/profil\?tab=overview$/);
    await expect(page.getByRole("heading", { name: "Bun venit, Membru de test." })).toBeVisible();
  });
}

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }, { width: 844, height: 390 }]) {
  test(`OS fits ${viewport.width}x${viewport.height} in both themes and languages`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await session(page, "admin", true);
    for (const path of ["/", "/en"]) {
      await page.goto(path);
      const trigger = page.getByRole("button", { name: /Deschide accesul rapid AVYRON OS|Open AVYRON OS quick access/ });
      await expect(trigger).toBeVisible();
      const controls = page.locator("header").getByRole("button");
      for (const control of await controls.all()) {
        if (!(await control.isVisible())) continue;
        const box = (await control.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
      const brand = (await page.getByRole("link", { name: /Avyron —/ }).boundingBox())!;
      const os = (await trigger.boundingBox())!;
      const lang = (await page.getByRole("button", { name: /Schimbă limba|Change language/ }).filter({ visible: true }).boundingBox())!;
      expect(brand.x + brand.width).toBeLessThanOrEqual(os.x);
      expect(os.x + os.width).toBeLessThanOrEqual(lang.x);
      for (const theme of ["light", "dark"]) {
        await page.evaluate(value => document.documentElement.classList.toggle("dark", value === "dark"), theme);
        await trigger.click();
        const menu = page.getByRole("menu");
        await expect(menu).toHaveCSS("opacity", "1");
        const box = (await menu.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        const dashboard = page.getByRole("menuitem", { name: /Către Panoul de comandă|Go to Command Dashboard/ });
        await dashboard.scrollIntoViewIfNeeded();
        await expect(dashboard).toBeInViewport();
        await page.screenshot({ path: info.outputPath(`${path === "/" ? "ro" : "en"}-${theme}.png`) });
        await page.keyboard.press("Escape");
        await expect(menu).toHaveCount(0);
        await expect(trigger).toBeFocused();
      }
    }
  });
}
