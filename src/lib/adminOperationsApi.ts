import { cfAuth } from "@/lib/cfAuth";

export type AdminClient = {
  id: string; company_name: string; contact_name: string | null; email: string; phone: string | null;
  status: "active" | "paused" | "archived"; created_at: number; project_count: number;
  active_subscription_count: number; account_count: number;
};

export type AdminProjectOption = { id: string; name: string; status: string; client_id?: string };
export type AdminAccountOption = { id: string; email: string; display_name: string | null; company_name: string | null };
export type AdminSubscription = {
  id: string; status: "active" | "paused" | "cancelled"; next_billing_date: number;
  service_id: string; service_name: string; price: number; billing_cycle: "one_time" | "monthly" | "yearly";
  client_id: string; company_name: string; project_id: string; project_name: string; project_status: string;
};
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
  clients: () => cfAuth.request<{ data: AdminClient[] }>("/api/admin/operations/clients"),
  client: (id: string) => cfAuth.request<{
    client: AdminClient; projects: AdminProjectOption[]; subscriptions: AdminSubscription[];
    accounts: AdminAccountOption[]; orders: Array<Record<string, unknown>>; carts: Array<Record<string, unknown>>;
    availableProjects: AdminProjectOption[]; accountOptions: AdminAccountOption[];
  }>(`/api/admin/operations/clients/${encodeURIComponent(id)}`),
  updateClient: (id: string, body: unknown) => write<{ ok: true }>(`clients/${encodeURIComponent(id)}`, body),
  setClientAccounts: (id: string, userIds: string[]) => write<{ ok: true }>(`clients/${encodeURIComponent(id)}/accounts`, { userIds }, "PUT"),
  assignClientProjects: (id: string, projectIds: string[]) => write<{ ok: true }>(`clients/${encodeURIComponent(id)}/projects`, { projectIds }, "PUT"),
  staff: () => cfAuth.request<{ data: Array<AdminAccountOption & { disabled_at: number | null; roles: string; project_ids: string | null }>; projects: AdminProjectOption[] }>("/api/admin/operations/staff"),
  setStaffProjects: (id: string, projectIds: string[]) => write<{ ok: true }>(`staff/${encodeURIComponent(id)}/projects`, { projectIds }, "PUT"),
  subscriptions: () => cfAuth.request<{ data: AdminSubscription[]; traffic: { events: number; sessions: number } }>("/api/admin/operations/subscriptions"),
  updateSubscription: (id: string, body: unknown) => write<{ ok: true }>(`subscriptions/${encodeURIComponent(id)}`, body),
  resources: () => cfAuth.request<{ data: InternalResource[] }>("/api/admin/operations/resources"),
  createResource: (body: unknown) => write<{ ok: true; id: string }>("resources", body, "POST"),
  updateResource: (id: string, body: unknown) => write<{ ok: true }>(`resources/${encodeURIComponent(id)}`, body),
};
