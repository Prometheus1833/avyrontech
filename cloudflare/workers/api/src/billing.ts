import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings, Env } from "./types";
import { issueOblioInvoice } from "./invoicingOblio";
import { revolutSignatureValid, stripeSignatureValid } from "./billingSignatures";

export const billingRouter = new Hono<AppBindings>();
const REVOLUT_VERSION = "2026-08-17";
type Provider = "stripe" | "revolut";
type OrderRow = { id:string; user_id:string; items_json:string; total_cents:number; currency:string; requires_manual_quote:number; status:string };
type StoredItem = { sku?:string; type?:string; kind?:"plan"|"item"; id?:string; name?:string; quantity?:number; period?:"monthly"|"annual"; lineTotalCents?:number; unitPriceCents?:number; taxId?:string|null };

const checkoutSchema = z.object({ orderId:z.string().uuid(), provider:z.enum(["stripe","revolut"]), savePaymentMethod:z.boolean().optional().default(true) }).strict();
const profileSchema = z.object({
  entityType:z.enum(["individual","company"]).nullable().optional(), legalName:z.string().trim().max(160).nullable().optional(),
  taxId:z.string().trim().max(24).nullable().optional(), registrationNumber:z.string().trim().max(40).nullable().optional(),
  address:z.string().trim().max(240).nullable().optional(), city:z.string().trim().max(80).nullable().optional(),
  county:z.string().trim().max(80).nullable().optional(), countryCode:z.string().trim().length(2).default("RO"),
  invoiceEmail:z.string().email().max(254).nullable().optional(), automaticCharging:z.boolean().default(false),
  defaultProvider:z.enum(["stripe","revolut","netopia"]).nullable().optional(),
}).strict();

const stripeForm=(fields:Record<string,string|number|boolean|undefined>)=>{const body=new URLSearchParams();for(const [key,value] of Object.entries(fields))if(value!==undefined&&value!=="")body.set(key,String(value));return body;};
export const providerCapabilities=(env:Env)=>({
  stripe:{enabled:Boolean(env.STRIPE_SECRET_KEY?.trim()&&env.STRIPE_WEBHOOK_SECRET?.trim()),oneTime:true,subscriptions:true,savedMethods:true,customerPortal:true},
  revolut:{enabled:Boolean(env.REVOLUT_MERCHANT_SECRET_KEY?.trim()&&env.REVOLUT_MERCHANT_WEBHOOK_SECRET?.trim()),oneTime:true,subscriptions:true,savedMethods:true,customerPortal:false},
  oblio:{enabled:Boolean(env.OBLIO_CLIENT_ID?.trim()&&env.OBLIO_CLIENT_SECRET?.trim()&&env.OBLIO_CIF?.trim()&&env.OBLIO_SERIES?.trim()),invoices:true},
  netopia:{enabled:false,oneTime:true,subscriptions:false,status:"planned" as const},
});
const stripeHeaders=(env:Env)=>{const headers:Record<string,string>={authorization:`Bearer ${env.STRIPE_SECRET_KEY!.trim()}`,"content-type":"application/x-www-form-urlencoded"};if(env.STRIPE_API_VERSION?.trim())headers["stripe-version"]=env.STRIPE_API_VERSION.trim();return headers;};
const revolutHeaders=(env:Env,idempotencyKey?:string)=>({authorization:`Bearer ${env.REVOLUT_MERCHANT_SECRET_KEY!.trim()}`,"content-type":"application/json","Revolut-Api-Version":env.REVOLUT_MERCHANT_API_VERSION?.trim()||REVOLUT_VERSION,...(idempotencyKey?{"Idempotency-Key":idempotencyKey}:{})});
const revolutRoot=(env:Env)=>(env.REVOLUT_MERCHANT_API_URL?.trim()||"https://merchant.revolut.com/api").replace(/\/+$/,"");

async function getOrder(db:D1Database,orderId:string,userId?:string){return db.prepare(`SELECT id,user_id,items_json,total_cents,currency,requires_manual_quote,status FROM commerce_orders WHERE id=?${userId?" AND user_id=?":""}`).bind(...(userId?[orderId,userId]:[orderId])).first<OrderRow>();}
function orderItems(order:OrderRow):StoredItem[]{try{return JSON.parse(order.items_json) as StoredItem[];}catch{return[];}}
function orderDescription(items:StoredItem[]){return items.map((item)=>item.name||item.sku||item.id).filter(Boolean).join(", ").slice(0,180)||"Comandă AVYRON";}
function subscriptionItem(items:StoredItem[]){return items.length===1&&items[0]?.type==="subscription"&&items[0].sku&&items[0].period?items[0]:null;}
function stripeSubscriptionStatus(status:string,eventType?:string){
  if(eventType==="customer.subscription.deleted")return "cancelled";
  return ({trialing:"trialing",active:"active",past_due:"past_due",paused:"paused",canceled:"cancelled",unpaid:"past_due",incomplete_expired:"expired"} as Record<string,string>)[status]||"incomplete";
}
function revolutSubscriptionStatus(status:string){return ({active:"active",overdue:"past_due",finished:"expired",cancelled:"cancelled",pending:"incomplete"} as Record<string,string>)[status]||"incomplete";}
async function setWebhookStatus(env:Env,provider:Provider,eventId:string,status:"processed"|"ignored"|"failed",errorCode?:string){
  await env.DB.prepare("UPDATE billing_webhook_events SET status=?,error_code=?,processed_at=? WHERE provider=? AND provider_event_id=?").bind(status,errorCode??null,Date.now(),provider,eventId).run();
}

async function ensureStripeCustomer(env:Env,userId:string,email:string){
  const existing=await env.DB.prepare("SELECT provider_customer_id FROM billing_customers WHERE user_id=? AND provider='stripe'").bind(userId).first<{provider_customer_id:string}>();
  if(existing)return existing.provider_customer_id;
  const response=await fetch("https://api.stripe.com/v1/customers",{method:"POST",headers:stripeHeaders(env),body:stripeForm({email,"metadata[user_id]":userId})});
  if(!response.ok)throw new Error(`stripe_customer_${response.status}`);
  const customer=await response.json() as {id:string};const timestamp=Date.now();
  await env.DB.prepare("INSERT OR IGNORE INTO billing_customers(id,user_id,provider,provider_customer_id,email,created_at,updated_at) VALUES (?,?,'stripe',?,?,?,?)").bind(crypto.randomUUID(),userId,customer.id,email,timestamp,timestamp).run();
  return customer.id;
}
async function ensureRevolutCustomer(env:Env,userId:string,email:string,name?:string|null){
  const existing=await env.DB.prepare("SELECT provider_customer_id FROM billing_customers WHERE user_id=? AND provider='revolut'").bind(userId).first<{provider_customer_id:string}>();
  if(existing)return existing.provider_customer_id;
  const response=await fetch(`${revolutRoot(env)}/customers`,{method:"POST",headers:revolutHeaders(env),body:JSON.stringify({email,...(name?{full_name:name}:{})})});
  if(!response.ok)throw new Error(`revolut_customer_${response.status}`);
  const customer=await response.json() as {id:string};const timestamp=Date.now();
  await env.DB.prepare("INSERT OR IGNORE INTO billing_customers(id,user_id,provider,provider_customer_id,email,created_at,updated_at) VALUES (?,?,'revolut',?,?,?,?)").bind(crypto.randomUUID(),userId,customer.id,email,timestamp,timestamp).run();
  return customer.id;
}

async function createStripeCheckout(env:Env,order:OrderRow,items:StoredItem[],email:string,save:boolean,appUrl:string){
  const recurring=subscriptionItem(items);const customer=await ensureStripeCustomer(env,order.user_id,email);
  const fields:Record<string,string|number|boolean|undefined>={mode:recurring?"subscription":"payment",customer,client_reference_id:order.id,
    success_url:`${appUrl}/profil?tab=${recurring?"subscriptions":"collection"}&plata=reusita&order=${order.id}`,
    cancel_url:`${appUrl}/profil?tab=cart&plata=anulata&order=${order.id}`,"line_items[0][quantity]":1,
    "line_items[0][price_data][currency]":order.currency.toLowerCase(),"line_items[0][price_data][unit_amount]":order.total_cents,
    "line_items[0][price_data][product_data][name]":orderDescription(items),"metadata[order_id]":order.id,"metadata[user_id]":order.user_id,
    ...(recurring?{"line_items[0][price_data][recurring][interval]":recurring.period==="annual"?"year":"month","subscription_data[metadata][order_id]":order.id,"subscription_data[metadata][user_id]":order.user_id,"subscription_data[metadata][sku]":recurring.sku,"subscription_data[metadata][period]":recurring.period}:save?{"payment_intent_data[setup_future_usage]":"off_session"}:{})};
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:stripeHeaders(env),body:stripeForm(fields)});
  if(!response.ok)throw new Error(`stripe_checkout_${response.status}`);const session=await response.json() as {id:string;url?:string};
  return {providerId:session.id,url:session.url??null,mode:recurring?"subscription" as const:"payment" as const};
}

async function createRevolutCheckout(env:Env,order:OrderRow,items:StoredItem[],email:string,name:string|null,appUrl:string){
  const recurring=subscriptionItem(items);
  if(!recurring){
    const response=await fetch(`${revolutRoot(env)}/orders`,{method:"POST",headers:revolutHeaders(env,order.id),body:JSON.stringify({amount:order.total_cents,currency:order.currency.toUpperCase(),capture_mode:"automatic",merchant_order_data:{reference:order.id,description:orderDescription(items)},merchant_order_ext_ref:order.id,customer:{email},redirect_url:`${appUrl}/profil?tab=collection&plata=verificare&order=${order.id}`,metadata:{order_id:order.id,user_id:order.user_id}})});
    if(!response.ok)throw new Error(`revolut_checkout_${response.status}`);const created=await response.json() as {id:string;checkout_url?:string};
    return {providerId:created.id,url:created.checkout_url??null,mode:"payment" as const};
  }
  const mapping=await env.DB.prepare("SELECT provider_variation_id FROM billing_provider_products WHERE sku=? AND provider='revolut' AND period=? AND active=1").bind(recurring.sku,recurring.period).first<{provider_variation_id:string|null}>();
  if(!mapping?.provider_variation_id)throw new Error("revolut_plan_unconfigured");
  const customerId=await ensureRevolutCustomer(env,order.user_id,email,name);
  const response=await fetch(`${revolutRoot(env)}/subscriptions`,{method:"POST",headers:revolutHeaders(env,order.id),body:JSON.stringify({plan_variation_id:mapping.provider_variation_id,customer_id:customerId,setup_order_redirect_url:`${appUrl}/profil?tab=subscriptions&plata=verificare&order=${order.id}`,external_reference:order.id})});
  if(!response.ok)throw new Error(`revolut_subscription_${response.status}`);const subscription=await response.json() as {id:string;setup_order_id?:string};
  if(!subscription.setup_order_id)throw new Error("revolut_setup_order_missing");
  const setup=await fetch(`${revolutRoot(env)}/orders/${subscription.setup_order_id}`,{headers:revolutHeaders(env)});if(!setup.ok)throw new Error(`revolut_setup_order_${setup.status}`);
  const setupOrder=await setup.json() as {checkout_url?:string};const timestamp=Date.now();
  await env.DB.prepare("INSERT OR IGNORE INTO billing_subscriptions(id,user_id,order_id,provider,provider_subscription_id,sku,status,period,amount_minor,currency,created_at,updated_at) VALUES (?,?,?,'revolut',?,?,'incomplete',?,?,?,?,?)").bind(crypto.randomUUID(),order.user_id,order.id,subscription.id,recurring.sku,recurring.period,order.total_cents,order.currency,timestamp,timestamp).run();
  return {providerId:subscription.setup_order_id,url:setupOrder.checkout_url??null,mode:"subscription" as const};
}

export async function createCheckoutForOrder(c:Context<AppBindings>,input:{orderId:string;provider:Provider;savePaymentMethod?:boolean}){
  const userId=c.get("userId");const order=await getOrder(c.env.DB,input.orderId,userId);
  if(!order)return {status:404 as const,body:{error:{code:"unknown_order"}}};
  if(order.requires_manual_quote||order.total_cents<=0)return {status:409 as const,body:{error:{code:"manual_quote_required"}}};
  if(order.status==="paid")return {status:409 as const,body:{error:{code:"order_already_paid"}}};
  if(!providerCapabilities(c.env)[input.provider].enabled)return {status:503 as const,body:{error:{code:"provider_unconfigured",provider:input.provider}}};
  const user=await c.env.DB.prepare("SELECT u.email,COALESCE(p.company_name,p.display_name,u.email) AS name FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.id=?").bind(userId).first<{email:string;name:string|null}>();
  if(!user?.email)return {status:409 as const,body:{error:{code:"billing_identity_missing"}}};
  const appUrl=(c.env.APP_URL||"https://avyron.ro").replace(/\/+$/,"");const items=orderItems(order);
  let checkout:{providerId:string;url:string|null;mode:"payment"|"subscription"};
  try{checkout=input.provider==="stripe"?await createStripeCheckout(c.env,order,items,user.email,input.savePaymentMethod!==false,appUrl):await createRevolutCheckout(c.env,order,items,user.email,user.name,appUrl);}catch(error){const code=error instanceof Error?error.message:"provider_error";const safeCode=code==="revolut_plan_unconfigured"?code:"checkout_provider_failed";return {status:(code==="revolut_plan_unconfigured"?409:502) as 409|502,body:{error:{code:safeCode,provider:input.provider}}};}
  const timestamp=Date.now();await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO billing_checkout_sessions(id,user_id,order_id,provider,provider_session_id,mode,status,amount_minor,currency,checkout_url,save_payment_method,created_at,updated_at) VALUES (?,?,?,?,?,?,'created',?,?,?,?,?,?)").bind(crypto.randomUUID(),userId,order.id,input.provider,checkout.providerId,checkout.mode,order.total_cents,order.currency,checkout.url,input.savePaymentMethod===false?0:1,timestamp,timestamp),
    c.env.DB.prepare("UPDATE commerce_orders SET status='accepted',updated_at=? WHERE id=? AND status IN ('requested','quoted','accepted')").bind(timestamp,order.id),
  ]);return {status:201 as const,body:{orderId:order.id,provider:input.provider,mode:checkout.mode,url:checkout.url,amountMinor:order.total_cents,currency:order.currency}};
}

billingRouter.get("/api/billing/config",(c)=>c.json({providers:providerCapabilities(c.env),preferred:"revolut"}));
billingRouter.post("/api/billing/checkout",async(c)=>{const parsed=checkoutSchema.safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return c.json({error:{code:"invalid_request"}},400);const result=await createCheckoutForOrder(c,parsed.data);return c.json(result.body,result.status);});

billingRouter.get("/api/billing/account",async(c)=>{
  const userId=c.get("userId");
  try{const [profile,methods,subscriptions,invoices]=await Promise.all([
    c.env.DB.prepare("SELECT entity_type,legal_name,tax_id,registration_number,address,city,county,country_code,invoice_email,automatic_charging,default_provider FROM billing_profiles WHERE user_id=?").bind(userId).first(),
    c.env.DB.prepare("SELECT id,provider,type,brand,last4,expiry_month,expiry_year,is_default,status FROM billing_payment_methods WHERE user_id=? AND status='active' ORDER BY is_default DESC,created_at DESC").bind(userId).all(),
    c.env.DB.prepare("SELECT id,provider,sku,status,period,amount_minor,currency,current_period_start,current_period_end,cancel_at_period_end,created_at FROM billing_subscriptions WHERE user_id=? ORDER BY created_at DESC").bind(userId).all(),
    c.env.DB.prepare("SELECT id,order_id,provider,series,number,status,currency,total_minor,document_url,issued_at,created_at FROM billing_invoices WHERE user_id=? ORDER BY created_at DESC").bind(userId).all(),
  ]);return c.json({profile,methods:methods.results,subscriptions:subscriptions.results,invoices:invoices.results,providers:providerCapabilities(c.env)});}catch(error){if(/no such table: billing_/i.test(String(error)))return c.json({error:{code:"billing_migration_pending"}},503);throw error;}
});

billingRouter.put("/api/billing/profile",async(c)=>{
  const parsed=profileSchema.safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return c.json({error:{code:"invalid_billing_profile"}},400);
  const value=parsed.data,timestamp=Date.now();
  await c.env.DB.prepare(`INSERT INTO billing_profiles(user_id,entity_type,legal_name,tax_id,registration_number,address,city,county,country_code,invoice_email,automatic_charging,default_provider,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET entity_type=excluded.entity_type,legal_name=excluded.legal_name,tax_id=excluded.tax_id,registration_number=excluded.registration_number,address=excluded.address,city=excluded.city,county=excluded.county,country_code=excluded.country_code,invoice_email=excluded.invoice_email,automatic_charging=excluded.automatic_charging,default_provider=excluded.default_provider,updated_at=excluded.updated_at`)
    .bind(c.get("userId"),value.entityType??null,value.legalName??null,value.taxId??null,value.registrationNumber??null,value.address??null,value.city??null,value.county??null,value.countryCode,value.invoiceEmail??null,value.automaticCharging?1:0,value.defaultProvider??null,timestamp,timestamp).run();
  return c.json({ok:true});
});

billingRouter.post("/api/billing/payment-methods/setup",async(c)=>{
  const body=await c.req.json().catch(()=>({})) as {provider?:unknown};
  if(body.provider!=="stripe")return c.json({error:{code:"setup_requires_supported_provider"}},409);
  if(!providerCapabilities(c.env).stripe.enabled)return c.json({error:{code:"provider_unconfigured",provider:"stripe"}},503);
  const userId=c.get("userId"),user=await c.env.DB.prepare("SELECT email FROM users WHERE id=?").bind(userId).first<{email:string}>();
  if(!user)return c.json({error:{code:"billing_identity_missing"}},409);
  const customer=await ensureStripeCustomer(c.env,userId,user.email),appUrl=(c.env.APP_URL||"https://avyron.ro").replace(/\/+$/,"");
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:stripeHeaders(c.env),body:stripeForm({mode:"setup",customer,success_url:`${appUrl}/profil?tab=settings&metoda=salvata`,cancel_url:`${appUrl}/profil?tab=settings&metoda=anulata`,"metadata[user_id]":userId})});
  if(!response.ok)return c.json({error:{code:"setup_provider_failed"}},502);const session=await response.json() as {url?:string};return c.json({url:session.url??null},201);
});

billingRouter.post("/api/billing/portal",async(c)=>{
  if(!providerCapabilities(c.env).stripe.enabled)return c.json({error:{code:"provider_unconfigured",provider:"stripe"}},503);
  const customer=await c.env.DB.prepare("SELECT provider_customer_id FROM billing_customers WHERE user_id=? AND provider='stripe'").bind(c.get("userId")).first<{provider_customer_id:string}>();
  if(!customer)return c.json({error:{code:"stripe_customer_missing"}},404);const appUrl=(c.env.APP_URL||"https://avyron.ro").replace(/\/+$/,"");
  const response=await fetch("https://api.stripe.com/v1/billing_portal/sessions",{method:"POST",headers:stripeHeaders(c.env),body:stripeForm({customer:customer.provider_customer_id,return_url:`${appUrl}/profil?tab=settings`})});
  if(!response.ok)return c.json({error:{code:"portal_provider_failed"}},502);const session=await response.json() as {url?:string};return c.json({url:session.url??null},201);
});

async function recordPaidOrder(env:Env,input:{provider:Provider;providerReference:string;order:OrderRow;subscriptionId?:string|null}){
  const timestamp=Date.now();if(input.order.status==="paid")return {replay:true,invoiced:false};
  const items=orderItems(input.order),recurring=subscriptionItem(items),referenceColumn=input.provider==="stripe"?"stripe_reference":"revolut_reference";
  const statements=[
    env.DB.prepare("UPDATE commerce_orders SET status='paid',updated_at=? WHERE id=? AND status!='paid'").bind(timestamp,input.order.id),
    env.DB.prepare(`INSERT INTO financial_revenues(id,revenue_type,service_name,status,currency,gross_amount_minor,amount_ron_minor,payment_date,payment_processor,payment_method,${referenceColumn},notes,source,external_reference,created_at,updated_at) VALUES (?,?,?,'paid',?,?,?,?,?,'card',?,'Plată confirmată de webhook','system_generated',?,?,?)`)
      .bind(crypto.randomUUID(),recurring?"subscriptions":"digital_products",orderDescription(items),input.order.currency,input.order.total_cents,input.order.total_cents,timestamp,input.provider,input.providerReference,input.order.id,timestamp,timestamp),
    env.DB.prepare("UPDATE billing_checkout_sessions SET status='paid',updated_at=? WHERE order_id=? AND provider=? AND status!='paid'").bind(timestamp,input.order.id,input.provider),
  ];
  if(input.subscriptionId&&recurring&&input.provider==="stripe")statements.push(env.DB.prepare("INSERT OR IGNORE INTO billing_subscriptions(id,user_id,order_id,provider,provider_subscription_id,sku,status,period,amount_minor,currency,created_at,updated_at) VALUES (?,?,?,'stripe',?,?,'active',?,?,?,?,?)").bind(crypto.randomUUID(),input.order.user_id,input.order.id,input.subscriptionId,recurring.sku,recurring.period,input.order.total_cents,input.order.currency,timestamp,timestamp));
  const legacy=items[0];
  if(items.length===1&&(legacy?.kind==="plan"||legacy?.kind==="item")&&legacy.id)statements.push(legacy.kind==="plan"
    ?env.DB.prepare("INSERT OR IGNORE INTO product_entitlements(id,user_id,slug,plan,source,order_id,granted_at,expires_at) VALUES (?,?,NULL,?,'purchase',?,?,?)").bind(crypto.randomUUID(),input.order.user_id,legacy.id,input.order.id,timestamp,timestamp+365*86400000)
    :env.DB.prepare("INSERT OR IGNORE INTO product_entitlements(id,user_id,slug,plan,source,order_id,granted_at,expires_at) VALUES (?,?,?,NULL,'purchase',?,?,NULL)").bind(crypto.randomUUID(),input.order.user_id,legacy.id,input.order.id,timestamp));
  await env.DB.batch(statements);
  const identity=await env.DB.prepare("SELECT u.email,COALESCE(bp.legal_name,p.company_name,p.display_name,u.email) AS name,COALESCE(bp.tax_id,p.cui) AS tax_id,COALESCE(bp.address,p.address) AS address FROM users u LEFT JOIN profiles p ON p.id=u.id LEFT JOIN billing_profiles bp ON bp.user_id=u.id WHERE u.id=?").bind(input.order.user_id).first<{email:string;name:string;tax_id:string|null;address:string|null}>();
  const invoice=await issueOblioInvoice(env,{orderId:input.order.id,buyer:{name:identity?.name||identity?.email||"Client AVYRON",email:identity?.email,taxId:identity?.tax_id,address:identity?.address},lines:items.map((item)=>({name:item.name||item.sku||item.id||"Serviciu AVYRON",code:item.sku||item.id,quantity:item.quantity||1,unitPriceMinor:Math.round((item.lineTotalCents??item.unitPriceCents??input.order.total_cents)/(item.quantity||1))})),currency:input.order.currency,issuedAt:timestamp});
  await env.DB.prepare("INSERT OR REPLACE INTO billing_invoices(id,user_id,order_id,provider,provider_invoice_id,series,number,status,currency,total_minor,document_url,error_code,issued_at,created_at,updated_at) VALUES (?,?,?,'oblio',?,?,?,?,?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),input.order.user_id,input.order.id,invoice.issued?invoice.providerId:null,invoice.issued?invoice.series:null,invoice.issued?invoice.number:null,invoice.issued?"issued":"pending",input.order.currency,input.order.total_cents,invoice.issued?invoice.documentUrl:null,invoice.issued?null:invoice.reason,invoice.issued?timestamp:null,timestamp,timestamp).run();
  if(invoice.issued)await env.DB.prepare("UPDATE financial_revenues SET invoice_number=?,invoice_date=?,updated_at=? WHERE external_reference=?").bind(`${invoice.series}${invoice.number}`,timestamp,timestamp,input.order.id).run();
  return {replay:false,invoiced:invoice.issued};
}

billingRouter.post("/api/billing/webhooks/stripe",async(c)=>{
  const secret=c.env.STRIPE_WEBHOOK_SECRET?.trim();if(!secret)return c.json({error:{code:"provider_unconfigured"}},503);
  const payload=await c.req.text();if(!(await stripeSignatureValid(secret,c.req.header("stripe-signature")||"",payload)))return c.json({error:{code:"invalid_signature"}},400);
  const event=JSON.parse(payload) as {id:string;type:string;data:{object:Record<string,unknown>}};
  const previous=await c.env.DB.prepare("SELECT status FROM billing_webhook_events WHERE provider='stripe' AND provider_event_id=?").bind(event.id).first<{status:string}>();
  if(previous&&(previous.status==="processed"||previous.status==="ignored"))return c.json({ok:true,replay:true});
  const timestamp=Date.now();await c.env.DB.prepare("INSERT OR IGNORE INTO billing_webhook_events(id,provider,provider_event_id,event_type,status,received_at) VALUES (?,'stripe',?,?,'received',?)").bind(crypto.randomUUID(),event.id,event.type,timestamp).run();
  if(event.type.startsWith("customer.subscription.")){
    const subscription=event.data.object as {id?:string;status?:string;current_period_start?:number;current_period_end?:number;cancel_at_period_end?:boolean};
    if(!subscription.id){await setWebhookStatus(c.env,"stripe",event.id,"failed","subscription_id_missing");return c.json({error:{code:"subscription_id_missing"}},400);}
    const result=await c.env.DB.prepare("UPDATE billing_subscriptions SET status=?,current_period_start=?,current_period_end=?,cancel_at_period_end=?,updated_at=? WHERE provider='stripe' AND provider_subscription_id=?")
      .bind(stripeSubscriptionStatus(subscription.status||"",event.type),subscription.current_period_start?subscription.current_period_start*1000:null,subscription.current_period_end?subscription.current_period_end*1000:null,subscription.cancel_at_period_end?1:0,Date.now(),subscription.id).run();
    if(!Number(result.meta.changes||0)){await setWebhookStatus(c.env,"stripe",event.id,"failed","subscription_not_registered");return c.json({error:{code:"subscription_not_registered"}},503);}
    await setWebhookStatus(c.env,"stripe",event.id,"processed");return c.json({ok:true,subscriptionUpdated:true});
  }
  if(event.type==="invoice.paid"){
    const invoice=event.data.object as {id?:string;amount_paid?:number;currency?:string;billing_reason?:string;subscription?:string;payment_intent?:string;period_start?:number;period_end?:number;parent?:{subscription_details?:{subscription?:string}}};
    if(invoice.billing_reason==="subscription_create"){await setWebhookStatus(c.env,"stripe",event.id,"ignored","initial_invoice_confirmed_by_checkout");return c.json({ok:true,ignored:"subscription_create"});}
    const subscriptionId=invoice.subscription||invoice.parent?.subscription_details?.subscription||"";
    const local=subscriptionId?await c.env.DB.prepare("SELECT bs.user_id,bs.order_id,bs.currency,co.items_json FROM billing_subscriptions bs JOIN commerce_orders co ON co.id=bs.order_id WHERE bs.provider='stripe' AND bs.provider_subscription_id=?").bind(subscriptionId).first<{user_id:string;order_id:string;currency:string;items_json:string}>():null;
    if(!invoice.id||!local){await setWebhookStatus(c.env,"stripe",event.id,"failed","subscription_not_registered");return c.json({error:{code:"subscription_not_registered"}},503);}
    const amount=Number(invoice.amount_paid||0),currency=(invoice.currency||"").toUpperCase();
    if(amount<=0||currency!==local.currency.toUpperCase()){await setWebhookStatus(c.env,"stripe",event.id,"failed","invoice_mismatch");return c.json({error:{code:"invoice_mismatch"}},400);}
    const renewalOrderId=`stripe-invoice-${invoice.id}`,renewedAt=Date.now();
    await c.env.DB.prepare("INSERT OR IGNORE INTO commerce_orders(id,user_id,items_json,subtotal_cents,promotion_id,promotion_code,discount_percent,discount_base_cents,discount_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES (?,?,?,?,NULL,NULL,0,0,0,?,?,0,'requested',?,?)")
      .bind(renewalOrderId,local.user_id,local.items_json,amount,amount,currency,renewedAt,renewedAt).run();
    const order=await getOrder(c.env.DB,renewalOrderId);if(!order){await setWebhookStatus(c.env,"stripe",event.id,"failed","renewal_order_failed");return c.json({error:{code:"renewal_order_failed"}},500);}
    let result:Awaited<ReturnType<typeof recordPaidOrder>>;try{result=await recordPaidOrder(c.env,{provider:"stripe",providerReference:invoice.payment_intent||invoice.id,order,subscriptionId});}catch(error){await setWebhookStatus(c.env,"stripe",event.id,"failed","fulfillment_failed");throw error;}
    await c.env.DB.prepare("UPDATE billing_subscriptions SET status='active',current_period_start=?,current_period_end=?,updated_at=? WHERE provider='stripe' AND provider_subscription_id=?")
      .bind(invoice.period_start?invoice.period_start*1000:null,invoice.period_end?invoice.period_end*1000:null,Date.now(),subscriptionId).run();
    await setWebhookStatus(c.env,"stripe",event.id,"processed");return c.json({ok:true,renewal:true,...result});
  }
  if(event.type!=="checkout.session.completed"){await setWebhookStatus(c.env,"stripe",event.id,"ignored");return c.json({ok:true,ignored:event.type});}
  const session=event.data.object as {id?:string;mode?:string;setup_intent?:string;client_reference_id?:string;payment_status?:string;amount_total?:number;subscription?:string;payment_intent?:string;metadata?:Record<string,string>};
  if(session.mode==="setup"&&session.setup_intent&&session.metadata?.user_id){
    const intentResponse=await fetch(`https://api.stripe.com/v1/setup_intents/${encodeURIComponent(session.setup_intent)}`,{headers:stripeHeaders(c.env)});
    if(!intentResponse.ok){await setWebhookStatus(c.env,"stripe",event.id,"failed","setup_verification_failed");return c.json({error:{code:"setup_verification_failed"}},502);}
    const intent=await intentResponse.json() as {payment_method?:string};
    if(!intent.payment_method){await setWebhookStatus(c.env,"stripe",event.id,"failed","setup_method_missing");return c.json({error:{code:"setup_method_missing"}},400);}
    const methodResponse=await fetch(`https://api.stripe.com/v1/payment_methods/${encodeURIComponent(intent.payment_method)}`,{headers:stripeHeaders(c.env)});
    if(!methodResponse.ok){await setWebhookStatus(c.env,"stripe",event.id,"failed","method_verification_failed");return c.json({error:{code:"method_verification_failed"}},502);}
    const method=await methodResponse.json() as {id:string;type?:string;card?:{brand?:string;last4?:string;exp_month?:number;exp_year?:number}};const savedAt=Date.now();
    await c.env.DB.prepare("INSERT OR REPLACE INTO billing_payment_methods(id,user_id,provider,provider_payment_method_id,type,brand,last4,expiry_month,expiry_year,is_default,status,created_at,updated_at) VALUES (?,?, 'stripe',?,?,?,?,?,?,CASE WHEN EXISTS(SELECT 1 FROM billing_payment_methods WHERE user_id=? AND status='active') THEN 0 ELSE 1 END,'active',?,?)")
      .bind(crypto.randomUUID(),session.metadata.user_id,method.id,method.type||"card",method.card?.brand??null,method.card?.last4??null,method.card?.exp_month??null,method.card?.exp_year??null,session.metadata.user_id,savedAt,savedAt).run();
    await setWebhookStatus(c.env,"stripe",event.id,"processed");return c.json({ok:true,methodSaved:true});
  }
  const orderId=session.client_reference_id||session.metadata?.order_id||"",order=await getOrder(c.env.DB,orderId);
  if(!order||session.metadata?.user_id!==order.user_id||Number(session.amount_total)!==order.total_cents){await setWebhookStatus(c.env,"stripe",event.id,"failed","order_mismatch");return c.json({error:{code:"order_mismatch"}},400);}
  if(session.payment_status&&session.payment_status!=="paid"&&!session.subscription){await setWebhookStatus(c.env,"stripe",event.id,"ignored","payment_pending");return c.json({ok:true,pending:true},202);}
  let result:Awaited<ReturnType<typeof recordPaidOrder>>;try{result=await recordPaidOrder(c.env,{provider:"stripe",providerReference:session.payment_intent||session.id||event.id,order,subscriptionId:session.subscription});}catch(error){await setWebhookStatus(c.env,"stripe",event.id,"failed","fulfillment_failed");throw error;}
  await setWebhookStatus(c.env,"stripe",event.id,"processed");return c.json({ok:true,...result});
});

billingRouter.post("/api/billing/webhooks/revolut",async(c)=>{
  const secret=c.env.REVOLUT_MERCHANT_WEBHOOK_SECRET?.trim();if(!secret)return c.json({error:{code:"provider_unconfigured"}},503);
  const payload=await c.req.text(),requestTimestamp=c.req.header("revolut-request-timestamp")||"";
  if(!(await revolutSignatureValid(secret,requestTimestamp,c.req.header("revolut-signature")||"",payload)))return c.json({error:{code:"invalid_signature"}},400);
  const event=JSON.parse(payload) as {event:string;order_id?:string;subscription_id?:string;merchant_order_ext_ref?:string;external_reference?:string};
  const eventId=`${event.event}:${event.order_id||event.subscription_id||event.external_reference||requestTimestamp}`;
  const previous=await c.env.DB.prepare("SELECT status FROM billing_webhook_events WHERE provider='revolut' AND provider_event_id=?").bind(eventId).first<{status:string}>();
  if(previous&&(previous.status==="processed"||previous.status==="ignored"))return c.json({ok:true,replay:true});
  await c.env.DB.prepare("INSERT OR IGNORE INTO billing_webhook_events(id,provider,provider_event_id,event_type,status,received_at) VALUES (?,'revolut',?,?,'received',?)").bind(crypto.randomUUID(),eventId,event.event,Date.now()).run();
  if(event.event.startsWith("SUBSCRIPTION_")&&event.subscription_id){
    const remote=await fetch(`${revolutRoot(c.env)}/subscriptions/${event.subscription_id}`,{headers:revolutHeaders(c.env)});if(!remote.ok){await setWebhookStatus(c.env,"revolut",eventId,"failed","subscription_verification_failed");return c.json({error:{code:"subscription_verification_failed"}},502);}
    const subscription=await remote.json() as {state?:string};const mapped=revolutSubscriptionStatus(subscription.state||"");
    await c.env.DB.prepare("UPDATE billing_subscriptions SET status=?,updated_at=? WHERE provider='revolut' AND provider_subscription_id=?").bind(mapped,Date.now(),event.subscription_id).run();
    await setWebhookStatus(c.env,"revolut",eventId,"processed");return c.json({ok:true});
  }
  if(event.event!=="ORDER_COMPLETED"||!event.order_id){await setWebhookStatus(c.env,"revolut",eventId,"ignored");return c.json({ok:true,ignored:event.event});}
  const remote=await fetch(`${revolutRoot(c.env)}/orders/${event.order_id}`,{headers:revolutHeaders(c.env)});if(!remote.ok){await setWebhookStatus(c.env,"revolut",eventId,"failed","order_verification_failed");return c.json({error:{code:"order_verification_failed"}},502);}
  const remoteOrder=await remote.json() as {id:string;state?:string;amount?:number;currency?:string;merchant_order_ext_ref?:string;metadata?:Record<string,string>};
  let orderId=event.merchant_order_ext_ref||remoteOrder.merchant_order_ext_ref||remoteOrder.metadata?.order_id||"";
  if(!orderId){const session=await c.env.DB.prepare("SELECT order_id FROM billing_checkout_sessions WHERE provider='revolut' AND provider_session_id=?").bind(event.order_id).first<{order_id:string}>();orderId=session?.order_id||"";}
  const order=await getOrder(c.env.DB,orderId);
  if(!order||remoteOrder.state!=="completed"||Number(remoteOrder.amount)!==order.total_cents||remoteOrder.currency?.toUpperCase()!==order.currency.toUpperCase()){await setWebhookStatus(c.env,"revolut",eventId,"failed","order_mismatch");return c.json({error:{code:"order_mismatch"}},400);}
  const localSubscription=await c.env.DB.prepare("SELECT provider_subscription_id FROM billing_subscriptions WHERE provider='revolut' AND order_id=?").bind(order.id).first<{provider_subscription_id:string}>();
  if(localSubscription){
    const subscriptionResponse=await fetch(`${revolutRoot(c.env)}/subscriptions/${localSubscription.provider_subscription_id}`,{headers:revolutHeaders(c.env)});
    if(!subscriptionResponse.ok){await setWebhookStatus(c.env,"revolut",eventId,"failed","subscription_verification_failed");return c.json({error:{code:"subscription_verification_failed"}},502);}
    const subscription=await subscriptionResponse.json() as {state?:string};
    await c.env.DB.prepare("UPDATE billing_subscriptions SET status=?,updated_at=? WHERE provider='revolut' AND provider_subscription_id=?").bind(revolutSubscriptionStatus(subscription.state||""),Date.now(),localSubscription.provider_subscription_id).run();
  }
  let result:Awaited<ReturnType<typeof recordPaidOrder>>;try{result=await recordPaidOrder(c.env,{provider:"revolut",providerReference:remoteOrder.id,order});}catch(error){await setWebhookStatus(c.env,"revolut",eventId,"failed","fulfillment_failed");throw error;}
  await setWebhookStatus(c.env,"revolut",eventId,"processed");return c.json({ok:true,...result});
});

billingRouter.post("/api/billing/subscriptions/:id/cancel",async(c)=>{
  const row=await c.env.DB.prepare("SELECT provider,provider_subscription_id,status FROM billing_subscriptions WHERE id=? AND user_id=?").bind(c.req.param("id"),c.get("userId")).first<{provider:string;provider_subscription_id:string;status:string}>();
  if(!row)return c.json({error:{code:"subscription_not_found"}},404);if(row.status==="cancelled"||row.status==="expired")return c.json({ok:true,status:row.status});let response:Response;
  if(row.provider==="stripe"){response=await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(row.provider_subscription_id)}`,{method:"POST",headers:stripeHeaders(c.env),body:stripeForm({cancel_at_period_end:true})});if(response.ok)await c.env.DB.prepare("UPDATE billing_subscriptions SET cancel_at_period_end=1,updated_at=? WHERE id=?").bind(Date.now(),c.req.param("id")).run();}
  else if(row.provider==="revolut"){response=await fetch(`${revolutRoot(c.env)}/subscriptions/${encodeURIComponent(row.provider_subscription_id)}/cancel`,{method:"POST",headers:revolutHeaders(c.env)});if(response.ok)await c.env.DB.prepare("UPDATE billing_subscriptions SET status='cancelled',updated_at=? WHERE id=?").bind(Date.now(),c.req.param("id")).run();}
  else return c.json({error:{code:"provider_not_supported"}},409);if(!response.ok)return c.json({error:{code:"provider_cancel_failed"}},502);return c.json({ok:true});
});

billingRouter.get("/api/billing/admin/status",async(c)=>{
  if(!c.get("roles").some((role)=>role==="staff"||role==="admin"))return c.json({error:{code:"forbidden"}},403);
  const [sessions,subscriptions,invoices,failed]=await Promise.all([
    c.env.DB.prepare("SELECT provider,status,COUNT(*) AS total FROM billing_checkout_sessions GROUP BY provider,status").all(),
    c.env.DB.prepare("SELECT provider,status,COUNT(*) AS total FROM billing_subscriptions GROUP BY provider,status").all(),
    c.env.DB.prepare("SELECT provider,status,COUNT(*) AS total FROM billing_invoices GROUP BY provider,status").all(),
    c.env.DB.prepare("SELECT provider,event_type,error_code,received_at FROM billing_webhook_events WHERE status='failed' ORDER BY received_at DESC LIMIT 20").all(),
  ]);return c.json({providers:providerCapabilities(c.env),sessions:sessions.results,subscriptions:subscriptions.results,invoices:invoices.results,recentFailures:failed.results});
});

export async function runBillingReconciliation(env:Env){
  if(!providerCapabilities(env).revolut.enabled)return;
  const {results}=await env.DB.prepare(`SELECT bs.provider_subscription_id,bs.order_id,co.user_id,co.items_json,co.currency
    FROM billing_subscriptions bs JOIN commerce_orders co ON co.id=bs.order_id
    WHERE bs.provider='revolut' AND bs.status IN ('incomplete','trialing','active','past_due')
    ORDER BY bs.updated_at ASC LIMIT 50`).all<{provider_subscription_id:string;order_id:string;user_id:string;items_json:string;currency:string}>();
  for(const local of results){
    try{
      const subscriptionResponse=await fetch(`${revolutRoot(env)}/subscriptions/${local.provider_subscription_id}`,{headers:revolutHeaders(env)});
      if(!subscriptionResponse.ok)throw new Error(`subscription_${subscriptionResponse.status}`);
      const subscription=await subscriptionResponse.json() as {state?:string};
      await env.DB.prepare("UPDATE billing_subscriptions SET status=?,updated_at=? WHERE provider='revolut' AND provider_subscription_id=?").bind(revolutSubscriptionStatus(subscription.state||""),Date.now(),local.provider_subscription_id).run();
      const cyclesResponse=await fetch(`${revolutRoot(env)}/subscriptions/${local.provider_subscription_id}/cycles?limit=100`,{headers:revolutHeaders(env)});
      if(!cyclesResponse.ok)throw new Error(`cycles_${cyclesResponse.status}`);
      const cycles=await cyclesResponse.json() as {cycles?:Array<{id:string;state?:string;start_date?:string;end_date?:string;order_id?:string;post_billing_order_id?:string}>};
      const setup=await env.DB.prepare("SELECT provider_session_id FROM billing_checkout_sessions WHERE provider='revolut' AND order_id=? AND mode='subscription' ORDER BY created_at ASC LIMIT 1").bind(local.order_id).first<{provider_session_id:string}>();
      for(const cycle of cycles.cycles||[]){
        const start=cycle.start_date?Date.parse(cycle.start_date):NaN,end=cycle.end_date?Date.parse(cycle.end_date):NaN;
        await env.DB.prepare("UPDATE billing_subscriptions SET current_period_start=?,current_period_end=?,updated_at=? WHERE provider='revolut' AND provider_subscription_id=?")
          .bind(Number.isFinite(start)?start:null,Number.isFinite(end)?end:null,Date.now(),local.provider_subscription_id).run();
        for(const providerOrderId of [cycle.order_id,cycle.post_billing_order_id].filter((value):value is string=>Boolean(value))){
          const eventId=`subscription-cycle:${cycle.id}:${providerOrderId}`;
          const previous=await env.DB.prepare("SELECT status FROM billing_webhook_events WHERE provider='revolut' AND provider_event_id=?").bind(eventId).first<{status:string}>();
          if(previous&&(previous.status==="processed"||previous.status==="ignored"))continue;
          await env.DB.prepare("INSERT OR IGNORE INTO billing_webhook_events(id,provider,provider_event_id,event_type,status,received_at) VALUES (?,'revolut',?,'SUBSCRIPTION_CYCLE_RECONCILIATION','received',?)").bind(crypto.randomUUID(),eventId,Date.now()).run();
          const orderResponse=await fetch(`${revolutRoot(env)}/orders/${providerOrderId}`,{headers:revolutHeaders(env)});
          if(!orderResponse.ok){await setWebhookStatus(env,"revolut",eventId,"failed","cycle_order_verification_failed");continue;}
          const remoteOrder=await orderResponse.json() as {id:string;state?:string;amount?:number;currency?:string};
          if(remoteOrder.state!=="completed")continue;
          const amount=Number(remoteOrder.amount||0),currency=(remoteOrder.currency||"").toUpperCase();
          if(amount<=0||currency!==local.currency.toUpperCase()){await setWebhookStatus(env,"revolut",eventId,"failed","cycle_order_mismatch");continue;}
          const orderId=providerOrderId===setup?.provider_session_id?local.order_id:`revolut-order-${providerOrderId}`;
          if(orderId!==local.order_id){
            const createdAt=Date.now();await env.DB.prepare("INSERT OR IGNORE INTO commerce_orders(id,user_id,items_json,subtotal_cents,promotion_id,promotion_code,discount_percent,discount_base_cents,discount_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES (?,?,?,?,NULL,NULL,0,0,0,?,?,0,'requested',?,?)")
              .bind(orderId,local.user_id,local.items_json,amount,amount,currency,createdAt,createdAt).run();
          }
          const order=await getOrder(env.DB,orderId);if(!order){await setWebhookStatus(env,"revolut",eventId,"failed","renewal_order_failed");continue;}
          try{await recordPaidOrder(env,{provider:"revolut",providerReference:remoteOrder.id,order});await setWebhookStatus(env,"revolut",eventId,"processed");}
          catch(error){await setWebhookStatus(env,"revolut",eventId,"failed","fulfillment_failed");throw error;}
        }
      }
    }catch(error){console.error(JSON.stringify({event:"billing_reconciliation_failed",provider:"revolut",subscriptionId:local.provider_subscription_id,error:String(error)}));}
  }
}
