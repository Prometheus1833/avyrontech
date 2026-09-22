import type { Hono, Context } from 'hono';
import { z } from 'zod';
import type { AppBindings } from './types';
import { centerAllowed } from './centerAccess';
import { checkRateLimit } from './antispam';
import { platformRoleForUser } from './authorization';
type Ctx=Context<AppBindings>;
const denied=(c:Ctx)=>c.json({error:{code:'forbidden'}},403);
const services=['avyron.ro','app','api','auth','ai','survey','labs','logs','media','files','d1','kv','workers','pages','email'];
export function mountCenterReports(router:Hono<AppBindings>){
 router.get('/api/centers/report/:center',async c=>{
  const center=c.req.param('center');if(!await centerAllowed(c,center))return denied(c);
  const db=c.env.DB,query=(c.req.query('search')||'').trim().slice(0,150),term=`%${query.replace(/[\\%_]/g,'\\$&')}%`,t=Date.now();
  if(center==='infrastructure'){
   const rows=await db.prepare('SELECT * FROM os_health_observations').all<{service:string;status:string;detail:string;checked_at:number;source:string}>();
   return c.json({data:services.map(service=>{const row=rows.results.find(r=>r.service===service);return row?{...row,status:row.status==='ok'&&row.checked_at<t-3600000?'warning':row.status}:{service,status:'unknown',detail:'Nicio probă înregistrată. Configurarea nu confirmă disponibilitatea.',checked_at:null,source:'neconfigurat'};})});
  }
  if(center==='security')return c.json({data:(await db.prepare("SELECT id,action,outcome,severity,target_id,created_at FROM security_events WHERE outcome IN ('denied','failed') OR severity IN ('warning','critical') ORDER BY created_at DESC LIMIT 100").all()).results});
  if(center==='errors')return c.json({data:(await db.prepare(`SELECT id,'agent' source,error_code message,created_at FROM ai_runs WHERE status='failed'
    UNION ALL SELECT id,'automatizare',error_code,created_at FROM operation_jobs WHERE status='failed'
    UNION ALL SELECT id,'email',COALESCE(error,'Livrare nereușită'),created_at FROM email_delivery_log WHERE status!='sent'
    UNION ALL SELECT id,'securitate/API',action,created_at FROM security_events WHERE outcome='failed'
    UNION ALL SELECT id,'integrare',error_code,updated_at FROM integration_accounts WHERE status='error'
    UNION ALL SELECT id,'marketing',error_code,updated_at FROM marketing_posts WHERE status IN ('failed','uncertain')
    UNION ALL SELECT id,'backup',error_code,created_at FROM backup_runs WHERE status='failed'
    UNION ALL SELECT id,'cont',error_code,updated_at FROM os_accounts WHERE status='error'
    ORDER BY created_at DESC LIMIT 100`).all()).results});
  if(center==='runs'){
   const runs=await db.prepare('SELECT id,agent_slug,status,input_tokens,output_tokens,estimated_cost_micros,error_code,created_at,completed_at FROM ai_runs ORDER BY created_at DESC LIMIT 50').all();
   const steps=await db.prepare('SELECT run_id,sequence,kind,name,status,substr(output_json,1,12000) output_json,error_code FROM ai_run_steps WHERE run_id IN (SELECT id FROM ai_runs ORDER BY created_at DESC LIMIT 50) ORDER BY run_id,sequence LIMIT 300').all();
   return c.json({data:runs.results,steps:steps.results});
  }
  if(center==='approvals')return c.json({marketing:(await db.prepare("SELECT id,title,revision FROM marketing_posts WHERE status='draft' ORDER BY updated_at DESC LIMIT 50").all()).results,data:(await db.prepare(`SELECT a.id,a.revision,a.summary,a.request_json,a.action_class,a.status,a.requested_at,a.expires_at,r.agent_slug FROM ai_approvals a JOIN ai_runs r ON r.id=a.run_id WHERE a.status='pending' AND a.expires_at>? ORDER BY a.requested_at LIMIT 100`).bind(t).all()).results});
  if(center==='plugins')return c.json({data:(await db.prepare("SELECT id,name,category,implementation_status,risk_level,summary,requirements_json,last_verified_at FROM engine_capabilities WHERE category IN ('plugin','mcp','integration','skill','ai_tool') AND (name LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\') ORDER BY name LIMIT 100").bind(term,term).all()).results});
  if(center==='documents'){
   const documents=await db.prepare(`SELECT id,title,status,visibility,updated_at,substr(content_text,1,600) excerpt FROM knowledge_documents WHERE status!='archived' AND (title LIKE ? ESCAPE '\\' OR content_text LIKE ? ESCAPE '\\') ORDER BY updated_at DESC LIMIT 50`).bind(term,term).all();
   const matches=await db.prepare(`SELECT id,question title,answer excerpt,status,review_after FROM ai_knowledge WHERE status='active' AND (question LIKE ? ESCAPE '\\' OR answer LIKE ? ESCAPE '\\') ORDER BY priority DESC LIMIT 30`).bind(term,term).all();
   const files=await db.prepare("SELECT id,title,file_name,status,updated_at FROM engine_documents WHERE status!='archived' AND title LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 30").bind(term).all();
   return c.json({data:[...documents.results,...matches.results,...files.results],note:'Căutare textuală în documente și cunoașterea AI. Sursele expirate necesită revizuire; nu se consumă un apel de model.'});
  }
  if(center==='visits'){
   const days=Number(c.req.query('days')||30);if(![7,30,90].includes(days))return c.json({error:{code:'invalid_period'}},400);
   const rows=await db.prepare(`SELECT date(created_at/1000,'unixepoch') day,COALESCE(path,page) page,COUNT(*) views,COUNT(DISTINCT session_id) visitors FROM page_events WHERE event='page_view' AND created_at>=? GROUP BY day,COALESCE(path,page) ORDER BY day DESC,views DESC LIMIT 200`).bind(t-days*86400000).all();
   const totals=await db.prepare(`SELECT COUNT(CASE WHEN event='page_view' THEN 1 END) views,COUNT(DISTINCT CASE WHEN event='page_view' THEN session_id END) visitors,COUNT(CASE WHEN event='generate_lead' THEN 1 END) leads,COUNT(CASE WHEN event='cta_click' THEN 1 END) cta_clicks FROM page_events WHERE created_at>=?`).bind(t-days*86400000).first();
   return c.json({data:rows.results,totals,period_days:days,note:'Trafic înregistrat cu consimțământ analytics; vizitatorii sunt sesiuni distincte, nu persoane identificate.'});
  }
  if(center==='privacy')return c.json({data:(await db.prepare('SELECT e.id,r.title,e.action,e.evidence,e.created_at FROM newsletter_consent_events e JOIN os_center_records r ON r.id=e.subscriber_id ORDER BY e.created_at DESC LIMIT 100').all()).results});
  if(center==='profitability'){
   const rows=await db.prepare(`WITH revenue AS (SELECT client_id,currency,SUM(gross_amount_minor) revenue,COUNT(CASE WHEN gross_amount_minor IS NULL THEN 1 END) missing FROM financial_revenues WHERE archived_at IS NULL AND status IN ('invoiced','sent','partially_paid','paid','overdue') GROUP BY client_id,currency),
   expense_rows AS (
    SELECT COALESCE(e.client_id,p.client_id) client_id,e.currency,e.gross_amount_minor amount FROM financial_expenses e LEFT JOIN projects p ON p.id=e.project_id WHERE e.archived_at IS NULL AND e.status NOT IN ('cancelled','archived','needs_configuration') AND NOT EXISTS(SELECT 1 FROM financial_expense_allocations WHERE expense_id=e.id)
    UNION ALL SELECT COALESCE(a.client_id,p.client_id),e.currency,COALESCE(a.amount_minor,ROUND(e.gross_amount_minor*a.percentage_basis_points/10000.0)) FROM financial_expense_allocations a JOIN financial_expenses e ON e.id=a.expense_id LEFT JOIN projects p ON p.id=a.project_id WHERE e.archived_at IS NULL AND e.status NOT IN ('cancelled','archived','needs_configuration')
   ), expense AS (SELECT client_id,currency,SUM(amount) cost,COUNT(CASE WHEN amount IS NULL THEN 1 END) missing FROM expense_rows GROUP BY client_id,currency),
   pairs AS (SELECT client_id,currency FROM revenue UNION SELECT client_id,currency FROM expense)
   SELECT c.id,c.company_name client,k.currency,r.revenue,e.cost,COALESCE(r.missing,0)+COALESCE(e.missing,0) incomplete_amounts,
   CASE WHEN r.revenue IS NOT NULL AND e.cost IS NOT NULL AND r.missing=0 AND e.missing=0 THEN r.revenue-e.cost ELSE NULL END margin,
   (SELECT COUNT(*) FROM services s JOIN projects p ON p.id=s.project_id WHERE p.client_id=c.id AND p.status!='archived') active_services
   FROM clients c LEFT JOIN pairs k ON k.client_id=c.id LEFT JOIN revenue r ON r.client_id=c.id AND r.currency=k.currency LEFT JOIN expense e ON e.client_id=c.id AND e.currency=k.currency
   WHERE c.status!='archived' ORDER BY c.company_name LIMIT 200`).all();
   const contracts=await db.prepare("SELECT client_id,currency,SUM(amount_minor) contract_value FROM operation_records WHERE kind='contract' AND archived_at IS NULL AND status IN ('approved','active','done') GROUP BY client_id,currency").all();
   const effort=await db.prepare("SELECT client_id,SUM(json_extract(data_json,'$.minutes')) minutes,SUM(ROUND(json_extract(data_json,'$.minutes')*json_extract(data_json,'$.hourly_cost_minor')/60.0)) estimated_labor_ron_minor FROM os_center_records WHERE kind='profitability' AND status!='archived' GROUP BY client_id").all();
   return c.json({data:rows.results,contracts:contracts.results,effort:effort.results,note:'Marjă documentată = venit facturat minus cheltuieli în aceeași monedă. Costurile necunoscute nu sunt zero. Orele și costul muncii sunt estimări separate în RON; nu se dublează în marjă.'});
  }
  if(['deliverables','onboarding','offboarding'].includes(center)){
   const kind=center==='deliverables'?'deliverable':center;
   const principal=await platformRoleForUser(db,c.get('userId'));
   const rows=await db.prepare(`SELECT w.*,p.name project FROM project_work_items w JOIN projects p ON p.id=w.project_id
    WHERE w.kind=? AND p.status!='archived' AND (?=1 OR p.organization_id IS NULL OR p.owner_user_id=?
    OR EXISTS(SELECT 1 FROM project_staff WHERE project_id=p.id AND user_id=?)
    OR EXISTS(SELECT 1 FROM organization_memberships WHERE organization_id=p.organization_id AND user_id=? AND status='active'))
    ORDER BY w.due_at IS NULL,w.due_at,w.id LIMIT 300`).bind(kind,principal?1:0,c.get('userId'),c.get('userId'),c.get('userId')).all();
   const data=rows.results;
   return c.json({data});
  }
  return c.json({error:{code:'unknown_report'}},404);
 });
 router.post('/api/centers/infrastructure/probe',async c=>{
  if(!await centerAllowed(c,'infrastructure',true))return denied(c);
  if(!(await checkRateLimit(c.env.DB,[{key:`health-probe:${c.get('userId')}`,limit:6,windowSec:3600}])).ok)return c.json({error:{code:'rate_limited'}},429);
  const results:{service:string;status:string;detail:string}[]=[{service:'auth',status:'ok',detail:'Sesiune validată pentru această cerere.'},{service:'workers',status:'ok',detail:'Workerul API a răspuns cererii autentificate.'}];
  for(const [service,probe] of [ ['d1',()=>c.env.DB.prepare('SELECT 1').first()],['files',()=>c.env.FILES.list({limit:1})],['media',()=>c.env.MEDIA.list({limit:1})],['kv',()=>c.env.KV.get('os-health-probe')] ] as const){
   try{await probe();results.push({service,status:'ok',detail:'Citire reușită prin binding.'});}catch{results.push({service,status:'error',detail:'Citirea resursei a eșuat.'});}
  }
  for(const [service,url] of [['avyron.ro','https://avyron.ro/'],['app','https://app.avyron.ro/'],['api','https://api.avyron.ro/api/health']] as const){
   try{const response=await fetch(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(5000)});await response.body?.cancel();results.push({service,status:response.status>=200&&response.status<400?'ok':'error',detail:`HTTP ${response.status} · probă publică`});}catch{results.push({service,status:'error',detail:'Proba HTTP nu a reușit în 5 secunde.'});}
  }
  const t=Date.now();await c.env.DB.batch(results.map(r=>c.env.DB.prepare('INSERT INTO os_health_observations(service,status,detail,checked_at,source) VALUES (?,?,?,?,?) ON CONFLICT(service) DO UPDATE SET status=excluded.status,detail=excluded.detail,checked_at=excluded.checked_at,source=excluded.source').bind(r.service,r.status,r.detail,t,'manual_probe')));
  return c.json({ok:true});
 });
 router.patch('/api/centers/approvals/:id',async c=>{
  if(!await centerAllowed(c,'approvals',true))return denied(c);
  const b=z.object({summary:z.string().trim().min(1).max(1000),request:z.record(z.string(),z.unknown()),revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return c.json({error:{code:'invalid_input'}},400);
  const event=crypto.randomUUID(),t=Date.now();
  const results=await c.env.DB.batch([
   c.env.DB.prepare("INSERT INTO security_events(id,actor_user_id,actor_type,action,target_id,outcome,severity,created_at) SELECT ?,?,'user','ai.approval.edited',id,'allowed','info',? FROM ai_approvals WHERE id=? AND status='pending' AND expires_at>? AND revision=?").bind(event,c.get('userId'),t,c.req.param('id'),t,b.data.revision),
   c.env.DB.prepare('UPDATE ai_approvals SET summary=?,request_json=? WHERE id=? AND EXISTS(SELECT 1 FROM security_events WHERE id=?)').bind(b.data.summary,JSON.stringify(b.data.request),c.req.param('id'),event),
   c.env.DB.prepare("UPDATE ai_run_steps SET input_json=? WHERE id=(SELECT step_id FROM ai_approvals WHERE id=?) AND status='awaiting_approval' AND EXISTS(SELECT 1 FROM security_events WHERE id=?)").bind(JSON.stringify(b.data.request),c.req.param('id'),event),
  ]);
  return results[0].meta.changes?c.json({ok:true}):c.json({error:{code:'revision_conflict'}},409);
 });
}
