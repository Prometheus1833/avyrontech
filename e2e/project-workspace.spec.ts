import { checkWorkspaceAccessibility } from "./workspace-accessibility";
import { test, expect, type Page } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
const stamp = Date.UTC(2026, 10, 9);
async function setup(page: Page) {
  await staffFixture(page);
  let fail: false | number = false;
  const common = {
    kind: "website_prezentare",
    url: null,
    created_at: stamp,
    updated_at: stamp,
    price_ron: 1300,
    budget_visible: true,
    client_id: "c1",
    client_name: "Beneficiar Șantier",
    service_names: "SEO și website",
    planned_start_at: null,
    planned_end_at: null,
  };
  const rows = [
    {
      ...common,
      id: "proposed",
      slug: "proposed",
      name: "Concept Nord",
      status: "lead",
      banner_status: "proposed",
    },
    {
      ...common,
      id: "dev",
      slug: "dev",
      name: "Portal în lucru",
      status: "in_progress",
      banner_status: "in_progress",
    },
    {
      ...common,
      id: "testing",
      slug: "testing",
      name: "Testare magazin",
      status: "in_progress",
      banner_status: "testing",
      kind: "magazin_online",
    },
    ...Array.from({ length: 8 }, (_, i) => ({
      ...common,
      id: `done-${i}`,
      slug: `done-${i}`,
      name: `Site finalizat ${i}`,
      status: "completed",
      banner_status: "online",
    })),
    {
      ...common,
      id: "archive",
      slug: "archive",
      name: "Proiect arhivat",
      status: "archived",
      banner_status: "online",
    },
  ];
  await page.route("**/api/projects**", (r) =>
    fail
      ? r.fulfill({
          status: fail,
          json: { error: { message: "Eroare temporară de test" } },
        })
      : r.fulfill({ json: { data: rows, sales: [], purchases: [] } }),
  );
  return {
    setFailure: (value: false | number) => {
      fail = value;
    },
  };
}
for (const width of [320, 390, 1440])
  test(`Pipeline și listă au aceeași selecție și păstrează filtrele la actualizare la ${width}px`, async ({
    page,
  }, info) => {
    const state = await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profil?tab=projects");
    const workspace = page.getByRole("region", { name: "Organizare proiecte" });
    await expect(workspace.getByRole("status")).toHaveText(
      "11 proiecte afișate din 12 încărcate",
    );
    const done = workspace
      .getByLabel("Pipeline proiecte")
      .locator('details[aria-label="Finalizat"]');
    await expect(done.locator("article")).toHaveCount(5);
    await done.getByRole("button", { name: "Vezi încă 3 proiecte" }).click();
    await expect(done.locator("article")).toHaveCount(8);
    await workspace.getByRole("button", { name: "Listă", exact: true }).click();
    await expect(
      workspace.getByLabel("Lista proiectelor").locator("article"),
    ).toHaveCount(11);
    await workspace
      .getByRole("button", { name: "Finalizat · 8", exact: true })
      .click();
    await expect(
      workspace.getByLabel("Lista proiectelor").locator("article"),
    ).toHaveCount(8);
    await workspace
      .getByRole("button", { name: "Pipeline", exact: true })
      .click();
    await expect(
      workspace.getByLabel("Pipeline proiecte").locator("details"),
    ).toHaveCount(1);
    await workspace
      .getByRole("searchbox", { name: "Caută proiecte" })
      .fill("santier finalizat 7");
    await expect(workspace.getByRole("status")).toHaveText(
      "1 proiect afișat din 12 încărcate",
    );
    await page.evaluate(() =>
      window.dispatchEvent(new Event("avyron:projects-changed")),
    );
    await expect(
      workspace.getByRole("searchbox", { name: "Caută proiecte" }),
    ).toHaveValue("santier finalizat 7");
    await expect(
      workspace.getByRole("link", { name: "Site finalizat 7", exact: true }),
    ).toBeVisible();
    state.setFailure(503);
    await page.evaluate(() =>
      window.dispatchEvent(new Event("avyron:projects-changed")),
    );
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Nu am putut actualiza proiectele" }),
    ).toBeVisible();
    await expect(
      workspace.getByRole("link", { name: "Site finalizat 7", exact: true }),
    ).toBeVisible();
    state.setFailure(false);
    await page.getByRole("button", { name: "Reîncearcă", exact: true }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Nu am putut actualiza proiectele" }),
    ).toHaveCount(0);
    await workspace.getByRole("button", { name: "Resetează filtrele" }).click();
    await workspace
      .getByRole("combobox", { name: "Colecție", exact: true })
      .click();
    await page.getByRole("option", { name: "Arhivate și anulate" }).click();
    await expect(
      workspace.getByRole("link", { name: "Proiect arhivat", exact: true }),
    ).toBeVisible();
    await expect(workspace.getByLabel("Pipeline proiecte")).toHaveCount(0);
    await workspace.getByRole("button", { name: "Resetează filtrele" }).click();
    await expect(
      workspace.getByRole("link", { name: "Proiect arhivat", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await checkWorkspaceAccessibility(
      page,
      '[aria-label="Organizare proiecte"]',
    );
    await workspace.screenshot({
      path: info.outputPath(`project-workspace-${width}.png`),
    });
    state.setFailure(403);
    await page.evaluate(()=>window.dispatchEvent(new Event("avyron:projects-changed")));
    await expect(page.getByRole("alert").filter({hasText:"Nu am putut actualiza proiectele"})).toBeVisible();
    await expect(page.getByRole("region",{name:"Organizare proiecte"})).toHaveCount(0);
  });
