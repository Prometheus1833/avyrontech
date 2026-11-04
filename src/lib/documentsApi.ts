import { cfAuth } from "./cfAuth";
import type {
  DocumentPayload,
  DocumentScope,
  Assignment,
} from "@/shared/documents/model";
export type DocumentSummary = {
  id: string;
  number: string;
  title: string;
  scope: DocumentScope;
  collection: string;
  beneficiary_id: string | null;
  company_name: string | null;
  current_version_id: string;
  published_version_id: string | null;
  revision: number;
  archived_at: number | null;
  approved: string | null;
  updated_at: number;
  legal: number;
  template_version_id?: string | null;
};
export type DocumentDetail = {
  document: DocumentSummary;
  version: {
    id: string;
    version: number;
    payload: DocumentPayload;
    sha256: string;
  };
  versions: {
    id: string;
    version: number;
    approved_at: number | null;
    created_at: number;
  }[];
  assignments: Record<string, string>[];
  files: {
    id: string;
    kind: string;
    file_name: string;
    size_bytes: number;
    scan_status: string;
  }[];
  events: {
    id: string;
    action: string;
    version_id: string;
    created_at: number;
  }[];
  shares: {
    id: string;
    channel: string;
    status: string;
    error_code: string | null;
    created_at: number;
    version_id:string;provider_id:string|null;actor_email:string;recipient_email:string;
  }[];
  approvals: { legal_review_reference: string; approved_by: string }[];
  grants: {
    user_id: string;
    can_share: number;
    can_edit: number;
    revoked_at: number | null;
  }[];
  actions: Record<string, boolean>;
  issues: string[];
};
export type DocumentTemplate = {
  id: string;
  name: string;
  family: string;
  legal: number;
  version_id: string;
  version: number;
  payload: DocumentPayload;
  required: string[];
  review_status: string;
  visibility?: 'shared'|'private_proposal';
};
export type DocumentClient = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  entity_type: string | null;
  legal_name: string | null;
  tax_id: string | null;
  registration_number: string | null;
  address: string | null;
  representative: string | null;
  organization_id: string | null;
};
export type DocumentCatalog = {
  id: string;
  entity_type: string;
  entity_key: string;
  display_name: string;
  sku: string | null;
  base_price_minor: number | null;
  currency: string;
  vat_basis_points: number;
  tax_status: string;
  billing_cycle: string;
  price_model: string;
  category: string;
};
export type DocumentContext = {
  clients: DocumentClient[];
  projects: {
    id: string;
    name: string;
    client_id: string;
    kind: string;
    status: string;
  }[];
  services: {
    id: string;
    project_id: string;
    client_id: string;
    service_name: string;
    catalog_code_id: string | null;
    price: number;
    billing_cycle: string;
  }[];
  subscriptions: {
    id: string;
    client_id: string;
    project_id: string;
    service_name: string;
    status: string;
  }[];
  catalog: DocumentCatalog[];
  products: {
    slug: string;
    name_ro: string;
    type: string;
    access: string;
    price_ron_cents: number | null;
  }[];
  plans: { id: string; name: string; price_ron_cents: number }[];
  templates: DocumentTemplate[];
  company: Record<string, string | null>;
  serviceProfiles: { catalog_id: string; configuration_json: string }[];
  unreconciledServices: { entityKey: string; name: string }[];
  entityTypes: string[];
  purchases: {
    id: string;
    client_id: string;
    status: string;
    created_at: number;
    currency: string;
    total_cents: number;
    items_json: string;
  }[];
  entitlements: {
    id: string;
    client_id: string;
    slug: string | null;
    plan: string | null;
    source: string;
    order_id: string | null;
    granted_at: number;
    expires_at: number | null;
    revoked_at: number | null;
  }[];
  billingSubscriptions: {
    id: string;
    client_id: string;
    sku: string;
    status: string;
    period: string;
    amount_minor: number;
    currency: string;
    current_period_start: number | null;
    current_period_end: number | null;
  }[];
};
export type DocumentBootstrap = {
  permissions: Record<string, boolean>;
  staff: boolean;
  platformRole: string | null;
  mfaVerified: boolean;
  channels: { email: boolean; whatsapp: string; telegram: string };
  scanner: string;
  backup: string;
  storage: 'verified'|'unverified';
};
const root = "/api/documents";
export const documentsApi = {
  bootstrap: () => cfAuth.request<DocumentBootstrap>(root + "/bootstrap"),
  context: () => cfAuth.request<DocumentContext>(root + "/context"),
  list: (params: URLSearchParams) =>
    cfAuth.request<{
      data: DocumentSummary[];
      total: number;
      nextOffset: number | null;
    }>(root + "?" + params),
  get: (id: string, version?: string) =>
    cfAuth.request<DocumentDetail>(
      `${root}/${encodeURIComponent(id)}${version ? "?version=" + encodeURIComponent(version) : ""}`,
    ),
  write: <T = { ok: boolean }>(
    path: string,
    body: unknown,
    method = "POST",
    key: string = crypto.randomUUID(),
  ) =>
    cfAuth.request<T>(root + path, {
      method,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(body),
    }),
  create: (
    body: {
      payload: DocumentPayload;
      scope: DocumentScope;
      collection: string;
      beneficiaryId: string | null;
      templateVersionId: string | null;
      legal?: boolean;
      assignments: Assignment[];
    },
    key: string,
  ) =>
    documentsApi.write<{ id: string; number: string }>("", body, "POST", key),
  save: (id: string, payload: DocumentPayload, revision: number, key: string) =>
    documentsApi.write<{ id: string; revision: number; versionId: string }>(
      "/" + id,
      { payload, revision },
      "PUT",
      key,
    ),
  blob: async (path: string) =>
    (await cfAuth.requestResponse(root + path)).blob(),
  download: async (path: string, name: string) => {
    const blob = await documentsApi.blob(path),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  import: (id: string, file: File) =>
    cfAuth.request<{ id: string; status: string }>(
      `${root}/${id}/import?name=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: file,
      },
    ),
  recipients: (id: string) =>
    cfAuth.request<{
      data: { id: string; email: string; display_name: string | null }[];
    }>(`${root}/${id}/recipients`),
  staffGuides: () =>
    cfAuth.request<{
      data: {
        id: string;
        title: string;
        subtitle: string;
        paragraphs: string[];
      }[];
    }>(root + "/staff-guides"),
  legacyHub: () =>
    cfAuth.request<{
      data: {
        id: string;
        title: string;
        category: string;
        status: string;
        document_id: string | null;
      }[];
    }>(root + "/legacy-hub"),
  backups: (id: string) =>
    cfAuth.request<{
      configured: boolean;
      data: {
        id: string;
        version_id: string;
        status: string;
        size_bytes: number;
        created_at: number;
      }[];
    }>(`${root}/${id}/backups`),
};
