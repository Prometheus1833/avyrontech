import { test, expect, type Page } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
import type { ProjectProposal } from "../src/lib/internApi";
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
async function setup(page: Page, staff = false, client = false) {
  await staffFixture(page, { role: staff ? "vibe_dev" : "platform_owner" });
  if (client) {
    await page.route("**/api/auth/me", (r) => r.fulfill({
      json: {
        user: { id: "client", email: "client@example.test", email_verified: 1, must_change_password: 0 },
        profile: { id: "client", display_name: "Client sintetic", theme: "light", language: "ro" },
        roles: ["user"], superadmin: false, capabilities: [],
      },
    }));
  }
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
  const proposals: ProjectProposal[] = [];
  const uploads: { filename: string | null; type: string | undefined }[] = [];
  const files = [
    { id: "shared", proposal_id: null as string | null, filename: "Brief aprobat.pdf", content_type: "application/pdf", size_bytes: 2048, url: "/api/media/shared/file" },
    { id: "request-file", proposal_id: "request-a", filename: "Atașament cerere.pdf", content_type: "application/pdf", size_bytes: 1024, url: "/api/media/request-file/file" },
  ];
  let fail = false;
  let blockUpload = false;
  await page.route("**/api/workspace/work-items/pa", (r) => r.fulfill({
    json: { data: [], canWrite: !client },
  }));
  await page.route("**/api/media/**/file", (r) => r.fulfill({
    contentType: "application/pdf", body: "%PDF-1.4 fixture",
  }));
  await page.route("**/api/projects**", (r) => {
    const url = new URL(r.request().url());
    const path = url.pathname;
    if (path === "/api/projects/pa/media") {
      if (r.request().method() === "POST") {
        const filename = url.searchParams.get("filename");
        uploads.push({ filename, type: r.request().headers()["content-type"] });
        if (blockUpload) return r.fulfill({ status: 503, json: { error: { code: "provider_unavailable" } } });
        const file = { ...files[0], id: "new-file", filename: filename || "nou.pdf", url: "/api/media/new-file/file" };
        files.push(file);
        return r.fulfill({ status: 201, json: file });
      }
      return r.fulfill({ json: { data: files } });
    }
    if (path === "/api/projects/pa/proposals" && r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      const id = "new-request";
      proposals.push({ id, project_id: "pa", author_id: client ? "client" : "self", title: body.title,
        description: body.description, status: "proposed", created_at: stamp, updated_at: stamp });
      return r.fulfill({ status: 201, json: { id } });
    }
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
          proposals,
          updates: [],
          staff: [],
          permission: {
            read: true,
            write: !client,
            isStaff: !client,
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
    uploads,
    blockUpload: (blocked: boolean) => { blockUpload = blocked; },
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
    await expect(card.getByRole("link",{name:"Site proiect: Portal Beneficiar",exact:true})).toHaveAttribute("href","https://example.test/");
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

test("stafful schimbă etapa și încarcă fișiere direct din fișă, cu recuperare după scanare indisponibilă", async ({ page }, info) => {
  const state = await setup(page, true);
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto("/intern/projects/project-a");
  await expect(page.getByRole("heading", { name: "Portal Beneficiar", level: 1 })).toBeVisible();
  const pipeline = page.getByRole("region", { name: "Parcursul proiectului" });
  await expect(pipeline.locator("[aria-current='step']")).toContainText("Testare");
  await pipeline.getByRole("button", { name: "Treci la Finalizat" }).click();
  await expect(pipeline.locator("[aria-current='step']")).toContainText("Finalizat");
  await page.screenshot({ path: info.outputPath("project-staff-390.png"), animations: "disabled" });
  expect(state.writes[0]).toEqual({ banner_status: "online" });
  await page.getByRole("navigation", { name: "Secțiunile proiectului" }).getByRole("link", { name: "Documente" }).click();
  const documents = page.getByRole("region", { name: "Documentele proiectului" });
  await expect(documents.getByRole("button", { name: "Încarcă documente", exact: true })).toBeVisible();
  await expect(documents.getByText("Brief aprobat.pdf", { exact: true })).toBeVisible();
  await expect(documents.getByText("Atașament cerere.pdf", { exact: true })).toHaveCount(0);
  const input = documents.getByLabel("Alege documentele proiectului");
  const file = { name: "Raport verificare.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 synthetic") };
  state.blockUpload(true);
  await input.setInputFiles(file);
  await expect(documents.getByRole("alert").filter({ hasText: "Verificarea de securitate este momentan indisponibilă" })).toBeVisible();
  await expect(documents.getByText(file.name, { exact: true })).toHaveCount(0);
  state.blockUpload(false);
  await input.setInputFiles(file);
  await expect(documents.getByText(file.name, { exact: true })).toBeVisible();
  expect(state.uploads).toEqual(Array.from({ length: 2 }, () => ({ filename: file.name, type: file.mimeType })));
  const download = page.waitForEvent("download");
  await documents.getByRole("button", { name: `Descarcă ${file.name}` }).click();
  expect((await download).suggestedFilename()).toBe(file.name);
  await documents.screenshot({ path: info.outputPath("project-documents-390.png"), animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("clientul vede parcursul și fișierele proiectului fără comenzi de administrare", async ({ page }, info) => {
  await setup(page, false, true);
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/intern/projects/project-a");
  await expect(page.getByRole("heading", { name: "Portal Beneficiar", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Trimite o cerere" })).toHaveAttribute("href", "#cereri");
  await expect(page.getByRole("region", { name: "Parcursul proiectului" }).locator("[aria-current='step']")).toContainText("Testare");
  await expect(page.getByText("Schimbă etapa", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Adaugă activitate" })).toHaveCount(0);
  const documents = page.getByRole("region", { name: "Documentele proiectului" });
  await expect(documents.getByRole("button", { name: "Descarcă Brief aprobat.pdf" })).toBeVisible();
  await expect(documents.getByRole("button", { name: "Încarcă documente", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Configurarea proiectului" })).toHaveCount(0);
  await page.getByRole("link", { name: "Trimite o cerere" }).click();
  const requests = page.getByRole("region", { name: "Cereri de modificare" });
  await requests.getByLabel("Titlul cererii").fill("Actualizează pagina Contact");
  await requests.getByLabel("Detalii").fill("Înlocuiește programul vechi.");
  await requests.getByRole("button", { name: "Trimite cererea" }).click();
  await expect(requests.getByRole("listitem").filter({ hasText: "Actualizează pagina Contact" })).toContainText("Nouă");
  await page.screenshot({ path: info.outputPath("project-client-320.png"), animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
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
