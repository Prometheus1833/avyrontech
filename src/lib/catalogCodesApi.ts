import { cfAuth } from "@/lib/cfAuth";

export type CommercialCode = {
  id: string;
  entity_type: "service" | "product";
  entity_key: string;
  display_name: string;
  accounting_code: string | null;
  sku: string | null;
  category: string;
  base_price_minor: number | null;
  currency: string;
  vat_basis_points: number;
  payment_route: "unconfigured" | "invoice" | "payment_link" | "stripe" | "bank_transfer" | "manual";
  preferred_payment_provider: "stripe" | "revolut" | "netopia" | null;
  invoice_provider: "oblio" | "manual" | null;
  payment_status: "needs_configuration" | "test" | "active" | "paused";
  promotion_code: string | null;
  active: number;
  notes: string;
  updated_at: number;
  unit_label: string;
  price_model: "unreviewed" | "fixed" | "starting_at" | "quote";
  billing_cycle: "unreviewed" | "one_time" | "monthly" | "annual" | "custom";
  tax_status: "unverified" | "verified";
  tax_verified_at: number | null;
};

export type ProductCatalogSource = {
  entity_key: string;
  display_name: string;
  category: string;
  base_price_minor: number | null;
  status: string;
};

export type ServiceCatalogSource = Omit<ProductCatalogSource, "status">;
export type CommercialProviderRef = {
  id: string;
  catalog_id: string;
  entity_type: "service" | "product";
  entity_key: string;
  provider: "stripe" | "revolut" | "oblio";
  environment: "test" | "live";
  reference_type: "product" | "price" | "article";
  external_id: string;
  updated_at: number;
};

export type CommercialCodeDraft = {
  displayName: string;
  accountingCode: string | null;
  sku: string | null;
  category: string;
  basePriceMinor: number | null;
  currency: string;
  vatBasisPoints: number;
  paymentRoute: CommercialCode["payment_route"];
  preferredPaymentProvider: CommercialCode["preferred_payment_provider"];
  invoiceProvider: CommercialCode["invoice_provider"];
  paymentStatus: CommercialCode["payment_status"];
  promotionCode: string | null;
  active: boolean;
  notes: string;
  unitLabel: string;
  priceModel: CommercialCode["price_model"];
  billingCycle: CommercialCode["billing_cycle"];
  taxStatus: CommercialCode["tax_status"];
};

export const catalogCodesApi = {
  list: () => cfAuth.request<{ data: CommercialCode[]; services: ServiceCatalogSource[]; products: ProductCatalogSource[]; references: CommercialProviderRef[] }>("/api/finance/commercial-codes"),
  sync: () => cfAuth.request<{ ok: true; created: number; existing: number; requiresSku: number; total: number }>("/api/finance/commercial-codes/sync", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } }),
  save: (entityType: "service" | "product", entityKey: string, body: CommercialCodeDraft) =>
    cfAuth.request<{ ok: true; id: string }>(`/api/finance/commercial-codes/${entityType}/${encodeURIComponent(entityKey)}`, {
      method: "PUT",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  saveReference: (entityType: "service" | "product", entityKey: string, provider: CommercialProviderRef["provider"], environment: CommercialProviderRef["environment"], referenceType: CommercialProviderRef["reference_type"], externalId: string) =>
    cfAuth.request<{ ok: true }>(`/api/finance/commercial-codes/${entityType}/${encodeURIComponent(entityKey)}/provider-refs/${provider}/${environment}/${referenceType}`, {
      method: "PUT", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ externalId }),
    }),
  removeReference: (entityType: "service" | "product", entityKey: string, provider: CommercialProviderRef["provider"], environment: CommercialProviderRef["environment"], referenceType: CommercialProviderRef["reference_type"]) =>
    cfAuth.request<{ ok: true }>(`/api/finance/commercial-codes/${entityType}/${encodeURIComponent(entityKey)}/provider-refs/${provider}/${environment}/${referenceType}`, { method: "DELETE" }),
};
