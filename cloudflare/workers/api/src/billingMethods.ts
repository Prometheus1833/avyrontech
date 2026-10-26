import type { Env } from "./types";
import { checkStripeAccount } from "./stripeAccount";

type Provider = "stripe" | "revolut";
type StripeMethod = { id: string; type: string; allow_redisplay?: string; card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number } };
type RevolutMethod = { id: string; type: string; saved_for?: string; brand?: string; last_four?: string; debtor_iban_last_four?: string; expiry_month?: number; expiry_year?: number };

export type MaskedPaymentMethod = {
  id: string; provider: Provider; type: string; brand: string | null; last4: string | null;
  expiry_month: number | null; expiry_year: number | null; is_default: number; usage_scope: "future" | "recurring";
};

const revolutRoot = (env: Env) => (env.REVOLUT_MERCHANT_API_URL?.trim() || "https://merchant.revolut.com/api").replace(/\/+$/, "");
const stripeHeaders = (env: Env) => ({
  authorization: `Bearer ${env.STRIPE_SECRET_KEY!.trim()}`,
  ...(env.STRIPE_API_VERSION?.trim() ? { "stripe-version": env.STRIPE_API_VERSION.trim() } : {}),
});
const revolutHeaders = (env: Env) => ({
  authorization: `Bearer ${env.REVOLUT_MERCHANT_SECRET_KEY!.trim()}`,
  "Revolut-Api-Version": env.REVOLUT_MERCHANT_API_VERSION?.trim() || "2026-08-17",
});

async function storeMethods(env: Env, userId: string, provider: Provider, methods: Array<{ id: string; type: string; brand: string | null; last4: string | null; month: number | null; year: number | null; scope: "future" | "recurring" }>, complete: boolean) {
  const timestamp = Date.now();
  const statements: D1PreparedStatement[] = [];
  if (complete) {
    const placeholders = methods.map(() => "?").join(",");
    statements.push(env.DB.prepare(`UPDATE billing_payment_methods SET status='detached',is_default=0,updated_at=? WHERE user_id=? AND provider=? AND status='active'${methods.length ? ` AND provider_payment_method_id NOT IN (${placeholders})` : ""}`).bind(timestamp, userId, provider, ...methods.map((method) => method.id)));
  }
  for (const method of methods) {
    statements.push(env.DB.prepare(`INSERT INTO billing_payment_methods
      (id,user_id,provider,provider_payment_method_id,type,brand,last4,expiry_month,expiry_year,is_default,status,created_at,updated_at,usage_scope)
      VALUES (?,?,?,?,?,?,?,?,?,CASE WHEN EXISTS(SELECT 1 FROM billing_payment_methods WHERE user_id=? AND provider=? AND status='active' AND is_default=1) THEN 0 ELSE 1 END,'active',?,?,?)
      ON CONFLICT(provider,provider_payment_method_id) DO UPDATE SET
        type=excluded.type,brand=excluded.brand,last4=excluded.last4,expiry_month=excluded.expiry_month,expiry_year=excluded.expiry_year,
        status='active',usage_scope=excluded.usage_scope,updated_at=excluded.updated_at`)
      .bind(crypto.randomUUID(), userId, provider, method.id, method.type, method.brand, method.last4, method.month, method.year, userId, provider, timestamp, timestamp, method.scope));
  }
  if (statements.length) await env.DB.batch(statements);
}

async function syncStripe(env: Env, userId: string, customerId: string) {
  const identity = await checkStripeAccount(env);
  if (!identity.ok) throw new Error(identity.code);
  const response = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}/payment_methods?type=card&limit=100`, { headers: stripeHeaders(env) });
  if (!response.ok) throw new Error(`stripe_methods_${response.status}`);
  const data = await response.json() as { data?: StripeMethod[]; has_more?: boolean };
  const methods = (data.data || []).filter((method) => method.id && method.type === "card").map((method) => ({
    id: method.id, type: "card", brand: method.card?.brand || null, last4: method.card?.last4 || null,
    month: method.card?.exp_month || null, year: method.card?.exp_year || null,
    scope: (method.allow_redisplay === "always" ? "future" : "recurring") as "future" | "recurring",
  }));
  await storeMethods(env, userId, "stripe", methods, data.has_more === false);
}

async function syncRevolut(env: Env, userId: string, customerId: string) {
  const response = await fetch(`${revolutRoot(env)}/customers/${encodeURIComponent(customerId)}/payment-methods`, { headers: revolutHeaders(env) });
  if (!response.ok) throw new Error(`revolut_methods_${response.status}`);
  const data = await response.json() as { payment_methods?: RevolutMethod[] };
  const methods = (data.payment_methods || []).filter((method) => method.id && ["card", "revolut_pay", "sepa_direct_debit"].includes(method.type)).map((method) => ({
    id: method.id, type: method.type, brand: method.brand || null,
    last4: method.last_four || method.debtor_iban_last_four || null,
    month: method.expiry_month || null, year: method.expiry_year || null,
    scope: (method.saved_for === "merchant" ? "recurring" : "future") as "future" | "recurring",
  }));
  await storeMethods(env, userId, "revolut", methods, true);
}

export async function listAccountPaymentMethods(env: Env, userId: string) {
  const { results: customers } = await env.DB.prepare("SELECT provider,provider_customer_id FROM billing_customers WHERE user_id=? AND provider IN ('stripe','revolut')").bind(userId).all<{ provider: Provider; provider_customer_id: string }>();
  const refreshed: Record<Provider, boolean> = { stripe: false, revolut: false };
  const syncs = customers.map(async (customer) => {
    if (customer.provider === "stripe" && env.STRIPE_SECRET_KEY?.trim()) await syncStripe(env, userId, customer.provider_customer_id);
    else if (customer.provider === "revolut" && env.REVOLUT_MERCHANT_SECRET_KEY?.trim()) await syncRevolut(env, userId, customer.provider_customer_id);
    else return;
    refreshed[customer.provider] = true;
  });
  await Promise.allSettled(syncs);
  const { results: methods } = await env.DB.prepare("SELECT id,provider,type,brand,last4,expiry_month,expiry_year,is_default,usage_scope FROM billing_payment_methods WHERE user_id=? AND status='active' ORDER BY is_default DESC,created_at DESC").bind(userId).all<MaskedPaymentMethod>();
  return { methods, refreshed };
}
