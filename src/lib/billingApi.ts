import type { ClientRecurringResponse } from "@/shared/clientRecurring";
import { cfAuth } from "./cfAuth";

export type BillingProviderStatus={enabled:boolean;configured?:boolean;oneTime?:boolean;subscriptions?:boolean;savedMethods?:boolean;customerPortal?:boolean;invoices?:boolean;status?:"planned"};
export type FinancialProviderPlaybook={
  provider:"stripe"|"oblio"|"revolut_merchant";
  loginUrl?:string;title:string;purpose:string;authentication:string;intake:string;reconciliation:string;gate:string;cadence:string;
  sources:readonly string[];
  phase:"not_connected"|"configuration_only"|"awaiting_approval"|"verification_required"|"connected_unsynced"|"synced"|"stale"|"error";
};
export type BillingSubscription={
  id:string;order_id:string;provider:"stripe"|"revolut"|"netopia";sku:string;
  status:"incomplete"|"trialing"|"active"|"past_due"|"paused"|"cancelled"|"expired";
  period:"monthly"|"annual";amount_minor:number;currency:string;
  current_period_start:number|null;current_period_end:number|null;cancel_at_period_end:0|1;created_at:number;
};
export type BillingInvoice={
  id:string;order_id:string;provider:"oblio"|"manual";series:string|null;number:string|null;
  status:"pending"|"issued"|"failed"|"cancelled";currency:string;total_minor:number;
  document_url:string|null;issued_at:number|null;created_at:number;
};
export type BillingReferenceSync={runId:string;status:"running"|"complete"|"differences";checked:number;matched:number;issueCount:number;startedAt:number;finishedAt:number|null;lockedUntil:number;issues:Array<{id:string;code:string}>};
export type BillingAdminStatus={
  providers:{stripe:BillingProviderStatus;revolut:BillingProviderStatus;oblio:BillingProviderStatus;netopia:BillingProviderStatus};
  configuration?:Record<string,{fields:Array<{name:string;configured:boolean}>;automaticIssue:boolean|null}>;
  security?:{mfaEnabled:boolean;mfaVerified:boolean;mfaSatisfied?:boolean;canVerify:boolean};
  sessions:Array<{provider:string;status:string;total:number}>;
  subscriptions:Array<{provider:string;status:string;total:number}>;
  invoices:Array<{provider:string;status:string;total:number}>;
  pendingInvoices:Array<{order_id:string;status:string;error_code:string|null;total_minor:number;currency:string;updated_at:number}>;
  paymentsByCurrency:Array<{currency:string;amount_minor:number;total:number}>;
  invoicesByCurrency:Array<{currency:string;amount_minor:number;total:number}>;
  recentPayments:Array<{id:string;order_id:string;provider:string;mode:string;status:string;amount_minor:number;currency:string;updated_at:number}>;
  recentSubscriptions:Array<{id:string;sku:string;provider:string;status:string;period:string;amount_minor:number;currency:string;current_period_end:number|null;updated_at:number}>;
  recentInvoices:Array<{id:string;order_id:string;provider:string;series:string|null;number:string|null;status:string;total_minor:number;currency:string;error_code:string|null;updated_at:number}>;
  connectionRecords:Array<{provider:string;status:string;last_sync_at:number|null;last_error_code:string|null;sync?:BillingReferenceSync|null}>;
  providerPlaybooks:FinancialProviderPlaybook[];
  recentFailures:Array<{provider:string;event_type:string;error_code:string|null;received_at:number}>;
};

const requiredAdminLists = [
  "sessions", "subscriptions", "invoices", "pendingInvoices", "paymentsByCurrency",
  "invoicesByCurrency", "recentPayments", "recentSubscriptions", "recentInvoices",
  "connectionRecords", "providerPlaybooks", "recentFailures",
] as const;

export function validateBillingAdminStatus(value: unknown): BillingAdminStatus {
  if (!value || typeof value !== "object" || !("providers" in value) || !value.providers ||
      requiredAdminLists.some((field) => !Array.isArray((value as Record<string, unknown>)[field]))) {
    throw new Error("Serviciul de facturare a trimis date incomplete. Reîncarcă sau verifică versiunea API.");
  }
  return value as BillingAdminStatus;
}
export type BillingAccount={
  profile:null|{entity_type:"individual"|"company"|null;legal_name:string|null;tax_id:string|null;registration_number:string|null;address:string|null;city:string|null;county:string|null;country_code:string;invoice_email:string|null;automatic_charging:0|1;default_provider:"stripe"|"revolut"|"netopia"|null};
  methods:BillingPaymentMethod[];
  subscriptions:BillingSubscription[];invoices:BillingInvoice[];
  revolutPlans:Array<{sku:string;period:string}>;
  providers:{stripe:BillingProviderStatus;revolut:BillingProviderStatus;oblio:BillingProviderStatus;netopia:BillingProviderStatus};
};
export type BillingPaymentMethod={id:string;provider:"stripe"|"revolut";type:string;brand:string|null;last4:string|null;expiry_month:number|null;expiry_year:number|null;is_default:0|1;usage_scope?:"future"|"recurring";status?:string};
const financialRequest = async <T>(path:string,init?:RequestInit):Promise<T> => {
 try{return await cfAuth.request<T>(path,init)}catch(error){
  if(!(error instanceof Error))throw error;
  const messages:Record<string,string>={
   provider_unconfigured:"Procesatorul nu este încă disponibil. Echipa AVYRON trebuie să finalizeze configurația.",
   stripe_customer_missing:"Adaugă mai întâi un card securizat pentru a deschide gestionarea.",
   portal_provider_failed:"Gestionarea Stripe nu este disponibilă momentan. Reîncearcă sau folosește oprirea reînnoirii din abonament.",
   setup_provider_failed:"Formularul Stripe nu poate fi deschis acum. Reîncearcă.",
   checkout_provider_failed:"Pagina de plată nu poate fi deschisă acum. Comanda rămâne salvată.",
   recurring_revision_conflict:"Detaliile pachetului s-au modificat. Actualizează și confirmă din nou suma și data.",
   recurring_billing_not_ready:"Echipa trebuie să completeze beneficiarul și configurația fiscală înainte de debitare.",
   recurring_agreement_requires_review:"Există condiții de plată deja acceptate. Solicită echipei revizuirea lor înainte de o nouă autorizare.",
   recurring_already_authorized:"Debitarea acestui pachet este deja autorizată. Actualizează lista.",
   recurring_existing_invoice_requires_review:"Există deja o factură pregătită pentru această perioadă. Echipa o va reconcilia înainte de debitarea automată.",
   recurring_start_requires_review:"Data primei debitări trebuie verificată de echipă.",
   recurring_start_too_close:"Scadența este la mai puțin de un minut. Reîncearcă după ora stabilită pentru prima plată.",
   checkout_verification_required:"Verificăm sesiunea anterioară la procesator înainte de o nouă plată. Reîncearcă mai târziu sau contactează echipa.",
   checkout_preference_locked:"Există deja o sesiune Stripe cu alte opțiuni de salvare a cardului. Păstrează opțiunea inițială sau contactează echipa.",
   checkout_already_active:"Există o plată deschisă la celălalt procesator. Continuă acolo înainte de o nouă încercare.",
   payment_pending:"Plata este în curs de confirmare. Actualizează starea înainte să reîncerci.",
   verified_connection_required:"Verifică mai întâi conexiunea API a furnizorului.",
   sync_in_progress:"Un lot este deja în verificare. Actualizează starea înainte de reluare.",
   revolut_avyron_webhook_required:"Configurează destinația webhook AVYRON și evenimentul ORDER_COMPLETED în Revolut Merchant.",
   oblio_approval_or_configuration_required:"Completează și aprobă configurația fiscală Oblio înainte de emitere.",
   rate_limited:"Ai făcut mai multe încercări într-un interval scurt. Reîncearcă mai târziu.",
  };
  if(messages[error.message])error.message=messages[error.message];throw error;
 }
};
export const billingApi={
  recurring:()=>cfAuth.request<ClientRecurringResponse>("/api/billing/recurring"),
  recurringCheckout:(id:string,value:{revision:number;quoteHash:string;confirmed:true})=>financialRequest<{url:string|null}>(`/api/billing/recurring/${encodeURIComponent(id)}/checkout`,{method:"POST",body:JSON.stringify(value)}),
  account:()=>cfAuth.request<BillingAccount>("/api/billing/account"),
  paymentMethods:()=>cfAuth.request<{methods:BillingPaymentMethod[];refreshed:{stripe:boolean;revolut:boolean};hasCustomer?:{stripe:boolean;revolut:boolean};setupStatus?:string|null}>("/api/billing/payment-methods"),
  saveProfile:(value:Record<string,unknown>)=>cfAuth.request<{ok:true}>("/api/billing/profile",{method:"PUT",body:JSON.stringify(value)}),
  checkout:(value:{orderId:string;provider:"stripe"|"revolut";savePaymentMethod?:boolean})=>financialRequest<{url:string|null;provider:string;mode:string}>("/api/billing/checkout",{method:"POST",body:JSON.stringify(value)}),
  setupMethod:(provider:"stripe")=>financialRequest<{url:string|null}>("/api/billing/payment-methods/setup",{method:"POST",body:JSON.stringify({provider})}),
  portal:()=>financialRequest<{url:string|null}>("/api/billing/portal",{method:"POST"}),
  cancelSubscription:(id:string)=>financialRequest<{ok:true;status?:string}>(`/api/billing/subscriptions/${encodeURIComponent(id)}/cancel`,{method:"POST"}),
  adminStatus:async()=>validateBillingAdminStatus(await cfAuth.request<unknown>("/api/billing/admin/status")),
  verifyConnection:(provider:FinancialProviderPlaybook["provider"])=>cfAuth.request<{ok:true;provider:string;account:string;detail:string|null;synchronized:false}>(`/api/billing/admin/connections/${provider}/verify`,{method:"POST"}),
  syncConnection:(provider:FinancialProviderPlaybook["provider"])=>financialRequest<{state:BillingReferenceSync;scope:"native_avyron_references";moneyActions:false}>(`/api/billing/admin/connections/${provider}/sync`,{method:"POST"}),
  retryInvoice:(orderId:string)=>cfAuth.request<{ok:true;invoiced:boolean}>(`/api/billing/admin/invoices/${encodeURIComponent(orderId)}/retry`,{method:"POST"}),
};
