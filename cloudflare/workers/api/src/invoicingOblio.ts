import type { Env } from "./types";

export type OblioInvoiceInput = {
  orderId: string;
  buyer: { name: string; email?: string | null; taxId?: string | null; address?: string | null };
  lines: Array<{ name: string; code?: string; quantity: number; unitPriceMinor: number }>;
  currency: string;
  issuedAt: number;
};

export type OblioInvoiceResult =
  | { issued: true; providerId: string; series: string; number: string; documentUrl: string | null }
  | { issued: false; reason: "unconfigured" | "invalid_vat" | "token_failed" | "invoice_failed"; status?: number };

const API_ROOT = "https://www.oblio.eu/api";

const configured = (env: Env) => Boolean(
  env.OBLIO_CLIENT_ID?.trim() && env.OBLIO_CLIENT_SECRET?.trim() && env.OBLIO_CIF?.trim() && env.OBLIO_SERIES?.trim()
    && env.OBLIO_VAT_NAME?.trim() && env.OBLIO_VAT_PERCENTAGE?.trim(),
);

export async function issueOblioInvoice(env: Env, input: OblioInvoiceInput): Promise<OblioInvoiceResult> {
  if (!configured(env)) return { issued: false, reason: "unconfigured" };
  const vatPercentage = Number(env.OBLIO_VAT_PERCENTAGE);
  if (!Number.isFinite(vatPercentage) || vatPercentage < 0 || vatPercentage > 100) return { issued: false, reason: "invalid_vat" };

  const tokenBody = new URLSearchParams({
    client_id: env.OBLIO_CLIENT_ID!.trim(),
    client_secret: env.OBLIO_CLIENT_SECRET!.trim(),
  });
  const tokenResponse = await fetch(`${API_ROOT}/authorize/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: tokenBody,
  });
  if (!tokenResponse.ok) return { issued: false, reason: "token_failed", status: tokenResponse.status };
  const tokenPayload = await tokenResponse.json() as { access_token?: string };
  if (!tokenPayload.access_token) return { issued: false, reason: "token_failed", status: tokenResponse.status };

  const invoiceResponse = await fetch(`${API_ROOT}/docs/invoice`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${tokenPayload.access_token}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      cif: env.OBLIO_CIF!.trim(),
      client: {
        name: input.buyer.name,
        ...(input.buyer.email ? { email: input.buyer.email } : {}),
        ...(input.buyer.taxId ? { cif: input.buyer.taxId } : {}),
        ...(input.buyer.address ? { address: input.buyer.address } : {}),
      },
      issueDate: new Date(input.issuedAt).toISOString().slice(0, 10),
      seriesName: env.OBLIO_SERIES!.trim(),
      currency: input.currency.toUpperCase(),
      orderNumber: input.orderId,
      idempotencyKey: `avyron-${input.orderId}`,
      sendEmail: Boolean(input.buyer.email),
      products: input.lines.map((line) => ({
        name: line.name,
        ...(line.code ? { code: line.code } : {}),
        price: line.unitPriceMinor / 100,
        measuringUnit: "buc",
        currency: input.currency.toUpperCase(),
        vatName: env.OBLIO_VAT_NAME!.trim(),
        vatPercentage,
        vatIncluded: true,
        quantity: line.quantity,
        productType: "Serviciu",
      })),
    }),
  });
  if (!invoiceResponse.ok) return { issued: false, reason: "invoice_failed", status: invoiceResponse.status };
  const payload = await invoiceResponse.json() as {
    data?: { seriesName?: string; number?: string | number; link?: string };
    seriesName?: string;
    number?: string | number;
    link?: string;
  };
  const data = payload.data ?? payload;
  const series = String(data.seriesName ?? env.OBLIO_SERIES).trim();
  const number = String(data.number ?? "").trim();
  if (!number) return { issued: false, reason: "invoice_failed", status: invoiceResponse.status };
  return {
    issued: true,
    providerId: `${series}-${number}`,
    series,
    number,
    documentUrl: typeof data.link === "string" && /^https:\/\//.test(data.link) ? data.link : null,
  };
}
