import { Agent } from "agents";
import type { Env } from "../types";

export type AvyronAgentRuntimeState = {
  schemaVersion: 1;
  status: "idle" | "running" | "failed";
  agentSlug: string | null;
  conversationId: string | null;
  activeRunId: string | null;
  lastCompletedAt: number | null;
  failureCount: number;
};

type BeginRunInput = {
  agentSlug: string;
  conversationId: string;
  runId: string;
};

const validId = (value: string, prefix: string) =>
  value.length <= 96 && new RegExp(`^${prefix}_[a-z0-9]+$`).test(value);

/**
 * Durable coordination for one agent conversation.
 *
 * Business records and message bodies remain in D1. This state deliberately
 * contains only non-secret identifiers and lifecycle data. Methods are called
 * through same-Worker Durable Object RPC and are not exposed as callable
 * WebSocket methods.
 */
export class AvyronAgentRuntime extends Agent<Env, AvyronAgentRuntimeState> {
  initialState: AvyronAgentRuntimeState = {
    schemaVersion: 1,
    status: "idle",
    agentSlug: null,
    conversationId: null,
    activeRunId: null,
    lastCompletedAt: null,
    failureCount: 0,
  };

  beginRun(input: BeginRunInput) {
    if (!/^[a-z0-9-]{1,64}$/.test(input.agentSlug)
      || !validId(input.conversationId, "conv")
      || !validId(input.runId, "run")) {
      throw new Error("invalid_agent_runtime_input");
    }
    const previousRunId = this.state.status === "running" ? this.state.activeRunId : null;
    this.setState({
      ...this.state,
      status: "running",
      agentSlug: input.agentSlug,
      conversationId: input.conversationId,
      activeRunId: input.runId,
    });
    return { accepted: true as const, previousRunId };
  }

  completeRun(runId: string, completedAt: number) {
    if (this.state.activeRunId !== runId) return { updated: false as const };
    this.setState({
      ...this.state,
      status: "idle",
      activeRunId: null,
      lastCompletedAt: completedAt,
    });
    return { updated: true as const };
  }

  failRun(runId: string) {
    if (this.state.activeRunId !== runId) return { updated: false as const };
    this.setState({
      ...this.state,
      status: "failed",
      activeRunId: null,
      failureCount: this.state.failureCount + 1,
    });
    return { updated: true as const };
  }

  getSnapshot() {
    return this.state;
  }
}
