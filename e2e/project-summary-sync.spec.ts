import { test, expect, type Page } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
const stamp = Date.UTC(2026, 10, 6),
  base = {
    id: "pa",
    slug: "project-a",
    name: "Portal Beneficiar",
    kind: "website_prezentare",
    status: "in_progress",
    banner_status: "testing",
    url: "https://example.test",
    favicon_url: null,
    client_id: "ca",
    client_name: "Beneficiar Sintetic SRL",
    created_at: stamp,
    updated_at: stamp,
    price_ron: 1450,
    price_eur: null,
    budget_visible: true,
    planned_start_at: Date.UTC(2026, 10, 1),
    planned_end_at: Date.UTC(2026, 10, 30),
    service_names: "Site profesional · SEO",
    member_count: 2,
  };
async function setup(page: Page, staff = false) {
  await staffFixture(page, { role: staff ? "vibe_dev" : "platform_owner" });
  await page.route("**/api/documents/bootstrap", (r) =>
    r.fulfill({
      json: {
        permissions: {},
        staff: true,
        platformRole: null,
        mfaVerified: true,
        channels: { email: false, whatsapp: "manual", telegram: "manual" },
        storage: "verified",
        backup: "unconfigured",
        scanner: "unconfigured",
      },
    }),
  );
  await page.route("**/api/documents/context", (r) =>
    r.fulfill({
      json: {
        clients: [],
        projects: [],
        services: [],
        subscriptions: [],
        billingSubscriptions: [],
        products: [],
        purchases: [],
        licenses: [],
        partners: [],
        templates: [],
        company: {},
      },
    }),
  );
  let project = {
    ...base,
    price_ron: staff ? null : base.price_ron,
    budget_visible: !staff,
  };
  const writes: Record<string, unknown>[] = [];
  let fail = false;
  await page.route("**/api/projects**", (r) => {
    const path = new URL(r.request().url()).pathname;
    if (r.request().method() === "PATCH") {
      writes.push(r.request().postDataJSON());
      if (fail)
        return r.fulfill({
          status: 500,
          json: { error: { code: "write_failed" } },
        });
      project = { ...project, ...r.request().postDataJSON() };
      return r.fulfill({ json: { ok: true } });
    }
    if (path === "/api/projects")
      return r.fulfill({
        json: {
          data: [
            project,
            {
              ...project,
              id: "pb",
              slug: "blog-client",
              name: "Blog editorial",
              kind: "blog_profesional",
              url: null,
              client_id: null,
              client_name: null,
              price_ron: null,
              planned_start_at: null,
              planned_end_at: null,
              service_names: null,
              banner_status: "in_progress",
            },
          ],
          sales: [],
          purchases: [],
        },
      });
    if (path === "/api/projects/project-a")
      return r.fulfill({
        json: {
          project: {
            ...project,
            description: "Portal de prezentare",
            owner_user_id: null,
            subscription_plan: "100e",
            subscription_status: "active",
            billing_next: stamp,
          },
          links: [],
          proposals: [],
          updates: [],
          staff: [],
          permission: {
            read: true,
            write: true,
            isStaff: true,
            isOwner: false,
            finance: !staff,
          },
          subscriptions: [
            {
              id: "native-sub",
              status: "active",
              next_billing_date: Date.UTC(2026, 11, 1),
              plan_sku: "CORE-LUNAR",
              service_name: "Mentenanță Core reală",
              billing_cycle: "monthly",
              price: staff ? null : 125,
            },
          ],
        },
      });
    return r.fulfill({ json: { data: [] } });
  });
  return {
    writes,
    fail: () => {
      fail = true;
    },
  };
}
for (const width of [320, 768, 1440])
  test(`proiectele arată date compacte și corecte în pipeline și listă la ${width}px`, async ({
    page,
  }, info) => {
    await setup(page);
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/profil?tab=projects");
    const card = page.getByRole("article", {
      name: "Portal Beneficiar",
      exact: true,
    });
    await expect(card).toContainText("Site Prezentare Profesional");
    await expect(card).toContainText("Beneficiar Sintetic SRL");
    await expect(card).toContainText("1.450");
    await expect(card).toContainText("Testare");
    await expect(card).toContainText("nov.");
    await expect(
      card.getByRole("link", { name: "Site proiect: Portal Beneficiar" }),
    ).toHaveAttribute("href", "https://example.test/");
    const blog = page.getByRole("article", {
      name: "Blog editorial",
      exact: true,
    });
    await expect(blog).toContainText("Blog profesional");
    await expect(blog).toContainText("Fără client alocat");
    await expect(blog).toContainText("Perioadă nestabilită");
    await expect(blog).toContainText("Buget necompletat");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`project-summary-${width}.png`),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Listă", exact: true }).click();
    await expect(card).toContainText("Beneficiar Sintetic SRL");
    await expect(card).toContainText("Site profesional · SEO");
    expect(await page.locator("a a").count()).toBe(0);
  });
test("fișa proiectului salvează calendarul și afișează abonamentul nativ, fără selectorul doar vizual", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/intern/projects/project-a");
  await expect(
    page.getByRole("heading", { name: "Abonamentele proiectului" }),
  ).toBeVisible();
  await expect(
    page.getByText("Mentenanță Core reală", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("CORE-LUNAR", { exact: true })).toBeVisible();
  await expect(page.getByText("100 EUR / lună", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByText("Planifică perioada proiectului", { exact: true })
    .click();
  await page
    .getByLabel("Început planificat", { exact: true })
    .fill("2026-11-05");
  await page.getByLabel("Final planificat", { exact: true }).fill("2026-12-20");
  await page
    .getByRole("button", { name: "Salvează perioada", exact: true })
    .click();
  await expect(page.getByRole("status").filter({hasText:"Perioada a fost salvată"})).toBeVisible();
  expect(state.writes[0]).toMatchObject({
    planned_start_at: Date.UTC(2026, 10, 5),
    planned_end_at: Date.UTC(2026, 11, 20),
  });
  state.fail();
  await page.getByLabel("Final planificat", { exact: true }).fill("2026-12-25");
  await page
    .getByRole("button", { name: "Salvează perioada", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Datele introduse sunt păstrate",
  );
  await expect(
    page.getByLabel("Final planificat", { exact: true }),
  ).toHaveValue("2026-12-25");
});
test("stafful fără financiar vede proiectul și calendarul, fără valori de buget", async ({
  page,
}) => {
  await setup(page, true);
  await page.goto("/profil?tab=projects");
  const card = page.getByRole("article", {
    name: "Portal Beneficiar",
    exact: true,
  });
  await expect(card).toContainText("Acces financiar restricționat");
  await expect(card).not.toContainText("1.450");
  await card
    .getByRole("link", { name: "Deschide proiectul", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rezumatul proiectului" }),
  ).toBeVisible();
  await expect(
    page.getByText("Acces financiar restricționat", { exact: true }),
  ).toBeVisible();
});
