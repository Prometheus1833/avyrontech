export type AdminSubscription = {
  maintenance_enabled?: number;
  plan_sku?: string | null;
  id: string;
  status: "active" | "paused" | "cancelled";
  next_billing_date: number;
  service_id: string;
  service_name: string;
  price: number;
  billing_cycle: "one_time" | "monthly" | "yearly";
  client_id: string;
  company_name: string;
  project_id: string;
  project_name: string;
  project_status: string;
};
