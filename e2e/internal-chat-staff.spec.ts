import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
import { STAFF_RANKS } from "../src/shared/staffAccess";

test("rangurile și gestionarea păstrează alocările și separarea drepturilor", async ({
  page,
}, info) => {
  const { captures } = await staffFixture(page);
  await page.goto("/profil?tab=team-staff");
  await expect(
    page.getByRole("heading", { name: "AVY STAFF", exact: true }),
  ).toBeVisible();
  for (const p of STAFF_RANKS)
    await expect(
      page.locator(".agency-rank").filter({ hasText: p.label }).first(),
    ).toBeVisible();
  await page
    .locator(".agency-member")
    .filter({ hasText: "Anișoara Test" })
    .getByRole("button", { name: "Gestionează" })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Rang în agenție").selectOption("senior_dev");
  await d
    .getByRole("button", { name: "Proiecte și mentenanță", exact: true })
    .click();
  await d.getByLabel("Website sintetic", { exact: true }).check();
  await d
    .getByLabel("Website sintetic · Core sintetic", { exact: true })
    .check();
  await d
    .getByLabel("Motivul alocării sau modificării")
    .fill("Alocare sintetică de verificare");
  await d
    .getByLabel(
      "Am verificat rangul, drepturile, alocările și efectul asupra sesiunilor.",
    )
    .check();
  await d
    .getByRole("button", { name: "Salvează accesurile", exact: true })
    .click();
  await expect(
    page.getByText(
      "Membrul și accesurile au fost salvate. Sesiunile sale anterioare au fost închise.",
    ),
  ).toBeVisible();
  expect(captures[0].body).toMatchObject({
    rankId: "senior_dev",
    projectIds: ["project-a"],
    subscriptionIds: ["subscription-a"],
    confirmed: true,
    revision: 1,
  });
  expect(captures[0].body.permissions).not.toContain("finance.write");
  expect(captures[0].key).toBeTruthy();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("members-desktop.png"),
    fullPage: false,
  });
});

test("cont nou folosește autentificarea existentă și profilul ales", async ({
  page,
}) => {
  const { captures } = await staffFixture(page);
  await page.goto("/profil?tab=team-staff");
  await page.getByRole("button", { name: "Cont nou", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Rang în agenție").selectOption("avy_contabil");
  await d.getByLabel("Nume afișat").fill("Contabil sintetic");
  await d.getByLabel("E-mail", { exact: true }).fill("test@example.test");
  await d.getByLabel("Username", { exact: true }).fill("test-account");
  await d
    .getByLabel("Parolă temporară", { exact: true })
    .fill("Synthetic-Fixture-2026!");
  await d
    .getByLabel("Motivul alocării sau modificării")
    .fill("Test creare cont");
  await d
    .getByLabel(
      "Am verificat rangul, drepturile, alocările și efectul asupra sesiunilor.",
    )
    .check();
  await d
    .getByRole("button", { name: "Creează contul și alocă rangul" })
    .click();
  await expect.poll(() => captures.length).toBe(1);
  expect(captures[0].path).toBe("/api/admin/users");
  expect(captures[0].body.staffAssignment?.rankId).toBe("avy_contabil");
  expect(captures[0].body.staffAssignment?.permissions).toContain(
    "finance.write",
  );
  expect(captures[0].body.staffAssignment?.permissions).not.toContain(
    "projects.read",
  );
});

test("Super Admin vede politica SC dar nu poate atribui Owner; MFA este obligatoriu", async ({
  page,
}) => {
  await staffFixture(page, { role: "superadmin", mfa: false });
  await page.goto("/profil?tab=team-staff");
  await page.getByRole("button", { name: "Cont nou", exact: true }).click();
  const d = page.getByRole("dialog");
  await expect(
    d.getByLabel("Rang în agenție").locator('option[value="platform_owner"]'),
  ).toHaveCount(0);
  await expect(
    d.getByRole("button", { name: "Creează contul și alocă rangul" }),
  ).toBeDisabled();
});

test("chat desktop: căutare, ciorne separate și Enter/Shift Enter", async ({
  page,
}, info) => {
  const { captures } = await staffFixture(page);
  await page.goto("/profil?tab=intern");
  await page.getByLabel("Caută conversație sau coleg").fill("anisoara");
  await page.getByRole("button", { name: /Anișoara Test/ }).click();
  const input = page.getByLabel("Mesaj", { exact: true });
  await input.fill("Ciornă A");
  await page.getByLabel("Caută conversație sau coleg").fill("victor");
  await page.getByRole("button", { name: "Victor Test", exact: true }).click();
  await expect(input).toHaveValue("");
  await input.fill("Ciornă B");
  await page.getByLabel("Caută conversație sau coleg").fill("anisoara");
  await page.getByRole("button", { name: /Anișoara Test/ }).click();
  await expect(input).toHaveValue("Ciornă A");
  await input.press("Shift+Enter");
  await input.type("Linia a doua");
  expect(captures).toHaveLength(0);
  await input.press("Enter");
  await expect.poll(() => captures.length).toBe(1);
  expect(captures[0].body).toMatchObject({
    recipient_id: "peer",
    content: "Ciornă A\nLinia a doua",
  });
  await expect(input).toHaveValue("");
  await page.getByLabel("Șterge căutarea", { exact: true }).click();
  await page.screenshot({
    path: info.outputPath("chat-desktop.png"),
    fullPage: false,
  });
});

test("chat mobil: listă, conversație, tastatură și fără overflow", async ({
  page,
}, info) => {
  await staffFixture(page);
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/profil?tab=intern");
    await page.getByRole("button", { name: /Anișoara Test/ }).click();
    const conversation = page.getByRole("region", {
      name: "Conversație · Anișoara Test",
    });
    await expect(conversation).toBeVisible();
    await expect(page.getByLabel("Mesaj", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`chat-mobile-${size.width}.png`),
      fullPage: false,
    });
    await page.getByRole("button", { name: "Înapoi la conversații" }).click();
    await expect(page.getByLabel("Caută conversație sau coleg")).toBeVisible();
  }
});

test("AvyContabil primește navigare financiară, fără proiecte sau marketing", async ({
  page,
}) => {
  await staffFixture(page, { role: "avy_contabil" });
  await page.goto("/profil?tab=team-staff");
  await expect(
    page.getByRole("heading", { name: "AVY STAFF", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cont nou", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Financiar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Proiecte", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Social Media Manager", exact: true }),
  ).toHaveCount(0);
});

test("răspunsul întârziat din A nu șterge ciorna din B", async ({ page }) => {
  await staffFixture(page);
  let acknowledge: () => void = () => {};
  let entered = false;
  await page.route("**/api/workspace/chat", async (r) => {
    if (r.request().method() !== "POST") return r.fallback();
    entered = true;
    await new Promise<void>((resolve) => {
      acknowledge = resolve;
    });
    return r.fulfill({ json: { id: "late" } });
  });
  await page.goto("/profil?tab=intern");
  await page.getByRole("button", { name: /Anișoara Test/ }).click();
  const input = page.getByLabel("Mesaj", { exact: true });
  await input.fill("Mesaj A");
  await page.getByRole("button", { name: "Trimite", exact: true }).click();
  await expect.poll(() => entered).toBe(true);
  await page.getByRole("button", { name: "Victor Test", exact: true }).click();
  await input.fill("Ciornă B păstrată");
  acknowledge();
  await expect(
    page.getByRole("button", { name: "Trimite", exact: true }),
  ).toBeEnabled();
  await expect(input).toHaveValue("Ciornă B păstrată");
});

test("eșecul de rețea păstrează ciorna și cheia de retry", async ({ page }) => {
  await staffFixture(page);
  const keys: string[] = [];
  await page.route("**/api/workspace/chat", async (r) => {
    if (r.request().method() !== "POST") return r.fallback();
    keys.push(r.request().headers()["idempotency-key"]);
    return r.fulfill(
      keys.length === 1
        ? { status: 503, json: { error: { message: "Indisponibil temporar" } } }
        : { json: { id: "retry" } },
    );
  });
  await page.goto("/profil?tab=intern");
  await page.getByRole("button", { name: /Anișoara Test/ }).click();
  const input = page.getByLabel("Mesaj", { exact: true });
  await input.fill("Ciornă la eroare");
  await page.getByRole("button", { name: "Trimite", exact: true }).click();
  await expect(
    page.getByText("Indisponibil temporar", { exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue("Ciornă la eroare");
  await page.getByRole("button", { name: "Trimite", exact: true }).click();
  await expect(input).toHaveValue("");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("profilul rangului se editează separat; dialogul mobil este accesibil", async ({
  page,
}, info) => {
  await staffFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profil?tab=team-staff");
  await page
    .getByRole("button", { name: "Configurează drepturile · VibeDev" })
    .click();
  const d = page.getByRole("dialog");
  await expect(d.getByText(/Membrii existenți/).first()).toBeVisible();
  await expect(d.getByLabel("Rang în agenție")).toBeDisabled();
  await d.getByLabel("Confirm setul inițial de drepturi al rangului.").check();
  await expect(
    d.getByRole("button", { name: "Salvează profilul rangului" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("member-dialog-mobile.png"),
    fullPage: false,
  });
});

test("chatul și gestionarea membrilor respectă verificările WCAG de bază", async ({
  page,
}) => {
  await staffFixture(page);
  for (const tab of ["intern", "team-staff"]) {
    await page.goto("/profil?tab=" + tab);
    await expect(
      page.locator(tab === "intern" ? ".agency-chat" : ".agency-team"),
    ).toBeVisible();
    await page.addScriptTag({
      path: createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
    });
    const check = async (selector: string) => {
      const errors = await page.evaluate(async (selector) => {
        const result = await (
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
        ).axe.run(selector, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        });
        return result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          targets: v.nodes.map((n) => n.target),
        }));
      }, selector);
      expect(errors).toEqual([]);
    };
    await check(tab === "intern" ? ".agency-chat" : ".agency-team");
    if (tab === "team-staff") {
      await page.getByRole("button", { name: "Cont nou", exact: true }).click();
      await check("[role=dialog]");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  }
});

test("AvyContabil folosește registrul financiar fără panourile de conectare a furnizorilor", async ({
  page,
}) => {
  await staffFixture(page, { role: "avy_contabil" });
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.route("**/api/finance/**", (r) => {
    const path = new URL(r.request().url()).pathname;
    const body = path.endsWith("/overview")
      ? {
          period: { from: 1, to: 2 },
          kpis: {
            expensesMinor: 0,
            revenuesMinor: 0,
            operatingProfitEstimateMinor: 0,
            activeSubscriptions: 0,
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
          notice: "Date sintetice",
        }
      : path.endsWith("/accounts")
        ? { accounts: [], methods: [] }
        : path.endsWith("/budgets")
          ? { budgets: [], quotas: [], policies: [] }
          : path.endsWith("/config")
            ? { vendors: [], clients: [], projects: [] }
            : path.endsWith("/analytics")
              ? { categories: [], projections: [], clients: [], projects: [] }
              : path.includes("/receipts")
                ? { data: [], totals: [], canWrite: true }
                : { data: [] };
    return r.fulfill({ json: body });
  });
  await page.goto("/profil?tab=finance");
  await expect(
    page.getByRole("heading", { name: "Financiar", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Costuri AI/API", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cheltuieli și limite", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cheltuială", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button",{name:"Conturi și facturare",exact:true}).click();
  const accountsPanel = page.getByRole("region", { name: "Configurare conturi financiare" });
  await expect(accountsPanel).toBeVisible();
  await expect(accountsPanel.getByRole("button", { name: /Adaugă|Configurează/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Verifică.*API/ })).toHaveCount(
    0,
  );
  expect(pageErrors).toEqual([]);
});

test("editorul de mesaje rămâne în panou pe desktop cu o listă lungă de colegi", async ({
  page,
}) => {
  await staffFixture(page);
  await page.route("**/api/workspace/chat/members", (r) =>
    r.fulfill({
      json: {
        data: Array.from({ length: 40 }, (_, i) => ({
          id: "peer-" + i,
          display_name: "Coleg sintetic " + i,
          staff_role: null,
          rank_id: "vibe_dev",
        })),
      },
    }),
  );
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/profil?tab=intern");
    await expect(
      page.getByRole("button", { name: "Coleg sintetic 39", exact: true }),
    ).toHaveCount(1);
    const shell = await page.locator(".chat-shell").boundingBox(),
      composer = await page.locator(".chat-composer").boundingBox();
    expect(shell).not.toBeNull();
    expect(composer).not.toBeNull();
    expect(composer!.y + composer!.height).toBeLessThanOrEqual(
      shell!.y + shell!.height + 1,
    );
    expect(composer!.y).toBeGreaterThan(shell!.y);
    await expect(page.getByLabel("Mesaj", { exact: true })).toBeInViewport();
    expect(
      await page.getByLabel("Mesaj", { exact: true }).evaluate((e) => {
        const r = e.getBoundingClientRect();
        return (
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e
        );
      }),
    ).toBe(true);
    await page.getByLabel("Mesaj", { exact: true }).fill("Ciornă vizibilă");
    expect(
      await page
        .locator(".chat-conversations")
        .evaluate((e) => e.scrollHeight > e.clientHeight),
    ).toBe(true);
  }
});

test("excepția MFA existentă este explicită și permite administrarea confirmată", async ({
  page,
}) => {
  await staffFixture(page, {
    role: "platform_owner",
    mfa: false,
    rollout: true,
  });
  await page.goto("/profil?tab=team-staff");
  await page
    .locator(".agency-member")
    .filter({ hasText: "Anișoara Test" })
    .getByRole("button", { name: "Gestionează" })
    .click();
  const d = page.getByRole("dialog");
  await expect(
    d.getByText(/Sesiunea curentă nu este verificată în doi pași/),
  ).toBeVisible();
  await d
    .getByLabel("Motivul alocării sau modificării")
    .fill("Alocare verificată conform politicii");
  await d
    .getByLabel(
      "Am verificat rangul, drepturile, alocările și efectul asupra sesiunilor.",
    )
    .check();
  await expect(
    d.getByRole("button", { name: "Salvează accesurile" }),
  ).toBeEnabled();
});
