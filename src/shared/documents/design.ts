import type { CommercialLine, DocumentPayload, DocumentNode } from "./model";

// Existing labels metadata keeps the payload readable by older API clients.
export const isModernDocument = (payload: DocumentPayload) => payload.labels?.__avyron_design === "2026";
export const DOCUMENT_RENDERER = "avyron-2026-r1";
export const isAgencyDocument = (payload: DocumentPayload) => isModernDocument(payload) && payload.labels?.__avyron_edition === '2026-11';
export const documentRenderer = (payload: DocumentPayload) => isAgencyDocument(payload) ? 'avyron-2026-r2' : isModernDocument(payload) ? DOCUMENT_RENDERER : 'classic';

export const readableField = (token: string, labels: Record<string,string>) =>
  labels[token.replace(/^\{\{|\}\}$/g, "")] || "Câmp de completat";

/** Render-only copy: unfilled drafts stay explicit without exposing variable codes. */
export function readableDocumentDraft(payload: DocumentPayload): DocumentPayload {
  const text = (value: string) => value.replace(/\{\{[a-zA-Z0-9_.-]+\}\}/g, token => `[De completat: ${readableField(token, payload.labels)}]`);
  const visit = (node: DocumentNode): DocumentNode => ({ ...node, ...(node.text !== undefined ? { text: text(node.text) } : {}), ...(node.content ? { content: node.content.map(visit) } : {}) });
  return { ...payload, title: text(payload.title), header: text(payload.header), footer: text(payload.footer), body: visit(payload.body) };
}

/** Shared by the reader and real PDF/Word exporters. No external fonts or URLs. */
export const DOCUMENT_DESIGN = {
  ink: "17243B",
  accent: "6550A3",
  muted: "526078",
  tint: "F2F0F8",
  rule: "DCE1ED",
} as const;

export const billingLabel = (cycle: string) => {
  const labels: Record<string, string> = { unverified: "Recurență de confirmat", unreviewed: "Recurență de confirmat", one_time: "O singură dată", monthly: "Lunar", yearly: "Anual", annual: "Anual", quarterly: "Trimestrial", weekly: "Săptămânal" };
  return labels[cycle] || cycle;
};

/** A recurring amount must never be added to an implementation fee. */
export function commercialTotals(lines: CommercialLine[]) {
  const groups = new Map<string, { currency: string; cycle: string; net: number; tax: number; gross: number; catalog: number | null }>();
  for (const line of lines) {
    const key = `${line.currency}:${line.billingCycle}`;
    const group = groups.get(key) || { currency: line.currency, cycle: line.billingCycle, net: 0, tax: 0, gross: 0, catalog: 0 };
    const net = line.quantity * line.offeredPriceMinor;
    const gross = Math.round(net * (1 + line.vatBasisPoints / 10000));
    group.net += net;
    group.tax += gross - net;
    group.gross += gross;
    group.catalog = group.catalog === null || line.catalogPriceMinor === null ? null : group.catalog + line.quantity * line.catalogPriceMinor;
    groups.set(key, group);
  }
  return [...groups.values()];
}

export const documentMoney = (minor: number, currency: string) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(minor / 100);

export const commercialTotalReady = (lines: CommercialLine[], total: { currency: string; cycle: string }) =>
  !["unreviewed", "unverified"].includes(total.cycle) && lines.filter(line => line.currency === total.currency && line.billingCycle === total.cycle).every(line => line.priceConfirmed !== false && line.taxVerified !== false);
