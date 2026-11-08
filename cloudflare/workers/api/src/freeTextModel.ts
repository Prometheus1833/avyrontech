import type { Env } from "./types";
import { AiCoreError, type AiModelRole } from "./aiCore";
/** Choose only an already registered Free text model; AI Core makes the atomic reservation. */
export async function freeTextModel(
  env: Env,
  promptCharacters: number,
  requested = 256,
): Promise<{ role: AiModelRole; model: string; maxTokens: number }> {
  const day = new Date().toISOString().slice(0, 10);
  const rows = await env.DB.prepare(
    "SELECT m.role,m.model_id,m.normal_max_tokens,m.daily_neuron_limit,COALESCE((SELECT SUM(r.estimated_neurons) FROM ai_core_reservations r WHERE r.usage_day=? AND r.model_role=m.role),0) used FROM ai_model_registry m WHERE m.role IN('primary','secondary') AND m.requires_billing=0 AND m.status<>'disabled' AND m.modality IN('text','vision') ORDER BY m.role='primary' DESC",
  )
    .bind(day)
    .all<{
      role: AiModelRole;
      model_id: string;
      normal_max_tokens: number;
      daily_neuron_limit: number;
      used: number;
    }>();
  for (const row of rows.results) {
    const tokens = Math.max(
      64,
      Math.min(1800, row.normal_max_tokens, requested),
    );
    if (
      row.used + Math.ceil(promptCharacters / 4) + tokens <=
      row.daily_neuron_limit
    )
      return { role: row.role, model: row.model_id, maxTokens: tokens };
  }
  throw new AiCoreError("ai_free_budget_exhausted");
}
export function freeTextOutput(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const output = value as {
    response?: unknown;
    choices?: { message?: { content?: unknown } }[];
  };
  if (typeof output.response === "string") return output.response.trim();
  const text = output.choices?.[0]?.message?.content;
  return typeof text === "string" ? text.trim() : "";
}
