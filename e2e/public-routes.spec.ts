import { expect, test } from "@playwright/test";

const canonical = (path: string) => `https://avyron.ro${path === "/" ? "/" : path}`;

test.describe("public SEO routes", () => {
  for (const path of ["/", "/costurisiproduse", "/produse/audit-website"] as const) {
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

  test("unknown routes render the 404 experience", async ({ page }) => {
    await page.goto("/route-that-does-not-exist");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("forms and authentication", () => {
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
