import { expect, test, type Page, type Locator } from "@playwright/test";
async function expectNoOverflow(locator: Locator) {
  const layout = await locator.evaluate((element) => ({
    width: element.clientWidth,
    scroll: element.scrollWidth,
    outliers: [...element.querySelectorAll("*")]
      .filter((child) => child.getBoundingClientRect().right > element.getBoundingClientRect().right + 1)
      .slice(0, 15)
      .map((child) => ({ tag: child.tagName, css: child.className, text: child.textContent?.slice(0, 60) })),
  }));
  expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width + 1);
}
const when = Date.UTC(2027, 0, 31, 12);
const billing = {
  entityType: "company",
  legalName: "Client A",
  taxId: "SYNTHETIC",
  address: "Adresă sintetică",
  invoiceEmail: "a@example.test",
  paymentTermsDays: 10,
};
const initial = {
  id: "sub-a",
  client_id: "ca",
  service_id: "sa",
  company_name: "Client A",
  service_name: "Website Plus",
  project_id: "pa",
  project_name: "Proiect sintetic",
  project_status: "in_progress",
  price: 125.5,
  billing_cycle: "monthly",
  status: "active",
  next_billing_date: when,
  revision: 1,
  maintenance_enabled: 0,
  plan_sku: "plan-website",
  specifications_json: '{"Ore incluse":"2 ore pe lună"}',
  target_label: "Website client",
  external_url: null,
  product_slug: null,
  billing,
  billingClientMatches: true,
  account_count: 1,
  periods: [],
};
async function setup(page: Page, role: "owner" | "staff" | "client" = "owner") {
  let rows = [structuredClone(initial)],
    internalRows = [
      {
        id: "internal-a",
        vendor_id: "v-codex",
        vendor_name: "OpenAI",
        service_name: "Codex",
        account_label: "Echipa AVYRON · demo",
        workspace_label: "AVYRON demo",
        status: "active",
        billing_type: "recurring",
        billing_cycle: "monthly",
        next_billing_date: when,
        responsible_name: "Responsabil demo",
        subscription_revision: 1,
        ...(role === "owner"
          ? {
              account_email: "team@example.test",
              gross_amount_minor: 20000,
              currency: "USD",
              notes: "Date sintetice",
              responsible_user_id: "staff",
              auto_renewal: 1,
            }
          : {}),
      },
    ];
  let allocation: Record<string, unknown> | null = null,
    savedInternal: Record<string, unknown> | null = null,
    prepared = false,
    fail = false;
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
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname,
      method = route.request().method();
    if (path === "/api/auth/refresh")
      return route.fulfill({
        json: { access_token: "synthetic-browser-session", expires_in: 900 },
      });
    if (path === "/api/auth/me")
      return route.fulfill({
        json: {
          user: {
            id: role,
            email:
              role === "owner"
                ? "prometheus@avyron.ro"
                : `${role}@example.test`,
            display_name: "Operator demonstrativ",
            email_verified: 1,
            must_change_password: 0,
          },
          profile: { display_name: "Operator demonstrativ" },
          roles: [
            role === "owner" ? "admin" : role === "staff" ? "staff" : "user",
          ],
          superadmin: role === "owner",
        },
      });
    if (path === "/api/produse/admin/overview")
      return route.fulfill({
        json: {
          plans: [],
          items: [],
          analytics: [],
          revenue: [],
          invoices: [],
          monthlySales: [],
        },
      });
    if (path === "/api/admin/client-subscriptions" && method === "GET")
      return route.fulfill({
        json: {
          data: rows,
          clients: [
            {
              id: "ca",
              company_name: "Client A",
              email: "a@example.test",
              contact_name: "Contact demo",
            },
          ],
          accounts: [
            {
              id: "account-a",
              name: "Client A",
              email: "a@example.test",
              client_ids: ["ca"],
            },
          ],
          projects: [{ id: "pa", name: "Proiect sintetic", client_id: "ca" }],
          products: [],
          plans: [
            {
              sku: "plan-website",
              name: "Website Plus",
              category: "Website",
              priceMinor: 12550,
              specifications: { "Ore incluse": "2 ore pe lună" },
            },
          ],
          providerSubscriptions: [],
          canPrepareInvoices: true,
        },
      });
    if (path === "/api/admin/client-subscriptions" && method === "POST") {
      allocation = route.request().postDataJSON();
      if (fail)
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "revision_conflict",
              message: "Conflict sintetic. Reîncearcă.",
            },
          },
        });
      rows = [
        ...rows,
        {
          ...initial,
          id: "sub-new",
          company_name: allocation?.newClient
            ? (allocation.newClient as { companyName: string }).companyName
            : "Client A",
          service_name: String(allocation?.name),
          account_count: allocation?.accountId ? 1 : 0,
        },
      ];
      return route.fulfill({
        json: { id: "sub-new", clientId: "ca", projectId: "pa" },
      });
    }
    if (path.endsWith("/prepare-invoice")) {
      prepared = true;
      rows = rows.map((s) => ({
        ...s,
        next_billing_date: Date.UTC(2027, 1, 28, 12),
        revision: 2,
        periods: [
          {
            billing_date: when,
            period_end: Date.UTC(2027, 1, 28, 12),
            due_date: when + 10 * 86400000,
            revenue_id: "draft-revenue",
            status: "draft",
            invoice_number: null,
          },
        ],
      }));
      return route.fulfill({ json: { id: "draft-revenue", prepared: true } });
    }
    if (path === "/api/internal/subscriptions" && method === "GET")
      return route.fulfill({
        json: {
          data: internalRows,
          canManage: role === "owner",
          canSeeCosts: role === "owner",
          vendors: role === "owner" ? [{ id: "v-codex", name: "OpenAI" }] : [],
          staff:
            role === "owner" ? [{ id: "staff", name: "Responsabil demo" }] : [],
        },
      });
    if (path === "/api/internal/subscriptions" && method === "POST") {
      savedInternal = route.request().postDataJSON();
      internalRows = [
        ...internalRows,
        {
          ...internalRows[0],
          id: "internal-new",
          account_label: String(savedInternal?.accountLabel),
          service_name: String(savedInternal?.serviceName),
          gross_amount_minor: savedInternal?.amountMinor as number | null,
          currency: String(savedInternal?.currency),
          status: String(savedInternal?.status),
          next_billing_date: savedInternal?.nextBillingDate as number | null,
        },
      ];
      return route.fulfill({ json: { id: "internal-new" } });
    }
    if (path === "/api/workspace/subscriptions")
      return route.fulfill({
        json: {
          data: [
            {
              ...initial,
              product_name: initial.service_name,
              price_cents: 12550,
              currency: "RON",
              description: "Website client",
              started_at: null,
              next_renewal_at: new Date(when).toISOString(),
              billing_ready: true,
              payment_terms_days: 10,
            },
          ],
        },
      });
    if (path === "/api/billing/account")
      return route.fulfill({
        json: {
          profile: null,
          methods: [],
          subscriptions: [],
          invoices: [],
          revolutPlans: [],
          providers: {
            stripe: { enabled: false },
            revolut: { enabled: false },
          },
        },
      });
    return route.fulfill({ json: { data: [] } });
  });
  return {
    allocation: () => allocation,
    savedInternal: () => savedInternal,
    prepared: () => prepared,
    fail: (value: boolean) => {
      fail = value;
    },
  };
}
async function allocationForm(page: Page, future = false) {
  await page.getByRole("button", { name: "Alocă client", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Alocă un abonament unui client",
  });
  if (future) {
    await dialog.getByLabel("Beneficiar", { exact: true }).selectOption("new");
    await dialog
      .getByLabel("Nume client / societate", { exact: true })
      .fill("Client viitor demonstrativ");
    await dialog
      .getByLabel("E-mail client", { exact: true })
      .fill("future@example.test");
  } else {
    await dialog
      .getByLabel("Selectează clientul", { exact: true })
      .selectOption("ca");
    await expect(dialog.getByLabel("Cont client autorizat")).toHaveValue(
      "account-a",
    );
    await dialog.getByLabel("Proiect", { exact: true }).selectOption("pa");
  }
  await dialog
    .getByLabel("Tip abonament", { exact: true })
    .selectOption("plan-website");
  await dialog.getByLabel("Prima dată de facturare").fill("2027-01-31");
  await dialog
    .getByLabel("CUI / identificator fiscal", { exact: true })
    .fill("SYNTHETIC");
  await dialog
    .getByLabel("Adresă de facturare", { exact: true })
    .fill("Adresă demonstrativă");
  await dialog.getByLabel("Termen de plată · zile").fill("10");
  await dialog.getByRole("button", { name: "Verifică alocarea" }).click();
  return dialog;
}
test("alocă unui cont existent planul și calendarul lunar numai după verificare", async ({
  page,
}, info) => {
  const state = await setup(page);
  await page.goto("/profil?tab=subscriptions-admin");
  await expect(
    page.getByRole("heading", { name: "Abonamente Clienți", exact: true }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Navigare AVYRON OS" });
  await expect(
    nav.getByRole("button", { name: "Abonamente Clienți", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("button", { name: "Abonamente AVYRON", exact: true }),
  ).toBeVisible();
  const dialog = await allocationForm(page);
  const contrast = await dialog
    .getByRole("button", { name: "Înapoi", exact: true })
    .evaluate((button) => {
      const style = getComputedStyle(button);
      const luminance = (color: string) =>
        (color.match(/[\d.]+/g) || [])
          .slice(0, 3)
          .map((value) => Number(value) / 255)
          .map((value) =>
            value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
          )
          .reduce(
            (sum, value, index) =>
              sum + value * [0.2126, 0.7152, 0.0722][index],
            0,
          );
      const foreground = luminance(style.color),
        background = luminance(style.backgroundColor);
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await expect(
    dialog.getByRole("button", { name: "Confirmă alocarea" }),
  ).toBeDisabled();
  await page.screenshot({ path: info.outputPath("allocation-review.png") });
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Confirmă alocarea" }).click();
  await expect(dialog).toBeHidden();
  expect(state.allocation()).toMatchObject({
    clientId: "ca",
    accountId: "account-a",
    projectId: "pa",
    priceMinor: 12550,
    planSku: "plan-website",
    billing: { paymentTermsDays: 10 },
    confirmed: true,
  });
  await page.screenshot({
    path: info.outputPath("client-subscriptions.png"),
    fullPage: true,
  });
});
test("pregătește un client viitor fără creare paralelă de cont sau trimitere", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/profil?tab=subscriptions-admin");
  const d = await allocationForm(page, true);
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Confirmă alocarea" }).click();
  await expect(d).toBeHidden();
  expect(state.allocation()).toMatchObject({
    clientId: null,
    accountId: null,
    newClient: {
      companyName: "Client viitor demonstrativ",
      email: "future@example.test",
    },
  });
});
test("păstrează formularul și datele la o eroare de alocare recuperabilă", async ({
  page,
}) => {
  const state = await setup(page);
  state.fail(true);
  await page.goto("/profil?tab=subscriptions-admin");
  const d = await allocationForm(page);
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Confirmă alocarea" }).click();
  await expect(d.getByRole("alert")).toContainText("Conflict sintetic");
  state.fail(false);
  await d.getByRole("button", { name: "Confirmă alocarea" }).click();
  await expect(d).toBeHidden();
});
test("pregătește ciorna financiară cu confirmare și monitorizează următoarea perioadă", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/profil?tab=subscriptions-admin");
  await page.getByText("Client A", { exact: true }).first().click();
  await page
    .getByRole("button", { name: "Pregătește factura", exact: true })
    .click();
  const d = page.getByRole("dialog", { name: "Pregătește ciorna lunară" });
  await expect(
    d.getByRole("button", { name: "Confirmă pregătirea ciornei" }),
  ).toBeDisabled();
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Confirmă pregătirea ciornei" }).click();
  await expect(d).toBeHidden();
  expect(state.prepared()).toBe(true);
  await expect(
    page.getByText("Perioade pregătite", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ciornă", { exact: false }).first(),
  ).toBeVisible();
});
test("adaugă un cont Codex în registrul intern și păstrează prețurile necunoscute", async ({
  page,
}, info) => {
  const state = await setup(page);
  await page.goto("/profil?tab=internal-subscriptions");
  await page.getByRole("button", { name: "Codex", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Adaugă un cont intern" });
  await expect(d.getByLabel("Furnizor", { exact: true })).toHaveValue(
    "v-codex",
  );
  await d
    .getByLabel("Etichetă cont", { exact: true })
    .fill("Cont Codex demonstrativ");
  await d.getByLabel("Organizație / spațiu de lucru").fill("AVYRON demo");
  await d.getByLabel("Responsabil", { exact: true }).selectOption("staff");
  await d
    .getByRole("button", { name: "Salvează evidența", exact: true })
    .click();
  await expect(d).toBeHidden();
  expect(state.savedInternal()).toMatchObject({
    vendorId: "v-codex",
    serviceName: "Codex",
    accountLabel: "Cont Codex demonstrativ",
    amountMinor: null,
    status: "needs_configuration",
  });
  await expect(
    page.getByText("Cont Codex demonstrativ · AVYRON demo", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("internal-subscriptions.png"),
    fullPage: true,
  });
});
test("staff vede evidența operațională fără costuri, note private sau modificări", async ({
  page,
}) => {
  await setup(page, "staff");
  await page.goto("/profil?tab=internal-subscriptions");
  await expect(
    page.getByRole("heading", { name: "Abonamente AVYRON", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Adaugă cont / abonament" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Editează evidența" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Abonamente Clienți", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("200,00", { exact: false })).toHaveCount(0);
});
test("clientul vede planul și condițiile alocate fără navigare internă", async ({
  page,
}) => {
  await setup(page, "client");
  await page.goto("/profil?tab=subscriptions");
  await expect(page.getByText("Website Plus", { exact: true })).toBeVisible();
  await page
    .getByText("Plan și specificații · plan-website", { exact: true })
    .click();
  await expect(page.getByText("2 ore pe lună", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Calendar lunar configurat · termen 10 zile", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Abonamente AVYRON", exact: true }),
  ).toHaveCount(0);
});
for (const width of [304, 320, 390])
  test(`abonamentele și mini-dashboardurile încap la ${width}px`, async ({
    page,
  }, info) => {
    await setup(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/profil?tab=subscriptions-admin");
    await expect(
      page.getByRole("heading", { name: "Abonamente Clienți", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Alocă client", exact: true })
      .click();
    const d = page.getByRole("dialog", {
      name: "Alocă un abonament unui client",
    });
    await expect(d).toBeVisible();
    await d.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation.effect?.getTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    await expectNoOverflow(d);
    await page.screenshot({
      path: info.outputPath(`allocation-mobile-${width}.png`),
    });
    await d.getByRole("button", { name: "Close", exact: true }).click();
    await page.goto("/profil?tab=internal-subscriptions");
    await expect(
      page.getByRole("heading", { name: "Abonamente AVYRON", exact: true }),
    ).toBeVisible();
    await expectNoOverflow(page.locator("html"));
    await page.getByRole("button", { name: "Lovable", exact: true }).click();
    const internal = page.getByRole("dialog", {
      name: "Adaugă un cont intern",
    });
    await expect(internal).toBeVisible();
    await expectNoOverflow(internal);
  });
