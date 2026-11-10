import { cfAuth } from "./cfAuth";
import type {
  FutureLeadBootstrap,
  FutureLeadInput,
  FutureLeadRow,
} from "@/shared/futureLeads";
import type { ProjectStage } from "@/shared/projectLifecycle";
const root = "/api/future-leads";
const write = <T>(path: string, method: string, body: unknown, key?: string) =>
  cfAuth.request<T>(root + path, {
    method,
    headers: key ? { "Idempotency-Key": key } : undefined,
    body: JSON.stringify(body),
  });
export const futureLeadsApi = {
  bootstrap: () => cfAuth.request<FutureLeadBootstrap>(root + "/bootstrap"),
  list: (status: string, q: string, offset = 0, signal?: AbortSignal) =>
    cfAuth.request<{ data: FutureLeadRow[]; hasMore: boolean }>(
      root + "?" + new URLSearchParams({ status, q, offset: String(offset) }),
      { signal },
    ),
  detail: (id: string) =>
    cfAuth.request<{
      data: FutureLeadRow;
      events: { action: string; created_at: number; revision: number }[];
    }>(root + "/" + encodeURIComponent(id)),
  create: (input: FutureLeadInput, key: string, leadId?: string) =>
    write<{ id: string }>(
      "",
      "POST",
      { input, ...(leadId ? { leadId } : {}) },
      key,
    ),
  update: (
    id: string,
    input: FutureLeadInput,
    revision: number,
    status: string,
  ) =>
    write<{ data: FutureLeadRow }>("/" + encodeURIComponent(id), "PATCH", {
      input,
      revision,
      status,
    }),
  convert: (id: string, revision: number, stage: ProjectStage, key: string) =>
    write<{ id: string; slug: string }>(
      "/" + encodeURIComponent(id) + "/convert",
      "POST",
      { revision, stage },
      key,
    ),
};
