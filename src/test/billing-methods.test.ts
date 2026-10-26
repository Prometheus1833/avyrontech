import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { billingRouter } from "../../cloudflare/workers/api/src/billing";
import { listAccountPaymentMethods } from "../../cloudflare/workers/api/src/billingMethods";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";

afterEach(() => vi.unstubAllGlobals());

describe("saved payment methods", () => {
  it("synchronizes only provider tokens and masked details for the signed-in account", async () => {
    const statements: Array<{ sql: string; args: unknown[] }> = [];
    const db = {
      prepare(sql: string) {
        const statement = { sql, args: [] as unknown[],
          bind(...args: unknown[]) { this.args = args; return this; },
          async all() {
            if (sql.includes("FROM billing_customers")) return { results: [
              { provider: "stripe", provider_customer_id: "cus_own" },
              { provider: "revolut", provider_customer_id: "revolut-own" },
            ] };
            return { results: [] };
          },
        };
        return statement;
      },
      async batch(rows: Array<{ sql: string; args: unknown[] }>) { statements.push(...rows); return []; },
    };
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/v1/account")
      ? { id: "acct_avyron", charges_enabled: true }
      : url.includes("stripe.com")
        ? { data: [{ id: "pm_own", type: "card", allow_redisplay: "always", card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 }, full_pan: "4111111111111111" }], has_more: false }
        : { payment_methods: [{ id: "rev_method", type: "revolut_pay", saved_for: "merchant", full_pan: "5555555555554444" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await listAccountPaymentMethods({ DB: db, STRIPE_SECRET_KEY: "sk_test_example", STRIPE_ACCOUNT_ID: "acct_avyron", REVOLUT_MERCHANT_SECRET_KEY: "rev_test_example" } as unknown as Env, "own-user");
    expect(result.refreshed).toEqual({ stripe: true, revolut: true });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(expect.arrayContaining([
      "https://api.stripe.com/v1/account",
      "https://api.stripe.com/v1/customers/cus_own/payment_methods?type=card&limit=100",
      "https://merchant.revolut.com/api/customers/revolut-own/payment-methods",
    ]));
    expect(statements.some((row) => row.args.includes("pm_own") && row.args.includes("4242"))).toBe(true);
    expect(statements.some((row) => row.args.includes("rev_method") && row.args.includes("recurring"))).toBe(true);
    expect(JSON.stringify(statements)).not.toContain("4111111111111111");
    expect(JSON.stringify(statements)).not.toContain("5555555555554444");
  });

  it("blocks card setup until Stripe is configured", async () => {
    const app = new Hono<AppBindings>();
    app.use("*", async (c, next) => { c.set("userId", "own-user"); await next(); });
    app.route("/", billingRouter);
    const response = await app.request("http://localhost/api/billing/payment-methods/setup", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "stripe" }),
    }, {} as AppBindings["Bindings"]);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "provider_unconfigured", provider: "stripe" } });
  });
});
