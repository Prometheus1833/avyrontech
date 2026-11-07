import {bouncerFixture,fixtureScannerSettings,malwareBucket} from "./helpers/bouncerFixture";
// @vitest-environment node
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from 'node:sqlite';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { receiptsRouter } from '../../cloudflare/workers/api/src/receipts';
import { financialTotals } from '../../cloudflare/workers/api/src/financialTotals';
import { workspaceRouter } from '../../cloudflare/workers/api/src/workspace';
import { mediaRouter } from '../../cloudflare/workers/api/src/media';
import { projectsRouter } from '../../cloudflare/workers/api/src/projects';
import { adminOperationsRouter } from '../../cloudflare/workers/api/src/adminOperations';
import { privilegedMfaSatisfied } from '../../cloudflare/workers/api/src/mfaPolicy';
import {scanUpload,putScannedObject} from '../../cloudflare/workers/api/src/malware';
import {recordPaidOrder} from '../../cloudflare/workers/api/src/billing';
const { DatabaseSync }=createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
class Statement {
  values:SQLInputValue[]=[];
  constructor(readonly db:SqliteDatabase,readonly sql:string){}
  bind(...v:SQLInputValue[]){this.values=v;return this;}
  async first(){return this.db.prepare(this.sql).get(...this.values)??null;}
  async all(){return {results:this.db.prepare(this.sql).all(...this.values)};}
  async run(){return {meta:this.db.prepare(this.sql).run(...this.values)};}
}
describe('Cloudflare workspace: actual handlers, all migrations, atomic writes',()=>{
 let db:SqliteDatabase,app:Hono,actor:string,verified:boolean,policy:string,fixtureEnv:Record<string,unknown>;
 let objects:Map<string,Uint8Array>,storageReads:number;
 let beforeBatch:(()=>void)|null;
 const stamp=Date.now();
 beforeEach(()=>{
  db=new DatabaseSync(':memory:');
  for(const file of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(`cloudflare/d1/migrations/${file}`,'utf8'));
  for(const [id,email] of [['owner','prometheus@avyron.ro'],['admin','avyrontech@gmail.com'],['staff','staff@example.test'],['client','client@example.test'],['other','other@example.test']]){
   db.prepare('INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(id,email,'fixture',['owner','admin','staff'].includes(id)?1:0,stamp,stamp);
   db.prepare('INSERT INTO user_roles VALUES (?,?)').run(id,['owner','admin'].includes(id)?'admin':id==='staff'?'staff':'user');
  }
  db.exec(`INSERT INTO clients(id,company_name,email,created_at) VALUES ('a','Client A','a@example.test',1),('b','Client B','b@example.test',1);
    INSERT INTO client_account_access VALUES ('a','client','owner',1),('b','other','owner',1);
    INSERT INTO projects(id,client_id,name,slug,owner_user_id,created_at) VALUES ('pa','a','Project A','project-a','client',1),('pb','b','Project B','project-b','other',1);
    INSERT INTO support_tickets(id,client_id,subject,created_at) VALUES ('ticket-a','a','A',1),('ticket-b','b','B',1);`);
  actor='owner';verified=false;policy='optional_until_enrollment';const bucket=malwareBucket();objects=bucket.data;storageReads=0;beforeBatch=null;bouncerFixture();
  const binding={prepare:(sql:string)=>new Statement(db,sql),batch:async(statements:Statement[])=>{
   const hook=beforeBatch;beforeBatch=null;hook?.();
   db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push({meta:db.prepare(statement.sql).run(...statement.values)});db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}
  }};
  fixtureEnv={...fixtureScannerSettings,DB:binding,FILES:bucket};
  app=new Hono();app.use('*',async(c,next)=>{
   Object.assign(c.env,{...fixtureScannerSettings,DB:binding,ADMIN_MFA_POLICY:policy,FILES:{...bucket,
     get:async(key:string)=>{storageReads++;return bucket.get(key);},
   }});
   c.set('userId',actor);c.set('roles',['owner','admin'].includes(actor)?['admin']:actor==='staff'?['staff']:['user']);c.set('mfaVerified',verified);
   await next();
  });
  app.get('/mfa-policy',async c=>c.json({allowed:await privilegedMfaSatisfied(c)}));
  app.route('/',workspaceRouter);app.route('/',projectsRouter);app.route('/',mediaRouter);app.route('/',receiptsRouter);app.route('/',adminOperationsRouter);
  app.get('/totals',async c=>c.json(await financialTotals(c.env.DB,stamp-1000,stamp+1000)));app.onError(()=>new Response('safe failure',{status:500}));
 });
 afterEach(()=>{vi.unstubAllGlobals();db.close();});
 const request=(path:string,body?:unknown,method='POST',key='test-idempotency-key-123')=>app.request(`/api/workspace/${path}`,body===undefined?{}:{method,headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)},{});
 const announcement={title:'Release',content:'Internal note',priority:'normal'};
 it.each(['stripe','revolut'] as const)('records a confirmed %s order against the real revenue schema without an invented external_reference column',async provider=>{
  const items=JSON.stringify([{sku:'website-starter',name:'Website',type:'package',quantity:1,lineTotalCents:10000}]);
  db.prepare("INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,status,created_at,updated_at) VALUES ('paid-fixture','client',?,10000,10000,'accepted',1,1)").run(items);
  const order={id:'paid-fixture',user_id:'client',items_json:items,total_cents:10000,currency:'RON',requires_manual_quote:0,status:'accepted',promotion_code:null};
  const input={provider,providerReference:'provider-reference',order};
  expect(await recordPaidOrder(fixtureEnv as never,input)).toMatchObject({replay:false});
  expect(db.prepare('SELECT status FROM commerce_orders').get()!.status).toBe('paid');
  expect(db.prepare('SELECT COUNT(*) n FROM financial_revenues').get()!.n).toBe(1);
  expect(db.prepare('SELECT status FROM billing_invoices').get()!.status).toBe('pending');
  db.exec("UPDATE financial_revenues SET client_id='a'");actor='client';expect((await (await request('invoices')).json()).data[0].order_id).toBe('paid-fixture');
  actor='other';expect((await (await request('invoices')).json()).data).toEqual([]);
  expect(await recordPaidOrder(fixtureEnv as never,input)).toMatchObject({replay:true});
  expect(db.prepare('SELECT COUNT(*) n FROM financial_revenues').get()!.n).toBe(1);
 });
 it('allows only unenrolled platform principals under the temporary policy',async()=>{
  for(const who of ['owner','admin']){actor=who;expect(await (await app.request('/mfa-policy',{},{})).json()).toEqual({allowed:true});}
  for(const who of ['staff','client']){actor=who;expect(await (await app.request('/mfa-policy',{},{})).json()).toEqual({allowed:false});}
  actor='owner';policy='required';expect(await (await app.request('/mfa-policy',{},{})).json()).toEqual({allowed:false});
  verified=true;expect(await (await app.request('/mfa-policy',{},{})).json()).toEqual({allowed:true});
 });
 it('never bypasses an enrolled factor or disabled principal',async()=>{
  db.exec(`INSERT INTO mfa_factors(id,user_id,kind,label,secret_ciphertext,status,created_at) VALUES ('factor','owner','totp','Fixture','encrypted-fixture','active',1)`);
  expect(await (await app.request('/mfa-policy',{},{})).json()).toEqual({allowed:false});
  actor='admin';db.exec("UPDATE users SET disabled_at=1 WHERE id='admin'");
  expect(await (await app.request('/mfa-policy',{},{})).json()).toEqual({allowed:false});
 });
 it('isolates client tickets and billing even when caller supplies another user id',async()=>{
  for(const [id,client] of [['ra','a'],['rb','b']])db.prepare(`INSERT INTO financial_revenues(id,client_id,revenue_type,service_name,currency,gross_amount_minor,status,created_at,updated_at) VALUES (?,?,'other','Fixture','RON',1000,'sent',1,1)`).run(id,client);
  actor='client';
  expect((await (await request('tickets?user_id=other')).json()).data.map(r=>r.id)).toEqual(['ticket-a']);
  expect((await (await request('invoices?user_id=other')).json()).data.map(r=>r.id)).toEqual(['ra']);
  expect((await request('tickets/ticket-b/messages')).status).toBe(404);
  expect((await request('tickets/ticket-b/messages',{content:'forbidden'})).status).toBe(404);
  expect((await request('account-access/other',{client_ids:['a']},'PUT')).status).toBe(403);
 });
 it('downloads only an assigned non-draft invoice and rechecks CLEAN storage and revoked account access',async()=>{
  db.exec("INSERT INTO financial_revenues(id,client_id,revenue_type,service_name,currency,gross_amount_minor,status,created_at,updated_at) VALUES ('invoice-a','a','other','Invoice','RON',1000,'sent',1,1),('invoice-b','b','other','Invoice B','RON',1000,'sent',1,1)");
  const bytes=new TextEncoder().encode('%PDF-1.7 synthetic invoice'),key='finance/revenue/invoice-a/pdf';
  const verdict=await scanUpload(fixtureEnv as never,bytes,{source:'finance',scope:'revenue:invoice-a',mimeType:'application/pdf',actorId:'owner'});
  expect(verdict.status).toBe('clean');await putScannedObject(fixtureEnv as never,'FILES',key,bytes,{httpMetadata:{contentType:'application/pdf'}},verdict);
  db.prepare("INSERT INTO financial_documents(id,revenue_id,document_type,r2_object_key,file_name,content_type,size_bytes,sha256,uploaded_by,created_at) VALUES ('file-a','invoice-a','invoice',?,'factura.pdf','application/pdf',?,'fixture','owner',1)").run(key,bytes.length);
  actor='client';const list=await (await request('invoices')).json();expect(list.data[0].download_url).toBe('/api/workspace/invoices/invoice-a/content');
  const response=await request('invoices/invoice-a/content');expect(response.status).toBe(200);expect(await response.text()).toBe('%PDF-1.7 synthetic invoice');expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect((await request('invoices/invoice-b/content')).status).toBe(404);
  db.exec("UPDATE financial_revenues SET status='draft' WHERE id='invoice-a'");expect((await request('invoices/invoice-a/content')).status).toBe(404);
  db.exec("UPDATE financial_revenues SET status='sent' WHERE id='invoice-a'; DELETE FROM malware_object_verdicts");expect((await request('invoices/invoice-a/content')).status).toBe(404);
  db.exec("DELETE FROM client_account_access WHERE user_id='client';UPDATE clients SET access_managed=1 WHERE id='a'");const reads=storageReads;expect((await request('invoices/invoice-a/content')).status).toBe(404);expect(storageReads).toBe(reads);
 });
 it('blocks legacy project enumeration and owner reassignment while preserving assigned edits',async()=>{
  actor='staff';
  expect((await (await app.request('/api/projects',{},{})).json()).data).toEqual([]);
  expect((await app.request('/api/projects/project-b',{},{})).status).toBe(403);
  db.exec("INSERT INTO project_staff(project_id,user_id,role,assigned_at) VALUES ('pa','staff','contributor',1)");
  const edit=(body:unknown)=>app.request('/api/projects/pa',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)},{});
  expect((await edit({owner_user_id:'staff'})).status).toBe(403);
  expect((await edit({url:'javascript:alert(1)'})).status).toBe(400);
  expect(db.prepare("SELECT owner_user_id FROM projects WHERE id='pa'").get()!.owner_user_id).toBe('client');
  expect((await edit({name:'Updated Project A'})).status).toBe(200);
  expect(db.prepare("SELECT name FROM projects WHERE id='pa'").get()!.name).toBe('Updated Project A');
  expect((await (await app.request('/api/projects',{},{})).json()).data.map((row:{id:string})=>row.id)).toEqual(['pa']);
 });
 it('rejects cross-project link upserts and unauthorized project creation',async()=>{
  db.exec("INSERT INTO project_staff(project_id,user_id,role,assigned_at) VALUES ('pa','staff','contributor',1);");
  db.prepare("INSERT INTO project_links(id,project_id,kind,label,url,updated_at) VALUES ('link-b','pb','other','Original','https://example.test',1)").run();
  actor='staff';
  const link=(id:string,label:string,url='https://example.test')=>app.request('/api/projects/pa/links',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,kind:'other',label,url})},{});
  expect((await link('script-link','Unsafe','javascript:alert(1)')).status).toBe(400);
  expect((await link('link-b','Hijacked')).status).toBe(403);
  expect(db.prepare("SELECT label FROM project_links WHERE id='link-b'").get()!.label).toBe('Original');
  expect((await link('link-a','Allowed')).status).toBe(200);
  expect(db.prepare("SELECT project_id FROM project_links WHERE id='link-a'").get()!.project_id).toBe('pa');
  const create=(client_id:string,owner_user_id:string)=>app.request('/api/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'New',slug:'new-'+client_id,client_id,owner_user_id})},{});
  expect((await create('b','other')).status).toBe(403);
  db.prepare("INSERT INTO client_account_access VALUES ('a','staff','staff',1)").run();
  expect((await create('a','other')).status).toBe(403);
  expect((await create('a','client')).status).toBe(201);
 });
 it('projects expose compact native summaries while staff without finance never receive budgets',async()=>{
  db.exec("UPDATE projects SET price_ron=0,price_eur=500,url='https://example.test',planned_start_at=1800000000000,planned_end_at=1801000000000 WHERE id='pa'; INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES('summary-service','pa','SEO lunar',125,'monthly'); INSERT INTO subscriptions(id,client_id,service_id,status,next_billing_date) VALUES('summary-sub','a','summary-service','active',1802000000000)");
  let body=await (await app.request('/api/projects',{},{})).json();expect(body.data.find((p:{id:string})=>p.id==='pa')).toMatchObject({client_name:'Client A',price_ron:0,price_eur:500,budget_visible:true,service_names:'SEO lunar',planned_start_at:1800000000000});
  actor='client';body=await (await app.request('/api/projects',{},{})).json();expect(body.data.map((p:{id:string})=>p.id)).toEqual(['pa']);expect(body.data[0].price_ron).toBe(0);
  actor='staff';db.exec("INSERT INTO project_staff VALUES('pa','staff','contributor',1)");body=await (await app.request('/api/projects',{},{})).json();expect(body.data[0]).toMatchObject({price_ron:null,price_eur:null,budget_visible:false,client_name:'Client A'});
  expect(body.sales).toEqual([]);db.exec("INSERT INTO project_logs(id,project_id,actor_id,action,meta_json,created_at) VALUES('budget-log','pa','owner','project.update','{\"price_ron\":1450}',1)");const logs=await (await app.request('/api/projects/pa/logs',{},{})).json();expect(logs.data[0].meta_json).toBeNull();
  const detail=await (await app.request('/api/projects/project-a',{},{})).json();expect(detail.project.price_eur).toBeNull();expect(detail.subscriptions[0]).toMatchObject({id:'summary-sub',service_name:'SEO lunar',price:null});
  db.exec("DELETE FROM project_staff WHERE project_id='pa' AND user_id='staff'");expect((await (await app.request('/api/projects?scope=mine',{},{})).json()).data).toEqual([]);
 });
 it('reports cross-beneficiary subscription drift through a read-only aggregate audit',()=>{
  const queries=readFileSync('cloudflare/d1/checks/account-integration-audit.sql','utf8').split(';').filter(q=>q.trim());
  expect(queries.slice(0,3).map(query=>db.prepare(query).get()!.issues)).toEqual([0,0,0]);
  db.exec("INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES('audit-service','pa','Serviciu',100,'monthly'); INSERT INTO subscriptions(id,client_id,service_id,status,next_billing_date) VALUES('bad-beneficiary','b','audit-service','active',1800000000000)");
  expect(db.prepare(queries[2]).get()!.issues).toBe(1);
 });
 it('does not infer finance rights from a user-only operational project grant',async()=>{
  db.exec("UPDATE projects SET price_ron=1450; INSERT INTO user_capabilities(id,user_id,capability,granted_by,reason,created_at) VALUES('operator-projects','client','projects.all','owner','Operational project access',1)");actor='client';
  const body=await (await app.request('/api/projects',{},{})).json();expect(body.data).toHaveLength(2);for(const row of body.data)expect(row).toMatchObject({price_ron:null,budget_visible:false});
 });
 it('validates a project schedule and requires an explicit financial permission for budget changes',async()=>{
  const update=(body:unknown)=>app.request('/api/projects/pa',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)},{});
  expect((await update({planned_start_at:1800000000000,planned_end_at:1801000000000})).status).toBe(200);
  expect((await update({planned_start_at:1802000000000})).status).toBe(400);expect((await update({planned_end_at:'invalid'})).status).toBe(400);expect((await update({price_ron:-1})).status).toBe(400);expect((await update({kind:'blog_profesional'})).status).toBe(200);
  actor='staff';db.exec("INSERT INTO project_staff VALUES('pa','staff','contributor',1)");expect((await update({price_ron:100})).status).toBe(403);expect((await update({planned_end_at:null})).status).toBe(200);
  expect(db.prepare("SELECT planned_start_at,planned_end_at FROM projects WHERE id='pa'").get()).toMatchObject({planned_start_at:1800000000000,planned_end_at:null});
 });
 it('scopes paid project sales to the staff assignment',async()=>{
  db.exec("INSERT INTO project_staff(project_id,user_id,role,assigned_at) VALUES ('pa','staff','contributor',1)");
  for(const [id,project] of [['ra','pa'],['rb','pb']])db.prepare("INSERT INTO financial_revenues(id,project_id,revenue_type,service_name,currency,gross_amount_minor,status,created_at,updated_at) VALUES (?,?,'other','Synthetic sale','RON',1000,'paid',1,1)").run(id,project);
  actor='staff';db.exec("INSERT INTO user_capabilities(id,user_id,capability,granted_by,reason,created_at) VALUES('finance-staff','staff','finance.read','owner','Authorized financial scope',1)");
  const staffSales=await (await app.request('/api/projects',{},{})).json();
  expect(staffSales.sales.map((row:{id:string})=>row.id)).toEqual(['ra']);
  actor='owner';
  const ownerSales=await (await app.request('/api/projects',{},{})).json();
  expect(ownerSales.sales.map((row:{id:string})=>row.id).sort()).toEqual(['ra','rb']);
 });
 it('does not grant financial access just because email matches or project is visible',async()=>{
  actor='client';db.exec("DELETE FROM client_account_access WHERE user_id='client'; UPDATE clients SET email='client@example.test' WHERE id='a'");
  expect((await (await request('clients')).json()).data).toEqual([]);
  expect((await request('tickets',{client_id:'a',subject:'No implicit link',description:'',priority:'medium'})).status).toBe(403);
 });
 it('rejects impersonated authors and staff reply flags',async()=>{
  actor='client';expect((await request('tickets/ticket-a/messages',{content:'hello',is_staff_reply:true})).status).toBe(400);
  expect((await request('tickets/ticket-a/messages',{content:'hello'})).status).toBe(200);
  const row=db.prepare('SELECT author_id,is_staff_reply FROM support_messages').get();expect(row).toMatchObject({author_id:'client',is_staff_reply:0});
 });
 it('writes and audits only once for an identical duplicate',async()=>{
  expect((await request('announcements',announcement)).status).toBe(200);
  expect((await request('announcements',announcement)).status).toBe(200);
  expect(db.prepare('SELECT COUNT(*) n FROM staff_announcements').get()!.n).toBe(1);
  expect(db.prepare("SELECT COUNT(*) n FROM security_events WHERE action='workspace.announcement.created'").get()!.n).toBe(1);
  expect((await request('announcements',{...announcement,title:'Changed'})).status).toBe(409);
 });
 it('rolls back domain and idempotency writes if audit fails',async()=>{
  db.exec(`CREATE TRIGGER fail_audit BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT,'injected audit failure'); END`);
  expect((await request('announcements',announcement)).status).toBe(500);
  expect(db.prepare('SELECT COUNT(*) n FROM staff_announcements').get()!.n).toBe(0);
  expect(db.prepare('SELECT COUNT(*) n FROM idempotency_keys').get()!.n).toBe(0);
 });
 it('rejects stale ticket revisions and replies after closure',async()=>{
  expect((await request('tickets/ticket-a',{status:'closed',revision:1},'PATCH')).status).toBe(200);
  expect((await request('tickets/ticket-a',{status:'open',revision:1},'PATCH','other-idempotency-key')).status).toBe(409);
  actor='client';expect((await request('tickets/ticket-a/messages',{content:'late'})).status).toBe(409);
 });
 it('persists delivery checklist status and rejects stale changes',async()=>{
  const body={title:'Handover',kind:'offboarding',description:null,due_at:stamp+10000,status:'open'};
  const response=await request('work-items/pa',body);expect(response.status).toBe(200);const {id}=await response.json();
  expect((await request(`work-items/pa/${id}`,{...body,status:'done',revision:1},'PATCH')).status).toBe(200);
  expect((await request(`work-items/pa/${id}`,{...body,status:'open',revision:1},'PATCH','stale-idempotency-key')).status).toBe(409);
  actor='client';expect((await request('work-items/pb')).status).toBe(404);
  expect((await request('work-items/pa',body)).status).toBe(403);
 });
 it('enforces tenant isolation on media even for an ordinary admin',async()=>{
  db.exec(`INSERT INTO organizations(id,slug,name,created_at,updated_at) VALUES ('tenant','tenant','Tenant',1,1);
    UPDATE projects SET organization_id='tenant' WHERE id='pb';
    INSERT INTO project_media(id,project_id,uploader_id,r2_key,filename,content_type,created_at) VALUES ('media','pb','other','private/file','file.pdf','application/pdf',1);
    UPDATE platform_principals SET status='suspended' WHERE email='avyrontech@gmail.com';`);
  actor='admin';
  expect((await app.request('/api/media/media/file',{},{})).status).toBe(403);
  expect((await app.request('/api/media/media',{method:'DELETE'},{})).status).toBe(403);expect(storageReads).toBe(0);
 });
 it('uploads raw chunks without content-length and serves only to linked project readers',async()=>{
  const bytes=new TextEncoder().encode('private project document');
  const body=new ReadableStream({start(controller){controller.enqueue(bytes.slice(0,8));controller.enqueue(bytes.slice(8));controller.close();}});
  const response=await app.request('/api/projects/pa/media?filename=note.txt',{method:'POST',headers:{'content-type':'text/plain'},body,duplex:'half'} as RequestInit,{});
  expect(response.status).toBe(201);const media=await response.json();expect(media.size_bytes).toBe(bytes.length);expect(objects.size).toBe(1);
  actor='client';const file=await app.request(media.url,{},{});expect(file.status).toBe(200);expect(await file.text()).toBe('private project document');expect(file.headers.get('cache-control')).toBe('private, no-store');expect(file.headers.get('content-security-policy')).toContain('sandbox');
  actor='other';expect((await app.request(media.url,{},{})).status).toBe(403);expect(storageReads).toBe(1);
 });
 it('rejects oversized chunk streams before storage and removes uploaded objects when D1 fails',async()=>{
  const oversized=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(15*1024*1024));controller.enqueue(new Uint8Array(1));controller.close();}});
  expect((await app.request('/api/projects/pa/media?filename=large.txt',{method:'POST',headers:{'content-type':'text/plain'},body:oversized,duplex:'half'} as RequestInit,{})).status).toBe(413);expect(objects.size).toBe(0);
  db.exec("CREATE TRIGGER fail_media BEFORE INSERT ON project_media BEGIN SELECT RAISE(ABORT,'injected persistence failure'); END");
  expect((await app.request('/api/projects/pa/media?filename=note.txt',{method:'POST',headers:{'content-type':'text/plain'},body:'fixture'},{})).status).toBe(500);expect(objects.size).toBe(0);expect(db.prepare('SELECT COUNT(*) n FROM project_media').get()!.n).toBe(0);
 });
 it('rejects active SVG and spoofed file types before writing to R2',async()=>{
  const upload=(filename:string,type:string,body:string)=>app.request(`/api/projects/pa/media?filename=${encodeURIComponent(filename)}`,{method:'POST',headers:{'content-type':type},body},{});
  expect((await upload('logo.svg','image/svg+xml','<svg><script>alert(1)</script></svg>')).status).toBe(415);
  expect((await upload('invoice.pdf','application/pdf','<script>not a PDF</script>')).status).toBe(415);
  expect((await upload('image.svg','image/png','not an image')).status).toBe(415);
  expect(objects.size).toBe(0);
  const pdf=await upload('document.pdf','application/pdf','%PDF-1.7 synthetic');
  expect(pdf.status).toBe(201);
  const {url}=await pdf.json();
  const served=await app.request(url,{},{});
  expect(served.headers.get('content-disposition')).toContain('attachment;');
 });
 const receipt=(body:unknown,key='receipt-test-key-123')=>app.request('/api/finance/receipts',{method:'POST',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)},{});
 it('records partial receipts separately from invoiced revenue and prevents overpayment',async()=>{
  db.prepare(`INSERT INTO financial_revenues(id,revenue_type,service_name,currency,gross_amount_minor,status,invoice_date,created_at,updated_at) VALUES ('ra','other','Invoice','RON',10000,'sent',?,?,?)`).run(stamp,stamp,stamp);
  const b={revenue_id:'ra',amount_minor:3000,amount_ron_minor:null,reference:'bank-001',paid_at:stamp};
  expect((await receipt(b)).status).toBe(200);
  expect((await receipt(b)).status).toBe(200);
  expect(db.prepare("SELECT status FROM financial_revenues WHERE id='ra'").get()!.status).toBe('partially_paid');
  expect(()=>db.exec("UPDATE financial_revenues SET status='paid' WHERE id='ra'")).toThrow('reconciled_document_state_locked');
  expect(()=>db.exec("UPDATE financial_revenues SET gross_amount_minor=3000 WHERE id='ra'")).toThrow('reconciled_document_amount_locked');
  expect(()=>db.exec("DELETE FROM financial_receipts WHERE revenue_id='ra'")).toThrow('receipt_immutable');
  expect(await (await app.request('/totals',{},{})).json()).toMatchObject({revenues:3000,invoiced:10000});
  expect((await receipt({...b,amount_minor:8000,reference:'bank-002'},'receipt-test-key-456')).status).toBe(409);
  expect((await receipt({...b,amount_minor:7000,reference:'bank-002'},'receipt-test-key-789')).status).toBe(200);
  expect(db.prepare("SELECT status FROM financial_revenues WHERE id='ra'").get()!.status).toBe('paid');
  expect(await (await app.request('/totals',{},{})).json()).toMatchObject({revenues:10000,invoiced:10000});
 });
 it('rolls back receipt and balance when financial audit fails',async()=>{
  db.exec(`INSERT INTO financial_revenues(id,revenue_type,service_name,currency,gross_amount_minor,status,created_at,updated_at) VALUES ('ra','other','Invoice','EUR',10000,'sent',1,1);
   CREATE TRIGGER fail_fin_audit BEFORE INSERT ON financial_audit_events BEGIN SELECT RAISE(ABORT,'simulated'); END;`);
  expect((await receipt({revenue_id:'ra',amount_minor:1000,amount_ron_minor:null,reference:'fx',paid_at:stamp})).status).toBe(500);
  expect(db.prepare('SELECT COUNT(*) n FROM financial_receipts').get()!.n).toBe(0);
  expect(db.prepare("SELECT status FROM financial_revenues WHERE id='ra'").get()!.status).toBe('sent');
 });
 it('does not invent conversion or count unreconciled partial invoices as cash',async()=>{
  db.exec(`INSERT INTO financial_revenues(id,revenue_type,service_name,currency,gross_amount_minor,status,created_at,updated_at) VALUES ('ra','other','Invoice','EUR',10000,'sent',1,1),('legacy','other','Unreconciled','RON',500000,'partially_paid',1,1);`);
  expect((await receipt({revenue_id:'ra',amount_minor:1000,amount_ron_minor:null,reference:'fx',paid_at:stamp})).status).toBe(200);
  expect(await (await app.request('/totals',{},{})).json()).toMatchObject({revenues:0});
  actor='client';expect((await app.request('/api/finance/receipts',{},{})).status).toBe(403);
 });
 it('isolates direct conversations and channel history',async()=>{
  expect((await request('chat',{recipient_id:'admin',channel:'general',content:'Private'})).status).toBe(200);
  expect((await request('chat',{recipient_id:null,channel:'dev',content:'Development'},'POST','chat-public-key-123')).status).toBe(200);
  actor='staff';verified=true;
  expect((await (await request('chat?recipient_id=admin')).json()).data).toEqual([]);
  expect((await (await request('chat?channel=general')).json()).data).toEqual([]);
  expect((await (await request('chat?channel=dev')).json()).data).toHaveLength(1);
 });
 it('atomically assigns client access and role and protects platform principals',async()=>{
  expect((await request('account-access/owner',{client_ids:[],access_level:'user'},'PUT')).status).toBe(409);
  expect((await request('account-access/staff',{client_ids:['a'],access_level:'staff'},'PUT')).status).toBe(200);
  expect(db.prepare("SELECT client_id FROM client_account_access WHERE user_id='staff'").get()!.client_id).toBe('a');
  db.exec(`CREATE TRIGGER fail_links BEFORE INSERT ON client_account_access BEGIN SELECT RAISE(ABORT,'simulated'); END;`);
  expect((await request('account-access/staff',{client_ids:['b'],access_level:'admin'},'PUT','access-second-key-123')).status).toBe(500);
  expect(db.prepare("SELECT role FROM user_roles WHERE user_id='staff' AND role='staff'").get()!.role).toBe('staff');
  expect(db.prepare("SELECT client_id FROM client_account_access WHERE user_id='staff'").get()!.client_id).toBe('a');
 });

 it('serializes racing duplicate messages and overpayment attempts',async()=>{
  const pair=await Promise.all([request('announcements',announcement),request('announcements',announcement)]);
  expect(pair.map(r=>r.status)).toEqual([200,200]);
  expect(db.prepare('SELECT COUNT(*) n FROM staff_announcements').get()!.n).toBe(1);
  db.exec(`INSERT INTO financial_revenues(id,revenue_type,service_name,currency,gross_amount_minor,status,created_at,updated_at) VALUES ('ra','other','Invoice','RON',10000,'sent',1,1);`);
  const b={revenue_id:'ra',amount_minor:6000,amount_ron_minor:null,reference:'race-a',paid_at:stamp};
  const payments=await Promise.all([receipt(b,'receipt-race-key-1'),receipt({...b,reference:'race-b'},'receipt-race-key-2')]);
  expect(payments.map(r=>r.status).sort()).toEqual([200,409]);
  expect(db.prepare('SELECT SUM(amount_minor) total FROM financial_receipts').get()!.total).toBe(6000);
 });
 it('serves only authorized project reports and preserves unknown metrics',async()=>{
  db.exec(`INSERT INTO project_statistics(id,project_id,period_start,period_end,visits,source,recorded_by,created_at) VALUES ('metric-a','pa',1,2,100,'Manual report','owner',2),('metric-b','pb',1,2,999,'Manual report','owner',2);`);
  actor='client';
  const response=await request('statistics');expect(response.status).toBe(200);
  const {data}=await response.json();expect(data).toHaveLength(1);expect(data[0]).toMatchObject({id:'metric-a',visits:100,uptime_percent:null});
  expect((await request('statistics/pb',{period_start:1,period_end:2,visits:1,unique_visitors:null,uptime_percent:null,avg_response_ms:null,source:'Fake'})).status).toBe(403);
 });

 const maintenance=(patch:Record<string,unknown>={})=>({projectId:'pa',planSku:null,name:'Mentenanță verificată',priceMinor:12550,specifications:{'Servicii incluse':'Actualizări și verificări aprobate','Ore incluse':'2 ore/lună'},productSlug:null,externalUrl:null,targetLabel:'Website client A',staffIds:['staff'],nextBillingDate:stamp+86400000,status:'active',...patch});
 const createMaintenance=async(patch:Record<string,unknown>={},key='maintenance-create-fixture')=>{
  const response=await request('maintenance',maintenance(patch),'POST',key);expect(response.status).toBe(200);return response.json();
 };
 it('reads real maintenance and partnership plans without exposing management options to clients',async()=>{
  const config=await (await request('maintenance/config')).json();expect(config.canManage).toBe(true);expect(config.plans.length).toBeGreaterThanOrEqual(24);expect(config.plans.some(p=>p.sku==='pro')).toBe(true);
  actor='client';const own=await (await request('maintenance/config')).json();expect(own.canManage).toBe(false);expect(own.projects.map(p=>p.id)).toEqual(['pa']);expect(own.clients).toEqual([]);expect(own.staff).toEqual([]);
 });
  it("persists the selected service and yearly catalog cycle without changing monthly plans", async () => {
    const config = await (await request("maintenance/config")).json();
    expect(config.services.some((s) => s.key === "premium-website")).toBe(true);
    expect(config.plans.find((p) => p.sku === "pro").billingCycle).toBe(
      "yearly",
    );
    const made = await createMaintenance({
      planSku: "pro",
      serviceKey: "premium-website",
      billingCycle: "yearly",
    });
    expect(
      db
        .prepare(
          "SELECT billing_cycle FROM services WHERE id=(SELECT service_id FROM subscriptions WHERE id=?)",
        )
        .get(made.id)!.billing_cycle,
    ).toBe("yearly");
    expect(
      (await (await request("maintenance")).json()).data[0].service_key,
    ).toBe("premium-website");
    expect(
      (
        await request(
          "maintenance",
          maintenance({
            projectId: "pb",
            planSku: "pro",
            billingCycle: "monthly",
          }),
          "POST",
          "bad-cycle-fixture",
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          "maintenance",
          maintenance({ serviceKey: "invented-service" }),
          "POST",
          "bad-service-fixture",
        )
      ).status,
    ).toBe(400);
  });
 it('creates one canonical monthly subscription, synchronizes its project and is idempotent',async()=>{
  const created=await createMaintenance();const replay=await createMaintenance();expect(replay.id).toBe(created.id);
  expect(db.prepare('SELECT count(*) total FROM subscriptions').get()!.total).toBe(1);expect(db.prepare('SELECT count(*) total FROM services').get()!.total).toBe(1);
  expect(db.prepare("SELECT status FROM projects WHERE id='pa'").get()!.status).toBe('maintenance');
  const service=db.prepare('SELECT * FROM services').get()!;expect(service.price).toBe(125.5);expect(service.billing_cycle).toBe('monthly');
  actor='client';const client=await (await request('subscriptions')).json();expect(client.data).toHaveLength(1);expect(client.data[0].price_cents).toBe(12550);expect(client.data[0].specifications_json).toContain('2 ore/lună');expect(client.data[0].maintenance_enabled).toBe(1);
  actor='other';expect((await (await request('maintenance')).json()).data).toHaveLength(0);
  actor='owner';expect((await request('maintenance',maintenance(),'POST','different-maintenance-key')).status).toBe(409);expect(db.prepare('SELECT count(*) total FROM services').get()!.total).toBe(1);
 });
 it('configures a legacy subscription in place and rejects stale edits without partial price changes',async()=>{
  db.exec("INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES('legacy-service','pa','Legacy',100,'yearly'); INSERT INTO subscriptions(id,client_id,service_id,next_billing_date) VALUES('legacy','a','legacy-service',1)");
  const response=await request('maintenance/legacy',maintenance({revision:1}),'PATCH','configure-legacy-fixture');expect(response.status).toBe(200);
  expect(db.prepare("SELECT service_id,revision,maintenance_enabled FROM subscriptions WHERE id='legacy'").get()).toEqual(expect.objectContaining({service_id:'legacy-service',revision:2,maintenance_enabled:1}));
  const conflict=await request('maintenance/legacy',maintenance({revision:1,priceMinor:99900}),'PATCH','stale-legacy-fixture');expect(conflict.status).toBe(409);expect(db.prepare("SELECT price FROM services WHERE id='legacy-service'").get()!.price).toBe(125.5);
 });
 it('blocks the legacy editor even when a subscription becomes Core-managed between read and write',async()=>{
  db.exec("INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES('legacy-service','pa','Legacy',100,'monthly'); INSERT INTO subscriptions(id,client_id,service_id,next_billing_date) VALUES('legacy','a','legacy-service',1)");
  const edit=()=>app.request('/api/admin/operations/subscriptions/legacy',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({serviceName:'Late edit',price:900,billingCycle:'monthly',status:'active',nextBillingDate:1})},{});
  beforeBatch=()=>db.exec("UPDATE subscriptions SET maintenance_enabled=1,revision=revision+1 WHERE id='legacy'");
  expect((await edit()).status).toBe(409);
  expect(db.prepare("SELECT price,service_name FROM services WHERE id='legacy-service'").get()).toEqual(expect.objectContaining({price:100,service_name:'Legacy'}));
  expect(db.prepare("SELECT maintenance_enabled,revision FROM subscriptions WHERE id='legacy'").get()).toEqual(expect.objectContaining({maintenance_enabled:1,revision:2}));
  expect((await edit()).status).toBe(409);
  expect(db.prepare("SELECT count(*) total FROM security_events WHERE action='subscription.update'").get()!.total).toBe(0);
 });
 it('creates an external project and subscription atomically with the real beneficiary',async()=>{
  const body=maintenance({projectId:undefined,externalProject:{clientId:'a',name:'Produs extern de test'},externalUrl:'https://product.example.test/',targetLabel:'Aplicație externă'});
  const response=await request('maintenance',body,'POST','external-maintenance-fixture');expect(response.status).toBe(200);const result=await response.json();
  expect(db.prepare('SELECT client_id,kind,status FROM projects WHERE id=?').get(result.projectId)).toEqual(expect.objectContaining({client_id:'a',kind:'external_asset',status:'maintenance'}));
  actor='client';expect((await (await request('maintenance')).json()).data.map(r=>r.id)).toContain(result.id);
  actor='other';expect((await (await request('maintenance')).json()).data).toEqual([]);
  actor='owner';const bad=await request('maintenance',maintenance({externalUrl:'javascript:alert(1)'}),'POST','bad-maintenance-url');expect(bad.status).toBe(400);
 });
 it('limits assigned staff to maintenance activities and revokes access immediately',async()=>{
  const created=await createMaintenance();actor='staff';verified=true;
  expect((await (await request('maintenance')).json()).data).toHaveLength(1);
  expect((await request('work-items/pa')).status).toBe(404);
  const work={kind:'maintenance',title:'Verificare backup',description:'Test sintetic',due_at:null,status:'open'};
  const response=await request('work-items/pa',work,'POST','staff-maintenance-task');expect(response.status).toBe(200);const item=await response.json();
  const scoped=await (await request('work-items/pa?kind=maintenance')).json();expect(scoped.canWrite).toBe(true);expect(scoped.data).toHaveLength(1);
  expect((await request('work-items/pa',{...work,kind:'task'},'POST','staff-forbidden-task')).status).toBe(403);
  expect((await request('work-items/pa/'+item.id,{...work,kind:'task',revision:1},'PATCH','staff-change-task-kind')).status).toBe(403);
  actor='owner';const update=await request('maintenance/'+created.id,maintenance({revision:1,staffIds:[]}),'PATCH','remove-maintenance-staff');expect(update.status).toBe(200);
  actor='staff';expect((await request('work-items/pa?kind=maintenance')).status).toBe(404);expect((await (await request('maintenance')).json()).data).toEqual([]);
  expect((await request('work-items/pa',work,'POST','staff-maintenance-task')).status).toBe(403);
 });
 it('rejects client plan changes, invalid staff, wrong beneficiaries and stale client grants',async()=>{
  actor='client';expect((await request('maintenance',maintenance(),'POST','client-write-maintenance')).status).toBe(403);
  actor='owner';expect((await request('maintenance',maintenance({staffIds:['client']}),'POST','invalid-maintenance-staff')).status).toBe(400);
  const created=await createMaintenance();expect((await request('maintenance/'+created.id,maintenance({projectId:'pb',revision:1}),'PATCH','wrong-maintenance-client')).status).toBe(404);
  db.exec("UPDATE projects SET owner_user_id=NULL WHERE id='pa'");actor='client';expect((await (await request('maintenance')).json()).data).toHaveLength(1);
  db.exec("DELETE FROM client_account_access WHERE user_id='client'");expect((await (await request('maintenance')).json()).data).toEqual([]);expect((await request('work-items/pa?kind=maintenance')).status).toBe(404);
 });
 it('revalidates platform authorization before replaying an idempotent maintenance response',async()=>{
  await createMaintenance();db.exec("DELETE FROM user_roles WHERE user_id='owner'");
  const response=await request('maintenance',maintenance(),'POST','maintenance-create-fixture');expect(response.status).toBe(403);expect(db.prepare('SELECT count(*) total FROM subscriptions').get()!.total).toBe(1);
 });
 it('rolls back the service, external project, assignments and idempotency reservation when auditing fails',async()=>{
  db.exec("CREATE TRIGGER reject_maintenance_audit BEFORE INSERT ON security_events WHEN NEW.action='maintenance.created' BEGIN SELECT RAISE(ABORT,'fixture_audit_failure'); END");
  const response=await request('maintenance',maintenance({projectId:undefined,externalProject:{clientId:'a',name:'Rollback asset'}}),'POST','rollback-maintenance-create');expect(response.status).toBe(500);
  expect(db.prepare('SELECT count(*) total FROM services').get()!.total).toBe(0);expect(db.prepare("SELECT count(*) total FROM projects WHERE kind='external_asset'").get()!.total).toBe(0);expect(db.prepare('SELECT count(*) total FROM subscription_staff').get()!.total).toBe(0);expect(db.prepare("SELECT count(*) total FROM idempotency_keys WHERE idempotency_key='rollback-maintenance-create'").get()!.total).toBe(0);
 });
 it('accepts a mapped legal-entity grant without exposing a different tenant or retaining a revoked grant',async()=>{
  db.exec("INSERT INTO organizations(id,slug,name,created_at,updated_at) VALUES('org-a','org-a','Org A',1,1),('org-b','org-b','Org B',1,1); INSERT INTO client_organizations(client_id,organization_id,linked_at) VALUES('a','org-a',1); UPDATE projects SET organization_id='org-a',owner_user_id=NULL WHERE id='pa'");
  await createMaintenance();actor='client';expect((await (await request('maintenance')).json()).data).toHaveLength(1);expect((await request('work-items/pa?kind=maintenance')).status).toBe(200);
  db.exec("UPDATE projects SET organization_id='org-b' WHERE id='pa'");expect((await (await request('maintenance')).json()).data).toEqual([]);expect((await request('work-items/pa?kind=maintenance')).status).toBe(404);
 });

 it('associates catalog products with distinct beneficiaries without changing the product catalog',async()=>{
  const product=db.prepare("SELECT slug,price_ron_cents FROM product_items WHERE status='live' LIMIT 1").get()!;
  const a=await createMaintenance({productSlug:product.slug,targetLabel:'Produs client A'},'product-maintenance-a');
  const b=await createMaintenance({projectId:'pb',productSlug:product.slug,targetLabel:'Produs client B'},'product-maintenance-b');
  expect(a.id).not.toBe(b.id);expect(db.prepare('SELECT price_ron_cents FROM product_items WHERE slug=?').get(product.slug)!.price_ron_cents).toBe(product.price_ron_cents);
  actor='client';const own=await (await request('maintenance')).json();expect(own.data).toHaveLength(1);expect(own.data[0].id).toBe(a.id);expect(own.data[0].product_slug).toBe(product.slug);
 });

});
