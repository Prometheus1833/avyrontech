import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AppBindings } from './types';
import { centerAllowed, staffPolicy } from './centerAccess';
import { platformRoleForUser } from './authorization';
import { centers, centerIds, departments, ownerOnly, type CenterId } from '../../../../src/shared/osCatalog';
import { checkRateLimit } from './antispam';
import { fail, audit, replay, write } from './centerPersistence';
import { mountDocumentHub } from './documentHub';
import { mountCommands } from './centerCommands';
import { sealCredential, openCredential } from './integrationAdapters';
import { mountCenterReports } from './centerReports';
import { canAccessProject } from './projects';
export const centersRouter=new Hono<AppBindings>();
type Ctx=Context<AppBindings>;
centersRouter.use('/api/centers/*',async(c,next)=>bodyLimit({maxSize:/^\/api\/centers\/documents\/[^/]+\/file$/.test(c.req.path)?10_100_000:65536})(c,next));
centersRouter.use('/api/centers/*',async(c,next)=>{
 c.header('Cache-Control','private, no-store');
 if(!c.get('roles')?.some(r=>r==='staff'||r==='admin'))return fail(c,'forbidden',403);
 if(!(await checkRateLimit(c.env.DB,[{key:`centers:${c.get('userId')}`,limit:600,windowSec:3600}])).ok)return c.json({error:{code:'rate_limited'}},429);
 if(!['GET','HEAD','OPTIONS'].includes(c.req.method)){
  if(!/^[A-Za-z0-9_.:-]{16,128}$/.test(c.req.header('idempotency-key')||''))return fail(c,'idempotency_key_required');
  // Replay only after endpoint-specific authorization, to avoid returning data after access revocation.
 }
 await next();
});
centersRouter.get('/api/centers/catalog',async c=>{
 const principal=await platformRoleForUser(c.env.DB,c.get('userId')),policy=await staffPolicy(c.env.DB,c.get('userId'));
 return c.json({policy,modules:centers.filter(m=>principal||(!ownerOnly.includes(m.id)&&policy.read.includes(m.id))).map(m=>({...m,canWrite:!!principal||policy.write.includes(m.id)})),superadmin:!!principal});
});
centersRouter.get('/api/centers/config',async c=>{
 const principal=await platformRoleForUser(c.env.DB,c.get('userId'));
 const projects=await c.env.DB.prepare(`SELECT p.id,p.name,p.client_id FROM projects p WHERE p.status!='archived' AND (?=1 OR p.owner_user_id=? OR EXISTS(SELECT 1 FROM project_staff WHERE project_id=p.id AND user_id=?) OR EXISTS(SELECT 1 FROM organization_memberships WHERE organization_id=p.organization_id AND user_id=? AND status='active' AND role IN ('owner','admin','manager','specialist')) OR (?=1 AND p.organization_id IS NULL)) ORDER BY p.name LIMIT 250`).bind(principal?1:0,c.get('userId'),c.get('userId'),c.get('userId'),c.get('roles').includes('admin')?1:0).all();
 const clients=(principal||await centerAllowed(c,'profitability')||await centerAllowed(c,'domains'))?await c.env.DB.prepare("SELECT id,company_name name FROM clients WHERE status!='archived' ORDER BY company_name LIMIT 250").all():{results:[]};
 const staff=await c.env.DB.prepare("SELECT id,COALESCE(display_name,'Membru') name FROM users WHERE disabled_at IS NULL AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=users.id AND role IN ('staff','admin')) ORDER BY name LIMIT 250").all();
 return c.json({projects:projects.results,clients:clients.results,staff:staff.results});
});
centersRouter.get('/api/centers/team/:id',async c=>{
 if(!await platformRoleForUser(c.env.DB,c.get('userId')))return fail(c,'forbidden',403);
 return c.json(await staffPolicy(c.env.DB,c.req.param('id')));
});
centersRouter.put('/api/centers/team/:id',async c=>{
 if(!await platformRoleForUser(c.env.DB,c.get('userId')))return fail(c,'forbidden',403);
 const prior=await replay(c);if(prior)return prior;
 const parsed=z.object({department:z.enum(departments),job_title:z.string().trim().max(120),read:z.array(z.string()).max(40),write:z.array(z.string()).max(40),revision:z.number().int().min(0)}).strict().safeParse(await c.req.json().catch(()=>null));
 if(!parsed.success)return fail(c,'invalid_input');const b=parsed.data;
 if([...b.read,...b.write].some(id=>!centerIds.includes(id as CenterId)||ownerOnly.includes(id as CenterId))||b.write.some(id=>!b.read.includes(id)))return fail(c,'invalid_permissions');
 if(!await c.env.DB.prepare("SELECT 1 FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=? AND u.disabled_at IS NULL AND r.role IN ('staff','admin')").bind(c.req.param('id')).first())return fail(c,'not_staff');
 const old=await staffPolicy(c.env.DB,c.req.param('id'));if(old.revision!==b.revision)return fail(c,'revision_conflict',409);
 const statement=b.revision===0?c.env.DB.prepare('INSERT INTO staff_dashboard_access(user_id,department,job_title,read_json,write_json,updated_by,updated_at) VALUES (?,?,?,?,?,?,?)').bind(c.req.param('id'),b.department,b.job_title,JSON.stringify([...new Set(b.read)]),JSON.stringify([...new Set(b.write)]),c.get('userId'),Date.now()):c.env.DB.prepare('UPDATE staff_dashboard_access SET department=?,job_title=?,read_json=?,write_json=?,updated_by=?,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE user_id=?').bind(b.department,b.job_title,JSON.stringify([...new Set(b.read)]),JSON.stringify([...new Set(b.write)]),c.get('userId'),Date.now(),b.revision,c.req.param('id'));
 return write(c,{ok:true},[statement,audit(c,'staff.permissions.updated',c.req.param('id'))]);
});
const nullableRef=z.string().min(1).max(100).nullable();
const date=z.number().int().min(0).max(8640000000000000).nullable();
const text=z.string().trim().max(1000).default('');
const amount=z.number().int().min(0).max(9e12).nullable().default(null);
const dataSchemas={
 domains:z.object({domain:z.string().trim().toLowerCase().regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/),dns:text,registrar:text,ownership:z.enum(['avyron','client']).default('avyron'),ssl_status:z.enum(['unknown','valid','warning','expired']).default('unknown'),ssl_expires_at:date.optional(),redirect:text,subdomains:text,dns_records:text,estimated_value_minor:amount,opportunity:text}),
 sla:z.object({category:z.enum(['response','delivery','support','wcag','incident']),warning_hours:z.number().int().min(1).max(720),evidence:text}),
 vault:z.object({asset_type:z.enum(['brand','document','credential','domain','other']),location:text,owner:text}),
 backup:z.object({resource:text,evidence:text,last_backup_at:date,last_restore_test_at:date,recovery_note:text}),
 security:z.object({category:z.enum(['incident','key','ssl','auth','wcag']),evidence:text}),
 profitability:z.object({minutes:z.number().int().min(0).max(1e7),hourly_cost_minor:amount,upsell:text,churn_risk:z.enum(['unknown','low','medium','high'])}),
 newsletter:z.object({email:z.string().trim().toLowerCase().email().max(254),consent_evidence:text,policy_version:text,source:text}),
};
type RecordKind=keyof typeof dataSchemas;
const recordSchema=z.object({title:z.string().trim().min(1).max(200),description:z.string().max(4000),status:z.enum(['draft','active','warning','resolved','archived','pending','subscribed','unsubscribed','recovery_requested']),client_id:nullableRef,project_id:nullableRef,assignee_id:nullableRef,due_at:date,data:z.record(z.string(),z.unknown()),revision:z.number().int().positive().optional()}).strict();
const columns='id,kind,title,description,status,client_id,project_id,assignee_id,due_at,data_json,revision,created_at,updated_at,secret_reference IS NOT NULL has_secret';
centersRouter.get('/api/centers/records/:kind',async c=>{
 const kind=c.req.param('kind')||'';if(!await centerAllowed(c,kind))return fail(c,'forbidden',403);
 if(!(kind in dataSchemas))return fail(c,'invalid_kind');
 const offset=Number(c.req.query('offset')||0);if(!Number.isSafeInteger(offset)||offset<0||offset>1e6)return fail(c,'invalid_pagination');
 const term=`%${(c.req.query('search')||'').slice(0,100).replace(/[\\%_]/g,'\\$&')}%`;
 const where="kind=? AND (title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')";
 const [rows,total]=await Promise.all([c.env.DB.prepare(`SELECT ${columns} FROM os_center_records WHERE ${where} ORDER BY status='archived',due_at IS NULL,due_at,id LIMIT 40 OFFSET ?`).bind(kind,term,term,offset).all<Record<string,unknown>>(),c.env.DB.prepare(`SELECT COUNT(*) n FROM os_center_records WHERE ${where}`).bind(kind,term,term).first<{n:number}>()]);
 return c.json({data:rows.results.map(({data_json,...r})=>({...r,data:JSON.parse(String(data_json))})),total:total?.n||0});
});
async function saveRecord(c:Ctx){
 const kind=c.req.param('kind')||'';if(!await centerAllowed(c,kind,true))return fail(c,'forbidden',403);
 if(!(kind in dataSchemas))return fail(c,'invalid_kind');const prior=await replay(c);if(prior)return prior;
 const parsed=recordSchema.safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return fail(c,'invalid_input');const b=parsed.data;
 const data=dataSchemas[kind as RecordKind].strict().safeParse(b.data);if(!data.success)return fail(c,'invalid_input');
 const allowed=kind==='newsletter'?['pending','subscribed','unsubscribed']:kind==='backup'?['draft','active','warning','resolved','archived','recovery_requested']:['draft','active','warning','resolved','archived'];
 if(!allowed.includes(b.status))return fail(c,'invalid_status');
 if(kind==='newsletter'&&b.status==='subscribed'&&(!b.data.consent_evidence||!b.data.policy_version))return fail(c,'consent_required');
 if(kind==='domains'&&data.data&&'ownership' in data.data&&data.data.ownership==='client'&&!b.client_id)return fail(c,'client_required');
 if(kind==='profitability'&&!b.client_id)return fail(c,'client_required');
 if(kind==='backup'&&['last_backup_at','last_restore_test_at'].some(key=>typeof b.data[key]==='number'&&Number(b.data[key])>Date.now()))return fail(c,'future_evidence');
 if(kind==='backup'&&b.status==='recovery_requested'&&!b.data.recovery_note)return fail(c,'recovery_reason_required');
 for(const [table,key] of [['clients','client_id'],['projects','project_id'],['users','assignee_id']] as const){if(b[key]&&!await c.env.DB.prepare(`SELECT id FROM ${table} WHERE id=? ${table==='users'?'AND disabled_at IS NULL':''}`).bind(b[key]).first())return fail(c,'invalid_reference');}
 if(b.project_id&&b.client_id&&!await c.env.DB.prepare('SELECT id FROM projects WHERE id=? AND client_id=?').bind(b.project_id,b.client_id).first())return fail(c,'invalid_reference');
 const id=c.req.param('id')||crypto.randomUUID(),t=Date.now();
 if(c.req.param('id')){const old=await c.env.DB.prepare('SELECT revision FROM os_center_records WHERE id=? AND kind=?').bind(id,kind).first<{revision:number}>();if(!old)return fail(c,'not_found',404);if(old.revision!==b.revision)return fail(c,'revision_conflict',409);}
 const sql=c.req.param('id')?c.env.DB.prepare('UPDATE os_center_records SET title=?,description=?,status=?,client_id=?,project_id=?,assignee_id=?,due_at=?,data_json=?,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=? AND kind=?').bind(b.title,b.description,b.status,b.client_id,b.project_id,b.assignee_id,b.due_at,JSON.stringify(data.data),t,b.revision!,id,kind):c.env.DB.prepare('INSERT INTO os_center_records(id,kind,title,description,status,client_id,project_id,assignee_id,due_at,data_json,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,kind,b.title,b.description,b.status,b.client_id,b.project_id,b.assignee_id,b.due_at,JSON.stringify(data.data),c.get('userId'),t,t);
 const statements=[sql,audit(c,`center.${kind}.saved`,id)];
 if(kind==='newsletter')statements.push(c.env.DB.prepare('INSERT INTO newsletter_consent_events(id,subscriber_id,action,evidence,actor_id,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,b.status,JSON.stringify(data.data),c.get('userId'),t));
 return write(c,{id},statements);
}
centersRouter.post('/api/centers/records/:kind',saveRecord);
centersRouter.patch('/api/centers/records/:kind/:id',saveRecord);
centersRouter.post('/api/centers/vault/:id/secret',async c=>{
 if(!await centerAllowed(c,'vault',true))return fail(c,'forbidden',403);
 const prior=await replay(c);if(prior)return prior;
 const b=z.object({secret:z.string().min(1).max(8000),revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
 if(!c.env.MFA_ENCRYPTION_KEY)return fail(c,'vault_not_configured',503);
 const row=await c.env.DB.prepare("SELECT secret_reference,revision FROM os_center_records WHERE id=? AND kind='vault'").bind(c.req.param('id')).first<{secret_reference:string|null;revision:number}>();if(!row)return fail(c,'not_found',404);if(row.revision!==b.data.revision)return fail(c,'revision_conflict',409);
 const ref=`asset-vault:${crypto.randomUUID()}`;await c.env.KV.put(ref,await sealCredential(b.data.secret,c.env.MFA_ENCRYPTION_KEY,ref));
 try{const response=await write(c,{ok:true},[c.env.DB.prepare('UPDATE os_center_records SET secret_reference=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?').bind(ref,b.data.revision,c.req.param('id')),audit(c,'vault.secret.rotated',c.req.param('id'))]);
 const saved=await c.env.DB.prepare('SELECT secret_reference FROM os_center_records WHERE id=?').bind(c.req.param('id')).first<{secret_reference:string}>();if(saved?.secret_reference!==ref)await c.env.KV.delete(ref);else if(row.secret_reference)await c.env.KV.delete(row.secret_reference);return response;
 }catch(e){await c.env.KV.delete(ref);throw e;}
});
centersRouter.post('/api/centers/vault/:id/reveal',async c=>{
 if(!await centerAllowed(c,'vault',true))return fail(c,'forbidden',403);
 const b=z.object({reason:z.string().trim().min(5).max(200)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
 const row=await c.env.DB.prepare("SELECT secret_reference FROM os_center_records WHERE id=? AND kind='vault' AND status!='archived'").bind(c.req.param('id')).first<{secret_reference:string|null}>();if(!row?.secret_reference)return fail(c,'not_found',404);
 const sealed=await c.env.KV.get(row.secret_reference);if(!sealed)return fail(c,'not_found',404);
 await c.env.DB.prepare("INSERT INTO security_events(id,actor_user_id,actor_type,action,target_id,outcome,severity,metadata_json,created_at) VALUES (?,?,'user','vault.secret.revealed',?,'allowed','info',?,?)").bind(crypto.randomUUID(),c.get('userId'),c.req.param('id'),JSON.stringify({reason:b.data.reason}),Date.now()).run();
 return c.json({secret:await openCredential(sealed,c.env.MFA_ENCRYPTION_KEY,row.secret_reference)});
});
centersRouter.get('/api/centers/comments',async c=>{
 if(!await centerAllowed(c,'comments'))return fail(c,'forbidden',403);
 const status=c.req.query('status')||'pending';if(!['pending','approved','rejected','spam'].includes(status))return fail(c,'invalid_status');
 const rows=await c.env.DB.prepare('SELECT cm.id,cm.path,cm.content,cm.status,cm.revision,cm.created_at,COALESCE(u.display_name,\'Membru\') author FROM community_comments cm JOIN users u ON u.id=cm.author_id WHERE cm.status=? ORDER BY cm.created_at DESC LIMIT 100').bind(status).all();return c.json({data:rows.results});
});
centersRouter.patch('/api/centers/comments/:id',async c=>{
 if(!await centerAllowed(c,'comments',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
 const b=z.object({status:z.enum(['approved','rejected','spam','pending']),revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
 if(!await c.env.DB.prepare('SELECT id FROM community_comments WHERE id=? AND revision=?').bind(c.req.param('id'),b.data.revision).first())return fail(c,'revision_conflict',409);
 return write(c,{ok:true},[c.env.DB.prepare('UPDATE community_comments SET status=?,moderated_by=?,moderated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?').bind(b.data.status,c.get('userId'),Date.now(),b.data.revision,c.req.param('id')),audit(c,'comment.moderated',c.req.param('id'))]);
});
centersRouter.get('/api/centers/briefing',async c=>{
 const row=await c.env.DB.prepare('SELECT enabled,lookahead_days,include_finance FROM os_briefing_preferences WHERE user_id=?').bind(c.get('userId')).first();return c.json(row||{enabled:1,lookahead_days:7,include_finance:1});
});
centersRouter.put('/api/centers/briefing',async c=>{
 const b=z.object({enabled:z.boolean(),lookahead_days:z.number().int().min(1).max(30),include_finance:z.boolean()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');const prior=await replay(c);if(prior)return prior;
 return write(c,{ok:true},[c.env.DB.prepare('INSERT INTO os_briefing_preferences(user_id,enabled,lookahead_days,include_finance,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,lookahead_days=excluded.lookahead_days,include_finance=excluded.include_finance,updated_at=excluded.updated_at').bind(c.get('userId'),Number(b.data.enabled),b.data.lookahead_days,Number(b.data.include_finance),Date.now())]);
});
// Authenticated ingestion for future page comment UIs. New comments never publish immediately.
export const communityRouter=new Hono<AppBindings>();
communityRouter.post('/api/community/comments',bodyLimit({maxSize:8192}),async c=>{
 const b=z.object({path:z.string().regex(/^\/(?:blog|en\/blog)\/[a-z0-9-]+$/).max(250),content:z.string().trim().min(1).max(4000)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
 if(!(await checkRateLimit(c.env.DB,[{key:`comments:${c.get('userId')}`,limit:10,windowSec:3600}])).ok)return c.json({error:{code:'rate_limited'}},429);
 const id=crypto.randomUUID();await c.env.DB.prepare('INSERT INTO community_comments(id,path,author_id,content,created_at) VALUES (?,?,?,?,?)').bind(id,b.data.path,c.get('userId'),b.data.content,Date.now()).run();return c.json({id,status:'pending'},201);
});

mountCenterReports(centersRouter);
mountDocumentHub(centersRouter);
mountCommands(centersRouter);
centersRouter.post('/api/centers/checklists',async c=>{
 const b=z.object({project_id:z.string().min(1).max(100),kind:z.enum(['onboarding','offboarding']),due_at:date}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
 if(!await centerAllowed(c,b.data.kind,true)||!(await canAccessProject(c.env.DB,b.data.project_id,c.get('userId'),c.get('roles'))).write)return fail(c,'forbidden',403);
 const prior=await replay(c);if(prior)return prior;
 const titles=b.data.kind==='onboarding'?['Brief validat','Materiale și logo primite','Acces domeniu verificat','Conturi și texte primite','Factură avans verificată']:['Export date client','Predare cod și conturi','Transfer acces prin seif securizat','Documentație și backup predate','Confirmare predare și arhivare'];
 const t=Date.now();
 return write(c,{ok:true},[...titles.map(title=>c.env.DB.prepare(`INSERT INTO project_work_items(id,project_id,kind,title,status,due_at,created_by,created_at,updated_at) SELECT ?,?,?,?,'open',?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM project_work_items WHERE project_id=? AND kind=? AND title=?)`).bind(crypto.randomUUID(),b.data.project_id,b.data.kind,title,b.data.due_at,c.get('userId'),t,t,b.data.project_id,b.data.kind,title)),audit(c,'project.checklist.created',b.data.project_id)]);
});
