import type { Context } from 'hono';
import type { AppBindings, Env } from '../types';
import { platformRoleForUser, organizationRoleForUser } from '../authorization';
import { centerAllowed } from '../centerAccess';
import { sha256, randomHex } from '../security';
import { templateSchema, surveyPath, answerError, type Answers, type SurveyTemplate } from '../../../../../src/shared/surveys/engine';
export type Ctx=Context<AppBindings>;
export type SurveyRow={id:string;title:string;version_id:string;lead_id:string|null;client_id:string|null;project_id:string|null;organization_id:string|null;campaign_id:string|null;status:string;context_json:string;completion:number;followup_json:string;created_by:string|null;created_at:number;updated_at:number;completed_at:number|null;expires_at:number|null;retention_at:number;revision:number};
export type ResponseRow={survey_id:string;answers_json:string;revision:number;updated_at:number};
export type FileRow={id:string;survey_id:string;question_id:string;original_filename:string;mime_type:string;size:number;storage_key:string;status:string;created_at:number};
export const id=()=>crypto.randomUUID();
export const error=(c:Ctx,code:string,status:400|401|403|404|409|410|413|429|503=400)=>c.json({error:{code}},status);
export const event=(db:D1Database,survey:string,kind:string,question:string|null=null,section:string|null=null)=>db.prepare('INSERT INTO survey_events(id,survey_id,kind,question_id,section_id,created_at) VALUES (?,?,?,?,?,?)').bind(id(),survey,kind,question,section,Date.now());
export async function getSurvey(db:D1Database,surveyId:string){return db.prepare('SELECT * FROM surveys WHERE id=?').bind(surveyId).first<SurveyRow>();}
export async function getTemplate(db:D1Database,version:string):Promise<SurveyTemplate>{const v=await db.prepare('SELECT schema_json FROM survey_versions WHERE id=?').bind(version).first<{schema_json:string}>();if(!v)throw new Error('survey_version_missing');return templateSchema.parse(JSON.parse(v.schema_json));}
export async function getResponse(db:D1Database,surveyId:string){return (await db.prepare('SELECT * FROM survey_responses WHERE survey_id=?').bind(surveyId).first<ResponseRow>())!;}
export const editable=(s:SurveyRow)=>['ready','sent','opened','in_progress','needs_information'].includes(s.status)&&(!s.expires_at||s.expires_at>Date.now())&&s.retention_at>Date.now();
export async function canAccess(c:Ctx,s:Pick<SurveyRow,'organization_id'|'project_id'|'client_id'|'lead_id'|'created_by'>,write=false){
 const user=c.get('userId');if(!user)return false;
 if(await platformRoleForUser(c.env.DB,user))return true;
 if(!await centerAllowed(c,'surveys',write))return false;
 if(s.project_id){const p=await c.env.DB.prepare('SELECT owner_user_id,organization_id FROM projects WHERE id=?').bind(s.project_id).first<{owner_user_id:string|null;organization_id:string|null}>();if(!p)return false;const role=p.organization_id?await organizationRoleForUser(c.env.DB,p.organization_id,user):null;if(role&&(!write||['owner','admin','manager','specialist'].includes(role)))return true;if(!write&&p.owner_user_id===user)return true;return !!await c.env.DB.prepare(`SELECT 1 FROM project_staff WHERE project_id=? AND user_id=? ${write?"AND role!='viewer'":''}`).bind(s.project_id,user).first();}
 if(s.organization_id){const role=await organizationRoleForUser(c.env.DB,s.organization_id,user);return Boolean(role&&(!write||['owner','admin','manager','specialist'].includes(role)));}
 if(s.client_id)return !!await c.env.DB.prepare('SELECT 1 FROM client_account_access WHERE client_id=? AND user_id=?').bind(s.client_id,user).first();
 if(s.lead_id)return !!await c.env.DB.prepare(`SELECT 1 FROM lead_assignments WHERE lead_id=? AND user_id=? ${write?"AND assignment_role!='reviewer'":''}`).bind(s.lead_id,user).first();
 return s.created_by===user;
}
export async function publicAccess(c:Ctx){
 const token=c.req.header('x-survey-token')||'';if(!/^[a-f0-9]{64}$/.test(token))return null;
 const session=await c.env.DB.prepare('SELECT id,survey_id,mode,user_id,proof_hash,used_at,expires_at,revoked_at FROM survey_sessions WHERE token_hash=?').bind(await sha256(token)).first<{id:string;survey_id:string;mode:string;user_id:string|null;proof_hash:string|null;used_at:number|null;expires_at:number|null;revoked_at:number|null}>();
 if(!session||session.revoked_at||session.expires_at&&session.expires_at<Date.now())return null;
 const s=await getSurvey(c.env.DB,session.survey_id);if(!s||['expired','archived','draft'].includes(s.status)||s.expires_at&&s.expires_at<Date.now()||s.retention_at<Date.now())return null;
 if(session.mode==='authenticated'&&c.get('userId')!==session.user_id)return null;
 if(session.mode==='one_time'){
  const cookieName=`survey_once_${session.id.replace(/-/g,'')}`,cookie=c.req.header('cookie')||'';const proof=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
  if(session.used_at){if(!proof||await sha256(proof)!==session.proof_hash)return null;}
  else {const raw=randomHex(32),claim=await c.env.DB.prepare('UPDATE survey_sessions SET used_at=?,proof_hash=? WHERE id=? AND used_at IS NULL').bind(Date.now(),await sha256(raw),session.id).run();if(!claim.meta.changes)return null;c.header('Set-Cookie',`${cookieName}=${raw}; HttpOnly; Secure; SameSite=Strict; Path=/api/surveys; Max-Age=86400`);}
 }
 return s;
}
export async function createSurvey(env:Env,input:{version:string;title:string;actor?:string;lead?:string|null;client?:string|null;project?:string|null;organization?:string|null;campaign?:string|null;context?:Answers;attribution?:Record<string,string>;expires?:number|null;mode?:string;user?:string|null;token?:string}){
 const definition=await getTemplate(env.DB,input.version),raw=input.context||{};
 const context=Object.fromEntries(surveyPath(definition,raw).filter(q=>Object.hasOwn(raw,q.id)&&q.type!=='consent'&&!answerError({...q,required:false,rules:[]},raw[q.id],raw)).map(q=>[q.id,raw[q.id]]));
 const surveyId=id(),timestamp=Date.now(),token=input.token||randomHex(32),settings=await env.DB.prepare("SELECT retention_days FROM survey_settings WHERE id='global'").first<{retention_days:number}>();
 await env.DB.batch([
  env.DB.prepare(`INSERT INTO surveys(id,title,version_id,lead_id,client_id,project_id,organization_id,campaign_id,context_json,attribution_json,created_by,created_at,updated_at,expires_at,retention_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(surveyId,input.title,input.version,input.lead||null,input.client||null,input.project||null,input.organization||null,input.campaign||null,JSON.stringify(context),JSON.stringify(input.attribution||{}),input.actor||null,timestamp,timestamp,input.expires===undefined?timestamp+30*86400000:input.expires,timestamp+(settings?.retention_days||365)*86400000),
  env.DB.prepare('INSERT INTO survey_sessions(id,survey_id,token_hash,mode,user_id,expires_at,created_at) VALUES (?,?,?,?,?,?,?)').bind(id(),surveyId,await sha256(token),input.mode||'resume',input.user||null,input.expires===undefined?timestamp+30*86400000:input.expires,timestamp),
  env.DB.prepare('INSERT INTO survey_responses(survey_id,answers_json,updated_at) VALUES (?,?,?)').bind(surveyId,JSON.stringify(context),timestamp),event(env.DB,surveyId,'created'),
 ]);return {id:surveyId,token,url:`https://surveys.avyron.ro/s/${token}`};
}
export async function readJson(c:Ctx):Promise<unknown>{return c.req.json().catch(()=>null);}
