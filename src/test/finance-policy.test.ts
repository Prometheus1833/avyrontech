import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  anomalyFromAverage, evaluateCostGuard, isPossibleDuplicate, maskPaymentMethod,
  projectionFromRecurring, validateExpenseWrite,
} from "../../cloudflare/workers/api/src/financePolicy";

const validExpense = {
  vendorId: "fin_vendor_claude", serviceName: "Claude API Usage", category: "ai",
  status: "needs_configuration", billingType: "usage_based", billingCycle: "monthly",
  currency: "USD", grossAmountMinor: null, source: "manual",
};

describe("financial domain policy", () => {
  it("validates expense amounts and rejects inconsistent VAT totals or injection-shaped fields safely", () => {
    expect(validateExpenseWrite(validExpense).ok).toBe(true);
    expect(validateExpenseWrite({ ...validExpense, netAmountMinor: 1000, vatAmountMinor: 190, grossAmountMinor: 999 })).toMatchObject({ ok: false, code: "gross_amount_mismatch" });
    const injection = validateExpenseWrite({ ...validExpense, serviceName: "x'); DROP TABLE financial_expenses; --" });
    expect(injection.ok).toBe(true); // accepted as inert text; D1 writes use bound parameters.
    expect(validateExpenseWrite({ ...validExpense, currency: "RON;DROP" })).toMatchObject({ ok: false, code: "invalid_currency" });
  });

  it("masks cards and never returns full-number fields", () => {
    const masked = maskPaymentMethod({ alias: "AVYRON SaaS", provider: "Revolut", last4: "4242", cardholder_name: "AVYRON" });
    expect(masked.display).toBe("•••• 4242");
    expect(masked).not.toHaveProperty("number");
    expect(maskPaymentMethod({ alias: "No card", provider: "Bank", last4: "123456" }).last4).toBeNull();
  });

  it("enforces FREE FIRST, quota hard stops, budget approval and least privilege", () => {
    const base = { quotaTotal: 100, quotaUsed: 20, requestedUnits: 10, estimatedCostMinor: 0, budgetRemainingMinor: 500, hardStopBeforePaid: true, maxRequestCostMinor: 100, providerStatus: "active", permission: true };
    expect(evaluateCostGuard(base)).toMatchObject({ decision: "allowed", reason: "free_first" });
    expect(evaluateCostGuard({ ...base, quotaUsed: 95 })).toMatchObject({ decision: "blocked", reason: "free_quota_exhausted" });
    expect(evaluateCostGuard({ ...base, estimatedCostMinor: 600 })).toMatchObject({ decision: "waiting_for_budget_approval" });
    expect(evaluateCostGuard({ ...base, estimatedCostMinor: 150 })).toMatchObject({ decision: "approval_required" });
    expect(evaluateCostGuard({ ...base, permission: false })).toMatchObject({ decision: "blocked", reason: "agent_provider_not_allowed" });
    expect(evaluateCostGuard({ ...base, providerStatus: "error" })).toMatchObject({ decision: "blocked" });
  });

  it("detects duplicate invoices, anomalous increases and computes deterministic projections", () => {
    const existing = [{ vendorId: "v1", invoiceNumber: "INV-1", grossAmountMinor: 1000, invoiceDate: 10 }];
    expect(isPossibleDuplicate({ vendorId: "v1", invoiceNumber: "INV-1" }, existing)).toBe(true);
    expect(isPossibleDuplicate({ vendorId: "v1", grossAmountMinor: 1000, invoiceDate: 10 }, existing)).toBe(true);
    expect(anomalyFromAverage(1400, 1000)).toMatchObject({ anomalous: true, changeBasisPoints: 4000 });
    expect(projectionFromRecurring(2000, 500, 6)).toEqual({ months: 6, monthlyMinor: 2500, projectedMinor: 15000, annualizedRecurringMinor: 24000 });
  });

  it("keeps the migration non-destructive, indexed and free of sensitive card columns", () => {
    const sql = readFileSync(resolve(process.cwd(), "cloudflare/d1/migrations/0018_financial_control_plane.sql"), "utf8");
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
    expect(sql).toContain("financial_audit_events");
    expect(sql).toContain("financial_provider_quotas");
    expect(sql).toContain("uq_financial_expense_invoice");
    expect(sql).not.toMatch(/\b(cvv|cvc|pin|full_card_number|card_number)\b/i);
    expect(sql).toContain("needs_configuration");
  });

  it("routes every Workers AI execution through the server-side financial guard", () => {
    const chat = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/aiOs.ts"), "utf8");
    const production = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/aiProjects.ts"), "utf8");
    const schema = readFileSync(resolve(process.cwd(), "cloudflare/d1/migrations/0018_financial_control_plane.sql"), "utf8");
    expect(chat).toContain("await reserveAiCost(");
    expect(production).toContain("await reserveAiCost(");
    expect(schema).toContain("financial_agent_provider_policies");
    expect(schema).toContain("fin_quota_cloudflare_ai");
    expect(schema).toContain("'needs_configuration'");
  });
});
