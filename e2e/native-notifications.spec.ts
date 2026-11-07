import { test, expect, type Page } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
import { DEFAULT_NOTIFICATION_SETTINGS } from "../src/shared/notifications";
const stamp = Date.now();
const notices = [
  {
    id: "blog-1",
    title: "Noutăți din blog",
    body: "Un articol nou publicat de echipa AVYRON.",
    destination: "/blog/test",
    created_at: stamp,
    read_at: null,
    category: "blog",
    priority: "normal",
  },
  {
    id: "project-1",
    title: "Proiectul tău a intrat în testare",
    body: "Verifică noua versiune înainte de predare.",
    destination: "/intern/projects/client-test",
    created_at: stamp - 1000,
    read_at: null,
    category: "project",
    priority: "important",
  },
  {
    id: "sub-1",
    title: "Abonamentul tău a fost actualizat",
    body: "Consultă următoarea dată de facturare.",
    destination: "subscriptions",
    created_at: stamp - 2000,
    read_at: null,
    category: "subscription",
    priority: "important",
  },
];
async function feedFixture(page: Page, client = false) {
  await staffFixture(page);
  if (client)
    await page.route("**/api/auth/me", (r) =>
      r.fulfill({
        json: {
          user: {
            id: "self",
            email: "client@example.test",
            email_verified: 1,
            must_change_password: 0,
          },
          profile: {
            display_name: "Client test",
            theme: "dark",
            language: "ro",
          },
          roles: ["user"],
          superadmin: false,
          capabilities: [],
        },
      }),
    );
  const state = structuredClone(notices);
  let blogEnabled = true;
  await page.route("**/api/notifications**", async (r) => {
    const path = new URL(r.request().url()).pathname,
      method = r.request().method();
    if (path === "/api/notifications/admin")
      return r.fulfill({
        json: {
          config: DEFAULT_NOTIFICATION_SETTINGS,
          revision: 2,
          updated_at: stamp,
          counts: [{ category: "project", total: 3, unread: 1 }],
        },
      });
    if (path.endsWith("/read")) {
      const row = state.find((n) => path.includes(n.id));
      if (row) row.read_at = Date.now();
      return r.fulfill({ json: { ok: true } });
    }
    if (path.endsWith("/preferences")) {
      blogEnabled = r.request().postDataJSON().blogEnabled;
      return r.fulfill({ json: { ok: true } });
    }
    if (path.endsWith("/config"))
      return r.fulfill({ json: { data: DEFAULT_NOTIFICATION_SETTINGS.guest } });
    if (method === "GET")
      return r.fulfill({
        json: {
          data: state.filter((n) => blogEnabled || n.category !== "blog"),
          blogEnabled,
        },
      });
    return r.fulfill({ json: { ok: true } });
  });
  return state;
}
for (const width of [320, 390, 1440])
  test(`client inbox is chronological, important, readable and responsive at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await feedFixture(page, true);
    await page.goto("/profil?tab=notifications");
    const inbox = page.getByRole("region", { name: "Notificările tale" });
    await expect(inbox).toBeVisible();
    await expect(inbox.locator("article").first()).toContainText(
      "Noutăți din blog",
    );
    await inbox
      .getByRole("button", { name: "Importante", exact: true })
      .click();
    await expect(inbox.locator("article")).toHaveCount(2);
    await expect(inbox.locator("article").first()).toContainText(
      "Proiectul tău",
    );
    await inbox.getByRole("button", { name: "Toate", exact: true }).click();
    await inbox
      .locator("article")
      .first()
      .getByRole("button", { name: "Marchează citită" })
      .click();
    await expect(
      inbox
        .locator("article")
        .first()
        .getByRole("button", { name: "Marchează citită" }),
    ).toHaveCount(0);
    await inbox.getByLabel("Include noutățile din blog").uncheck();
    await expect(inbox.locator("article")).toHaveCount(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`client-notifications-${width}.png`),
    });
  });
test("superadmin config previews localized copy, saves revision and reports errors", async ({
  page,
}, info) => {
  await feedFixture(page);
  let body: Record<string, unknown> | null = null;
  await page.route("**/api/notifications/admin", async (r) => {
    if (r.request().method() === "PUT") {
      body = r.request().postDataJSON();
      return r.fulfill({ json: { revision: 3, updated_at: Date.now() } });
    }
    return r.fulfill({
      json: {
        config: DEFAULT_NOTIFICATION_SETTINGS,
        revision: 2,
        updated_at: stamp,
        counts: [{ category: "project", total: 3, unread: 1 }],
      },
    });
  });
  await page.goto("/profil?tab=notification-settings");
  await expect(
    page.getByRole("heading", { name: "Sistem de notificări", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Titlu", exact: true })
    .fill("Un website pentru brandul tău");
  await expect(
    page.getByRole("heading", { name: "Un website pentru brandul tău" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salvează", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Configurația a fost salvată",
  );
  expect(body).toMatchObject({
    revision: 2,
    config: {
      guest: {
        messages: {
          website: { title: { ro: "Un website pentru brandul tău" } },
        },
      },
    },
  });
  await page.screenshot({
    path: info.outputPath("notification-settings-desktop.png"),
    fullPage: true,
  });
  await page.route("**/api/notifications/admin", (r) =>
    r.fulfill({
      status: 409,
      json: {
        error: {
          code: "revision_conflict",
          message: "Configurația a fost modificată. Reîncarcă.",
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Salvează", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Configurația a fost modificată",
  );
});
test("managed staff has their inbox but no admin settings", async ({
  page,
}) => {
  await staffFixture(page, { role: "vibe_dev" });
  await page.route("**/api/notifications?*", (r) =>
    r.fulfill({ json: { data: [], blogEnabled: true } }),
  );
  await page.goto("/profil?tab=notifications");
  await expect(
    page.getByRole("heading", { name: "Notificările tale", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sistem notificări", exact: true }),
  ).toHaveCount(0);
});
test("visitor contact suggestion respects active time, consent, dismissal and page context", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
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
  await page.route("**/api/**", (r) => {
    const path = new URL(r.request().url()).pathname;
    if (path === "/api/auth/refresh" || path === "/api/auth/me")
      return r.fulfill({
        status: 401,
        json: { error: { code: "unauthenticated" } },
      });
    if (path === "/api/notifications/config")
      return r.fulfill({
        json: {
          data: { ...DEFAULT_NOTIFICATION_SETTINGS.guest, delaySeconds: 30 },
        },
      });
    return r.fulfill({ json: { data: [] } });
  });
  const configResponse = page.waitForResponse(
    (r) => r.url().includes("/api/notifications/config") && r.status() === 200,
  );
  await page.goto("/servicii/website-prezentare-profesional");
  await expect(page.locator("h1").first()).toBeVisible();
  await configResponse;
  await page.clock.runFor(1000);
  await page.bringToFront();
  // The controlled clock also controls focus; other parallel browser contexts cannot steal this fixture’s engaged time.
  await page.evaluate(() =>
    Object.defineProperty(document, "hasFocus", {
      value: () => true,
      configurable: true,
    }),
  );
  await page.clock.runFor(35000);
  await expect(
    page.getByRole("status", { name: "O sugestie pentru proiectul tău" }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    const key = "avyron-cookie-consent-v2";
    const consent = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...consent, marketing: true }));
  });
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    }),
  );
  await page.clock.runFor(35000);
  await expect(
    page.getByRole("status", { name: "O sugestie pentru proiectul tău" }),
  ).toHaveCount(0);
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    }),
  );
  await page.clock.runFor(31000);

  const prompt = page.getByRole("status", {
    name: "O sugestie pentru proiectul tău",
  });
  await expect(prompt).toBeVisible();
  await expect(prompt.getByRole("heading")).toContainText("website");
  await expect(prompt.getByRole("link")).toHaveAttribute(
    "href",
    "https://avyron.ro/#cta",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("guest-contextual-mobile.png"),
  });
  await prompt.getByRole("button", { name: "Închide sugestia" }).click();
  await expect(prompt).toHaveCount(0);
  await page.clock.runFor(61000);
  await expect(prompt).toHaveCount(0);
});
test("public user mini panel opens an anchored inbox without blocking navigation", async ({
  page,
}) => {
  await feedFixture(page, true);
  await page.goto("/");
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await page.getByRole("menuitem", { name: "Notificări", exact: true }).click();
  const inbox = page.getByRole("dialog", { name: "Notificările tale" });
  await expect(
    inbox.getByText("Proiectul tău a intrat în testare"),
  ).toBeVisible();
  expect(await page.evaluate(() => document.body.style.pointerEvents)).not.toBe(
    "none",
  );
  await page.keyboard.press("Escape");
  await expect(inbox).not.toBeVisible();
});

test("incomplete notification monitoring data cannot crash the operational dashboard", async ({
  page,
}) => {
  await feedFixture(page);
  await page.route("**/api/os/overview", (route) =>
    route.fulfill({
      json: {
        generatedAt: stamp,
        role: "super_admin",
        leadPipeline: [],
        activeProjects: [],
        metrics: {
          projects: 0,
          activeProjects: 0,
          openLeads: 0,
          leads: 0,
          clients: 0,
          visits: 0,
          revenuesMinor: 0,
          expensesMinor: 0,
          approvals: 0,
          criticalAlerts: 0,
        },
        briefing: "Date de test",
        attention: [],
        approvals: [],
        agentRuns: [],
        health: [],
        integrations: [],
      },
    }),
  );
  await page.route("**/api/notifications/admin", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route("**/api/notifications?*", (route) =>
    route.fulfill({ json: { data: null } }),
  );
  await page.goto("/profil?tab=overview");
  const summary = page.getByRole("button", { name: /Sistem de notificări/ });
  await expect(summary).toContainText(
    "Starea notificărilor nu este disponibilă",
  );
  await expect(page.getByRole("heading", { name: /Bună/ })).toBeVisible();
  await page
    .locator('header button[title="Notificări"][aria-haspopup="dialog"]')
    .click();
  const inbox = page.getByRole("dialog", { name: "Notificările tale" });
  await expect(inbox.getByRole("alert")).toContainText(
    "Unele notificări nu sunt disponibile",
  );
  await page.keyboard.press("Escape");
  await expect(inbox).not.toBeVisible();
  await summary.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Configurația" }),
  ).toContainText("Configurația nu a putut fi încărcată");
  await expect(
    page.getByRole("button", { name: "Salvează", exact: true }),
  ).toBeDisabled();
});
