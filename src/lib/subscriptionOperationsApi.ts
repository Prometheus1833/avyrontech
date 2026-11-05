import { cfAuth } from "./cfAuth";
import type {
  AllocationInput,
  BillingDetails,
  InternalSubscriptionInput,
  InternalSubscriptionList,
  SubscriptionOptions,
} from "@/shared/subscriptionOperations";
const write = <T>(url: string, body: unknown, key: string, method = "POST") =>
  cfAuth.request<T>(url, {
    method,
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
export const subscriptionOperationsApi = {
  clients: () =>
    cfAuth.request<SubscriptionOptions>("/api/admin/client-subscriptions"),
  allocate: (input: AllocationInput, key: string) =>
    write<{ id: string; clientId: string; projectId: string }>(
      "/api/admin/client-subscriptions",
      input,
      key,
    ),
  billing: (
    id: string,
    input: {
      revision: number;
      nextBillingDate: number;
      billing: BillingDetails;
      status: "active" | "paused" | "cancelled";
    },
    key: string,
  ) =>
    write<{ id: string; revision: number }>(
      `/api/admin/client-subscriptions/${encodeURIComponent(id)}/billing`,
      input,
      key,
      "PUT",
    ),
  prepare: (id: string, revision: number, billingDate: number, key: string) =>
    write<{ id: string; prepared: true }>(
      `/api/admin/client-subscriptions/${encodeURIComponent(id)}/prepare-invoice`,
      { revision, billingDate, confirmed: true },
      key,
    ),
  internal: () =>
    cfAuth.request<InternalSubscriptionList>("/api/internal/subscriptions"),
  saveInternal: (input: InternalSubscriptionInput, key: string, id?: string) =>
    write<{ id: string }>(
      `/api/internal/subscriptions${id ? "/" + encodeURIComponent(id) : ""}`,
      input,
      key,
      id ? "PUT" : "POST",
    ),
};
