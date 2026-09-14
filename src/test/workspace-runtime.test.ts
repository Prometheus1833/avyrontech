// @vitest-environment node
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from 'node:sqlite';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { receiptsRouter } from '../../cloudflare/workers/api/src/receipts';
import { financialTotals } from '../../cloudflare/workers/api/src/financialTotals';
import { workspaceRouter } from '../../cloudflare/workers/api/src/workspace';
import { mediaRouter } from '../../cloudflare/workers/api/src/media';
import { privilegedMfaSatisfied } from '../../cloudflare/workers/api/src/mfaPolicy';
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
 let db:SqliteDatabase,app:Hono,actor:string,verified:boolean,policy:string;
 let objects:Map<string,Uint8Array>,storageReads:number;
 const stamp=Date.now();
 beforeEach(()=>{
  db=new DatabaseSync(':memory:');
  for(const file of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(`cloudflare/d1/migrations/${file}`,'utf8'));
  for(const [id,email] of [['owner','prometheus@avyron.ro'],['admin','avyrontech@gmail.com'],['staff','staff@example.test'],['client','client@example.test'],['other','other@example.test']]){
   db.prepare('INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)').run(id,email,'fixture',stamp,stamp);
   db.prepare('INSERT INTO user_roles VALUES (?,?)').run(id,['owner','admin'].includes(id)?'admin':id==='staff'?'staff':'user');
  }
  db.exec(`INSERT INTO clients(id,company_name,email,created_at) VALUES ('a','Client A','a@example.test',1),('b','Client B','b@example.test',1);
    INSERT INTO client_account_access VALUES ('a','client','owner',1),('b','other','owner',1);
    INSERT INTO projects(id,client_id,name,slug,owner_user_id,created_at) VALUES ('pa','a','Project A','project-a','client',1),('pb','b','Project B','project-b','other',1);
    INSERT INTO support_tickets(id,client_id,subject,created_at) VALUES ('ticket-a','a','A',1),('ticket-b','b','B',1);`);
  actor='owner';verified=false;policy='optional_until_enrollment';objects=new Map();storageReads=0;
  const binding={prepare:(sql:string)=>new Statement(db,sql),batch:async(statements:Statement[])=>{
   db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push({meta:db.prepare(statement.sql).run(...statement.values)});db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}
  }};
  app=new Hono();app.use('*',async(c,next)=>{
   Object.assign(c.env,{DB:binding,ADMIN_MFA_POLICY:policy,FILES:{
     put:async(key:string,bytes:Uint8Array)=>{objects.set(key,bytes);return {size:bytes.byteLength};},
     delete:async(key:string)=>{objects.delete(key);},
     get:async(key:string)=>{storageReads++;const bytes=objects.get(key);return bytes?{body:bytes,size:bytes.byteLength,httpEtag:'"fixture-etag"',writeHttpMetadata:()=>{}}:null;},
   }});
   c.set('userId',actor);c.set('roles',['owner','admin'].includes(actor)?['admin']:actor==='staff'?['staff']:['user']);c.set('mfaVerified',verified);
   await next();
  });
  app.get('/mfa-policy',async c=>c.json({allowed:await privilegedMfaSatisfied(c)}));
  app.route('/',workspaceRouter);app.route('/',mediaRouter);app.route('/',receiptsRouter);
  app.get('/totals',async c=>c.json(await financialTotals(c.env.DB,stamp-1000,stamp+1000)));app.onError(()=>new Response('safe failure',{status:500}));
 });
 afterEach(()=>db.close());
 const request=(path:string,body?:unknown,method='POST',key='test-idempotency-key-123')=>app.request(`/api/workspace/${path}`,body===undefined?{}:{method,headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)},{});
 const announcement={title:'Release',content:'Internal note',priority:'normal'};
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

});
