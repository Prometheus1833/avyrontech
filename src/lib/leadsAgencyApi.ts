import { cfAuth } from "./cfAuth";
import type {
  AgencyAccount,
  AgencyOpportunity,
  AgencyEntry,
  AgencyReport,
  PlatformInput,
  OpportunityInput,
  AgencyEntryInput,
} from "@/shared/agency/model";
import type { AgencyPlatform } from "@/shared/agency/catalog";
import type { AgencyPermissions } from "@/shared/agency/model";
const root = "/api/leads-agency";
export type AgencyBootstrap = {
  permissions: AgencyPermissions;
  platforms: AgencyPlatform[];
  accounts: AgencyAccount[];
  services: { id: string; display_name: string; entity_key: string }[];
  staff: { id: string; display_name: string }[];
  clients: { id: string; company_name: string }[];
};
export type AgencyDocumentSeed = {
  opportunityId: string;
  revision: number;
  clientId: string | null;
  name: string;
  email: string;
  projectName: string;
  description: string;
  serviceId: string | null;
  currency: string;
  budgetMin: number | null;
  budgetMax: number | null;
};
export type AgencyDetail = {
  opportunity: AgencyOpportunity;
  entries: AgencyEntry[];
  events: {
    id: string;
    action: string;
    revision: number | null;
    created_at: number;
  }[];
  margin: {
    complete: boolean;
    commissionMinor: number | null;
    estimatedNetMinor: number | null;
  };
};
function write<T>(path: string, method: string, body: unknown, key: string) {
  return cfAuth.request<T>(root + path, {
    method,
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
}
const valid = <T>(value: T, check: boolean, message: string): T => {
  if (!check) throw new Error(message);
  return value;
};
export const leadsAgencyApi = {
  bootstrap: (signal?: AbortSignal) =>
    cfAuth
      .request<AgencyBootstrap>(root + "/bootstrap", { signal })
      .then((r) =>
        valid(
          r,
          !!r &&
            Array.isArray(r.platforms) &&
            Array.isArray(r.accounts) &&
            !!r.permissions,
          "Datele Leads Agency nu au putut fi validate.",
        ),
      ),
  list: (params: URLSearchParams, signal?: AbortSignal) =>
    cfAuth
      .request<{ data: AgencyOpportunity[]; total: number }>(
        root + "/opportunities?" + params,
        { signal },
      )
      .then((r) =>
        valid(
          r,
          !!r && Array.isArray(r.data) && Number.isSafeInteger(r.total),
          "Lista oportunităților nu este disponibilă.",
        ),
      ),
  detail: (id: string, signal?: AbortSignal) =>
    cfAuth
      .request<AgencyDetail>(
        root + "/opportunities/" + encodeURIComponent(id),
        { signal },
      )
      .then((r) =>
        valid(
          r,
          !!r && !!r.opportunity?.id && Array.isArray(r.entries),
          "Fișa oportunității nu este disponibilă.",
        ),
      ),
  platform: (id: string, input: PlatformInput, key: string) =>
    write<{ id: string; revision: number }>(
      "/platforms/" + encodeURIComponent(id),
      "PUT",
      input,
      key,
    ),
  history: (id: string, signal?: AbortSignal) =>
    cfAuth.request<{
      data: {
        id: string;
        action: string;
        revision: number;
        created_at: number;
      }[];
    }>(root + "/platforms/" + encodeURIComponent(id) + "/history", { signal }),
  save: (
    id: string | null,
    input: OpportunityInput,
    revision: number | undefined,
    key: string,
  ) =>
    write<{ id: string; revision: number }>(
      "/opportunities" + (id ? "/" + encodeURIComponent(id) : ""),
      id ? "PUT" : "POST",
      { input, ...(id ? { revision } : {}) },
      key,
    ),
  archive: (
    o: AgencyOpportunity,
    archived: boolean,
    reason: string,
    key: string,
  ) =>
    write<{ id: string }>(
      "/opportunities/" + encodeURIComponent(o.id) + "/archive",
      "POST",
      { revision: o.revision, archived, reason },
      key,
    ),
  entry: (id: string, input: AgencyEntryInput, key: string) =>
    write<{ id: string }>(
      "/opportunities/" + encodeURIComponent(id) + "/entries",
      "POST",
      input,
      key,
    ),
  voidEntry: (id: string, reason: string, key: string) =>
    write<{ id: string }>(
      "/entries/" + encodeURIComponent(id) + "/void",
      "POST",
      { reason },
      key,
    ),
  transfer: (o: AgencyOpportunity, key: string) =>
    write<{ id: string }>(
      "/opportunities/" + encodeURIComponent(o.id) + "/transfer",
      "POST",
      { revision: o.revision },
      key,
    ),
  brief: (id: string) =>
    cfAuth.request<{
      text: string;
      revision: number;
      execution: string;
      externalActions: boolean;
    }>(root + "/opportunities/" + encodeURIComponent(id) + "/brief"),
  documentContext: (id: string, signal?: AbortSignal) =>
    cfAuth.request<AgencyDocumentSeed>(
      root + "/opportunities/" + encodeURIComponent(id) + "/document-context",
      { signal },
    ),
  reports: (signal?: AbortSignal) =>
    cfAuth
      .request<{
        data: AgencyReport[];
        financeVisible: boolean;
        netDefinition: string;
        generatedAt: number;
      }>(root + "/reports", { signal })
      .then((r) =>
        valid(
          r,
          !!r && Array.isArray(r.data),
          "Rapoartele nu sunt disponibile.",
        ),
      ),
};
