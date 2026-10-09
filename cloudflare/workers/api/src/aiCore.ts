import { reserveAiCost } from "./aiCostGuard";
import { now, sha256 } from "./security";
import type { Env } from "./types";

export type AiModelRole = "primary" | "secondary" | "image";
export type AiTokenTier = "default" | "normal" | "special";

type RegistryRow = {
  role: AiModelRole;
  model_id: string;
  modality: "text" | "vision" | "image";
  status: "configured" | "disabled" | "limited";
  default_max_tokens: number;
  normal_max_tokens: number;
  special_max_tokens: number;
  daily_neuron_limit: number;
  requires_billing: number;
};

type AiCoreInput = {
  env: Env;
  agentSlug: string;
  operation: string;
  idempotencyKey: string;
  input: Record<string, unknown>;
  promptCharacters: number;
  tier?: AiTokenTier;
  requestedMaxTokens?: number;
  needsVision?: boolean;
  needsLongContext?: boolean;
  explicitSecondaryReview?: boolean;
  role?: AiModelRole;
  requestId?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  financialReserved?: boolean;
  priority?: "background" | "important" | "user";
};

export class AiCoreError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AiCoreError";
  }
}

const enabled = (value: string | undefined) => value?.trim().toLowerCase() === "true";
const usageDay = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

function selectRole(input: AiCoreInput): AiModelRole {
  if (input.role) return input.role;
  return input.needsVision || input.needsLongContext || input.explicitSecondaryReview ? "secondary" : "primary";
}

function tokenLimit(registry: RegistryRow, tier: AiTokenTier, requested?: number): number {
  const configured = tier === "special"
    ? registry.special_max_tokens
    : tier === "normal" ? registry.normal_max_tokens : registry.default_max_tokens;
  const bounded = requested === undefined ? configured : Math.min(configured, Math.max(64, Math.floor(requested)));
  return Math.max(64, Math.min(1_800, bounded));
}

async function reserveModelBudget(
  env: Env,
  registry: RegistryRow,
  agentSlug: string,
  units: number,
  idempotencyKey: string,
  priority: "background" | "important" | "user",
) {
  const idempotencyHash = await sha256(`ai-core:${idempotencyKey}`);
  const existing = await env.DB.prepare(
    "SELECT model_role,agent_slug,estimated_neurons FROM ai_core_reservations WHERE idempotency_hash=?",
  ).bind(idempotencyHash).first<{ model_role: string; agent_slug: string; estimated_neurons: number }>();
  if (existing) {
    if (existing.model_role !== registry.role || existing.agent_slug !== agentSlug || existing.estimated_neurons !== units) {
      throw new AiCoreError("ai_idempotency_key_reused");
    }
    return;
  }
  const timestamp = now();
  try {
    await env.DB.prepare(
      `INSERT INTO ai_core_reservations
        (idempotency_hash,usage_day,model_role,agent_slug,priority,estimated_neurons,created_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).bind(idempotencyHash, usageDay(timestamp), registry.role, agentSlug, priority, units, timestamp).run();
  } catch (error) {
    const message = String(error);
    if (message.includes("ai_role_daily_limit_exceeded")) throw new AiCoreError("ai_role_daily_limit_exceeded");
    if (message.includes("ai_global_daily_limit_exceeded")) throw new AiCoreError("ai_global_daily_limit_exceeded");
    if (message.includes("ai_background_daily_limit_exceeded")) throw new AiCoreError("ai_background_daily_limit_exceeded");
    throw error;
  }
}

/**
 * Single Workers AI entrypoint. It selects only registered models, caps output,
 * reserves the internal free-tier budget, and never enables paid overage.
 */
export async function runAiCore(input: AiCoreInput): Promise<{
  output: unknown;
  model: string;
  role: AiModelRole;
  maxTokens: number;
  estimatedNeurons: number;
}> {
  if (!input.env.AI) throw new AiCoreError("ai_binding_unavailable");
  const role = selectRole(input);
  const registry = await input.env.DB.prepare(
    `SELECT role,model_id,modality,status,default_max_tokens,normal_max_tokens,
            special_max_tokens,daily_neuron_limit,requires_billing
       FROM ai_model_registry WHERE role=?`,
  ).bind(role).first<RegistryRow>();
  if (!registry || registry.status === "disabled") throw new AiCoreError("ai_model_not_configured");
  if (registry.requires_billing && !(enabled(input.env.PAID_AI_ENABLED) && enabled(input.env.ALLOW_AI_OVERAGE))) {
    throw new AiCoreError("paid_ai_disabled");
  }

  const tier = input.tier || "default";
  const maxTokens = role === "image" ? 0 : tokenLimit(registry, tier, input.requestedMaxTokens);
  const estimatedInput = Math.max(1, Math.ceil(Math.max(0, input.promptCharacters) / 4));
  const estimatedNeurons = Math.max(1, estimatedInput + maxTokens);
  const priority = input.priority || "user";
  const currentUsage = await input.env.DB.prepare(
    "SELECT COALESCE(SUM(estimated_neurons),0) AS total FROM ai_core_reservations WHERE usage_day=?",
  ).bind(usageDay(now())).first<{ total: number }>();
  if ((currentUsage?.total || 0) >= 3_000 && priority === "background") throw new AiCoreError("ai_warning_background_throttled");
  if ((currentUsage?.total || 0) >= 4_000 && priority !== "user" && priority !== "important") throw new AiCoreError("ai_throttle_nonessential");

  if (!input.financialReserved) {
    const financial = await reserveAiCost({
      db: input.env.DB,
      agentSlug: input.agentSlug,
      vendorId: "fin_vendor_cloudflare_ai",
      operation: input.operation,
      requestedUnits: estimatedNeurons,
      estimatedCostMinor: 0,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId,
      projectId: input.projectId,
      clientId: input.clientId,
    });
    if (financial.decision !== "allowed") throw new AiCoreError(financial.reason);
  }

  await reserveModelBudget(input.env, registry, input.agentSlug, estimatedNeurons, input.idempotencyKey, priority);
  const modelInput = role === "image" ? input.input : { ...input.input, max_tokens: maxTokens };
  const output = await input.env.AI.run(registry.model_id, modelInput);
  return { output, model: registry.model_id, role, maxTokens, estimatedNeurons };
}
