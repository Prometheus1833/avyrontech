import { cfAuth } from "@/lib/cfAuth";

export type SurveySettings = { retention_days: number; public_enabled: number; ai_enabled: number; updated_at: number };
export type SurveyStatusCount = { status: string; total: number };
export type SurveyTemplate = { id: string; title: string; active: number; current_version_id: string | null; public_visible: number; updated_at: number };
export type SurveyRow = {
  id: string; title: string; status: string; completion: number; lead_id: string | null; client_id: string | null;
  project_id: string | null; updated_at: number; response_revision: number | null; brief_status: string | null;
};
export type SurveyOverview = {
  canEdit: boolean;
  settings: SurveySettings;
  statuses: SurveyStatusCount[];
  templates: SurveyTemplate[];
  recent: SurveyRow[];
  briefs: SurveyStatusCount[];
};

export const surveyAdminApi = {
  overview: () => cfAuth.request<SurveyOverview>("/api/surveys/admin/overview"),
  saveSettings: (body: { retentionDays: number; publicEnabled: boolean; aiEnabled: boolean }) =>
    cfAuth.request<{ ok: true }>("/api/surveys/admin/settings", {
      method: "PATCH",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  saveTemplate: (id: string, body: { active: boolean; publicVisible: boolean }) =>
    cfAuth.request<{ ok: true }>(`/api/surveys/admin/templates/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
};
