import { describe, expect, it } from "vitest";
import {
  DEFAULT_AGENT_MODEL,
  evaluateAgentAction,
  resolveAgentModel,
} from "../../cloudflare/workers/api/src/agentRuntimePolicy";

const base = {
  actionClass: "read" as const,
  capability: "knowledge_search",
  toolStatus: "active" as const,
  toolMode: "read" as const,
  killSwitchEnabled: false,
  budgetExhausted: false,
};

describe("AI agent runtime policy", () => {
  it("maps retired model identifiers to the supported runtime model", () => {
    expect(resolveAgentModel("@cf/meta/llama-3.1-8b-instruct")).toBe(DEFAULT_AGENT_MODEL);
    expect(resolveAgentModel(DEFAULT_AGENT_MODEL)).toBe(DEFAULT_AGENT_MODEL);
  });

  it("allows a registered read tool inside a read-only policy", () => {
    expect(evaluateAgentAction(base)).toEqual({
      allowed: true,
      requiresApproval: false,
      reason: "allowed",
    });
  });

  it("fails closed for global controls and prohibited generic capabilities", () => {
    expect(evaluateAgentAction({ ...base, killSwitchEnabled: true }).reason).toBe("kill_switch");
    expect(evaluateAgentAction({ ...base, budgetExhausted: true }).reason).toBe("budget_exhausted");
    expect(evaluateAgentAction({ ...base, capability: "raw_sql" }).reason).toBe("prohibited_capability");
    expect(evaluateAgentAction({ ...base, capability: "arbitrary_url" }).reason).toBe("prohibited_capability");
  });

  it("requires an explicit approval for external, financial and publishing actions", () => {
    for (const actionClass of ["external", "financial", "publish"] as const) {
      const pending = evaluateAgentAction({ ...base, actionClass, toolMode: "execute" });
      expect(pending).toMatchObject({ allowed: false, requiresApproval: true, reason: "approval_required" });

      const approved = evaluateAgentAction({ ...base, actionClass, toolMode: "execute", approvalStatus: "approved" });
      expect(approved).toMatchObject({ allowed: true, requiresApproval: true, reason: "allowed" });
    }
  });

  it("does not let a read-only grant perform a write", () => {
    expect(evaluateAgentAction({ ...base, actionClass: "write" }).reason).toBe("read_only_policy");
  });
});
