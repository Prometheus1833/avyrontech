import { expect, test, type Page } from "@playwright/test";

const now = Date.now();

const mockAuthenticatedSuperAdmin = async (page: Page) => {
  await page.route("**/api/auth/refresh", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      access_token: "local-visual-test-token",
      expires_in: 900,
      user: { id: "user-superadmin", roles: ["admin"] },
    }),
  }));
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: {
        id: "user-superadmin",
        email: "prometheus@avyron.ro",
        display_name: "Andrei",
        avatar_url: null,
        email_verified: 1,
        must_change_password: 0,
        created_at: now - 30 * 86_400_000,
      },
      profile: {
        id: "user-superadmin",
        display_name: "Andrei",
        avatar_url: null,
        phone: null,
        address: null,
        entity_type: null,
        company_name: "Avyron",
        cui: null,
        social_facebook: null,
        social_instagram: null,
        social_tiktok: null,
        website: "https://avyron.ro",
        language: "ro",
        theme: "dark",
        pseudonym: null,
        staff_role: "dev",
      },
      roles: ["admin"],
      superadmin: true,
    }),
  }));
  await page.route("**/api/os/overview", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      generatedAt: now,
      role: "super_admin",
      briefing: "Astăzi ai 3 leaduri cu prioritate mare, două proiecte necesită atenție și o aprobare AI este în așteptare.",
      metrics: {
        projects: 18,
        activeProjects: 12,
        leads: 128,
        openLeads: 42,
        clients: 24,
        visits: 2840,
        approvals: 1,
        expensesMinor: 824_000,
        revenuesMinor: 2_458_000,
        criticalAlerts: 1,
      },
      attention: [
        { id: "lead-1", kind: "lead", severity: "critic", title: "3 leaduri fierbinți așteaptă răspuns", detail: "Prioritate ridicată în pipeline.", destination: "leads" },
        { id: "project-1", kind: "proiect", severity: "atenție", title: "2 proiecte necesită actualizare", detail: "Termenul intern se apropie.", destination: "projects" },
      ],
      approvals: [
        { id: "approval-1", summary: "AVY AI propune publicarea unei postări pentru Avyron WEB.", action_class: "publish", requested_at: now - 120_000, expires_at: now + 86_400_000, agent_slug: "avy-social", run_status: "waiting_approval" },
      ],
      agentRuns: [
        { id: "run-1", agent_slug: "Lead Hunter", status: "succeeded", input_tokens: 1250, output_tokens: 430, estimated_cost_micros: 0, steps: 46, started_at: now - 300_000, completed_at: now - 180_000, created_at: now - 300_000 },
      ],
      health: [
        { id: "api", label: "API AVYRON", status: "funcțional", detail: "Worker disponibil" },
        { id: "auth", label: "Autentificare", status: "funcțional", detail: "Sesiune validă" },
        { id: "d1", label: "Baza de date D1", status: "funcțional", detail: "Interogare reușită" },
        { id: "r2", label: "Stocare R2", status: "funcțional", detail: "Binding configurat" },
      ],
      integrations: [
        { name: "Cloudflare", category: "infrastructure", status: "conectat", checkedAt: now, errorCode: null },
        { name: "GitHub", category: "development", status: "în_verificare", checkedAt: now, errorCode: null },
      ],
    }),
  }));
};

test.describe("dashboard AVYRON OS în română", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSuperAdmin(page);
    await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      savedAt: new Date().toISOString(),
      policyVersion: "2026-09-12",
    })));
  });

  test("afișează sumarul operațional și centrele principale pe desktop", async ({ page }) => {
    await page.goto("/profil?tab=overview");

    await expect(page.getByRole("heading", { name: "Bun venit, Andrei." })).toBeVisible();
    await expect(page.getByText("Necesită atenție · Azi")).toBeVisible();
    await expect(page.getByText("Centru de aprobări")).toBeVisible();
    await expect(page.getByText("Activitatea agenților")).toBeVisible();
    await expect(page.getByText("Infrastructură", { exact: true })).toBeVisible();
    await expect(page.getByText("Venituri luna aceasta")).toBeVisible();
    await expect(page.getByText("Informare AVY", { exact: false })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigare AVYRON OS" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  });

  test("rămâne utilizabil pe mobil și oferă Command Center", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/profil?tab=overview");

    await expect(page.getByRole("navigation", { name: "Navigare mobilă" })).toBeVisible();
    await page.getByRole("button", { name: /Caută clienți, proiecte/ }).click();
    await expect(page.getByPlaceholder("Caută proiecte, leaduri, facturi, agenți…")).toBeVisible();
    await expect(page.getByText("Comenzi disponibile", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });

  test("Super Admin poate gestiona controlat accesul unui membru", async ({ page }) => {
    let submitted: { accessLevel?: string } | null = null;
    await page.route("**/api/admin/users", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{ id: "staff-1", email: "coleg@avyron.ro", display_name: "Coleg Avyron", company_name: "Avyron", staff_role: "marketing", disabled_at: null, roles: "user,staff" }],
      }),
    }));
    await page.route("**/api/admin/users/**", async (route) => {
      submitted = route.request().postDataJSON() as { accessLevel?: string };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, userId: "staff-1", roles: ["user", "admin"] }) });
    });

    await page.goto("/profil?tab=team-staff");
    await expect(page.getByRole("heading", { name: "Echipă și personal" })).toBeVisible();
    await page.getByRole("button", { name: "Gestionează" }).click();
    await page.getByLabel("Nivel de acces").selectOption("admin");
    await page.getByRole("button", { name: "Salvează accesul" }).click();

    await expect(page.getByText("Nivelul de acces a fost actualizat și auditat.")).toBeVisible();
    expect(submitted).toEqual({ accessLevel: "admin" });
  });
});
