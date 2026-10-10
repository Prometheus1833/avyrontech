import { presentationSchema } from '../../../../../src/shared/surveys/catalog';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AppBindings } from '../types';
import { checkRateLimit, clientIp, hashKey, verifyTurnstile } from '../antispam';
import { sha256 } from '../security';
import { surveyPath, evaluate, answerError, deterministicBrief, uploadTypes, type Answers } from '../../../../../src/shared/surveys/engine';
import { createSurvey, error, event, getTemplate, getResponse, publicAccess, editable, id, readJson, type Ctx, type FileRow } from './data';
import { inspectUpload, MAX_FILE, MAX_FILES, MAX_TOTAL, fileResponse } from './files';
import { processSurveyEvents, suggestSurveyText } from './tasks';
export const surveyPublic = new Hono<AppBindings>();
const root='/api/surveys';
surveyPublic.use(`${root}/*`,async(c,next)=>bodyLimit({maxSize:c.req.path===`${root}/files`?MAX_FILE:180000,onError:ctx=>ctx.json({error:{code:'payload_too_large'}},413)})(c,next));
surveyPublic.use(`${root}/*`,async(c,next)=>{
 c.header('Cache-Control','private, no-store');c.header('X-Robots-Tag','noindex, nofollow');c.header('Referrer-Policy','no-referrer');
 if(!['GET','HEAD','OPTIONS'].includes(c.req.method)){
  const origin=c.req.header('origin');if(origin&&!['https://surveys.avyron.ro','https://avyron.ro','https://app.avyron.ro',...c.env.ALLOWED_ORIGINS.split(',')].includes(origin))return error(c,'origin_denied',403);
  if(!c.req.path.endsWith('/files')&&Number(c.req.header('content-length')||0)>180000)return error(c,'payload_too_large',413);
 }
 const ip=await hashKey(clientIp(c.req.raw));const limit=await checkRateLimit(c.env.DB,[{key:`survey:ip:${ip}`,limit:300,windowSec:3600}],{limiter:c.env.PUBLIC_API_RATE_LIMITER,key:`survey:${ip}`});
 if(!limit.ok)return error(c,'rate_limited',429);await next();
});
surveyPublic.get(`${root}/templates`,async c=>{
 const campaignId=c.req.query('campaign');const campaign=campaignId?await c.env.DB.prepare('SELECT template_id FROM survey_campaigns WHERE id=? AND active=1').bind(campaignId).first<{template_id:string}>():null;
 if(campaignId&&!campaign)return error(c,'campaign_unavailable',404);
 const {results}=await c.env.DB.prepare("SELECT t.id,t.title,t.presentation_json,v.schema_json FROM survey_templates t JOIN survey_versions v ON v.id=t.current_version_id WHERE t.active=1 AND t.public_visible=1 ORDER BY CASE WHEN t.id='website' THEN 0 ELSE 1 END,t.title").all<{id:string;title:string;presentation_json:string;schema_json:string}>();
 if(campaign&&!results.some(r=>r.id===campaign.template_id))return error(c,'campaign_unavailable',404);
 return c.json({data:results.filter(r=>!campaign||r.id===campaign.template_id).map(r=>{const t=JSON.parse(r.schema_json);return {id:r.id,title:r.title,description:t.description,service:t.service,presentation:presentationSchema.parse(JSON.parse(r.presentation_json))};}),campaign:campaign?.template_id});
});
surveyPublic.post(`${root}/start`,async c=>{
 const input=z.object({template:z.string().max(100),campaign:z.string().max(100).optional(),turnstileToken:z.string().max(4000),requestKey:z.string().uuid(),attribution:z.record(z.string(),z.string().max(200)).optional(),website_url:z.string().max(200).optional()}).strict().safeParse(await readJson(c));
 if(!input.success)return error(c,'invalid_input');const b=input.data;if(b.website_url)return error(c,'invalid_input');
 // Server-derived token makes a retried start recoverable without storing a plaintext token.
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(c.env.JWT_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const token=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`survey-start:${b.requestKey}`))),v=>v.toString(16).padStart(2,'0')).join('');
 const previous=await c.env.DB.prepare('SELECT survey_id FROM survey_sessions WHERE token_hash=?').bind(await sha256(token)).first<{survey_id:string}>();if(previous)return c.json({id:previous.survey_id,token,url:`https://surveys.avyron.ro/s/${token}`});
 if(!(await c.env.DB.prepare("SELECT public_enabled FROM survey_settings WHERE id='global'").first<{public_enabled:number}>())?.public_enabled)return error(c,'temporarily_unavailable',503);
 const captcha=await verifyTurnstile(c.env.TURNSTILE_SECRET,b.turnstileToken,clientIp(c.req.raw),{expectedAction:'survey-start',allowedHostnames:c.env.TURNSTILE_ALLOWED_HOSTNAMES});if(!captcha.ok)return error(c,'captcha_failed',403);
 const ip=await hashKey(clientIp(c.req.raw));if(!(await checkRateLimit(c.env.DB,[{key:`survey:start:${ip}`,limit:12,windowSec:86400}])).ok)return error(c,'rate_limited',429);
 let template=b.template;
 if(b.campaign){const campaign=await c.env.DB.prepare('SELECT template_id FROM survey_campaigns WHERE id=? AND active=1').bind(b.campaign).first<{template_id:string}>();if(!campaign)return error(c,'campaign_unavailable',404);template=campaign.template_id;}
 const row=await c.env.DB.prepare('SELECT current_version_id,title FROM survey_templates WHERE id=? AND active=1 AND public_visible=1').bind(template).first<{current_version_id:string;title:string}>();if(!row)return error(c,'template_unavailable',404);
 const attribution=Object.fromEntries(Object.entries(b.attribution||{}).filter(([k])=>['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].includes(k)));
 return c.json(await createSurvey(c.env,{version:row.current_version_id,title:row.title,token,campaign:b.campaign,attribution}),201);
});
async function session(c:Ctx){const s=await publicAccess(c);return s;}
surveyPublic.get(`${root}/session`,async c=>{
 const s=await session(c);if(!s)return error(c,'link_unavailable',404);
 const [template,response,files]=await Promise.all([getTemplate(c.env.DB,s.version_id),getResponse(c.env.DB,s.id),c.env.DB.prepare("SELECT id,question_id,original_filename,mime_type,size,created_at FROM survey_files WHERE survey_id=? AND status='ready' ORDER BY created_at").bind(s.id).all()]);
 if(['ready','sent'].includes(s.status)){const opened=await c.env.DB.prepare("UPDATE surveys SET status='opened',opened_at=COALESCE(opened_at,?),updated_at=? WHERE id=? AND status IN('ready','sent')").bind(Date.now(),Date.now(),s.id).run();if(opened.meta.changes)await event(c.env.DB,s.id,'opened').run();}
 return c.json({survey:{id:s.id,title:s.title,status:s.status,completion:s.completion,expires_at:s.expires_at,followup:JSON.parse(s.followup_json)},template,answers:JSON.parse(response.answers_json),context:JSON.parse(s.context_json),revision:response.revision,files:files.results});
});
surveyPublic.patch(`${root}/session`,async c=>{
 const s=await session(c);if(!s)return error(c,'link_unavailable',404);if(!editable(s))return error(c,'survey_read_only',409);
 const parsed=z.object({revision:z.number().int().positive(),patch:z.record(z.string(),z.unknown()).refine(v=>Object.keys(v).length<=150)}).strict().safeParse(await readJson(c));if(!parsed.success)return error(c,'invalid_input');
 const template=await getTemplate(c.env.DB,s.version_id),response=await getResponse(c.env.DB,s.id);if(response.revision!==parsed.data.revision)return error(c,'revision_conflict',409);
 const previous=JSON.parse(response.answers_json) as Answers,answers={...previous,...parsed.data.patch};if(JSON.stringify(answers).length>120000)return error(c,'answers_too_large',413);
 const path=surveyPath(template,answers),allowed=new Set(path.map(q=>q.id));
 for(const [key,value]of Object.entries(parsed.data.patch)){
  const q=path.find(q=>q.id===key);if(!q)return error(c,'question_not_active');
  if(value===null){delete answers[key];continue;}
  // Missing required values are saved as drafts. Invalid nonempty values are rejected.
  const e=answerError({...q,required:false,rules:q.rules.filter(r=>r.action!=='REQUIRE IF')},value,answers);if(e)return c.json({error:{code:'invalid_answer',field:key,message:e}},400);
  if(uploadTypes.includes(q.type)&&Array.isArray(value))for(const file of value)if(!await c.env.DB.prepare("SELECT 1 FROM survey_files WHERE id=? AND survey_id=? AND question_id=? AND status='ready'").bind(file,s.id,key).first())return error(c,'invalid_file');
 }
 // Remove answers from inactive branches; never let stale hidden answers leak into a brief.
 for(const key of Object.keys(answers))if(!allowed.has(key))delete answers[key];
 const state=evaluate(template,answers),timestamp=Date.now();
 const updated=await c.env.DB.prepare('UPDATE survey_responses SET answers_json=?,revision=revision+1,updated_at=? WHERE survey_id=? AND revision=? AND EXISTS(SELECT 1 FROM surveys WHERE id=? AND status IN(\'ready\',\'sent\',\'opened\',\'in_progress\',\'needs_information\')) RETURNING revision').bind(JSON.stringify(answers),timestamp,s.id,parsed.data.revision,s.id).first<{revision:number}>();if(!updated)return error(c,'revision_conflict',409);
 await c.env.DB.batch([
  c.env.DB.prepare("UPDATE surveys SET status=CASE WHEN status='needs_information' THEN status ELSE 'in_progress' END,completion=?,started_at=COALESCE(started_at,?),updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM survey_responses WHERE survey_id=? AND revision=?)").bind(state.score,timestamp,timestamp,s.id,s.id,updated.revision),
  ...Object.keys(parsed.data.patch).map(key=>event(c.env.DB,s.id,'answered',key,path.find(q=>q.id===key)?.section||null)),
  ...path.filter(q=>q.type==='consent'&&Object.hasOwn(parsed.data.patch,q.id)&&previous[q.id]!==answers[q.id]).map(q=>c.env.DB.prepare('INSERT INTO survey_consents VALUES (?,?,?,?,?,?)').bind(id(),s.id,q.id,'survey-privacy-v1',answers[q.id]===true?1:0,timestamp)),
 ]);
 return c.json({revision:updated.revision,answers,completeness:state});
});
surveyPublic.post(`${root}/submit`,async c=>{
 const s=await session(c);if(!s)return error(c,'link_unavailable',404);
 if(['completed','reviewed','approved'].includes(s.status)){c.executionCtx.waitUntil(processSurveyEvents(c.env));return c.json({ok:true,completion:s.completion});}if(!editable(s))return error(c,'survey_read_only',409);
 const input=z.object({revision:z.number().int().positive()}).strict().safeParse(await readJson(c));if(!input.success)return error(c,'invalid_input');
 const response=await getResponse(c.env.DB,s.id);if(response.revision!==input.data.revision)return error(c,'revision_conflict',409);
 const template=await getTemplate(c.env.DB,s.version_id),answers=JSON.parse(response.answers_json) as Answers,state=evaluate(template,answers);if(Object.keys(state.errors).length)return c.json({error:{code:'incomplete',fields:state.errors}},400);
 const timestamp=Date.now(),briefId=id();
 try{await c.env.DB.batch([
  c.env.DB.prepare(`INSERT INTO survey_briefs(id,survey_id,response_revision,source_json,created_at,updated_at) SELECT ?,id,?,?,?,? FROM surveys WHERE id=? AND status IN('ready','sent','opened','in_progress','needs_information') AND EXISTS(SELECT 1 FROM survey_responses WHERE survey_id=? AND revision=?)`).bind(briefId,response.revision,JSON.stringify(deterministicBrief(template,answers)),timestamp,timestamp,s.id,s.id,response.revision),
  c.env.DB.prepare("UPDATE surveys SET status='completed',completion=?,completed_at=?,updated_at=?,followup_json='[]',revision=revision+1 WHERE id=? AND EXISTS(SELECT 1 FROM survey_briefs WHERE id=?)").bind(state.score,timestamp,timestamp,s.id,briefId),
  c.env.DB.prepare(`INSERT INTO outbox_events(id,deduplication_key,aggregate_type,aggregate_id,event_type,payload_json,status,available_at,created_at) SELECT ?,?,'survey',id,'survey.completed',?,'pending',?,? FROM surveys WHERE id=? AND EXISTS(SELECT 1 FROM survey_briefs WHERE id=?)`).bind(id(),`survey-completed:${s.id}:${response.revision}`,JSON.stringify({surveyId:s.id,briefId}),timestamp,timestamp,s.id,briefId),
  c.env.DB.prepare(`INSERT INTO outbox_events(id,deduplication_key,aggregate_type,aggregate_id,event_type,payload_json,status,available_at,created_at) SELECT ?,?,'survey',id,'survey.ai_requested',?,'pending',?,? FROM surveys WHERE id=? AND EXISTS(SELECT 1 FROM survey_briefs WHERE id=?)`).bind(id(),`survey-ai:${s.id}:${response.revision}`,JSON.stringify({briefId}),timestamp,timestamp,s.id,briefId),
  c.env.DB.prepare("INSERT INTO survey_events(id,survey_id,kind,created_at) SELECT ?,?,'completed',? WHERE EXISTS(SELECT 1 FROM survey_briefs WHERE id=?)").bind(id(),s.id,timestamp,briefId),
  c.env.DB.prepare("INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at) SELECT lower(hex(randomblob(16))),u.id,?,'Brief primit',?,'surveys',? FROM users u JOIN platform_principals p ON p.email=u.email COLLATE NOCASE WHERE p.status='active' AND u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM survey_briefs WHERE id=?)").bind(`survey:${briefId}`,s.title,timestamp,briefId),
  c.env.DB.prepare("INSERT INTO lead_activities(id,lead_id,kind,direction,content,occurred_at,created_at) SELECT ?,lead_id,'note','internal',?,?,? FROM surveys WHERE id=? AND lead_id IS NOT NULL AND EXISTS(SELECT 1 FROM survey_briefs WHERE id=?)").bind(id(),`Smart Survey completat: ${s.title}. Detalii în Smart Surveys.`,timestamp,timestamp,s.id,briefId),

 ]);}catch{const done=await c.env.DB.prepare('SELECT id FROM survey_briefs WHERE survey_id=? AND response_revision=?').bind(s.id,response.revision).first();if(!done)return error(c,'revision_conflict',409);}
 if(!await c.env.DB.prepare('SELECT id FROM survey_briefs WHERE survey_id=? AND response_revision=?').bind(s.id,response.revision).first())return error(c,'revision_conflict',409);
 c.executionCtx.waitUntil(processSurveyEvents(c.env));return c.json({ok:true,completion:state.score});
});
surveyPublic.post(`${root}/files`,async c=>{
 const s=await session(c);if(!s)return error(c,'link_unavailable',404);if(!editable(s))return error(c,'survey_read_only',409);
 const question=c.req.query('question')||'',t=await getTemplate(c.env.DB,s.version_id),r=await getResponse(c.env.DB,s.id),q=surveyPath(t,JSON.parse(r.answers_json)).find(q=>q.id===question);if(!q||!uploadTypes.includes(q.type))return error(c,'invalid_question');
 if(!(await checkRateLimit(c.env.DB,[{key:`survey:upload:${s.id}`,limit:40,windowSec:3600}])).ok)return error(c,'rate_limited',429);
 let filename:string;try{filename=decodeURIComponent(c.req.header('x-file-name')||'');}catch{return error(c,'invalid_filename');}
 const bytes=new Uint8Array(await c.req.arrayBuffer());let inspected;try{inspected=inspectUpload(filename,c.req.header('content-type')||'',bytes);}catch(e){return error(c,e instanceof Error?e.message:'invalid_file');}
 if(['image','logo'].includes(q.type)&&!inspected.mime.startsWith('image/')&&inspected.mime!=='application/pdf')return error(c,'image_required');
 const fileId=id(),key=`surveys/${s.id}/${fileId}`,timestamp=Date.now();
 const reserved=await c.env.DB.prepare(`INSERT INTO survey_files(id,survey_id,question_id,original_filename,storage_key,mime_type,size,category,status,created_at) SELECT ?,?,?,?,?,?,?,?,'reserved',? WHERE (SELECT COUNT(*) FROM survey_files WHERE survey_id=?)<? AND COALESCE((SELECT SUM(size) FROM survey_files WHERE survey_id=?),0)+?<=? AND EXISTS(SELECT 1 FROM surveys WHERE id=? AND status IN('ready','sent','opened','in_progress','needs_information'))`).bind(fileId,s.id,question,inspected.filename,key,inspected.mime,bytes.byteLength,q.type,timestamp,s.id,MAX_FILES,s.id,bytes.byteLength,MAX_TOTAL,s.id).run();if(!reserved.meta.changes)return error(c,'file_quota_exceeded',413);
 try{await c.env.FILES.put(key,bytes,{httpMetadata:{contentType:inspected.mime}});await c.env.DB.prepare("UPDATE survey_files SET status='ready' WHERE id=? AND EXISTS(SELECT 1 FROM surveys WHERE id=? AND status IN('ready','sent','opened','in_progress','needs_information'))").bind(fileId,s.id).run();}catch{await c.env.FILES.delete(key).catch(()=>{});await c.env.DB.prepare('DELETE FROM survey_files WHERE id=?').bind(fileId).run();return error(c,'upload_failed',503);}
 return c.json({id:fileId,question_id:question,original_filename:inspected.filename,mime_type:inspected.mime,size:bytes.byteLength},201);
});
surveyPublic.get(`${root}/files/:file`,async c=>{const s=await session(c);if(!s)return error(c,'link_unavailable',404);const file=await c.env.DB.prepare("SELECT * FROM survey_files WHERE id=? AND survey_id=? AND status='ready'").bind(c.req.param('file'),s.id).first<FileRow>();if(!file)return error(c,'not_found',404);const object=await c.env.FILES.get(file.storage_key);return object?fileResponse(file,object.body):error(c,'not_found',404);});
surveyPublic.delete(`${root}/files/:file`,async c=>{
 const s=await session(c);if(!s)return error(c,'link_unavailable',404);if(!editable(s))return error(c,'survey_read_only',409);
 const file=await c.env.DB.prepare('SELECT * FROM survey_files WHERE id=? AND survey_id=?').bind(c.req.param('file'),s.id).first<FileRow>();if(!file)return error(c,'not_found',404);
 const response=await getResponse(c.env.DB,s.id),answers=JSON.parse(response.answers_json);if(Array.isArray(answers[file.question_id])&&answers[file.question_id].includes(file.id))return error(c,'detach_file_first',409);
 await c.env.DB.prepare("UPDATE survey_files SET status='deleting' WHERE id=?").bind(file.id).run();await c.env.FILES.delete(file.storage_key);await c.env.DB.prepare('DELETE FROM survey_files WHERE id=?').bind(file.id).run();return c.json({ok:true});
});

surveyPublic.post(`${root}/assist`,async c=>{
 const s=await session(c);if(!s)return error(c,'link_unavailable',404);if(!editable(s))return error(c,'survey_read_only',409);
 const b=z.object({question:z.string().max(100),text:z.string().min(5).max(3000)}).strict().safeParse(await readJson(c));if(!b.success)return error(c,'invalid_input');
 const t=await getTemplate(c.env.DB,s.version_id),r=await getResponse(c.env.DB,s.id);if(!surveyPath(t,JSON.parse(r.answers_json)).some(q=>q.id===b.data.question&&q.type==='long'))return error(c,'invalid_question');
 if(!(await checkRateLimit(c.env.DB,[{key:`survey:assist:${s.id}`,limit:10,windowSec:86400}])).ok)return error(c,'rate_limited',429);
 return c.json(await suggestSurveyText(c.env,s.id,b.data.question,b.data.text));
});

surveyPublic.post(`${root}/events`,async c=>{
 const s=await session(c);if(!s)return error(c,'link_unavailable',404);if(!editable(s))return c.json({ok:true});
 const b=z.object({question:z.string().max(100)}).strict().safeParse(await readJson(c));if(!b.success)return error(c,'invalid_input');const t=await getTemplate(c.env.DB,s.version_id),r=await getResponse(c.env.DB,s.id),q=surveyPath(t,JSON.parse(r.answers_json)).find(q=>q.id===b.data.question);if(!q)return error(c,'invalid_question');
 await c.env.DB.prepare("INSERT INTO survey_events(id,survey_id,kind,question_id,section_id,created_at) SELECT ?,?,'viewed',?,?,? WHERE NOT EXISTS(SELECT 1 FROM survey_events WHERE survey_id=? AND kind='viewed' AND question_id=?)").bind(id(),s.id,q.id,q.section,Date.now(),s.id,q.id).run();return c.json({ok:true});
});
