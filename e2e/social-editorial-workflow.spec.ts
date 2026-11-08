import { test, expect, type Page } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
const stamp = Date.now();
const item = {
  id: "real-material",
  format: "carousel",
  objective: "visibility",
  channels_json: '["facebook","instagram"]',
  title: "Flux coerent pentru magazinul online",
  caption:
    "Catalogul, variantele și coșul trebuie să descrie același produs. Acesta este textul exact propus pentru aprobare.",
  visual_direction: "Capturi reale și resurse interne verificate.",
  cta: "Consultă serviciul potrivit.",
  hashtags_json: '["AVYRON"]',
  status: "pending_approval",
  expires_at: stamp + 86400000,
  created_at: stamp,
  updated_at: 51,
  reusable: 1,
  source_revision: "R2",
  source_metadata_json: JSON.stringify({
    assetState: "awaiting_r2_authorization",
    pendingAssets: [{ id: "local-1" }],
    variants: [{ channel: "facebook", caption: "Variantă nativă Facebook." }],
  }),
};
const job = {
  id: "future-job",
  topic: "Website pentru o afacere locală",
  primary_channel: "facebook",
  status: "queued",
  kind: "daily_post",
  due_at: stamp + 3600000,
  updated_at: 31,
  plan_review_state: "pending",
};
async function setup(page: Page, canReview = true) {
  await staffFixture(page);
  const rows = [structuredClone(item)];
  let library = false;
  const writes: {
    path: string;
    body: Record<string, unknown>;
    key?: string;
  }[] = [];
  await page.route("**/api/ai-projects", (r) =>
    r.fulfill({
      json: {
        data: [
          { id: "aip_avyron_web", slug: "avyron-web", name: "AVYRON WEB" },
        ],
      },
    }),
  );
  await page.route("**/api/ai-projects/avyron-web/social-manager*", (r) => {
    const url = new URL(r.request().url());
    library = url.searchParams.get("view") === "library";
    const status = url.searchParams.get("status");
    const visible = rows.filter((row) => !status || row.status === status);
    return r.fulfill({
      json: {
        project: {
          id: "aip_avyron_web",
          slug: "avyron-web",
          name: "AVYRON WEB",
          automation_mode: "approval",
        },
        permission: { canReview, canCreate: true, canPlan: canReview },
        counts: {
          pending_approval: rows.filter((x) => x.status === "pending_approval")
            .length,
          approved: rows.filter((x) => x.status === "approved").length,
          draft: rows.filter((x) => x.status === "draft").length,
        },
        content: visible,
        total: visible.length,
        nextOffset: null,
        activities: library ? [] : [job],
        activityContent: [],
        scheduled: [],
        generatedAt: stamp,
        summary: { reusable: 1 },
      },
    });
  });
  await page.route("**/api/ai-projects/aip_avyron_web/content/*", (r) => {
    const body = r.request().postDataJSON();
    writes.push({ path: r.request().url(), body });
    rows[0].status = body.status;
    return r.fulfill({ json: { ok: true } });
  });
  await page.route(
    "**/api/ai-projects/aip_avyron_web/social-manager/drafts",
    (r) => {
      const body = r.request().postDataJSON();
      writes.push({
        path: r.request().url(),
        body,
        key: r.request().headers()["idempotency-key"],
      });
      rows.push({
        ...item,
        id: "manual",
        title: body.title,
        caption: body.caption,
        status: body.requestApproval ? "pending_approval" : "draft",
        updated_at: stamp,
      });
      return r.fulfill({ status: 201, json: { id: "manual" } });
    },
  );
  return { rows, writes };
}
test("agenda appears immediately and approval preserves the exact native content revision", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.goto("/profil?tab=social-manager");
  await expect(page.getByRole("heading", { name: job.topic })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Acum · 24h" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Aprobă", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: item.title });
  await expect(dialog.getByText(item.caption)).toBeVisible();
  await expect(
    dialog.getByText(/fișiere vizuale verificate rămân locale/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Confirmă aprobarea" }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Confirmă aprobarea" }).click();
  expect(writes[0].body).toEqual({ status: "approved", expectedUpdatedAt: 51 });
  await page.getByLabel("Stare editorială").selectOption("approved");
  await expect(page.getByRole("heading", { name: item.title })).toBeVisible();
});
test("a real manual material is saved directly for approval with a stable native intent", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.goto("/profil?tab=social-manager");
  await page.getByRole("button", { name: "Adaugă material" }).click();
  const dialog = page.getByRole("dialog", { name: "Material editorial nou" });
  await dialog
    .getByLabel("Titlu", { exact: true })
    .fill("Un material nou util");
  await dialog
    .getByLabel("Text / caption")
    .fill("Un text complet, adaptat proiectului și canalelor selectate.");
  await dialog
    .getByRole("button", { name: "Salvează pentru aprobare" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Un material nou util" }),
  ).toBeVisible();
  expect(writes[0]).toMatchObject({
    body: {
      title: "Un material nou util",
      requestApproval: true,
      reusable: true,
    },
  });
  expect(writes[0].key?.length).toBeGreaterThan(16);
});
test("reusing a source retries the same intent and never inherits approval", async ({
  page,
}) => {
  await setup(page);
  const keys: string[] = [];
  let calls = 0;
  await page.route(
    "**/api/ai-projects/aip_avyron_web/social-manager/drafts/real-material/reuse",
    (r) => {
      calls++;
      keys.push(r.request().headers()["idempotency-key"]);
      expect(r.request().postDataJSON()).toMatchObject({
        expectedUpdatedAt: 51,
      });
      return calls === 1
        ? r.fulfill({
            status: 503,
            json: { error: { message: "Temporar indisponibil" } },
          })
        : r.fulfill({ status: 201, json: { id: "fresh-draft" } });
    },
  );
  await page.goto("/profil?tab=social-manager");
  await page.getByRole("tab", { name: /Reutilizabile/ }).click();
  await page.getByRole("button", { name: "Reutilizează", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Reutilizează materialul" });
  await expect(dialog.getByText(/Necesită o decizie nouă/)).toBeVisible();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Confirmă comanda" }).click();
  await expect(page.getByText("Temporar indisponibil")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmă comanda" }).click();
  await expect(dialog).not.toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});
for (const width of [320, 390, 1440])
  test(`editorial dashboard and draft form fit at ${width}px`, async ({
    page,
  }, info) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profil?tab=social-manager");
    await expect(page.getByRole("heading", { name: job.topic })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`social-agenda-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Adaugă material" }).click();
    await expect(page.getByLabel("Text / caption")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`social-editor-${width}.png`),
    });
  });
test("an editor can prepare but cannot approve their own material", async ({
  page,
}) => {
  await setup(page, false);
  await page.goto("/profil?tab=social-manager");
  await expect(
    page.getByRole("button", { name: "Aprobă", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Aprobă planul", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Adaugă material" }),
  ).toBeVisible();
});
test('a Codex package wrapper opens an editable draft rather than exposing local asset paths',async({page})=>{
 await setup(page);await page.goto('/profil?tab=social-manager');await page.getByLabel('Pachet editorial JSON').setInputFiles({name:'codex-package.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({origin:'internal_generated',assetRoot:'/private/local/resources',assets:[],draft:{title:'Import din Codex',caption:'Un pachet real importat din contractul nativ.',format:'post',channels:['facebook']}}))});const dialog=page.getByRole('dialog',{name:'Material editorial nou'});await expect(dialog.getByLabel('Titlu',{exact:true})).toHaveValue('Import din Codex');await expect(dialog.getByText('/private/local/resources')).toHaveCount(0);
});
