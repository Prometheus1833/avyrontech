// @vitest-environment node
import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {Hono} from 'hono';
import {syncBillingReferences} from '../../cloudflare/workers/api/src/billingProviderSync';
import {billingRouter} from '../../cloudflare/workers/api/src/billing';
import type {Env,AppBindings} from '../../cloudflare/workers/api/src/types';
let db:DatabaseSync,env:Env,requests:Array<{url:string;method:string}>,different:boolean;
class Statement{
 values:SQLInputValue[]=[];
 constructor(readonly sql:string){}
 bind(...values:SQLInputValue[]){this.values=values;return this}
 async first(){return db.prepare(this.sql).get(...this.values)||null}
 async all(){return {results:db.prepare(this.sql).all(...this.values)}}
 async run(){return {meta:db.prepare(this.sql).run(...this.values)}}
}
beforeEach(()=>{
 db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 for(const f of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('cloudflare/d1/migrations/'+f,'utf8'));
 db.exec("INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES('owner','owner@example.test','synthetic',1,1,1); INSERT INTO financial_provider_connections(id,provider,status,created_at,updated_at) VALUES('stripe','stripe','connected',1,1)");
 env={DB:{prepare:(s:string)=>new Statement(s),batch:async(statements:Statement[])=>{db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}},STRIPE_SECRET_KEY:'sk_test_synthetic',STRIPE_WEBHOOK_SECRET:'whsec_synthetic',STRIPE_ACCOUNT_ID:'acct_avyron',MFA_AUTH_ENABLED:'false'} as unknown as Env;
 requests=[];different=false;
 vi.stubGlobal('fetch',vi.fn(async(input:string|URL,init?:RequestInit)=>{
  const url=String(input);requests.push({url,method:init?.method||'GET'});
  if(url.endsWith('/account'))return Response.json({id:'acct_avyron',charges_enabled:true});
  const id=decodeURIComponent(url.split('/').at(-1)!);
  return Response.json({id,customer:'cus_owner',metadata:{order_id: id.replace('cs_','o_'),user_id:'owner'},client_reference_id:id.replace('cs_','o_'),amount_total:different?1:1000,currency:'ron',status:'complete',payment_status:'paid'});
 }));
});
afterEach(()=>{db.close();vi.unstubAllGlobals()});
function seed(n:number){
 db.exec("INSERT INTO billing_customers(id,user_id,provider,provider_customer_id,created_at,updated_at) VALUES('customer','owner','stripe','cus_owner',1,1)");
 for(let i=0;i<n;i++){
  const key=String(i).padStart(3,'0');
  db.prepare("INSERT INTO commerce_orders(id,user_id,status,currency,subtotal_cents,discount_cents,total_cents,items_json,created_at,updated_at) VALUES(?,'owner','paid','RON',1000,0,1000,'[]',1,1)").run('o_'+key);
  db.prepare("INSERT INTO billing_checkout_sessions(id,user_id,order_id,provider,provider_session_id,mode,status,amount_minor,currency,created_at,updated_at) VALUES(?,'owner',?,'stripe',?,'payment','paid',1000,'RON',1,1)").run('s_'+key,'o_'+key,'cs_'+key);
 }
}
it('truthfully completes an empty native scope without importing other businesses or claiming transactions',async()=>{
 const result=await syncBillingReferences(env,'stripe','owner');expect(result).toMatchObject({state:{status:'complete',checked:0,matched:0},moneyActions:false,scope:'native_avyron_references'});
 expect(db.prepare("SELECT last_sync_at FROM financial_provider_connections").get()!.last_sync_at).toBeTypeOf('number');
 expect(requests.map(r=>r.url)).toEqual(['https://api.stripe.com/v1/account']);
});
it('pages native references, persists its cursor and audits only completed matching batches',async()=>{
 seed(7);
 expect(await syncBillingReferences(env,'stripe','owner')).toMatchObject({state:{status:'running',checked:5,matched:5}});
 expect(db.prepare('SELECT last_sync_at FROM financial_provider_connections').get()!.last_sync_at).toBeNull();
 expect(await syncBillingReferences(env,'stripe','owner')).toMatchObject({state:{status:'complete',checked:7,matched:7}});
 expect(requests.filter(r=>r.url.includes('/checkout/sessions/'))).toHaveLength(7);
 expect(requests.every(r=>r.method==='GET')).toBe(true);
 expect(db.prepare("SELECT count(*) n FROM financial_audit_events WHERE action='billing.references.sync'").get()!.n).toBe(2);
 expect(db.prepare('SELECT count(*) n FROM billing_invoices').get()!.n).toBe(0);
});
it('reports contract differences without overwriting local payment facts or claiming synchronization',async()=>{
 seed(1);different=true;
 expect(await syncBillingReferences(env,'stripe','owner')).toMatchObject({state:{status:'differences',checked:1,matched:0,issueCount:1,issues:[{id:'s_000',code:'checkout_contract_mismatch'}]}});
 expect(db.prepare('SELECT last_sync_at FROM financial_provider_connections').get()!.last_sync_at).toBeNull();
 expect(db.prepare('SELECT amount_minor,status FROM billing_checkout_sessions').get()).toMatchObject({amount_minor:1000,status:'paid'});
});
it('locks retries and refuses unverified connections before any external call',async()=>{
 const results=await Promise.all([syncBillingReferences(env,'stripe','owner'),syncBillingReferences(env,'stripe','owner')]);
 expect(results.filter(r=>'error'in r&&r.error==='sync_in_progress')).toHaveLength(1);
 db.exec("UPDATE financial_provider_connections SET status='error'");requests=[];
 expect(await syncBillingReferences(env,'stripe','owner')).toEqual({error:'verified_connection_required'});expect(requests).toHaveLength(0);
});
it('enforces platform privileges in the actual router, independently of dashboard buttons',async()=>{
 const app=new Hono<AppBindings>();app.use('*',async(c,next)=>{c.set('roles',['admin']);c.set('userId','owner');await next()});app.route('/',billingRouter);
 const r=await app.request('http://localhost/api/billing/admin/connections/stripe/sync',{method:'POST'},env);
 expect(r.status).toBe(403);expect(requests).toHaveLength(0);
});

it('refuses a different Stripe account and persists its verification error without reading any customer resources',async()=>{
 seed(1);const fetcher=vi.fn(async()=>Response.json({id:'acct_other_business',charges_enabled:true}));vi.stubGlobal('fetch',fetcher);
 expect(await syncBillingReferences(env,'stripe','owner')).toEqual({error:'stripe_account_mismatch'});expect(fetcher).toHaveBeenCalledTimes(1);
 expect(db.prepare('SELECT status,last_error_code,last_sync_at FROM financial_provider_connections').get()).toMatchObject({status:'error',last_error_code:'stripe_account_mismatch',last_sync_at:null});
});
it('checks native subscription pricing and reports changed provider terms without editing them',async()=>{
 seed(1);db.exec("INSERT INTO billing_subscriptions(id,user_id,order_id,provider,provider_subscription_id,sku,status,period,amount_minor,currency,created_at,updated_at) VALUES('sub','owner','o_000','stripe','sub_own','SYNTHETIC','active','monthly',1000,'RON',1,1)");
 let amount=1000,intervalCount=1;const original=globalThis.fetch;
 vi.stubGlobal('fetch',vi.fn(async(input:string|URL,init?:RequestInit)=>String(input).endsWith('/subscriptions/sub_own')?Response.json({id:'sub_own',customer:'cus_owner',metadata:{order_id:'o_000'},status:'active',items:{data:[{quantity:1,price:{unit_amount:amount,currency:'ron',recurring:{interval:'month',interval_count:intervalCount}}}]}}):original(input,init)));
 expect(await syncBillingReferences(env,'stripe','owner')).toMatchObject({state:{status:'complete',checked:2,matched:2}});
 amount=999;expect(await syncBillingReferences(env,'stripe','owner')).toMatchObject({state:{status:'differences',checked:2,matched:1,issues:[{id:'sub',code:'subscription_requires_reconciliation'}]}});
 amount=1000;intervalCount=2;expect(await syncBillingReferences(env,'stripe','owner')).toMatchObject({state:{status:'differences',checked:2,matched:1}});
 expect(db.prepare('SELECT amount_minor FROM billing_subscriptions').get()!.amount_minor).toBe(1000);
});
it('reads only an already-issued Oblio invoice in the configured series and never issues a document',async()=>{
 seed(1);db.exec("INSERT INTO financial_provider_connections(id,provider,status,created_at,updated_at) VALUES('oblio','oblio','connected',1,1); INSERT INTO billing_invoices(id,user_id,order_id,provider,series,number,status,total_minor,currency,created_at,updated_at) VALUES('invoice','owner','o_000','oblio','AVY','0001','issued',1000,'RON',1,1)");
 Object.assign(env,{OBLIO_CLIENT_ID:'synthetic@example.test',OBLIO_CLIENT_SECRET:'synthetic',OBLIO_CIF:'SYNTHETIC-CUI',OBLIO_SERIES:'AVY'});
 const calls:Array<{url:string;method:string}>=[];
 vi.stubGlobal('fetch',vi.fn(async(input:string|URL,init?:RequestInit)=>{const url=String(input);calls.push({url,method:init?.method||'GET'});return Response.json(url.endsWith('/authorize/token')?{access_token:'synthetic_token'}:url.includes('/nomenclature/series')?{data:[{type:'Factura',name:'AVY',start:'0001',next:'0002'}]}:{status:200,data:{documentType:'Factura',seriesName:'AVY',number:'1'}})}));
 expect(await syncBillingReferences(env,'oblio','owner')).toMatchObject({state:{status:'complete',checked:1,matched:1},moneyActions:false});
 expect(calls.filter(c=>c.url.includes('/docs/invoice'))).toEqual([{url:'https://www.oblio.eu/api/docs/invoice?cif=SYNTHETIC-CUI&seriesName=AVY&number=0001',method:'GET'}]);
});
it('compares Revolut order identity, amount and completion using the native AVYRON order reference',async()=>{
 seed(1);db.exec("INSERT INTO financial_provider_connections(id,provider,status,created_at,updated_at) VALUES('rev','revolut_merchant','connected',1,1); UPDATE billing_checkout_sessions SET provider='revolut'; UPDATE billing_customers SET provider='revolut'");
 Object.assign(env,{REVOLUT_MERCHANT_SECRET_KEY:'synthetic',REVOLUT_MERCHANT_WEBHOOK_SECRET:'synthetic_signing'});
 let remoteAmount=1000;vi.stubGlobal('fetch',vi.fn(async(input:string|URL)=>Response.json(String(input).endsWith('/webhooks')?{webhooks:[{url:'https://avyron.ro/api/billing/webhooks/revolut',events:['ORDER_COMPLETED']}]}:{id:'cs_000',merchant_order_ext_ref:'o_000',amount:remoteAmount,currency:'RON',state:'completed'})));
 expect(await syncBillingReferences(env,'revolut_merchant','owner')).toMatchObject({state:{status:'complete',checked:1,matched:1},moneyActions:false});
 db.exec("UPDATE billing_checkout_sessions SET mode='subscription'");remoteAmount=0;
 expect(await syncBillingReferences(env,'revolut_merchant','owner')).toMatchObject({state:{status:'differences',checked:1,matched:0,issues:[{code:'checkout_contract_mismatch'}]}});
});
