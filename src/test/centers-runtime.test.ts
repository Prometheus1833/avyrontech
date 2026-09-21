// @vitest-environment node
import {createRequire} from 'node:module';
import {readdirSync,readFileSync} from 'node:fs';
import type {DatabaseSync as SqliteDatabase,SQLInputValue} from 'node:sqlite';
import {Hono} from 'hono';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
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
 let db:SqliteDatabase,app:Hono,actor:string,env:Env,kv:Map<string,string>;
 beforeEach(()=>{
  db=new DatabaseSync(':memory:');for(const p of readdirSync('cloudflare/d1/migrations').filter(p=>p.endsWith('.sql')).sort())db.exec(readFileSync(`cloudflare/d1/migrations/${p}`,'utf8'));
  for(const [id,email,role] of [['owner','prometheus@avyron.ro','admin'],['staff','staff@example.test','staff'],['client','client@example.test','user']]){db.prepare('INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,1,1)').run(id,email,'fixture');db.prepare('INSERT INTO user_roles VALUES (?,?)').run(id,role);}
  db.exec("INSERT INTO clients(id,company_name,email,created_at) VALUES ('c','Client One','c@example.test',1);INSERT INTO projects(id,client_id,name,slug,created_at) VALUES ('p','c','Project','project',1)");
  actor='owner';kv=new Map();env={DB:{prepare:(sql:string)=>new Statement(db,sql),batch:async(statements:Statement[])=>{db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}},KV:{get:async(k:string)=>kv.get(k)||null,put:async(k:string,v:string)=>{kv.set(k,v);},delete:async(k:string)=>{kv.delete(k);}},FILES:{list:async()=>({objects:[]})},MEDIA:{list:async()=>({objects:[]})},MFA_ENCRYPTION_KEY:'fixture-key-not-real-at-least-thirty-two',ADMIN_MFA_POLICY:'optional_until_enrollment'} as unknown as Env;
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
});
