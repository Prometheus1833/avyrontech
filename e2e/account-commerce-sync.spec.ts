import { expect, test, type Page } from "@playwright/test";

async function mockFreeAccount(page: Page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/refresh") return route.fulfill({ json: { access_token: "free-account", expires_in: 900 } });
    if (path === "/api/auth/me") return route.fulfill({ json: {
      user: { id: "free-user", email: "client@example.test", display_name: "Client Free", must_change_password: 0 },
      profile: { display_name: "Client Free" }, roles: ["user"], superadmin: false,
    } });
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
      purchases: [{ id: "paid-order-12345678", name: "Website profesional", kind: "service", total_cents: 115_000, currency: "RON", status: "paid", updated_at: Date.now(), items: [] }],
    } });
    if (path === "/api/workspace/subscriptions") return route.fulfill({ json: { data: [] } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false })));
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
  await expect(page.getByText("1.150,00 RON")).toBeVisible();
});
