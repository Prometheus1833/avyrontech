import type { Env } from "./types";
import type { FinancialProviderKey } from "./providerSyncPolicy";
import { checkStripeAccount } from "./stripeAccount";

type Verification = { ok: true; account: string; capabilities: string[]; detail?: string } | { ok: false; code: string };

const API_ROOT = "https://www.oblio.eu/api";
const REVOLUT_VERSION = "2026-08-17";

async function jsonResponse(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

export async function verifyFinancialConnection(env: Env, provider: FinancialProviderKey): Promise<Verification> {
  if (provider === "stripe") {
    const key = env.STRIPE_SECRET_KEY?.trim();
    if (!key || !env.STRIPE_WEBHOOK_SECRET?.trim()) return { ok: false, code: "stripe_secrets_missing" };
    const account = await checkStripeAccount(env);
    if (!account.ok) return account;
    if (!account.chargesEnabled) return { ok: false, code: "stripe_charges_disabled" };
    return { ok: true, account: account.id, capabilities: ["account_read", "checkout_configured", "webhook_secret_configured"], detail: "charges_enabled" };
  }

  if (provider === "oblio") {
    const clientId = env.OBLIO_CLIENT_ID?.trim();
    const clientSecret = env.OBLIO_CLIENT_SECRET?.trim();
    const cif = env.OBLIO_CIF?.trim();
    const series = env.OBLIO_SERIES?.trim();
    if (!clientId || !clientSecret || !cif || !series) return { ok: false, code: "oblio_secrets_or_series_missing" };
    const token = await jsonResponse(`${API_ROOT}/authorize/token`, {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
    });
    const accessToken = token.data.access_token;
    if (!token.ok || typeof accessToken !== "string" || !accessToken) return { ok: false, code: `oblio_auth_${token.status || "unreachable"}` };
    const response = await jsonResponse(`${API_ROOT}/nomenclature/series?cif=${encodeURIComponent(cif)}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!response.ok) return { ok: false, code: `oblio_series_api_${response.status || "unreachable"}` };
    const rows = Array.isArray(response.data.data) ? response.data.data : [];
    const invoiceSeries = rows.find((row): row is Record<string, unknown> => typeof row === "object" && row !== null && (row as Record<string, unknown>).type === "Factura" && (row as Record<string, unknown>).name === series);
    if (!invoiceSeries) return { ok: false, code: "oblio_invoice_series_not_found" };
    const start = String(invoiceSeries.start ?? "");
    const next = String(invoiceSeries.next ?? "");
    if (start !== "0001") return { ok: false, code: "oblio_series_does_not_start_at_0001" };
    return { ok: true, account: cif, capabilities: ["series_read", "invoice_series_verified"], detail: `${series}: ${start} → ${next}` };
  }

  if (provider === "revolut_merchant") {
    const key = env.REVOLUT_MERCHANT_SECRET_KEY?.trim();
    if (!key || !env.REVOLUT_MERCHANT_WEBHOOK_SECRET?.trim()) return { ok: false, code: "revolut_merchant_secrets_missing" };
    const root = (env.REVOLUT_MERCHANT_API_URL?.trim() || "https://merchant.revolut.com/api").replace(/\/+$/, "");
    const response = await jsonResponse(`${root}/webhooks`, {
      headers: { authorization: `Bearer ${key}`, "Revolut-Api-Version": env.REVOLUT_MERCHANT_API_VERSION?.trim() || REVOLUT_VERSION },
    });
    if (!response.ok) return { ok: false, code: `revolut_merchant_api_${response.status || "unreachable"}` };
    if (!Array.isArray(response.data.webhooks)) return { ok: false, code: "revolut_merchant_webhooks_unreadable" };
    return { ok: true, account: "merchant_api", capabilities: ["webhooks_read", "checkout_configured", "webhook_secret_configured"], detail: `${response.data.webhooks.length} webhook(uri)` };
  }

  return { ok: false, code: "unsupported_provider" };
}
