// @vitest-environment node
import {createRequire} from 'node:module';
import {readdirSync,readFileSync} from 'node:fs';
import type {DatabaseSync as SqliteDatabase,SQLInputValue} from 'node:sqlite';
import {Hono} from 'hono';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {commandIntent} from '../shared/commandIntent';
import {inspectAccessibility} from '../../cloudflare/workers/api/src/centerCommands';
import {centersRouter,communityRouter} from '../../cloudflare/workers/api/src/osCenters';
import {dashboardRouter} from '../../cloudflare/workers/api/src/osDashboard';
import {centers,defaultReads} from '../shared/osCatalog';
import type {Env} from '../../cloudflare/workers/api/src/types';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
class Statement {
 values:SQLInputValue[]=[];constructor(readonly db:SqliteDatabase,readonly sql:string){}
 bind(...v:SQLInputValue[]){this.values=v;return this;}
 async first(){return this.db.prepare(this.sql).get(...this.values)??null;}
 async all(){return {results:this.db.prepare(this.sql).all(...this.values)};}
 async run(){return {meta:this.db.prepare(this.sql).run(...this.values)};}
}
describe('OS centers: real routes and all D1 migrations',()=>{
 let db:SqliteDatabase,app:Hono,actor:string,env:Env,kv:Map<string,string>,files:Map<string,Uint8Array>;
 beforeEach(()=>{
  db=new DatabaseSync(':memory:');for(const p of readdirSync('cloudflare/d1/migrations').filter(p=>p.endsWith('.sql')).sort())db.exec(readFileSync(`cloudflare/d1/migrations/${p}`,'utf8'));
  for(const [id,email,role] of [['owner','prometheus@avyron.ro','admin'],['staff','staff@example.test','staff'],['client','client@example.test','user']]){db.prepare('INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,1,1)').run(id,email,'fixture');db.prepare('INSERT INTO user_roles VALUES (?,?)').run(id,role);}
  db.exec("INSERT INTO clients(id,company_name,email,created_at) VALUES ('c','Client One','c@example.test',1);INSERT INTO projects(id,client_id,name,slug,created_at) VALUES ('p','c','Project','project',1)");
  actor='owner';kv=new Map();files=new Map();env={DB:{prepare:(sql:string)=>new Statement(db,sql),batch:async(statements:Statement[])=>{db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}},KV:{get:async(k:string)=>kv.get(k)||null,put:async(k:string,v:string)=>{kv.set(k,v);},delete:async(k:string)=>{kv.delete(k);}},FILES:{list:async()=>({objects:[]}),put:async(k:string,v:Uint8Array)=>{files.set(k,v);},delete:async(k:string)=>{files.delete(k);},get:async(k:string)=>files.has(k)?{body:files.get(k)}:null},MEDIA:{list:async()=>({objects:[]})},MFA_ENCRYPTION_KEY:'fixture-key-not-real-at-least-thirty-two',ADMIN_MFA_POLICY:'optional_until_enrollment'} as unknown as Env;
  app=new Hono();app.use('*',async(c,next)=>{Object.assign(c.env,env);c.set('userId',actor);c.set('roles',actor==='owner'?['admin']:actor==='staff'?['staff']:['user']);await next();});app.route('/',centersRouter);app.route('/',communityRouter);app.route('/',dashboardRouter);app.onError(e=>{console.error(e);return new Response('safe failure',{status:500});});
 });
 afterEach(()=>{db.close();vi.restoreAllMocks();});
 const req=(path:string,body?:unknown,method='POST',key=crypto.randomUUID())=>app.request(`/api/centers/${path}`,body===undefined?{}:{method,headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)},env);
 const record=(kind:string,data:Record<string,unknown>)=>({title:`Fixture ${kind}`,description:'Evidence',status:kind==='newsletter'?'pending':'active',client_id:null,project_id:null,assignee_id:null,due_at:Date.now()+86400000,data});
 const domain=()=>record('domains',{domain:'example.test',dns:'Verified nameservers',ssl_expires_at:null,redirect:'',estimated_value_minor:null,opportunity:''});
 it('serves all report SQL against the full schema',async()=>{
  for(const center of ['infrastructure','security','errors','runs','approvals','plugins','documents','visits','privacy','profitability','deliverables','onboarding','offboarding'])expect((await req(`report/${center}`)).status,center).toBe(200);
  expect((await (await req('catalog')).json()).modules).toHaveLength(centers.length);
 });
 it('isolates clients, owner-only centers and denied writes',async()=>{
  actor='client';expect((await req('catalog')).status).toBe(403);actor='staff';expect((await req('report/security')).status).toBe(403);expect((await req('records/domains',domain())).status).toBe(403);expect((await req('team/staff',{department:'finance'} ,'PUT')).status).toBe(403);
 });
 const grant=(read:string[],write:string[]=[])=>req('team/staff',{department:'developer',job_title:'Engineer',read,write,revision:0},'PUT');
 it('enforces live grants and prevents owner-capability escalation',async()=>{
  expect((await grant(['security'],['security'])).status).toBe(400);expect((await grant(['domains'],['sla'])).status).toBe(400);
  expect((await grant(['domains'])).status).toBe(200);actor='staff';expect((await req('records/domains')).status).toBe(200);expect((await req('records/domains',domain())).status).toBe(403);
  actor='owner';expect((await req('team/staff',{department:'developer',job_title:'Engineer',read:['domains'],write:['domains'],revision:1},'PUT')).status).toBe(200);actor='staff';expect((await req('records/domains',domain())).status).toBe(200);
  db.exec("UPDATE staff_dashboard_access SET read_json='[]',write_json='[]'");expect((await req('records/domains')).status).toBe(403);
 });
 it('deduplicates creates, detects body changes and rejects stale edits',async()=>{
  const key='fixture-create-domain';const first=await req('records/domains',domain(),'POST',key);const {id}=await first.json();expect(first.status).toBe(200);
  // The persisted request body is exact: use a stable due date for replay.
  const stable={...domain(),due_at:42};const key2='fixture-create-stable';await req('records/domains',stable,'POST',key2);expect((await req('records/domains',stable,'POST',key2)).status).toBe(200);expect((await req('records/domains',{...stable,title:'changed'},'POST',key2)).status).toBe(409);
  expect((await req(`records/domains/${id}`,{...stable,revision:1},'PATCH')).status).toBe(200);expect((await req(`records/domains/${id}`,{...stable,revision:1},'PATCH')).status).toBe(409);
  expect((await req('records/domains?offset=-1')).status).toBe(400);
 });
 it('rolls back writes if audit insertion fails',async()=>{
  db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT,'injected-audit-failure'); END");
  expect((await req('records/domains',domain())).status).toBe(500);expect(db.prepare('SELECT COUNT(*) n FROM os_center_records').get()!.n).toBe(0);
 });
 it('keeps newsletter consent history and rejects subscription without evidence',async()=>{
  const pending=record('newsletter',{email:'subscriber@example.test',consent_evidence:'',policy_version:'',source:'manual'});
  expect((await req('records/newsletter',{...pending,status:'subscribed'})).status).toBe(400);
  const {id}=await (await req('records/newsletter',pending)).json();const subscribed={...pending,status:'subscribed',data:{...pending.data,consent_evidence:'Signed request',policy_version:'v1'},revision:1};
  expect((await req(`records/newsletter/${id}`,subscribed,'PATCH')).status).toBe(200);expect((await req(`records/newsletter/${id}`,{...subscribed,status:'unsubscribed',revision:2},'PATCH')).status).toBe(200);
  expect(db.prepare('SELECT action FROM newsletter_consent_events ORDER BY created_at').all().map(r=>r.action)).toEqual(['pending','subscribed','unsubscribed']);
 });
 it('encrypts secrets, never lists them and audits explicit reveal',async()=>{
  const {id}=await (await req('records/vault',record('vault',{asset_type:'credential',location:'',owner:'Owner'}))).json();
  expect((await req(`vault/${id}/secret`,{secret:'fixture-secret-value',revision:1})).status).toBe(200);
  expect([...kv.values()].join('')).not.toContain('fixture-secret-value');expect(await (await req('records/vault')).text()).not.toContain('fixture-secret-value');
  expect((await req(`vault/${id}/reveal`,{reason:'Review access'})).status).toBe(200);expect(db.prepare("SELECT COUNT(*) n FROM security_events WHERE action='vault.secret.revealed'").get()!.n).toBe(1);
  actor='staff';expect((await req(`vault/${id}/reveal`,{reason:'Review access'})).status).toBe(403);
 });
 it('requires current revision for concurrent vault rotations',async()=>{
  const {id}=await (await req('records/vault',record('vault',{asset_type:'credential',location:'',owner:''}))).json();
  await req(`vault/${id}/secret`,{secret:'first',revision:1});expect((await req(`vault/${id}/secret`,{secret:'stale',revision:1})).status).toBe(409);expect(kv.size).toBe(1);
 });
 it('ingests comments as pending, validates page paths and moderates exact revisions',async()=>{
  actor='client';const submit=(path:string)=>app.request('/api/community/comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path,content:'<script>alert(1)</script> kept as text'})},env);
  expect((await submit('//evil.test')).status).toBe(400);const response=await submit('/blog/fixture');expect(response.status).toBe(201);const {id}=await response.json();actor='owner';
  expect((await req(`comments/${id}`,{status:'approved',revision:1},'PATCH')).status).toBe(200);expect((await req(`comments/${id}`,{status:'spam',revision:1},'PATCH')).status).toBe(409);
  expect((await (await req('comments?status=approved')).json()).data).toHaveLength(1);
 });
 it('applies checklists idempotently and rejects unassigned project access',async()=>{
  const body={project_id:'p',kind:'onboarding',due_at:null};expect((await req('checklists',body)).status).toBe(200);await req('checklists',body);expect(db.prepare('SELECT COUNT(*) n FROM project_work_items').get()!.n).toBe(5);
  db.exec("INSERT INTO organizations(id,name,slug,created_at,updated_at) VALUES ('org','Tenant','tenant',1,1);UPDATE projects SET organization_id='org' WHERE id='p'");await grant(['onboarding'],['onboarding']);actor='staff';expect((await req('checklists',body)).status).toBe(403);expect((await (await req('report/onboarding')).json()).data).toEqual([]);
 });
 it('aggregates domains, SLA, contracts and real invoices into priorities and briefing',async()=>{
  await req('records/domains',{...domain(),due_at:Date.now()-1000});
  db.prepare("INSERT INTO operation_records(id,kind,title,due_at,created_by,created_at,updated_at) VALUES ('contract','contract','Renewal',?,'owner',1,1)").run(Date.now()+1000);
  db.prepare("INSERT INTO financial_revenues(id,revenue_type,service_name,status,currency,gross_amount_minor,due_date,created_at,updated_at) VALUES ('rev','hosting','Hosting','sent','RON',10000,?,1,1)").run(Date.now()-1000);
  const response=await app.request('/api/os/overview',{},env);expect(response.status).toBe(200);const data=await response.json();expect(data.attention.some(r=>r.center==='domains')).toBe(true);expect(data.attention.some(r=>r.center==='contracts')).toBe(true);expect(data.attention.some(r=>r.id==='facturi-restante')).toBe(true);
  await req('briefing',{enabled:false,lookahead_days:3,include_finance:false},'PUT');expect((await (await app.request('/api/os/overview',{},env)).json()).briefing).toBe('');
 });
 it('keeps unknown costs and different currencies out of fabricated margins',async()=>{
  db.exec("INSERT INTO financial_revenues(id,revenue_type,client_id,service_name,status,currency,gross_amount_minor,created_at,updated_at) VALUES ('r','hosting','c','Hosting','sent','EUR',10000,1,1)");
  const data=await (await req('report/profitability')).json();expect(data.data[0]).toMatchObject({currency:'EUR',revenue:10000,cost:null,margin:null});
 });
 it('expires health observations and never marks unprobed services green',async()=>{
  db.exec("INSERT INTO os_health_observations VALUES ('api','ok','Successful',1,'fixture'),('d1','error','Failed',1,'fixture')");const data=await (await req('report/infrastructure')).json();expect(data.data.find(r=>r.service==='api').status).toBe('warning');expect(data.data.find(r=>r.service==='email').status).toBe('unknown');expect(data.data.find(r=>r.service==='d1').status).toBe('error');
 });
 it('invalidates approval after editing its executable intent',async()=>{
  const version=db.prepare('SELECT id,agent_slug FROM ai_agent_versions LIMIT 1').get()!,t=Date.now();
  db.prepare("INSERT INTO ai_runs(id,agent_slug,agent_version_id,status,input_hash,created_at) VALUES ('r',?,?,'awaiting_approval','fixture',?)").run(version.agent_slug,version.id,t);
  db.prepare("INSERT INTO ai_run_steps(id,run_id,sequence,kind,name,status,created_at) VALUES ('s','r',0,'tool','fixture','awaiting_approval',?)").run(t);
  db.prepare("INSERT INTO ai_approvals(id,run_id,step_id,action_class,summary,request_json,requested_at,expires_at) VALUES ('a','r','s','write','Old','{}',?,?)").run(t,t+60000);
  expect((await req('approvals/a',{summary:'New',request:{content:'Revised'},revision:1},'PATCH')).status).toBe(200);
  expect(db.prepare("SELECT revision,status FROM ai_approvals WHERE id='a'").get()).toMatchObject({revision:2,status:'pending'});
  expect(db.prepare("SELECT input_json FROM ai_run_steps WHERE id='s'").get()!.input_json).toBe('{"content":"Revised"}');
  expect((await req('approvals/a',{summary:'stale',request:{},revision:1},'PATCH')).status).toBe(409);
 });
 it('defines distinct professional defaults without privileged control',()=>{
  expect(defaultReads('sales')).toContain('onboarding');expect(defaultReads('developer')).toContain('infrastructure');expect(defaultReads('marketing')).toContain('newsletter');expect(defaultReads('finance')).toContain('profitability');for(const role of ['sales','developer','marketing','finance'] as const)expect(defaultReads(role)).not.toContain('security');
 });
 const document=(overrides:Record<string,unknown>={})=>({title:'Contract mentenanță',category:'contract',content_text:'Mentenanța include backup zilnic și suport tehnic.',client_id:'c',project_id:'p',status:'approved',review_after:null,...overrides});
 const saveDoc=async(overrides:Record<string,unknown>={})=>(await (await req('documents',document(overrides))).json()).id as string;
 const aiBudget=()=>db.exec("INSERT INTO financial_agent_provider_policies(agent_slug,vendor_id,status,created_at,updated_at) VALUES ('knowledge-auditor','fin_vendor_cloudflare_ai','active',1,1); UPDATE financial_provider_quotas SET quota_total=1000000,quota_used=0,status='active' WHERE vendor_id='fin_vendor_cloudflare_ai'");
 it('persists categorized documents, searches accents, isolates clients and rejects stale edits',async()=>{
  const id=await saveDoc();await saveDoc({title:'Alt document',client_id:null,project_id:null});
  const result=await (await req('documents?search=mentenanta&client=c&category=contract')).json();expect(result.total).toBe(1);expect(result.data[0].id).toBe(id);
  expect((await req(`documents/${id}`,document({revision:1,title:'Nou'}),'PATCH')).status).toBe(200);
  expect((await req(`documents/${id}`,document({revision:1}),'PATCH')).status).toBe(409);
  actor='staff';expect((await req('documents')).status).toBe(403);expect((await req('documents/ai',{mode:'audit',query:'',client_id:null})).status).toBe(403);
 });
 it('audits document mutations atomically and replays idempotency without duplicates',async()=>{
  const key=crypto.randomUUID();const a=await (await req('documents',document(),'POST',key)).json();const b=await (await req('documents',document(),'POST',key)).json();expect(a).toEqual(b);
  expect(db.prepare('SELECT count(*) n FROM hub_documents').get()!.n).toBe(1);
  db.exec("CREATE TRIGGER block_document_audit BEFORE INSERT ON security_events WHEN NEW.action='document.saved' BEGIN SELECT RAISE(ABORT,'fixture blocked'); END");
  expect((await req('documents',document())).status).toBe(500);expect(db.prepare('SELECT count(*) n FROM hub_documents').get()!.n).toBe(1);
 });
 it('stores files privately, resets approval and checks revision and download authorization',async()=>{
  const id=await saveDoc();const form=new FormData();form.set('file',new File(['%PDF-fixture'],'contract.pdf',{type:'application/pdf'}));form.set('revision','1');
  const upload=()=>app.request(`/api/centers/documents/${id}/file`,{method:'POST',headers:{'idempotency-key':crypto.randomUUID()},body:form},env);
  expect((await upload()).status).toBe(200);expect(files.size).toBe(1);
  expect(db.prepare('SELECT status,revision FROM hub_documents WHERE id=?').get(id)).toMatchObject({status:'draft',revision:2});
  expect((await upload()).status).toBe(409);const download=await req(`documents/${id}/file`);expect(await download.text()).toBe('%PDF-fixture');expect(download.headers.get('content-disposition')).toContain('attachment');
  expect((await (await req('documents')).json()).data[0]).not.toHaveProperty('r2_key');actor='staff';expect((await req(`documents/${id}/file`)).status).toBe(403);
 });
 it('lists overdue reviews and excludes expired and draft sources from AI search',async()=>{
  const id=await saveDoc();await saveDoc({title:'Ciornă',status:'draft'});await saveDoc({title:'Expirat',review_after:Date.now()-1000});
  expect((await (await req('documents')).json()).stale).toHaveLength(1);aiBudget();
  const model=vi.fn(async(_model:string,input:Record<string,unknown>)=>{const messages=input.messages as {content:string}[];const sources=JSON.parse(messages[1].content).sources;expect(sources).toHaveLength(1);expect(sources[0].id).toBe(id);return {response:JSON.stringify({answer:'Include backup zilnic.',citations:[{id,quote:'backup zilnic'}]})};});env.AI={run:model};
  const key=crypto.randomUUID(),body={mode:'search',query:'mentenanta backup',client_id:'c'};
  const first=await (await req('documents/ai',body,'POST',key)).json();expect(first.answer).toContain('backup');expect(first.sources[0].revision).toBe(1);
  expect(await (await req('documents/ai',body,'POST',key)).json()).toEqual(first);expect(model).toHaveBeenCalledTimes(1);
  expect(db.prepare("SELECT status FROM ai_runs WHERE id=?").get(first.run_id)!.status).toBe('succeeded');
 });
 it('fails closed on budget and kill switch without model calls',async()=>{
  await saveDoc();const model=vi.fn();env.AI={run:model};
  expect((await (await req('documents/ai',{mode:'search',query:'backup',client_id:null})).json()).error.code).toBe('agent_provider_policy_not_configured');expect(model).not.toHaveBeenCalled();
  db.exec("INSERT OR REPLACE INTO ai_kill_switches(scope_type,scope_id,enabled,reason,changed_at) VALUES ('global','*',1,'test',1)");
  expect((await req('documents/ai',{mode:'audit',query:'',client_id:null})).status).toBe(503);
 });
 it('rejects fabricated citations and persists evidence for grounded contradiction findings',async()=>{
  const a=await saveDoc(),b=await saveDoc({title:'Ofertă veche',content_text:'Mentenanța include backup lunar și suport tehnic.'});aiBudget();
  env.AI={run:async()=>({response:JSON.stringify({answer:'inventat',citations:[{id:a,quote:'conținut care nu există'}]})})};
  expect((await (await req('documents/ai',{mode:'search',query:'backup',client_id:null})).json()).error.code).toBe('document_ai_failed');
  env.AI={run:async()=>({response:JSON.stringify({findings:[{summary:'Frecvențe diferite, de revizuit.',citations:[{id:a,quote:'backup zilnic'},{id:b,quote:'backup lunar'}]}]})})};
  const result=await (await req('documents/ai',{mode:'audit',query:'',client_id:'c'})).json();expect(result.findings).toHaveLength(1);expect((await (await req('documents/audits')).json()).data).toHaveLength(1);expect(db.prepare('SELECT revision FROM hub_documents WHERE id=?').get(a)!.revision).toBe(1);
  db.prepare('UPDATE hub_documents SET client_id=NULL,project_id=NULL WHERE id=?').run(b);
  expect((await (await req('documents/ai',{mode:'audit',query:'',client_id:null})).json()).error.code).toBe('document_ai_failed');
 });
 it('returns real unpaid invoices and client dossiers with platform-role enforcement',async()=>{
  db.exec("INSERT INTO financial_revenues(id,revenue_type,client_id,service_name,status,currency,gross_amount_minor,created_at,updated_at) VALUES ('f','maintenance','c','Hosting','sent','EUR',12345,1,1)");
  expect((await (await req('commands/query?type=invoices')).json()).data[0]).toMatchObject({currency:'EUR',gross_amount_minor:12345});
  expect((await (await req('commands/query?type=client&q=Client')).json()).data).toHaveLength(1);expect((await (await req('commands/client/c')).json()).data).toHaveLength(2);
  actor='staff';expect((await req('commands/query?type=invoices')).status).toBe(403);expect((await req('commands/client/c')).status).toBe(403);
 });
 it('generates a UTC monthly report in Documents Hub without changing invoices',async()=>{
  db.prepare("INSERT INTO financial_revenues(id,revenue_type,service_name,status,currency,gross_amount_minor,invoice_date,created_at,updated_at) VALUES ('aug','maintenance','Hosting','sent','RON',10000,?,1,1)").run(Date.UTC(2026,7,1));
  const key=crypto.randomUUID(),body={month:'2026-08'};const result=await (await req('commands/report',body,'POST',key)).json();expect(result.text).toContain('100.00');expect(db.prepare('SELECT category,status FROM hub_documents WHERE id=?').get(result.id)).toMatchObject({category:'report',status:'draft'});
  expect((await (await req('commands/report',body,'POST',key)).json()).id).toBe(result.id);expect((await req('commands/report',{month:'2026-13'})).status).toBe(400);
 });
 it('scans only fixed public origins without redirects and saves limited WCAG evidence',async()=>{
  const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('<html><head><title></title></head><body><img src="x"></body></html>',{headers:{'content-type':'text/html'}}));
  const result=await (await req('commands/wcag',{path:'/'})).json();expect(result.findings).toHaveLength(3);expect(fetcher).toHaveBeenCalledWith('https://avyron.ro/',expect.objectContaining({redirect:'manual'}));expect(result.limitation).toContain('preliminară');
  expect((await req('commands/wcag',{path:'//127.0.0.1/'})).status).toBe(400);expect(fetcher).toHaveBeenCalledTimes(1);
  expect(inspectAccessibility('<html lang="ro"><title>Avyron</title><img alt=""></html>').findings).toHaveLength(0);
 });
 it('stores independent domain ownership, DNS, SSL, redirects and subdomains',async()=>{
  const body={...domain(),client_id:'c'};body.data={...body.data,ownership:'client',registrar:'Registrar',dns_records:'A www 192.0.2.1',ssl_status:'valid',subdomains:'app.example.test',redirect:'www → apex'};
  const id=(await (await req('records/domains',body)).json()).id;expect((await (await req('records/domains')).json()).data.find((d:{id:string})=>d.id===id).data).toMatchObject({ownership:'client',ssl_status:'valid',subdomains:'app.example.test'});
  expect((await req('records/domains',{...body,client_id:null})).status).toBe(400);
 });
 it('parses concrete Romanian commands and resolves report dates explicitly',()=>{
  expect(commandIntent('Creează lead')).toEqual({type:'lead'});expect(commandIntent('arată facturile neachitate')).toEqual({type:'invoices'});expect(commandIntent('deschide clientul Acme')).toEqual({type:'client',query:'Acme'});
  expect(commandIntent('deschide clientul Căsuța')).toEqual({type:'client',query:'Căsuța'});
  expect(commandIntent('generează raportul august',new Date('2026-01-05'))).toEqual({type:'report',month:'2025-08'});expect(commandIntent('generează raportul august 2026')).toEqual({type:'report',month:'2026-08'});expect(commandIntent('generează raportul 2026-03')).toEqual({type:'report',month:'2026-03'});
 });

});
