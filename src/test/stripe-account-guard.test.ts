import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { billingRouter } from "../../cloudflare/workers/api/src/billing";
import { checkStripeAccount } from "../../cloudflare/workers/api/src/stripeAccount";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";

afterEach(() => vi.unstubAllGlobals());

describe("Stripe account isolation", () => {
  it("never uses a test key for production checkout", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await checkStripeAccount({ APP_ENV: "production", STRIPE_SECRET_KEY: "rk_test_fixture", STRIPE_ACCOUNT_ID: "acct_avyron" } as Env))
      .toEqual({ ok: false, code: "stripe_mode_mismatch" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("verifies the AVYRON account identity without treating another Stripe profile as connected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "acct_other", charges_enabled: true }))));
    expect(await checkStripeAccount({ STRIPE_SECRET_KEY: "rk_test_fixture", STRIPE_ACCOUNT_ID: "acct_avyron" } as Env))
      .toEqual({ ok: false, code: "stripe_account_mismatch" });
  });

  it("blocks checkout before creating a customer or payment session for a different account", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "acct_other", charges_enabled: true })));
    vi.stubGlobal("fetch", fetchMock);
    const app = new Hono<AppBindings>();
    app.use("*", async (c, next) => { c.set("userId", "customer-1"); await next(); });
    app.route("/", billingRouter);
    const db = { prepare: () => ({ bind: () => ({ first: async () => ({
      id: "11111111-1111-4111-8111-111111111111", user_id: "customer-1", items_json: "[]",
      total_cents: 1000, currency: "RON", requires_manual_quote: 0, status: "requested", promotion_code: null,
    }) }) }) };
    const response = await app.request("http://localhost/api/billing/checkout", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: "11111111-1111-4111-8111-111111111111", provider: "stripe" }),
    }, { DB: db, STRIPE_SECRET_KEY: "rk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_ACCOUNT_ID: "acct_avyron" } as unknown as AppBindings["Bindings"]);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "stripe_account_mismatch", provider: "stripe" } });
    expect(fetchMock.mock.calls).toHaveLength(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.stripe.com/v1/account");
  });

  it("creates only a card Checkout Session for a signed-in customer after identity verification", async () => {
    const requests: Array<{ url: string; body?: URLSearchParams }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      requests.push({ url, body: init?.body instanceof URLSearchParams ? init.body : undefined });
      if (url.endsWith("/v1/account")) return new Response(JSON.stringify({ id: "acct_avyron", charges_enabled: true }));
      if (url.endsWith("/v1/customers")) return new Response(JSON.stringify({ id: "cus_fixture" }));
      if (url.endsWith("/v1/checkout/sessions")) return new Response(JSON.stringify({ id: "cs_fixture", url: "https://checkout.stripe.com/test-session" }));
      throw new Error(`Unexpected request: ${url}`);
    }));
    const app = new Hono<AppBindings>();
    app.use("*", async (c, next) => { c.set("userId", "customer-1"); await next(); });
    app.route("/", billingRouter);
    const db = {
      prepare: (sql: string) => ({
        bind: (..._args: unknown[]) => ({
          first: async () => sql.includes("FROM commerce_orders") ? {
            id: "11111111-1111-4111-8111-111111111111", user_id: "customer-1", items_json: "[]",
            total_cents: 1000, currency: "RON", requires_manual_quote: 0, status: "requested", promotion_code: null,
          } : sql.includes("FROM users u") ? { email: "test@example.invalid", name: "Test" } : null,
          run: async () => ({ success: true }),
        }),
      }),
      batch: async () => [],
    };
    const response = await app.request("http://localhost/api/billing/checkout", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: "11111111-1111-4111-8111-111111111111", provider: "stripe" }),
    }, { DB: db, APP_ENV: "production", STRIPE_SECRET_KEY: "rk_live_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_ACCOUNT_ID: "acct_avyron", APP_URL: "https://avyron.ro" } as unknown as AppBindings["Bindings"]);
    expect(response.status).toBe(201);
    expect(requests.map((request) => request.url)).toEqual([
      "https://api.stripe.com/v1/account", "https://api.stripe.com/v1/customers", "https://api.stripe.com/v1/checkout/sessions",
    ]);
    const session = requests[2]?.body;
    expect(session?.get("payment_method_types[0]")).toBe("card");
    expect(session?.get("line_items[0][price_data][unit_amount]")).toBe("1000");
    expect(session?.get("success_url")).toContain("https://avyron.ro/profil?tab=orders&plata=verificare");
  });
});
