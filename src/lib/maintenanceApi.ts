import { cfAuth } from "./cfAuth";
import type {
  MaintenanceConfig,
  MaintenanceInput,
  MaintenanceSubscription,
} from "@/shared/maintenance";
export const maintenanceApi = {
  config: () =>
    cfAuth.request<MaintenanceConfig>("/api/workspace/maintenance/config"),
  list: () =>
    cfAuth.request<{ data: MaintenanceSubscription[]; canManage: boolean }>(
      "/api/workspace/maintenance",
    ),
  save: (body: MaintenanceInput, key: string, id?: string) =>
    cfAuth.request<{ id: string; projectId: string; revision: number }>(
      `/api/workspace/maintenance${id ? "/" + encodeURIComponent(id) : ""}`,
      {
        method: id ? "PATCH" : "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(body),
      },
    ),
};
