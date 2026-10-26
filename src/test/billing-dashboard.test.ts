import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { billingRouter, checkoutBillingCompatible } from "../../cloudflare/workers/api/src/billing";
import type { AppBindings } from "../../cloudflare/workers/api/src/types";

function adminApp() {
  const app = new Hono<AppBindings>();
  app.use("*", async (c, next) => {
    c.set("roles", ["admin"]);
    c.set("userId", "staff-1");
    c.set("mfaVerified", false);
    await next();
  });
  app.route("/", billingRouter);
  return app;
}

describe("financial dashboard contract", () => {
  it("prevents a recurring plan and a one-time item from sharing a payment checkout", () => {
    expect(checkoutBillingCompatible([{ sku: "sub-site-plus", type: "subscription", period: "monthly" }, { sku: "website-starter", type: "package" }])).toBe(false);
    expect(checkoutBillingCompatible([{ sku: "sub-site-plus", type: "subscription", period: "monthly" }])).toBe(true);
    expect(checkoutBillingCompatible([{ sku: "website-starter", type: "package" }, { sku: "website-business", type: "package" }])).toBe(true);
  });
  it("returns separate, empty provider ledgers without inventing a bank balance or a verified connection", async () => {
    const queries: string[] = [];
    const db = { prepare: (query: string) => {
      queries.push(query);
      return { all: async () => ({ results: [] }), bind: () => ({ first: async () => null }) };
    } };
    const response = await adminApp().request("http://localhost/api/billing/admin/status", undefined, { DB: db, MFA_AUTH_ENABLED: "false" } as unknown as AppBindings["Bindings"]);
    expect(response.status).toBe(200);
    const status = await response.json();
    expect(status).toMatchObject({
      security: { mfaEnabled: false, mfaVerified: false, canVerify: false },
      providers: { stripe: { enabled: false }, oblio: { enabled: false } },
      bankSettlement: { verified: false, reason: "revolut_business_not_connected" },
      recentPayments: [], recentSubscriptions: [], recentInvoices: [], connectionRecords: [],
    });
    expect(status.providerPlaybooks.map((playbook: { provider: string; phase: string }) => [playbook.provider, playbook.phase])).toEqual([
      ["stripe", "not_connected"], ["oblio", "not_connected"], ["revolut_business", "not_connected"], ["revolut_merchant", "not_connected"],
    ]);
    expect(queries.some((query) => query.includes("financial_provider_connections"))).toBe(true);
    expect(queries.some((query) => query.includes("billing_checkout_sessions") && query.includes("ORDER BY updated_at DESC"))).toBe(true);
  });

  it("blocks invoice issuance retry when MFA was not actually verified, even if the global switch is off", async () => {
    const response = await adminApp().request("http://localhost/api/billing/admin/invoices/order-1/retry", { method: "POST" }, { MFA_AUTH_ENABLED: "false" } as AppBindings["Bindings"]);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "mfa_required" } });
  });
});
