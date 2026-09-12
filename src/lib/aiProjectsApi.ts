import { cfAuth } from "./cfAuth";

export type AiObjective = "sales" | "promotion" | "visibility" | "monetization" | "community";
export type AiAutomationMode = "manual" | "approval" | "automatic";
export type AiProjectStatus = "setup" | "active" | "paused" | "archived";
export type AiContentFormat = "post" | "story" | "reel" | "carousel" | "message" | "article";
export type AiChannelProvider = "facebook" | "instagram" | "tiktok" | "linkedin" | "whatsapp" | "messenger";

export type AiProjectListRow = {
  id: string; organization_id: string | null; slug: string; name: string;
  product_key: string; ownership_scope: "agency" | "client_managed";
  summary: string; status: AiProjectStatus; primary_objective: AiObjective;
  automation_mode: AiAutomationMode; memory_status: "empty" | "learning" | "ready" | "stale" | "paused";
  channels_total: number; channels_connected: number; agents_total: number;
  agents_ready: number; content_pending: number; updated_at: number;
};

export type AiProject = AiProjectListRow & {
  brand_tone: string; target_audience: string; core_offer: string;
  agent_instructions: string; competitor_scopes_json: string;
  daily_generation_limit: number; content_retention_days: number;
  raw_data_retention_days: number; max_asset_bytes: number;
  allow_outbound_messages: number;
};

export type AiProjectChannel = {
  project_id: string; provider: AiChannelProvider; connection_id: string | null;
  account_label: string | null; external_account_id: string | null;
  connection_status: "disconnected" | "verifying" | "connected" | "error" | "paused";
  allowed_actions_json: string; last_analyzed_at: number | null;
  last_synced_at: number | null; last_error_code: string | null;
  verified_provider: string | null; verified_connection_status: string | null;
  last_validated_at: number | null;
};

export type AiProjectAgent = {
  agent_slug: string; role: string; status: "setup" | "training" | "ready" | "paused" | "error";
  autonomy: "assist" | "semi" | "auto"; capabilities_json: string;
  instructions: string; quality_score: number | null; last_trained_at: number | null;
  last_run_at: number | null; name: string; mission: string; accent: string;
  current_version: number;
};

export type AiContentItem = {
  id: string; generated_by_agent: string | null; format: AiContentFormat;
  objective: AiObjective; channels_json: string; title: string; caption: string;
  visual_direction: string; cta: string; hashtags_json: string;
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "published" | "rejected" | "expired";
  scheduled_at: number | null; published_at: number | null; expires_at: number;
  created_at: number; updated_at: number;
};

export type AiProjectMemory = {
  id: string; kind: string; summary: string; source_url: string | null;
  confidence: number; status: string; observed_at: number; expires_at: number;
};

export type AiProjectCompetitor = {
  id: string; name: string; scope: "local" | "national" | "international";
  canonical_url: string; monitoring_status: string; rationale: string;
  last_analyzed_at: number | null;
};

export type AiProjectMember = {
  user_id: string; role: string; status: string; granted_at: number;
  email: string; display_name: string | null;
};

export type AiProjectDetail = {
  project: AiProject;
  channels: AiProjectChannel[];
  agents: AiProjectAgent[];
  content: AiContentItem[];
  memories: AiProjectMemory[];
  competitors: AiProjectCompetitor[];
  members: AiProjectMember[];
  events: Array<{ action: string; target_type: string | null; target_id: string | null; created_at: number }>;
  permission: { role: string; canManage: boolean; canCreateContent: boolean; canConnect: boolean };
};

export const aiProjectsApi = {
  list: () => cfAuth.request<{ data: AiProjectListRow[]; platformRole: string | null }>("/api/ai-projects"),
  detail: (slug: string) => cfAuth.request<AiProjectDetail>(`/api/ai-projects/${encodeURIComponent(slug)}`),
  update: (id: string, patch: Record<string, unknown>) =>
    cfAuth.request<{ ok: true }>(`/api/ai-projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  updateChannel: (id: string, provider: AiChannelProvider, patch: { status: string; connectionId?: string | null; accountLabel?: string | null }) =>
    cfAuth.request<{ ok: true }>(`/api/ai-projects/${id}/channels/${provider}`, { method: "PATCH", body: JSON.stringify(patch) }),
  generate: (id: string, input: { format: AiContentFormat; channel: AiChannelProvider; objective: AiObjective; topic: string; context?: string }) =>
    cfAuth.request<{ data: AiContentItem; runId: string }>(`/api/ai-projects/${id}/content/generate`, {
      method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(input),
    }),
  updateContent: (projectId: string, contentId: string, status: "draft" | "pending_approval" | "approved" | "rejected") =>
    cfAuth.request<{ ok: true }>(`/api/ai-projects/${projectId}/content/${contentId}`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),
};
