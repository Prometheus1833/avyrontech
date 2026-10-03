import { cfAuth } from "./cfAuth";

export type AiObjective = "sales" | "promotion" | "visibility" | "monetization" | "community";
export type AiAutomationMode = "manual" | "approval" | "automatic";
export type AiProjectStatus = "setup" | "active" | "paused" | "archived";
export type AiContentFormat = "post" | "story" | "reel" | "carousel" | "message" | "article";
export type AiChannelProvider = "facebook" | "instagram" | "tiktok" | "threads" | "linkedin" | "whatsapp" | "messenger";

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

export type AiSocialPolicy = {
  project_id: string; timezone: string; status: "active" | "paused";
  daily_post_count: number; daily_image_count: number; reel_interval_days: number;
  tag_min: number; tag_max: number; weekly_article_weekday: number;
  weekly_article_hour: number; weekly_article_minute: number;
  engagement_interval_minutes: number; story_like_target: number; feed_like_target: number;
  require_human_approval: number; time_slots_json: string; channel_priority_json: string;
  industry_rotation_json: string; last_planned_at: number | null;
  credit_mode: "free_only" | "approved_paid";
};

export type AiSocialToolPolicy = {
  provider: string; capability: string; billing_mode: "free_only" | "approved_paid";
  status: "available" | "pending_connection" | "blocked_paid" | "disabled";
  requires_approval: number; max_calls_per_day: number; notes: string; last_checked_at: number | null;
};

export type AiSocialJob = {
  id: string; schedule_key: string; kind: "daily_post" | "daily_image" | "story" | "reel" | "weekly_article" | "research" | "engagement_review";
  format: string; primary_channel: string; topic: string; brief_json: string;
  status: "queued" | "generating" | "draft_ready" | "awaiting_budget" | "awaiting_approval" | "approved" | "completed" | "failed" | "skipped";
  due_at: number; content_id: string | null; blog_post_id: string | null;
  attempt_count: number; last_error_code: string | null; created_at: number; updated_at: number;
};

export type AiSocialSource = {
  id: string; kind: string; title: string; canonical_url: string | null;
  source_label: string; scope: string; evidence_json: string; insight: string;
  status: "proposed" | "approved" | "rejected" | "expired"; observed_at: number;
};

export type AiSocialOpportunity = {
  id: string; channel: AiChannelProvider; provenance_url: string; business_name: string | null;
  business_signal: string; intent_score: number; recommended_action: string;
  proposed_message: string; status: string; lead_candidate_id: string | null; created_at: number;
};

export type AiSocialAccount = {
  id: string; provider: "facebook" | "instagram" | "tiktok";
  surface: "profile" | "page" | "professional" | "business" | "creator";
  label: string; external_account_id: string | null;
  connection_status: "disconnected" | "verifying" | "connected" | "error" | "paused";
  review_status: "active" | "paused"; timezone: string;
  daily_review_hour: number; daily_review_minute: number;
  cleanup_limit: number; growth_limit: number; require_approval: number;
  last_snapshot_at: number | null; last_review_at: number | null; last_error_code: string | null;
};

export type AiAudienceRun = {
  id: string; account_id: string; provider: AiSocialAccount["provider"];
  surface: AiSocialAccount["surface"]; label: string; review_date: string;
  status: string; cleanup_limit: number; growth_limit: number;
  cleanup_count: number; growth_count: number; due_at: number;
  approved_at: number | null; completed_at: number | null; last_error_code: string | null;
};

export type AiAudienceCandidate = {
  id: string; run_id: string; relationship_id: string;
  action: "unfollow" | "unfriend" | "follow" | "friend_request";
  score: number; reasons_json: string; protection_json: string; status: string;
  approved_at: number | null; executed_at: number | null; last_error_code: string | null;
  profile_url: string; handle: string | null; display_name: string | null;
  relationship: string; profile_kind: string; business_category: string | null;
  website_url: string | null; website_state: string; activity_state: string;
  follows_back: number | null; relevance_score: number; intent_score: number;
};

export type AiSocialDesignProfile = {
  id: string; version: number; status: "draft" | "approved" | "retired";
  profile_json: string; source_sha256: string | null; source_object_key: string | null;
  created_at: number; approved_at: number | null; updated_at: number;
};

export type AiSocialBackup = {
  id: string; scope: "configuration" | "content" | "full";
  status: "creating" | "ready" | "failed" | "verified" | "expired";
  schema_version: number; manifest_sha256: string | null; byte_size: number;
  row_counts_json: string; started_at: number; completed_at: number | null;
  verified_at: number | null; last_error_code: string | null;
};

export type AiSocialAsset = {
  id: string; content_id: string | null; asset_group_id: string | null;
  channel: AiChannelProvider | "blog" | null; role: string; r2_bucket: "files" | "media";
  object_key: string; mime_type: string; width: number | null; height: number | null;
  duration_ms: number | null; byte_size: number; sha256: string;
  provenance_json: string; status: "active" | "archived" | "deleted";
  created_at: number; updated_at: number;
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
  socialPolicy: AiSocialPolicy | null;
  socialJobs: AiSocialJob[];
  socialSources: AiSocialSource[];
  socialOpportunities: AiSocialOpportunity[];
  socialTools: AiSocialToolPolicy[];
  socialAccounts: AiSocialAccount[];
  audienceRuns: AiAudienceRun[];
  audienceCandidates: AiAudienceCandidate[];
  socialDesignProfiles: AiSocialDesignProfile[];
  socialBackups: AiSocialBackup[];
  socialAssets: AiSocialAsset[];
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
  updateSocialPolicy: (projectId: string, patch: Record<string, unknown>) =>
    cfAuth.request<{ ok: true }>(`/api/ai-projects/${projectId}/social-policy`, {
      method: "PATCH", body: JSON.stringify(patch),
    }),
  runSocialPlan: (projectId: string) =>
    cfAuth.request<{ ok: true; created: number; processed: number }>(`/api/ai-projects/${projectId}/social-studio/plan`, { method: "POST" }),
  createSocialBackup: (projectId: string, scope: "configuration" | "content" | "full" = "configuration") =>
    cfAuth.request<{ ok: true; id: string; status: "verified"; sha256: string; byteSize: number; rowCounts: Record<string, number> }>(
      `/api/ai-projects/${projectId}/social-studio/backups`,
      { method: "POST", body: JSON.stringify({ scope }) },
    ),
  downloadSocialBackup: (projectId: string, backupId: string) =>
    cfAuth.requestResponse(`/api/ai-projects/${projectId}/social-studio/backups/${backupId}/download`),
  retrySocialJob: (projectId: string, jobId: string) =>
    cfAuth.request<{ ok: true }>(`/api/ai-projects/${projectId}/social-jobs/${jobId}/retry`, { method: "POST" }),
  addSocialSource: (projectId: string, input: Record<string, unknown>) =>
    cfAuth.request<{ id: string }>(`/api/ai-projects/${projectId}/social-sources`, { method: "POST", body: JSON.stringify(input) }),
  reviewSocialSource: (projectId: string, sourceId: string, status: "approved" | "rejected") =>
    cfAuth.request<{ ok: true }>(`/api/ai-projects/${projectId}/social-sources/${sourceId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  reviewOpportunity: (projectId: string, opportunityId: string, decision: "approved" | "rejected" | "handed_off") =>
    cfAuth.request<{ ok: true; leadCandidateId: string | null }>(`/api/ai-projects/${projectId}/social-opportunities/${opportunityId}`, { method: "PATCH", body: JSON.stringify({ decision }) }),
  addAudienceAccount: (projectId: string, input: { provider: string; surface: string; label: string }) =>
    cfAuth.request<{ id: string }>(`/api/ai-projects/${projectId}/audience/accounts`, {
      method: "POST", body: JSON.stringify(input),
    }),
  reviewAudienceRun: (projectId: string, runId: string, group: "cleanup" | "growth", decision: "approved" | "rejected") =>
    cfAuth.request<{ ok: true; queued: number }>(`/api/ai-projects/${projectId}/audience/runs/${runId}/review`, {
      method: "PATCH", body: JSON.stringify({ group, decision }),
    }),
};
