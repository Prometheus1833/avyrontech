import { expect, test } from "@playwright/test";

const canonical = (path: string) => `https://avyron.ro${path === "/" ? "/" : path}`;

test.describe("public SEO routes", () => {
  for (const path of ["/", "/costurisiproduse", "/produse/website-prezentare-premium"] as const) {
    test(`${path} has content and a self canonical`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical(path));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    });
  }

  test("translated pricing cross-links hreflang", async ({ page }) => {
    await page.goto("/en/pricing");
    await expect(page.locator('link[hreflang="ro"]')).toHaveAttribute("href", "https://avyron.ro/costurisiproduse");
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", "https://avyron.ro/en/pricing");
  });

  test("audit remains in the product overview and continues in the request form", async ({ page }) => {
    await page.goto("/costurisiproduse");
    await page.getByRole("link", { name: "Vreau auditul", exact: true }).click();
    await expect(page).toHaveURL(/\/\?request=audit#cta$/);
    await expect(page.locator("#cta form")).toBeVisible();
    await expect(page.locator("#description")).toHaveValue(/audit/i);

    await page.goto("/produse/audit-website");
    await expect(page).toHaveURL(/\/\?request=audit#cta$/);
    await expect(page.locator("#cta form")).toBeVisible();
  });

  test("real blog article owns canonical and BlogPosting schema", async ({ page }) => {
    const path = "/blog/importanta-website-afacere-2026";
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical(path));
    const graph = await page.locator("#ld-graph").textContent();
    expect(graph).toContain("BlogPosting");
    expect(graph).not.toContain("#importanta-website-afacere-2026");
    await expect(page.getByRole("heading", { level: 2, name: "Ce face un website util, nu doar frumos" })).toBeVisible();
  });

  test("complete English legal and blog variants are indexable", async ({ page }) => {
    await page.goto("/en/privacy");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expect(page.getByRole("heading", { level: 2, name: "Legal identity and collaboration structure" })).toBeVisible();
    await expect(page.locator('link[hreflang="ro"]')).toHaveAttribute("href", "https://avyron.ro/gdpr");

    await page.goto("/en/blog/importanta-website-afacere-2026");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expect(page.getByRole("heading", { level: 2, name: "What makes a website useful, not merely attractive" })).toBeVisible();
    await expect(page.locator('link[hreflang="ro"]')).toHaveAttribute("href", "https://avyron.ro/blog/importanta-website-afacere-2026");
  });

  test("article exposes complete native and network sharing actions", async ({ page }) => {
    await page.goto("/blog/importanta-website-afacere-2026");
    await expect(page.getByRole("button", { name: "Distribuie" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Distribuie pe Facebook" }).first()).toHaveAttribute("href", /facebook\.com\/sharer/);
    await expect(page.getByRole("link", { name: "Distribuie pe LinkedIn" }).first()).toHaveAttribute("href", /linkedin\.com\/sharing/);
    await expect(page.getByRole("link", { name: "Distribuie pe WhatsApp" }).first()).toHaveAttribute("href", /wa\.me/);
    await expect(page.getByRole("button", { name: "Copiază linkul" }).first()).toBeVisible();
  });

  test("unknown routes render the 404 experience", async ({ page }) => {
    await page.goto("/route-that-does-not-exist");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("forms and authentication", () => {
  test("authenticated staff can open the Cloudflare editorial workspace", async ({ page }) => {
    await page.route("**/api/auth/refresh", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "local-e2e-token", expires_in: 900, user: { id: "staff-1", roles: ["staff"] } }),
    }));
    await page.route("**/api/auth/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "staff-1", email: "staff@example.com", display_name: "Editor Avyron", avatar_url: null, email_verified: 1, must_change_password: 0, created_at: 1 },
        profile: { id: "staff-1", display_name: "Editor Avyron", avatar_url: null, phone: null, address: null, entity_type: "individual", company_name: null, cui: null, social_facebook: null, social_instagram: null, social_tiktok: null, website: null, language: "ro", theme: "system", pseudonym: null, staff_role: "marketing" },
        roles: ["staff"],
      }),
    }));
    await page.route("**/api/blog/posts?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }));
    await page.route("**/api/blog/staff/posts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }));

    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Spațiu editorial" })).toBeVisible();
    await page.getByRole("button", { name: "Articol nou" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Articol nou" })).toBeVisible();
    await expect(page.locator("#blog-title")).toBeVisible();
    await expect(page.locator("#blog-content")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publică" })).toBeVisible();
  });

  test("Romanian login alias renders the auth page and remains noindex", async ({ page }) => {
    await page.goto("/autentificare");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("private profile redirects to login", async ({ page }) => {
    await page.goto("/profil");
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("signup waits for email verification", async ({ page }) => {
    await page.addInitScript(() => {
      window.turnstile = {
        render: (_element, options) => {
          queueMicrotask(() => (options.callback as (token: string) => void)("playwright-turnstile-token"));
          return "playwright-widget";
        },
        remove: () => undefined,
        reset: () => undefined,
      };
    });
    await page.route("**/api/auth/signup", (route) => route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, verification_required: true, verification_email_sent: true }),
    }));
    await page.goto("/auth");
    await page.getByRole("tab", { name: /înregistr|register/i }).click();
    await page.locator("#rg-name").fill("Test Avyron");
    await page.locator("#rg-email").fill("test@example.com");
    await page.locator("#rg-pass").fill("SecurePass123!");
    await page.getByRole("button", { name: /înregistr|register/i }).click();
    await expect(page.getByRole("status")).toContainText(/verifică emailul|confirmare/i);
  });

  test("example request uses the protected Worker endpoint", async ({ page }) => {
    await page.addInitScript(() => {
      window.turnstile = {
        render: (_element, options) => {
          queueMicrotask(() => (options.callback as (token: string) => void)("playwright-turnstile-token"));
          return "playwright-widget";
        },
        remove: () => undefined,
        reset: () => undefined,
      };
    });
    let payload: Record<string, unknown> | undefined;
    await page.route("**/api/contact/example", async (route) => {
      payload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, requestId: "test" }) });
    });
    await page.goto("/");
    const necessaryCookies = page.getByRole("button", { name: "Doar necesare" });
    if (await necessaryCookies.isVisible()) await necessaryCookies.click();
    await page.evaluate(() => window.scrollTo(0, 1600));
    await page.getByRole("button", { name: "Vezi domenii" }).click();
    await page.getByRole("button", { name: /Beauty & Wellness/ }).click();
    await page.getByRole("button", { name: "Solicită un exemplu", exact: true }).click();
    await page.locator("#request-example-email").fill("lead@example.com");
    await page.locator("#request-example-phone").fill("0712345678");
    await page.getByRole("button", { name: "Trimite solicitarea" }).click();
    await expect(page.getByText("Solicitarea a fost trimisă!")).toBeVisible();
    expect(payload).toMatchObject({ email: "lead@example.com", phone: "0712345678", source_category: "beauty" });
  });
});
