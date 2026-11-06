import { cfAuth } from "./cfAuth";
import type { ServiceTextValues } from "@/shared/servicePagePolicy";
export type ServicePageConfiguration = {
  key: string;
  revision: number;
  values: ServiceTextValues;
  publishedRevision: number | null;
  updatedAt: number | null;
  canManage: boolean;
  history: { revision: number; created_at: number; actor_name: string }[];
};
export const servicePagesApi = {
  get: async (key: string) => {
    const result = await cfAuth.request<ServicePageConfiguration>(
      `/api/admin/service-pages/${encodeURIComponent(key)}`,
    );
    if (
      !Number.isSafeInteger(result.revision) ||
      !result.values ||
      typeof result.values !== "object" ||
      !Array.isArray(result.history) ||
      typeof result.canManage !== "boolean"
    )
      throw new Error(
        "Configurația primită este invalidă. Reîncearcă încărcarea.",
      );
    return result;
  },
  version: (key: string, revision: number) =>
    cfAuth.request<{ values: ServiceTextValues }>(
      `/api/admin/service-pages/${encodeURIComponent(key)}/versions/${revision}`,
    ),
  save: (
    key: string,
    revision: number,
    values: ServiceTextValues,
    idempotencyKey: string,
  ) =>
    cfAuth.request<{ revision: number }>(
      `/api/admin/service-pages/${encodeURIComponent(key)}`,
      {
        method: "PUT",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ revision, values }),
      },
    ),
  publish: (key: string, revision: number) =>
    cfAuth.request<{ ok: true }>(
      `/api/admin/service-pages/${encodeURIComponent(key)}/publish`,
      { method: "POST", body: JSON.stringify({ revision, confirmed: true }) },
    ),
};
