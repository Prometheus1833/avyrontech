import { expect, test } from "@playwright/test";

test("invoice provider navigation never receives the AVYRON bearer or referrer", async ({
  page,
  context,
}) => {
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
  const invoice = "https://www.oblio.eu/facturi/synthetic-audit.pdf";
  let providerHeaders: Record<string, string> | undefined;
  await context.route(invoice, async (route) => {
    providerHeaders = await route.request().allHeaders();
    return route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: '<!doctype html><html lang="ro"><meta charset="utf-8"><title>Factură test</title><h1>Factură sintetică</h1></html>',
    });
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/refresh")
      return route.fulfill({
        json: {
          access_token: "synthetic-private-audit-token",
          expires_in: 900,
        },
      });
    if (path === "/api/auth/me")
      return route.fulfill({
        json: {
          user: {
            id: "audit-client",
            email: "audit@example.test",
            email_verified: 1,
            must_change_password: 0,
          },
          profile: { display_name: "Client audit", theme: "dark" },
          roles: ["user"],
          capabilities: [],
          superadmin: false,
        },
      });
    if (path === "/api/billing/payment-methods")
      return route.fulfill({json:{methods:[],refreshed:{stripe:false,revolut:false}}});
    if (path === "/api/billing/account")
      return route.fulfill({
        json: {
          profile: null,
          methods: [],
          subscriptions: [],
          revolutPlans: [],
          invoices: [
            {
              id: "audit-invoice",
              order_id: "audit-order",
              number: "AUD-1",
              status: "issued",
              total_minor: 10000,
              currency: "RON",
              issued_at: 1,
              document_url: invoice,
            },
          ],
          providers: {
            stripe: { enabled: false },
            revolut: { enabled: false },
            oblio: { enabled: true },
            netopia: { enabled: false },
          },
        },
      });
    return route.fulfill({ json: { data: [], total: 0 } });
  });
  await page.goto("/profil?tab=invoices");
  await expect(page.getByText("AUD-1", { exact: true })).toBeVisible();
  const popupEvent = page.waitForEvent("popup");
  await page.getByRole("link", { name: /Descarcă/ }).click();
  const popup = await popupEvent;
  await expect(
    popup.getByRole("heading", { name: "Factură sintetică", exact: true }),
  ).toBeVisible();
  expect(providerHeaders?.authorization).toBeUndefined();
  expect(providerHeaders?.referer).toBeUndefined();
  await popup.close();
});

test("technology cards remain keyboard-scrollable and labeled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem(
      "avyron-cookie-consent-v2",
      JSON.stringify({ necessary: true, analytics: false, marketing: false }),
    ),
  );
  await page.goto("/servicii/website-prezentare-profesional#tehnologii");
  const region = page.locator("#tehnologii [role=region]");
  await region.focus();
  const before = await region.evaluate((el) => el.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => region.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(before);
  await expect(region).toBeFocused();
});

test("deferred homepage content stays available through keyboard focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const pending = page.locator("[data-deferred-pending]").first();
  const section = await pending.elementHandle();
  await section!.focus();
  await expect
    .poll(() =>
      section!.evaluate((el) => el.querySelector("h2")?.textContent || ""),
    )
    .not.toBe("");
});
