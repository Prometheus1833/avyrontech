export type AgentActionClass = "read" | "write" | "external" | "financial" | "publish";
export type ToolMode = "disabled" | "read" | "approval" | "execute";

export const DEFAULT_AGENT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const AGENT_MODEL_ALIASES: Readonly<Record<string, string>> = {
  "@cf/meta/llama-3.1-8b-instruct": DEFAULT_AGENT_MODEL,
};

/** Keep stored legacy configurations operational after a provider deprecation. */
export const resolveAgentModel = (model: string) => AGENT_MODEL_ALIASES[model] || model;

export type AgentPolicyInput = {
  actionClass: AgentActionClass;
  capability: string;
  toolStatus: "disabled" | "active" | "retired";
  toolMode: ToolMode;
  killSwitchEnabled: boolean;
  budgetExhausted: boolean;
  approvalStatus?: "pending" | "approved" | "rejected" | "expired" | "cancelled";
};

export type AgentPolicyDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  reason:
    | "allowed"
    | "kill_switch"
    | "budget_exhausted"
    | "prohibited_capability"
    | "tool_inactive"
    | "tool_disabled"
    | "read_only_policy"
    | "approval_required"
    | "approval_rejected";
};

// AI-generated input must never gain generic execution, arbitrary networking,
// direct secret access or raw database access.
const PROHIBITED_CAPABILITIES = new Set([
  "shell",
  "code_execution",
  "raw_sql",
  "arbitrary_url",
  "secret_read",
  "secret_write",
]);

const approvalRequiredFor = (actionClass: AgentActionClass) =>
  actionClass === "external" || actionClass === "financial" || actionClass === "publish";

export function evaluateAgentAction(input: AgentPolicyInput): AgentPolicyDecision {
  if (input.killSwitchEnabled) return { allowed: false, requiresApproval: false, reason: "kill_switch" };
  if (input.budgetExhausted) return { allowed: false, requiresApproval: false, reason: "budget_exhausted" };
  if (PROHIBITED_CAPABILITIES.has(input.capability)) {
    return { allowed: false, requiresApproval: false, reason: "prohibited_capability" };
  }
  if (input.toolStatus !== "active") return { allowed: false, requiresApproval: false, reason: "tool_inactive" };
  if (input.toolMode === "disabled") return { allowed: false, requiresApproval: false, reason: "tool_disabled" };
  if (input.toolMode === "read" && input.actionClass !== "read") {
    return { allowed: false, requiresApproval: false, reason: "read_only_policy" };
  }

  const requiresApproval = input.toolMode === "approval" || approvalRequiredFor(input.actionClass);
  if (!requiresApproval) return { allowed: true, requiresApproval: false, reason: "allowed" };
  if (input.approvalStatus === "approved") return { allowed: true, requiresApproval: true, reason: "allowed" };
  if (input.approvalStatus && input.approvalStatus !== "pending") {
    return { allowed: false, requiresApproval: true, reason: "approval_rejected" };
  }
  return { allowed: false, requiresApproval: true, reason: "approval_required" };
}
