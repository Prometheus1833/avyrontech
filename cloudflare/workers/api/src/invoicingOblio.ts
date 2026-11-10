import type { Env } from "./types";

export type OblioInvoiceInput = {
  orderId: string;
  buyer: { name: string; email?: string | null; taxId?: string | null; address?: string | null };
  lines: Array<{ name: string; code?: string; quantity: number; unitPriceMinor: number;vatBasisPoints?:number;unitLabel?:string }>;
  discountMinor?: number;
  discountLabel?: string;
  currency: string;
  issuedAt: number;
  payment?: { reference: string; amountMinor: number; capturedAt: number };
};

export type OblioInvoiceResult =
  | { issued: true; providerId: string; series: string; number: string; documentUrl: string | null }
  | { issued: false; reason: "approval_required" | "unconfigured" | "invalid_vat" | "invalid_payment" | "token_failed" | "invoice_failed"; status?: number };

const API_ROOT = "https://www.oblio.eu/api";

const fiscalDate = (timestamp: number) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(timestamp);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
};

const configured = (env: Env) => Boolean(
  env.OBLIO_CLIENT_ID?.trim() && env.OBLIO_CLIENT_SECRET?.trim() && env.OBLIO_CIF?.trim() && env.OBLIO_SERIES?.trim()
    && env.OBLIO_VAT_NAME?.trim() && env.OBLIO_VAT_PERCENTAGE?.trim(),
);

export async function issueOblioInvoice(env: Env, input: OblioInvoiceInput): Promise<OblioInvoiceResult> {
  if (env.OBLIO_AUTO_ISSUE_ENABLED !== "true") return { issued: false, reason: "approval_required" };
  if (!configured(env)) return { issued: false, reason: "unconfigured" };
  const vatPercentage = Number(env.OBLIO_VAT_PERCENTAGE);
  if (!Number.isFinite(vatPercentage) || vatPercentage < 0 || vatPercentage > 100) return { issued: false, reason: "invalid_vat" };
  if (env.OBLIO_VAT_NAME?.trim() === "Neplatitor TVA" && (vatPercentage !== 0 || input.lines.some(line => line.vatBasisPoints !== undefined && line.vatBasisPoints !== 0))) return { issued: false, reason: "invalid_vat" };
  if (input.payment) {
    const total = input.lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0) - (input.discountMinor || 0);
    if (!input.payment.reference.trim() || input.payment.reference.length > 240 || !Number.isSafeInteger(input.payment.amountMinor) || input.payment.amountMinor < 0 || Math.round(total) !== input.payment.amountMinor || !Number.isFinite(input.payment.capturedAt)) return { issued: false, reason: "invalid_payment" };
  }

  const tokenBody = new URLSearchParams({
    client_id: env.OBLIO_CLIENT_ID!.trim(),
    client_secret: env.OBLIO_CLIENT_SECRET!.trim(),
  });
  const tokenResponse = await fetch(`${API_ROOT}/authorize/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: tokenBody.toString(),
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) return { issued: false, reason: "token_failed", status: tokenResponse.status };
  const tokenPayload = await tokenResponse.json() as { access_token?: string };
  if (!tokenPayload.access_token) return { issued: false, reason: "token_failed", status: tokenResponse.status };

  const invoiceResponse = await fetch(`${API_ROOT}/docs/invoice`, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
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
      issueDate: fiscalDate(input.issuedAt),
      ...(input.payment && input.payment.amountMinor > 0 ? {
        collectDate: fiscalDate(input.payment.capturedAt),
        collect: { type: "Card", documentNumber: input.payment.reference, value: input.payment.amountMinor / 100 },
      } : {}),
      seriesName: env.OBLIO_SERIES!.trim(),
      currency: input.currency.toUpperCase(),
      orderNumber: input.orderId,
      idempotencyKey: `avyron-${input.orderId}`,
      sendEmail: env.OBLIO_SEND_EMAIL_ENABLED === "true" && Boolean(input.buyer.email),
      products: [...input.lines.map((line) => ({
        name: line.name,
        ...(line.code ? { code: line.code } : {}),
        price: line.unitPriceMinor / 100,
        measuringUnit: line.unitLabel || "buc",
        currency: input.currency.toUpperCase(),
        vatName: env.OBLIO_VAT_NAME!.trim(),
        vatPercentage: line.vatBasisPoints===undefined?vatPercentage:line.vatBasisPoints/100,
        vatIncluded: true,
        quantity: line.quantity,
        productType: "Serviciu",
        save: 0,
      })), ...(input.discountMinor && input.discountMinor > 0 ? [{ name: input.discountLabel || "Reducere aplicată", discountType: "valoric", discount: input.discountMinor / 100, discountAllAbove: 1 }] : [])],
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
  if (!number || series !== env.OBLIO_SERIES!.trim()) return { issued: false, reason: "invoice_failed", status: invoiceResponse.status };
  return {
    issued: true,
    providerId: `${series}-${number}`,
    series,
    number,
    documentUrl: typeof data.link === "string" && /^https:\/\//.test(data.link) ? data.link : null,
  };
}
