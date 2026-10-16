import { expect, test, type Page } from "@playwright/test";

async function mockFreeAccount(page: Page) {
  let serviceFavorite = false;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/refresh") return route.fulfill({ json: { access_token: "free-account", expires_in: 900 } });
    if (path === "/api/auth/me") return route.fulfill({ json: {
      user: { id: "free-user", email: "client@example.test", display_name: "Client Free", must_change_password: 0 },
      profile: { display_name: "Client Free" }, roles: ["user"], superadmin: false,
    } });
    if (path === "/api/commerce/catalog") return route.fulfill({ json: {
      services: [{ key: "premium-website", name: "Site Prezentare Profesional", category: "presence", sku: "svc-premium-website", priceMinor: 145_000, currency: "RON", payable: false }],
      products: [{ key: "card-holografic", name: "Card holografic", category: "component", sku: "product-card-holografic", priceMinor: 3_000, currency: "RON", payable: false }],
    } });
    if (path === "/api/commerce/favorites/services") return route.fulfill({ json: { data: serviceFavorite ? ["premium-website"] : [] } });
    if (path === "/api/commerce/favorites/services/premium-website") {
      serviceFavorite = request.method() === "PUT";
      return route.fulfill({ json: { ok: true } });
    }
    if (path === "/api/commerce/orders") return route.fulfill({ json: { data: [] } });
    if (path === "/api/commerce/cart" && request.method() === "GET") return route.fulfill({ json: { data: [], updatedAt: null } });
    if (path === "/api/commerce/cart" && request.method() === "PUT") {
      const body = request.postDataJSON();
      return route.fulfill({ json: { data: body.items, updatedAt: Date.now() } });
    }
    if (path === "/api/commerce/cart/sync" && request.method() === "POST") {
      const body = request.postDataJSON();
      return route.fulfill({ json: { data: body.items, updatedAt: Date.now() } });
    }
    if (path === "/api/projects") return route.fulfill({ json: {
      data: [],
      purchases: [{ id: "paid-order-12345678", name: "Website profesional", kind: "service", total_cents: 145_000, currency: "RON", status: "paid", updated_at: Date.now(), items: [] }],
    } });
    if (path === "/api/workspace/subscriptions") return route.fulfill({ json: { data: [] } });
    if (path === "/api/billing/account") return route.fulfill({ json: {
      profile: { entity_type: "individual", legal_name: "Client Free", tax_id: null, invoice_email: "client@example.test", address: null, city: null, county: null, automatic_charging: 0, default_provider: "stripe" },
      methods: [], subscriptions: [], invoices: [], revolutPlans: [],
      providers: { stripe: { enabled: true }, revolut: { enabled: false }, oblio: { enabled: false }, netopia: { enabled: false } },
    } });
    if (path === "/api/billing/payment-methods") return route.fulfill({ json: { methods: [
      { id: "masked-one", provider: "stripe", type: "card", brand: "visa", last4: "4242", expiry_month: 12, expiry_year: 2029, is_default: 1, usage_scope: "future" },
    ], refreshed: { stripe: true, revolut: false } } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" })));
}

test("a registered free user can sync a service into the account cart", async ({ page }) => {
  await mockFreeAccount(page);
  let saved: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/commerce/cart/sync" && request.method() === "POST") saved = request.postDataJSON().items;
  });
  await page.goto("/servicii/website-prezentare-profesional", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Adaugă serviciul în coș" }).click();
  await expect(page.getByRole("link", { name: /În coșul sincronizat/ })).toBeVisible();
  await expect.poll(() => saved.some((item) => item.type === "service" && item.source === "services")).toBe(true);
});

test("paid purchases are visible in Projects for the registered user", async ({ page }) => {
  await mockFreeAccount(page);
  await page.goto("/profil?tab=projects", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Produse și servicii activate" })).toBeVisible();
  await expect(page.getByText("Website profesional")).toBeVisible();
  await expect(page.getByText("1.450,00 RON")).toBeVisible();
});

test("the customer dashboard keeps staff controls out and combines service and product selections", async ({ page }) => {
  await mockFreeAccount(page);
  await page.goto("/profil", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Bună, Client Free." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explorează catalogul", exact: true })).toBeVisible();
  await expect(page.getByText("Necesită atenție · Azi")).toHaveCount(0);
  await page.getByRole("button", { name: "Explorează catalogul", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Servicii și produse pentru contul tău" })).toBeVisible();
  await page.getByRole("button", { name: "Adaugă Site Prezentare Profesional la favorite" }).click();
  await expect(page.getByRole("button", { name: "Scoate Site Prezentare Profesional din favorite" })).toBeVisible();
  await page.getByRole("button", { name: "Adaugă în coș" }).first().click();
  await page.getByRole("button", { name: "Adaugă în coș" }).last().click();
  await page.getByRole("tab", { name: "Coș" }).first().click();
  await expect(page.getByRole("heading", { name: "Conținutul coșului (2)" })).toBeVisible();
  await expect(page.getByText("Card holografic").first()).toBeVisible();
});

test("the registered user sees only masked saved methods in the payments section", async ({ page }) => {
  await mockFreeAccount(page);
  await page.goto("/profil?tab=payments", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Metode de plată și facturare" })).toBeVisible();
  await expect(page.getByText("Visa •••• 4242")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvează un card" })).toBeEnabled();
  await expect(page.getByText("Revolut Pay · în configurare")).toBeVisible();
});
