import type {Hono} from 'hono';
import {z} from 'zod';
import type {AppBindings,Env} from './types';
import {centerAllowed} from './centerAccess';
import {purgeBackups} from './backupStorage';
import {audit,fail,replay,write} from './centerPersistence';
export type BackupSettings={enabled:number;account_id:string|null;interval_hours:number;retention_days:number;keep_count:number;max_bytes:number;include_files:number;include_media:number;next_run_at:number|null;revision:number};
export type BackupRun={id:string;status:string;protected:number;requested_baseline:number;config_json:string;sql_key:string|null;manifest_key:string|null;bytes:number;objects_count:number;created_at:number;completed_at:number|null};
export function retentionCandidates(runs:BackupRun[],settings:BackupSettings,now=Date.now()){
 const complete=runs.filter(r=>r.status==='complete').sort((a,b)=>b.created_at-a.created_at);const keep=new Set(complete.slice(0,settings.keep_count).map(r=>r.id));
 return runs.filter(r=>!r.protected&&!keep.has(r.id)&&['complete','failed','deleting'].includes(r.status)&&(r.status==='deleting'||r.created_at<now-settings.retention_days*86400000));
}
export async function startBackup(env:Env,id:string){try{await env.BACKUP_WORKFLOW.create({id,params:{runId:id}});}catch{const instance=await env.BACKUP_WORKFLOW.get(id);const state=await instance.status();if(['errored','terminated'].includes(state.status))await env.DB.prepare("UPDATE backup_runs SET status='failed',error_code='workflow_stopped',completed_at=? WHERE id=? AND status IN ('queued','running')").bind(Date.now(),id).run();}}
export async function scheduleBackups(env:Env){
 const policy=await env.DB.prepare("SELECT * FROM backup_settings WHERE id='default'").first<BackupSettings>();if(policy)await purgeBackups(env,policy);
 const active=await env.DB.prepare("SELECT id FROM backup_runs WHERE status IN ('queued','running') LIMIT 1").first<{id:string}>();if(active){await startBackup(env,active.id);return;}
 const s=await env.DB.prepare("SELECT * FROM backup_settings WHERE id='default'").first<BackupSettings>();if(!s?.enabled||!s.account_id||!s.next_run_at||s.next_run_at>Date.now())return;
 if(!await env.DB.prepare("SELECT 1 FROM os_accounts WHERE id=? AND provider='cloudflare' AND status='verified' AND (expires_at IS NULL OR expires_at>?)").bind(s.account_id,Date.now()).first())return;
 const id=crypto.randomUUID(),t=Date.now();try{await env.DB.batch([env.DB.prepare("INSERT INTO backup_runs(id,schedule_key,status,config_json,created_at) VALUES (?,?,'queued',?,?)").bind(id,`schedule:${s.next_run_at}`,JSON.stringify(s),t),env.DB.prepare("UPDATE backup_settings SET next_run_at=? WHERE id='default' AND revision=?").bind(t+s.interval_hours*3600000,s.revision)]);}catch{return;}await startBackup(env,id);
}
export function mountBackups(router:Hono<AppBindings>){
 router.get('/api/centers/backups',async c=>{
  if(!await centerAllowed(c,'backup'))return fail(c,'forbidden',403);
  const [settings,runs,accounts]=await Promise.all([c.env.DB.prepare("SELECT * FROM backup_settings WHERE id='default'").first(),c.env.DB.prepare('SELECT id,status,protected,requested_baseline,bytes,objects_count,error_code,created_at,completed_at,verified_at,restore_evidence FROM backup_runs ORDER BY created_at DESC LIMIT 100').all(),c.env.DB.prepare("SELECT id,label,status FROM os_accounts WHERE provider='cloudflare' AND status!='disabled'").all()]);return c.json({settings,runs:runs.results,accounts:accounts.results});
 });
 router.put('/api/centers/backups/settings',async c=>{
  if(!await centerAllowed(c,'backup',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const p=z.object({enabled:z.boolean(),account_id:z.string().nullable(),interval_hours:z.union([z.literal(6),z.literal(12),z.literal(24),z.literal(168)]),retention_days:z.number().int().min(7).max(365),keep_count:z.number().int().min(2).max(100),max_bytes:z.number().int().min(10485760).max(107374182400),include_files:z.boolean(),include_media:z.boolean(),revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!p.success)return fail(c,'invalid_input');const b=p.data;
  if((b.enabled||b.account_id)&&!await c.env.DB.prepare("SELECT 1 FROM os_accounts WHERE id=? AND provider='cloudflare' AND status='verified'").bind(b.account_id).first())return fail(c,'verified_cloudflare_account_required');
  return write(c,{ok:true},[c.env.DB.prepare("UPDATE backup_settings SET enabled=?,account_id=?,interval_hours=?,retention_days=?,keep_count=?,max_bytes=?,include_files=?,include_media=?,next_run_at=?,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id='default'").bind(Number(b.enabled),b.account_id,b.interval_hours,b.retention_days,b.keep_count,b.max_bytes,Number(b.include_files),Number(b.include_media),b.enabled?Date.now()+b.interval_hours*3600000:null,Date.now(),b.revision),audit(c,'backup.settings.updated','default')]);
 });
 router.post('/api/centers/backups',async c=>{
  if(!await centerAllowed(c,'backup',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const p=z.object({baseline:z.boolean(),acknowledge_export_pause:z.literal(true)}).strict().safeParse(await c.req.json().catch(()=>null));if(!p.success)return fail(c,'export_pause_acknowledgement_required');
  const s=await c.env.DB.prepare("SELECT * FROM backup_settings WHERE id='default'").first<BackupSettings>();if(!s?.account_id||!await c.env.DB.prepare("SELECT 1 FROM os_accounts WHERE id=? AND provider='cloudflare' AND status='verified'").bind(s.account_id).first())return fail(c,'verified_cloudflare_account_required');
  if(await c.env.DB.prepare("SELECT 1 FROM backup_runs WHERE status IN ('queued','running','deleting')").first())return fail(c,'backup_in_progress',409);
  const id=crypto.randomUUID();const response=await write(c,{id},[c.env.DB.prepare("INSERT INTO backup_runs(id,requested_by,status,requested_baseline,config_json,created_at) VALUES (?,?,'queued',?,?,?)").bind(id,c.get('userId'),Number(p.data.baseline),JSON.stringify(s),Date.now()),audit(c,'backup.requested',id)]);
  if(response.status===200)c.executionCtx.waitUntil(startBackup(c.env,id));return response;
 });
 router.post('/api/centers/backups/:id/verify',async c=>{
  if(!await centerAllowed(c,'backup',true))return fail(c,'forbidden',403);
  const run=await c.env.DB.prepare("SELECT * FROM backup_runs WHERE id=? AND status='complete'").bind(c.req.param('id')).first<BackupRun>();if(!run?.sql_key||!run.manifest_key)return fail(c,'complete_backup_required');
  const [sql,manifest,credentials,keys]=await Promise.all([c.env.FILES.head(run.sql_key),c.env.FILES.head(run.manifest_key),c.env.FILES.head(`os-backups/${run.id}/credentials.json`),c.env.DB.prepare('SELECT blob_key,size_bytes FROM backup_objects WHERE run_id=? LIMIT 2001').bind(run.id).all<{blob_key:string;size_bytes:number}>()]);
  if(keys.results.length>2000)return fail(c,'use_manifest_for_large_inventory');if(!sql||!manifest||!credentials)return fail(c,'backup_object_missing');if(keys.results.length!==run.objects_count||sql.size!==run.bytes-keys.results.reduce((sum,r)=>sum+r.size_bytes,0))return fail(c,'backup_object_missing_or_changed');
  for(const item of keys.results){const object=await c.env.FILES.head(item.blob_key);if(!object||object.size!==item.size_bytes)return fail(c,'backup_object_missing_or_changed');}
  await c.env.DB.batch([c.env.DB.prepare('UPDATE backup_runs SET verified_at=? WHERE id=?').bind(Date.now(),run.id),audit(c,'backup.inventory.verified',run.id)]);return c.json({ok:true,scope:'Inventar verificat; nu este un test de restaurare.'});
 });
 router.get('/api/centers/backups/:id/download/:kind',async c=>{
  if(!await centerAllowed(c,'backup',true))return fail(c,'forbidden',403);
  const row=await c.env.DB.prepare("SELECT sql_key,manifest_key FROM backup_runs WHERE id=? AND status='complete'").bind(c.req.param('id')).first<BackupRun>();const key=c.req.param('kind')==='sql'?row?.sql_key:c.req.param('kind')==='manifest'?row?.manifest_key:null;if(!key)return fail(c,'not_found',404);const obj=await c.env.FILES.get(key);if(!obj)return fail(c,'not_found',404);
  await audit(c,'backup.downloaded',c.req.param('id')).run();return new Response(obj.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="avyron-backup-${c.req.param('kind')==='sql'?'data.sql':'manifest.json'}"`,'Cache-Control':'private, no-store'}});
 });
 router.post('/api/centers/backups/:id/restore-evidence',async c=>{
  if(!await centerAllowed(c,'backup',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const b=z.object({evidence:z.string().trim().min(20).max(2000)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'restore_evidence_required');
  if(!await c.env.DB.prepare("SELECT 1 FROM backup_runs WHERE id=? AND status='complete'").bind(c.req.param('id')).first())return fail(c,'complete_backup_required');
  return write(c,{ok:true},[c.env.DB.prepare('UPDATE backup_runs SET restore_evidence=? WHERE id=?').bind(b.data.evidence,c.req.param('id')),audit(c,'backup.restore.evidence',c.req.param('id'))]);
 });
}
