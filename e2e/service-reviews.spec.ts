import { expect, test } from "@playwright/test";

test("guest review follows subscriptions and waits for admin approval", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({
    necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12",
  })));
  await page.addInitScript(() => Object.assign(window, { turnstile: {
    render: (_element: HTMLElement, options: { callback?: (token: string) => void }) => {
      queueMicrotask(() => options.callback?.("test-turnstile-token"));
      return "test-widget";
    },
    remove: () => undefined,
    reset: () => undefined,
  } }));
  await page.route("**/api/public/reviews?**", (route) => route.fulfill({ json: { data: [] } }));
  let submitted: Record<string, unknown> | null = null;
  await page.route("**/api/public/reviews", (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ status: 202, json: { ok: true, status: "pending" } });
  });

  await page.goto("/servicii/website-prezentare-profesional", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#recenzii")).toContainText("Primele recenzii aprobate vor apărea aici.");
  const order = await page.locator("#abonamente, #recenzii, #faq, [data-testid='related-product-list'], #technology-partners-title").evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().top + window.scrollY)),
  );
  expect(order).toHaveLength(5);
  expect(order).toEqual([...order].sort((a, b) => a - b));

  await page.getByRole("button", { name: "Lasă o recenzie" }).click();
  const dialog = page.getByRole("dialog", { name: "Experiența ta cu AVYRON" });
  await dialog.getByLabel("Numele tău").fill("Ana Popescu");
  await dialog.getByLabel("Email de contact").fill("ana@example.com");
  await dialog.getByRole("combobox", { name: "Reprezinți" }).click();
  await page.getByRole("option", { name: "Firmă / SRL" }).click();
  await dialog.getByLabel("Numele brandului sau firmei").fill("Atelier Nord");
  await dialog.getByRole("button", { name: "5/5" }).click();
  await dialog.getByLabel("Recenzia ta").fill("Am colaborat pentru un site de prezentare și comunicarea a fost clară.");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Trimite recenzia" }).click();

  await expect(page.getByRole("dialog").getByText("A fost salvată și va apărea pe site numai după aprobarea unui administrator.")).toBeVisible();
  expect(submitted).toMatchObject({ surfaceKey: "service:premium-website", entityType: "srl", brandName: "Atelier Nord", rating: 5, publishConsent: true });
});
