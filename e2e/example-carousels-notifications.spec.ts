import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { staffFixture } from "./staff-fixtures";
import { SERVICE_PAGES } from "../src/shared/servicePagePolicy";
import type {
  CarouselConfig,
  CarouselDetails,
  ExampleState,
} from "../src/shared/exampleCarousels";
const defaults = JSON.parse(
  readFileSync("src/shared/exampleCarouselDefaults.json", "utf8"),
) as CarouselConfig;
const root = "/api/admin/example-carousels";
async function fixture(page: Page, readOnly = false) {
  await staffFixture(page);
  const configs = new Map<string, CarouselDetails>(),
    calls: Array<{ path: string; body: unknown; id: string | null }> = [];
  let fail = false;
  const details = (key: string) => {
    if (!configs.has(key))
      configs.set(key, {
        key,
        revision: 0,
        state: "draft",
        config: {
          ...structuredClone(defaults),
          items:
            key === "premium-website" ? structuredClone(defaults.items) : [],
        },
        publishedRevision: null,
        published: key === "premium-website" ? structuredClone(defaults) : null,
        permissions: {
          edit: !readOnly,
          approve: !readOnly,
          publish: !readOnly,
        },
        history: [],
      });
    return configs.get(key)!;
  };
  await page.route("**/api/admin/example-carousels**", async (r) => {
    const p = new URL(r.request().url()).pathname,
      parts = p.split("/"),
      key = parts[4],
      action = parts[5],
      method = r.request().method();
    if (p === root)
      return r.fulfill({
        json: {
          data: SERVICE_PAGES.filter(
            (p) => !["overview", "audit"].includes(p.key),
          ).map((p) => ({
            ...p,
            revision: details(p.key).revision,
            review_state: details(p.key).state,
            published_revision: details(p.key).publishedRevision,
            builtin: p.key === "premium-website",
          })),
        },
      });
    const d = details(key);
    if (method === "GET")
      return r.fulfill({
        json: action === "versions" ? { config: structuredClone(defaults) } : d,
      });
    const b = r.request().postDataJSON();
    calls.push({
      path: p,
      body: b,
      id: r.request().headers()["idempotency-key"] || null,
    });
    if (fail)
      return r.fulfill({
        status: 409,
        json: { error: { code: "revision_conflict" } },
      });
    if (method === "PUT") {
      d.revision++;
      d.config = b.config;
      d.state = "draft";
      d.history.unshift({
        revision: d.revision,
        created_at: Date.now(),
        actor_name: "Owner sintetic",
      });
      return r.fulfill({ json: { revision: d.revision } });
    }
    d.state = (
      {
        submit: "in_review",
        approve: "approved",
        reject: "rejected",
        publish: "published",
      } as Record<string, ExampleState>
    )[action];
    if (action === "publish") {
      d.publishedRevision = d.revision;
      d.published = {
        ...structuredClone(d.config),
        items: d.config.enabled
          ? d.config.items.filter((i) => i.visibility === "visible")
          : [],
      };
    }
    return r.fulfill({
      json: { ok: true, revision: d.revision, state: d.state },
    });
  });
  await page.route("**/api/public/example-carousels/*", (r) =>
    r.fulfill({
      json: {
        config: details(new URL(r.request().url()).pathname.split("/").at(-1)!)
          .published,
      },
    }),
  );
  return {
    calls,
    details,
    setFail: (v: boolean) => {
      fail = v;
    },
  };
}
async function confirm(page: Page, title: string) {
  const d = page.getByRole("dialog", { name: title, exact: true });
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: title, exact: true }).click();
  await expect(d).not.toBeVisible();
}
async function publish(page: Page) {
  await page
    .getByRole("button", { name: "Trimite la verificare", exact: true })
    .click();
  await confirm(page, "Trimite la verificare");
  await page.getByRole("button", { name: "Aprobă", exact: true }).click();
  await confirm(page, "Aprobă versiunea");
  await page
    .getByRole("button", { name: "Publică pe site", exact: true })
    .click();
  await confirm(page, "Publică pe site");
}

test("Platformă opens the carousel registry and preserves the original website examples", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/profil?tab=example-carousels");
  await expect(
    page.getByRole("heading", { level: 1, name: "Carusele Exemple" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Carusele Exemple", exact: true }),
  ).toBeVisible();
  const row = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Site Prezentare Profesional",
      exact: true,
    }),
  });
  await row.getByRole("button", { name: "Configurează" }).click();
  await expect(
    page.getByRole("heading", { name: "Cutiutamagica.eu", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[aria-label="Pipeline carusel"]')).toBeVisible();
});
test("editing hiding ordering and deleting stay in draft until explicit review approval and publication", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/profil?tab=example-carousels&carousel=premium-website");
  await page
    .getByRole("button", { name: "Editează Cutiutamagica.eu", exact: true })
    .click();
  const d = page.getByRole("dialog", { name: "Editează exemplul" });
  await d.getByLabel("Denumire", { exact: true }).fill("Website actualizat");
  await d.getByRole("button", { name: "Aplică în ciornă" }).click();
  await page
    .locator("article")
    .filter({
      has: page.getByRole("heading", { name: "Ruller.eu", exact: true }),
    })
    .getByRole("button", { name: "Ascunde", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Șterge Clarlumanari.ro", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Șterge din ciornă" })
    .click();
  await page
    .getByRole("button", {
      name: "Mută Website actualizat mai jos",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Salvează ciorna" }).click();
  await expect(page.getByText("Ciornă v1", { exact: false })).toBeVisible();
  expect(f.details("premium-website").published!.items).toHaveLength(18);
  await publish(page);
  expect(f.calls.filter((c) => c.path.endsWith("/publish"))).toHaveLength(1);
  expect(f.calls.every((c) => !!c.id)).toBe(true);
  await page.goto("/servicii/website-prezentare-profesional");
  await expect(
    page
      .getByTestId("portfolio-carousel")
      .getByText("Website actualizat")
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("portfolio-carousel")
      .getByText("Ruller.eu", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByTestId("portfolio-carousel")
      .getByText("Clarlumanari.ro", { exact: true }),
  ).toHaveCount(0);
});
test("future service carousels can add examples and settings without changing the website carousel", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/profil?tab=example-carousels&carousel=seo-ai");
  await page.getByRole("button", { name: "Adaugă exemplu" }).click();
  const d = page.getByRole("dialog", { name: "Adaugă exemplu" });
  await d.getByLabel("Denumire", { exact: true }).fill("Proiect SEO");
  await d
    .getByLabel("Link public", { exact: true })
    .fill("https://example.com/seo");
  await d
    .getByLabel("Descriere", { exact: true })
    .fill("Rezultatul și contextul unui proiect demonstrativ.");
  await d.getByRole("button", { name: "Aplică în ciornă" }).click();
  await page
    .getByRole("button", { name: "Setări carusel", exact: true })
    .click();
  await page.getByLabel("Derulare automată", { exact: true }).uncheck();
  await page.getByLabel("Viteză (pixeli/secundă)", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Salvează ciorna" }).click();
  await expect(page.getByText("Ciornă v1", { exact: false })).toBeVisible();
  await publish(page);
  expect(f.details("premium-website").revision).toBe(0);
  await page.goto("/servicii/seo-ai-visibility-performance");
  await expect(
    page
      .getByTestId("portfolio-carousel")
      .getByText("Proiect SEO", { exact: true }),
  ).toBeVisible();
  // Cards must remain legible inside service pages with their own dark palette.
  const contrast = await page
    .getByTestId("portfolio-carousel")
    .getByRole("heading", { name: "Proiect SEO" })
    .evaluate((title) => {
      const luminance = (color: string) => {
        const channels = (color.match(/[\d.]+/g) || []).slice(0, 3).map((v) => {
          const c = Number(v) / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      };
      const fg = luminance(getComputedStyle(title).color);
      const bg = luminance(
        getComputedStyle(title.closest("a")!).backgroundColor,
      );
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
test("read-only staff cannot mutate and a failed save preserves changes during navigation", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/profil?tab=example-carousels&carousel=premium-website");
  await page.getByRole("button", { name: "Editează Ruller.eu" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Denumire", { exact: true }).fill("Ciornă păstrată");
  await d.getByRole("button", { name: "Aplică în ciornă" }).click();
  f.setFail(true);
  await page.getByRole("button", { name: "Salvează ciorna" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Modificările tale sunt păstrate",
  );
  await page.getByRole("button", { name: "Financiar", exact: true }).click();
  await expect(page).toHaveURL(/tab=example-carousels/);
  await expect(
    page.getByRole("heading", { name: "Ciornă păstrată", exact: true }),
  ).toBeVisible();
  f.setFail(false);
  await page.getByRole("button", { name: "Salvează ciorna" }).click();
  await expect(page.getByText("Ciornă v1", { exact: false })).toBeVisible();
});
test("viewers see configuration without edit approval or publication controls", async ({
  page,
}) => {
  await fixture(page, true);
  await page.goto("/profil?tab=example-carousels&carousel=premium-website");
  await expect(
    page.getByRole("heading", { name: "Cutiutamagica.eu", exact: true }),
  ).toBeVisible();
  for (const name of [
    "Salvează ciorna",
    "Adaugă exemplu",
    "Aprobă",
    "Publică pe site",
  ])
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
});
for (const width of [320, 390, 1440])
  test(`carousel editor and notifications remain accessible and anchored at ${width}px`, async ({
    page,
  }, info) => {
    await fixture(page);
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/operations/notifications", (r) =>
      r.fulfill({
        json: {
          data: [
            {
              id: "n1",
              title: "Carusel de verificat",
              body: "O versiune nouă este pregătită.",
              destination: "example-carousels",
              read_at: null,
              created_at: Date.now(),
            },
          ],
        },
      }),
    );
    await page.goto("/profil?tab=example-carousels&carousel=premium-website");
    await expect(
      page.getByRole("heading", { name: "Cutiutamagica.eu", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const trigger = page.getByRole("button", { name: /^Notificări/ });
    const before = await trigger.boundingBox();
    await trigger.click();
    const panel = page.getByRole("dialog", { name: "Notificări și anunțuri" });
    await expect(panel.getByText("Carusel de verificat")).toBeVisible();
    const bounds = await panel.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(before!.y + before!.height - 1);
    expect(bounds!.x).toBeGreaterThanOrEqual(7);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 7);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(837);
    expect(
      await page.evaluate(() => document.body.style.pointerEvents),
    ).not.toBe("none");
    await page.screenshot({
      path: info.outputPath(`notifications-${width}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    // Click page content at the left edge, away from the native scrollbar.
    await page.mouse.click(2, bounds!.y + 20);
    await expect(panel).not.toBeVisible();
  });
test("a managed role without examples permission cannot open the section or request its data", async ({
  page,
}) => {
  await staffFixture(page, { role: "vibe_dev" });
  let calls = 0;
  await page.route("**/api/admin/example-carousels**", (r) => {
    calls++;
    return r.fulfill({ status: 403, json: { error: { code: "forbidden" } } });
  });
  await page.goto("/profil?tab=example-carousels");
  await expect(
    page.getByRole("button", { name: "Carusele Exemple", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Carusele Exemple" }),
  ).toHaveCount(0);
  expect(calls).toBe(0);
});
