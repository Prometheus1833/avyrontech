import type { MaintenancePlan } from "./maintenance";
import type { AdminSubscription } from "./adminSubscriptions";
export type BillingDetails = {
  entityType: "individual" | "company" | "pfa" | "ngo" | "other";
  legalName: string;
  taxId: string;
  address: string;
  invoiceEmail: string;
  paymentTermsDays: number;
};
export type BillingPeriod = {
  billing_date: number;
  period_end: number;
  due_date: number;
  revenue_id: string;
  status: string;
  invoice_number: string | null;
};
export type ClientSubscription = AdminSubscription & {
  revision: number;
  specifications_json: string;
  target_label: string;
  external_url: string | null;
  product_slug: string | null;
  billing: BillingDetails | null;
  billingClientMatches: boolean;
  account_count: number;
  periods: BillingPeriod[];
};
export type AllocationInput = {
  clientId: string | null;
  newClient: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
  } | null;
  accountId: string | null;
  projectId: string | null;
  planSku: string | null;
  name: string;
  priceMinor: number;
  specifications: Record<string, string>;
  targetLabel: string;
  externalUrl: string | null;
  productSlug: string | null;
  nextBillingDate: number;
  billing: BillingDetails;
  confirmed: true;
};
export type SubscriptionOptions = {
  data: ClientSubscription[];
  clients: {
    id: string;
    company_name: string;
    email: string;
    contact_name: string | null;
    entity_type?:string|null;legal_name?:string|null;tax_id?:string|null;address?:string|null;
  }[];
  accounts: { id: string; email: string; name: string; client_ids: string[] }[];
  projects: { id: string; name: string; client_id: string }[];
  products: { slug: string; name: string }[];
  plans: MaintenancePlan[];
  canPrepareInvoices: boolean;
  providerSubscriptions: {
    id: string;
    provider: string;
    sku: string;
    status: string;
    amount_minor: number;
    currency: string;
    current_period_end: number | null;
    email: string;
  }[];
};
export type InternalSubscription = {
  id: string;
  vendor_id: string;
  vendor_name: string;
  service_name: string;
  account_label: string;
  workspace_label: string;
  status: string;
  billing_type: string;
  billing_cycle: string | null;
  next_billing_date: number | null;
  responsible_name: string | null;
  subscription_revision: number;
  account_email?: string | null;
  gross_amount_minor?: number | null;
  currency?: string;
  notes?: string;
  responsible_user_id?: string | null;
  auto_renewal?: number;
};
export type InternalSubscriptionInput = {
  vendorId: string | null;
  vendorName: string;
  serviceName: string;
  accountLabel: string;
  accountEmail: string;
  workspaceLabel: string;
  responsibleUserId: string | null;
  status:
    | "active"
    | "free"
    | "trial"
    | "paused"
    | "cancelled"
    | "needs_configuration"
    | "expired"
    | "payment_due"
    | "overdue";
  billingType: "recurring" | "usage_based" | "free" | "trial" | "variable";
  billingCycle: "monthly" | "quarterly" | "yearly" | null;
  amountMinor: number | null;
  currency: "RON" | "EUR" | "USD";
  nextBillingDate: number | null;
  autoRenewal: boolean;
  notes: string;
  revision?: number;
};
export type InternalSubscriptionList = {
  data: InternalSubscription[];
  canManage: boolean;
  canSeeCosts: boolean;
  vendors: { id: string; name: string }[];
  staff: { id: string; name: string }[];
};
/** Keep the original anchor through short months: Jan 31 -> Feb 28 -> Mar 31. */
export function nextSubscriptionMonth(timestamp: number, anchorDay: number) {
  const d = new Date(timestamp);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    Math.min(
      anchorDay,
      new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 0),
      ).getUTCDate(),
    ),
    12,
  );
}
export const subscriptionDate = (stamp: number | null | undefined) =>
  stamp ? new Date(stamp).toISOString().slice(0, 10) : "";
export const subscriptionTimestamp = (day: string) =>
  Date.parse(day + "T12:00:00Z");
