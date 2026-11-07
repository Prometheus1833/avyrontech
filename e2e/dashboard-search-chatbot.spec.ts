import { test, expect, type Page } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
const agent = {
  id: "public-avy",
  slug: "avy",
  name: "AVY — Asistent",
  mission: "Conversații utile",
  status: "active",
  visibility: "public",
  channel: "site",
  model: "native",
  temperature: 0.4,
  max_tokens: 600,
  autonomy: "assist",
  language: "ro",
  accent: "#8855aa",
  greeting_ro: "Bună! Cu ce te pot ajuta?",
  greeting_en: "Hello!",
  system_prompt: "Instrucțiuni aprobate",
  guardrails: "Surse publice",
  tools_json: "[]",
  starter_questions_ro: "[]",
  starter_questions_en: "[]",
  proactive_prompts_ro: "[]",
  proactive_prompts_en: "[]",
  current_version: 2,
};
async function setup(page: Page, canEdit = true) {
  await staffFixture(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "avyron-os-open-groups",
      JSON.stringify({ overview: true, platform: true }),
    ),
  );
  const saves: Record<string, unknown>[] = [],
    chats: Record<string, unknown>[] = [];
  let version = 2,
    failChat = false;
  await page.route("**/api/ai/admin/agents", (r) =>
    r.fulfill({
      json: { data: [{ ...agent, current_version: version }], canEdit },
    }),
  );
  await page.route("**/api/ai/admin/runtime", (r) =>
    r.fulfill({
      json: {
        mode: "knowledge_only",
        blockers: ["provider_policy_inactive"],
        quota: { total: 500, used: 10, hardStopBeforePaid: true },
        knowledge: {
          faq: 1,
          approvedPublicDocuments: 0,
          liveProducts: 0,
          publicServices: 10,
        },
      },
    }),
  );
  await page.route("**/api/ai/admin/conversations?agent=avy", (r) =>
    r.fulfill({
      json: {
        data: [
          {
            id: "conv_a",
            agent_slug: "avy",
            language: "ro",
            messages: 2,
            page: "/",
            last_at: Date.now(),
          },
        ],
      },
    }),
  );
  await page.route("**/api/ai/admin/conversations/conv_a", (r) =>
    r.fulfill({
      json: {
        data: [
          { role: "user", content: "Mesaj sintetic", created_at: 1 },
          { role: "assistant", content: "Răspuns sintetic", created_at: 2 },
        ],
      },
    }),
  );
  await page.route("**/api/ai/admin/agents/avy", (r) => {
    saves.push(r.request().postDataJSON());
    version++;
    return r.fulfill({ json: { ok: true, version } });
  });
  await page.route("**/api/ai/chat", (r) => {
    chats.push(r.request().postDataJSON());
    return failChat
      ? r.fulfill({ status: 503, json: { error: { code: "unavailable" } } })
      : r.fulfill({
          json: {
            conversationId: "conv_test",
            reply: "Răspuns conversațional de test",
            answerSource: "unavailable",
            sources: [],
          },
        });
  });
  return {
    saves,
    chats,
    fail: () => {
      failChat = true;
    },
  };
}
for (const width of [320, 390, 1440])
  test(`căutare directă fără blocarea paginii și chatbot la ${width}px`, async ({
    page,
  }, info) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profil?tab=ai-os");
    await expect(
      page.getByRole("heading", { name: "AVY ChatBot AI", exact: true }),
    ).toBeVisible();
    const search = page.getByRole("combobox", {
      name: "Caută secțiuni și fluxuri",
    });
    await search.click();
    await search.fill("financiar");
    await expect(page.getByRole("option", { name: /Financiar/ })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const bounds = await page.getByRole("listbox").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({
      path: info.outputPath(`inline-search-${width}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(search).toBeFocused();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Configurare", exact: true })
      .click();
    await expect(page.getByLabel("Nume afișat", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`chatbot-config-${width}.png`),
      animations: "disabled",
    });
    await search.fill("site prezentare");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/service=premium-website/);
  });
test("principal, platformă și explicațiile iconurilor din bara de sus", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profil?tab=ai-os");
  const nav = page.getByRole("navigation", {
    name: "Navigare AVYRON OS",
    exact: true,
  });
  const group = (name: string) =>
    nav
      .locator("button[aria-expanded]")
      .filter({ hasText: new RegExp(`^${name}$`) })
      .locator("..");
  await expect(
    group("Principal").getByRole("button", { name: "Financiar", exact: true }),
  ).toBeVisible();
  const platform = group("Platformă");
  await expect(
    platform.getByRole("button", { name: "AVY ChatBot AI", exact: true }),
  ).toBeVisible();
  const text = await platform.innerText();
  expect(text.indexOf("AVY ChatBot AI")).toBeLessThan(text.indexOf("Recenzii"));
  await expect(
    page.getByRole("button", { name: "Întreabă AVY", exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".staff-dashboard-actions-desktop")
    .getByRole("button", { name: /Deschide mesaje/ })
    .hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Conversații cu echipa",
  );
  await page.locator('header button[title="Notificări"][aria-haspopup="dialog"]').hover();
  await expect(
    page.getByRole("tooltip", {
      name: "Notificări, anunțuri și activități de verificat",
    }),
  ).toBeVisible();
  await page.locator('header button[title="Notificări"][aria-haspopup="dialog"]').click();
  await expect(
    page.getByRole("heading", { name: "Notificările tale" }),
  ).toBeVisible();
});
test("conversație cu continuare, eroare recuperabilă și versiune aprobată explicit", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/profil?tab=ai-os");
  const input = page.getByLabel("Mesaj de test", { exact: true });
  await input.fill("Explică o idee");
  await page.getByRole("button", { name: "Trimite mesajul de test" }).click();
  await expect(
    page.getByText("Răspuns conversațional de test", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Mod generativ indisponibil", { exact: true }),
  ).toBeVisible();
  await input.fill("Și un exemplu?");
  await input.press("Enter");
  await expect.poll(() => state.chats.length).toBe(2);
  expect(state.chats[1].conversationId).toBe("conv_test");
  expect(state.chats[1].visitorId).toBe(state.chats[0].visitorId);
  await expect(
    page.getByRole("button", { name: "Conversație nouă" }),
  ).toBeEnabled();
  state.fail();
  await input.fill("Text păstrat");
  await input.press("Enter");
  await expect(input).toHaveValue("Text păstrat");
  await expect(page.getByRole("alert")).toContainText("Textul este păstrat");
  await page.getByRole("button", { name: "Configurare", exact: true }).click();
  await page.getByLabel("Nume afișat", { exact: true }).fill("AVY nou");
  const save = page.getByRole("button", {
    name: "Salvează configurația aprobată",
  });
  await expect(save).toBeDisabled();
  await page.getByRole("checkbox").check();
  await save.click();
  await expect(page.getByRole("status")).toContainText("versiunea 3");
  expect(state.saves[0]).toMatchObject({ name: "AVY nou", expectedVersion: 2 });
  await page
    .getByRole("button", { name: "Conversații recente", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Deschide conversația", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Răspuns sintetic"),
  ).toBeVisible();
});
test("configurația rămâne numai pentru citire când API nu acordă editare", async ({
  page,
}) => {
  const state = await setup(page, false);
  await page.goto("/profil?tab=ai-os");
  await page.getByRole("button", { name: "Configurare", exact: true }).click();
  await expect(page.getByLabel("Nume afișat", { exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Salvează configurația aprobată" }),
  ).toHaveCount(0);
  expect(state.saves).toHaveLength(0);
});
