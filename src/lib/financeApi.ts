import { cfAuth } from "./cfAuth";
import { apiUrl } from "./apiBase";

export type FinanceOverview = {
  period: { from: number; to: number };
  kpis: {
    expensesMinor: number; revenuesMinor: number; operatingProfitEstimateMinor: number;
    activeSubscriptions: number; aiCostMinor: number; advertisingMinor: number;
    costPerLeadMinor: number | null; invoicesPayable: number; invoicesReceivable: number;
    nextPayment: { vendor: string; date: number; amount: number | null; currency: string } | null;
    budgetLimitMinor: number; budgetCount: number; freeTierSavingsMinor: number | null; criticalAlerts: number;
  };
  notice: string;
};

export type FinanceExpense = {
  id: string; vendor_id: string; vendor_name: string; service_name: string; category: string;
  subcategory: string | null; description: string; status: string; billing_type: string;
  billing_cycle: string | null; currency: string; net_amount_minor: number | null;
  vat_amount_minor: number | null; gross_amount_minor: number | null; amount_ron_minor: number | null;
  future_amount_minor: number | null; invoice_number: string | null; invoice_date: number | null;
  due_date: number | null; paid_date: number | null; next_billing_date: number | null;
  trial_end: number | null; free_period_end: number | null; project_id: string | null;
  client_id: string | null; payment_account_id: string | null; payment_method_id: string | null;
  notes: string; source: string; updated_at: number;
};

export type FinanceDocument = { id: string; document_type: string; file_name: string; content_type: string; size_bytes: number; version: number; status: string; created_at: number };
export type FinanceExpenseDetail = {
  expense: FinanceExpense; billing: Record<string, unknown>[]; allocations: Record<string, unknown>[];
  prices: Record<string, unknown>[]; metrics: Record<string, unknown>[];
  documents: FinanceDocument[]; history: Array<{ action: string; source: string; created_at: number }>;
};

export type FinanceRevenue = {
  id: string; revenue_type: string; client_id: string | null; project_id: string | null;
  company_name: string | null; project_name: string | null; service_name: string;
  invoice_number: string | null; status: string; currency: string; gross_amount_minor: number | null;
  amount_ron_minor: number | null; invoice_date: number | null; due_date: number | null; payment_date: number | null;
};

export type FinanceAccount = { id: string; name: string; institution: string; currency: string; account_type: string; internal_alias: string; iban_last4: string | null; status: string; balance_minor: number | null; purpose: string };
export type FinancePaymentMethod = { id: string; account_id: string | null; provider: string; alias: string; display: string; last4: string | null; expiry_month: number | null; expiry_year: number | null; status: string; purpose: string };
export type FinanceBudget = { id: string; name: string; category: string; period_start: number; period_end: number; currency: string; limit_minor: number; hard_stop: number; status: string };
export type FinanceQuota = { id: string; vendor_id: string; vendor_name: string; plan: string | null; quota_type: string; quota_total: number | null; quota_used: number; warning_threshold_basis_points: number; hard_stop_before_paid: number; status: string; reset_date: number | null };
export type FinanceAgentPolicy = { agent_slug: string; agent_name: string; vendor_id: string; vendor_name: string; status: string; daily_budget_minor: number | null; monthly_budget_minor: number | null; max_request_cost_minor: number | null; currency: string };
export type FinanceAlert = { id: string; kind: string; severity: string; status: string; title: string; message: string; detected_at: number };
export type FinanceAnalytics = { categories: Array<{category:string;total_minor:number}>; monthlyRecurringMinor:number; monthlyVariableAverageMinor:number; projections:Array<{months:3|6|12;monthlyMinor:number;projectedMinor:number;annualizedRecurringMinor:number}>; clients:Array<{id:string;company_name:string;revenue_minor:number;direct_cost_minor:number;estimated_contribution_minor:number}>; projects:Array<{id:string;name:string;revenue_minor:number;direct_cost_minor:number;estimated_contribution_minor:number}>; notice:string };

export const financeApi = {
  overview: (from?: number, to?: number) => cfAuth.request<FinanceOverview>(`/api/finance/overview${from && to ? `?from=${from}&to=${to}` : ""}`),
  config: () => cfAuth.request<{ vendors: Array<{ id: string; name: string; category: string; status: string }>; projects: Array<{ id: string; name: string }>; clients: Array<{ id: string; company_name: string }> }>("/api/finance/config"),
  expenses: (params = "") => cfAuth.request<{ data: FinanceExpense[]; total: number }>(`/api/finance/expenses${params ? `?${params}` : ""}`),
  expense: (id: string) => cfAuth.request<FinanceExpenseDetail>(`/api/finance/expenses/${id}`),
  createExpense: (input: Record<string, unknown>) => cfAuth.request<{ id: string }>("/api/finance/expenses", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(input) }),
  revenues: () => cfAuth.request<{ data: FinanceRevenue[] }>("/api/finance/revenues"),
  createRevenue: (input: Record<string, unknown>) => cfAuth.request<{ id: string }>("/api/finance/revenues", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(input) }),
  accounts: () => cfAuth.request<{ accounts: FinanceAccount[]; methods: FinancePaymentMethod[] }>("/api/finance/accounts"),
  createAccount: (input: Record<string, unknown>) => cfAuth.request<{ id: string }>("/api/finance/accounts", { method: "POST", body: JSON.stringify(input) }),
  createPaymentMethod: (input: Record<string, unknown>) => cfAuth.request<{ id: string }>("/api/finance/payment-methods", { method: "POST", body: JSON.stringify(input) }),
  budgets: () => cfAuth.request<{ budgets: FinanceBudget[]; quotas: FinanceQuota[]; policies: FinanceAgentPolicy[] }>("/api/finance/budgets"),
  createBudget: (input: Record<string, unknown>) => cfAuth.request<{ id: string }>("/api/finance/budgets", { method: "POST", body: JSON.stringify(input) }),
  updateQuota: (id: string, input: Record<string, unknown>) => cfAuth.request<{ ok: true }>(`/api/finance/quotas/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  updateAgentPolicy: (agentSlug: string, vendorId: string, input: Record<string, unknown>) => cfAuth.request<{ ok: true }>(`/api/finance/agent-policies/${encodeURIComponent(agentSlug)}/${encodeURIComponent(vendorId)}`, { method: "PUT", body: JSON.stringify(input) }),
  alerts: () => cfAuth.request<{ data: FinanceAlert[] }>("/api/finance/alerts"),
  scanAlerts: () => cfAuth.request<{ ok: true }>("/api/finance/alerts/scan", { method: "POST" }),
  updateAlert: (id: string, status: "acknowledged" | "resolved" | "dismissed") => cfAuth.request<{ ok: true }>(`/api/finance/alerts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  uploadDocument: (resourceType: "expense" | "revenue", resourceId: string, file: File, documentType = "invoice") => {
    const form = new FormData();
    form.set("resourceType", resourceType); form.set("resourceId", resourceId); form.set("documentType", documentType); form.set("file", file);
    return cfAuth.request<{ id: string; sha256: string }>("/api/finance/documents", { method: "POST", body: form });
  },
  downloadDocument: async (id: string, fileName: string) => {
    let token = cfAuth.getToken();
    if (!token && await cfAuth.refresh()) token = cfAuth.getToken();
    const response = await fetch(apiUrl(`/api/finance/documents/${encodeURIComponent(id)}/content`), { headers: token ? { authorization: `Bearer ${token}` } : {}, credentials: "include" });
    if (!response.ok) throw new Error(`download_failed_${response.status}`);
    const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
    link.href = url; link.download = fileName; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
  audit: () => cfAuth.request<{ data: Array<{ id: string; action: string; resource_type: string; resource_id: string | null; source: string; request_id: string | null; created_at: number }> }>("/api/finance/audit"),
  analytics: () => cfAuth.request<FinanceAnalytics>("/api/finance/analytics"),
};
