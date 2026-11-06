import { expect, test, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { staffFixture } from "./staff-fixtures";
import type { AntivirusOverview } from "../src/shared/antivirus";
const overview = (configured = false): AntivirusOverview => ({
  provider: "bouncer",
  configured,
  enabled: configured,
  storageVerified: configured,
  sensitiveApproved: false,
  complianceReasons: [
    "Lipsește un DPA verificat.",
    "Transferul datelor în India nu este aprobat.",
  ],
  quota: null,
  storageBytes: 0,
  counts: {},
  jobs: [],
  legacy: [],
  legacyCount: 0,
  events: [],
});
async function fixture(page: Page, configured = false) {
  await staffFixture(page);
  const state = overview(configured),
    calls: Array<{ path: string; body: unknown; id: string | undefined }> = [];
  let fail = false;
  await page.route("**/api/antivirus**", async (route) => {
    const r = route.request(),
      u = new URL(r.url());
    if (r.method() === "GET") return route.fulfill({ json: state });
    const b = r.postDataJSON();
    calls.push({
      path: u.pathname,
      body: b,
      id: r.headers()["idempotency-key"],
    });
    if (fail)
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "provider_unavailable",
            message: "Furnizor indisponibil. Fișierul rămâne blocat.",
          },
        },
      });
    if (u.pathname.endsWith("/usage/sync"))
      state.quota = {
        period: "2026-11",
        reserved: 12,
        provider_used: 12,
        provider_limit: 500,
        checked_at: Date.now(),
      };
    if (u.pathname.endsWith("/test")) {
      state.jobs = [
        {
          id: "fixture-scan-1",
          source: "synthetic",
          status: "pending",
          size_bytes: 64,
          mime_type: "text/plain",
          sensitive: 0,
          reason: null,
          attempts: 1,
          quarantine_held: 1,
          created_at: Date.now(),
          updated_at: Date.now(),
          provider_scan_id: "scan_fixture123",
        },
      ];
      state.counts = { pending: 1 };
      state.storageBytes = 64;
      return route.fulfill({
        json: {
          scanId: "fixture-scan-1",
          status: "pending",
          provider: "bouncer",
        },
      });
    }
    if (u.pathname.endsWith("/poll")) {
      state.jobs[0].status = "clean";
      state.counts = { clean: 1 };
      return route.fulfill({
        json: { scanId: "fixture-scan-1", status: "clean" },
      });
    }
    return route.fulfill({ json: { ok: true } });
  });
  return {
    state,
    calls,
    setFail(v: boolean) {
      fail = v;
    },
  };
}
async function confirm(page: Page, title: string) {
  const d = page.getByRole("dialog", { name: title, exact: true });
  await expect(
    d.getByRole("button", { name: title, exact: true }),
  ).toBeDisabled();
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: title, exact: true }).click();
}
test("Antivirus is the final Principal entry and clearly blocks unconfigured/confidential uploads", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/profil?tab=antivirus");
  await expect(
    page.getByRole("heading", { name: "Antivirus", exact: true }),
  ).toBeVisible();
  const button = page.getByRole("button", { name: "Antivirus", exact: true });
  await expect(button).toBeVisible();
  await expect(
    page.getByText("Uploadurile reale/confidențiale sunt blocate", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Test curat", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Sincronizează cota", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("Neconfigurat", { exact: true })).toBeVisible();
  const social = page.getByRole("button", {
    name: "Manager Social Media",
    exact: true,
  });
  expect((await button.boundingBox())!.y).toBeGreaterThan(
    (await social.boundingBox())!.y,
  );
});
test("synthetic tests need confirmation and polling does not create another scan", async ({
  page,
}) => {
  const f = await fixture(page, true);
  await page.goto("/profil?tab=antivirus");
  await page
    .getByRole("button", { name: "Sincronizează cota", exact: true })
    .click();
  await confirm(page, "Sincronizează cota");
  await expect(page.getByText("12 / 500", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Test curat", exact: true }).click();
  expect(f.calls).toHaveLength(1);
  await confirm(page, "Test curat");
  await expect(page.getByText("În scanare", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Curăță carantina", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Verifică", exact: true }).click();
  await confirm(page, "Verifică verdictul");
  await expect(page.getByText("CLEAN", { exact: true })).toBeVisible();
  expect(f.calls.filter((c) => c.path.endsWith("/test"))).toHaveLength(1);
  expect(f.calls.every((c) => c.id && c.body)).toBeTruthy();
  await expect(
    page.getByRole("button", { name: /Marchează.*CLEAN|Descarcă.*carantină/i }),
  ).toHaveCount(0);
});
test("an unavailable integration keeps the dialog open and reuses the same intent key on retry", async ({
  page,
}) => {
  const f = await fixture(page, true);
  f.setFail(true);
  await page.goto("/profil?tab=antivirus");
  await page.getByRole("button", { name: "Test EICAR", exact: true }).click();
  await confirm(page, "Test EICAR");
  await expect(page.getByRole("alert")).toContainText("Furnizor indisponibil");
  const key = f.calls[0].id;
  f.setFail(false);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Test EICAR", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(f.calls[1].id).toBe(key);
  await expect(page.getByText("În scanare", { exact: true })).toBeVisible();
});
for (const width of [320, 390, 1440])
  test(`antivirus monitoring fits ${width}px with accessible controls`, async ({
    page,
  }, info) => {
    const f = await fixture(page, true);
    f.state.counts = { unknown: 1 };
    f.state.jobs = [
      {
        id: "job-with-long-opaque-identifier-0000000000001",
        source: "documents",
        status: "unknown",
        size_bytes: 4000,
        mime_type: "application/pdf",
        sensitive: 1,
        reason: "provider_unavailable",
        attempts: 1,
        quarantine_held: 1,
        created_at: Date.now(),
        updated_at: Date.now(),
        provider_scan_id: null,
      },
    ];
    f.state.legacy = [
      {
        id: "legacy-private-file-0001",
        source: "documents",
        bucket: "FILES",
        size_bytes: 4000,
      },
    ];
    f.state.legacyCount = 1;
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/profil?tab=antivirus");
    await expect(
      page.getByRole("heading", { name: "Antivirus", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Scanează", exact: true }),
    ).toBeDisabled();
    await expect(
      page
        .getByText("Fișiere blocate", { exact: true })
        .locator("..")
        .getByText("2", { exact: true }),
    ).toBeVisible();
    if (width === 1440) {
      await page.addScriptTag({
        path: createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
      });
      const violations = await page.evaluate(async () => {
        const axe = (
          window as unknown as {
            axe: {
              run: (
                root: Element,
                options: unknown,
              ) => Promise<{
                violations: Array<{
                  id: string;
                  impact: string;
                  nodes: unknown[];
                }>;
              }>;
            };
          }
        ).axe;
        const result = await axe.run(
          document.querySelector('[role="region"][aria-label="Antivirus"]')!,
          {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          },
        );
        return result.violations;
      });
      expect(violations).toEqual([]);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`antivirus-${width}.png`) });
  });
test("ordinary staff cannot discover the Antivirus section or fetch its metadata", async ({
  page,
}) => {
  await staffFixture(page, { role: "vibe_dev" });
  let calls = 0;
  await page.route("**/api/antivirus**", (r) => {
    calls++;
    return r.fulfill({ status: 403, json: { error: { code: "forbidden" } } });
  });
  await page.goto("/profil?tab=antivirus");
  await expect(
    page.getByRole("heading", { name: "Antivirus", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Antivirus", exact: true }),
  ).toHaveCount(0);
  expect(calls).toBe(0);
});
test("malformed monitoring data shows a recoverable error without crashing the dashboard", async ({
  page,
}) => {
  await staffFixture(page);
  await page.route("**/api/antivirus**", (r) =>
    r.fulfill({ json: { data: [] } }),
  );
  await page.goto("/profil?tab=antivirus");
  await expect(
    page.getByRole("heading", { name: "Antivirus", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Starea antivirus nu a putut fi citită",
  );
  await expect(
    page.getByRole("button", { name: "Actualizează", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Test curat", exact: true }),
  ).toHaveCount(0);
});
