import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AppBindings } from '../types';
import { platformRoleForUser } from '../authorization';
import { centerAllowed } from '../centerAccess';
import { audit } from '../centerPersistence';
import { randomHex,sha256 } from '../security';
import { templateSchema, surveyPath, deterministicBrief, type Answers } from '../../../../../src/shared/surveys/engine';
import { canAccess, createSurvey, error, event, getSurvey, getResponse, getTemplate, id, readJson, type Ctx, type SurveyRow, type FileRow } from './data';
import { fileResponse } from './files';
import { generateSurveyAi, purgeSurvey, processSurveyEvents } from './tasks';
export const surveyAdmin=new Hono<AppBindings>();
const root='/api/survey-admin';
surveyAdmin.use(`${root}/*`,bodyLimit({maxSize:180000,onError:c=>c.json({error:{code:'payload_too_large'}},413)}));
surveyAdmin.use(`${root}/*`,async(c,next)=>{if(!await centerAllowed(c,'surveys',!['GET','HEAD'].includes(c.req.method)))return error(c,'forbidden',403);c.header('Cache-Control','private, no-store');await next();});
const manager=async(c:Ctx)=>!!await platformRoleForUser(c.env.DB,c.get('userId'))||c.get('roles').includes('admin');
const owner=async(c:Ctx)=>await platformRoleForUser(c.env.DB,c.get('userId'))==='platform_owner';
async function record(c:Ctx,write=false){const s=await getSurvey(c.env.DB,c.req.param('id')||'');return s&&await canAccess(c,s,write)?s:null;}
// Match the same parent precedence as canAccess without per-row database requests.
const scope=`CASE
 WHEN s.project_id IS NOT NULL THEN s.project_id IN(SELECT p.id FROM projects p WHERE p.owner_user_id=? OR p.id IN(SELECT project_id FROM project_staff WHERE user_id=?) OR p.organization_id IN(SELECT organization_id FROM organization_memberships WHERE user_id=? AND status='active'))
 WHEN s.organization_id IS NOT NULL THEN s.organization_id IN(SELECT organization_id FROM organization_memberships WHERE user_id=? AND status='active')
 WHEN s.client_id IS NOT NULL THEN s.client_id IN(SELECT client_id FROM client_account_access WHERE user_id=?)
 WHEN s.lead_id IS NOT NULL THEN s.lead_id IN(SELECT lead_id FROM lead_assignments WHERE user_id=?)
 ELSE s.created_by=? END`;
async function list(c:Ctx){const global=!!await platformRoleForUser(c.env.DB,c.get('userId')),u=c.get('userId');const clauses=global?[]:[`(${scope})`],values:string[]=global?[]:Array(7).fill(u);for(const key of ['lead','client','project'] as const){const value=c.req.query(key);if(value){clauses.push(`s.${key}_id=?`);values.push(value);}}return (await c.env.DB.prepare(`SELECT s.* FROM surveys s ${clauses.length?'WHERE '+clauses.join(' AND '):''} ORDER BY s.updated_at DESC LIMIT 100`).bind(...values).all<SurveyRow>()).results;}
surveyAdmin.get(`${root}/surveys`,async c=>{const data=await list(c);const lead=c.req.query('lead'),client=c.req.query('client'),project=c.req.query('project');return c.json({data:data.filter(s=>(!lead||s.lead_id===lead)&&(!client||s.client_id===client)&&(!project||s.project_id===project)).map(({context_json:_,...s})=>s)});});
surveyAdmin.get(`${root}/templates`,async c=>{const {results}=await c.env.DB.prepare('SELECT t.*,v.version,v.schema_json FROM survey_templates t JOIN survey_versions v ON v.id=t.current_version_id ORDER BY t.title').all();return c.json({data:results,canManage:await manager(c)});});
surveyAdmin.post(`${root}/templates`,async c=>{
 if(!await manager(c))return error(c,'forbidden',403);
 const b=z.object({id:z.string().max(100).optional(),baseVersion:z.number().int().positive().optional(),template:z.unknown(),active:z.boolean()}).strict().safeParse(await readJson(c));if(!b.success)return c.json({error:{code:'invalid_template',message:b.error.issues.map(i=>i.message).join(' ')}},400);
 const parsedTemplate=templateSchema.safeParse(b.data.template);if(!parsedTemplate.success)return error(c,'invalid_template');const published=parsedTemplate.data;
 const templateId=b.data.id||id(),versionId=id(),timestamp=Date.now();const existing=await c.env.DB.prepare('SELECT v.version FROM survey_templates t JOIN survey_versions v ON v.id=t.current_version_id WHERE t.id=?').bind(templateId).first<{version:number}>();if(existing&&b.data.baseVersion!==existing.version)return error(c,'revision_conflict',409);
 try{await c.env.DB.batch([
  ...(!existing?[c.env.DB.prepare('INSERT INTO survey_templates(id,title,active,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind(templateId,published.title,b.data.active?1:0,c.get('userId'),timestamp,timestamp)]:[]),
  c.env.DB.prepare('INSERT INTO survey_versions(id,template_id,version,schema_json,created_by,created_at) VALUES (?,?,?,?,?,?)').bind(versionId,templateId,(existing?.version||0)+1,JSON.stringify(published),c.get('userId'),timestamp),
  c.env.DB.prepare('UPDATE survey_templates SET title=?,active=?,current_version_id=?,updated_at=? WHERE id=?').bind(published.title,b.data.active?1:0,versionId,timestamp,templateId),audit(c,'survey.template.published',templateId),
 ]);}catch(e){if(String(e).includes('UNIQUE'))return error(c,'revision_conflict',409);throw e;}return c.json({id:templateId,version:(existing?.version||0)+1});
});
const links=z.object({lead_id:z.string().max(100).nullable().default(null),client_id:z.string().max(100).nullable().default(null),project_id:z.string().max(100).nullable().default(null)});
async function resolveLinks(c:Ctx,input:z.infer<typeof links>){
 const out={...input,organization_id:null as string|null,created_by:c.get('userId')},context:Answers={};
 if(input.project_id){const p=await c.env.DB.prepare('SELECT client_id,organization_id FROM projects WHERE id=?').bind(input.project_id).first<{client_id:string;organization_id:string|null}>();if(!p||input.client_id&&p.client_id!==input.client_id)return null;out.client_id=p.client_id;out.organization_id=p.organization_id;}
 if(out.client_id){const cl=await c.env.DB.prepare('SELECT company_name,contact_name,email,phone FROM clients WHERE id=?').bind(out.client_id).first<Record<string,string>>();if(!cl)return null;Object.assign(context,{business:cl.company_name,name:cl.contact_name,email:cl.email,phone:cl.phone});}
 if(input.lead_id){const l=await c.env.DB.prepare('SELECT name,business,email,phone,website,organization_id,converted_project_id FROM leads WHERE id=?').bind(input.lead_id).first<Record<string,string>>();if(!l)return null;if(out.project_id&&l.converted_project_id!==out.project_id)return null;if(out.organization_id&&l.organization_id&&out.organization_id!==l.organization_id)return null;out.organization_id=l.organization_id||out.organization_id;for(const key of ['name','business','email','phone','website'])if(l[key])context[key]=l[key];if(l.website)context.website_exists=true;}
 if(!await canAccess(c,out,true))return null;
 // Every explicitly linked entity requires permission, even when another parent grants access.
 for(const type of ['lead_id','client_id','project_id'] as const)if(input[type]&&!await canAccess(c,{lead_id:null,client_id:null,project_id:null,organization_id:null,created_by:c.get('userId'),[type]:out[type]},true))return null;
 for(const key of Object.keys(context))if(!context[key])delete context[key];return {links:out,context};
}
surveyAdmin.post(`${root}/surveys`,async c=>{
 const b=links.extend({template:z.string().max(100),title:z.string().min(2).max(160).optional(),expires_days:z.number().int().min(1).max(365).nullable().default(30),mode:z.enum(['resume','one_time','authenticated']).default('resume'),user_id:z.string().max(100).nullable().default(null)}).strict().safeParse(await readJson(c));if(!b.success)return error(c,'invalid_input');
 const related=await resolveLinks(c,b.data);if(!related)return error(c,'relation_scope_denied',403);
 if(b.data.mode==='authenticated'&&(!b.data.user_id||!await c.env.DB.prepare('SELECT 1 FROM users WHERE id=? AND disabled_at IS NULL').bind(b.data.user_id).first()))return error(c,'user_required');
 const t=await c.env.DB.prepare('SELECT title,current_version_id FROM survey_templates WHERE id=? AND active=1').bind(b.data.template).first<{title:string;current_version_id:string}>();if(!t)return error(c,'template_unavailable',404);
 const result=await createSurvey(c.env,{version:t.current_version_id,title:b.data.title||t.title,actor:c.get('userId'),lead:related.links.lead_id,client:related.links.client_id,project:related.links.project_id,organization:related.links.organization_id,context:related.context,expires:b.data.expires_days?Date.now()+b.data.expires_days*86400000:null,mode:b.data.mode,user:b.data.user_id});await audit(c,'survey.created',result.id).run();return c.json(result,201);
});
surveyAdmin.get(`${root}/surveys/:id`,async c=>{
 const s=await record(c);if(!s)return error(c,'not_found',404);const [template,response,files,briefs,deliveries]=await Promise.all([getTemplate(c.env.DB,s.version_id),getResponse(c.env.DB,s.id),c.env.DB.prepare("SELECT id,question_id,original_filename,mime_type,size,created_at FROM survey_files WHERE survey_id=? AND status='ready'").bind(s.id).all(),c.env.DB.prepare('SELECT * FROM survey_briefs WHERE survey_id=? ORDER BY created_at DESC').bind(s.id).all(),c.env.DB.prepare("SELECT id,event_type,status,attempts,last_error,created_at FROM outbox_events WHERE aggregate_type='survey' AND aggregate_id=? ORDER BY created_at DESC").bind(s.id).all()]);return c.json({survey:s,template,answers:JSON.parse(response.answers_json),responseRevision:response.revision,files:files.results,briefs:briefs.results,deliveries:deliveries.results,canEdit:await canAccess(c,s,true)});
});
surveyAdmin.patch(`${root}/surveys/:id/links`,async c=>{const s=await record(c,true);if(!s)return error(c,'not_found',404);const b=links.extend({revision:z.number().int().positive()}).strict().safeParse(await readJson(c));if(!b.success)return error(c,'invalid_input');const resolved=await resolveLinks(c,b.data);if(!resolved)return error(c,'relation_scope_denied',403);const r=await c.env.DB.prepare('UPDATE surveys SET lead_id=?,client_id=?,project_id=?,organization_id=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(resolved.links.lead_id,resolved.links.client_id,resolved.links.project_id,resolved.links.organization_id,Date.now(),s.id,b.data.revision).run();if(!r.meta.changes)return error(c,'revision_conflict',409);await audit(c,'survey.linked',s.id).run();return c.json({ok:true});});
surveyAdmin.post(`${root}/surveys/:id/action`,async c=>{
 const s=await record(c,true);if(!s)return error(c,'not_found',404);
 const b=z.object({action:z.enum(['expire','archive','ready','sent','duplicate','rotate','followup','ai','retry-email']),revision:z.number().int().positive(),questions:z.array(z.string().max(100)).max(150).optional()}).strict().safeParse(await readJson(c));if(!b.success)return error(c,'invalid_input');if(s.revision!==b.data.revision)return error(c,'revision_conflict',409);
 if(b.data.action==='duplicate')return c.json(await createSurvey(c.env,{version:s.version_id,title:s.title,actor:c.get('userId'),lead:s.lead_id,client:s.client_id,project:s.project_id,organization:s.organization_id,context:JSON.parse(s.context_json)}),201);
 if(b.data.action==='ai')return c.json(await generateSurveyAi(c.env,s.id,c.get('userId')));
 if(b.data.action==='retry-email'){await c.env.DB.prepare("UPDATE outbox_events SET status='pending',available_at=?,attempts=0,locked_at=NULL,lease_token=NULL WHERE aggregate_type='survey' AND aggregate_id=? AND status='dead'").bind(Date.now(),s.id).run();c.executionCtx.waitUntil(processSurveyEvents(c.env));return c.json({ok:true});}
 if(b.data.action==='rotate'){
  if(['archived','expired'].includes(s.status))return error(c,'survey_read_only',409);const token=randomHex(32),t=Date.now(),prior=await c.env.DB.prepare('SELECT mode,user_id FROM survey_sessions WHERE survey_id=? ORDER BY created_at DESC LIMIT 1').bind(s.id).first<{mode:string;user_id:string|null}>();
  await c.env.DB.batch([c.env.DB.prepare('UPDATE survey_sessions SET revoked_at=? WHERE survey_id=?').bind(t,s.id),c.env.DB.prepare('INSERT INTO survey_sessions(id,survey_id,token_hash,mode,user_id,expires_at,created_at) VALUES (?,?,?,?,?,?,?)').bind(id(),s.id,await sha256(token),prior?.mode||'resume',prior?.mode==='authenticated'?prior.user_id:null,s.expires_at,t),audit(c,'survey.link.rotated',s.id)]);return c.json({url:`https://surveys.avyron.ro/s/${token}`});
 }
 const states:Record<string,string>={expire:'expired',archive:'archived',ready:'ready',sent:'sent',followup:'needs_information'};
 if(b.data.action==='ready'&&!['draft','ready'].includes(s.status))return error(c,'invalid_transition',409);
 if(b.data.action==='sent'&&!['ready','sent','opened','in_progress'].includes(s.status))return error(c,'invalid_transition',409);
 if(b.data.action==='followup'){
  if(!['completed','reviewed','approved','needs_information'].includes(s.status))return error(c,'invalid_transition',409);const t=await getTemplate(c.env.DB,s.version_id),a=JSON.parse((await getResponse(c.env.DB,s.id)).answers_json),known=new Set(surveyPath(t,a).map(q=>q.id));if(!b.data.questions?.length||b.data.questions.some(q=>!known.has(q)))return error(c,'invalid_questions');
 }
 const result=await c.env.DB.prepare('UPDATE surveys SET status=?,followup_json=?,updated_at=?,sent_at=CASE WHEN ?=\'sent\' THEN ? ELSE sent_at END,revision=revision+1 WHERE id=? AND revision=?').bind(states[b.data.action],JSON.stringify(b.data.questions||[]),Date.now(),b.data.action,Date.now(),s.id,b.data.revision).run();if(!result.meta.changes)return error(c,'revision_conflict',409);
 if(b.data.action==='followup')await c.env.DB.prepare('UPDATE survey_responses SET revision=revision+1 WHERE survey_id=?').bind(s.id).run();
 if(['expire','archive'].includes(b.data.action))await c.env.DB.prepare('UPDATE survey_sessions SET revoked_at=? WHERE survey_id=?').bind(Date.now(),s.id).run();await audit(c,`survey.${b.data.action}`,s.id).run();return c.json({ok:true});
});
surveyAdmin.patch(`${root}/surveys/:id/brief`,async c=>{
 const s=await record(c,true);if(!s)return error(c,'not_found',404);const b=z.object({id:z.string(),revision:z.number().int().positive(),status:z.enum(['reviewed','approved']),text:z.string().min(10).max(24000),comment:z.string().max(2000)}).strict().safeParse(await readJson(c));if(!b.success)return error(c,'invalid_input');
 const brief=await c.env.DB.prepare('SELECT revision,response_revision,document_id FROM survey_briefs WHERE id=? AND survey_id=?').bind(b.data.id,s.id).first<{revision:number;response_revision:number;document_id:string|null}>();if(!brief||brief.revision!==b.data.revision)return error(c,'revision_conflict',409);if((await getResponse(c.env.DB,s.id)).revision!==brief.response_revision||!['completed','reviewed','approved'].includes(s.status))return error(c,'brief_outdated',409);
 const doc=brief.document_id||id(),timestamp=Date.now();
 // Atomic CAS guard: a stale reviewer cannot approve a different revision.
 try{await c.env.DB.batch([
  c.env.DB.prepare(`UPDATE survey_briefs SET revision=(SELECT b.revision+1 FROM survey_briefs b JOIN survey_responses r ON r.survey_id=b.survey_id JOIN surveys s ON s.id=b.survey_id WHERE b.id=? AND b.revision=? AND r.revision=b.response_revision AND s.status IN('completed','reviewed','approved')),status=?,approved_text=?,comment=?,approved_by=?,updated_at=?,document_id=? WHERE id=?`).bind(b.data.id,b.data.revision,b.data.status,b.data.text,b.data.comment,b.data.status==='approved'?c.get('userId'):null,timestamp,b.data.status==='approved'?doc:brief.document_id,b.data.id),
  ...(b.data.status==='approved'?[c.env.DB.prepare("INSERT INTO hub_documents(id,category,title,content_text,client_id,project_id,status,created_by,created_at,updated_at) VALUES (?,'brief',?,?,?,?,'approved',?,?,?) ON CONFLICT(id) DO UPDATE SET content_text=excluded.content_text,status='approved',revision=revision+1,client_id=excluded.client_id,project_id=excluded.project_id,updated_at=excluded.updated_at").bind(doc,s.title,b.data.text,s.client_id,s.project_id,c.get('userId'),timestamp,timestamp)]:[]),
  c.env.DB.prepare('UPDATE surveys SET status=?,reviewed_at=?,approved_at=?,revision=revision+1,updated_at=? WHERE id=?').bind(b.data.status,timestamp,b.data.status==='approved'?timestamp:null,timestamp,s.id),audit(c,`survey.brief.${b.data.status}`,s.id),
 ]);}catch(e){if(String(e).includes('NOT NULL'))return error(c,'revision_conflict',409);throw e;}return c.json({ok:true});
});
surveyAdmin.get(`${root}/surveys/:id/files/:file`,async c=>{const s=await record(c);if(!s)return error(c,'not_found',404);const f=await c.env.DB.prepare("SELECT * FROM survey_files WHERE id=? AND survey_id=? AND status='ready'").bind(c.req.param('file'),s.id).first<FileRow>();if(!f)return error(c,'not_found',404);const o=await c.env.FILES.get(f.storage_key);return o?fileResponse(f,o.body):error(c,'not_found',404);});
surveyAdmin.get(`${root}/surveys/:id/export`,async c=>{const s=await record(c);if(!s)return error(c,'not_found',404);const r=await getResponse(c.env.DB,s.id),t=await getTemplate(c.env.DB,s.version_id),consents=await c.env.DB.prepare('SELECT question_id,policy_version,value,created_at FROM survey_consents WHERE survey_id=?').bind(s.id).all();await audit(c,'survey.exported',s.id).run();return c.json({survey:s,brief:deterministicBrief(t,JSON.parse(r.answers_json)),consents:consents.results});});
surveyAdmin.delete(`${root}/surveys/:id`,async c=>{if(!await owner(c))return error(c,'forbidden',403);const s=await record(c,true);if(!s)return error(c,'not_found',404);await purgeSurvey(c.env,s);await audit(c,'survey.deleted',s.id).run();return c.json({ok:true});});
surveyAdmin.get(`${root}/analytics`,async c=>{
 const selected=await list(c);if(!selected.length)return c.json({totals:{created:0,sent:0,opened:0,started:0,completed:0,completionRate:0,averageSeconds:null},dropoff:[],limit:100});
 const ids=selected.map(s=>s.id),marks=ids.map(()=>'?').join(',');
 const totals=await c.env.DB.prepare(`SELECT COUNT(*) created,SUM(sent_at IS NOT NULL) sent,SUM(opened_at IS NOT NULL) opened,SUM(started_at IS NOT NULL) started,SUM(completed_at IS NOT NULL) completed,AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL THEN (completed_at-started_at)/1000.0 END) averageSeconds FROM surveys WHERE id IN(${marks})`).bind(...ids).first<Record<string,number|null>>();
 const dropoff=await c.env.DB.prepare(`SELECT e.question_id,e.section_id,COUNT(DISTINCT CASE WHEN e.kind='viewed' THEN e.survey_id END) viewed,COUNT(DISTINCT CASE WHEN e.kind='answered' THEN e.survey_id END) answered,COUNT(DISTINCT CASE WHEN e.kind='viewed' AND s.completed_at IS NULL AND NOT EXISTS(SELECT 1 FROM survey_events later WHERE later.survey_id=e.survey_id AND later.kind='viewed' AND later.created_at>e.created_at) THEN e.survey_id END) incomplete_events FROM survey_events e JOIN surveys s ON s.id=e.survey_id WHERE e.kind IN('viewed','answered') AND e.survey_id IN(${marks}) GROUP BY e.question_id,e.section_id ORDER BY viewed DESC`).bind(...ids).all();
 return c.json({totals:{...totals,completionRate:totals?.started?Math.round(Number(totals.completed)/totals.started*100):0},dropoff:dropoff.results,limit:100});
});
surveyAdmin.get(`${root}/campaigns`,async c=>{const global=await manager(c);const data=await c.env.DB.prepare(`SELECT * FROM survey_campaigns ${global?'':'WHERE created_by=?'} ORDER BY created_at DESC LIMIT 100`).bind(...(global?[]:[c.get('userId')])).all();return c.json({data:data.results});});
surveyAdmin.post(`${root}/campaigns`,async c=>{const b=z.object({name:z.string().min(2).max(160),template:z.string().max(100),id:z.string().max(100).optional(),active:z.boolean().default(true)}).strict().safeParse(await readJson(c));if(!b.success)return error(c,'invalid_input');if(!await c.env.DB.prepare('SELECT 1 FROM survey_templates WHERE id=? AND active=1').bind(b.data.template).first())return error(c,'template_unavailable');const cid=b.data.id||id();if(b.data.id&&!await manager(c)&&!await c.env.DB.prepare('SELECT 1 FROM survey_campaigns WHERE id=? AND created_by=?').bind(cid,c.get('userId')).first())return error(c,'forbidden',403);await c.env.DB.prepare('INSERT INTO survey_campaigns VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,template_id=excluded.template_id,active=excluded.active').bind(cid,b.data.name,b.data.template,b.data.active?1:0,c.get('userId'),Date.now()).run();return c.json({id:cid,url:`https://surveys.avyron.ro/?campaign=${cid}`});});
surveyAdmin.get(`${root}/settings`,async c=>{if(!await owner(c))return error(c,'forbidden',403);return c.json(await c.env.DB.prepare("SELECT * FROM survey_settings WHERE id='global'").first());});
surveyAdmin.put(`${root}/settings`,async c=>{if(!await owner(c))return error(c,'forbidden',403);const b=z.object({retention_days:z.number().int().min(7).max(1825),public_enabled:z.boolean(),ai_enabled:z.boolean()}).strict().safeParse(await readJson(c));if(!b.success)return error(c,'invalid_input');await c.env.DB.batch([c.env.DB.prepare("UPDATE survey_settings SET retention_days=?,public_enabled=?,ai_enabled=?,updated_at=? WHERE id='global'").bind(b.data.retention_days,b.data.public_enabled?1:0,b.data.ai_enabled?1:0,Date.now()),audit(c,'survey.settings.changed','global')]);return c.json({ok:true});});
surveyAdmin.get(`${root}/context-options`,async c=>{
 const type=c.req.query('type'),u=c.get('userId'),global=!!await platformRoleForUser(c.env.DB,u);let sql:string,values:string[]=[];
 if(type==='lead'){sql=`SELECT id,COALESCE(business,name,email,id) label FROM leads ${global?'':`WHERE id IN(SELECT lead_id FROM lead_assignments WHERE user_id=?) OR organization_id IN(SELECT organization_id FROM organization_memberships WHERE user_id=? AND status='active')`} ORDER BY updated_at DESC LIMIT 100`;if(!global)values=[u,u];}
 else if(type==='client'){sql=`SELECT id,company_name label FROM clients ${global?'':'WHERE id IN(SELECT client_id FROM client_account_access WHERE user_id=?)'} ORDER BY company_name LIMIT 100`;if(!global)values=[u];}
 else if(type==='project'){sql=`SELECT id,name label FROM projects ${global?'':`WHERE id IN(SELECT project_id FROM project_staff WHERE user_id=?) OR organization_id IN(SELECT organization_id FROM organization_memberships WHERE user_id=? AND status='active')`} ORDER BY name LIMIT 100`;if(!global)values=[u,u];}
 else return error(c,'invalid_type');return c.json({data:(await c.env.DB.prepare(sql).bind(...values).all()).results});
});
