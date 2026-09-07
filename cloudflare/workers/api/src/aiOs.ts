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
import type { AppBindings } from "./types";

const OWNER_EMAIL = "prometheus@avyron.ro";
const now = () => Math.floor(Date.now() / 1000);
const id = (p: string) => `${p}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

export type AiAgent = {
  id: string; slug: string; name: string; mission: string; channel: string; status: string;
  visibility: string; model: string; temperature: number; max_tokens: number; autonomy: string;
  language: string; accent: string; greeting_ro: string; greeting_en: string;
  system_prompt: string; guardrails: string; tools_json: string; handoff_email: string | null;
  created_at: number; updated_at: number; updated_by: string | null;
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

async function generate(env: unknown, agent: AiAgent, context: string, history: { role: string; content: string }[], language: string) {
  const ai = aiBinding(env);
  if (!ai) return null;
  const system = [
    agent.system_prompt,
    agent.guardrails,
    `Limba răspunsului: ${language === "en" ? "engleză" : "română"}.`,
    "Folosește exclusiv informațiile din CONTEXT. Dacă lipsesc, spune sincer că verifici cu echipa.",
    "Închide fiecare răspuns cu un singur pas concret, ales după intenție: configuratorul de pe pagina produsului pentru un preț instant, formularul pentru ofertă, WhatsApp la +40 734 605 055 sau apel la același număr. Ton direct, prietenos, fără presiune.",
    `CONTEXT:\n${context}`,
  ].join("\n\n");
  try {
    const output = (await ai.run(agent.model, {
      max_tokens: agent.max_tokens,
      temperature: agent.temperature,
      messages: [{ role: "system", content: system }, ...history.slice(-6)],
    })) as { response?: string };
    const text = (output?.response || "").trim();
    return text || null;
  } catch (error) {
    console.error(JSON.stringify({ event: "ai_generate_failed", agent: agent.slug, error: String(error) }));
    return null;
  }
}

const fallbackAnswer = (language: string) =>
  language === "en"
    ? "I do not have that detail yet, but the team does. Write to contact@avyron.ro or use WhatsApp and you get an answer the same business day."
    : "Nu am încă detaliul acesta, dar echipa îl are. Scrie-ne la contact@avyron.ro sau pe WhatsApp și primești răspuns în aceeași zi lucrătoare.";

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

  const language = body.language === "en" ? "en" : "ro";
  const slug = (body.agent || "avy").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const agent = await c.env.DB.prepare(
    "SELECT * FROM ai_agents WHERE slug = ? AND status = 'active' AND visibility = 'public'",
  ).bind(slug).first<AiAgent>();
  if (!agent) return c.json({ error: { code: "not_found", message: "Agent indisponibil" } }, 404);

  const started = Date.now();
  const matches = await retrieve(c, slug, language, message);
  const best = matches[0]?.score ?? 0;
  const context = matches.map((m) => `• ${m.entry.question}\n${m.entry.answer}`).join("\n\n") || "(fără context)";

  let conversationId = body.conversationId && /^conv_[a-z0-9]+$/.test(body.conversationId) ? body.conversationId : null;
  const history: { role: string; content: string }[] = [];
  if (conversationId) {
    const { results } = await c.env.DB.prepare(
      "SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 6",
    ).bind(conversationId).all<{ role: string; content: string }>();
    history.push(...results.reverse());
  }
  history.push({ role: "user", content: message });

  const generated = await generate(c.env, agent, context, history, language);
  const reply = generated || (best >= 0.34 ? matches[0].entry.answer : fallbackAnswer(language));
  const latency = Date.now() - started;
  const ts = now();

  if (!conversationId) {
    conversationId = id("conv").replace(/[^a-z0-9_]/g, "");
    await c.env.DB.prepare(
      `INSERT INTO ai_conversations (id, agent_slug, channel, visitor_id, language, page, created_at, last_at, messages)
       VALUES (?, ?, 'site', ?, ?, ?, ?, ?, 0)`,
    ).bind(conversationId, slug, (body.visitorId || "").slice(0, 64) || null, language, (body.page || "").slice(0, 200) || null, ts, ts).run();
  }

  const answerId = id("msg");
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO ai_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'user', ?, ?)")
      .bind(id("msg"), conversationId, message, ts),
    c.env.DB.prepare(
      "INSERT INTO ai_messages (id, conversation_id, role, content, matched_ids, confidence, latency_ms, created_at) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)",
    ).bind(answerId, conversationId, reply, matches.map((m) => m.entry.id).join(","), best, latency, ts),
    c.env.DB.prepare("UPDATE ai_conversations SET messages = messages + 2, last_at = ? WHERE id = ?").bind(ts, conversationId),
  ]);

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
  const row = await c.env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(c.get("userId")).first<{ email: string }>();
  return !!row && row.email.trim().toLowerCase() === OWNER_EMAIL;
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

aiOsRouter.put("/api/ai/admin/agents/:slug", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  const patch = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!patch) return c.json({ error: { code: "bad_request", message: "JSON invalid" } }, 400);
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const field of AGENT_FIELDS) {
    if (patch[field] === undefined) continue;
    sets.push(`${field} = ?`);
    values.push(patch[field]);
  }
  if (!sets.length) return c.json({ error: { code: "bad_request", message: "Nimic de actualizat" } }, 400);
  sets.push("updated_at = ?", "updated_by = ?");
  values.push(now(), c.get("userId"), c.req.param("slug"));
  await c.env.DB.prepare(`UPDATE ai_agents SET ${sets.join(", ")} WHERE slug = ?`).bind(...values).run();
  return c.json({ ok: true });
});

aiOsRouter.post("/api/ai/admin/agents", async (c) => {
  const denied = await requireOwner(c);
  if (denied) return denied;
  const body = await c.req.json<{ slug?: string; name?: string; mission?: string; channel?: string }>().catch(() => null);
  const slug = (body?.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug || !body?.name) return c.json({ error: { code: "bad_request", message: "Slug și nume obligatorii" } }, 400);
  const ts = now();
  await c.env.DB.prepare(
    `INSERT INTO ai_agents (id, slug, name, mission, channel, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id("agent"), slug, body.name, body.mission || "", body.channel || "site", ts, ts, c.get("userId")).run();
  return c.json({ ok: true, slug });
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

aiOsRouter.get("/api/ai/admin/stats", async (c) => {
  const days = Math.max(1, Math.min(90, Number(c.req.query("days")) || 30));
  const since = now() - days * 86_400;
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
    `SELECT date(created_at,'unixepoch') AS day, COUNT(*) AS conversations
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
