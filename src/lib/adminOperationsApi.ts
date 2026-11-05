import { cfAuth } from "@/lib/cfAuth";

import { clientWorkspaceApi } from "./clientWorkspaceApi";
export type { ClientRecord as AdminClient } from "@/shared/clientWorkspace";

export type AdminProjectOption = { id: string; name: string; status: string; client_id?: string };
export type AdminAccountOption = { id: string; email: string; display_name: string | null; company_name: string | null };
import type { AdminSubscription } from "@/shared/adminSubscriptions";
export type { AdminSubscription } from "@/shared/adminSubscriptions";
export type InternalResource = {
  id: string; kind: "website" | "field" | "tool" | "reference" | "career" | "library";
  title: string; description: string; url: string | null; category: string;
  status: "active" | "planned" | "archived"; created_at: number; updated_at: number;
};

const write = <T>(path: string, body: unknown, method: "POST" | "PUT" | "PATCH" = "PATCH") => cfAuth.request<T>(`/api/admin/operations/${path}`, {
  method,
  headers: { "Idempotency-Key": crypto.randomUUID() },
  body: JSON.stringify(body),
});

export const adminOperationsApi = {
  clients: (params = new URLSearchParams()) => clientWorkspaceApi.list(params),
  client: clientWorkspaceApi.get,
  updateClient: clientWorkspaceApi.save,
  setClientAccounts: clientWorkspaceApi.accounts,
  assignClientProjects: clientWorkspaceApi.projects,
  staff: () => cfAuth.request<{ data: Array<AdminAccountOption & { disabled_at: number | null; roles: string; project_ids: string | null }>; projects: AdminProjectOption[] }>("/api/admin/operations/staff"),
  setStaffProjects: (id: string, projectIds: string[]) => write<{ ok: true }>(`staff/${encodeURIComponent(id)}/projects`, { projectIds }, "PUT"),
  subscriptions: () => cfAuth.request<{ data: AdminSubscription[]; traffic: { events: number; sessions: number } }>("/api/admin/operations/subscriptions"),
  updateSubscription: (id: string, body: unknown) => write<{ ok: true }>(`subscriptions/${encodeURIComponent(id)}`, body),
  resources: () => cfAuth.request<{ data: InternalResource[] }>("/api/admin/operations/resources"),
  createResource: (body: unknown) => write<{ ok: true; id: string }>("resources", body, "POST"),
  updateResource: (id: string, body: unknown) => write<{ ok: true }>(`resources/${encodeURIComponent(id)}`, body),
};
