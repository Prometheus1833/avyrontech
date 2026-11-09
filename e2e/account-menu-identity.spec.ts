import { expect, test } from "@playwright/test";

const cases = [
  { label: "Ana Popescu", name: "Ana Popescu", company: null, entity: "individual", email: "ana@example.test", phone: null },
  { label: "Studio Exemplu S.R.L.", name: "Client", company: "Studio Exemplu S.R.L.", entity: "srl", email: "studio@example.test", phone: null },
  { label: "Maria Ionescu PFA", name: "Client…", company: "Maria Ionescu PFA", entity: "pfa", email: "maria@example.test", phone: null },
  { label: "cont@example.test", name: "Client…", company: null, entity: "individual", email: "cont@example.test", phone: null },
  { label: "+40 712 345 678", name: "Client", company: null, entity: "individual", email: "", phone: "+40 712 345 678" },
];

for (const account of cases) test(`account menu shows only its actual identity: ${account.label}`, async ({ page }, info) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" })));
  const requests: string[] = [];
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    if (path === "/api/auth/refresh") return route.fulfill({ json: { access_token: "synthetic-client-token", expires_in: 900 } });
    if (path === "/api/auth/me") return route.fulfill({ json: {
      user: { id: "synthetic-account", display_name: null, username: null, email: account.email, email_verified: 1 },
      profile: { display_name: account.name, company_name: account.company, entity_type: account.entity, phone: account.phone, language: "ro" },
      roles: ["user"], capabilities: [], superadmin: false,
    } });
    return route.fulfill({ json: { data: [], total: 0 } });
  });
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/");
    await page.locator("header").first().getByRole("button", { name: "Profil", exact: true }).click();
    const menu = page.getByRole("menu"), identity = menu.getByTestId("account-menu-identity");
    await expect(identity).toHaveText(account.label);
    await expect(identity).toHaveAttribute("title", account.label);
    if (account.email === account.label) await expect(menu.getByText(account.email, { exact: true })).toHaveCount(1);
    await expect(menu.getByText(/^Client(?:…)?$/, { exact: true })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "Profil", exact: true })).toHaveAttribute("href", "/profil?tab=profile");
    expect(await menu.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const rect = (await menu.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    if (account.entity === "srl") await page.screenshot({ path: info.outputPath(`account-identity-${width}.png`) });
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  }
  expect(requests.some(path => /\/api\/(admin|crm|clients)(?:\/|$)/.test(path))).toBe(false);
});
