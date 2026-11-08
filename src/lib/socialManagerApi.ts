import { cfAuth } from "./cfAuth";
import type { AiContentItem, AiSocialJob } from "./aiProjectsApi";
import type { SocialDraftInput, SocialView } from "@/shared/socialEditorial";
export type SocialContent = AiContentItem & {
  reusable?: number;
  source_ref?: string | null;
  source_revision?: string | null;
  source_metadata_json?: string;
  reused_from_id?: string | null;
  archived_at?: number | null;
};
export type SocialActivity = AiSocialJob & {
  plan_review_state: "pending" | "approved" | "rejected";
  archived_at?: number | null;
  brief_json?: string;
};
export type SocialSnapshot = {
  project: { id: string; slug: string; name: string; automation_mode: string };
  permission: { canReview: boolean; canCreate: boolean; canPlan: boolean };
  counts: Record<string, number>;
  content: SocialContent[];
  total: number;
  nextOffset: number | null;
  activities: SocialActivity[];
  activityContent: SocialContent[];
  scheduled: {
    id: string;
    title: string;
    channels_json: string;
    scheduled_at: number | null;
    status: string;
  }[];
  summary?: { reusable: number; archived: number };
  window?: { start: number; end: number; view: SocialView; timezone: string };
  integration?: {
    agent: {
      name: string;
      status: string;
      current_version: number;
      model: string;
    } | null;
    operators: { status: string; synced_at: number; operator_role: string }[];
    policy: {
      timezone: string;
      status: string;
      last_planned_at: number | null;
      time_slots_json: string;
      strategy: {
        startsOn?: string;
        objective?: string;
        cadence?: string;
        measurement?: string;
        nextAction?: string;
        pillars?: string[];
      };
    } | null;
    handoff: { lastHandoffAt: number | null };
    channels: {
      provider: string;
      account_label: string | null;
      connection_status: string;
      verified_status: string | null;
      last_validated_at: number | null;
    }[];
  };
  generatedAt: number;
};
const root = (id: string) => `/api/ai-projects/${encodeURIComponent(id)}`;
export const socialManagerApi = {
  snapshot: (
    slug: string,
    status: string,
    offset = 0,
    view: SocialView = "focus",
    query = "",
  ) =>
    cfAuth
      .request<SocialSnapshot>(
        `${root(slug)}/social-manager?${new URLSearchParams({ ...(status !== "review" && status !== "all" ? { status } : {}), offset: String(offset), view, ...(query ? { q: query } : {}) })}`,
      )
      .then((value) => {
        if (
          !value?.project ||
          typeof value.project.id !== "string" ||
          !value.permission ||
          typeof value.permission.canReview !== "boolean" ||
          !value.counts ||
          Array.isArray(value.counts) ||
          !Array.isArray(value.content) ||
          !Array.isArray(value.activities) ||
          value.content.some(
            (item) =>
              !item ||
              typeof item.id !== "string" ||
              typeof item.title !== "string" ||
              typeof item.caption !== "string",
          )
        )
          throw Error("Răspunsul editorial este incomplet. Reîncarcă agenda.");
        return {
          ...value,
          activityContent: Array.isArray(value.activityContent)
            ? value.activityContent
            : [],
          scheduled: Array.isArray(value.scheduled) ? value.scheduled : [],
        };
      }),
  sync: (id: string) =>
    cfAuth.request<{
      ok: true;
      updated: number;
      archived: number;
      created: number;
    }>(`${root(id)}/social-manager/sync`, { method: "POST" }),
  archive: (id: string) =>
    cfAuth.request<{ ok: true; archived: number }>(
      `${root(id)}/social-manager/archive`,
      { method: "POST", body: JSON.stringify({ confirmed: true }) },
    ),
  reviewPlan: (
    id: string,
    jobId: string,
    decision: "approved" | "rejected",
    expectedUpdatedAt: number,
  ) =>
    cfAuth.request<{ ok: true }>(
      `${root(id)}/social-jobs/${encodeURIComponent(jobId)}/review`,
      {
        method: "POST",
        body: JSON.stringify({ decision, expectedUpdatedAt, confirmed: true }),
      },
    ),
  reschedule: (
    id: string,
    jobId: string,
    dueAt: number,
    expectedUpdatedAt: number,
  ) =>
    cfAuth.request<{ ok: true }>(
      `${root(id)}/social-jobs/${encodeURIComponent(jobId)}/reschedule`,
      { method: "POST", body: JSON.stringify({ dueAt, expectedUpdatedAt }) },
    ),
  create: (id: string, draft: SocialDraftInput, key: string) =>
    cfAuth.request<{ id: string; replayed: boolean }>(
      `${root(id)}/social-manager/drafts`,
      {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(draft),
      },
    ),
  edit: (
    id: string,
    contentId: string,
    draft: SocialDraftInput,
    expectedUpdatedAt: number,
  ) =>
    cfAuth.request<{ ok: true; updatedAt: number }>(
      `${root(id)}/social-manager/drafts/${encodeURIComponent(contentId)}`,
      { method: "PUT", body: JSON.stringify({ draft, expectedUpdatedAt }) },
    ),
  reuse: (id: string, item: SocialContent, key: string) =>
    cfAuth.request<{ id: string }>(
      `${root(id)}/social-manager/drafts/${encodeURIComponent(item.id)}/reuse`,
      {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          expectedUpdatedAt: item.updated_at,
          scheduledAt: Date.now(),
        }),
      },
    ),
  asset: (id: string, assetId: string) =>
    cfAuth.raw(`${root(id)}/social-assets/${encodeURIComponent(assetId)}`),
};
