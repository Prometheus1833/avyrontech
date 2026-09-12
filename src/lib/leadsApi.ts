import { cfAuth } from "./cfAuth";

export type LeadStage =
  | "new_lead" | "contacted" | "discussion" | "potential_client" | "offer"
  | "accepted" | "rejected" | "converted";
export type LeadChannel = "phone" | "whatsapp" | "email" | "sms" | "social";

export type LeadListRow = {
  id: string; organization_id: string | null; source: string | null;
  name: string | null; business: string | null; phone: string | null;
  email: string | null; product: string | null; status: string;
  lifecycle_stage: LeadStage; preferred_channel: LeadChannel | null;
  next_follow_up_at: number | null; urgent: number; converted_project_id: string | null;
  estimate_ron: number | null; delivery_status: string | null;
  created_at: number; updated_at: number | null;
};

export type LeadDetail = LeadListRow & {
  message: string | null; website: string | null; lost_reason: string | null;
  provenance_url: string | null; outreach_eligibility: string;
};

export type LeadActivity = {
  id: string; actor_user_id: string | null; actor_agent_slug: string | null;
  kind: string; direction: string | null; outcome: string | null;
  content: string | null; occurred_at: number; created_at: number;
};

export type LeadAssignment = {
  user_id: string; assignment_role: string; assigned_at: number;
  email: string; display_name: string | null;
};

export type LeadReminder = {
  id: string; assigned_to: string; due_at: number; note: string;
  status: "pending" | "done" | "cancelled"; completed_at: number | null;
  created_at: number;
};

export type LeadDetailResponse = {
  data: LeadDetail;
  activities: LeadActivity[];
  assignments: LeadAssignment[];
  reminders: LeadReminder[];
  canEdit: boolean;
};

export type NewLeadInput = {
  name?: string; business?: string; source?: string; phone?: string; email?: string;
  website?: string; product?: string; message?: string; preferredChannel?: LeadChannel;
  nextFollowUpAt?: number | null; urgent?: boolean; estimateRon?: number | null;
  provenanceUrl?: string; outreachEligibility?: string;
};

export const leadsApi = {
  list: () => cfAuth.request<{ data: LeadListRow[] }>("/api/leads"),
  detail: (id: string) => cfAuth.request<LeadDetailResponse>(`/api/leads/${id}`),
  create: (input: NewLeadInput) =>
    cfAuth.request<{ id: string }>("/api/leads", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(input),
    }),
  update: (id: string, patch: {
    lifecycleStage?: LeadStage; urgent?: boolean; nextFollowUpAt?: number | null;
    preferredChannel?: LeadChannel | null; lostReason?: string | null;
  }) => cfAuth.request<{ ok: true }>(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  addActivity: (id: string, input: { kind: string; direction?: string; outcome?: string; content?: string }) =>
    cfAuth.request<{ id: string }>(`/api/leads/${id}/activities`, { method: "POST", body: JSON.stringify(input) }),
  addReminder: (id: string, input: { dueAt: number; note: string; assignedTo?: string }) =>
    cfAuth.request<{ id: string }>(`/api/leads/${id}/reminders`, { method: "POST", body: JSON.stringify(input) }),
  closeReminder: (leadId: string, reminderId: string, status: "done" | "cancelled") =>
    cfAuth.request<{ ok: true }>(`/api/leads/${leadId}/reminders/${reminderId}`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),
};
