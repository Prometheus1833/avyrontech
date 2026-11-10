import type { Env } from "./types";
import type { FinancialProviderKey } from "./providerSyncPolicy";
import { readTextUpTo } from "./metadata";
import { checkStripeAccount } from "./stripeAccount";

type Verification = { ok: true; account: string; capabilities: string[]; detail?: string } | { ok: false; code: string };

const API_ROOT = "https://www.oblio.eu/api";
const REVOLUT_VERSION = "2026-08-17";

async function jsonResponse(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: Record<string, unknown>; failure?: string }> {
  let status = 0;
  try {
    const response = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    status = response.status;
    const parsed:unknown = JSON.parse(await readTextUpTo(response,262144));
    const data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string,unknown> : {};
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    // Preserve HTTP evidence when a gateway returns HTML instead of JSON.
    // Neither the response body nor credential-bearing error text is logged.
    const failure = status ? "invalid_response" : error instanceof Error && /Timeout|Abort/.test(error.name) ? "timeout" : "network";
    return { ok: false, status, data: {}, failure };
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
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }).toString(),
    });
    const accessToken = token.data.access_token;
    if (!token.ok || typeof accessToken !== "string" || !accessToken) return { ok: false, code: token.failure ? `oblio_auth_${token.status ? `${token.status}_` : ""}${token.failure}` : token.ok ? "oblio_auth_invalid_response" : `oblio_auth_${token.status}` };
    const response = await jsonResponse(`${API_ROOT}/nomenclature/series?cif=${encodeURIComponent(cif)}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!response.ok) return { ok: false, code: `oblio_series_api_${response.status || response.failure || "unreachable"}` };
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
    if(root!=="https://merchant.revolut.com/api" && !(env.APP_ENV!=="production" && root==="https://sandbox-merchant.revolut.com/api"))return {ok:false,code:"merchant_origin_rejected"};
    const response = await jsonResponse(`${root}/webhooks`, {
      headers: { authorization: `Bearer ${key}`, "Revolut-Api-Version": env.REVOLUT_MERCHANT_API_VERSION?.trim() || REVOLUT_VERSION },
    });
    if (!response.ok) return { ok: false, code: `revolut_merchant_api_${response.status || "unreachable"}` };
    if (!Array.isArray(response.data.webhooks)) return { ok: false, code: "revolut_merchant_webhooks_unreadable" };
    const allowed = new Set(["https://avyron.ro/api/billing/webhooks/revolut","https://app.avyron.ro/api/billing/webhooks/revolut","https://api.avyron.ro/v1/billing/webhooks/revolut","https://api.avyron.ro/api/billing/webhooks/revolut"]);
    const destination = response.data.webhooks.find((value):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&allowed.has(String((value as Record<string,unknown>).url))&&Array.isArray((value as Record<string,unknown>).events)&&((value as Record<string,unknown>).events as unknown[]).includes('ORDER_COMPLETED')));
    if(!destination)return {ok:false,code:"revolut_avyron_webhook_required"};
    return { ok: true, account: "merchant_api", capabilities: ["webhooks_read", "avyron_webhook_destination_verified", "checkout_configured", "webhook_secret_configured"], detail: "Destinație AVYRON și eveniment ORDER_COMPLETED verificate; livrarea se confirmă separat." };
  }

  return { ok: false, code: "unsupported_provider" };
}
