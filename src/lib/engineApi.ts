import { cfAuth } from "./cfAuth";

export type EngineSource = {
  id: string; slug: string; name: string; canonical_url: string; source_type: string;
  access_mode: string; pricing_model: string; lifecycle_status: string;
  verification_status: string; security_status: string; account_label: string | null;
  summary: string; robots_reviewed: number; terms_reviewed: number; discovery_enabled: number;
  last_observed_at: number | null; last_verified_at: number | null; next_review_at: number | null;
  approved_at: number | null; updated_at: number; capability_count?: number; document_count?: number;
};

export type EngineCapability = {
  id: string; source_id: string; slug: string; name: string; category: string; summary: string;
  delivery_method: string; availability: string; implementation_status: string; risk_level: string;
  documentation_url: string | null; repository_url: string | null; license_spdx: string | null;
  requirements_json: string; tags_json: string; evidence_json: string; approved_at: number | null;
};

export type EngineConnector = {
  id: string; capability_id: string | null; kind: string; name: string; endpoint_url: string | null;
  repository_url: string | null; auth_type: string; status: string; scopes_json: string;
  last_validated_at: number | null; last_error_code: string | null; approved_at: number | null;
};

export type EngineDocument = {
  id: string; capability_id: string | null; document_type: string; title: string; file_name: string;
  content_type: string; size_bytes: number; sha256: string; version: number; status: string;
  trust_level: string; agent_usable: number; notes: string; created_at: number; updated_at: number;
};

export type EngineSuggestion = {
  id: string; name: string; canonical_url: string; source_type: string; rationale: string;
  proposed_capabilities_json: string; evidence_json: string; status: string; risk_level: string;
  suggested_by_kind: string; suggested_by_agent: string | null; created_at: number;
  reviewed_at: number | null; review_note: string | null;
};

export type EngineBinding = {
  id: string; capability_id: string; target_type: string; target_key: string; purpose: string;
  visibility: string; status: string; configuration_json: string; capability_name: string;
  category: string; source_name: string; updated_at: number;
};

export type EngineOverview = {
  sources: { total: number; active: number; reviewing: number; blocked: number };
  capabilities: { total: number; ready: number };
  documents: { total: number; pending: number };
  suggestions: { total: number; pending: number };
  bindings: { total: number; active: number };
  recentDiscoveryRuns: Array<{ id: string; status: string; discovered_count: number; error_code: string | null; created_at: number }>;
  discoveryPolicy: { id: string; name: string; enabled: number; frequency_days: number; max_sources_per_run: number; next_run_at: number | null; last_run_at: number | null };
};

export type EngineSourceDetail = {
  source: EngineSource & { license_spdx: string | null; license_url: string | null; terms_url: string | null; metadata_json: string };
  capabilities: EngineCapability[]; connectors: EngineConnector[]; documents: EngineDocument[];
  history: Array<{ action: string; resource_type: string; resource_id: string | null; source: string; created_at: number }>;
};

const mutate = <T>(path: string, method: string, body?: unknown) => cfAuth.request<T>(path, {
  method,
  headers: { "Idempotency-Key": crypto.randomUUID() },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const engineApi = {
  overview: () => cfAuth.request<EngineOverview>("/api/engine/overview"),
  sources: (query = "") => cfAuth.request<{ data: EngineSource[] }>(`/api/engine/sources${query ? `?${query}` : ""}`),
  source: (id: string) => cfAuth.request<EngineSourceDetail>(`/api/engine/sources/${encodeURIComponent(id)}`),
  capabilities: () => cfAuth.request<{ data: Array<EngineCapability & { source_name: string; source_status: string }> }>("/api/engine/capabilities"),
  createSource: (input: { name: string; canonicalUrl: string; sourceType: string; accessMode: string; pricingModel: string; summary: string; accountLabel?: string | null }) =>
    mutate<{ id: string }>("/api/engine/sources", "POST", input),
  updateSource: (id: string, patch: Record<string, unknown>) => mutate<{ ok: true }>(`/api/engine/sources/${encodeURIComponent(id)}`, "PATCH", patch),
  createCapability: (sourceId: string, input: Record<string, unknown>) => mutate<{ id: string }>(`/api/engine/sources/${encodeURIComponent(sourceId)}/capabilities`, "POST", input),
  updateCapability: (id: string, status: string) => mutate<{ ok: true }>(`/api/engine/capabilities/${encodeURIComponent(id)}`, "PATCH", { status }),
  createConnector: (sourceId: string, input: { name: string; kind: string; endpointUrl?: string | null; repositoryUrl?: string | null; authType: string; capabilityId?: string | null }) =>
    mutate<{ id: string }>(`/api/engine/sources/${encodeURIComponent(sourceId)}/connectors`, "POST", input),
  updateConnector: (id: string, status: string) => mutate<{ ok: true }>(`/api/engine/connectors/${encodeURIComponent(id)}`, "PATCH", { status }),
  uploadDocument: async (sourceId: string, file: File, documentType: string) => {
    const form = new FormData(); form.append("file", file); form.append("documentType", documentType);
    return cfAuth.request<{ id: string }>(`/api/engine/sources/${encodeURIComponent(sourceId)}/documents`, { method: "POST", body: form });
  },
  updateDocument: (id: string, patch: { status: string; trustLevel: string; agentUsable: boolean }) => mutate<{ ok: true }>(`/api/engine/documents/${encodeURIComponent(id)}`, "PATCH", patch),
  downloadDocument: async (id: string, fileName: string) => {
    const response = await cfAuth.raw(`/api/engine/documents/${encodeURIComponent(id)}/content`);
    if (!response.ok) throw new Error("Documentul nu poate fi descărcat.");
    const url = URL.createObjectURL(await response.blob()), anchor = document.createElement("a");
    anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
  },
  suggestions: () => cfAuth.request<{ data: EngineSuggestion[] }>("/api/engine/suggestions"),
  createSuggestion: (input: { name: string; canonicalUrl: string; sourceType: string; rationale: string }) => mutate<{ id: string }>("/api/engine/suggestions", "POST", input),
  reviewSuggestion: (id: string, status: "reviewing" | "approved" | "rejected", note = "") => mutate<{ ok: true }>(`/api/engine/suggestions/${encodeURIComponent(id)}`, "PATCH", { status, note }),
  promoteSuggestion: (id: string) => mutate<{ sourceId: string }>(`/api/engine/suggestions/${encodeURIComponent(id)}/promote`, "POST"),
  bindings: () => cfAuth.request<{ data: EngineBinding[] }>("/api/engine/bindings"),
  createBinding: (input: { capabilityId: string; targetType: string; targetKey: string; purpose: string; visibility: string }) => mutate<{ id: string }>("/api/engine/bindings", "POST", input),
  updateBinding: (id: string, status: string) => mutate<{ ok: true }>(`/api/engine/bindings/${encodeURIComponent(id)}`, "PATCH", { status }),
  discover: (sourceId: string) => mutate<{ runId: string; decision: string; count: number }>(`/api/engine/sources/${encodeURIComponent(sourceId)}/discover`, "POST"),
  updateDiscoveryPolicy: (input: { enabled: boolean; frequencyDays: number; maxSourcesPerRun: number }) => mutate<{ ok: true }>("/api/engine/discovery-policy", "PATCH", input),
};
