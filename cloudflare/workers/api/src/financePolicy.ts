export const FINANCE_STATUSES = ["active", "free", "trial", "paused", "expired", "cancelled", "payment_due", "overdue", "needs_configuration", "archived"] as const;
export const BILLING_TYPES = ["recurring", "variable", "one_time", "usage_based", "free", "trial"] as const;
export const REVENUE_STATUSES = ["draft", "invoiced", "sent", "partially_paid", "paid", "overdue", "cancelled", "refunded", "archived"] as const;
export const FINANCE_CURRENCIES = ["RON", "EUR", "USD"] as const;

type Valid<T> = { ok: true; value: T };
type Invalid = { ok: false; code: string; field?: string };

const text = (value: unknown, max: number, required = false) => {
  if (value === undefined || value === null) return required ? false : null;
  if (typeof value !== "string" || value.length > max) return false;
  const normalized = value.trim();
  return required && !normalized ? false : normalized || null;
};
const integer = (value: unknown, min = 0, nullable = true) => {
  if ((value === undefined || value === null || value === "") && nullable) return null;
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized >= min ? normalized : false;
};

export type ExpenseWrite = {
  vendorId: string; serviceName: string; category: string; subcategory: string | null;
  description: string; status: string; billingType: string; billingCycle: string | null;
  currency: string; netAmountMinor: number | null; vatAmountMinor: number | null;
  grossAmountMinor: number | null; exchangeRateMicros: number | null; amountRonMinor: number | null;
  futureAmountMinor: number | null; invoiceNumber: string | null; invoiceDate: number | null;
  dueDate: number | null; paidDate: number | null; nextBillingDate: number | null;
  trialEnd: number | null; freePeriodEnd: number | null; projectId: string | null;
  clientId: string | null; paymentAccountId: string | null; paymentMethodId: string | null;
  notes: string; source: "manual" | "api_sync" | "import" | "system_generated";
};

export function validateExpenseWrite(input: unknown): Valid<ExpenseWrite> | Invalid {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, code: "bad_request" };
  const body = input as Record<string, unknown>;
  const vendorId = text(body.vendorId, 100, true);
  const serviceName = text(body.serviceName, 180, true);
  const category = text(body.category, 80, true);
  if (vendorId === false || serviceName === false || category === false) return { ok: false, code: "invalid_required_field" };
  const status = String(body.status || "needs_configuration");
  const billingType = String(body.billingType || "recurring");
  const cycle = body.billingCycle == null || body.billingCycle === "" ? null : String(body.billingCycle);
  const currency = String(body.currency || "RON").toUpperCase();
  if (!(FINANCE_STATUSES as readonly string[]).includes(status)) return { ok: false, code: "invalid_status", field: "status" };
  if (!(BILLING_TYPES as readonly string[]).includes(billingType)) return { ok: false, code: "invalid_billing_type", field: "billingType" };
  if (cycle && !["monthly", "quarterly", "yearly", "custom"].includes(cycle)) return { ok: false, code: "invalid_billing_cycle", field: "billingCycle" };
  if (!/^[A-Z]{3,8}$/.test(currency)) return { ok: false, code: "invalid_currency", field: "currency" };
  const moneyFields = ["netAmountMinor", "vatAmountMinor", "grossAmountMinor", "exchangeRateMicros", "amountRonMinor", "futureAmountMinor"] as const;
  const amounts: Record<string, number | null> = {};
  for (const field of moneyFields) {
    const value = integer(body[field], field === "exchangeRateMicros" ? 1 : 0);
    if (value === false) return { ok: false, code: "invalid_amount", field };
    amounts[field] = value;
  }
  if (amounts.grossAmountMinor !== null && amounts.netAmountMinor !== null && amounts.vatAmountMinor !== null && amounts.grossAmountMinor !== amounts.netAmountMinor + amounts.vatAmountMinor) {
    return { ok: false, code: "gross_amount_mismatch", field: "grossAmountMinor" };
  }
  const timestamps: Record<string, number | null> = {};
  for (const field of ["invoiceDate", "dueDate", "paidDate", "nextBillingDate", "trialEnd", "freePeriodEnd"] as const) {
    const value = integer(body[field], 0);
    if (value === false) return { ok: false, code: "invalid_date", field };
    timestamps[field] = value;
  }
  const optional = (field: string, max: number) => {
    const value = text(body[field], max);
    return value === false ? false : value;
  };
  const description = optional("description", 4_000), notes = optional("notes", 8_000);
  if (description === false || notes === false) return { ok: false, code: "invalid_text" };
  const source = String(body.source || "manual");
  if (!["manual", "api_sync", "import", "system_generated"].includes(source)) return { ok: false, code: "invalid_source" };
  return { ok: true, value: {
    vendorId, serviceName, category, subcategory: optional("subcategory", 100) || null,
    description: description || "", status, billingType, billingCycle: cycle, currency,
    netAmountMinor: amounts.netAmountMinor, vatAmountMinor: amounts.vatAmountMinor,
    grossAmountMinor: amounts.grossAmountMinor, exchangeRateMicros: amounts.exchangeRateMicros,
    amountRonMinor: amounts.amountRonMinor, futureAmountMinor: amounts.futureAmountMinor,
    invoiceNumber: optional("invoiceNumber", 120) || null, ...timestamps,
    projectId: optional("projectId", 100) || null, clientId: optional("clientId", 100) || null,
    paymentAccountId: optional("paymentAccountId", 100) || null,
    paymentMethodId: optional("paymentMethodId", 100) || null, notes: notes || "", source: source as ExpenseWrite["source"],
  } as ExpenseWrite };
}

export function maskPaymentMethod(input: { alias: string; provider: string; last4?: string | null; cardholder_name?: string | null; expiry_month?: number | null; expiry_year?: number | null }) {
  const last4 = input.last4 && /^\d{4}$/.test(input.last4) ? input.last4 : null;
  return { alias: input.alias, provider: input.provider, display: last4 ? `•••• ${last4}` : "Fără card asociat", last4, cardholder_name: input.cardholder_name || null, expiry_month: input.expiry_month || null, expiry_year: input.expiry_year || null };
}

export type CostGuardInput = {
  quotaTotal: number | null; quotaUsed: number; requestedUnits: number;
  estimatedCostMinor: number; budgetRemainingMinor: number | null;
  hardStopBeforePaid: boolean; maxRequestCostMinor: number | null;
  providerStatus: string; permission: boolean;
};
export type CostGuardDecision = { decision: "allowed" | "approval_required" | "waiting_for_budget_approval" | "blocked"; reason: string; projectedQuotaUsed: number };

export function evaluateCostGuard(input: CostGuardInput): CostGuardDecision {
  const projectedQuotaUsed = input.quotaUsed + input.requestedUnits;
  if (!input.permission) return { decision: "blocked", reason: "agent_provider_not_allowed", projectedQuotaUsed };
  if (!["active", "warning"].includes(input.providerStatus)) return { decision: "blocked", reason: "provider_unavailable", projectedQuotaUsed };
  if (input.quotaTotal !== null && projectedQuotaUsed > input.quotaTotal && input.hardStopBeforePaid) return { decision: "blocked", reason: "free_quota_exhausted", projectedQuotaUsed };
  if (input.budgetRemainingMinor !== null && input.estimatedCostMinor > input.budgetRemainingMinor) return { decision: "waiting_for_budget_approval", reason: "budget_exceeded", projectedQuotaUsed };
  if (input.maxRequestCostMinor !== null && input.estimatedCostMinor > input.maxRequestCostMinor) return { decision: "approval_required", reason: "request_cost_threshold", projectedQuotaUsed };
  return { decision: "allowed", reason: input.estimatedCostMinor === 0 ? "free_first" : "within_budget", projectedQuotaUsed };
}

export const isPossibleDuplicate = (candidate: { vendorId: string; invoiceNumber?: string | null; grossAmountMinor?: number | null; invoiceDate?: number | null }, existing: Array<typeof candidate>) =>
  existing.some((item) => item.vendorId === candidate.vendorId && (
    (candidate.invoiceNumber && item.invoiceNumber === candidate.invoiceNumber) ||
    (candidate.grossAmountMinor !== null && candidate.grossAmountMinor !== undefined && item.grossAmountMinor === candidate.grossAmountMinor && item.invoiceDate === candidate.invoiceDate)
  ));

export function projectionFromRecurring(monthlyMinor: number, variableAverageMinor: number, months: 3 | 6 | 12) {
  const monthly = Math.max(0, monthlyMinor) + Math.max(0, variableAverageMinor);
  return { months, monthlyMinor: monthly, projectedMinor: monthly * months, annualizedRecurringMinor: Math.max(0, monthlyMinor) * 12 };
}

export function anomalyFromAverage(currentMinor: number, averageMinor: number) {
  if (averageMinor <= 0) return { anomalous: false, changeBasisPoints: null };
  const changeBasisPoints = Math.round(((currentMinor - averageMinor) / averageMinor) * 10_000);
  return { anomalous: changeBasisPoints > 3_000, changeBasisPoints };
}
