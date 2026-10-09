import { cfAuth } from "./cfAuth";

export type BillingProviderStatus={enabled:boolean;oneTime?:boolean;subscriptions?:boolean;savedMethods?:boolean;customerPortal?:boolean;invoices?:boolean;status?:"planned"};
export type BillingSubscription={
  id:string;provider:"stripe"|"revolut"|"netopia";sku:string;
  status:"incomplete"|"trialing"|"active"|"past_due"|"paused"|"cancelled"|"expired";
  period:"monthly"|"annual";amount_minor:number;currency:string;
  current_period_start:number|null;current_period_end:number|null;cancel_at_period_end:0|1;created_at:number;
};
export type BillingInvoice={
  id:string;order_id:string;provider:"oblio"|"manual";series:string|null;number:string|null;
  status:"pending"|"issued"|"failed"|"cancelled";currency:string;total_minor:number;
  document_url:string|null;issued_at:number|null;created_at:number;
};
export type BillingAdminStatus={
  providers:{stripe:BillingProviderStatus;revolut:BillingProviderStatus;oblio:BillingProviderStatus;netopia:BillingProviderStatus};
  sessions:Array<{provider:string;status:string;total:number}>;
  subscriptions:Array<{provider:string;status:string;total:number}>;
  invoices:Array<{provider:string;status:string;total:number}>;
  recentFailures:Array<{provider:string;event_type:string;error_code:string|null;received_at:number}>;
};
export type BillingAccount={
  profile:null|{entity_type:"individual"|"company"|null;legal_name:string|null;tax_id:string|null;registration_number:string|null;address:string|null;city:string|null;county:string|null;country_code:string;invoice_email:string|null;automatic_charging:0|1;default_provider:"stripe"|"revolut"|"netopia"|null};
  methods:Array<{id:string;provider:string;type:string;brand:string|null;last4:string|null;expiry_month:number|null;expiry_year:number|null;is_default:0|1;status:string}>;
  subscriptions:BillingSubscription[];invoices:BillingInvoice[];
  providers:{stripe:BillingProviderStatus;revolut:BillingProviderStatus;oblio:BillingProviderStatus;netopia:BillingProviderStatus};
};
export const billingApi={
  account:()=>cfAuth.request<BillingAccount>("/api/billing/account"),
  saveProfile:(value:Record<string,unknown>)=>cfAuth.request<{ok:true}>("/api/billing/profile",{method:"PUT",body:JSON.stringify(value)}),
  checkout:(value:{orderId:string;provider:"stripe"|"revolut";savePaymentMethod?:boolean})=>cfAuth.request<{url:string|null;provider:string;mode:string}>("/api/billing/checkout",{method:"POST",body:JSON.stringify(value)}),
  setupMethod:(provider:"stripe")=>cfAuth.request<{url:string|null}>("/api/billing/payment-methods/setup",{method:"POST",body:JSON.stringify({provider})}),
  portal:()=>cfAuth.request<{url:string|null}>("/api/billing/portal",{method:"POST"}),
  cancelSubscription:(id:string)=>cfAuth.request<{ok:true;status?:string}>(`/api/billing/subscriptions/${encodeURIComponent(id)}/cancel`,{method:"POST"}),
  adminStatus:()=>cfAuth.request<BillingAdminStatus>("/api/billing/admin/status"),
};
