/** Public API facts and AVYRON-specific gates. Never include credentials in this registry. */
export type FinancialProviderKey = "stripe" | "oblio" | "revolut_merchant";
export type FinancialSyncPhase = "not_connected" | "configuration_only" | "awaiting_approval" | "verification_required" | "connected_unsynced" | "synced" | "stale" | "error";
export type FinancialConnectionRecord = { provider: string; status: string; last_sync_at: number | null; last_error_code: string | null };

export const FINANCIAL_PROVIDER_PLAYBOOKS = [
  {
    provider: "stripe", title: "Stripe", purpose: "Checkout și abonamente; nu este evidența bancară.",
    authentication: "Cheie API în secretul Worker + secretul webhook separat pentru test/live.",
    intake: "Webhook semnat pe corpul brut; deduplicare după event ID și verificarea resursei/comenzii. Evenimentele pot veni în altă ordine.",
    reconciliation: "Evenimentele eșuate se reiau după event ID; plățile confirmate, refundurile și payouturile se reconciliază separat, fără a presupune decontarea bancară.",
    gate: "Verificarea identității și dreptul de încasare în cont, test mode, webhook live și MFA pentru operațiuni interne.",
    cadence: "Webhook la eveniment; reconciliere periodică limitată și reluare idempotentă.",
    sources: ["https://docs.stripe.com/webhooks", "https://docs.stripe.com/api/idempotent_requests"],
  },
  {
    provider: "oblio", title: "Oblio", purpose: "Facturi și stare fiscală; plata procesatorului nu echivalează cu factura emisă.",
    authentication: "OAuth client_id/client_secret păstrate doar în secretele Worker; tokenul expiră și se reînnoiește.",
    intake: "Emitere numai după confirmarea plății și aprobarea seriei/TVA. Folosește orderNumber și idempotencyKey stabile per comandă.",
    reconciliation: "Citește factura după serie+număr și listează documentele paginat (max. 100/pagină); verifică separat încasarea și e-Factura.",
    gate: "Seria, regimul TVA, datele juridice și trimiterea în SPV sunt confirmate; emiterea și e-mailul rămân comutatoare separate.",
    cadence: "La plată confirmată; reconciliere periodică paginată. Sub 30 emiteri/100 s și 30 citiri/10 s.",
    sources: ["https://www.oblio.eu/api/"],
  },
  {
    provider: "revolut_merchant", title: "Revolut Merchant", purpose: "Checkout și abonamente Revolut; nu dovedește soldul din Revolut Business.",
    authentication: "Cheie Merchant și secret de webhook distincte de Business API.",
    intake: "Eveniment semnat, apoi citire server-to-server a comenzii înainte de îndeplinire.",
    reconciliation: "Comenzi/abonamente și cicluri verificate separat; payouturile nu devin automat tranzacții bancare confirmate.",
    gate: "Contul Merchant, versiunea API, webhook și planurile sunt testate înainte de activare.",
    cadence: "Webhook la eveniment; verificare periodică a abonamentelor și ciclurilor.",
    sources: ["https://developer.revolut.com/docs/api/merchant", "https://developer.revolut.com/docs/guides/merchant/monitor-and-observe/webhooks/verify-the-payload-signature"],
  },
] as const;

export function financialSyncPhase(input: {
  provider: FinancialProviderKey;
  configured: boolean;
  approved: boolean;
  connection?: FinancialConnectionRecord | null;
  now: number;
}): FinancialSyncPhase {
  if (!input.configured) return "not_connected";
  if (!input.approved) return "awaiting_approval";
  const connection = input.connection;
  if (!connection) return "configuration_only";
  if (connection.status === "error" || connection.last_error_code) return "error";
  if (connection.status !== "connected") return "verification_required";
  if (!connection.last_sync_at) return "connected_unsynced";
  if (connection.last_sync_at > input.now) return "verification_required";
  return input.now - connection.last_sync_at > 24 * 60 * 60 * 1000 ? "stale" : "synced";
}
