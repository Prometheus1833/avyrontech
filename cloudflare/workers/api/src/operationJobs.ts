import type { Env } from './types';
export const operationActions=['briefing','deadlines','health'] as const;
export type OperationAction=typeof operationActions[number];
export async function operationPreview(env:Env,action:OperationAction) {
  const timestamp=Date.now();
  if(action==='health'){
    const probes=await Promise.allSettled([
      env.DB.prepare('SELECT 1 ok').first(),
      env.FILES.list({limit:1}),env.MEDIA.list({limit:1}),env.KV.get('operations:health:read-only'),
    ]);
    return {checked_at:timestamp,probes:probes.map((probe,i)=>({service:['D1','R2 documents','R2 media','KV'][i],status:probe.status==='fulfilled'?'ok':'error'})),ai:'not_probed_to_avoid_model_usage',email:env.SMTP_PASS?'configured_delivery_unverified':'not_configured'};
  }
  const [work,records]=await Promise.all([
    env.DB.prepare("SELECT item.id,item.title,item.due_at,item.project_id FROM project_work_items item JOIN projects p ON p.id=item.project_id WHERE item.status IN ('open','in_progress','blocked') AND item.due_at<=? AND p.status!='archived' ORDER BY item.due_at LIMIT 100").bind(timestamp+7*86400000).all(),
    env.DB.prepare("SELECT id,kind,title,due_at,assignee_id FROM operation_records WHERE archived_at IS NULL AND status NOT IN ('done','cancelled') AND due_at<=? ORDER BY due_at LIMIT 100").bind(timestamp+7*86400000).all(),
  ]);
  if(action==='deadlines')return {generated_at:timestamp,work:work.results,records:records.results,limit_per_collection:100};
  const [leads,approvals,receipts]=await Promise.all([
    env.DB.prepare("SELECT COUNT(*) total FROM leads WHERE status NOT IN ('won','lost','archived')").first(),
    env.DB.prepare("SELECT COUNT(*) total FROM ai_approvals WHERE status='pending' AND expires_at>?").bind(timestamp).first(),
    env.DB.prepare('SELECT currency,SUM(amount_minor) amount_minor FROM financial_receipts WHERE paid_at>=? GROUP BY currency').bind(timestamp-30*86400000).all(),
  ]);
  return {generated_at:timestamp,open_leads:leads,approvals,receipts_30_days:receipts.results,work:work.results,records:records.results,source:'D1',limit_per_collection:100};
}
/** Claims use compare-and-swap; only the current lease may publish its result.
 * Jobs have no external writes. An expired lease may safely retry a read probe.
 */
export async function runOperationJobs(env:Env) {
  // Keep each drain bounded even on plans with a small D1 subrequest quota.
  const timestamp=Date.now();
  const due=await env.DB.prepare('SELECT id,action,next_run_at,interval_minutes FROM operation_automations WHERE enabled=1 AND next_run_at<=? ORDER BY next_run_at LIMIT 3').bind(timestamp).all<{id:string;action:OperationAction;next_run_at:number;interval_minutes:number}>();
  for(const item of due.results){
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO operation_jobs(id,automation_id,action,deduplication_key,available_at,created_at) SELECT ?,id,action,?, ?,? FROM operation_automations WHERE id=? AND enabled=1 AND next_run_at=?")
        .bind(crypto.randomUUID(),`scheduled:${item.id}:${item.next_run_at}`,timestamp,timestamp,item.id,item.next_run_at),
      env.DB.prepare('UPDATE operation_automations SET next_run_at=?,updated_at=? WHERE id=? AND enabled=1 AND next_run_at=?').bind(timestamp+item.interval_minutes*60000,timestamp,item.id,item.next_run_at),
    ]);
  }
  const jobs=await env.DB.prepare("SELECT id,action,attempts,automation_id FROM operation_jobs WHERE (status='queued' AND available_at<=?) OR (status='running' AND locked_until<?) ORDER BY created_at LIMIT 3").bind(timestamp,timestamp).all<{id:string;action:OperationAction;attempts:number;automation_id:string|null}>();
  for(const job of jobs.results){
    const lease=crypto.randomUUID();
    const claim=await env.DB.prepare("UPDATE operation_jobs SET status='running',lease_token=?,locked_until=?,attempts=attempts+1 WHERE id=? AND attempts<3 AND ((status='queued' AND available_at<=?) OR (status='running' AND locked_until<?))").bind(lease,timestamp+120000,job.id,timestamp,timestamp).run();
    if(!claim.meta.changes)continue;
    try{
      const result=await operationPreview(env,job.action),completed=Date.now();
      await env.DB.batch([
        env.DB.prepare("UPDATE operation_jobs SET status='succeeded',result_json=?,completed_at=?,locked_until=NULL,error_code=NULL WHERE id=? AND status='running' AND lease_token=?").bind(JSON.stringify(result),completed,job.id,lease),
        env.DB.prepare(`INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at)
          SELECT lower(hex(randomblob(16))),u.id,?,?,'Raportul este disponibil în Centrul de operațiuni.','operations',?
          FROM users u JOIN platform_principals p ON p.email=u.email COLLATE NOCASE
          WHERE p.status='active' AND u.disabled_at IS NULL AND EXISTS (SELECT 1 FROM operation_jobs WHERE id=? AND status='succeeded' AND lease_token=?)`)
          .bind(`job:${job.id}`,job.action==='briefing'?'AVY Briefing disponibil':job.action==='deadlines'?'Raport de termene disponibil':'Verificarea infrastructurii este disponibilă',completed,job.id,lease),
      ]);
    }catch{
      await env.DB.prepare("UPDATE operation_jobs SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,available_at=?,locked_until=NULL,error_code='operation_failed' WHERE id=? AND status='running' AND lease_token=?").bind(Date.now()+60000*2**job.attempts,job.id,lease).run();
    }
  }
  await env.DB.prepare("UPDATE operation_jobs SET status='failed',error_code='lease_exhausted',locked_until=NULL WHERE status='running' AND attempts>=3 AND locked_until<?").bind(Date.now()).run();
}
