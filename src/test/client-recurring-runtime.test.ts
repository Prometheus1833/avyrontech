import {clientPaymentHistory} from "../../cloudflare/workers/api/src/clientPayments";
// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync as SQLite, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { billingRouter, recordPaidOrder } from "../../cloudflare/workers/api/src/billing";
import { listClientRecurring, confirmNativeCheckout, syncNativeProvider, recurringOrderAuthorized, reconcileNativeBilling, nativeBillingDue } from "../../cloudflare/workers/api/src/billingRecurring";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
let db: SQLite, app: Hono<AppBindings>, env: Env, actor: string, requests: Array<{url: string; body: URLSearchParams}>, firstCharge: number, subscriptionStatus: string;
class Statement {
 values: SQLInputValue[]=[];
 constructor(readonly sql:string){}
 bind(...values:SQLInputValue[]){this.values=values;return this}
 async first(){return db.prepare(this.sql).get(...this.values)||null}
 async all(){return {results:db.prepare(this.sql).all(...this.values)}}
 async run(){return {meta:db.prepare(this.sql).run(...this.values)}}
}
beforeEach(()=>{
 db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('cloudflare/d1/migrations/'+file,'utf8'));
 for(const id of ['a','b']){db.prepare("INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,'synthetic',1,1,1)").run(id,id+'@example.test');db.prepare("INSERT INTO user_roles VALUES(?,'user')").run(id)}
 db.exec("INSERT INTO clients(id,company_name,email,created_at,access_managed) VALUES('ca','A SRL','a@example.test',1,1),('cb','B SRL','b@example.test',1,1); INSERT INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES('ca','a','a',1),('cb','b','b',1); INSERT INTO projects(id,client_id,name,status,created_at,slug,url) VALUES('pa','ca','Website A','live',1,'website-a','https://example.test/'),('pb','cb','Website B','live',1,'website-b',NULL); INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES('va','pa','Mentenanță website',50,'monthly'),('vb','pb','SEO B',75,'monthly');");
 firstCharge=Math.floor((Date.now()+7*86400000)/1000)*1000;
 db.prepare("INSERT INTO subscriptions(id,client_id,service_id,next_billing_date,status,created_at,updated_at,plan_sku) VALUES('sa','ca','va',?,'active',1,1,'TEST-MAINT'),('sb','cb','vb',?,'active',1,1,'TEST-MAINT')").run(firstCharge,firstCharge);
 db.exec("INSERT INTO subscription_billing_settings VALUES('sa','ca','company','A SRL','123456','Iași','billing@example.test',0,10,1,'a',1); INSERT INTO commercial_catalog_codes(id,entity_type,entity_key,display_name,accounting_code,sku,currency,vat_basis_points,payment_route,payment_status,active,created_at,updated_at,unit_label,price_model,billing_cycle,tax_status,invoice_provider) VALUES('test-maint','service','test-maint','Mentenanță','TEST-MAINT','TEST-MAINT','RON',0,'stripe','active',1,1,1,'lună','fixed','monthly','verified','manual')");
 actor='a';requests=[];subscriptionStatus='trialing';
 env={APP_ENV:'preview',MFA_AUTH_ENABLED:'false',STRIPE_SECRET_KEY:'sk_test_synthetic',STRIPE_WEBHOOK_SECRET:'whsec_synthetic',STRIPE_ACCOUNT_ID:'acct_synthetic',DB:{prepare:(sql:string)=>new Statement(sql),batch:async(statements:Statement[])=>{db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}}} as unknown as Env;
 app=new Hono<AppBindings>();app.use('*',async(c,next)=>{c.set('userId',actor);c.set('roles',['user']);await next()});app.onError(e=>{throw e});app.route('/',billingRouter);
 vi.stubGlobal('fetch',vi.fn(async(input:string|URL,init?:RequestInit)=>{const url=String(input),body=new URLSearchParams(String(init?.body||''));requests.push({url,body});
  let data:unknown={};
  if(url.endsWith('/v1/account'))data={id:'acct_synthetic',charges_enabled:true};
  else if(url.endsWith('/v1/customers'))data={id:'cus_a'};
  else if(url.endsWith('/checkout/sessions'))data={id:'cs_test_native',url:'https://checkout.stripe.com/c/pay/native'};
  else if(url.includes('/billing_portal/configurations?'))data={data:[],has_more:false};
  else if(url.endsWith('/billing_portal/configurations'))data={id:'bpc_native',active:true};
  else if(url.endsWith('/billing_portal/sessions'))data={url:'https://billing.stripe.com/p/session/native'};
  else if(url.includes("/setup_intents/"))data={customer:"cus_a",status:"succeeded",payment_method:"pm_a"};
  else if(url.includes("/payment_methods/pm_a"))data={customer:"cus_a"};
  else if(url.endsWith('/subscriptions/sub_native')){const a=db.prepare('SELECT order_id FROM billing_recurring_agreements LIMIT 1').get()!;data={id:'sub_native',customer:'cus_a',status:subscriptionStatus,collection_method:'charge_automatically',metadata:{order_id:a.order_id},items:{data:[{quantity:1,current_period_start:Math.floor(Date.now()/1000),current_period_end:firstCharge/1000,price:{unit_amount:5000,currency:'ron',recurring:{interval:'month',interval_count:1}}}]}}}
  return new Response(JSON.stringify(data),{status:200});
 }));
});
afterEach(()=>{db.close();vi.unstubAllGlobals()});
const list=()=>listClientRecurring(env,actor,true);
const activate=async(overrides:Record<string,unknown>={})=>{const row=(await list()).data.find(r=>r.id==='sa')!;return app.request('http://localhost/api/billing/recurring/sa/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision:row.revision,quoteHash:row.quoteHash,confirmed:true,...overrides})},env)};
it('lists only the authorized client subscriptions with exact amounts, dates and project links',async()=>{const result=await list();expect(result.data).toHaveLength(1);expect(result.data[0]).toMatchObject({name:'Mentenanță website',amountMinor:5000,currency:'RON',checkoutReady:true,beneficiary:'A SRL',nextBillingAt:firstCharge,project:{id:'pa',slug:'website-a'}});actor='b';expect((await list()).data.map(r=>r.id)).toEqual(['sb']);expect(requests).toHaveLength(0)});
it('requires explicit consent, rejects stale terms and never accepts client-controlled prices',async()=>{expect((await activate({confirmed:false})).status).toBe(400);expect((await activate({amountMinor:1})).status).toBe(400);expect((await activate({quoteHash:'0'.repeat(64)})).status).toBe(409);expect(requests).toHaveLength(0);expect(db.prepare('SELECT count(*) n FROM commerce_orders').get()!.n).toBe(0)});
it('creates one reusable native order, schedules the agreed date and never charges on the application server',async()=>{expect((await activate()).status).toBe(201);expect((await activate()).status).toBe(200);expect(db.prepare('SELECT count(*) n FROM commerce_orders').get()!.n).toBe(1);expect(db.prepare('SELECT count(*) n FROM billing_recurring_agreements').get()!.n).toBe(1);const payload=requests.find(r=>r.url.endsWith('/checkout/sessions'))!.body;expect(payload.get('mode')).toBe('subscription');expect(payload.get('subscription_data[trial_end]')).toBe(String(firstCharge/1000));expect(payload.get('line_items[0][price_data][unit_amount]')).toBe('5000');expect(payload.get('success_url')).toContain('tab=payments');expect(requests.filter(r=>r.url.includes('/payment_intents')||r.url.includes('/charges'))).toHaveLength(0)});
it('keeps unconfigured tax, billing and other clients fail-closed',async()=>{actor='b';const res=await app.request('http://localhost/api/billing/recurring/sa/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision:1,quoteHash:'0'.repeat(64),confirmed:true})},env);expect(res.status).toBe(404);actor='a';db.exec("UPDATE commercial_catalog_codes SET tax_status='unverified' WHERE id='test-maint'");expect((await list()).data[0].checkoutReady).toBe(false);expect((await activate()).status).toBe(400);expect(requests).toHaveLength(0)});
it('revokes checkout access immediately and preserves the accepted price',async()=>{await activate();const agreement=db.prepare('SELECT order_id FROM billing_recurring_agreements').get()!;expect(()=>db.exec("UPDATE services SET price=1 WHERE id='va'")).toThrow('recurring_agreement_requires_review');db.exec("DELETE FROM client_account_access WHERE user_id='a'");expect((await list()).data).toHaveLength(0);expect(await recurringOrderAuthorized(env,String(agreement.order_id),'a')).toBe(false)});
it('confirms future debit authorization without inventing a paid order or receipt',async()=>{await activate();const a=db.prepare('SELECT order_id FROM billing_recurring_agreements').get()!;expect(await confirmNativeCheckout(env,String(a.order_id),{id:'cs_test_native',subscription:'sub_native',amount_total:0,payment_status:'no_payment_required'})).toBe(true);expect(db.prepare('SELECT status FROM commerce_orders').get()!.status).toBe('accepted');expect(db.prepare('SELECT amount_minor FROM billing_checkout_sessions').get()!.amount_minor).toBe(0);expect(db.prepare('SELECT count(*) n FROM financial_revenues').get()!.n).toBe(0);const rows=(await list()).data;expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({paymentStatus:'trialing',canManage:true,checkoutReady:false,nextBillingAt:firstCharge})});
it('fetches the current provider status before changing it, including modern item-level periods',async()=>{await activate();const a=db.prepare('SELECT order_id FROM billing_recurring_agreements').get()!;await confirmNativeCheckout(env,String(a.order_id),{id:'cs_test_native',subscription:'sub_native',amount_total:0,payment_status:'no_payment_required'});subscriptionStatus='canceled';await syncNativeProvider(env,'sub_native');expect(db.prepare('SELECT status,current_period_end FROM billing_subscriptions').get()).toMatchObject({status:'cancelled',current_period_end:firstCharge});expect(db.prepare('SELECT closed_at FROM billing_recurring_agreements').get()!.closed_at).toBeTruthy()});
async function webhook(id:string,type:string,object:Record<string,unknown>){
 const payload=JSON.stringify({id,type,livemode:false,data:{object}}),timestamp=Math.floor(Date.now()/1000);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('whsec_synthetic'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${payload}`));const signature=Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,'0')).join('');
 return app.request('http://localhost/api/billing/webhooks/stripe',{method:'POST',headers:{'content-type':'application/json','stripe-signature':`t=${timestamp},v1=${signature}`},body:payload},env);
}
async function authorizedFuture(){await activate();const row=db.prepare('SELECT order_id FROM billing_recurring_agreements').get()!;const orderId=String(row.order_id);const object={id:'cs_test_native',client_reference_id:orderId,metadata:{order_id:orderId,user_id:'a'},mode:'subscription',subscription:'sub_native',amount_total:0,payment_status:'no_payment_required'};const response=await webhook('evt_start','checkout.session.completed',object);expect(response.status).toBe(200);expect(await response.json()).toMatchObject({authorized:true,charged:false});return {orderId,object}}
it('uses the signed webhook for zero-charge authorization, rejects forged webhooks and replays safely',async()=>{
 const {object}=await authorizedFuture();const response=await webhook('evt_start','checkout.session.completed',object);expect(await response.json()).toMatchObject({replay:true});
 const direct=await app.request('http://localhost/api/billing/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId:String(db.prepare('SELECT order_id FROM billing_recurring_agreements').get()!.order_id),provider:'stripe'})},env);expect(direct.status).toBe(409);expect(await direct.json()).toEqual({error:{code:'recurring_already_authorized'}});
 firstCharge+=30*86400000;expect(await (await webhook('evt_start_later','checkout.session.completed',object)).json()).toMatchObject({replay:true,charged:false});
 const bad=await app.request('http://localhost/api/billing/webhooks/stripe',{method:'POST',headers:{'stripe-signature':'t=1,v1=invalid'},body:'{}'},env);expect(bad.status).toBe(400);
 expect(db.prepare('SELECT count(*) n FROM financial_revenues').get()!.n).toBe(0);
});
it('records a real renewal once, links its beneficiary/project and advances only the paid billing period',async()=>{
 const {orderId}=await authorizedFuture();const start=firstCharge/1000;firstCharge+=30*86400000;subscriptionStatus='active';
 const invoice={id:'in_native1',subscription:'sub_native',billing_reason:'subscription_cycle',amount_paid:5000,currency:'ron',period_start:start,period_end:firstCharge/1000,lines:{data:[{period:{start,end:firstCharge/1000}}]}};
 const result=await webhook('evt_paid','invoice.paid',invoice);expect(result.status).toBe(200);expect(await result.json()).toMatchObject({renewal:true});
 expect((await webhook('evt_paid','invoice.paid',invoice)).status).toBe(200);expect((await webhook('evt_paid_copy','invoice.paid',invoice)).status).toBe(200);
 expect(db.prepare('SELECT client_id,project_id,gross_amount_minor,status FROM financial_revenues').get()).toMatchObject({client_id:'ca',project_id:'pa',gross_amount_minor:5000,status:'paid'});
 expect(db.prepare('SELECT count(*) n FROM financial_revenues').get()!.n).toBe(1);
 const history=await clientPaymentHistory(env.DB,'a',50,0);expect(history.data).toHaveLength(1);expect(history.data[0].order_id).toBe('stripe-invoice-in_native1');
 expect(db.prepare("SELECT next_billing_date FROM subscriptions WHERE id='sa'").get()!.next_billing_date).toBe(firstCharge);
 expect(db.prepare('SELECT status FROM commerce_orders WHERE id=?').get(orderId)!.status).toBe('accepted');
 expect(db.prepare('SELECT error_code FROM billing_invoices').get()!.error_code).toBe('manual_invoice_required');
 expect(requests.some(r=>r.url.includes('oblio.eu'))).toBe(false);
});
it('rejects a renewal with a different amount before writing financial records',async()=>{
 await authorizedFuture();const start=firstCharge/1000;
 const response=await webhook('evt_mismatch','invoice.paid',{id:'in_wrong',subscription:'sub_native',billing_reason:'subscription_cycle',amount_paid:100,currency:'ron',lines:{data:[{period:{start,end:start+30*86400}}]}});
 expect(response.status).toBe(400);expect(db.prepare('SELECT count(*) n FROM financial_revenues').get()!.n).toBe(0);
 expect(db.prepare("SELECT status,error_code FROM billing_webhook_events WHERE provider_event_id='evt_mismatch'").get()).toMatchObject({status:'failed',error_code:'recurring_invoice_mismatch'});
});
it('does not reactivate a cancelled subscription on an older subscription event and synchronizes a failed payment',async()=>{
 await authorizedFuture();subscriptionStatus='past_due';expect((await webhook('evt_failed','invoice.payment_failed',{subscription:'sub_native'})).status).toBe(200);expect(db.prepare('SELECT status FROM billing_subscriptions').get()!.status).toBe('past_due');
 subscriptionStatus='canceled';expect((await webhook('evt_old','customer.subscription.updated',{id:'sub_native',status:'active'})).status).toBe(200);expect(db.prepare('SELECT status FROM billing_subscriptions').get()!.status).toBe('cancelled');
});
it('binds the displayed quote to the accepted amount even if a service changes without subscription revision',async()=>{
 const row=(await list()).data[0];db.exec("UPDATE services SET price=51 WHERE id='va'");const response=await app.request('http://localhost/api/billing/recurring/sa/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision:row.revision,quoteHash:row.quoteHash,confirmed:true})},env);expect(response.status).toBe(409);expect(requests).toHaveLength(0);
});
it('saves a card only through a setup session and a successful provider-verified SetupIntent',async()=>{
 const response=await app.request('http://localhost/api/billing/payment-methods/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider:'stripe'})},env);expect(response.status).toBe(201);
 expect(requests.find(r=>r.url.endsWith('/checkout/sessions'))!.body.get('mode')).toBe('setup');
 expect((await webhook('evt_card','checkout.session.completed',{id:'cs_test_native',mode:'setup',setup_intent:'seti_a',metadata:{user_id:'a'}})).status).toBe(200);
 expect(db.prepare('SELECT status FROM billing_method_setup_sessions').get()!.status).toBe('completed');expect(db.prepare('SELECT count(*) n FROM commerce_orders').get()!.n).toBe(0);
});
it('repairs a missed zero-charge Checkout webhook through the existing bounded reconciliation job',async()=>{
 expect(await nativeBillingDue(env)).toBe(false);await activate();expect(await nativeBillingDue(env)).toBe(true);const {order_id:orderId}=db.prepare('SELECT order_id FROM billing_recurring_agreements').get()!;
 const previous=globalThis.fetch;vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>String(input).endsWith('/checkout/sessions/cs_test_native')?new Response(JSON.stringify({id:'cs_test_native',status:'complete',subscription:'sub_native',amount_total:0,payment_status:'no_payment_required',client_reference_id:orderId}),{status:200}):previous(input,init));
 const paid=vi.fn();await reconcileNativeBilling(env,paid);expect(await nativeBillingDue(env)).toBe(false);expect(db.prepare('SELECT status FROM billing_subscriptions').get()!.status).toBe('trialing');expect(paid).not.toHaveBeenCalled();expect(db.prepare('SELECT count(*) n FROM financial_revenues').get()!.n).toBe(0);
});
it('records the first immediate payment against the exact project without treating it as a future authorization',async()=>{
 db.prepare("UPDATE subscriptions SET next_billing_date=? WHERE id='sa'").run(Date.now()-86400000);await activate();const {order_id:orderId}=db.prepare('SELECT order_id FROM billing_recurring_agreements').get()!;subscriptionStatus='active';firstCharge=Math.floor((Date.now()+30*86400000)/1000)*1000;
 const response=await webhook('evt_first_paid','checkout.session.completed',{id:'cs_test_native',client_reference_id:orderId,metadata:{user_id:'a'},mode:'subscription',subscription:'sub_native',amount_total:5000,payment_status:'paid',payment_intent:'pi_first'});
 expect(response.status).toBe(200);expect(db.prepare('SELECT status FROM commerce_orders').get()!.status).toBe('paid');expect(db.prepare('SELECT client_id,project_id,gross_amount_minor FROM financial_revenues').get()).toMatchObject({client_id:'ca',project_id:'pa',gross_amount_minor:5000});
});
it('creates only a minimal dedicated customer portal for the signed-in Stripe customer',async()=>{
 db.exec("INSERT INTO billing_customers(id,user_id,provider,provider_customer_id,created_at,updated_at) VALUES('own-customer','a','stripe','cus_a',1,1)");
 const response=await app.request('http://localhost/api/billing/portal',{method:'POST'},env);expect(response.status).toBe(201);
 const configuration=requests.find(r=>r.url.endsWith('/billing_portal/configurations'))!.body;expect(configuration.get('features[payment_method_update][enabled]')).toBe('true');expect(configuration.get('features[subscription_update][enabled]')).toBe('false');expect(configuration.get('features[invoice_history][enabled]')).toBe('false');expect(configuration.get('features[subscription_cancel][mode]')).toBe('at_period_end');
 const session=requests.find(r=>r.url.endsWith('/billing_portal/sessions'))!.body;expect(session.get('customer')).toBe('cus_a');expect(session.get('configuration')).toBe('bpc_native');
});
it('releases a failed, undistributed preparation without locking the operational plan permanently',async()=>{
 const previous=globalThis.fetch;vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>String(input).endsWith('/checkout/sessions')?new Response('{}',{status:503}):previous(input,init));
 expect((await activate()).status).toBe(502);expect(db.prepare('SELECT closed_at FROM billing_recurring_agreements').get()!.closed_at).toBeTruthy();expect(db.prepare('SELECT status FROM commerce_orders').get()!.status).toBe('cancelled');
 expect(()=>db.exec("UPDATE services SET price=51 WHERE id='va'")).not.toThrow();expect(db.prepare('SELECT count(*) n FROM financial_revenues').get()!.n).toBe(0);
});
it('never issues an automatic fiscal invoice from an email-only billing identity',async()=>{
 Object.assign(env,{OBLIO_AUTO_ISSUE_ENABLED:'true',OBLIO_CLIENT_ID:'synthetic',OBLIO_CLIENT_SECRET:'synthetic',OBLIO_CIF:'123456',OBLIO_SERIES:'TEST',OBLIO_VAT_NAME:'Synthetic',OBLIO_VAT_PERCENTAGE:'0'});
 const id=crypto.randomUUID(),items=JSON.stringify([{sku:'ADDON',type:'product',name:'Produs',quantity:1,lineTotalCents:5000,invoiceProvider:'oblio'}]);db.prepare("INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES(?,'a',?,5000,5000,'RON',0,'requested',1,1)").run(id,items);
 await recordPaidOrder(env,{provider:'stripe',providerReference:'pi_generic',order:{id,user_id:'a',items_json:items,total_cents:5000,currency:'RON',requires_manual_quote:0,status:'requested',promotion_code:null}});
 expect(db.prepare('SELECT error_code FROM billing_invoices').get()!.error_code).toBe('billing_identity_incomplete');expect(requests).toHaveLength(0);
});
it('includes a paid historical AVY Partner annual access without silently converting it to automatic debit',async()=>{
 const id=crypto.randomUUID();db.prepare("INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES(?,'a',?,27000,27000,'RON',0,'paid',1,1)").run(id,JSON.stringify([{kind:'plan',id:'pro',name:'AVY Partener Pro — 12 luni'}]));db.prepare("INSERT INTO product_entitlements(id,user_id,plan,source,order_id,granted_at,expires_at) VALUES('annual','a','pro','purchase',?,1,?)").run(id,Date.now()+86400000);
 const row=(await list()).data.find(r=>r.source==='license');expect(row).toMatchObject({name:'AVY Partener Pro — 12 luni',amountMinor:27000,nextBillingAt:null,checkoutReady:false,canManage:false});expect(row?.accessEndsAt).toBeTruthy();actor='b';expect((await list()).data.some(r=>r.id==='annual')).toBe(false);expect(requests).toHaveLength(0);
});
it('does not distribute a second checkout URL when another provider wins a concurrent order attempt',async()=>{
 const orderId=crypto.randomUUID();db.prepare("INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES(?,'a',?,5000,5000,'RON',0,'requested',1,1)").run(orderId,JSON.stringify([{sku:'ONE',name:'Produs',quantity:1,lineTotalCents:5000}]));
 const previous=globalThis.fetch;vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{if(String(input).endsWith('/checkout/sessions'))db.prepare("INSERT INTO billing_checkout_sessions(id,user_id,order_id,provider,provider_session_id,mode,status,amount_minor,currency,checkout_url,created_at,updated_at) VALUES('winner','a',?,'revolut','rev_order','payment','created',5000,'RON','https://checkout.revolut.com/pay/winner',?,?)").run(orderId,Date.now(),Date.now());return previous(input,init)});
 const response=await app.request('http://localhost/api/billing/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId,provider:'stripe'})},env);expect(response.status).toBe(409);expect(await response.json()).toEqual({error:{code:'checkout_already_active',provider:'revolut'}});expect(db.prepare('SELECT count(*) n FROM billing_checkout_sessions').get()!.n).toBe(1);
});
it('does not replace a locally old checkout until the provider confirms that its payment link is expired',async()=>{
 const orderId=crypto.randomUUID(),old=Date.now()-24*3600000;db.prepare("INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES(?,'a',?,5000,5000,'RON',0,'accepted',1,1)").run(orderId,JSON.stringify([{sku:'ONE',name:'Produs',quantity:1,lineTotalCents:5000}]));db.prepare("INSERT INTO billing_checkout_sessions(id,user_id,order_id,provider,provider_session_id,mode,status,amount_minor,currency,checkout_url,created_at,updated_at) VALUES('old','a',?,'stripe','cs_old','payment','created',5000,'RON','https://checkout.stripe.com/c/pay/old',?,?)").run(orderId,old,old);
 let expired=false;const previous=globalThis.fetch;vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(url.includes('/checkout/sessions/cs_old'))return new Response(JSON.stringify({status:expired?'expired':'complete'}),{status:url.endsWith('/expire')&&!expired?400:200});return previous(input,init)});
 const pay=()=>app.request('http://localhost/api/billing/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId,provider:'stripe'})},env);
 expect((await pay()).status).toBe(409);expect(requests.some(r=>r.url.endsWith('/checkout/sessions'))).toBe(false);expired=true;expect((await pay()).status).toBe(201);expect(db.prepare("SELECT status FROM billing_checkout_sessions WHERE id='old'").get()!.status).toBe('expired');
});
