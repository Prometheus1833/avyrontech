import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { staffFixture } from "./staff-fixtures";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
const source = {
  id: "source-a",
  slug: "source-a",
  name: "Sursă AVY demonstrativă",
  canonical_url: "https://example.test/docs",
  source_type: "documentation",
  access_mode: "public",
  pricing_model: "free",
  lifecycle_status: "active",
  verification_status: "verified",
  security_status: "reviewed",
  account_label: null,
  summary: "Documentație sintetică pentru verificare.",
  robots_reviewed: 1,
  terms_reviewed: 1,
  discovery_enabled: 1,
  private_documentation: "",
  last_observed_at: null,
  last_verified_at: null,
  next_review_at: null,
  approved_at: 1,
  updated_at: 1,
};
const asset = {
  id: "asset-a",
  scope: "agency",
  client_id: null,
  project_id: null,
  title: "Logo AVYRON sintetic",
  category: "logo",
  description: "Resursă de test",
  tags: ["logo"],
  file_name: "logo-avyron.png",
  content_type: "image/png",
  size_bytes: png.length,
  sha256: "a".repeat(64),
  scan_status: "quarantined",
  archived_at: null,
  revision: 1,
  created_by: "self",
  created_at: 1,
  updated_at: 1,
  client_name: null,
  project_name: null,
  canEdit: true,
  canInspect: true,
};
async function setup(page: Page) {
  await staffFixture(page);
  let sources = [structuredClone(source)],
    assets: Record<string, unknown>[] = [structuredClone(asset)],
    backed = false;
  const mutations: {
      path: string;
      body: Record<string, unknown>;
      key?: string;
    }[] = [],
    reads: URL[] = [];
  await page.route("**/api/operations/**", (r) =>
    r.fulfill({
      json: r.request().url().endsWith("/config")
        ? { clients: [], projects: [], staff: [], canManageIntegrations: true }
        : {
            data: [],
            total: 0,
            providers: {},
            jobs: [],
            runs: [],
            evaluations: [],
          },
    }),
  );
  await page.route("**/api/finance/**", (r) => {
    const u = new URL(r.request().url());
    let json: unknown = { data: [] };
    if (u.pathname.endsWith("/overview"))
      json = {
        period: { from: 1, to: 2 },
        kpis: {
          expensesMinor: 10000,
          revenuesMinor: 20000,
          operatingProfitEstimateMinor: 10000,
          activeSubscriptions: 1,
          aiCostMinor: 0,
          advertisingMinor: 0,
          costPerLeadMinor: null,
          invoicesPayable: 0,
          invoicesReceivable: 0,
          nextPayment: null,
          budgetLimitMinor: 0,
          budgetCount: 0,
          freeTierSavingsMinor: null,
          criticalAlerts: 0,
        },
        notice: "Estimare",
      };
    if (u.pathname.endsWith("/receipts"))
      json = { data: [], totals: [], canWrite: false };
    if (u.pathname.endsWith("/accounts")) json = { accounts: [], methods: [] };
    if (u.pathname.endsWith("/budgets"))
      json = { budgets: [], quotas: [], policies: [] };
    if (u.pathname.endsWith("/analytics"))
      json = {
        categories: [],
        projections: [],
        clients: [],
        projects: [],
        monthlyRecurringMinor: 0,
        monthlyVariableAverageMinor: 0,
        notice: "Estimări",
      };
    if (u.pathname.endsWith("/config"))
      json = { vendors: [], clients: [], projects: [] };
    return r.fulfill({ json });
  });
  await page.route("**/api/workspace/invoices**", (r) =>
    r.fulfill({ json: { data: [] } }),
  );
  await page.route("**/api/workspace/payments**", (r) =>
    r.fulfill({ json: { data: [] } }),
  );
  await page.route("**/api/billing/admin/status", (r) =>
    r.fulfill({
      json: {
        sessions: [],
        subscriptions: [],
        invoices: [],
        connections: [],
        providerPlaybooks: [],
        security: { canVerify: false, mfaVerified: false },
        providers: {},
      },
    }),
  );
  await page.route("**/api/engine/**", (r) => {
    const u = new URL(r.request().url()),
      p = u.pathname;
    if (r.request().method() !== "GET") {
      const body = r.request().postDataJSON();
      mutations.push({
        path: p,
        body,
        key: r.request().headers()["idempotency-key"],
      });
      if (p.endsWith("/sources/source-a"))
        sources = sources.map((s) => ({
          ...s,
          lifecycle_status: String(body.lifecycleStatus),
          discovery_enabled: body.discoveryEnabled ? 1 : 0,
        }));
      return r.fulfill({
        json: p.endsWith("/reconcile")
          ? { ok: true, paused: 1, externalCalls: 0 }
          : { ok: true },
      });
    }
    if (p.endsWith("/overview"))
      return r.fulfill({
        json: {
          sources: {
            total: 1,
            active: sources[0].lifecycle_status === "active" ? 1 : 0,
            reviewing: 0,
            blocked: 0,
          },
          capabilities: { total: 0, ready: 0 },
          documents: { total: 0, pending: 0 },
          suggestions: { total: 0, pending: 0 },
          bindings: { total: 0, active: 0 },
          recentDiscoveryRuns: [],
          discoveryPolicy: {
            id: "policy",
            name: "Descoperire",
            enabled: 0,
            frequency_days: 30,
            max_sources_per_run: 1,
            next_run_at: null,
            last_run_at: null,
          },
        },
      });
    if (p.endsWith("/sources/source-a"))
      return r.fulfill({
        json: {
          source: sources[0],
          capabilities: [],
          connectors: [],
          documents: [],
          history: [],
        },
      });
    return r.fulfill({ json: { data: p.endsWith("/sources") ? sources : [] } });
  });
  await page.route("**/api/visual-assets**", (r) => {
    const u = new URL(r.request().url()),
      p = u.pathname;
    reads.push(u);
    if (p.endsWith("/options"))
      return r.fulfill({
        json: {
          clients: [
            { id: "ca", company_name: "Client A" },
            { id: "cb", company_name: "Client B" },
          ],
          projects: [
            { id: "pa", client_id: "ca", name: "Website A" },
            { id: "pb", client_id: "cb", name: "Website B" },
          ],
          canManageAgency: true,
          storageReady: true,
          backupReady: true,
          scanner: "unconfigured",
        },
      });
    if (p.endsWith("/content"))
      return r.fulfill({ contentType: "image/png", body: png });
    if (r.request().method() !== "GET") {
      if (p.endsWith("/upload")) {
        const body = JSON.parse(
          decodeURIComponent(r.request().headers()["x-asset-metadata"]),
        );
        mutations.push({
          path: p,
          body,
          key: r.request().headers()["idempotency-key"],
        });
        assets.push({
          ...asset,
          ...body,
          id: "asset-upload",
          scope: body.scope,
          client_id: body.clientId,
          project_id: body.projectId,
          client_name: body.clientId === "ca" ? "Client A" : null,
          file_name: "logo-client.png",
        });
        return r.fulfill({
          status: 201,
          json: { id: "asset-upload", scanStatus: "quarantined" },
        });
      }
      const body = r.request().postDataJSON();
      mutations.push({ path: p, body });
      if (p.endsWith("/backup")) backed = true;
      if (p.endsWith("/restore")) {
        assets = assets.map(a => ({ ...a, scan_status: "quarantined" }));
        return r.fulfill({ json: { ok: true, scanStatus: "quarantined" } });
      }
      if (r.request().method() === "PATCH")
        assets = assets.map((a) =>
          p.endsWith("/" + a.id)
            ? {
                ...a,
                ...body,
                revision: Number(a.revision) + 1,
                archived_at: body.archived ? 1 : null,
              }
            : a,
        );
      return r.fulfill({ json: { ok: true, verified: true } });
    }
    if (p.endsWith("/backups"))
      return r.fulfill({
        json: {
          configured: true,
          data: backed
            ? [
                {
                  id: "backup-a",
                  sha256: asset.sha256,
                  size_bytes: png.length,
                  created_at: 1,
                },
              ]
            : [],
        },
      });
    if (p === "/api/visual-assets") {
      const filtered = assets.filter(
        (a) =>
          a.scope === u.searchParams.get("scope") &&
          !!a.archived_at === (u.searchParams.get("archived") === "1") &&
          (!u.searchParams.get("client") ||
            a.client_id === u.searchParams.get("client")) &&
          (!u.searchParams.get("q") ||
            String(a.title)
              .toLowerCase()
              .includes(u.searchParams.get("q")!.toLowerCase())),
      );
      return r.fulfill({
        json: { data: filtered, total: filtered.length, offset: 0, limit: 36 },
      });
    }
    return r.fulfill({ json: { write: true } });
  });
  return { mutations, reads, markClean(){assets[0].scan_status="clean";} };
}
test("navigația are AVY Engine, Cariere și Biblioteca în OS, Altele la final", async ({
  page,
}) => {
    // Persistent sidebar/two-pane contract; responsive counterparts set narrow viewports.
    await page.setViewportSize({width:1440,height:960});
  await setup(page);
  await page.goto("/profil?tab=profile");
  const nav = page.getByRole("navigation", {
    name: "Navigare AVYRON OS",
    exact: true,
  });
  await expect(
    nav.getByRole("button", { name: "Control platformă", exact: true }),
  ).toHaveCount(0);
  await expect(
    nav.getByRole("button", { name: "AVY Engine", exact: true }),
  ).toBeVisible();
  const order = await nav.getByRole("button").allTextContents();
  expect(order.findIndex((t) => t.trim() === "Domenii") + 1).toBe(
    order.findIndex((t) => t.trim() === "Surveys"),
  );
  expect(order.findIndex((t) => t.trim() === "Configurator") + 1).toBe(
    order.findIndex((t) => t.trim() === "Carusele Exemple"),
  );
  const os=nav.locator('button[aria-expanded]').filter({hasText:/^AVYRON OS$/}).locator('..');
  for(const label of ['AVY Engine','Cariere','Biblioteca Artefacte','Antivirus'])await expect(os.getByRole('button',{name:label,exact:true})).toBeVisible();
  expect(order.findIndex((t) => t.trim() === "Cariere") + 1).toBe(
    order.findIndex((t) => t.trim() === "Biblioteca Artefacte"),
  );
  expect(order.at(-1)?.trim()).toBe("Altele");
  await expect(
    page.getByText(
      "Registru de capabilități, surse, conectori și documentație privată.",
    ),
  ).toHaveCount(0);
});
test("Centre OS caută destinații și navighează contextual fără inventarul duplicat", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profil?tab=os-centers");
  await expect(
    page.getByRole("heading", { name: "Centre AVYRON OS", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Acces rapid Centre AVYRON OS" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Caută un flux sau o secțiune", { exact: true })
    .fill("documente");
  await expect(
    page.getByRole("heading", { name: "Centru Documente", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generează document", exact: true })
    .click();
  await expect(page).toHaveURL(/tab=documents/);
  await expect(page).toHaveURL(/documentView=generator/);
});
test("Control platformă vechi redirecționează spre centrul unic", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profil?tab=platform-control");
  await expect(
    page.getByRole("heading", { name: "Centre AVYRON OS", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Control platformă", exact: true }),
  ).toHaveCount(0);
});
test("Financiar consolidează zece instrumente în cinci grupe și păstrează URL-ul instrumentului", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profil?tab=finance");
  const nav = page.getByRole("navigation", { name: "Secțiuni financiare" });
  await expect(nav.getByRole("button")).toHaveCount(5);
  await expect(
    page.getByRole("heading", { name: "Încasări și facturare", exact: true }),
  ).toHaveCount(0);
  await nav
    .getByRole("button", { name: "Cheltuieli și limite", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Instrumente financiare" })
    .getByRole("button", { name: "Bugete", exact: true })
    .click();
  await expect(page).toHaveURL(/view=budgets/);
  await page.reload();
  await expect(
    page
      .getByRole("navigation", { name: "Instrumente financiare" })
      .getByRole("button", { name: "Bugete", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await nav
    .getByRole("button", { name: "Venituri și încasări", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Încasări și plăți", exact: true })
    .click();
  await expect(page).toHaveURL(/view=receipts/);
});
test("AVY Engine editează starea și sincronizează numai după confirmare", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/profil?tab=avy-engine");
  await expect(
    page.getByRole("heading", { name: "AVY Engine", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Sursă AVY demonstrativă/ }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Stare", { exact: true }).selectOption("paused");
  await d.getByRole("button", { name: "Salvează", exact: true }).click();
  await expect.poll(() => f.mutations.length).toBe(1);
  expect(f.mutations[0].body).toMatchObject({
    lifecycleStatus: "paused",
    discoveryEnabled: false,
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Sincronizează fluxurile", exact: true })
    .click();
  expect(f.mutations).toHaveLength(1);
  await page
    .getByRole("button", { name: "Confirmă sincronizarea internă" })
    .click();
  await expect.poll(() => f.mutations.length).toBe(2);
  expect(f.mutations[1]).toMatchObject({
    path: "/api/engine/bindings/reconcile",
    body: { confirmed: true },
  });
  await expect(
    page.getByText("1 legături incompatibile puse în pauză."),
  ).toBeVisible();
});
test("Media încarcă în biblioteca clientului, editează și arhivează fără ștergere", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/profil?tab=media");
  await page
    .getByRole("button", { name: "Resurse clienți", exact: true })
    .click();
  await page.getByLabel("Client Media", { exact: true }).selectOption("ca");
  await page
    .getByRole("button", { name: "Încarcă resursă", exact: true })
    .click();
  let d = page.getByRole("dialog");
  await expect(d.getByLabel("Beneficiar resursă")).toHaveValue("ca");
  await d.getByLabel("Fișier vizual").setInputFiles({
    name: "logo-client.png",
    mimeType: "image/png",
    buffer: png,
  });
  await d.getByLabel("Nume resursă").fill("Identitate client A");
  await d
    .getByLabel("Etichete, separate prin virgulă")
    .fill("logo, identitate");
  await d.getByLabel(/Am verificat biblioteca/).check();
  await d
    .getByRole("button", { name: "Încarcă în biblioteca privată" })
    .click();
  await expect.poll(() => f.mutations.length).toBe(1);
  expect(f.mutations[0].body).toMatchObject({
    scope: "client",
    clientId: "ca",
    projectId: null,
    tags: ["logo", "identitate"],
  });
  expect(f.mutations[0].key).toBeTruthy();
  await expect(
    page.getByRole("heading", { name: "Identitate client A", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Deschide resursa" }).click();
  d = page.getByRole("dialog");
  await d.getByLabel("Nume resursă").fill("Logo final client A");
  await d.getByRole("button", { name: "Salvează detaliile resursei" }).click();
  await expect(
    page.getByRole("heading", { name: "Logo final client A", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Deschide resursa" }).click();
  await page.getByRole("button", { name: "Arhivează resursa" }).click();
  await expect(
    page.getByRole("button", { name: "Deschide resursa" }),
  ).toHaveCount(0);
  await page.getByLabel("Arhivă", { exact: true }).check();
  await expect(
    page.getByRole("heading", { name: "Logo final client A", exact: true }),
  ).toBeVisible();
});
test("Media descarcă numai fișiere CLEAN și oferă backup verificat", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/profil?tab=media");
  await page.getByRole("button", { name: "Deschide resursa" }).click();
  const quarantined=page.getByRole("dialog");
  await expect(quarantined.getByRole("button",{name:"Previzualizează imaginea"})).toHaveCount(0);
  await expect(quarantined.getByRole("button",{name:/Descarcă/})).toHaveCount(0);
  await page.keyboard.press("Escape");
  f.markClean();await page.reload();
  await page.getByRole("button", { name: "Deschide resursa" }).click();
  const d = page.getByRole("dialog");
  await d.getByRole("button", { name: "Previzualizează imaginea" }).click();
  await expect(d.getByRole("img", { name: asset.title })).toBeVisible();
  page.on("dialog", (d) => d.accept());
  const download = page.waitForEvent("download");
  await d.getByRole("button", { name: "Descarcă fișierul verificat" }).click();
  expect((await download).suggestedFilename()).toBe(asset.file_name);
  await d.getByText("Backup și restaurare", { exact: true }).click();
  await d.getByRole("button", { name: "Creează backup verificat" }).click();
  await expect(
    d.getByRole("button", { name: "Restaurează fișierul" }),
  ).toBeVisible();
  expect(f.mutations.at(-1)).toMatchObject({
    path: "/api/visual-assets/asset-a/backup",
    body: { confirmed: true },
  });
  expect(
    f.reads
      .filter((u) => u.pathname.endsWith("/content"))
      .every((u) => !u.searchParams.has("inspect")),
  ).toBe(true);
  await d.getByRole("button", { name: "Restaurează fișierul" }).click();
  await expect(d).not.toBeVisible();
  await page.getByRole("button", { name: "Deschide resursa" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: /Descarcă|Previzualizează imaginea/ })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("Fișier în carantină");
});
for (const width of [304, 320, 390, 1440])
  test(`Financiar, Centre, Media și scrolluri uniforme la ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    for (const section of ["finance", "os-centers", "avy-engine", "media"]) {
      await page.goto("/profil?tab=" + section);
      await expect(page.locator("html")).toHaveAttribute(
        "data-avyron-os",
        "true",
      );
      await expect(
        page.getByRole("heading", {
          name:
            section === "finance"
              ? "Financiar"
              : section === "os-centers"
                ? "Centre AVYRON OS"
                : section === "avy-engine"
                  ? "AVY Engine"
                  : "Media",
          exact: true,
        }),
      ).toBeVisible();
      const layout = await page.evaluate(() => ({
        viewport: innerWidth,
        width: document.documentElement.scrollWidth,
        outliers: [...document.querySelectorAll("main *")]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 12)
          .map((e) => ({
            tag: e.tagName,
            css: e.className,
            right: e.getBoundingClientRect().right,
            text: e.textContent?.slice(0, 70),
          })),
      }));
      expect(
        layout.width,
        `${section}: ${JSON.stringify(layout)}`,
      ).toBeLessThanOrEqual(layout.viewport);
      const thumb = await page.evaluate(() => {
        const css = getComputedStyle(
          document.documentElement,
          "::-webkit-scrollbar-thumb",
        );
        return { image: css.backgroundImage, shadow: css.boxShadow };
      });
      expect(thumb).toEqual({ image: "none", shadow: "none" });
      await page.screenshot({
        path: info.outputPath(`${section}-${width}.png`),
      });
    }
    if (width === 1440) {
      const require = createRequire(import.meta.url),
        fs = await import("node:fs");
      await page.addScriptTag({
        content: fs.readFileSync(
          require.resolve("axe-core/axe.min.js"),
          "utf8",
        ),
      });
      const violations = await page.evaluate(async () => {
        const result = await (
          window as unknown as {
            axe: {
              run: (
                c: unknown,
                o: unknown,
              ) => Promise<{ violations: { id: string; impact: string }[] }>;
            };
          }
        ).axe.run(document.querySelector("main[data-avyron-os]"), {});
        return result.violations.filter((v) =>
          ["critical", "serious"].includes(v.impact),
        );
      });
      expect(violations).toEqual([]);
    }
  });
test("bara de scroll a site-ului public păstrează stilul existent", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/intern/servicii");
  await expect(page.getByRole("heading", {name:"Servicii",exact:true})).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-avyron-os","true");
  await page.goto("/finance");
  await expect(page.getByRole("heading", {name:"Financiar",exact:true})).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-avyron-os","true");
  await page.goto("/profil?tab=media");
  await expect(page.locator("html")).toHaveAttribute("data-avyron-os", "true");
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-avyron-os",
    "true",
  );
});
