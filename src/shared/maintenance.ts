export type MaintenancePlan = {
  sku: string;
  name: string;
  category: string;
  priceMinor: number;
  specifications: Record<string, string>;
};
export type MaintenanceSubscription = {
  id: string;
  status: "active" | "paused" | "cancelled";
  next_billing_date: number;
  service_id: string;
  service_name: string;
  price: number;
  billing_cycle: string;
  client_id: string;
  company_name: string;
  project_id: string;
  project_name: string;
  project_status: string;
  plan_sku: string | null;
  specifications_json: string;
  product_slug: string | null;
  external_url: string | null;
  target_label: string;
  revision: number;
  maintenance_enabled: number;
  staff: { id: string; name: string }[];
};
export type MaintenanceConfig = {
  canManage: boolean;
  projects: {
    id: string;
    slug: string | null;
    name: string;
    client_id: string;
    status: string;
  }[];
  clients: { id: string; company_name: string }[];
  products: { slug: string; name: string }[];
  staff: { id: string; name: string }[];
  plans: MaintenancePlan[];
};
export type MaintenanceInput = {
  projectId?: string;
  externalProject?: { clientId: string; name: string };
  existingSubscriptionId?: string;
  revision?: number;
  planSku: string | null;
  name: string;
  priceMinor: number;
  specifications: Record<string, string>;
  productSlug: string | null;
  externalUrl: string | null;
  targetLabel: string;
  staffIds: string[];
  nextBillingDate: number;
  status: "active" | "paused" | "cancelled";
};
