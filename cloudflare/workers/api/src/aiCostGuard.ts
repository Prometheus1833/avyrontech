import { evaluateCostGuard, type CostGuardDecision } from "./financePolicy";
import { now, sha256 } from "./security";

type ReserveInput = {
  db: D1Database;
  agentSlug: string;
  vendorId: string;
  operation: string;
  requestedUnits: number;
  estimatedCostMinor: number;
  idempotencyKey: string;
  requestId?: string | null;
  projectId?: string | null;
  clientId?: string | null;
};

type PolicyRow = {
  status: string;
  daily_budget_minor: number | null;
  monthly_budget_minor: number | null;
  max_request_cost_minor: number | null;
  currency: string;
};

type QuotaRow = {
  id: string;
  quota_total: number | null;
  quota_used: number;
  hard_stop_before_paid: number;
  status: string;
};

export type AiCostReservation = CostGuardDecision & { quotaId: string | null };

const safeInteger = (value: number) => Number.isSafeInteger(value) && value >= 0;

export async function reserveAiCost(input: ReserveInput): Promise<AiCostReservation> {
  if (!safeInteger(input.requestedUnits) || !safeInteger(input.estimatedCostMinor)) {
    return { decision: "blocked", reason: "invalid_cost_estimate", projectedQuotaUsed: 0, quotaId: null };
  }

  const idempotencyHash = await sha256(input.idempotencyKey);
  const previous = await input.db.prepare(
    "SELECT quota_id,decision,reason,units FROM financial_usage_events WHERE idempotency_key_hash=?",
  ).bind(idempotencyHash).first<{ quota_id: string | null; decision: CostGuardDecision["decision"] | "failed"; reason: string; units: number }>();
  if (previous) {
    return {
      decision: previous.decision === "failed" ? "blocked" : previous.decision,
      reason: previous.reason,
      projectedQuotaUsed: previous.units,
      quotaId: previous.quota_id,
    };
  }

  const policy = await input.db.prepare(
    `SELECT status,daily_budget_minor,monthly_budget_minor,max_request_cost_minor,currency
       FROM financial_agent_provider_policies
      WHERE agent_slug=? AND vendor_id=? AND status<>'archived'`,
  ).bind(input.agentSlug, input.vendorId).first<PolicyRow>();
  const quota = await input.db.prepare(
    `SELECT id,quota_total,quota_used,hard_stop_before_paid,status
       FROM financial_provider_quotas
      WHERE vendor_id=? AND status<>'archived'
      ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,updated_at DESC LIMIT 1`,
  ).bind(input.vendorId).first<QuotaRow>();

  let decision: CostGuardDecision;
  if (!policy || policy.status !== "active") {
    decision = { decision: "waiting_for_budget_approval", reason: "agent_provider_policy_not_configured", projectedQuotaUsed: quota?.quota_used || 0 };
  } else if (!quota || quota.quota_total === null || !["active", "warning"].includes(quota.status)) {
    decision = { decision: "waiting_for_budget_approval", reason: "provider_quota_not_configured", projectedQuotaUsed: quota?.quota_used || 0 };
  } else {
    const timestamp = now();
    const dayStart = new Date(timestamp); dayStart.setUTCHours(0, 0, 0, 0);
    const monthStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1)).getTime();
    const [daily, monthly, financial] = await Promise.all([
      input.db.prepare("SELECT COALESCE(SUM(estimated_cost_minor),0) total FROM financial_usage_events WHERE agent_slug=? AND vendor_id=? AND decision='allowed' AND created_at>=?").bind(input.agentSlug,input.vendorId,dayStart.getTime()).first<{total:number}>(),
      input.db.prepare("SELECT COALESCE(SUM(estimated_cost_minor),0) total FROM financial_usage_events WHERE agent_slug=? AND vendor_id=? AND decision='allowed' AND created_at>=?").bind(input.agentSlug,input.vendorId,monthStart).first<{total:number}>(),
      input.db.prepare(`SELECT MIN(limit_minor-COALESCE((SELECT SUM(estimated_cost_minor) FROM financial_usage_events usage WHERE usage.created_at BETWEEN budget.period_start AND budget.period_end AND usage.decision='allowed' AND (budget.agent_slug IS NULL OR usage.agent_slug=budget.agent_slug)),0)) remaining FROM financial_budgets budget WHERE budget.status='active' AND budget.category IN ('general','ai') AND budget.period_start<=? AND budget.period_end>? AND (budget.agent_slug IS NULL OR budget.agent_slug=?)`).bind(timestamp,timestamp,input.agentSlug).first<{remaining:number|null}>(),
    ]);
    const remaining = [
      policy.daily_budget_minor === null ? null : policy.daily_budget_minor - (daily?.total || 0),
      policy.monthly_budget_minor === null ? null : policy.monthly_budget_minor - (monthly?.total || 0),
      financial?.remaining ?? null,
    ].filter((value): value is number => value !== null);
    decision = evaluateCostGuard({
      quotaTotal: quota.quota_total,
      quotaUsed: quota.quota_used,
      requestedUnits: input.requestedUnits,
      estimatedCostMinor: input.estimatedCostMinor,
      budgetRemainingMinor: remaining.length ? Math.max(0, Math.min(...remaining)) : null,
      hardStopBeforePaid: Boolean(quota.hard_stop_before_paid),
      maxRequestCostMinor: policy.max_request_cost_minor,
      providerStatus: quota.status,
      permission: true,
    });
  }

  const timestamp = now();
  if (decision.decision === "allowed" && quota) {
    const reserved = await input.db.prepare(
      `UPDATE financial_provider_quotas SET quota_used=quota_used+?,updated_at=?
        WHERE id=? AND status IN ('active','warning') AND quota_total IS NOT NULL
          AND (quota_used+?<=quota_total OR hard_stop_before_paid=0)`,
    ).bind(input.requestedUnits,timestamp,quota.id,input.requestedUnits).run();
    if ((reserved.meta.changes ?? 0) !== 1) {
      decision = { decision: "blocked", reason: "quota_reservation_race", projectedQuotaUsed: quota.quota_used + input.requestedUnits };
    }
  }

  await input.db.prepare(
    `INSERT INTO financial_usage_events
      (id,vendor_id,quota_id,agent_slug,project_id,client_id,operation,units,
       estimated_cost_minor,currency,decision,reason,idempotency_key_hash,request_id,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    `fuse_${crypto.randomUUID().replace(/-/g, "")}`, input.vendorId, quota?.id || null,
    input.agentSlug, input.projectId || null, input.clientId || null,
    input.operation.slice(0, 120), input.requestedUnits, input.estimatedCostMinor,
    policy?.currency || "RON", decision.decision, decision.reason,
    idempotencyHash, input.requestId || null, timestamp,
  ).run();

  return { ...decision, quotaId: quota?.id || null };
}
