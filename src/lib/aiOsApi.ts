// Client pentru AI OS "AVY" (Cloudflare Workers + D1).
import { apiUrl } from "./apiBase";
import { cfAuth } from "./cfAuth";

export type PublicAgent = {
  slug: string; name: string; mission: string; accent: string;
  greeting_ro: string; greeting_en: string; channel: string;
};

export type ChatReply = {
  conversationId: string;
  runId: string;
  messageId: string;
  reply: string;
  confidence: number;
  sources: { id: string; question: string; category: string }[];
  handoff: string | null;
};

export type AiAgent = {
  id: string; slug: string; name: string; mission: string; channel: string; status: string;
  visibility: string; model: string; temperature: number; max_tokens: number; autonomy: string;
  language: string; accent: string; greeting_ro: string; greeting_en: string;
  system_prompt: string; guardrails: string; tools_json: string; handoff_email: string | null;
  current_version: number; updated_at: number;
};

export type KnowledgeRow = {
  id: string; agent_slug: string | null; category: string; language: string;
  question: string; answer: string; keywords: string; source: string;
  priority: number; status: string; hits: number; updated_at: number;
};

export type LearningRow = {
  id: string; agent_slug: string; language: string; question: string;
  occurrences: number; best_score: number; created_at: number;
};

export type KnowledgeSource = {
  id: string; organization_id: string | null; connection_id: string | null;
  kind: string; name: string; canonical_url: string | null; status: string;
  visibility: string; trust_level: string; sync_policy_json: string;
  last_synced_at: number | null; last_error_code: string | null;
  provider: string | null; account_label: string | null; connection_status: string | null;
};

export type AiStats = {
  days: number;
  totals: { conversations: number; messages: number; conversions: number };
  quality: { avg_confidence: number; avg_latency: number; up: number | null; down: number | null };
  perAgent: { agent_slug: string; conversations: number }[];
  daily: { day: string; conversations: number }[];
  knowledge: { total: number; active: number };
  learning: { pending: number };
};

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ai_request_failed_${res.status}`);
  return (await res.json()) as T;
}

export const avyApi = {
  agents: async (): Promise<PublicAgent[]> => {
    const res = await fetch(apiUrl("/api/ai/agents"));
    if (!res.ok) return [];
    return ((await res.json()) as { data: PublicAgent[] }).data ?? [];
  },
  chat: (input: {
    agent: string; message: string; conversationId?: string | null;
    language: "ro" | "en"; page?: string; visitorId?: string;
  }) => publicPost<ChatReply>("/api/ai/chat", input),
  feedback: (messageId: string, helpful: boolean) =>
    publicPost<{ ok: true }>("/api/ai/feedback", { messageId, helpful }),
};

export const aiOsAdmin = {
  agents: () => cfAuth.request<{ data: AiAgent[]; canEdit: boolean }>("/api/ai/admin/agents"),
  saveAgent: (slug: string, patch: Partial<AiAgent>) =>
    cfAuth.request<{ ok: true; version: number }>(`/api/ai/admin/agents/${slug}`, { method: "PUT", body: JSON.stringify(patch) }),
  createAgent: (body: { slug: string; name: string; mission?: string; channel?: string }) =>
    cfAuth.request<{ ok: true; slug: string; version: number }>("/api/ai/admin/agents", { method: "POST", body: JSON.stringify(body) }),
  knowledge: (q = "") =>
    cfAuth.request<{ data: KnowledgeRow[]; canEdit: boolean }>(`/api/ai/admin/knowledge${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  saveKnowledge: (row: Partial<KnowledgeRow>) =>
    cfAuth.request<{ ok: true; id: string }>("/api/ai/admin/knowledge", { method: "POST", body: JSON.stringify(row) }),
  archiveKnowledge: (id: string) =>
    cfAuth.request<{ ok: true }>(`/api/ai/admin/knowledge/${id}`, { method: "DELETE" }),
  sources: () => cfAuth.request<{ data: KnowledgeSource[]; canEdit: boolean }>("/api/ai/admin/sources"),
  updateSource: (id: string, patch: { status?: string; trustLevel?: string; visibility?: string }) =>
    cfAuth.request<{ ok: true }>(`/api/ai/admin/sources/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  stats: (days = 30) => cfAuth.request<AiStats>(`/api/ai/admin/stats?days=${days}`),
  conversations: () =>
    cfAuth.request<{ data: { id: string; agent_slug: string; language: string; page: string | null; messages: number; last_at: number }[] }>(
      "/api/ai/admin/conversations",
    ),
  transcript: (id: string) =>
    cfAuth.request<{ data: { role: string; content: string; confidence: number | null; created_at: number }[] }>(
      `/api/ai/admin/conversations/${id}`,
    ),
  learning: () => cfAuth.request<{ data: LearningRow[]; canEdit: boolean }>("/api/ai/admin/learning"),
  resolveLearning: (id: string, body: { action: "approve" | "reject"; answer?: string; category?: string }) =>
    cfAuth.request<{ ok: true; learned: boolean }>(`/api/ai/admin/learning/${id}`, { method: "POST", body: JSON.stringify(body) }),
};
