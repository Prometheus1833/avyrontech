import { cfAuth } from "./cfAuth";
import type { AiContentItem, AiSocialJob } from "./aiProjectsApi";
export type SocialSnapshot = {
  project: { id: string; slug: string; name: string; automation_mode: string };
  permission: { canReview: boolean; canCreate: boolean; canPlan: boolean };
  counts: Record<string, number>;
  content: AiContentItem[];
  total: number;
  nextOffset: number | null;
  activities: (AiSocialJob & { plan_review_state: "pending" | "approved" | "rejected" })[];
  activityContent: AiContentItem[];
  scheduled: {
    id: string;
    title: string;
    channels_json: string;
    scheduled_at: number | null;
    status: string;
  }[];
  generatedAt: number;
};
export const socialManagerApi = {
  sync: (projectId: string) => cfAuth.request<{ ok: true; updated: number }>(`/api/ai-projects/${encodeURIComponent(projectId)}/social-manager/sync`, { method: "POST" }),
  reviewPlan: (projectId: string, jobId: string, decision: "approved" | "rejected", expectedUpdatedAt: number) => cfAuth.request<{ ok: true }>(`/api/ai-projects/${encodeURIComponent(projectId)}/social-jobs/${encodeURIComponent(jobId)}/review`, { method: "POST", body: JSON.stringify({ decision, expectedUpdatedAt, confirmed: true }) }),
  snapshot: (slug: string, status: string, offset = 0) =>
    cfAuth.request<SocialSnapshot>(
      `/api/ai-projects/${encodeURIComponent(slug)}/social-manager?${new URLSearchParams({ ...(status !== "review" ? { status } : {}), offset: String(offset) })}`,
    ),
};
