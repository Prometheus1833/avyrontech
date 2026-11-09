import { expect, test, type Page } from "@playwright/test";
import { DOCUMENT_TEMPLATES } from "../src/shared/documents/templates";
import {
  DOCUMENT_PERMISSIONS,
  ENTITY_TYPES,
  blankPayload,
  paragraph,
} from "../src/shared/documents/model";
const context = {
  company: {
    legal_name: "DIGITAL ECOTECH SOLUTIONS S.R.L.",
    tax_id: "55055976",
    address: "Sediu configurat în profil",
    contact_email: "contact@avyron.ro",
    registration_number: null,
    representative: null,
  },
  clients: [
    {
      id: "ca",
      company_name: "Client A demonstrativ",
      legal_name: "Beneficiar A",
      email: "a@example.test",
      entity_type: "PJ",
      address: "Adresă A",
      tax_id: "SYNTHETIC-A",
      contact_name: "Contact A",
    },
    {
      id: "cb",
      company_name: "Client B demonstrativ",
      legal_name: "Beneficiar B",
      email: "b@example.test",
      entity_type: "PF",
      address: "Adresă B",
      tax_id: null,
    },
  ],
  projects: [
    {
      id: "pa",
      client_id: "ca",
      name: "Website demonstrativ",
      kind: "development",
      status: "in_progress",
    },
  ],
  services: [
    {
      id: "sa",
      project_id: "pa",
      client_id: "ca",
      catalog_code_id: "web",
      service_name: "Website Profesional",
      price: 1000,
    },
  ],
  subscriptions: [
    {
      id: "sub-a",
      client_id: "ca",
      project_id: "pa",
      service_name: "Mentenanță Website",
      status: "active",
      billing: {
        entity_type: "company",
        legal_name: "Beneficiar A",
        tax_id: "SYNTHETIC-A",
        billing_address: "Adresă A",
        invoice_email: "billing@example.test",
        payment_terms_days: 15,
      },
    },
  ],
  catalog: [
    {
      id: "web",
      entity_type: "service",
      entity_key: "website",
      display_name: "Website Profesional",
      sku: "WEB-DEMO",
      base_price_minor: 100000,
      currency: "RON",
      vat_basis_points: 0,
      tax_status: "verified",
      billing_cycle: "one_time",
      price_model: "fixed",
      category: "Website",
    },
  ],
  templates: DOCUMENT_TEMPLATES.map((t) => ({
    ...t,
    legal: Number(t.legal),
    family: t.id,
    version_id: `tv-${t.id}`,
    version: 1,
    review_status: "review_required",
    visibility: "shared",
  })),
  serviceProfiles: [],
  unreconciledServices: [],
  products: [],
  plans: [],
  purchases: [],
  entitlements: [],
  billingSubscriptions: [],
  entityTypes: ENTITY_TYPES,
};
const summary = {
  id: "doc-a",
  number: "DOC-2026-0042",
  title: "Ofertă Website · Client A",
  scope: "client",
  collection: "library",
  beneficiary_id: "ca",
  company_name: "Client A demonstrativ",
  current_version_id: "v-a",
  published_version_id: null,
  revision: 1,
  archived_at: null,
  approved: "v-a",
  updated_at: Date.now(),
  legal: 0,
  template_family: "offer",
};
const line = {
  catalogId: "web",
  label: "Website Profesional",
  sku: "WEB-DEMO",
  quantity: 1,
  catalogPriceMinor: 100000,
  offeredPriceMinor: 100000,
  discountReason: "",
  currency: "RON",
  vatBasisPoints: 0,
  taxVerified: true,
  priceConfirmed: true,
  billingCycle: "one_time",
  priceModel: "fixed",
  package: "",
};
function detail() {
  return {
    document: summary,
    version: {
      id: "v-a",
      version: 1,
      sha256: "synthetic",
      payload: {
        ...blankPayload(summary.title),
        body: {
          type: "doc",
          content: [
            paragraph(
              "Conținut sintetic pentru verificarea documentelor, a exporturilor și a condițiilor comerciale aprobate.",
            ),
          ],
        },
        lines: [line],
      },
    },
    versions: [{ id: "v-a", version: 1, approved_at: 1, created_at: 1 }],
    assignments: [],
    files: [],
    events: [],
    shares: [],
    approvals: [{ approved_by: "owner", legal_review_reference: "" }],
    grants: [],
    actions: { read: true, export: true, "billing.prepare": true },
    issues: [],
    billingPreparation: null,
  };
}
async function setup(page: Page, role: "owner" | "staff" | "client" = "owner") {
  const lists: URL[] = [];
  let created: Record<string, unknown> | null = null,
    prepared: Record<string, unknown> | null = null,
    contextFail = false;
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
      p = url.pathname,
      m = route.request().method();
    if (p === "/api/auth/refresh")
      return route.fulfill({
        json: { access_token: "synthetic-local-session", expires_in: 900 },
      });
    if (p === "/api/auth/me")
      return route.fulfill({
        json: {
          user: {
            id: role,
            email:
              role === "owner"
                ? "prometheus@avyron.ro"
                : `${role}@example.test`,
            display_name: "Operator demonstrativ",
            email_verified: 1,
            must_change_password: 0,
          },
          profile: { display_name: "Operator demonstrativ" },
          roles: [
            role === "owner" ? "admin" : role === "staff" ? "staff" : "user",
          ],
          superadmin: role === "owner",
        },
      });
    if (p === "/api/documents/bootstrap")
      return route.fulfill({
        json: {
          permissions: Object.fromEntries(
            DOCUMENT_PERMISSIONS.map((key) => [
              key,
              role === "owner" ||
                (role === "staff" &&
                  [
                    "documents.read",
                    "documents.create",
                    "documents.export",
                  ].includes(key)),
            ]),
          ),
          staff: role !== "client",
          platformRole: role === "owner" ? "platform_owner" : null,
          mfaVerified: true,
          channels: { email: false, whatsapp: "manual", telegram: "manual" },
          storage: "verified",
          backup: "configured",
          scanner: "unconfigured",
        },
      });
    if (p === "/api/documents/context")
      return contextFail
        ? route.fulfill({
            status: 503,
            json: {
              error: {
                code: "context_unavailable",
                message: "Context indisponibil temporar",
              },
            },
          })
        : route.fulfill({ json: context });
    if (p === "/api/documents/staff-guides")
      return route.fulfill({
        json: {
          data: [
            {
              id: "staff-guide",
              title: "Ghid activitate STAFF",
              subtitle: "Resursă internă",
              paragraphs: ["Instrucțiuni demonstrative pentru echipă."],
            },
          ],
        },
      });
    if (p === "/api/documents" && m === "GET") {
      lists.push(url);
      return route.fulfill({
        json: {
          data:
            url.searchParams.get("q") === "inexistent"
              ? []
              : [
                  {
                    ...summary,
                    scope: url.searchParams.get("scope") || "client",
                  },
                ],
          total: url.searchParams.get("q") === "inexistent" ? 0 : 1,
          nextOffset: null,
        },
      });
    }
    if (p === "/api/documents" && m === "POST") {
      created = route.request().postDataJSON();
      return route.fulfill({ json: { id: "doc-a", number: summary.number } });
    }
    if (p === "/api/documents/doc-a/prepare-billing") {
      prepared = route.request().postDataJSON();
      return route.fulfill({
        json: { revenue_id: "revenue-demo", status: "draft" },
      });
    }
    if (p === "/api/documents/doc-a")
      return route.fulfill({
        json: {
          ...detail(),
          ...(prepared
            ? {
                billingPreparation: {
                  revenue_id: "revenue-demo",
                  status: "draft",
                  invoice_number: null,
                },
              }
            : {}),
        },
      });
    if (p.endsWith("/export/pdf"))
      return route.fulfill({
        contentType: "application/pdf",
        body: "%PDF-1.7 synthetic browser fixture",
      });
    if (p === "/api/produse/admin/overview")
      return route.fulfill({
        json: {
          plans: [],
          items: [],
          analytics: [],
          revenue: [],
          invoices: [],
          monthlySales: [],
        },
      });
    return route.fulfill({ json: { data: [] } });
  });
  return {
    lists,
    created: () => created,
    prepared: () => prepared,
    contextFail: (value: boolean) => {
      contextFail = value;
    },
  };
}
const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Zone Document Center" });
test("separate views, compact library, contextual search and safe download", async ({
  page,
}, info) => {
  const state = await setup(page);
  await page.goto("/profil?tab=documents");
  await expect(
    page.getByRole("heading", { name: "Centru Documente", exact: true }),
  ).toBeVisible();
  await expect(nav(page).getByRole("button", { name: /^Generator/ })).toHaveAttribute("aria-current", "page");
  await expect(nav(page).locator("strong")).toHaveText(["Generator", "Tipizate", "Documente STAFF", "Documente SC", "Bibliotecă Agenție"]);
  await nav(page).getByRole("button", { name: /Bibliotecă Agenție/ }).click();
  await expect(
    nav(page).getByRole("button", { name: /Bibliotecă Agenție/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".dc-document-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Carduri documente" }).click();
  await expect(page.locator(".dc-document-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Listă compactă" }).click();
  await page.getByLabel("Caută în documentele autorizate").fill("inexistent");
  await expect(
    page.getByText("Niciun document pentru această selecție"),
  ).toBeVisible();
  expect(state.lists.at(-1)?.searchParams.get("q")).toBe("inexistent");
  await page.getByLabel("Caută în documentele autorizate").fill("");
  await page.getByText("Filtrează după context").click();
  await page.getByLabel("Tipul documentului").selectOption("offer");
  await expect
    .poll(() => state.lists.at(-1)?.searchParams.get("family"))
    .toBe("offer");
  await page.getByLabel("Clientul documentelor").selectOption("ca");
  await expect
    .poll(() => state.lists.at(-1)?.searchParams.get("client"))
    .toBe("ca");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: `Descarcă PDF · ${summary.title}` })
    .click();
  expect((await downloaded).suggestedFilename()).toBe(`${summary.number}.pdf`);
  await page.screenshot({
    path: info.outputPath("agency-desktop.png"),
    fullPage: true,
  });
  await nav(page)
    .getByRole("button", { name: /Documente SC/ })
    .click();
  await expect
    .poll(() => state.lists.at(-1)?.searchParams.get("scope"))
    .toBe("company");
  await expect(page.getByLabel("Clientul documentelor")).toHaveCount(0);
  await nav(page)
    .getByRole("button", { name: /Tipizate/ })
    .click();
  await expect(page).toHaveURL(/documentView=templates/);
  await expect(
    page.getByRole("heading", { name: "Alege modelul potrivit" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Generator de documente" }),
  ).toHaveCount(0);
  await page.getByLabel("Caută un tipizat").fill("Ofertă");
  await expect(page.locator(".dc-template-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Previzualizează", exact: true })
    .click();
  const preview = page.getByRole("dialog");
  await expect(preview.locator(".dc-document-paper")).toContainText(
    "Vă propunem",
  );
  await page.screenshot({ path: info.outputPath("template-preview.png") });
  await preview
    .getByRole("button", {
      name: "Personalizează pentru un client sau proiect",
    })
    .click();
  await expect(page).toHaveURL(/documentView=generator/);
  await expect(page).toHaveURL(/documentTemplate=tv-offer/);
  await expect(
    page.getByRole("checkbox", { name: /Ofertă comercială/ }),
  ).toBeChecked();
});
test("four-step generator prepopulates issuer, inherits project context and clears previous beneficiary edits", async ({
  page,
}, info) => {
  const state = await setup(page);
  await page.goto(
    "/profil?tab=documents&documentView=generator&documentTemplate=tv-framework&client=ca&project=pa",
  );
  await expect(page.getByLabel("Beneficiar juridic")).toHaveValue("ca");
  await expect(
    page.getByRole("checkbox", { name: "Website demonstrativ" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Continuă", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Beneficiar *", exact: true }),
  ).toHaveValue("Beneficiar A");
  await page.getByText(/Emitent AVYRON · DIGITAL/).click();
  await expect(page.getByLabel("Denumirea juridică AVYRON *")).toHaveValue(
    context.company.legal_name,
  );
  await expect(page.getByLabel("CUI AVYRON *")).toHaveValue("55055976");
  await expect(page.getByLabel("Reprezentant AVYRON")).toHaveValue("");
  await page
    .getByRole("textbox", { name: "Beneficiar *", exact: true })
    .fill("Editare exclusiv Client A");
  await page.getByRole("button", { name: "Înapoi", exact: true }).click();
  await page.getByLabel("Beneficiar juridic").selectOption("cb");
  await page.getByRole("button", { name: "Continuă", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Beneficiar *", exact: true }),
  ).toHaveValue("Beneficiar B");
  await page.getByRole("button", { name: "Continuă", exact: true }).click();
  await page.getByRole("button", { name: "Continuă", exact: true }).click();
  await page
    .getByRole("button", { name: "Creează și deschide editorul" })
    .click();
  await expect.poll(() => state.created()).not.toBeNull();
  expect(state.created()).toMatchObject({
    scope: "client",
    beneficiaryId: "cb",
    templateVersionId: "tv-framework",
    assignments: [],
  });
  const payload = (
    state.created() as { payload: { fields: Record<string, string> } }
  ).payload;
  expect(payload.fields["provider.tax_id"]).toBe("55055976");
  expect(payload.fields["beneficiary.legal_name"]).toBe("Beneficiar B");
  await expect(
    page.getByRole("button", { name: "Descarcă Word (.docx)", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("document-editor.png"),
    fullPage: true,
  });
});
test("approved document requires an explicit confirmation before financial draft preparation", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/profil?tab=documents&document=doc-a");
  await page.getByRole("button", { name: "Pregătește factura" }).click();
  const dialog = page.getByRole("dialog", { name: "Pregătire factură" });
  await expect(
    dialog.getByRole("button", { name: "Creează ciorna în Financiar" }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Creează ciorna în Financiar" })
    .click();
  await expect(dialog).toBeHidden();
  expect(state.prepared()).toMatchObject({ versionId: "v-a", confirmed: true });
  await page.getByRole("button", { name: "Ciorna de factură" }).click();
  await expect(
    page.getByRole("link", { name: "Deschide Financiar" }),
  ).toBeVisible();
});
for (const role of ["staff", "client"] as const)
  test(`${role}: company section is absent and direct section selection does not query it`, async ({
    page,
  }) => {
    const state = await setup(page, role);
    await page.goto("/profil?tab=documents&documentView=company");
    if(role==="client"){await expect(page.getByRole("heading",{name:"Documente",exact:true})).toBeVisible();await expect(nav(page)).toHaveCount(0);}else await expect(nav(page)).toBeVisible();
    await expect(
      nav(page).getByRole("button", { name: /Documente SC/ }),
    ).toHaveCount(0);
    if (role === "client") await expect.poll(() => state.lists.length).toBeGreaterThan(0);
    else await expect(page.getByRole("heading", {name:"Generator de documente"})).toBeVisible();
    expect(
      state.lists.every((url) => url.searchParams.get("scope") !== "company"),
    ).toBe(true);
    if (role === "staff") {
      await nav(page)
        .getByRole("button", { name: /Documente STAFF/ })
        .click();
      await expect(page.getByText("Ghid activitate STAFF")).toBeVisible();
    }
  });
test("context failure can be retried on the templates page", async ({
  page,
}) => {
  const state = await setup(page);
  state.contextFail(true);
  await page.goto("/profil?tab=documents&documentView=templates");
  await expect(page.getByRole("alert")).toBeVisible();
  state.contextFail(false);
  await page.getByRole("button", { name: "Reîncearcă încărcarea" }).click();
  await expect(
    page.getByRole("heading", { name: "Alege modelul potrivit" }),
  ).toBeVisible();
});
for (const width of [320, 390, 768])
  test(`responsive accessible document library and template picker at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    await page.goto("/profil?tab=documents&documentView=library");
    await expect(
      page.getByRole("region", { name: "Bibliotecă Agenție" }),
    ).toBeVisible();
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
    expect(await overflow()).toBe(false);
    await page.screenshot({
      path: info.outputPath(`agency-${width}.png`),
      fullPage: true,
    });
    await nav(page)
      .getByRole("button", { name: /Tipizate/ })
      .click();
    await expect(page.locator(".dc-template-card")).toHaveCount(11);
    expect(await overflow()).toBe(false);
    await page.screenshot({
      path: info.outputPath(`templates-${width}.png`),
      fullPage: true,
    });
    await page.getByLabel("Caută un tipizat").focus();
    await page.keyboard.type("SLA");
    await expect(page.locator(".dc-template-card")).toHaveCount(1);
  });

test("document views meet basic WCAG AA checks and artifact library is named distinctly", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profil?tab=documents&documentView=library");
  await expect(nav(page)).toBeVisible();
  const { createRequire } = await import("node:module");
  await page.addScriptTag({
    path: createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  });
  const check = async () => {
    const violations = await page.evaluate(async () => {
      const { violations } = await (
        window as unknown as {
          axe: {
            run: (
              selector: string,
              options: object,
            ) => Promise<{
              violations: {
                id: string;
                impact: string;
                nodes: { target: string[] }[];
              }[];
            }>;
          };
        }
      ).axe.run(".document-center", {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        targets: v.nodes.map((n) => n.target),
      }));
    });
    expect(violations).toEqual([]);
  };
  await check();
  await nav(page)
    .getByRole("button", { name: /Tipizate/ })
    .click();
  await expect(page.locator(".dc-template-card")).toHaveCount(11);
  await check();
  await page.goto("/profil?tab=library");
  await expect(
    page.getByRole("heading", { name: "Biblioteca Artefacte", exact: true }),
  ).toBeVisible();
});

test("company and staff libraries ignore a previous project's client context", async ({
  page,
}) => {
  const state = await setup(page);
  for (const view of ["company", "staff"]) {
    await page.goto(
      `/profil?tab=documents&documentView=${view}&project=pa&client=ca&service=sa&subscription=sub-a`,
    );
    await expect
      .poll(() => state.lists.at(-1)?.searchParams.get("scope"))
      .toBe(view);
    const query = state.lists.at(-1)!.searchParams;
    for (const field of ["client", "project", "service", "subscription"])
      expect(query.has(field)).toBe(false);
    await page
      .getByRole("button", { name: "Creează document", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Vizibilitate", exact: true }),
    ).toHaveValue(view);
    await page.getByRole("button", { name: "Continuă", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Titlu · Document nou" }),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
});

test("Documente SC afișează datele confirmate și permite completarea profilului în aceeași secțiune", async ({page},info) => {
  await setup(page); let company = {...context.company}, saved:unknown;
  await page.route('**/api/documents/context',route=>route.fulfill({json:{...context,company}}));
  await page.route('**/api/documents/settings/company',route=>{saved=route.request().postDataJSON();company={...company,...saved as typeof company};return route.fulfill({json:{ok:true}});});
  await page.goto('/profil?tab=documents&documentView=company');
  const section=page.getByRole('region',{name:'Datele societății AVYRON'}); // section is labelled and therefore a landmark
  await expect(section.getByText(context.company.legal_name,{exact:true})).toBeVisible();await expect(section.getByText('55055976',{exact:true})).toBeVisible();
  await section.getByRole('button',{name:'Completează datele firmei'}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Registrul Comerțului',{exact:true}).fill('REGISTRU-TEST');await dialog.getByLabel('Reprezentant autorizat').fill('Reprezentant confirmat');await dialog.getByRole('button',{name:'Salvează datele confirmate'}).click();
  await expect(dialog).not.toBeVisible();expect(saved).toMatchObject({tax_id:'55055976',registration_number:'REGISTRU-TEST',representative:'Reprezentant confirmat'});await expect(section.getByText('REGISTRU-TEST',{exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('company-summary.png'),animations:'disabled'});
});
for(const width of [320,1440]) test(`beneficiar direct și proiect viitor fără CRM, cu export extern la ${width}px`,async({page},info)=>{
  const state=await setup(page);await page.setViewportSize({width,height:900});
  await page.route('**/api/documents/doc-a/export/docx*',route=>route.fulfill({contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',headers:{'Content-Disposition':'attachment; filename="fixture.docx"'},body:'synthetic browser download; valid DOCX is verified in runtime tests'}));
  await page.goto('/profil?tab=documents&documentView=generator');await page.getByRole('radio',{name:'Completare directă',exact:true}).check();
  await page.getByLabel('Nume / denumire beneficiar *',{exact:true}).fill('Beneficiar viitor direct');await page.getByRole('combobox',{name:'Forma beneficiarului',exact:true}).selectOption('PF');await page.getByLabel('Adresă beneficiar',{exact:true}).fill('Adresă furnizată de beneficiar');await page.getByLabel('Denumire proiect viitor',{exact:true}).fill('Proiect încă necontractat');await page.getByLabel('Contextul proiectului viitor',{exact:true}).fill('Pregătirea unei propuneri, cu termen de stabilit.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`manual-beneficiary-${width}.png`),animations:'disabled'});
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continuă',exact:true}).click();await page.getByRole('button',{name:'Creează și deschide editorul'}).click();await expect.poll(()=>state.created()).not.toBeNull();
  const result=state.created() as {scope:string;beneficiaryId:string|null;assignments:unknown[];payload:{fields:Record<string,string>;body:unknown}};
  expect(result).toMatchObject({scope:'internal',beneficiaryId:null,assignments:[]});expect(result.payload.fields['beneficiary.legal_name']).toBe('Beneficiar viitor direct');expect(result.payload.fields['project.future_name']).toBe('Proiect încă necontractat');expect(JSON.stringify(result.payload.body)).toContain('Pregătirea unei propuneri');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Descarcă Word (.docx)',exact:true}).click();expect((await download).suggestedFilename()).toBe(`${summary.number}-v1.docx`);
});
test('beneficiarul completat direct poate fi salvat explicit în CRM cu datele sale fiscale',async({page})=>{
 await setup(page);let current={...context,clients:[...context.clients]}, saved:Record<string,unknown>|null=null;
 await page.route('**/api/documents/context',route=>route.fulfill({json:current}));
 await page.route('**/api/admin/operations/clients',route=>{saved=route.request().postDataJSON();const identity=(saved!.identity as Record<string,string>);current={...current,clients:[...current.clients,{id:'manual-crm',company_name:identity.companyName,legal_name:identity.legalName,email:identity.email,entity_type:identity.entityType,address:identity.address,tax_id:identity.taxId,contact_name:identity.contactName}]};return route.fulfill({json:{ok:true,id:'manual-crm',accountId:null}});});
 await page.goto('/profil?tab=documents&documentView=generator');await page.getByRole('radio',{name:'Completare directă',exact:true}).check();await page.getByLabel('Nume / denumire beneficiar *',{exact:true}).fill('Beneficiar de înregistrat');await page.getByRole('combobox',{name:'Forma beneficiarului',exact:true}).selectOption('PJ');await page.getByLabel('E-mail beneficiar',{exact:true}).fill('direct@example.test');await page.getByLabel('CUI / cod fiscal beneficiar',{exact:true}).fill('CUI-SINTETIC');await page.getByLabel('Număr de înregistrare beneficiar',{exact:true}).fill('REG-SINTETIC');await page.getByLabel('Adresă beneficiar',{exact:true}).fill('Adresă introdusă direct');await page.getByRole('button',{name:'Salvează beneficiarul în CRM',exact:true}).click();await expect(page.getByRole('textbox',{name:'Denumire',exact:true})).toHaveValue('Beneficiar de înregistrat');await page.getByRole('button',{name:'Creează',exact:true}).click();await expect(page.getByLabel('Beneficiar juridic')).toHaveValue('manual-crm');expect(saved).toMatchObject({identity:{entityType:'PJ',taxId:'CUI-SINTETIC',registrationNumber:'REG-SINTETIC',address:'Adresă introdusă direct'},account:{mode:'none'}});
});

for (const format of ["pdf", "docx"] as const) test(`generator saves before direct ${format} download at 320px`, async ({ page }, info) => {
  const state = await setup(page);
  await page.setViewportSize({ width: 320, height: 900 });
  const paths: string[] = [];
  await page.route(`**/api/documents/doc-a/export/${format}*`, route => {
    paths.push(route.request().url());
    return route.fulfill({ contentType: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", body: "Synthetic download; real package validation runs in the exporter tests." });
  });
  await page.goto("/profil?tab=documents&documentView=generator&documentTemplate=tv-offer&client=ca");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continuă", exact: true }).click();
  const actions = page.getByRole("region", { name: "Generator de documente" }).getByLabel("Salvare și export document");
  await expect(actions).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath(`generator-download-${format}-320.png`), animations: "disabled" });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: format === "pdf" ? "Salvează și descarcă PDF" : "Salvează și descarcă Word (.docx)", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe(`${summary.number}-v1.${format}`);
  expect(state.created()).toMatchObject({ beneficiaryId: "ca", payload: { labels: { __avyron_design: "2026" } } });
  expect(paths).toHaveLength(1);
  expect(paths[0]).toContain("version=v-a");
});

test("generator can prepare sharing but never sends an unapproved document", async ({ page }) => {
  const state = await setup(page);
  let sent = 0;
  await page.route("**/api/documents/doc-a", route => route.fulfill({ json: { ...detail(), approvals: [], actions: { read: true, export: true, share: true } } }));
  await page.route("**/api/documents/doc-a/recipients", route => route.fulfill({ json: { data: [{ id: "owner", email: "owner@example.test", display_name: "Destinatar autorizat" }] } }));
  await page.route("**/api/documents/doc-a/share", route => { sent++; return route.fulfill({ json: { status: "prepared" } }); });
  await page.goto("/profil?tab=documents&documentView=generator&documentTemplate=tv-offer&client=ca");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continuă", exact: true }).click();
  await page.getByRole("button", { name: "Salvează și pregătește distribuirea" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/documentul trebuie verificat și aprobat/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Confirmă/ })).toBeDisabled();
  expect(state.created()).not.toBeNull();
  expect(sent).toBe(0);
});
