import { test as base, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import {
  createAgencyBackend,
  closeAgencySchemas,
  type AgencyBackend,
} from "./fixtures/leadsAgencyBackend";
import { newAgencyOpportunity } from "../src/test/leads-agency-fixture";
import { DOCUMENT_TEMPLATES } from "../src/shared/documents/templates";
import {
  DOCUMENT_PERMISSIONS,
  ENTITY_TYPES,
} from "../src/shared/documents/model";
const require = createRequire(import.meta.url);
const test = base.extend<{ backend: AgencyBackend }>({
  backend: async ({ page }, runFixture) => {
    const backend = createAgencyBackend();
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
      const p = new URL(route.request().url()).pathname;
      if (p === "/api/auth/refresh")
        return route.fulfill({
          json: { access_token: "synthetic-browser-token", expires_in: 900 },
        });
      if (p === "/api/auth/me")
        return route.fulfill({
          json: {
            user: {
              id: backend.actor,
              email:
                backend.actor === "owner"
                  ? "prometheus@avyron.ro"
                  : `${backend.actor}@example.test`,
              display_name: "Operator de test",
              email_verified: 1,
              must_change_password: 0,
            },
            profile: { display_name: "Operator de test" },
            roles: [
              backend.actor === "owner"
                ? "admin"
                : backend.actor === "reader"
                  ? "staff"
                  : "user",
            ],
            capabilities:
              backend.actor === "reader" ? ["leads_agency.read"] : [],
            superadmin: backend.actor === "owner",
          },
        });
      if (p.startsWith("/api/leads-agency") || p === "/api/leads") {
        const r = await backend.request(
          new URL(route.request().url()).pathname +
            new URL(route.request().url()).search,
          {
            method: route.request().method(),
            headers: route.request().headers(),
            body: route.request().postDataBuffer() || undefined,
          },
        );
        return route.fulfill({
          status: r.status,
          headers: { "content-type": "application/json" },
          body: await r.text(),
        });
      }
      return route.fulfill({ json: { data: [] } });
    });
    try {
      await runFixture(backend);
    } finally {
      await page.unrouteAll({ behavior: "wait" });
      await page.close();
      backend.close();
    }
  },
});
test.afterAll(() => closeAgencySchemas());
async function choose(page: Page, label: string, name: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
async function seed(backend: AgencyBackend, extra = {}) {
  const r = await backend.request("/api/leads-agency/opportunities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ input: { ...newAgencyOpportunity(), ...extra } }),
  });
  expect(r.status, await r.clone().text()).toBe(201);
  return ((await r.json()) as { id: string }).id;
}
for (const width of [320, 390, 768, 1440])
  test(`free-first sources, platform sheet and accessibility at ${width}px`, async ({
    page,
    backend,
  }, info) => {
    void backend;
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profil?tab=leads-agency");
    const module = page.locator('section[aria-label="Leads Agency"]');
    await expect(
      module.getByRole("heading", { name: "Leads Agency", exact: true }),
    ).toBeVisible();
    await expect(module.getByRole("heading", { level: 3 })).toHaveText([
      "Infinum Alliance",
      "GoodFirms",
      "TechBehemoths",
      "Clutch",
      "Enterprise Europe Network",
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(`agency-overview-${width}.png`),
      animations: "disabled",
    });
    if (width === 390 || width === 1440) {
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const violations = await page.evaluate(
        async () =>
          (
            await (
              window as unknown as {
                axe: {
                  run: (
                    e: Element,
                    o: unknown,
                  ) => Promise<{ violations: unknown[] }>;
                };
              }
            ).axe.run(
              document.querySelector('section[aria-label="Leads Agency"]')!,
              {
                runOnly: {
                  type: "tag",
                  values: [
                    "wcag2a",
                    "wcag2aa",
                    "wcag21a",
                    "wcag21aa",
                    "wcag22a",
                    "wcag22aa",
                  ],
                },
              },
            )
          ).violations,
      );
      expect(violations).toEqual([]);
    }
    await module
      .getByRole("button", { name: "Deschide fișa Infinum Alliance" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Infinum Alliance", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: /Homepage/ }),
    ).toHaveAttribute("href", "https://alliance.infinum.com/partners/");
    expect(
      await dialog.evaluate((e) => e.scrollWidth - e.clientWidth),
    ).toBeLessThanOrEqual(1);
    if (width === 390 || width === 1440) {
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const violations = await page.evaluate(async () => {
        const result = await (
          window as unknown as {
            axe: {
              run: (
                e: Element,
                o: unknown,
              ) => Promise<{ violations: unknown[] }>;
            };
          }
        ).axe.run(document.querySelector('[role="dialog"]')!, {
          runOnly: {
            type: "tag",
            values: [
              "wcag2a",
              "wcag2aa",
              "wcag21a",
              "wcag21aa",
              "wcag22a",
              "wcag22aa",
            ],
          },
        });
        return result.violations;
      });
      expect(violations).toEqual([]);
    }
    await page.screenshot({
      path: info.outputPath(`agency-platform-${width}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await module
      .getByRole("tab", { name: "Comision la succes", exact: true })
      .click();
    await expect(module.getByRole("heading", { level: 3 })).toHaveText([
      "Breef",
      "Unbench",
      "INFLUR",
    ]);
    await module
      .getByRole("tab", { name: "În verificare", exact: true })
      .click();
    await expect(
      module.getByRole("heading", { name: "AgencyListed", exact: true }),
    ).toBeVisible();
  });
test("creates, reloads, edits and qualifies a real persistent native opportunity", async ({
  page,
  backend,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profil?tab=leads-agency");
  await page
    .getByRole("button", { name: "Oportunitate nouă", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Proiect / titlu", { exact: true })
    .fill("Website B2B din interfață");
  await dialog
    .getByLabel("Denumire beneficiar", { exact: true })
    .fill("Client viitor de test");
  await dialog
    .getByLabel("Referință RFP / invitație", { exact: true })
    .fill("INV-BROWSER-1");
  await dialog
    .getByLabel("Următoarea acțiune", { exact: true })
    .fill("Verificăm nevoile și propunem o discuție");
  await dialog.getByLabel("Buget minim", { exact: true }).fill("1500.25");
  await dialog.getByLabel("Buget maxim", { exact: true }).fill("2500.75");
  await dialog
    .getByRole("button", { name: "Salvează oportunitatea", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole("tab", { name: "Oportunități", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Website B2B din interfață",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Deschide oportunitatea", exact: true })
    .click();
  await choose(page, "Etapă nouă", "Calificat");
  await page
    .getByRole("button", { name: "Actualizează etapa", exact: true })
    .click();
  await expect
    .poll(
      () =>
        backend.db.prepare("SELECT stage FROM agency_opportunities").get()
          ?.stage,
    )
    .toBe("qualified");
  await page.getByRole("button", { name: "Editare", exact: true }).click();
  await page
    .getByLabel("Proiect / titlu", { exact: true })
    .fill("Website B2B actualizat");
  await page
    .getByRole("button", { name: "Salvează oportunitatea", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = backend.db
    .prepare("SELECT data_json FROM agency_opportunities")
    .get();
  const input = JSON.parse(String(row?.data_json));
  expect(input).toMatchObject({
    title: "Website B2B actualizat",
    budgetMin: 150025,
    budgetMax: 250075,
    stage: "qualified",
  });
  expect(
    backend.db.prepare("SELECT count(*) n FROM agency_opportunities").get()?.n,
  ).toBe(1);
});
test("platform notes persist and active status requires human validation", async ({
  page,
  backend,
}) => {
  await page.goto("/profil?tab=leads-agency");
  await page
    .getByRole("button", { name: "Deschide fișa TechBehemoths", exact: true })
    .click();
  await page
    .getByLabel("Note interne", { exact: true })
    .fill("Doar inbound gratuit; fără deblocări plătite.");
  await page
    .getByLabel("Următoarea verificare", { exact: true })
    .fill("2026-12-02");
  await choose(page, "Status cont", "Activ");
  await page
    .getByRole("button", { name: "Salvează fișa platformei", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Confirmă toate");
  await choose(page, "Status cont", "Înregistrare începută");
  await page
    .getByRole("button", { name: "Salvează fișa platformei", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Deschide fișa TechBehemoths", exact: true })
    .click();
  await expect(page.getByLabel("Note interne", { exact: true })).toHaveValue(
    "Doar inbound gratuit; fără deblocări plătite.",
  );
  expect(
    JSON.parse(
      String(
        backend.db
          .prepare(
            "SELECT data_json FROM agency_platform_accounts WHERE platform_id='techbehemoths'",
          )
          .get()?.data_json,
      ),
    ).nextReview,
  ).toBe("2026-12-02");
});
test("qualified handoff creates a single native lead and reports the persisted pipeline", async ({
  page,
  backend,
}) => {
  const id = await seed(backend, { stage: "qualified" });
  await page.goto(`/profil?tab=leads-agency&agencyOpportunity=${id}`);
  await page
    .getByRole("button", { name: "Transferă în Leads", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Deschide în Leads", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Deschide în Leads", exact: true }),
  ).toBeVisible();
  expect(backend.db.prepare("SELECT count(*) n FROM leads").get()?.n).toBe(1);
  await page
    .getByRole("button", { name: "Brief pentru Codex / agent", exact: true })
    .click();
  await expect(
    page.getByLabel("Brief pentru agent", { exact: true }),
  ).toContainText("Nu aplica");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descarcă brief", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(`agency-${id}.md`);
});
test("records gross income, fees and effort and calculates cash net", async ({
  page,
  backend,
}) => {
  const id = await seed(backend, {
    stage: "won",
    contractMinor: 100000,
    estimatedCostMinor: 0,
  });
  await page.goto(`/profil?tab=leads-agency&agencyOpportunity=${id}`);
  await page
    .getByRole("button", { name: "Activitate / încasări", exact: true })
    .click();
  await choose(page, "Tip înregistrare", "Încasare brută confirmată");
  await page.getByLabel("Sumă (RON)", { exact: true }).fill("1000");
  await page
    .getByLabel("Referință unică", { exact: true })
    .fill("PAY-BROWSER-1");
  await page
    .getByLabel("Detalii / dovadă consemnată", { exact: true })
    .fill("Încasare brută sintetică pentru test.");
  await page
    .getByRole("button", { name: "Consemnează înregistrarea", exact: true })
    .click();
  await expect
    .poll(
      () =>
        backend.db.prepare("SELECT count(*) n FROM agency_entries").get()?.n,
    )
    .toBe(1);
  await choose(page, "Tip înregistrare", "Comision reținut / achitat");
  await page.getByLabel("Sumă (RON)", { exact: true }).fill("100");
  await page
    .getByLabel("Referință unică", { exact: true })
    .fill("COM-BROWSER-1");
  await page
    .getByLabel("Detalii / dovadă consemnată", { exact: true })
    .fill("Comision de test, consemnat separat.");
  await page
    .getByRole("button", { name: "Consemnează înregistrarea", exact: true })
    .click();
  await expect
    .poll(
      () =>
        backend.db
          .prepare("SELECT sum(amount_minor) n FROM agency_entries")
          .get()?.n,
    )
    .toBe(110000);
  await expect(
    page.getByRole("button", {
      name: "Consemnează înregistrarea",
      exact: true,
    }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Rapoarte", exact: true }).click();
  await expect(page.getByText(/Net de numerar:/).first()).toContainText(/900/);
});
test("a normal client cannot open the module or discover its records", async ({
  page,
  backend,
}) => {
  await seed(backend);
  backend.actor = "client";
  let reads = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/leads-agency")) reads++;
  });
  await page.goto("/profil?tab=leads-agency");
  await expect(
    page.getByRole("button", { name: "Leads Agency", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('section[aria-label="Leads Agency"]')).toHaveCount(
    0,
  );
  expect(reads).toBe(0);
  const r = await backend.request("/api/leads-agency/opportunities");
  expect(r.status).toBe(403);
});
test("document generator receives future beneficiary and context without changing catalog price", async ({
  page,
  backend,
}) => {
  const id = await seed(backend, { stage: "preparing" });
  await page.route("**/api/documents/**", async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith("/bootstrap"))
      return route.fulfill({
        json: {
          permissions: Object.fromEntries(
            DOCUMENT_PERMISSIONS.map((k) => [k, true]),
          ),
          staff: true,
          platformRole: "platform_owner",
          mfaVerified: true,
          channels: { email: false, whatsapp: "manual", telegram: "manual" },
          storage: "verified",
          backup: "unconfigured",
          scanner: "unconfigured",
        },
      });
    if (p.endsWith("/context"))
      return route.fulfill({
        json: {
          company: {
            legal_name: "Emitent de test",
            tax_id: "TEST",
            address: "Adresă de test",
            contact_email: "test@example.test",
          },
          clients: [],
          projects: [],
          services: [],
          subscriptions: [],
          catalog: [],
          templates: DOCUMENT_TEMPLATES.map((t) => ({
            ...t,
            legal: Number(t.legal),
            family: t.id,
            version_id: `test-${t.id}`,
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
        },
      });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto(`/profil?tab=leads-agency&agencyOpportunity=${id}`);
  await page
    .getByRole("button", { name: "Pregătește ofertă", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`tab=documents.*agencyOpportunity=${id}`),
  );
  await expect(
    page.getByLabel("Nume / denumire beneficiar *", { exact: true }),
  ).toHaveValue("Business Test");
  await expect(
    page.getByLabel("Denumire proiect viitor", { exact: true }),
  ).toHaveValue("Website B2B de test");
  await expect(
    page.getByText("Bugetul orientativ nu este un preț ofertat", {
      exact: false,
    }),
  ).toBeVisible();
});

test("a lost save response preserves the form and retries without another opportunity", async ({
  page,
  backend,
}) => {
  const keys: string[] = [];
  await page.route("**/api/leads-agency/opportunities", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    keys.push(route.request().headers()["idempotency-key"]);
    const response = await backend.request("/api/leads-agency/opportunities", {
      method: "POST",
      headers: route.request().headers(),
      body: route.request().postDataBuffer()!,
    });
    if (keys.length === 1)
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "temporary_unavailable",
            message: "Răspunsul salvării nu a putut fi confirmat. Reîncearcă.",
          },
        },
      });
    return route.fulfill({
      status: response.status,
      body: await response.text(),
      contentType: "application/json",
    });
  });
  await page.goto("/profil?tab=leads-agency");
  await page
    .getByRole("button", { name: "Oportunitate nouă", exact: true })
    .click();
  await page
    .getByLabel("Proiect / titlu", { exact: true })
    .fill("Reîncercare sigură");
  await page
    .getByLabel("Denumire beneficiar", { exact: true })
    .fill("Beneficiar sintetic");
  await page
    .getByLabel("Referință RFP / invitație", { exact: true })
    .fill("RETRY-TEST");
  await page
    .getByLabel("Următoarea acțiune", { exact: true })
    .fill("Confirmăm cerințele beneficiarului");
  await page
    .getByRole("button", { name: "Salvează oportunitatea", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Proiect / titlu", { exact: true })).toHaveValue(
    "Reîncercare sigură",
  );
  await page
    .getByRole("button", { name: "Salvează oportunitatea", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  expect(
    backend.db.prepare("SELECT count(*) n FROM agency_opportunities").get()?.n,
  ).toBe(1);
});
