import { test as base, expect, type Page } from "@playwright/test";
import axe from "axe-core";
import {
  createAgencyBackend,
  closeAgencySchemas,
  type AgencyBackend,
} from "./fixtures/leadsAgencyBackend";
import { bucharestDay } from "../src/shared/futureLeads";
const day = (offset: number) =>
  new Date(Date.parse(bucharestDay()) + offset * 86400000)
    .toISOString()
    .slice(0, 10);
const input = () => ({
  title: "Website cabinet medical",
  name: "Client Demo",
  business: "Clinică Demo",
  email: "demo@example.test",
  phone: "0722123456",
  source: "Recomandare client",
  requirements: "Programări online și prezentare servicii medicale.",
  contactOn: day(12),
  projectKind: "website_prezentare",
  clientId: null,
  staffIds: ["reader"],
});
const test = base.extend<{ backend: AgencyBackend }>({
  backend: async ({ page }, run) => {
    const b = createAgencyBackend();
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
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url()),
        p = url.pathname;
      if (p === "/api/auth/refresh")
        return route.fulfill({
          json: { access_token: "synthetic-browser-token", expires_in: 900 },
        });
      if (p === "/api/auth/me")
        return route.fulfill({
          json: {
            user: {
              id: b.actor,
              email:
                b.actor === "owner"
                  ? "prometheus@avyron.ro"
                  : `${b.actor}@example.test`,
              display_name: "Operator de test",
              email_verified: 1,
              must_change_password: 0,
            },
            profile: { display_name: "Operator de test" },
            roles: [
              b.actor === "owner"
                ? "admin"
                : b.actor === "reader"
                  ? "staff"
                  : "user",
            ],
            capabilities: [],
            superadmin: b.actor === "owner",
          },
        });
      if (
        p.startsWith("/api/future-leads") ||
        p.startsWith("/api/leads") ||
        p.startsWith("/api/projects")
      ) {
        const r = await b.request(p + url.search, {
          method: route.request().method(),
          headers: route.request().headers(),
          body: route.request().postDataBuffer() || undefined,
        });
        return route.fulfill({
          status: r.status,
          headers: { "content-type": "application/json" },
          body: await r.text(),
        });
      }
      return route.fulfill({ json: { data: [] } });
    });
    try {
      await run(b);
    } finally {
      await page.unrouteAll({ behavior: "wait" });
      await page.close();
      b.close();
    }
  },
});
test.afterAll(closeAgencySchemas);
async function seed(b: AgencyBackend, overrides = {}) {
  const r = await b.request("/api/future-leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ input: { ...input(), ...overrides } }),
  });
  expect(r.status).toBe(201);
  return ((await r.json()) as { id: string }).id;
}
async function choose(page: Page, label: string, name: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
for (const width of [1440, 390, 320])
  test(`future leads: persisted creation, mini record and contact actions at ${width}px`, async ({
    page,
    backend,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profil?tab=future-leads");
    const region = page
      .getByRole("region", { name: "Leaduri Viitoare", exact: true })
      .first();
    await expect(
      region.getByRole("heading", { name: "Leaduri Viitoare", exact: true }),
    ).toBeVisible();
    await region.getByRole("button", { name: "Adaugă / programează" }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Proiect / serviciu dorit *", { exact: true })
      .fill("Website programat de test");
    await dialog
      .getByLabel("Persoană de contact", { exact: true })
      .fill("Maria Demo");
    await dialog
      .getByLabel("Firmă / client", { exact: true })
      .fill("Companie Demo");
    await dialog.getByLabel("Telefon", { exact: true }).fill("0722123456");
    await dialog
      .getByLabel("E-mail", { exact: true })
      .fill("test@example.test");
    await dialog
      .getByLabel("Data contactării / inițierii *", { exact: true })
      .fill(day(8));
    await dialog
      .getByLabel("Sursa leadului *", { exact: true })
      .fill("Recomandare partener");
    await dialog
      .getByLabel("Ce își dorește clientul", { exact: true })
      .fill("Website premium cu formular de ofertă.");
    await dialog
      .getByRole("button", { name: "Programează leadul", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: "Fișa leadului viitor" }),
    ).toBeVisible();
    await dialog
      .getByLabel("Ce își dorește clientul", { exact: true })
      .fill("Cerințe actualizate pentru website premium.");
    await dialog.getByRole("button", { name: "Salvează modificările" }).click();
    await expect(dialog.getByRole("status")).toContainText("actualizată");
    await dialog.getByRole("button", { name: "Închide", exact: true }).click();
    await noOverflow(page);
    await page.screenshot({
      path: `/tmp/avyron-future-leads-list-${width}.png`,
      fullPage: true,
    });
    await expect(
      region.getByRole("link", { name: "Sună Maria Demo" }),
    ).toHaveAttribute("href", "tel:+40722123456");
    await expect(
      region.getByRole("link", { name: "WhatsApp Maria Demo" }),
    ).toHaveAttribute("href", /^https:\/\/wa.me\/40722123456\?text=/);
    await expect(
      region.getByRole("link", { name: "E-mail Maria Demo" }),
    ).toHaveAttribute("href", "mailto:test@example.test");
    await page.reload();
    await region.getByRole("button", { name: "Deschide fișa" }).click();
    await expect(
      dialog.getByLabel("Ce își dorește clientul", { exact: true }),
    ).toHaveValue("Cerințe actualizate pentru website premium.");
    expect(
      backend.db.prepare("SELECT count(*) total FROM leads").get()?.total,
    ).toBe(1);
    await noOverflow(page);
    if (width === 1440) {
      await page.addScriptTag({ content: axe.source });
      const report = await page.evaluate(async () =>
        window.axe.run('[role="dialog"]', {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        }),
      );
      expect(report.violations).toEqual([]);
    }
    await page.screenshot({
      path: `/tmp/avyron-future-leads-${width}.png`,
      fullPage: true,
    });
  });
test("chronological search, archive, reactivation and project conversion preserve native state", async ({
  page,
  backend,
}) => {
  const id = await seed(backend);
  await seed(backend, {
    title: "Magazin urgent",
    email: "urgent@example.test",
    phone: "0733123456",
    contactOn: day(1),
  });
  await page.goto("/profil?tab=future-leads");
  const region = page
    .getByRole("region", { name: "Leaduri Viitoare", exact: true })
    .first();
  await expect(region.getByRole("listitem").first()).toContainText(
    "Magazin urgent",
  );
  await region
    .getByRole("textbox", { name: "Caută leaduri viitoare" })
    .fill("cabinet");
  await expect(region.getByRole("listitem")).toHaveCount(1);
  await region.getByRole("button", { name: "Deschide fișa" }).click();
  const dialog = page.getByRole("dialog");
  await choose(page, "Starea programării", "Arhivat");
  await dialog.getByRole("button", { name: "Salvează modificările" }).click();
  await expect(dialog.getByRole("status")).toContainText("actualizată");
  await dialog.getByRole("button", { name: "Închide", exact: true }).click();
  await expect(region.getByRole("listitem")).toHaveCount(0);
  await region.getByRole("button", { name: "Opțiuni listă" }).click();
  await choose(page, "Starea leadurilor", "Arhivate");
  await region.getByRole("button", { name: "Deschide fișa" }).click();
  await choose(page, "Starea programării", "Programat");
  await dialog.getByRole("button", { name: "Salvează modificările" }).click();
  await expect(
    dialog.getByRole("button", { name: "Transformă în proiect" }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Transformă în proiect" }).click();
  await dialog
    .getByRole("button", { name: "Confirmă crearea proiectului" })
    .click();
  await expect(page).toHaveURL(/\/intern\/projects\//);
  const lead = backend.db
    .prepare("SELECT converted_project_id FROM leads WHERE id=?")
    .get(id)!;
  expect(lead.converted_project_id).toBeTruthy();
  expect(
    backend.db
      .prepare("SELECT description FROM projects WHERE id=?")
      .get(lead.converted_project_id)?.description,
  ).toContain("Programări online");
});
test("allocated staff see their record only and no global allocation or conversion actions", async ({
  page,
  backend,
}) => {
  await seed(backend);
  await seed(backend, {
    title: "Privat pentru Owner",
    email: "private@example.test",
    phone: "0744123456",
    staffIds: ["owner"],
  });
  backend.actor = "reader";
  await page.goto("/profil?tab=future-leads");
  const region = page
    .getByRole("region", { name: "Leaduri Viitoare", exact: true })
    .first();
  await expect(region.getByRole("listitem")).toHaveCount(1);
  await expect(
    region.getByRole("button", { name: "Adaugă / programează" }),
  ).toHaveCount(0);
  await region.getByRole("button", { name: "Deschide fișa" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Transformă în proiect" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByText("Membri staff alocați", { exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByLabel("Ce își dorește clientul", { exact: true }),
  ).toBeEnabled();
});
test("network save failures preserve the draft and offer a recoverable error", async ({
  page,
  backend,
}) => {
  const id = await seed(backend);
  await page.goto(`/profil?tab=future-leads&futureLead=${id}`);
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Ce își dorește clientul", { exact: true })
    .fill("Date păstrate după eroare.");
  await page.route(`**/api/future-leads/${id}`, (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 503,
          json: { error: { code: "temporarily_unavailable" } },
        })
      : route.fallback(),
  );
  await dialog.getByRole("button", { name: "Salvează modificările" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Datele introduse sunt păstrate",
  );
  await expect(
    dialog.getByLabel("Ce își dorește clientul", { exact: true }),
  ).toHaveValue("Date păstrate după eroare.");
});
