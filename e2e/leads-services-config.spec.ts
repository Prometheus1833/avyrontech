import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const manifest = JSON.parse(
  readFileSync(
    new URL("../src/shared/serviceContentManifest.json", import.meta.url),
    "utf8",
  ),
) as Record<
  string,
  { key: string; name: string; values: Record<string, string> }
>;
const stamp = Date.now();
const leads = [
  {
    id: "regular",
    name: "Contact obișnuit",
    lifecycle_stage: "new_lead",
    urgent: 0,
    created_at: stamp,
    product: "Website",
    next_follow_up_at: null,
  },
  {
    id: "priority",
    name: "Contact prioritar",
    lifecycle_stage: "new_lead",
    urgent: 1,
    created_at: stamp - 1000,
    product: "Website",
    next_follow_up_at: stamp - 86400000,
  },
  {
    id: "closed",
    name: "Contact încheiat",
    lifecycle_stage: "rejected",
    urgent: 0,
    created_at: stamp - 2000,
    product: "Website",
    next_follow_up_at: null,
  },
];
async function setup(page: Page, staff = false) {
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
  const records = new Map<
    string,
    {
      revision: number;
      values: Record<string, string>;
      published: number | null;
      versions: Map<number, Record<string, string>>;
    }
  >();
  let removed: unknown = null;
  let saved: unknown = null;
  let publicRevision = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname,
      method = route.request().method();
    if (path === "/api/auth/refresh")
      return route.fulfill({
        json: { access_token: "local-browser-fixture", expires_in: 900 },
      });
    if (path === "/api/auth/me")
      return route.fulfill({
        json: {
          user: {
            id: staff ? "staff" : "owner",
            email: staff ? "staff@example.test" : "prometheus@avyron.ro",
            email_verified: 1,
            must_change_password: 0,
            display_name: "Operator demonstrativ",
          },
          profile: { display_name: "Operator demonstrativ" },
          roles: [staff ? "staff" : "admin"],
          superadmin: !staff,
        },
      });
    if (path === "/api/leads")
      return route.fulfill({
        json: { data: leads, platformRole: staff ? null : "platform_owner" },
      });
    if (path.startsWith("/api/leads/") && method === "DELETE") {
      removed = route.request().postDataJSON();
      return route.fulfill({ json: { ok: true } });
    }
    if (path.startsWith("/api/leads/") && method === "PATCH")
      return route.fulfill({ json: { ok: true } });
    if (path.startsWith("/api/public/service-pages/")) {
      const record = records.get(path.split("/")[4]);
      return route.fulfill({
        json: {
          values: record?.published
            ? record.versions.get(record.published)
            : {},
          revision: record?.published || 0,
        },
      });
    }
    if (path.startsWith("/api/admin/service-pages/")) {
      const key = path.split("/")[4];
      let record = records.get(key);
      if (!record) {
        record = {
          revision: 0,
          values: {},
          published: null,
          versions: new Map(),
        };
        records.set(key, record);
      }
      if (path.includes("/versions/"))
        return route.fulfill({
          json: {
            values: record.versions.get(Number(path.split("/").pop())) || {},
          },
        });
      if (path.endsWith("/publish")) {
        record.published = record.revision;
        publicRevision = record.revision;
        return route.fulfill({ json: { ok: true } });
      }
      if (method === "PUT") {
        const body = route.request().postDataJSON();
        saved = body;
        record.revision++;
        record.values = body.values;
        record.versions.set(record.revision, body.values);
        return route.fulfill({ json: { revision: record.revision } });
      }
      return route.fulfill({
        json: {
          key,
          revision: record.revision,
          values: record.values,
          publishedRevision: record.published,
          updatedAt: stamp,
          canManage: !staff,
          history: [...record.versions.keys()].map((revision) => ({
            revision,
            created_at: stamp,
            actor_name: "Operator demo",
          })),
        },
      });
    }
    if (path === "/api/finance/commercial-codes")
      return route.fulfill({
        json: { data: [], references: [], services: [], products: [] },
      });
    return route.fulfill({ json: { data: [] } });
  });
  return {
    records,
    removed: () => removed,
    saved: () => saved,
    published: () => publicRevision,
  };
}
test("Leaduri: pipeline compact, priorități, etape și motive comerciale de eliminare", async ({
  page,
}, info) => {
  const state = await setup(page);
  await page.goto("/profil?tab=leads");
  const nav = page.getByRole("navigation", { name: "Navigare AVYRON OS" });
  await expect(
    nav.getByRole("tab", { name: "Leaduri", exact: true }),
  ).toBeVisible();
  await expect(nav.getByRole("tab", { name: "Leaduri & CRM" })).toHaveCount(0);
  await page.getByRole("button", { name: "Pipeline", exact: true }).click();
  const board = page.getByRole("region", { name: "Pipeline leaduri" });
  await expect(
    board
      .getByRole("region", { name: "Etapa Lead nou" })
      .locator("article")
      .first(),
  ).toContainText("Contact prioritar");
  await expect(
    board.getByText("Contact încheiat", { exact: true }),
  ).toHaveCount(0);
  await board.getByRole("button", { name: /^Respins/ }).click();
  await expect(
    board.getByText("Contact încheiat", { exact: true }),
  ).toBeVisible();
  await board.getByRole("button", { name: /^În lucru/ }).click();
  await board
    .getByRole("button", {
      name: "Elimină lead-ul: Contact prioritar",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Elimină lead-ul",
    exact: true,
  });
  for (const name of [
    "S-a răzgândit",
    "Nu dorește să plătească",
    "Nu îndeplinește condițiile",
  ])
    await expect(dialog.getByText(name, { exact: true })).toBeVisible();
  await dialog.getByText("Nu dorește să plătească", { exact: true }).click();
  await dialog.getByRole("button", { name: "Confirmă eliminarea" }).click();
  expect(state.removed()).toMatchObject({ reasonCode: "unwilling_to_pay" });
  await expect(dialog).toBeHidden();
  await page.screenshot({ path: info.outputPath("leads-pipeline.png"), fullPage: true });
});
test("Servicii deschide mini-lista și configurări individuale pentru toate paginile", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profil?tab=leads");
  await page
    .getByRole("navigation", { name: "Navigare AVYRON OS" })
    .getByRole("tab", { name: "Servicii AVYRON", exact: true })
    .click();
  const mini = page.getByRole("navigation", { name: "Mini-listă servicii" });
  await expect(mini.getByRole("button")).toHaveCount(12);
  await mini
    .getByRole("button", { name: "Blog profesional", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Servicii", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Blog profesional", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Secțiuni de configurare" })
    .getByRole("button", { name: "Prezentare principală", exact: true })
    .click();
  await expect(
    page.getByLabel("Creare Blog Profesional & Content Hub", { exact: true }),
  ).toBeVisible();
});
test("configurează o pagină, previzualizează ciorna și publică numai după confirmare", async ({
  page,
}, info) => {
  const state = await setup(page);
  await page.goto(
    "/profil?tab=servicii-avyron&service=premium-website&serviceGroup=hero",
  );
  await page
    .getByLabel("Titlu principal", { exact: true })
    .fill("Website configurat în AVYRON OS");
  await page
    .getByRole("button", { name: "Salvează ciorna", exact: true })
    .click();
  await expect
    .poll(() => state.saved())
    .toMatchObject({
      revision: 0,
      values: {
        "service.copy.ro.heroTitle": "Website configurat în AVYRON OS",
      },
    });
  expect(state.published()).toBe(0);
  await page
    .getByRole("button", { name: "Previzualizează", exact: true })
    .click();
  const preview = page.getByRole("dialog", {
    name: "Previzualizare · Site Prezentare Profesional",
  });
  const frame = page.frameLocator(
    'iframe[title="Previzualizare pagină Site Prezentare Profesional"]',
  );
  // Wait for the authenticated frame and its existing public cinematic entrance.
  await expect(frame.getByText(
    "Previzualizare privată · versiunea 1 · fără publicare automată",
    { exact: true },
  )).toBeVisible({ timeout: 15000 });
  await expect(
    frame.getByRole("heading", {
      name: "Website configurat în AVYRON OS",
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: info.outputPath("service-preview.png") });
  await preview.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "Verifică și publică", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Publică versiunea verificată",
  });
  await expect(
    dialog.getByRole("button", { name: "Confirmă publicarea" }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Confirmă publicarea" }).click();
  await expect.poll(() => state.published()).toBe(1);
  await expect(page.getByText("Publicată v1", { exact: true })).toBeVisible();
  await page.screenshot({
    path: info.outputPath("service-editor.png"),
    fullPage: true,
  });
  await page.goto("/servicii/website-prezentare-profesional");
  await expect(
    page.getByRole("heading", {
      name: "Website configurat în AVYRON OS",
      exact: true,
    }),
  ).toBeVisible({timeout:15000});
  await page.goto("/en/services/professional-presentation-website");
  await expect(
    page.getByRole("heading", {
      name: "Website configurat în AVYRON OS",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("configurarea comună modifică prezentarea din listă fără să rescrie pagina individuală", async ({
  page,
}) => {
  const state = await setup(page);
  state.records.set("overview", {
    revision: 1,
    values: { "services.0.title.ro": "Prezentare personalizată în catalog" },
    published: 1,
    versions: new Map([
      [1, { "services.0.title.ro": "Prezentare personalizată în catalog" }],
    ]),
  });
  await page.goto("/servicii");
  await expect(
    page.getByRole("heading", {
      name: "Prezentare personalizată în catalog",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/servicii/website-prezentare-profesional");
  await expect(
    page.getByRole("heading", {
      name: "Prezentare personalizată în catalog",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("staff poate consulta configurarea, fără drept de salvare sau publicare", async ({
  page,
}) => {
  await setup(page, true);
  await page.goto(
    "/profil?tab=servicii-avyron&service=online-store&serviceGroup=hero",
  );
  await expect(
    page.getByLabel("Titlu principal", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Salvează ciorna", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Verifică și publică" }),
  ).toHaveCount(0);
});
test("un conflict de salvare păstrează textul și împiedică pierderea sa la navigare", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/admin/service-pages/premium-website", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 409,
          json: {
            error: {
              code: "revision_conflict",
              message: "Pagina s-a modificat. Reîncarcă datele.",
            },
          },
        })
      : route.fallback(),
  );
  await page.goto(
    "/profil?tab=servicii-avyron&service=premium-website&serviceGroup=hero",
  );
  await page
    .getByLabel("Titlu principal", { exact: true })
    .fill("Ciornă care trebuie păstrată");
  await page
    .getByRole("navigation", { name: "Navigare AVYRON OS" })
    .getByRole("tab", { name: "Leaduri", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Pagina s-a modificat");
  await expect(page.getByLabel("Titlu principal", { exact: true })).toHaveValue(
    "Ciornă care trebuie păstrată",
  );
  await expect(page).toHaveURL(/tab=servicii-avyron/);
});
for (const width of [320, 390])
  test(`configurarea serviciului și pipeline-ul încap la ${width}px`, async ({
    page,
  }, info) => {
    await setup(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto(
      "/profil?tab=servicii-avyron&service=premium-website&serviceGroup=hero",
    );
    await expect(
      page.getByLabel("Titlu principal", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`service-mobile-${width}.png`),
      fullPage: true,
    });
    await page.goto("/profil?tab=leads");
    await page.getByRole("button", { name: "Pipeline", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Pipeline leaduri" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
  });
test("registrul include câmpuri reale și configurări distincte pentru fiecare pagină", async ({
  page,
}) => {
  test.setTimeout(90000);
  await setup(page);
  for (const item of Object.values(manifest)) {
    await page.goto(`/profil?tab=servicii-avyron&service=${item.key}`);
    await expect(
      page.getByRole("region", { name: `Configurare ${item.name}` }),
    ).toBeVisible();
    await expect(page.locator("textarea").first()).toBeVisible();
    expect(Object.keys(item.values).length).toBeGreaterThan(5);
  }
});
