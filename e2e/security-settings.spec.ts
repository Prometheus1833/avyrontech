import { test, expect } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
for (const width of [320, 1440]) {
  test(`security settings are usable at ${width}px without activating MFA`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await staffFixture(page);
    await page.route("**/api/auth/sessions", (r) =>
      r.fulfill({ json: { data: [] } }),
    );
    await page.route("**/api/auth/mfa", (r) =>
      r.fulfill({
        json: { data: [], auth_enabled: false, policy: "disabled" },
      }),
    );
    await page.route("**/api/admin/security", (r) =>
      r.fulfill({
        json: {
          mode: "off",
          configured: false,
          adminHostname: null,
          alerts: { denied24h: 0, critical24h: 0, needsReview: false },
        },
      }),
    );
    const passwords: string[] = [];
    await page.route("**/api/auth/logout-all", async (r) => {
      passwords.push(r.request().postDataJSON().currentPassword);
      await r.fulfill(
        passwords.length === 1
          ? {
              status: 403,
              json: {
                error: {
                  code: "invalid_password",
                  message: "Parolă incorectă de test.",
                },
              },
            }
          : { json: { ok: true } },
      );
    });
    await page.goto("/profil?tab=settings");
    await expect(
      page.getByText("Protecția spațiului intern", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Pregătit, neactivat", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Activează MFA" }),
    ).toHaveCount(0);
    await page
      .getByText("Deconectează toate dispozitivele", { exact: true })
      .click();
    const field = page.getByLabel("Parola curentă pentru deconectare", {
      exact: true,
    });
    const submit = page.getByRole("button", {
      name: "Confirmă deconectarea tuturor dispozitivelor",
    });
    await expect(submit).toBeDisabled();
    await field.fill("synthetic-wrong");
    await submit.click();
    await expect(page.getByText("Parolă incorectă de test.")).toBeVisible();
    await expect(field).toBeVisible();
    await field.fill("synthetic-correct");
    const box = await submit.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `test-results/security-settings-${width}.png`,
      fullPage: true,
    });
    await submit.click();
    await expect(page).toHaveURL(/\/auth$/);
    expect(passwords).toEqual(["synthetic-wrong", "synthetic-correct"]);
  });
}
test("scoped staff cannot query the owner security overview", async ({
  page,
}) => {
  await staffFixture(page, { role: "vibe_dev" });
  let calls = 0;
  await page.route("**/api/admin/security", (r) => {
    calls++;
    return r.fulfill({ status: 403, json: {} });
  });
  await page.route("**/api/auth/sessions", (r) =>
    r.fulfill({ json: { data: [] } }),
  );
  await page.route("**/api/auth/mfa", (r) =>
    r.fulfill({ json: { data: [], auth_enabled: false, policy: "disabled" } }),
  );
  await page.goto("/profil?tab=settings");
  await expect(page.getByText("Sesiuni active", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Protecția spațiului intern", { exact: true }),
  ).toHaveCount(0);
  expect(calls).toBe(0);
});
