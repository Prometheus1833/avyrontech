import { createRequire } from "node:module";
import { expect, test, type Page } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
import {
  DOCUMENT_PERMISSIONS,
  ENTITY_TYPES,
} from "../src/shared/documents/model";
const client = {
  id: "ca",
  company_name: "Client A sintetic",
  contact_name: "Ana Test",
  email: "a@example.test",
  phone: "",
  status: "active",
  entity_type: "PJ" as string | null,
  legal_name: "Client A SRL",
  tax_id: "SYNTHETIC-A",
  address: "Adresă de test",
  registration_number: null,
  representative: null,
  created_at: 1,
  updated_at: 1,
  revision: 1,
  notes: "Context intern",
  project_count: 2,
  active_subscription_count: 1,
  account_count: 1,
  pending_payments: null,
};
const account = {
  id: "account-a",
  email: "a@example.test",
  username: "client-a",
  display_name: "Ana Test",
  company_name: null,
  email_verified: 1,
  must_change_password: 1,
  disabled_at: null,
  last_login_at: null,
};
const project = {
  id: "pa",
  name: "Website sintetic",
  slug: "website-sintetic",
  kind: "website_prezentare",
  status: "in_progress",
  client_id: "ca",
  organization_id: null,
  owner_user_id: null,
  updated_at: 1,
  url: null,
};
async function setup(page: Page, unknownType = false) {
  await staffFixture(page);
  const captures: {
      path: string;
      body: Record<string, unknown>;
      key?: string;
    }[] = [],
    lists: URL[] = [];
  let current = {
      ...structuredClone(client),
      entity_type: unknownType ? null : client.entity_type,
    },
    fail = false;
  const file = () => ({
    client: current,
    organizationId: null,
    projects: [
      project,
      {
        ...project,
        id: "pa2",
        name: "Magazin sintetic",
        slug: "magazin-sintetic",
      },
    ],
    subscriptions: [
      {
        id: "sub-a",
        service_name: "Core lunar",
        status: "active",
        project_id: "pa",
        project_name: project.name,
        next_billing_date: Date.UTC(2027, 0, 31),
        maintenance_enabled: 1,
        plan_sku: "core",
        billing_cycle: "monthly",
        specifications_json: "{}",
      },
    ],
    accounts: [account],
    availableProjects: [
      {
        ...project,
        id: "pb",
        client_id: "cb",
        name: "Proiect disponibil",
        company_name: "Client B",
        canAssign: true,
        assignmentReason: null,
      },
      {
        ...project,
        id: "blocked",
        client_id: "cb",
        name: "Proiect cu istoric",
        company_name: "Client B",
        canAssign: false,
        assignmentReason: "Are istoric al altui beneficiar.",
      },
    ],
    accountOptions: [
      account,
      {
        ...account,
        id: "account-b",
        email: "b@example.test",
        display_name: "Cont B",
        username: "client-b",
      },
    ],
    invoices: [
      {
        id: "inv-a",
        service_name: "Website A",
        invoice_number: "TEST-001",
        status: "paid",
        currency: "RON",
        gross_amount_minor: 10000,
        received_minor: 10000,
        due_date: Date.UTC(2027, 0, 31),
        invoice_date: 1,
        project_name: project.name,
        source: "financial",
      },
      {
        id: "draft-a",
        service_name: "Abonament lunar",
        invoice_number: null,
        status: "draft",
        currency: "RON",
        gross_amount_minor: 10000,
        received_minor: 0,
        due_date: Date.UTC(2027, 1, 28),
        invoice_date: null,
        project_name: project.name,
        source: "financial",
      },
    ],
    receipts: [],
    orders: [],
    carts: [],
    permissions: {
      edit: true,
      manageAccounts: true,
      manageProjects: true,
      manageSubscriptions: true,
      finance: true,
      documents: true,
    },
  });
  await page.route("**/api/admin/operations/clients**", async (r) => {
    const u = new URL(r.request().url());
    if (r.request().method() !== "GET") {
      const body = r.request().postDataJSON();
      captures.push({
        path: u.pathname,
        body,
        key: r.request().headers()["idempotency-key"],
      });
      if (r.request().method() === "PATCH") {
        current = {
          ...current,
          company_name: body.identity.companyName,
          revision: 2,
          entity_type: body.identity.entityType,
        };
      }
      return r.fulfill({
        json: { ok: true, id: "ca", accountId: "account-a" },
      });
    }
    if (fail)
      return r.fulfill({
        status: 503,
        json: {
          error: {
            code: "unavailable",
            message: "Registru indisponibil temporar",
          },
        },
      });
    if (u.pathname.endsWith("/options"))
      return r.fulfill({
        json: { accounts: [account], canManageAccounts: true },
      });
    if (u.pathname.endsWith("/ca")) return r.fulfill({ json: file() });
    lists.push(u);
    return r.fulfill({
      json: {
        data: u.searchParams.get("q") === "inexistent" ? [] : [current],
        total: u.searchParams.get("q") === "inexistent" ? 0 : 1,
        limit: 50,
        offset: 0,
        metrics: { clients: 1, projects: 2, subscriptions: 1 },
      },
    });
  });
  await page.route("**/api/projects", async (r) => {
    if (r.request().method() === "POST") {
      captures.push({
        path: "/api/projects",
        body: r.request().postDataJSON(),
        key: r.request().headers()["idempotency-key"],
      });
      return r.fulfill({ status: 201, json: { id: "new", slug: "new" } });
    }
    return r.fulfill({ json: { data: [] } });
  });
  const subLists: URL[] = [];
  await page.route("**/api/admin/client-subscriptions**", (r) => {
    const u = new URL(r.request().url());
    subLists.push(u);
    return r.fulfill({
      json: {
        data: [],
        clients: [current],
        accounts: [
          {
            id: account.id,
            email: account.email,
            name: account.display_name,
            client_ids: ["ca"],
          },
        ],
        projects: [project],
        plans: [],
        products: [],
        providerSubscriptions: [],
        canPrepareInvoices: false,
      },
    });
  });
  const docLists: URL[] = [];
  await page.route("**/api/documents**", (r) => {
    const u = new URL(r.request().url()),
      p = u.pathname;
    if (p.endsWith("/bootstrap"))
      return r.fulfill({
        json: {
          permissions: Object.fromEntries(
            DOCUMENT_PERMISSIONS.map((k) => [k, true]),
          ),
          staff: true,
          platformRole: "platform_owner",
          mfaVerified: true,
          channels: { email: false, whatsapp: "manual", telegram: "manual" },
          storage: "verified",
          backup: "configured",
          scanner: "unconfigured",
        },
      });
    if (p.endsWith("/context"))
      return r.fulfill({
        json: {
          company: { legal_name: "DIGITAL ECOTECH SOLUTIONS S.R.L." },
          clients: [
            current,
            { ...current, id: "cb", company_name: "Client B" },
          ],
          projects: [project],
          services: [],
          subscriptions: [],
          catalog: [],
          templates: [],
          products: [],
          plans: [],
          purchases: [],
          entitlements: [],
          billingSubscriptions: [],
          serviceProfiles: [],
          unreconciledServices: [],
          entityTypes: ENTITY_TYPES,
        },
      });
    if (p === "/api/documents") {
      docLists.push(u);
      return r.fulfill({
        json: {
          data: [
            {
              id: "doc-a",
              number: "DOC-TEST-1",
              title: "Ofertă client A",
              scope: "client",
              collection: "library",
              beneficiary_id: "ca",
              company_name: client.company_name,
              current_version_id: "v-a",
              published_version_id: null,
              revision: 1,
              archived_at: null,
              approved: null,
              updated_at: 1,
              legal: 0,
              template_family: "offer",
            },
          ],
          total: 1,
          nextOffset: null,
        },
      });
    }
    return r.fulfill({ json: { data: [] } });
  });
  return {
    captures,
    lists,
    subLists,
    docLists,
    setFail: (v: boolean) => {
      fail = v;
    },
  };
}
async function openFile(page: Page) {
  await page.goto("/profil?tab=clients");
  await page.getByRole("button", { name: /Deschide fișa clientului/ }).click();
  const d = page.getByRole("dialog");
  await expect(
    d.getByRole("heading", { name: client.company_name, exact: true }),
  ).toBeVisible();
  return d;
}
test("creează client și cont cu schimbare obligatorie a parolei în fluxul existent", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/profil?tab=clients");
  await page
    .getByRole("button", { name: "Adaugă client", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Nume client / denumire afișată").fill("Client nou test");
  await d.getByLabel("Email de contact").fill("new@example.test");
  await d.getByLabel("Tip client", { exact: true }).selectOption("PFA");
  await expect(d.getByLabel("Opțiune cont")).toBeEnabled();
  await d.getByLabel("Opțiune cont").selectOption("new");
  await d.getByLabel("Nume utilizator").fill("new-client");
  await d
    .getByLabel("Parolă temporară", { exact: true })
    .fill("Synthetic-2026-Client!");
  await expect(
    d.getByText(/La prima autentificare, clientul trebuie să schimbe parola/),
  ).toBeVisible();
  await d.getByLabel(/Confirm identitatea persoanei/).check();
  await d
    .getByRole("button", { name: "Creează clientul", exact: true })
    .click();
  await expect.poll(() => f.captures.length).toBe(1);
  expect(f.captures[0].body).toMatchObject({
    identity: { entityType: "PFA", legalName: "Client nou test" },
    account: {
      mode: "new",
      confirmed: true,
      identity: { username: "new-client" },
    },
  });
  expect(f.captures[0].key).toBeTruthy();
});
test("nu presupune forma juridică pentru un client fără date fiscale", async ({
  page,
}) => {
  const f = await setup(page, true);
  const d = await openFile(page);
  await d.getByRole("button", { name: "Date client", exact: true }).click();
  await expect(d.getByLabel("Tip client", { exact: true })).toHaveValue("");
  await d.getByLabel("Telefon", { exact: true }).fill("0700000000");
  await d.getByRole("button", { name: "Salvează datele clientului" }).click();
  expect(f.captures).toHaveLength(0);
  await d.getByLabel("Tip client", { exact: true }).selectOption("PFA");
  await d.getByRole("button", { name: "Salvează datele clientului" }).click();
  await expect.poll(() => f.captures.length).toBe(1);
  expect(f.captures[0].body.identity).toMatchObject({ entityType: "PFA" });
});
test("fișa editează identitatea și afișează stările financiare fără a declara ciornele achitate", async ({
  page,
}) => {
  const f = await setup(page);
  const d = await openFile(page);
  await d.getByRole("button", { name: "Date client", exact: true }).click();
  await d.getByLabel("Denumire legală / nume complet").fill("Denumire nouă");
  await d.getByRole("button", { name: "Salvează datele clientului" }).click();
  await expect.poll(() => f.captures.length).toBe(1);
  expect(f.captures[0].body).toMatchObject({
    revision: 1,
    identity: { legalName: "Denumire nouă" },
  });
  await d.getByRole("button", { name: "Plăți", exact: true }).click();
  await expect(d.getByText("TEST-001", { exact: true })).toBeVisible();
  await expect(
    d.getByRole("cell", { name: "Achitată", exact: true }),
  ).toBeVisible();
  await d.getByLabel("Filtrează facturile").selectOption("draft");
  await expect(
    d.getByRole("cell", { name: "Ciornă", exact: true }),
  ).toBeVisible();
  await expect(d.getByText("TEST-001", { exact: true })).toHaveCount(0);
});
test("proiectele noi și alocările multiple păstrează contextul clientului", async ({
  page,
}) => {
  const f = await setup(page);
  const d = await openFile(page);
  await d.getByRole("button", { name: "Proiecte", exact: true }).click();
  await d.getByRole("button", { name: "Adaugă proiect nou" }).click();
  await d.getByLabel("Nume proiect", { exact: true }).fill("Aplicație nouă");
  await d.getByLabel(/Confirm beneficiarul/).check();
  await d
    .getByRole("button", { name: "Creează proiectul", exact: true })
    .click();
  await expect.poll(() => f.captures.length).toBe(1);
  expect(f.captures[0].body.client_id).toBe("ca");
  await d.getByRole("button", { name: "Alocă proiecte existente" }).click();
  await expect(d.getByLabel(/Proiect cu istoric/)).toBeDisabled();
  await d.getByLabel(/Proiect disponibil/).check();
  await d.getByLabel(/Confirm beneficiarul/).check();
  await d.getByRole("button", { name: "Alocă proiectele (1)" }).click();
  await expect.poll(() => f.captures.length).toBe(2);
  expect(f.captures[1].body).toEqual({
    projects: [{ id: "pb", sourceClientId: "cb", updatedAt: 1 }],
    confirmed: true,
  });
});
test("abonamentele se deschid cu beneficiar și date fiscale precompletate", async ({
  page,
}) => {
  const f = await setup(page);
  const d = await openFile(page);
  await d.getByRole("button", { name: "Abonamente", exact: true }).click();
  await expect(
    d.getByRole("heading", { name: "Abonamentele clientului", exact: true }),
  ).toBeVisible();
  expect(f.subLists.every((u) => u.searchParams.get("client") === "ca")).toBe(
    true,
  );
  await d
    .getByRole("button", { name: "Adaugă abonament", exact: true })
    .click();
  const form = page.getByRole("dialog").last();
  await expect(form.getByLabel("Selectează clientul")).toBeDisabled();
  await expect(form.getByLabel("Selectează clientul")).toHaveValue("ca");
  await expect(form.getByLabel("Denumire legală")).toHaveValue("Client A SRL");
});
test("documentele deschid mini-dashboard-ul local și ignoră contextul străin din URL", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto(
    "/profil?tab=clients&project=foreign&client=cb&subscription=foreign-sub&documentTemplate=foreign-template",
  );
  await page.getByRole("button", { name: /Deschide fișa clientului/ }).click();
  const d = page.getByRole("dialog");
  await d
    .getByRole("navigation", { name: "Secțiunile fișei clientului" })
    .getByRole("button", { name: "Documentele clientului" })
    .click();
  await expect(d.getByText("Ofertă client A", { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("tab")).toBe("clients");
  expect(f.docLists.at(-1)?.searchParams.get("client")).toBe("ca");
  expect(f.docLists.at(-1)?.searchParams.has("subscription")).toBe(false);
  expect(f.docLists.at(-1)?.searchParams.has("project")).toBe(false);
  await d.getByLabel("Organizare pe proiect").selectOption("pa");
  await expect
    .poll(() => f.docLists.at(-1)?.searchParams.get("project"))
    .toBe("pa");
  await d
    .getByRole("button", { name: "Creează document", exact: true })
    .click();
  await expect(d.getByLabel("Beneficiar juridic")).toHaveValue("ca");
  await expect(d.getByLabel("Beneficiar juridic")).toBeDisabled();
  await expect(d.getByLabel("Vizibilitate", { exact: true })).toBeDisabled();
});
test("căutarea și erorile pot fi recuperate fără a afișa un registru fals gol", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/profil?tab=clients");
  await page.getByLabel("Caută client", { exact: true }).fill("inexistent");
  await expect(
    page.getByText(/Niciun client pentru filtrele curente/),
  ).toBeVisible();
  expect(f.lists.at(-1)?.searchParams.get("q")).toBe("inexistent");
  f.setFail(true);
  await page.getByRole("button", { name: "Reîmprospătează clienții" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Registru indisponibil temporar",
  );
  f.setFail(false);
  await page.getByLabel("Caută client", { exact: true }).fill("");
  await expect(
    page.getByRole("button", { name: /Deschide fișa clientului/ }),
  ).toBeVisible();
});
for (const width of [320, 390, 1440])
  test(`fișă accesibilă și fără depășiri la ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    const d = await openFile(page);
    await d.getByRole("button", { name: "Date client", exact: true }).click();
    await expect(d.getByLabel("Nume client / denumire afișată")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`client-${width}.png`) });
    if (width === 1440) {
      const require = createRequire(import.meta.url);
      const axe = await import("node:fs").then((fs) =>
        fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8"),
      );
      await page.addScriptTag({ content: axe });
      const violations = await page.evaluate(async () => {
        const result = await (
          window as unknown as {
            axe: {
              run: (
                context: unknown,
                options: unknown,
              ) => Promise<{ violations: { id: string; impact: string }[] }>;
            };
          }
        ).axe.run(document.querySelector("[role=dialog]"), {});
        return result.violations.filter((v) =>
          ["critical", "serious"].includes(v.impact),
        );
      });
      expect(violations).toEqual([]);
    }
  });
