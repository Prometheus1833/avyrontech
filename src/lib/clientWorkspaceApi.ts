import { cfAuth } from "./cfAuth";
import type {
  ClientAccount,
  ClientFile,
  ClientIdentity,
  ClientRecord,
  CreateClientInput,
  NewClientAccount,
  ClientProjectOption,
} from "@/shared/clientWorkspace";
const root = "/api/admin/operations/clients";
const write = <T>(url: string, body: unknown, key: string, method = "POST") =>
  cfAuth.request<T>(url, {
    method,
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
export const clientWorkspaceApi = {
  list: (params: URLSearchParams) =>
    cfAuth.request<{
      data: ClientRecord[];
      total: number;
      limit: number;
      offset: number;
      metrics: { clients: number; projects: number; subscriptions: number };
    }>(`${root}?${params}`),
  options: () =>
    cfAuth.request<{ accounts: ClientAccount[]; canManageAccounts: boolean }>(
      `${root}/options`,
    ),
  get: (id: string) =>
    cfAuth.request<ClientFile>(`${root}/${encodeURIComponent(id)}`),
  create: (body: CreateClientInput, key: string) =>
    write<{ ok: true; id: string; accountId: string | null }>(root, body, key),
  save: (id: string, identity: ClientIdentity, revision: number, key: string) =>
    write(
      `${root}/${encodeURIComponent(id)}`,
      { identity, revision },
      key,
      "PATCH",
    ),
  provision: (id: string, identity: NewClientAccount, key: string) =>
    write(
      `${root}/${encodeURIComponent(id)}/accounts`,
      { identity, confirmed: true },
      key,
    ),
  accounts: (
    id: string,
    userIds: string[],
    expectedUserIds: string[],
    key: string,
  ) =>
    write(
      `${root}/${encodeURIComponent(id)}/accounts`,
      { userIds, expectedUserIds, confirmed: true },
      key,
      "PUT",
    ),
  projects: (id: string, projects: ClientProjectOption[], key: string) =>
    write(
      `${root}/${encodeURIComponent(id)}/projects`,
      {
        projects: projects.map((p) => ({
          id: p.id,
          sourceClientId: p.client_id,
          updatedAt: p.updated_at,
        })),
        confirmed: true,
      },
      key,
      "PUT",
    ),
};
