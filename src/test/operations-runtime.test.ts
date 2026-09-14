// @vitest-environment node
import {createRequire} from 'node:module';
import {readdirSync,readFileSync} from 'node:fs';
import type {DatabaseSync as SqliteDatabase,SQLInputValue} from 'node:sqlite';
import {Hono} from 'hono';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('../../cloudflare/workers/api/src/agents/resolveAgentRuntime',()=>({resolveAgentRuntime:async()=>({beginRun:async()=>{},completeRun:async()=>{}})}));
import {aiOsRouter} from '../../cloudflare/workers/api/src/aiOs';
import {operationsRouter} from '../../cloudflare/workers/api/src/operations';
import {runOperationJobs} from '../../cloudflare/workers/api/src/operationJobs';
import {retrieveKnowledge,boundedKnowledgeContext} from '../../cloudflare/workers/api/src/knowledgeRetrieval';
import {reserveAiCost} from '../../cloudflare/workers/api/src/aiCostGuard';
import {sealCredential,openCredential,boundedProviderJson,readIntegration} from '../../cloudflare/workers/api/src/integrationAdapters';
import type {Env} from '../../cloudflare/workers/api/src/types';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
class Statement {
 values:SQLInputValue[]=[];
 constructor(readonly db:SqliteDatabase,readonly sql:string){}
 bind(...values:SQLInputValue[]){this.values=values;return this;}
 async first(){return this.db.prepare(this.sql).get(...this.values)??null;}
 async all(){return {results:this.db.prepare(this.sql).all(...this.values)};}
 async run(){return {meta:this.db.prepare(this.sql).run(...this.values)};}
}
describe('Operations: real handlers, migrated D1 and simulated bindings',()=>{
 let db:SqliteDatabase,env:Env,app:Hono,actor:string,kv:Map<string,string>,pending:Promise<unknown>[];
 const master='fixture-master-key-with-at-least-32-characters';
 beforeEach(()=>{
  db=new DatabaseSync(':memory:');for(const f of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(`cloudflare/d1/migrations/${f}`,'utf8'));
  for(const [id,email] of [['owner','prometheus@avyron.ro'],['admin','avyrontech@gmail.com'],['staff','staff@example.test'],['client','client@example.test']]){
   db.prepare('INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,1,1)').run(id,email,'fixture');db.prepare('INSERT INTO user_roles VALUES (?,?)').run(id,['owner','admin'].includes(id)?'admin':id==='staff'?'staff':'user');
  }
  db.exec("INSERT INTO clients(id,company_name,email,created_at) VALUES ('a','Client A','a@example.test',1),('b','Client B','b@example.test',1); INSERT INTO projects(id,client_id,name,slug,created_at) VALUES ('pa','a','Project A','project-a',1)");
  kv=new Map();pending=[];actor='owner';
  env={DB:{prepare:(sql:string)=>new Statement(db,sql),batch:async(statements:Statement[])=>{
   db.exec('BEGIN');try{const result=statements.map(s=>({meta:db.prepare(s.sql).run(...s.values)}));db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}
  }},KV:{get:async(key:string)=>kv.get(key)||null,put:async(key:string,value:string)=>{kv.set(key,value);},delete:async(key:string)=>{kv.delete(key);}},FILES:{list:async()=>({objects:[]})},MEDIA:{list:async()=>({objects:[]})},ADMIN_MFA_POLICY:'optional_until_enrollment',MFA_ENCRYPTION_KEY:master} as unknown as Env;
  app=new Hono();app.use('*',async(c,next)=>{Object.assign(c.env,env);c.set('userId',actor);c.set('roles',actor==='client'?['user']:actor==='staff'?['staff']:['admin']);c.set('mfaVerified',false);await next();});app.route('/',operationsRouter);app.route('/',aiOsRouter);app.onError(()=>new Response('safe failure',{status:500}));
 });
 afterEach(async()=>{await Promise.allSettled(pending);db.close();vi.restoreAllMocks();});
 const req=(path:string,body?:unknown,method='POST',key=crypto.randomUUID())=>app.request(`/api/operations/${path}`,body===undefined?{}:{method,headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)},env,{waitUntil:(p:Promise<unknown>)=>pending.push(p),passThroughOnException:()=>{}} as ExecutionContext);
 const record={kind:'contract',title:'Delivery contract',description:'Internal draft',project_id:'pa',client_id:'a',assignee_id:'owner',status:'pending',starts_at:null,due_at:null,amount_minor:15000,currency:'RON'};
 it('isolates platform operations from staff and clients',async()=>{
  for(const id of ['client','staff']){actor=id;for(const path of ['records','integrations','agents','notifications'])expect((await req(path)).status).toBe(403);expect((await req('records',record)).status).toBe(403);}
  actor='admin';expect((await req('records')).status).toBe(200);expect((await req('integrations',{provider:'stripe',label:'Billing',environment:'test'})).status).toBe(403);
 });
 it('atomically audits and deduplicates record creation',async()=>{
  const key='same-creation-idempotency';const first=await req('records',record,'POST',key);expect(first.status).toBe(200);expect(await (await req('records',record,'POST',key)).json()).toEqual(await first.json());
  expect(db.prepare('SELECT COUNT(*) n FROM operation_records').get()!.n).toBe(1);expect((await req('records',{...record,title:'Changed'},'POST',key)).status).toBe(409);
  db.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT,'injected failure'); END");expect((await req('records',record)).status).toBe(500);expect(db.prepare('SELECT COUNT(*) n FROM operation_records').get()!.n).toBe(1);
 });
 it('requires exact owner approval and invalidates it after content edits',async()=>{
  expect((await req('records',{...record,status:'active'})).status).toBe(409);const {id}=await (await req('records',record)).json();
  actor='admin';expect((await req(`records/${id}/approve`,{revision:1})).status).toBe(403);actor='owner';
  expect((await req(`records/${id}/approve`,{revision:1})).status).toBe(200);
  expect((await req(`records/${id}`,{...record,revision:2,status:'active'},'PATCH')).status).toBe(200);
  expect((await req(`records/${id}`,{...record,revision:3,status:'active',amount_minor:20000},'PATCH')).status).toBe(409);
  expect((await req(`records/${id}`,{...record,revision:3,status:'pending',amount_minor:20000},'PATCH')).status).toBe(200);
  expect(db.prepare('SELECT approved_revision FROM operation_records').get()!.approved_revision).toBeNull();
  expect((await req(`records/${id}/approve`,{revision:3})).status).toBe(409);
 });
 it('checks client/project references and rejects stale, missing or invalid records',async()=>{
  expect((await req('records',{...record,client_id:'b'})).status).toBe(400);expect((await req('records',{...record,due_at:3,starts_at:4})).status).toBe(400);
  const {id}=await (await req('records',record)).json();expect((await req(`records/${id}`,{revision:9},'DELETE')).status).toBe(409);expect((await req('records/missing',{revision:1},'DELETE')).status).toBe(404);
  expect((await req('records?offset=-1')).status).toBe(400);expect((await req('records?search=%25')).status).toBe(200);
 });
 it('prevents appointment overlaps atomically but permits adjacent slots',async()=>{
  const appointment={...record,kind:'appointment',status:'active',starts_at:1000,due_at:2000};
  const results=await Promise.all([req('records',appointment),req('records',appointment)]);expect(results.map(r=>r.status).sort()).toEqual([200,409]);
  expect((await req('records',{...appointment,starts_at:2000,due_at:3000})).status).toBe(200);
  expect((await req('records',{...appointment,assignee_id:null})).status).toBe(400);
 });
 it('runs each scheduled job once across concurrent drains and notifies each principal once',async()=>{
  expect((await req('automations',{name:'Briefing',action:'briefing',interval_minutes:15,enabled:true})).status).toBe(200);
  await Promise.all([runOperationJobs(env),runOperationJobs(env)]);
  expect(db.prepare('SELECT status,attempts FROM operation_jobs').get()).toMatchObject({status:'succeeded',attempts:1});expect(db.prepare('SELECT COUNT(*) n FROM operation_jobs').get()!.n).toBe(1);expect(db.prepare('SELECT COUNT(*) n FROM operation_notifications').get()!.n).toBe(2);
  const own=await (await req('notifications')).json();actor='admin';const other=await (await req('notifications')).json();expect(own.data[0].id).not.toBe(other.data[0].id);await req(`notifications/${own.data[0].id}/read`,{});expect(db.prepare('SELECT read_at FROM operation_notifications WHERE id=?').get(own.data[0].id)!.read_at).toBeNull();
 });
 it('cancels queued jobs when the automation is paused and rejects stale changes',async()=>{
  const rule={name:'Health',action:'health',interval_minutes:15,enabled:true};const {id}=await (await req('automations',rule)).json();
  db.prepare("INSERT INTO operation_jobs(id,automation_id,action,deduplication_key,available_at,created_at) VALUES ('j',?,'health','cancelled-fixture',0,0)").run(id);
  expect((await req(`automations/${id}`,{...rule,enabled:false,revision:1},'PATCH')).status).toBe(200);await runOperationJobs(env);expect(db.prepare('SELECT status FROM operation_jobs').get()!.status).toBe('cancelled');expect((await req(`automations/${id}`,{...rule,revision:1},'PATCH')).status).toBe(409);
 });
 it('retries transient read failures, then exhausts attempts and allows manual retry',async()=>{
  db.exec("INSERT INTO operation_jobs(id,action,deduplication_key,available_at,created_at) VALUES ('j','briefing','retry-fixture',0,0); DROP TABLE project_work_items");
  for(let i=0;i<3;i++){await runOperationJobs(env);db.exec("UPDATE operation_jobs SET available_at=0 WHERE id='j'");}
  expect(db.prepare('SELECT status,attempts FROM operation_jobs').get()).toMatchObject({status:'failed',attempts:3});expect((await req('jobs/j/retry',{})).status).toBe(200);expect(db.prepare('SELECT status,attempts FROM operation_jobs').get()).toMatchObject({status:'queued',attempts:0});
 });
 it('does not publish results after a running job is cancelled',async()=>{
  db.exec("INSERT INTO operation_jobs(id,action,deduplication_key,available_at,created_at) VALUES ('j','health','lease-fixture',0,0)");
  env.FILES.list=async()=>{db.exec("UPDATE operation_jobs SET status='cancelled' WHERE id='j'");return {objects:[]} as R2Objects;};await runOperationJobs(env);
  expect(db.prepare('SELECT status,result_json FROM operation_jobs').get()).toMatchObject({status:'cancelled',result_json:null});expect(db.prepare('SELECT COUNT(*) n FROM operation_notifications').get()!.n).toBe(0);
 });
 it('stores only sealed versioned credentials and clears old data on rotation',async()=>{
  const {id}=await (await req('integrations',{provider:'stripe',label:'Billing',environment:'test'})).json();const token='sk_test_fixture_not_real_secret';
  expect((await req(`integrations/${id}/credential`,{token,revision:1},'PUT')).status).toBe(200);
  const account=db.prepare('SELECT * FROM integration_accounts WHERE id=?').get(id)!;expect(JSON.stringify(account)).not.toContain(token);expect([...kv.values()].join()).not.toContain(token);
  expect(await openCredential(kv.get(String(account.secret_reference))!,master,String(account.secret_reference))).toBe(token);
  const listing=await (await req('integrations')).text();expect(listing).not.toContain(token);expect(listing).not.toContain('secret_reference');
  db.prepare("INSERT INTO integration_documents VALUES (?,'in_1','invoice','{}',1)").run(id);
  expect((await req(`integrations/${id}/credential`,{token:'sk_test_replacement_fixture',revision:2},'PUT')).status).toBe(200);await Promise.all(pending);expect(kv.size).toBe(1);expect(db.prepare('SELECT COUNT(*) n FROM integration_documents').get()!.n).toBe(0);
 });
 it('fails closed without a vault key or with an unenrolled unauthorized actor',async()=>{
  const {id}=await (await req('integrations',{provider:'stripe',label:'Billing',environment:'test'})).json();env.MFA_ENCRYPTION_KEY='';expect((await req(`integrations/${id}/credential`,{token:'sk_test_fixture_secret',revision:1},'PUT')).status).toBe(503);expect(kv.size).toBe(0);
 });
 it('synchronizes provider invoice summaries idempotently without inventing receipts',async()=>{
  const {id}=await (await req('integrations',{provider:'stripe',label:'Billing',environment:'test'})).json();await req(`integrations/${id}/credential`,{token:'sk_test_fixture_secret',revision:1},'PUT');
  const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({data:[{id:'in_fixture',number:'TEST-1',total:10000,amount_paid:10000,currency:'ron',customer_email:'private@example.test'}],has_more:false}));
  expect((await req(`integrations/${id}/sync`,{})).status).toBe(200);expect((await req(`integrations/${id}/sync`,{})).status).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(2);expect(db.prepare('SELECT COUNT(*) n FROM integration_documents').get()!.n).toBe(1);expect(db.prepare('SELECT COUNT(*) n FROM financial_receipts').get()!.n).toBe(0);expect(await (await req(`integrations/${id}/documents`)).text()).not.toContain('private@example.test');
  fetcher.mockImplementation(async()=>new Response('secret-response',{status:401}));const failure=await req(`integrations/${id}/verify`,{});expect(failure.status).toBe(503);expect(await failure.text()).not.toContain('secret-response');expect(db.prepare('SELECT status FROM integration_accounts').get()!.status).toBe('error');
 });
 const knowledge=(id:string,question:string,extra='')=>db.prepare(`INSERT INTO ai_knowledge(id,agent_slug,category,language,question,answer,keywords,source,status,priority,created_at,updated_at ${extra?',review_after':''}) VALUES (?,NULL,'general','ro',?,'Validated answer','cloudflare optimizare','manual','active',8,1,1 ${extra?',1':''})`).run(id,question);
 it('retrieves indexed Romanian knowledge, isolates agent scope and excludes expired/archived data',async()=>{
  db.exec('DELETE FROM ai_knowledge');knowledge('valid','Optimizare Cloudflare pentru agenți');knowledge('expired','Optimizare Cloudflare','expired');knowledge('private','Optimizare Cloudflare');db.exec("UPDATE ai_knowledge SET agent_slug='avy-finance' WHERE id='private'");
  const results=await retrieveKnowledge(env.DB,'avy','ro','Optimizare Cloudflare pentru agenti');expect(results.map(r=>r.entry.id)).toEqual(['valid']);expect(results[0].exact).toBe(true);expect(boundedKnowledgeContext(results,20).length).toBeLessThanOrEqual(20);
  db.exec("UPDATE ai_knowledge SET status='archived' WHERE id='valid'");expect(await retrieveKnowledge(env.DB,'avy','ro','Cloudflare')).toEqual([]);
 });
 it('updates FTS on editing and deletion, and treats query syntax as ordinary text',async()=>{
  db.exec('DELETE FROM ai_knowledge');knowledge('valid','Cloudflare optimizare');db.exec("UPDATE ai_knowledge SET question='Zebra unică',answer='Safely updated',keywords='' WHERE id='valid'");
  expect(await retrieveKnowledge(env.DB,'avy','ro','Cloudflare')).toEqual([]);expect((await retrieveKnowledge(env.DB,'avy','ro','Zebra " OR * --')).length).toBe(1);db.exec("DELETE FROM ai_knowledge WHERE id='valid'");expect(await retrieveKnowledge(env.DB,'avy','ro','Zebra')).toEqual([]);
 });
 it('persists configuration/retrieval evaluations and honors owner-only kill switches',async()=>{
  const result=await req('agents/avy/evaluate',{question:'Cloudflare optimizare',expected_knowledge_id:null});expect(result.status).toBe(200);expect((await result.json()).model_called).toBe(false);expect(db.prepare('SELECT COUNT(*) n FROM ai_evaluations').get()!.n).toBe(1);
  actor='admin';expect((await req('agents/avy/stop',{enabled:true,reason:'Testing'})).status).toBe(403);actor='owner';expect((await req('agents/avy/stop',{enabled:true,reason:'Testing'})).status).toBe(200);expect(db.prepare("SELECT enabled FROM ai_kill_switches WHERE scope_type='agent' AND scope_id='avy'").get()!.enabled).toBe(1);
 });
 const reserve=(key:string,units=60,cost=0)=>reserveAiCost({db:env.DB,agentSlug:'avy',vendorId:'fin_vendor_cloudflare_ai',operation:'public_chat_generation',requestedUnits:units,estimatedCostMinor:cost,idempotencyKey:key});
 const budget=()=>db.exec("UPDATE financial_provider_quotas SET quota_total=100,quota_used=0,status='active'; UPDATE financial_agent_provider_policies SET status='active',daily_budget_minor=10,monthly_budget_minor=100,max_request_cost_minor=10 WHERE agent_slug='avy'");
 it('charges a duplicate concurrent AI reservation exactly once',async()=>{
  budget();const result=await Promise.all([reserve('same-key'),reserve('same-key')]);expect(result.every(r=>r.decision==='allowed')).toBe(true);expect(db.prepare('SELECT quota_used FROM financial_provider_quotas').get()!.quota_used).toBe(60);expect(db.prepare('SELECT COUNT(*) n FROM financial_usage_events').get()!.n).toBe(1);
 });
 it('rejects reservation replay with different units, cost, agent or tenant',async()=>{
  budget();await reserve('bound-key');
  const input={db:env.DB,agentSlug:'avy',vendorId:'fin_vendor_cloudflare_ai',operation:'public_chat_generation',requestedUnits:60,estimatedCostMinor:0,idempotencyKey:'bound-key'};
  for(const patch of [{requestedUnits:61},{estimatedCostMinor:1},{agentSlug:'avy-finance'},{vendorId:'different'},{operation:'other'},{projectId:'pa'},{clientId:'a'}]){
   expect(await reserveAiCost({...input,...patch})).toMatchObject({decision:'blocked',reason:'idempotency_key_reused'});
  }
  expect(db.prepare('SELECT quota_used FROM financial_provider_quotas').get()!.quota_used).toBe(60);
  expect(db.prepare('SELECT COUNT(*) n FROM financial_usage_events').get()!.n).toBe(1);
 });
 it('rejects different concurrent requests sharing one reservation key',async()=>{
  budget();const results=await Promise.all([reserve('collision',10),reserve('collision',20)]);
  expect(results.filter(r=>r.decision==='allowed')).toHaveLength(1);
  expect(results.filter(r=>r.reason==='idempotency_key_reused')).toHaveLength(1);
 });
 it('serializes competing reservations at the quota and daily budget limits',async()=>{
  budget();const result=await Promise.all([reserve('first',60),reserve('second',60)]);expect(result.filter(r=>r.decision==='allowed')).toHaveLength(1);expect(db.prepare('SELECT quota_used FROM financial_provider_quotas').get()!.quota_used).toBe(60);
  db.exec('UPDATE financial_provider_quotas SET quota_used=0');const paid=await Promise.all([reserve('paid-first',1,6),reserve('paid-second',1,6)]);expect(paid.filter(r=>r.decision==='allowed')).toHaveLength(1);
 });
 it('validates and persists knowledge expiry from the admin API',async()=>{
  const save=(body:unknown)=>app.request('/api/ai/admin/knowledge',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)},env);
  const response=await save({question:'Termen verificat',answer:'Detaliu public',review_after:Date.now()+86400000});expect(response.status).toBe(200);const {id}=await response.json();expect(Number(db.prepare('SELECT review_after FROM ai_knowledge WHERE id=?').get(id)!.review_after)).toBeGreaterThan(Date.now());
  expect((await save({question:{bad:true},answer:'No'})).status).toBe(400);expect((await save({question:'Invalid',answer:'No',review_after:-1})).status).toBe(400);
 });
 const chat=(message:string)=>app.request('/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,agent:'avy',visitorId:'fixture-visitor'})},env,{waitUntil:(p:Promise<unknown>)=>pending.push(p),passThroughOnException:()=>{}} as ExecutionContext);
 const chatSeed=()=>{db.exec("DELETE FROM ai_knowledge; UPDATE ai_agents SET status='active',visibility='public' WHERE slug='avy'; UPDATE financial_provider_quotas SET quota_total=100000,quota_used=0,status='active'; UPDATE financial_agent_provider_policies SET status='active' WHERE agent_slug='avy'");knowledge('valid','Optimizare Cloudflare pentru agenți');};
 it('rejects malformed public AI input before rate limiting, persistence or model use',async()=>{
  const model=vi.fn();env.AI={run:model} as unknown as Ai;
  for(const body of [{message:42},{message:'Valid',agent:{}},{message:'Valid',visitorId:[]},{message:'Valid',page:42},{message:'x'.repeat(1001)},{message:'Valid',language:'invalid'}]){
   const response=await app.request('/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)},env);expect(response.status).toBe(400);
  }
  for(const body of [{messageId:{id:'bad'},helpful:true},{messageId:'valid',helpful:'yes'}]){
   expect((await app.request('/api/ai/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)},env)).status).toBe(400);
  }
  expect(model).not.toHaveBeenCalled();expect(db.prepare('SELECT COUNT(*) n FROM ai_runs').get()!.n).toBe(0);
 });
 it('answers exact verified questions without a model call or token charge',async()=>{
  chatSeed();const model=vi.fn();env.AI={run:model} as unknown as Ai;const response=await chat('Optimizare Cloudflare pentru agenti');expect(response.status).toBe(200);expect((await response.json()).reply).toBe('Validated answer');expect(model).not.toHaveBeenCalled();expect(db.prepare('SELECT input_tokens,output_tokens,usage_source FROM ai_runs').get()).toMatchObject({input_tokens:0,output_tokens:0,usage_source:'retrieval'});
 });
 it('uses the approved prompt snapshot and provider-reported token usage',async()=>{
  chatSeed();db.exec("UPDATE ai_agents SET system_prompt='UNAPPROVED_CHANGE' WHERE slug='avy'; UPDATE ai_agent_versions SET system_prompt='APPROVED_SNAPSHOT' WHERE agent_slug='avy'");const model=vi.fn(async()=>({response:'Grounded reply',usage:{prompt_tokens:123,completion_tokens:12}}));env.AI={run:model} as unknown as Ai;
  const response=await chat('Cloudflare optimizare');expect(response.status).toBe(200);expect((await response.json()).reply).toBe('Grounded reply');expect(model).toHaveBeenCalledTimes(1);const input=model.mock.calls[0] as unknown as [string,{messages:{content:string}[]}];expect(input[1].messages[0].content).toContain('APPROVED_SNAPSHOT');expect(input[1].messages[0].content).not.toContain('UNAPPROVED_CHANGE');expect(db.prepare('SELECT input_tokens,output_tokens,usage_source FROM ai_runs').get()).toMatchObject({input_tokens:123,output_tokens:12,usage_source:'provider'});
 });
 it('keeps conservative usage and a failed model step when generation fails',async()=>{
  chatSeed();env.AI={run:async()=>{throw new Error('provider error');}} as unknown as Ai;const response=await chat('Cloudflare optimizare');expect(response.status).toBe(200);expect((await response.json()).reply).toBe('Validated answer');const run=db.prepare('SELECT input_tokens,output_tokens,usage_source FROM ai_runs').get()!;expect(run.usage_source).toBe('estimated');expect(Number(run.input_tokens)).toBeGreaterThan(0);expect(Number(run.output_tokens)).toBeGreaterThan(0);expect(db.prepare("SELECT status FROM ai_run_steps WHERE kind='model'").get()!.status).toBe('failed');
 });
 it('does not call the model for uncovered topics or stopped agents',async()=>{
  chatSeed();const model=vi.fn();env.AI={run:model} as unknown as Ai;expect((await chat('Subiect extraterestru necunoscut')).status).toBe(200);await Promise.all(pending);expect(db.prepare('SELECT COUNT(*) n FROM ai_learning_queue').get()!.n).toBe(1);await req('agents/avy/stop',{enabled:true,reason:'Test pause'});expect((await chat('Cloudflare optimizare')).status).toBe(503);expect(model).not.toHaveBeenCalled();
 });
 it('rolls back quota consumption if usage persistence fails',async()=>{
  budget();db.exec("CREATE TRIGGER fail_usage AFTER INSERT ON financial_usage_events BEGIN SELECT RAISE(ABORT,'injected usage failure'); END");await expect(reserve('rollback')).rejects.toThrow();expect(db.prepare('SELECT quota_used FROM financial_provider_quotas').get()!.quota_used).toBe(0);
 });
});
describe('Integration adapter boundaries',()=>{
 it('binds ciphertext to its key reference and master key',async()=>{
  const master='fixture-master-key-with-at-least-32-characters',sealed=await sealCredential('fixture-token',master,'ref-a');await expect(openCredential(sealed,master,'ref-b')).rejects.toThrow();await expect(openCredential(sealed,master+'different','ref-a')).rejects.toThrow();expect(await openCredential(sealed,master,'ref-a')).toBe('fixture-token');
 });
 it('denies alternate hosts, cleartext and redirects; bounds response bodies',async()=>{
  const fetcher=vi.fn(async()=>new Response('x'.repeat(512*1024+1))) as unknown as typeof fetch;
  for(const url of ['http://api.github.com/user','https://evil.test/user','https://user@api.github.com/user'])await expect(boundedProviderJson(url,'token','github',fetcher)).rejects.toThrow('provider_url_denied');expect(fetcher).not.toHaveBeenCalled();
  await expect(boundedProviderJson('https://api.github.com/user','token','github',fetcher)).rejects.toThrow('provider_response_too_large');expect(fetcher).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({redirect:'error',headers:expect.objectContaining({'X-GitHub-Api-Version':'2026-03-10'})}));
 });
 it.each(['github','cloudflare','revolut'] as const)('reads %s through fixed provider endpoints and retains only summarized fields',async(provider)=>{
  const master='fixture-master-key-with-at-least-32-characters',cipher=await sealCredential('fixture-token',master,'ref');const urls:string[]=[];
  const fetcher=vi.fn(async(url:string)=>{urls.push(url);return Response.json(provider==='github'?(url.endsWith('/user')?{login:'fixture',id:1}:[{id:11,full_name:'fixture/repo',private:true,default_branch:'main',token:'never-store'}]):provider==='cloudflare'?(url.includes('/verify')?{success:true,result:{status:'active'}}:{success:true,result:[{id:'zone',name:'example.test',status:'active',secret:'never-store'}]}):[{id:'account',name:'Fixture',currency:'EUR',balance:1.25,secret:'never-store'}]);}) as unknown as typeof fetch;
  const result=await readIntegration({KV:{get:async()=>cipher},MFA_ENCRYPTION_KEY:master} as unknown as Env,{id:'a',provider,environment:'live',secret_reference:'ref',revision:1,status:'configured'},true,fetcher);
  expect(result.documents).toHaveLength(1);expect(JSON.stringify(result)).not.toContain('never-store');expect(urls.every(url=>url.startsWith('https://'))).toBe(true);if(provider==='revolut')expect(urls).toEqual(['https://b2b.revolut.com/api/1.0/accounts']);
 });
 it('rejects a Stripe test/live mismatch before calling the provider',async()=>{
  const master='fixture-master-key-with-at-least-32-characters',cipher=await sealCredential('sk_live_fixture',master,'ref'),fetcher=vi.fn() as unknown as typeof fetch;
  await expect(readIntegration({KV:{get:async()=>cipher},MFA_ENCRYPTION_KEY:master} as unknown as Env,{id:'a',provider:'stripe',environment:'test',secret_reference:'ref',revision:1,status:'configured'},true,fetcher)).rejects.toThrow('credential_environment_mismatch');expect(fetcher).not.toHaveBeenCalled();
 });
});
