import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AppBindings } from './types';
import { platformRoleForUser } from './authorization';
import { privilegedMfaSatisfied } from './mfaPolicy';
import { checkRateLimit } from './antispam';
import { sha256 } from './security';
import { integrationProviders, readIntegration, sealCredential, ProviderError, type IntegrationAccount } from './integrationAdapters';
import { evaluateAgent } from './agentEvaluation';
import { operationActions, operationPreview, runOperationJobs } from './operationJobs';
export const operationsRouter=new Hono<AppBindings>();
type Ctx=Context<AppBindings>;
const messages:Record<string,string>={revision_conflict:'Înregistrarea a fost modificată. Reîncarcă datele înainte de a salva.',approval_required:'Trimite versiunea curentă în aprobare înainte de activare.',appointment_overlap_or_invalid_period:'Responsabilul are deja o programare în acest interval.',invalid_reference_or_period:'Verifică asocierile și perioada. Programările necesită responsabil, început și sfârșit.',vault_not_configured:'Cheia de criptare a platformei trebuie configurată înainte de conectarea contului.',credentials_or_scope_invalid:'Cheia este expirată sau nu are permisiunile de citire necesare.',credential_environment_mismatch:'Cheia nu corespunde mediului test sau real selectat.',provider_unavailable:'Furnizorul nu este disponibil. Încearcă din nou.',provider_rate_limited:'Furnizorul a limitat solicitările. Reîncearcă mai târziu.',invalid_job_state:'Execuția nu mai este în starea necesară.',forbidden:'Contul nu are permisiunea necesară.',not_found:'Înregistrarea nu mai este disponibilă.',idempotency_key_reused:'Aceeași cheie a fost folosită pentru altă cerere.'};
const bad=(c:Ctx,code:string,status:400|403|404|409|503=400)=>c.json({error:{code,message:messages[code]||'Acțiunea nu poate fi efectuată. Verifică datele și reîncarcă pagina.'}},status);
const audit=(c:Ctx,action:string,target:string)=>c.env.DB.prepare("INSERT INTO security_events(id,actor_user_id,actor_type,action,target_id,outcome,severity,created_at) VALUES (?,?,'user',?,?,'allowed','info',?)").bind(crypto.randomUUID(),c.get('userId'),action,target,Date.now());
const scope=(c:Ctx)=>`operations:${c.get('userId')}:${c.req.method}:${c.req.path}`;
async function replay(c:Ctx) {
  const old=await c.env.DB.prepare('SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?').bind(scope(c),c.req.header('idempotency-key')).first<{request_hash:string;response_json:string}>();
  if(!old)return null;
  return old.request_hash===await sha256(JSON.stringify(await c.req.json().catch(()=>null)))?c.json(JSON.parse(old.response_json)):bad(c,'idempotency_key_reused',409);
}
async function write(c:Ctx,result:Record<string,unknown>,statements:D1PreparedStatement[]) {
  const timestamp=Date.now();
  try {await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES (?,?,?,200,?,?,?)').bind(scope(c),c.req.header('idempotency-key'),await sha256(JSON.stringify(await c.req.json().catch(()=>null))),JSON.stringify(result),timestamp,timestamp+86400000),
    ...statements,
  ]);}catch(error){const previous=await replay(c);if(previous)return previous;if(/appointment_(overlap|invalid)/.test(String(error)))return bad(c,'appointment_overlap_or_invalid_period',409);if(/NOT NULL constraint failed: (operation_records|operation_automations|integration_accounts)\.revision/.test(String(error)))return bad(c,'revision_conflict',409);throw error;}
  return c.json(result);
}
operationsRouter.use('/api/operations/*',bodyLimit({maxSize:65536}));
operationsRouter.use('/api/operations/*',async(c,next)=>{
  c.header('cache-control','private, no-store');
  if(!await platformRoleForUser(c.env.DB,c.get('userId')))return bad(c,'forbidden',403);
  const rate=await checkRateLimit(c.env.DB,[{key:`operations:${c.get('userId')}`,limit:300,windowSec:3600}]);
  if(!rate.ok)return c.json({error:{code:'rate_limited'}},429);
  if(!['GET','HEAD','OPTIONS'].includes(c.req.method)){
    if(!await privilegedMfaSatisfied(c))return bad(c,'mfa_required',403);
    if(!/^[A-Za-z0-9_.:-]{16,128}$/.test(c.req.header('idempotency-key')||''))return bad(c,'idempotency_key_required');
    const previous=await replay(c);if(previous)return previous;
  }
  await next();
});
const kinds=['contract','change_request','appointment','compliance','privacy_request','experiment'] as const;
const statuses=['draft','pending','approved','active','done','cancelled'] as const;
const reference=z.string().min(1).max(100).nullable();
const date=z.number().int().min(0).max(8640000000000000).nullable();
const recordSchema=z.object({kind:z.enum(kinds),title:z.string().trim().min(1).max(200),description:z.string().max(8000),project_id:reference,client_id:reference,assignee_id:reference,status:z.enum(statuses),starts_at:date,due_at:date,amount_minor:z.number().int().min(0).max(9000000000000).nullable(),currency:z.enum(['RON','EUR','USD','GBP','CHF'])}).strict();
async function validReferences(c:Ctx,body:z.infer<typeof recordSchema>) {
  for(const [table,key] of [['projects','project_id'],['clients','client_id'],['users','assignee_id']] as const){
    const value=body[key];if(value&&!await c.env.DB.prepare(`SELECT 1 FROM ${table} WHERE id=? ${table==='users'?'AND disabled_at IS NULL':''}`).bind(value).first())return false;
  }
  if(body.project_id&&body.client_id&&!await c.env.DB.prepare('SELECT 1 FROM projects WHERE id=? AND client_id=?').bind(body.project_id,body.client_id).first())return false;
  if(body.kind==='appointment' && (body.assignee_id===null||body.starts_at===null||body.due_at===null||body.due_at<=body.starts_at))return false;
  return !(body.starts_at!==null&&body.due_at!==null&&body.due_at<body.starts_at);
}
operationsRouter.get('/api/operations/config',async c=>{
 const [clients,projects,staff]=await Promise.all([
  c.env.DB.prepare("SELECT id,company_name name FROM clients WHERE status!='archived' ORDER BY company_name LIMIT 250").all(),
  c.env.DB.prepare("SELECT id,name,client_id FROM projects WHERE status!='archived' ORDER BY name LIMIT 250").all(),
  c.env.DB.prepare("SELECT id,display_name name FROM users WHERE disabled_at IS NULL AND EXISTS (SELECT 1 FROM user_roles WHERE user_id=users.id AND role IN ('staff','admin')) ORDER BY display_name LIMIT 250").all(),
 ]);
 return c.json({clients:clients.results,projects:projects.results,staff:staff.results,canManageIntegrations:await platformRoleForUser(c.env.DB,c.get('userId'))==='platform_owner'});
});
operationsRouter.get('/api/operations/records',async c=>{
 const kind=c.req.query('kind'),search=(c.req.query('search')||'').slice(0,100),status=c.req.query('status');
 const offset=Number(c.req.query('offset')||0);if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)return bad(c,'invalid_pagination');
 if(kind&&!kinds.includes(kind as typeof kinds[number]))return bad(c,'invalid_kind');
 if(status&&!statuses.includes(status as typeof statuses[number]))return bad(c,'invalid_status');
 const where=['archived_at IS NULL'];const values:(string|number)[]=[];
 if(kind){where.push('kind=?');values.push(kind);}if(status){where.push('status=?');values.push(status);}
 if(search){where.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");const term=`%${search.replace(/[\\%_]/g,'\\$&')}%`;values.push(term,term);}
 const [rows,total]=await Promise.all([c.env.DB.prepare(`SELECT * FROM operation_records WHERE ${where.join(' AND ')} ORDER BY due_at IS NULL,due_at,id LIMIT 50 OFFSET ?`).bind(...values,offset).all(),c.env.DB.prepare(`SELECT COUNT(*) total FROM operation_records WHERE ${where.join(' AND ')}`).bind(...values).first<{total:number}>()]);
 return c.json({data:rows.results,total:total?.total||0});
});
operationsRouter.post('/api/operations/records',async c=>{
 const parsed=recordSchema.safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return bad(c,'invalid_record');const b=parsed.data;
 if(['approved','active','done'].includes(b.status)&&['contract','change_request'].includes(b.kind))return bad(c,'approval_required',409);
 if(!await validReferences(c,b))return bad(c,'invalid_reference_or_period');
 const id=crypto.randomUUID(),t=Date.now();
 return write(c,{id},[c.env.DB.prepare(`INSERT INTO operation_records(id,kind,title,description,project_id,client_id,assignee_id,status,starts_at,due_at,amount_minor,currency,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,b.kind,b.title,b.description,b.project_id,b.client_id,b.assignee_id,b.status,b.starts_at,b.due_at,b.amount_minor,b.currency,c.get('userId'),t,t),audit(c,'operations.record.created',id)]);
});
operationsRouter.patch('/api/operations/records/:id',async c=>{
 const parsed=recordSchema.extend({revision:z.number().int().positive()}).safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return bad(c,'invalid_record');const b=parsed.data;
 const row=await c.env.DB.prepare('SELECT * FROM operation_records WHERE id=? AND archived_at IS NULL').bind(c.req.param('id')).first<Record<string,unknown>>();if(!row)return bad(c,'not_found',404);
 if(row.revision!==b.revision)return bad(c,'revision_conflict',409);if(row.kind!==b.kind)return bad(c,'kind_immutable',409);
 if(!await validReferences(c,b))return bad(c,'invalid_reference_or_period');
 const changed=['title','description','project_id','client_id','assignee_id','starts_at','due_at','amount_minor','currency'].some(key=>row[key]!==b[key as keyof typeof b]);
 const financial=['contract','change_request'].includes(b.kind);
 if(financial&&['approved','active','done'].includes(b.status)&&(changed||!row.approved_revision))return bad(c,'approval_required',409);
 const approvalChanged=financial&&(changed||['draft','pending','cancelled'].includes(b.status));
 return write(c,{ok:true},[c.env.DB.prepare(`UPDATE operation_records SET title=?,description=?,project_id=?,client_id=?,assignee_id=?,status=?,starts_at=?,due_at=?,amount_minor=?,currency=?,approved_revision=?,approved_by=?,approved_at=?,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?`).bind(b.title,b.description,b.project_id,b.client_id,b.assignee_id,b.status,b.starts_at,b.due_at,b.amount_minor,b.currency,approvalChanged?null:row.approved_revision,approvalChanged?null:row.approved_by,approvalChanged?null:row.approved_at,Date.now(),b.revision,c.req.param('id')),audit(c,'operations.record.updated',c.req.param('id'))]);
});
operationsRouter.post('/api/operations/records/:id/approve',async c=>{
 if(await platformRoleForUser(c.env.DB,c.get('userId'))!=='platform_owner')return bad(c,'forbidden',403);
 const b=z.object({revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return bad(c,'invalid_revision');
 const row=await c.env.DB.prepare("SELECT id FROM operation_records WHERE id=? AND kind IN ('contract','change_request') AND status='pending' AND revision=? AND archived_at IS NULL").bind(c.req.param('id'),b.data.revision).first();if(!row)return bad(c,'approval_unavailable',409);
 const t=Date.now();return write(c,{ok:true},[c.env.DB.prepare("UPDATE operation_records SET status='approved',approved_revision=?,approved_by=?,approved_at=?,updated_at=?,revision=CASE WHEN revision=? AND status='pending' THEN revision+1 ELSE NULL END WHERE id=?").bind(b.data.revision,c.get('userId'),t,t,b.data.revision,c.req.param('id')),audit(c,'operations.record.approved',c.req.param('id'))]);
});
operationsRouter.delete('/api/operations/records/:id',async c=>{
 const b=z.object({revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return bad(c,'invalid_revision');
 if(!await c.env.DB.prepare('SELECT id FROM operation_records WHERE id=? AND archived_at IS NULL').bind(c.req.param('id')).first())return bad(c,'not_found',404);
 return write(c,{ok:true},[c.env.DB.prepare('UPDATE operation_records SET archived_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=? AND archived_at IS NULL').bind(Date.now(),b.data.revision,c.req.param('id')),audit(c,'operations.record.archived',c.req.param('id'))]);
});
operationsRouter.get('/api/operations/automations',async c=>{
 const [rules,jobs]=await Promise.all([c.env.DB.prepare("SELECT rule.*,(SELECT COUNT(*) FROM operation_jobs WHERE automation_id=rule.id AND status='succeeded') successful_runs FROM operation_automations rule ORDER BY rule.created_at DESC").all(),c.env.DB.prepare('SELECT * FROM operation_jobs ORDER BY created_at DESC LIMIT 50').all()]);return c.json({data:rules.results,jobs:jobs.results});
});
const automationSchema=z.object({name:z.string().trim().min(1).max(160),action:z.enum(operationActions),interval_minutes:z.number().int().min(15).max(10080),enabled:z.boolean(),manual_minutes_saved:z.number().int().min(0).max(10080).nullable().default(null)}).strict();
operationsRouter.post('/api/operations/automations',async c=>{
 const parsed=automationSchema.safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return bad(c,'invalid_automation');const b=parsed.data,id=crypto.randomUUID(),t=Date.now();
 return write(c,{id},[c.env.DB.prepare('INSERT INTO operation_automations(id,name,action,interval_minutes,enabled,next_run_at,created_by,created_at,updated_at,manual_minutes_saved) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,b.name,b.action,b.interval_minutes,b.enabled?1:0,t,c.get('userId'),t,t,b.manual_minutes_saved),audit(c,'operations.automation.created',id)]);
});
operationsRouter.patch('/api/operations/automations/:id',async c=>{
 const parsed=automationSchema.extend({revision:z.number().int().positive()}).safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return bad(c,'invalid_automation');const b=parsed.data;
 if(!await c.env.DB.prepare('SELECT id FROM operation_automations WHERE id=?').bind(c.req.param('id')).first())return bad(c,'not_found',404);
 return write(c,{ok:true},[
  c.env.DB.prepare('UPDATE operation_automations SET name=?,action=?,interval_minutes=?,enabled=?,next_run_at=?,updated_at=?,manual_minutes_saved=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?').bind(b.name,b.action,b.interval_minutes,b.enabled?1:0,Date.now(),Date.now(),b.manual_minutes_saved,b.revision,c.req.param('id')),
  ...(!b.enabled?[c.env.DB.prepare("UPDATE operation_jobs SET status='cancelled',locked_until=NULL WHERE automation_id=? AND status IN ('queued','running')").bind(c.req.param('id'))]:[]),audit(c,'operations.automation.updated',c.req.param('id'))]);
});
operationsRouter.post('/api/operations/preview',async c=>{
 const b=z.object({action:z.enum(operationActions)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return bad(c,'invalid_action');
 return c.json(await operationPreview(c.env,b.data.action));
});
operationsRouter.post('/api/operations/jobs',async c=>{
 const b=z.object({action:z.enum(operationActions)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return bad(c,'invalid_action');const id=crypto.randomUUID(),t=Date.now();
 const response=await write(c,{id},[c.env.DB.prepare('INSERT INTO operation_jobs(id,action,deduplication_key,available_at,created_at) VALUES (?,?,?,?,?)').bind(id,b.data.action,`${c.get('userId')}:${c.req.header('idempotency-key')}`,t,t),audit(c,'operations.job.queued',id)]);
 if(response.status===200)c.executionCtx.waitUntil(runOperationJobs(c.env));return response;
});
operationsRouter.post('/api/operations/jobs/:id/:action',async c=>{
 const action=c.req.param('action');if(!['retry','cancel'].includes(action))return bad(c,'invalid_action');
 const row=await c.env.DB.prepare('SELECT status FROM operation_jobs WHERE id=?').bind(c.req.param('id')).first<{status:string}>();if(!row)return bad(c,'not_found',404);if(action==='retry'?row.status!=='failed':!['queued','running'].includes(row.status))return bad(c,'invalid_job_state',409);
 return write(c,{ok:true},[action==='cancel'?c.env.DB.prepare("UPDATE operation_jobs SET status='cancelled',locked_until=NULL WHERE id=? AND status IN ('queued','running')").bind(c.req.param('id')):c.env.DB.prepare("UPDATE operation_jobs SET status='queued',attempts=0,available_at=?,error_code=NULL WHERE id=? AND status='failed'").bind(Date.now(),c.req.param('id')),audit(c,`operations.job.${action}`,c.req.param('id'))]);
});
operationsRouter.get('/api/operations/notifications',async c=>c.json({data:(await c.env.DB.prepare('SELECT * FROM operation_notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(c.get('userId')).all()).results}));
operationsRouter.post('/api/operations/notifications/:id/read',async c=>write(c,{ok:true},[c.env.DB.prepare('UPDATE operation_notifications SET read_at=? WHERE id=? AND user_id=?').bind(Date.now(),c.req.param('id'),c.get('userId'))]));
operationsRouter.get('/api/operations/integrations',async c=>{
 const accounts=await c.env.DB.prepare('SELECT id,provider,label,environment,status,revision,checked_at,synced_at,error_code,secret_reference IS NOT NULL has_credential FROM integration_accounts ORDER BY label').all();
 return c.json({providers:integrationProviders,data:accounts.results,canEdit:await platformRoleForUser(c.env.DB,c.get('userId'))==='platform_owner'});
});
operationsRouter.post('/api/operations/integrations',async c=>{
 if(await platformRoleForUser(c.env.DB,c.get('userId'))!=='platform_owner')return bad(c,'forbidden',403);
 const b=z.object({provider:z.enum(['github','stripe','cloudflare','revolut']),label:z.string().trim().min(1).max(120),environment:z.enum(['test','live'])}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return bad(c,'invalid_account');const id=crypto.randomUUID(),t=Date.now();
 if(['github','cloudflare'].includes(b.data.provider)&&b.data.environment!=='live')return bad(c,'invalid_environment');
 return write(c,{id},[c.env.DB.prepare('INSERT INTO integration_accounts(id,provider,label,environment,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(id,b.data.provider,b.data.label,b.data.environment,c.get('userId'),t,t),audit(c,'integration.account.created',id)]);
});
operationsRouter.put('/api/operations/integrations/:id/credential',async c=>{
 if(await platformRoleForUser(c.env.DB,c.get('userId'))!=='platform_owner')return bad(c,'forbidden',403);
 const b=z.object({token:z.string().trim().min(16).max(8000).regex(/^[^\s]+$/),revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return bad(c,'invalid_credential');
 const account=await c.env.DB.prepare('SELECT * FROM integration_accounts WHERE id=?').bind(c.req.param('id')).first<IntegrationAccount>();if(!account)return bad(c,'not_found',404);if(account.revision!==b.data.revision)return bad(c,'revision_conflict',409);
 if(!c.env.MFA_ENCRYPTION_KEY||c.env.MFA_ENCRYPTION_KEY.length<32)return bad(c,'vault_not_configured',503);
 const reference=`integration:v1:${account.id}:${crypto.randomUUID()}`;
 const sealed=await sealCredential(b.data.token,c.env.MFA_ENCRYPTION_KEY,reference);await c.env.KV.put(reference,sealed);
 try{
  const result=await write(c,{ok:true},[c.env.DB.prepare("UPDATE integration_accounts SET secret_reference=?,status='configured',checked_at=NULL,synced_at=NULL,error_code=NULL,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?").bind(reference,Date.now(),b.data.revision,account.id),c.env.DB.prepare('DELETE FROM integration_snapshots WHERE account_id=?').bind(account.id),c.env.DB.prepare('DELETE FROM integration_documents WHERE account_id=?').bind(account.id),audit(c,'integration.credential.replaced',account.id)]);
  const stored=await c.env.DB.prepare('SELECT secret_reference FROM integration_accounts WHERE id=?').bind(account.id).first<{secret_reference:string}>();
  if(stored?.secret_reference!==reference)await c.env.KV.delete(reference);
  else if(account.secret_reference)c.executionCtx.waitUntil(c.env.KV.delete(account.secret_reference));return result;
 }catch(error){await c.env.KV.delete(reference);throw error;}
});
operationsRouter.post('/api/operations/integrations/:id/:action',async c=>{
 if(await platformRoleForUser(c.env.DB,c.get('userId'))!=='platform_owner')return bad(c,'forbidden',403);
 const action=c.req.param('action');if(!['verify','sync','disconnect'].includes(action))return bad(c,'invalid_action');
 const account=await c.env.DB.prepare('SELECT * FROM integration_accounts WHERE id=?').bind(c.req.param('id')).first<IntegrationAccount>();if(!account)return bad(c,'not_found',404);
 if(action==='disconnect'){
  const result=await write(c,{ok:true},[c.env.DB.prepare("UPDATE integration_accounts SET status='disconnected',secret_reference=NULL,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?").bind(Date.now(),account.revision,account.id),audit(c,'integration.disconnected',account.id)]);
  if(result.status===200&&account.secret_reference)c.executionCtx.waitUntil(c.env.KV.delete(account.secret_reference));return result;
 }
 const rate=await checkRateLimit(c.env.DB,[{key:`integration-probe:${account.id}`,limit:20,windowSec:3600}]);if(!rate.ok)return c.json({error:{code:'rate_limited'}},429);
 try{
  const result=await readIntegration(c.env,account,action==='sync'),t=Date.now();
  return write(c,{ok:true,summary:result.summary},[
    c.env.DB.prepare("UPDATE integration_accounts SET status='connected',checked_at=?,synced_at=CASE WHEN ? THEN ? ELSE synced_at END,error_code=NULL,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?").bind(t,action==='sync'?1:0,t,t,account.revision,account.id),
    c.env.DB.prepare('INSERT INTO integration_snapshots(account_id,summary_json,created_at) VALUES (?,?,?) ON CONFLICT(account_id) DO UPDATE SET summary_json=excluded.summary_json,created_at=excluded.created_at').bind(account.id,JSON.stringify(result.summary),t),
    c.env.DB.prepare(`INSERT INTO integration_documents(account_id,external_id,kind,summary_json,synced_at)
      SELECT ?,json_extract(value,'$.id'),json_extract(value,'$.kind'),json_extract(value,'$.data'),? FROM json_each(?) WHERE 1
      ON CONFLICT(account_id,external_id) DO UPDATE SET summary_json=excluded.summary_json,synced_at=excluded.synced_at`)
      .bind(account.id,t,JSON.stringify(result.documents)),audit(c,`integration.${action}`,account.id),
  ]);
 }catch(error){
  const code=error instanceof ProviderError?error.code:'provider_unavailable';
  await c.env.DB.prepare("UPDATE integration_accounts SET status='error',error_code=?,checked_at=? WHERE id=? AND revision=?").bind(code,Date.now(),account.id,account.revision).run();return bad(c,code,503);
 }
});
operationsRouter.get('/api/operations/integrations/:id/documents',async c=>{
 const result=await c.env.DB.prepare('SELECT external_id,kind,summary_json,synced_at FROM integration_documents WHERE account_id=? ORDER BY synced_at DESC,external_id LIMIT 100').bind(c.req.param('id')).all<{external_id:string;kind:string;summary_json:string;synced_at:number}>();
 return c.json({data:result.results.map(row=>({...row,data:JSON.parse(row.summary_json),summary_json:undefined}))});
});

operationsRouter.get('/api/operations/agents',async c=>{
 const [agents,runs,evaluations]=await Promise.all([
  c.env.DB.prepare(`SELECT agent.slug,agent.name,agent.status,agent.current_version,version.id version_id,version.status version_status,version.model,version.max_tokens,
    COALESCE(kill.enabled,0) stopped FROM ai_agents agent LEFT JOIN ai_agent_versions version ON version.agent_slug=agent.slug AND version.version=agent.current_version
    LEFT JOIN ai_kill_switches kill ON kill.scope_type='agent' AND kill.scope_id=agent.slug ORDER BY agent.name`).all(),
  c.env.DB.prepare('SELECT id,agent_slug,status,input_tokens,output_tokens,usage_source,actual_cost_micros,started_at,completed_at,error_code FROM ai_runs ORDER BY created_at DESC LIMIT 50').all(),
  c.env.DB.prepare('SELECT * FROM ai_evaluations ORDER BY created_at DESC LIMIT 50').all(),
 ]);return c.json({data:agents.results,runs:runs.results,evaluations:evaluations.results});
});
operationsRouter.post('/api/operations/agents/:slug/stop',async c=>{
 if(await platformRoleForUser(c.env.DB,c.get('userId'))!=='platform_owner')return bad(c,'forbidden',403);
 const b=z.object({enabled:z.boolean(),reason:z.string().trim().min(1).max(300)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return bad(c,'invalid_stop');
 if(!await c.env.DB.prepare('SELECT 1 FROM ai_agents WHERE slug=?').bind(c.req.param('slug')).first())return bad(c,'not_found',404);
 return write(c,{ok:true},[c.env.DB.prepare("INSERT INTO ai_kill_switches(scope_type,scope_id,enabled,reason,changed_by,changed_at) VALUES ('agent',?,?,?,?,?) ON CONFLICT(scope_type,scope_id) DO UPDATE SET enabled=excluded.enabled,reason=excluded.reason,changed_by=excluded.changed_by,changed_at=excluded.changed_at").bind(c.req.param('slug'),b.data.enabled?1:0,b.data.reason,c.get('userId'),Date.now()),audit(c,'ai.stop.updated',c.req.param('slug'))]);
});

operationsRouter.post('/api/operations/agents/:slug/evaluate',async c=>{
 const b=z.object({question:z.string().trim().min(2).max(1000),expected_knowledge_id:z.string().max(100).nullable()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return bad(c,'invalid_evaluation');
 const result=await evaluateAgent(c.env.DB,c.req.param('slug'),b.data.question,b.data.expected_knowledge_id);if(!result)return bad(c,'not_found',404);
 return write(c,result,[c.env.DB.prepare("INSERT INTO ai_evaluations(id,agent_version_id,suite,case_name,status,score,metrics_json,evaluated_by,created_at) VALUES (?,?,'configuration_and_retrieval',?,?,?,?,?,?)").bind(crypto.randomUUID(),result.version_id,b.data.question,result.score===1?'passed':'failed',result.score,JSON.stringify(result),c.get('userId'),Date.now()),audit(c,'ai.evaluation.completed',c.req.param('slug'))]);
});
