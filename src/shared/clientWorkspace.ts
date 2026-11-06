export const CLIENT_ENTITY_TYPES = [
  "PF",
  "PJ",
  "PFA",
  "II",
  "IF",
  "ONG",
  "Asociație",
  "Fundație",
  "Instituție",
  "Partener",
  "Altă formă",
] as const;
export type ClientEntityType = (typeof CLIENT_ENTITY_TYPES)[number];
export type ClientIdentity = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: "active" | "paused" | "archived";
  entityType: ClientEntityType;
  legalName: string;
  taxId: string;
  registrationNumber: string;
  address: string;
  representative: string;
  notes: string;
};
export type ClientRecord = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  status: "active" | "paused" | "archived";
  created_at: number;
  updated_at: number;
  revision: number;
  notes: string;
  entity_type: ClientEntityType | null;
  legal_name: string | null;
  tax_id: string | null;
  registration_number: string | null;
  address: string | null;
  representative: string | null;
  project_count: number;
  active_subscription_count: number;
  account_count: number;
};
export type ClientAccount = {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  company_name: string | null;
  email_verified: number;
  disabled_at: number | null;
  must_change_password: number;
  last_login_at: number | null;
};
export type ClientProject = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  status: string;
  url: string | null;
  client_id: string;
  organization_id: string | null;
  owner_user_id: string | null;
  updated_at: number;
};
export type ClientProjectOption = ClientProject & {
  company_name: string;
  canAssign: boolean;
  assignmentReason: string | null;
};
export type ClientInvoice = {
  id: string;
  service_name: string;
  invoice_number: string | null;
  status: string;
  currency: string;
  gross_amount_minor: number | null;
  received_minor: number;
  due_date: number | null;
  invoice_date: number | null;
  project_name: string | null;
  source: "financial" | "legacy";
};
export type ClientReceipt = {
  id: string;
  invoice_id: string;
  amount_minor: number;
  currency: string;
  paid_at: number;
  reference: string | null;
  source: "financial" | "legacy";
};
export type ClientSubscriptionBrief = {
  id: string;
  service_name: string;
  status: string;
  next_billing_date: number;
  maintenance_enabled: number;
  plan_sku: string | null;
  project_id: string;
  project_name: string;
  specifications_json: string;
  price?: number;
  billing_cycle: string;
};
export type ClientFile = {
  client: ClientRecord;
  organizationId: string | null;
  projects: ClientProject[];
  subscriptions: ClientSubscriptionBrief[];
  accounts: ClientAccount[];
  invoices: ClientInvoice[];
  receipts: ClientReceipt[];
  orders: Record<string, unknown>[];
  carts: Record<string, unknown>[];
  availableProjects: ClientProjectOption[];
  accountOptions: ClientAccount[];
  permissions: {
    edit: boolean;
    manageAccounts: boolean;
    manageProjects: boolean;
    manageSubscriptions: boolean;
    finance: boolean;
    documents: boolean;
  };
};
export type NewClientAccount = {
  email: string;
  username: string;
  displayName: string;
  temporaryPassword: string;
};
export type CreateClientInput = {
  identity: ClientIdentity;
  account:
    | { mode: "none" }
    | { mode: "existing"; accountId: string; confirmed: true }
    | { mode: "new"; identity: NewClientAccount; confirmed: true };
};
