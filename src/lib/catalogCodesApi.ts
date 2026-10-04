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
  payment_status: "needs_configuration" | "test" | "active" | "paused";
  promotion_code: string | null;
  active: number;
  notes: string;
  updated_at: number;
};

export type ProductCatalogSource = {
  entity_key: string;
  display_name: string;
  category: string;
  base_price_minor: number | null;
  status: string;
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
  paymentStatus: CommercialCode["payment_status"];
  promotionCode: string | null;
  active: boolean;
  notes: string;
};

export const catalogCodesApi = {
  list: () => cfAuth.request<{ data: CommercialCode[]; products: ProductCatalogSource[] }>("/api/finance/commercial-codes"),
  save: (entityType: "service" | "product", entityKey: string, body: CommercialCodeDraft) =>
    cfAuth.request<{ ok: true; id: string }>(`/api/finance/commercial-codes/${entityType}/${encodeURIComponent(entityKey)}`, {
      method: "PUT",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
};
