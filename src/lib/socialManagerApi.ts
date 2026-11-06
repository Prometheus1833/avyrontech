import { cfAuth } from "./cfAuth";
import type { AiContentItem, AiSocialJob } from "./aiProjectsApi";
export type SocialSnapshot = {
  project: { id: string; slug: string; name: string; automation_mode: string };
  permission: { canReview: boolean; canCreate: boolean };
  counts: Record<string, number>;
  content: AiContentItem[];
  total: number;
  nextOffset: number | null;
  activities: AiSocialJob[];
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
  snapshot: (slug: string, status: string, offset = 0) =>
    cfAuth.request<SocialSnapshot>(
      `/api/ai-projects/${encodeURIComponent(slug)}/social-manager?${new URLSearchParams({ ...(status !== "review" ? { status } : {}), offset: String(offset) })}`,
    ),
};
