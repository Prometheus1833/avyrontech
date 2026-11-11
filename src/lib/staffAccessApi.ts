import { cfAuth } from "./cfAuth";
import type { StaffRankId, StaffRankProfile } from "@/shared/staffAccess";
export type AgencyMember = {
  id: string;
  display_name: string;
  email?: string;
  username?: string;
  roles: string;
  rank_id: StaffRankId | null;
  platform_role: "platform_owner" | "superadmin" | null;
  delegated_owner?: 0 | 1;
  delegable_owner?: 0 | 1;
  revision: number | null;
  expires_at: number | null;
  disabled_at?: number | null;
  must_change_password?: number;
};
export type StaffAccessConfig = {
  data: AgencyMember[];
  profiles: StaffRankProfile[];
  permissions: readonly (readonly string[])[];
  projects: { id: string; name: string; client_id: string }[];
  subscriptions: {
    id: string;
    name: string;
    project_id: string;
    project_name: string;
  }[];
  clients: { id: string; name: string }[];
  aiProjects: { id: string; name: string }[];
  canManage: boolean;
  mfaVerified: boolean;
  mfaSatisfied: boolean;
  platformRole: string | null;
};
export type Assignment = {
  rankId: StaffRankId | null;
  permissions: string[];
  projectIds: string[];
  subscriptionIds: string[];
  clientIds: string[];
  aiProjectIds: string[];
  revision: number;
  expiresAt: number | null;
  reason: string;
  confirmed: boolean;
};
export type StaffAccessDetail = {
  assignment: Pick<
    Assignment,
    "rankId" | "permissions" | "expiresAt" | "revision"
  > | null;
  projects: { id: string; role: string }[];
  subscriptions: { id: string }[];
  clients: { id: string }[];
  aiProjects: { id: string; role: string }[];
  capabilities: {
    capability: string;
    organization_id: string | null;
    expires_at: number | null;
  }[];
  canManage: boolean;
};
export const staffAccessApi = {
  config: () => cfAuth.request<StaffAccessConfig>("/api/staff-access"),
  detail: (id: string) =>
    cfAuth.request<StaffAccessDetail>(
      "/api/staff-access/" + encodeURIComponent(id),
    ),
  delegateOwner: (id: string, body: { revision: number; reason: string; confirmed: true }, key: string) =>
    cfAuth.request<{ ok: true; delegated: true }>(
      "/api/staff-access/" + encodeURIComponent(id) + "/delegate-owner",
      { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(body) },
    ),
  save: (id: string, body: Assignment, key: string) =>
    cfAuth.request<{ ok: true }>(
      "/api/staff-access/" + encodeURIComponent(id),
      {
        method: "PUT",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(body),
      },
    ),
  profile: (
    id: string,
    body: { permissions: string[]; revision: number; confirmed: true },
    key: string,
  ) =>
    cfAuth.request<{ ok: true }>(
      "/api/staff-access/profiles/" + encodeURIComponent(id),
      {
        method: "PATCH",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(body),
      },
    ),
};
