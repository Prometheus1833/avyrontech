// AI OS "AVY" — agenți, retrieval din D1, conversații, statistici și auto-învățare.
//
// Rute publice:
//   GET  /api/ai/agents            → agenții publici activi (pentru widgetul de site)
//   POST /api/ai/chat              → un schimb de mesaje cu un agent public
//   POST /api/ai/feedback          → 👍/👎 pe un răspuns
// Rute super admin (montate cu requireAuth + requireSuperAdmin în index.ts):
//   GET/PUT/POST  /api/ai/admin/agents...
//   GET/POST/DELETE /api/ai/admin/knowledge...
//   GET  /api/ai/admin/stats, /api/ai/admin/conversations, /api/ai/admin/learning
//   POST /api/ai/admin/learning/:id/approve|reject
//
// Scrierea (agenți, cunoștințe, învățare) este rezervată contului owner.

import { Hono, type Context } from "hono";
import { getAgentByName } from "agents";
import type { AppBindings } from "./types";
import type { AvyronAgentRuntime } from "./agents/AvyronAgentRuntime";
import { resolveAgentModel } from "./agentRuntimePolicy";
import { reserveAiCost } from "./aiCostGuard";
import { checkRateLimit, clientIp, hashKey } from "./antispam";
import { platformRoleForUser } from "./authorization";
import { now, sha256 } from "./security";

// `getAgentByName` carries the full recursive Agent RPC surface. Narrowing the
// library boundary prevents TypeScript from expanding that surface through all
// Hono bindings while preserving the concrete stub type used here.
const resolveAgentRuntime = getAgentByName as unknown as (
  namespace: unknown,
  name: string,
) => Promise<DurableObjectStub<AvyronAgentRuntime>>;

const id = (p: string) => `${p}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

export type AiAgent = {
  id: string; slug: string; name: string; mission: string; channel: string; status: string;
  visibility: string; model: string; temperature: number; max_tokens: number; autonomy: string;
  language: string; accent: string; greeting_ro: string; greeting_en: string;
  system_prompt: string; guardrails: string; tools_json: string; handoff_email: string | null;
  current_version: number; created_at: number; updated_at: number; updated_by: string | null;
};

type Knowledge = {
  id: string; category: string; language: string; question: string; answer: string;
  keywords: string; priority: number; source: string; agent_slug: string | null;
};

export const aiOsRouter = new Hono<AppBindings>();

// ─── Utilitare ──────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  "si", "sau", "cu", "de", "la", "un", "o", "in", "pe", "pentru", "care", "ce", "cum", "cat",
  "cât", "este", "sunt", "vreau", "as", "aș", "the", "and", "for", "with", "how", "what", "is",
  "are", "do", "you", "your", "can", "a", "an", "to", "of",
]);

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");

const tokenize = (value: string) =>
  normalize(value).split(/\s+/).filter((word) => word.length > 2 && !STOPWORDS.has(word));

/** Scor lexical simplu, suficient pentru o bază de cunoștințe curată și prioritizată. */
function scoreEntry(tokens: string[], entry: Knowledge): number {
  if (!tokens.length) return 0;
  const haystack = normalize(`${entry.question} ${entry.keywords} ${entry.answer.slice(0, 400)}`);
  let hits = 0;
  for (const token of tokens) if (haystack.includes(token)) hits += 1;
  const coverage = hits / tokens.length;
  return coverage * (1 + entry.priority / 20);
}

async function retrieve(c: Context<AppBindings>, agentSlug: string, language: string, question: string) {
  const { results } = await c.env.DB.prepare(
    `SELECT id, category, language, question, answer, keywords, priority, source, agent_slug
       FROM ai_knowledge
      WHERE status = 'active' AND (agent_slug IS NULL OR agent_slug = ?) AND (language = ? OR language = 'ro')
      ORDER BY priority DESC LIMIT 400`,
  ).bind(agentSlug, language).all<Knowledge>();
  const tokens = tokenize(question);
  return results
    .map((entry) => ({ entry, score: scoreEntry(tokens, entry) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

type AiBinding = { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
const aiBinding = (env: unknown): AiBinding | null => {
  const candidate = (env as { AI?: AiBinding }).AI;
  return candidate && typeof candidate.run === "function" ? candidate : null;
};

async function generate(c: Context<AppBindings>, agent: AiAgent, context: string, history: { role: string; content: string }[], language: string, runId: string) {
  const ai = aiBinding(c.env);
  if (!ai) return null;
  const runtimeModel = resolveAgentModel(agent.model);
  const system = [
    agent.system_prompt,
    agent.guardrails,
    `Limba răspunsului: ${language === "en" ? "engleză" : "română"}.`,
    "Folosește exclusiv informațiile din CONTEXT. Dacă lipsesc, spune sincer că verifici cu echipa.",
    "Închide fiecare răspuns cu un singur pas concret, ales după intenție: configuratorul de pe pagina produsului pentru un preț instant, formularul pentru ofertă, WhatsApp la +40 734 605 055 sau apel la același număr. Ton direct, prietenos, fără presiune.",
    `CONTEXT:\n${context}`,
  ].join("\n\n");
  try {
    const maxTokens = Math.max(64, Math.min(800, Number(agent.max_tokens) || 600));
    const reservation = await reserveAiCost({
      db: c.env.DB,
      agentSlug: agent.slug,
      vendorId: "fin_vendor_cloudflare_ai",
      operation: "public_chat_generation",
      requestedUnits: Math.max(1, Math.ceil((system.length + history.slice(-6).reduce((sum, item) => sum + item.content.length, 0)) / 4)) + maxTokens,
      estimatedCostMinor: 0,
      idempotencyKey: `ai-run:${runId}`,
      requestId: c.get("requestId") || null,
    });
    if (reservation.decision !== "allowed") {
      console.warn(JSON.stringify({ event: "ai_cost_guard_denied", agent: agent.slug, runId, reason: reservation.reason }));
      return null;
    }
    const output = (await ai.run(runtimeModel, {
      // A database edit can tune an agent, but cannot remove platform-level
      // output/cost boundaries.
      max_tokens: maxTokens,
      temperature: Math.max(0, Math.min(1, Number(agent.temperature) || 0.3)),
      messages: [{ role: "system", content: system }, ...history.slice(-6)],
    })) as { response?: string };
    const text = (output?.response || "").trim();
    return text || null;
  } catch (error) {
    console.error(JSON.stringify({ event: "ai_generate_failed", agent: agent.slug, error: String(error) }));
    return null;
  }
}

type RuntimeBudget = {
  id: string;
  max_runs: number;
  max_input_tokens: number;
  max_output_tokens: number;
  max_cost_micros: number;
  used_runs: number;
  used_input_tokens: number;
  used_output_tokens: number;
  used_cost_micros: number;
};

type RuntimeGate =
  | { allowed: true; versionId: string; budget: RuntimeBudget | null; estimatedInputTokens: number; reservedOutputTokens: number }
  | { allowed: false; reason: "paused" | "version_unavailable" | "budget_exhausted" };

async function reserveRuntimeCapacity(
  c: Context<AppBindings>,
  agent: AiAgent,
  message: string,
): Promise<RuntimeGate> {
  const timestamp = now();
  const paused = await c.env.DB.prepare(
    `SELECT 1 AS blocked
       FROM ai_kill_switches
      WHERE enabled = 1
        AND ((scope_type = 'global' AND scope_id = '*')
          OR (scope_type = 'agent' AND scope_id = ?))
      LIMIT 1`,
  ).bind(agent.slug).first<{ blocked: number }>();
  if (paused?.blocked === 1) return { allowed: false, reason: "paused" };

  const version = await c.env.DB.prepare(
    `SELECT id
       FROM ai_agent_versions
      WHERE agent_slug = ? AND version = ? AND status = 'approved'
      LIMIT 1`,
  ).bind(agent.slug, agent.current_version ?? 1).first<{ id: string }>();
  if (!version) return { allowed: false, reason: "version_unavailable" };

  // Public chat has no tenant yet. Prefer an agent budget over a global one;
  // only one counter is charged for a run, avoiding ambiguous double billing.
  const budget = await c.env.DB.prepare(
    `SELECT id, max_runs, max_input_tokens, max_output_tokens, max_cost_micros,
            used_runs, used_input_tokens, used_output_tokens, used_cost_micros
       FROM ai_budgets
      WHERE organization_id IS NULL
        AND (agent_slug = ? OR agent_slug IS NULL)
        AND period_start <= ? AND period_end > ?
      ORDER BY CASE WHEN agent_slug = ? THEN 0 ELSE 1 END
      LIMIT 1`,
  ).bind(agent.slug, timestamp, timestamp, agent.slug).first<RuntimeBudget>();

  const estimatedInputTokens = Math.max(1, Math.ceil(message.length / 4));
  const reservedOutputTokens = Math.max(64, Math.min(800, Number(agent.max_tokens) || 600));
  if (budget) {
    const reserved = await c.env.DB.prepare(
      `UPDATE ai_budgets
          SET used_runs = used_runs + 1,
              used_input_tokens = used_input_tokens + ?,
              used_output_tokens = used_output_tokens + ?,
              updated_at = ?
        WHERE id = ?
          AND used_runs + 1 <= max_runs
          AND used_input_tokens + ? <= max_input_tokens
          AND used_output_tokens + ? <= max_output_tokens
          AND used_cost_micros < max_cost_micros`,
    ).bind(
      estimatedInputTokens, reservedOutputTokens, timestamp, budget.id,
      estimatedInputTokens, reservedOutputTokens,
    ).run();
    if ((reserved.meta.changes ?? 0) !== 1) return { allowed: false, reason: "budget_exhausted" };
  }
  return { allowed: true, versionId: version.id, budget: budget ?? null, estimatedInputTokens, reservedOutputTokens };
}

const fallbackAnswer = (language: string) =>
  language === "en"
    ? "I do not have that exact detail yet, but the team does. Send a WhatsApp to +40 734 605 055 (or call the same number) with your business and what you want to achieve and you get a clear answer, with a price range, the same business day. You can also get an instant estimate from the configurator on the product page."
    : "Nu am încă exact detaliul acesta, dar echipa îl are. Scrie-ne pe WhatsApp la +40 734 605 055 sau sună la același număr, spune-ne pe scurt ce faci și ce vrei să obții, și primești răspuns clar, cu interval de preț, în aceeași zi lucrătoare. Dacă vrei un preț pe loc, folosește configuratorul de pe pagina produsului.";


// ─── Public ─────────────────────────────────────────────────────────────
aiOsRouter.get("/api/ai/agents", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT slug, name, mission, accent, greeting_ro, greeting_en, channel
       FROM ai_agents WHERE status = 'active' AND visibility = 'public' ORDER BY name`,
  ).all();
  c.header("cache-control", "public, max-age=120, stale-while-revalidate=600");
  return c.json({ data: results });
});

aiOsRouter.post("/api/ai/chat", async (c) => {
  const body = await c.req.json<{
    agent?: string; message?: string; conversationId?: string;
    language?: string; page?: string; visitorId?: string; website?: string;
  }>().catch(() => null);
  if (!body) return c.json({ error: { code: "bad_request", message: "JSON invalid" } }, 400);
  if (body.website) return c.json({ ok: true, reply: "" }); // honeypot
  const message = (body.message || "").trim();
  if (message.length < 2 || message.length > 1000)
    return c.json({ error: { code: "bad_request", message: "Mesaj invalid" } }, 400);

  const ipKey = await hashKey(clientIp(c.req.raw));
  const rate = await checkRateLimit(c.env.DB, [
    { key: `ai:public:ip:${ipKey}:10m`, limit: 12, windowSec: 600 },
    { key: "ai:public:global:h", limit: 500, windowSec: 3600 },
  ], { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `ai-chat:${ipKey}` });
  if (!rate.ok) {
    c.header("Retry-After", String(rate.retryAfter || 60));
    return c.json({ error: { code: "rate_limited", message: "Prea multe solicitări. Încearcă din nou mai târziu." } }, 429);
  }

  const language = body.language === "en" ? "en" : "ro";
  const slug = (body.agent || "avy").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const agent = await c.env.DB.prepare(
    "SELECT * FROM ai_agents WHERE slug = ? AND status = 'active' AND visibility = 'public'",
  ).bind(slug).first<AiAgent>();
  if (!agent) return c.json({ error: { code: "not_found", message: "Agent indisponibil" } }, 404);

  const gate = await reserveRuntimeCapacity(c, agent, message);
  if (!gate.allowed) {
    const unavailable = gate.reason === "paused" || gate.reason === "version_unavailable";
    return c.json({
      error: {
        code: gate.reason,
        message: unavailable ? "Agentul este temporar indisponibil" : "Bugetul agentului a fost atins",
      },
    }, unavailable ? 503 : 429);
  }

  const started = Date.now();
  const matches = await retrieve(c, slug, language, message);
  const best = matches[0]?.score ?? 0;
  const context = matches.map((m) => `• ${m.entry.question}\n${m.entry.answer}`).join("\n\n") || "(fără context)";

  const visitorId = (body.visitorId || "").slice(0, 64) || null;
  let conversationId = body.conversationId && /^conv_[a-z0-9]+$/.test(body.conversationId) ? body.conversationId : null;
  const history: { role: string; content: string }[] = [];
  if (conversationId) {
    // The conversation id alone is not authorization. Bind continuation to
    // the same visitor and agent so one public user cannot append/read another
    // visitor's transcript.
    const owned = visitorId
      ? await c.env.DB.prepare(
          `SELECT id FROM ai_conversations
            WHERE id = ? AND agent_slug = ? AND visitor_id = ? AND status = 'open'`,
        ).bind(conversationId, slug, visitorId).first<{ id: string }>()
      : null;
    if (!owned) {
      conversationId = null;
    } else {
      const { results } = await c.env.DB.prepare(
        "SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 6",
      ).bind(conversationId).all<{ role: string; content: string }>();
      history.push(...results.reverse());
    }
  }
  history.push({ role: "user", content: message });

  const ts = now();
  if (!conversationId) {
    conversationId = id("conv").replace(/[^a-z0-9_]/g, "");
    await c.env.DB.prepare(
      `INSERT INTO ai_conversations (id, agent_slug, channel, visitor_id, language, page, created_at, last_at, messages)
       VALUES (?, ?, 'site', ?, ?, ?, ?, ?, 0)`,
    ).bind(conversationId, slug, visitorId, language, (body.page || "").slice(0, 200) || null, ts, ts).run();
  }

  const runId = id("run");
  const retrievalStepId = id("step");
  let runtime: DurableObjectStub<AvyronAgentRuntime> | null = null;
  try {
    const runtimeName = `${slug}-${(await sha256(conversationId)).slice(0, 48)}`;
    runtime = await resolveAgentRuntime(c.env.AVYRON_AGENT_RUNTIME, runtimeName);
    await runtime.beginRun({ agentSlug: slug, conversationId, runId });
  } catch (error) {
    // D1 remains authoritative; a transient coordinator failure must not make
    // the public support channel unavailable.
    console.warn(JSON.stringify({ event: "agent_runtime_begin_failed", runId, error: String(error) }));
  }
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO ai_runs
         (id, agent_slug, agent_version_id, conversation_id, status, input_hash,
          input_tokens, output_tokens, request_id, started_at, created_at)
       VALUES (?, ?, ?, ?, 'running', ?, ?, 0, ?, ?, ?)`,
    ).bind(
      runId, slug, gate.versionId, conversationId, await sha256(`${slug}\u0000${message}`),
      gate.estimatedInputTokens, c.get("requestId") || null, ts, ts,
    ),
    c.env.DB.prepare(
      `INSERT INTO ai_run_steps
         (id, run_id, sequence, kind, name, status, output_json, started_at, completed_at, created_at)
       VALUES (?, ?, 0, 'retrieval', 'knowledge_search', 'succeeded', ?, ?, ?, ?)`,
    ).bind(
      retrievalStepId, runId,
      JSON.stringify({ matches: matches.map((match) => match.entry.id), confidence: Number(best.toFixed(4)) }),
      ts, ts, ts,
    ),
  ]);

  const generated = await generate(c, agent, context, history, language, runId);
  const reply = generated || (best >= 0.34 ? matches[0].entry.answer : fallbackAnswer(language));
  const latency = Date.now() - started;
  const answerId = id("msg");
  const completedAt = now();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO ai_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'user', ?, ?)")
      .bind(id("msg"), conversationId, message, ts),
    c.env.DB.prepare(
      "INSERT INTO ai_messages (id, conversation_id, role, content, matched_ids, confidence, latency_ms, created_at) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)",
    ).bind(answerId, conversationId, reply, matches.map((m) => m.entry.id).join(","), best, latency, ts),
    c.env.DB.prepare("UPDATE ai_conversations SET messages = messages + 2, last_at = ? WHERE id = ?").bind(ts, conversationId),
    c.env.DB.prepare(
      `INSERT INTO ai_run_steps
         (id, run_id, sequence, kind, name, status, output_json, started_at, completed_at, created_at)
       VALUES (?, ?, 1, 'model', ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id("step"), runId, agent.model, generated ? "succeeded" : "skipped",
      JSON.stringify({ fallback: !generated, messageId: answerId }), ts, completedAt, ts,
    ),
    c.env.DB.prepare(
      `UPDATE ai_runs
          SET status = 'succeeded', output_tokens = ?, completed_at = ?
        WHERE id = ?`,
    ).bind(Math.max(1, Math.ceil(reply.length / 4)), completedAt, runId),
  ]);

  if (runtime) {
    c.executionCtx.waitUntil(
      runtime.completeRun(runId, completedAt).then(() => undefined).catch((error) => {
        console.warn(JSON.stringify({ event: "agent_runtime_complete_failed", runId, error: String(error) }));
      }),
    );
  }

  if (matches[0]) {
    c.executionCtx.waitUntil(
      c.env.DB.prepare("UPDATE ai_knowledge SET hits = hits + 1 WHERE id = ?").bind(matches[0].entry.id).run().then(() => undefined),
    );
  }

  // Auto-învățare: întrebările slab acoperite intră în coadă pentru validare.
  if (best < 0.34) {
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `INSERT INTO ai_learning_queue (id, agent_slug, language, question, occurrences, best_score, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      ).bind(id("learn"), slug, language, message.slice(0, 400), best, ts, ts).run().then(() => undefined),
    );
  }

  c.header("cache-control", "no-store");
  return c.json({
    conversationId,
    runId,
    messageId: answerId,
    reply,
    confidence: Number(best.toFixed(2)),
    sources: matches.map((m) => ({ id: m.entry.id, question: m.entry.question, category: m.entry.category })),
    handoff: best < 0.34 ? agent.handoff_email : null,
  });
});

aiOsRouter.post("/api/ai/feedback", async (c) => {
  const body = await c.req.json<{ messageId?: string; helpful?: boolean }>().catch(() => null);
  if (!body?.messageId || typeof body.helpful !== "boolean")
    return c.json({ error: { code: "bad_request", message: "Date invalide" } }, 400);
  await c.env.DB.prepare("UPDATE ai_messages SET helpful = ? WHERE id = ? AND role = 'assistant'")
    .bind(body.helpful ? 1 : 0, body.messageId).run();
  return c.json({ ok: true });
});

// ─── Super admin ────────────────────────────────────────────────────────
async function isOwner(c: Context<AppBindings>) {
  return (await platformRoleForUser(c.env.DB, c.get("userId"))) === "platform_owner";
}
const requireOwner = async (c: Context<AppBindings>) =>
  (await isOwner(c)) ? null : c.json({ error: { code: "forbidden", message: "Doar contul owner poate modifica AI OS" } }, 403);

aiOsRouter.get("/api/ai/admin/agents", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM ai_agents ORDER BY status DESC, name").all<AiAgent>();
  return c.json({ data: results, canEdit: await isOwner(c) });
});

const AGENT_FIELDS = [
  "name", "mission", "channel", "status", "visibility", "model", "temperature", "max_tokens",
  "autonomy", "language", "accent", "greeting_ro", "greeting_en", "system_prompt", "guardrails",
  "tools_json", "handoff_email",
] as const;
type AgentField = (typeof AGENT_FIELDS)[number];

const AGENT_ENUMS: Partial<Record<AgentField, readonly string[]>> = {
  channel: ["site", "whatsapp", "meta", "email", "intern"],
  status: ["draft", "active", "paused"],
  visibility: ["public", "private"],
  autonomy: ["assist", "semi", "auto"],
  language: ["ro", "en"],
};

function normalizeAgentField(field: AgentField, raw: unknown): { ok: true; value: unknown } | { ok: false } {
  if (field === "temperature") {
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? { ok: true, value } : { ok: false };
  }
  if (field === "max_tokens") {
    const value = Number(raw);
    return Number.isInteger(value) && value >= 64 && value <= 800 ? { ok: true, value } : { ok: false };
  }
  if (field === "handoff_email") {
    if (raw === null || raw === "") return { ok: true, value: null };
    const value = String(raw).trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
      ? { ok: true, value }
      : { ok: false };
  }
  if (typeof raw !== "string") return { ok: false };
  if (AGENT_ENUMS[field] && !AGENT_ENUMS[field]?.includes(raw)) return { ok: false };
  if (field === "model") {
    const value = raw.trim();
    if (!/^@cf\/[a-z0-9._/-]+$/i.test(value) || value.length > 160) return { ok: false };
    return { ok: true, value: resolveAgentModel(value) };
  }
  if (field === "accent" && !/^#[0-9a-f]{6}$/i.test(raw)) return { ok: false };
  if (field === "tools_json") {
    try {
      const tools = JSON.parse(raw) as unknown;
      if (!Array.isArray(tools) || tools.length > 20 || tools.some((tool) => typeof tool !== "string" || !/^[a-z0-9_-]{1,80}$/.test(tool))) {
        return { ok: false };
      }
      return { ok: true, value: JSON.stringify([...new Set(tools)]) };
    } catch {
      return { ok: false };
    }
  }
  const maxLength = field === "system_prompt" || field === "guardrails" ? 12_000 : 1_000;
  return raw.length <= maxLength ? { ok: true, value: raw } : { ok: false };
}

aiOsRouter.put("/api/ai/admin/agents/:slug", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  const patch = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!patch) return c.json({ error: { code: "bad_request", message: "JSON invalid" } }, 400);
  const current = await c.env.DB.prepare("SELECT * FROM ai_agents WHERE slug = ?")
    .bind(c.req.param("slug")).first<AiAgent>();
  if (!current) return c.json({ error: { code: "not_found", message: "Agent inexistent" } }, 404);
  const sets: string[] = [];
  const values: unknown[] = [];
  const normalized = new Map<AgentField, unknown>();
  for (const field of AGENT_FIELDS) {
    if (patch[field] === undefined) continue;
    const result = normalizeAgentField(field, patch[field]);
    if (!result.ok) return c.json({ error: { code: "invalid_agent_field", field } }, 400);
    sets.push(`${field} = ?`);
    values.push(result.value);
    normalized.set(field, result.value);
  }
  if (!sets.length) return c.json({ error: { code: "bad_request", message: "Nimic de actualizat" } }, 400);
  const timestamp = now();
  const nextVersion = (current.current_version || 1) + 1;
  const versionId = id("agent_version");
  sets.push("current_version = ?", "updated_at = ?", "updated_by = ?");
  values.push(nextVersion, timestamp, c.get("userId"), c.req.param("slug"));

  const effective = <K extends AgentField>(field: K) => normalized.has(field) ? normalized.get(field) : current[field];
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE ai_agents SET ${sets.join(", ")} WHERE slug = ?`).bind(...values),
    c.env.DB.prepare(
      `INSERT INTO ai_agent_versions
         (id, agent_slug, version, status, model, temperature, max_tokens, autonomy,
          system_prompt, guardrails, tools_json, change_note, created_by, approved_by,
          created_at, approved_at)
       VALUES (?, ?, ?, 'approved', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      versionId, current.slug, nextVersion, effective("model"), effective("temperature"),
      effective("max_tokens"), effective("autonomy"), effective("system_prompt"),
      effective("guardrails"), effective("tools_json"), "Actualizare aprobată din consola AI OS",
      c.get("userId"), c.get("userId"), timestamp, timestamp,
    ),
    c.env.DB.prepare(
      `INSERT INTO ai_agent_tool_policies
         (agent_version_id, tool_slug, mode, allowed_scopes_json, max_calls_per_run)
       SELECT ?, registry.slug,
              CASE WHEN registry.slug = 'knowledge_search' AND registry.status = 'active' THEN 'read' ELSE 'disabled' END,
              '[]', CASE WHEN registry.slug = 'knowledge_search' THEN 4 ELSE 0 END
         FROM json_each(?) AS requested
         JOIN ai_tools AS registry ON registry.slug = requested.value`,
    ).bind(versionId, effective("tools_json")),
  ]);
  return c.json({ ok: true, version: nextVersion });
});

aiOsRouter.post("/api/ai/admin/agents", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  const body = await c.req.json<{ slug?: string; name?: string; mission?: string; channel?: string }>().catch(() => null);
  const slug = (body?.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug || !body?.name) return c.json({ error: { code: "bad_request", message: "Slug și nume obligatorii" } }, 400);
  if (body.name.trim().length > 120 || (body.mission || "").length > 1_000)
    return c.json({ error: { code: "bad_request", message: "Date agent prea lungi" } }, 400);
  const channel = body.channel || "site";
  if (!AGENT_ENUMS.channel?.includes(channel)) return c.json({ error: { code: "bad_request", message: "Canal invalid" } }, 400);
  const ts = now();
  const agentId = id("agent");
  const versionId = id("agent_version");
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO ai_agents (id, slug, name, mission, channel, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(agentId, slug, body.name.trim(), body.mission || "", channel, ts, ts, c.get("userId")),
    c.env.DB.prepare(
      `INSERT INTO ai_agent_versions
         (id, agent_slug, version, status, model, temperature, max_tokens, autonomy,
          system_prompt, guardrails, tools_json, change_note, created_by, created_at)
       SELECT ?, slug, 1, 'draft', model, temperature, max_tokens, autonomy,
              system_prompt, guardrails, tools_json, 'Versiune inițială', ?, ?
         FROM ai_agents WHERE id = ?`,
    ).bind(versionId, c.get("userId"), ts, agentId),
  ]);
  return c.json({ ok: true, slug, version: 1 });
});

aiOsRouter.get("/api/ai/admin/knowledge", async (c) => {
  const search = (c.req.query("q") || "").trim();
  const like = `%${search.toLowerCase()}%`;
  const { results } = search
    ? await c.env.DB.prepare(
        `SELECT * FROM ai_knowledge WHERE lower(question) LIKE ? OR lower(keywords) LIKE ? OR lower(answer) LIKE ?
         ORDER BY priority DESC, updated_at DESC LIMIT 200`,
      ).bind(like, like, like).all()
    : await c.env.DB.prepare("SELECT * FROM ai_knowledge ORDER BY priority DESC, updated_at DESC LIMIT 200").all();
  return c.json({ data: results, canEdit: await isOwner(c) });
});

aiOsRouter.post("/api/ai/admin/knowledge", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  const body = await c.req.json<{
    id?: string; question?: string; answer?: string; category?: string; language?: string;
    keywords?: string; priority?: number; status?: string; agent_slug?: string | null; source?: string;
  }>().catch(() => null);
  if (!body?.question || !body.answer) return c.json({ error: { code: "bad_request", message: "Întrebare și răspuns obligatorii" } }, 400);
  const ts = now();
  const rowId = body.id || id("kb");
  await c.env.DB.prepare(
    `INSERT INTO ai_knowledge (id, agent_slug, category, language, question, answer, keywords, source, priority, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET question = excluded.question, answer = excluded.answer,
       category = excluded.category, language = excluded.language, keywords = excluded.keywords,
       priority = excluded.priority, status = excluded.status, agent_slug = excluded.agent_slug, updated_at = excluded.updated_at`,
  ).bind(
    rowId, body.agent_slug ?? null, body.category || "general", body.language === "en" ? "en" : "ro",
    body.question, body.answer, body.keywords || "", body.source || "manual",
    Math.max(1, Math.min(10, Number(body.priority) || 5)), body.status || "active", ts, ts,
  ).run();
  return c.json({ ok: true, id: rowId });
});

aiOsRouter.delete("/api/ai/admin/knowledge/:id", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  await c.env.DB.prepare("UPDATE ai_knowledge SET status = 'archived', updated_at = ? WHERE id = ?")
    .bind(now(), c.req.param("id")).run();
  return c.json({ ok: true });
});

const SOURCE_KINDS = new Set(["website", "social", "document", "manual", "project", "product"]);
const SOURCE_VISIBILITY = new Set(["public", "internal", "tenant"]);
const SOURCE_STATUS = new Set(["pending", "active", "paused", "error", "revoked"]);
const SOURCE_TRUST = new Set(["unverified", "authorized", "verified"]);

const canonicalHttpsUrl = (value: unknown): string | null => {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    return url.toString().slice(0, 1_000);
  } catch {
    return null;
  }
};

aiOsRouter.get("/api/ai/admin/sources", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT source.id, source.organization_id, source.connection_id, source.kind,
            source.name, source.canonical_url, source.status, source.visibility,
            source.trust_level, source.sync_policy_json, source.last_synced_at,
            source.last_error_code, source.created_at, source.updated_at,
            connection.provider, connection.account_label, connection.status AS connection_status,
            connection.scopes_json, connection.last_validated_at
       FROM knowledge_sources source
       LEFT JOIN source_connections connection ON connection.id = source.connection_id
      ORDER BY CASE source.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
               source.name COLLATE NOCASE`,
  ).all();
  return c.json({ data: results, canEdit: await isOwner(c) });
});

aiOsRouter.post("/api/ai/admin/connections", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  const body = await c.req.json<{
    provider?: string; purpose?: string; accountLabel?: string; scopes?: string[];
    secretReference?: string; externalAccountId?: string;
  }>().catch(() => null);
  const provider = String(body?.provider || "").trim().toLowerCase();
  const purpose = String(body?.purpose || "");
  const accountLabel = String(body?.accountLabel || "").trim();
  const scopes = Array.isArray(body?.scopes) ? [...new Set(body.scopes)] : [];
  const secretReference = String(body?.secretReference || "").trim() || null;
  if (!/^[a-z0-9_-]{2,80}$/.test(provider)
    || !["knowledge", "leads", "analytics", "publishing"].includes(purpose)
    || !accountLabel || accountLabel.length > 160
    || scopes.length > 50 || scopes.some((scope) => !/^[a-zA-Z0-9:._/-]{1,160}$/.test(scope))
    || (secretReference && !/^secret:[a-zA-Z0-9_./-]{1,200}$/.test(secretReference))) {
    return c.json({ error: { code: "invalid_connection" } }, 400);
  }
  const timestamp = now();
  const connectionId = id("connection");
  await c.env.DB.prepare(
    `INSERT INTO source_connections
       (id, provider, purpose, account_label, status, scopes_json,
        secret_reference, external_account_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
  ).bind(
    connectionId, provider, purpose, accountLabel, JSON.stringify(scopes),
    secretReference, String(body?.externalAccountId || "").slice(0, 200) || null,
    c.get("userId"), timestamp, timestamp,
  ).run();
  return c.json({ id: connectionId, status: "pending" }, 201);
});

aiOsRouter.post("/api/ai/admin/sources", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  const body = await c.req.json<{
    kind?: string; name?: string; canonicalUrl?: string; visibility?: string;
    connectionId?: string; organizationId?: string;
  }>().catch(() => null);
  const kind = String(body?.kind || "");
  const name = String(body?.name || "").trim();
  const visibility = String(body?.visibility || "internal");
  const canonicalUrl = body?.canonicalUrl ? canonicalHttpsUrl(body.canonicalUrl) : null;
  if (!SOURCE_KINDS.has(kind) || !name || name.length > 160 || !SOURCE_VISIBILITY.has(visibility)
    || (body?.canonicalUrl && !canonicalUrl) || (visibility === "tenant" && !body?.organizationId)) {
    return c.json({ error: { code: "invalid_source" } }, 400);
  }
  if (body?.connectionId) {
    const connection = await c.env.DB.prepare("SELECT 1 FROM source_connections WHERE id = ? AND status <> 'revoked'")
      .bind(body.connectionId).first();
    if (!connection) return c.json({ error: { code: "invalid_connection" } }, 400);
  }
  const timestamp = now();
  const sourceId = id("knowledge_source");
  await c.env.DB.prepare(
    `INSERT INTO knowledge_sources
       (id, organization_id, connection_id, kind, name, canonical_url, status,
        visibility, trust_level, sync_policy_json, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 'unverified', '{}', ?, ?, ?)`,
  ).bind(
    sourceId, body?.organizationId || null, body?.connectionId || null, kind,
    name, canonicalUrl, visibility, c.get("userId"), timestamp, timestamp,
  ).run();
  return c.json({ id: sourceId, status: "pending" }, 201);
});

aiOsRouter.patch("/api/ai/admin/sources/:id", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  const body = await c.req.json<{
    status?: string; trustLevel?: string; visibility?: string; syncPolicy?: unknown;
  }>().catch(() => null);
  if (!body) return c.json({ error: { code: "bad_request" } }, 400);
  const source = await c.env.DB.prepare(
    `SELECT source.kind, source.status, source.trust_level, source.connection_id, source.organization_id,
            connection.status AS connection_status
       FROM knowledge_sources source
       LEFT JOIN source_connections connection ON connection.id = source.connection_id
      WHERE source.id = ?`,
  ).bind(c.req.param("id")).first<{
    kind: string; status: string; trust_level: string; connection_id: string | null;
    organization_id: string | null; connection_status: string | null;
  }>();
  if (!source) return c.json({ error: { code: "not_found" } }, 404);
  const nextStatus = body.status ?? source.status;
  const nextTrust = body.trustLevel ?? source.trust_level;
  if (!SOURCE_STATUS.has(nextStatus) || !SOURCE_TRUST.has(nextTrust)
    || (body.visibility !== undefined && !SOURCE_VISIBILITY.has(body.visibility))
    || (body.visibility === "tenant" && !source.organization_id)) {
    return c.json({ error: { code: "invalid_source_state" } }, 400);
  }
  if (source.kind === "social" && nextStatus === "active"
    && (nextTrust !== "verified" || !source.connection_id || source.connection_status !== "active")) {
    return c.json({ error: { code: "social_authorization_required" } }, 409);
  }
  let syncPolicyJson: string | null = null;
  if (body.syncPolicy !== undefined) {
    syncPolicyJson = JSON.stringify(body.syncPolicy);
    if (syncPolicyJson.length > 8_192) return c.json({ error: { code: "sync_policy_too_large" } }, 400);
  }
  const sets = ["status = ?", "trust_level = ?", "updated_at = ?"];
  const values: unknown[] = [nextStatus, nextTrust, now()];
  if (body.visibility !== undefined) { sets.push("visibility = ?"); values.push(body.visibility); }
  if (syncPolicyJson !== null) { sets.push("sync_policy_json = ?"); values.push(syncPolicyJson); }
  values.push(c.req.param("id"));
  await c.env.DB.prepare(`UPDATE knowledge_sources SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
  return c.json({ ok: true });
});

aiOsRouter.get("/api/ai/admin/stats", async (c) => {
  const days = Math.max(1, Math.min(90, Number(c.req.query("days")) || 30));
  const since = now() - days * 86_400_000;
  const totals = await c.env.DB.prepare(
    `SELECT COUNT(*) AS conversations, COALESCE(SUM(messages),0) AS messages,
            COALESCE(SUM(converted),0) AS conversions
       FROM ai_conversations WHERE created_at >= ?`,
  ).bind(since).first<{ conversations: number; messages: number; conversions: number }>();
  const quality = await c.env.DB.prepare(
    `SELECT COALESCE(AVG(confidence),0) AS avg_confidence, COALESCE(AVG(latency_ms),0) AS avg_latency,
            SUM(CASE WHEN helpful = 1 THEN 1 ELSE 0 END) AS up,
            SUM(CASE WHEN helpful = 0 THEN 1 ELSE 0 END) AS down
       FROM ai_messages WHERE role = 'assistant' AND created_at >= ?`,
  ).bind(since).first<{ avg_confidence: number; avg_latency: number; up: number; down: number }>();
  const perAgent = await c.env.DB.prepare(
    `SELECT agent_slug, COUNT(*) AS conversations FROM ai_conversations WHERE created_at >= ?
      GROUP BY agent_slug ORDER BY conversations DESC`,
  ).bind(since).all();
  const daily = await c.env.DB.prepare(
    `SELECT date(created_at / 1000,'unixepoch') AS day, COUNT(*) AS conversations
       FROM ai_conversations WHERE created_at >= ? GROUP BY day ORDER BY day`,
  ).bind(since).all();
  const knowledge = await c.env.DB.prepare(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active FROM ai_knowledge",
  ).first<{ total: number; active: number }>();
  const pending = await c.env.DB.prepare("SELECT COUNT(*) AS pending FROM ai_learning_queue WHERE status = 'pending'")
    .first<{ pending: number }>();
  return c.json({ days, totals, quality, perAgent: perAgent.results, daily: daily.results, knowledge, learning: pending });
});

aiOsRouter.get("/api/ai/admin/conversations", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, agent_slug, language, page, status, messages, created_at, last_at
       FROM ai_conversations ORDER BY last_at DESC LIMIT 50`,
  ).all();
  return c.json({ data: results });
});

aiOsRouter.get("/api/ai/admin/conversations/:id", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT role, content, confidence, helpful, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY created_at",
  ).bind(c.req.param("id")).all();
  return c.json({ data: results });
});

aiOsRouter.get("/api/ai/admin/learning", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM ai_learning_queue WHERE status = 'pending' ORDER BY occurrences DESC, created_at DESC LIMIT 100`,
  ).all();
  return c.json({ data: results, canEdit: await isOwner(c) });
});

aiOsRouter.post("/api/ai/admin/learning/:id", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  const body = await c.req.json<{ action?: string; answer?: string; category?: string }>().catch(() => null);
  const row = await c.env.DB.prepare("SELECT * FROM ai_learning_queue WHERE id = ?")
    .bind(c.req.param("id")).first<{ id: string; question: string; language: string; agent_slug: string }>();
  if (!row) return c.json({ error: { code: "not_found", message: "Intrare inexistentă" } }, 404);
  const ts = now();
  if (body?.action === "approve" && body.answer) {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO ai_knowledge (id, agent_slug, category, language, question, answer, keywords, source, priority, status, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, 'learned', 6, 'active', ?, ?)`,
      ).bind(id("kb"), body.category || "general", row.language, row.question, body.answer, tokenize(row.question).join(" "), ts, ts),
      c.env.DB.prepare("UPDATE ai_learning_queue SET status = 'approved', draft_answer = ?, updated_at = ? WHERE id = ?")
        .bind(body.answer, ts, row.id),
    ]);
    return c.json({ ok: true, learned: true });
  }
  await c.env.DB.prepare("UPDATE ai_learning_queue SET status = 'rejected', updated_at = ? WHERE id = ?").bind(ts, row.id).run();
  return c.json({ ok: true, learned: false });
});
