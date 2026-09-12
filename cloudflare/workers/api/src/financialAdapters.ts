/** Contract only. No provider is called until its OAuth/API connection is approved. */
export interface FinancialProviderAdapter {
  readonly provider: string;
  fetchTransactions(cursor?: string): Promise<{ items: unknown[]; cursor?: string }>;
  fetchInvoices(cursor?: string): Promise<{ items: unknown[]; cursor?: string }>;
  fetchUsage(periodStart: number, periodEnd: number): Promise<unknown[]>;
  fetchSubscription(): Promise<unknown | null>;
  fetchBalance(): Promise<unknown | null>;
  sync(idempotencyKey: string): Promise<{ status: "completed" | "partial" | "failed"; imported: number }>;
}

export const SUPPORTED_FINANCIAL_ADAPTERS = [
  "revolut_business", "fgo", "stripe", "netopia", "google_ads", "meta_ads",
  "openai", "anthropic", "cloudflare", "supabase", "resend", "github", "lovable",
] as const;

export type FinancialAdapterName = (typeof SUPPORTED_FINANCIAL_ADAPTERS)[number];
