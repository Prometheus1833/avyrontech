import type {Hono,Context} from 'hono';
import {z} from 'zod';
import type {AppBindings,Env} from './types';
import {centerAllowed} from './centerAccess';
import {audit,fail,replay,write} from './centerPersistence';
import {openCredential,sealCredential} from './integrationAdapters';
import {sha256} from './security';
import {normalizeEngineUrl} from './enginePolicy';
export type Account={id:string;brand:string;provider:string;auth_method:string;external_id:string;api_version:string;secret_reference:string|null;status:string;revision:number;expires_at:number|null};
export async function accountSecret(env:Env,account:Account){
 if(account.status==='disabled'||(account.expires_at!==null&&account.expires_at<=Date.now())||!account.secret_reference)throw new Error('account_unavailable_or_expired');
 const cipher=await env.KV.get(account.secret_reference);if(!cipher)throw new Error('credential_unavailable');
 return openCredential(cipher,env.MFA_ENCRYPTION_KEY,account.secret_reference);
}
export async function providerJson(url:string,token:string,method='GET',body?:Record<string,unknown>,fetcher:typeof fetch=fetch):Promise<Record<string,unknown>>{
 const target=new URL(url);if(target.protocol!=='https:'||!['graph.facebook.com','api.cloudflare.com','api.github.com','rupload.facebook.com'].includes(target.hostname)||target.port||target.username||target.password)throw new Error('provider_url_denied');
 const graph=target.hostname==='graph.facebook.com';
 const payload=body?(graph?new URLSearchParams(Object.entries(body).map(([key,value])=>[key,typeof value==='object'?JSON.stringify(value):String(value)])).toString():JSON.stringify(body)):undefined;
 const response=await fetcher(url,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${token}`,'Content-Type':graph?'application/x-www-form-urlencoded':'application/json','User-Agent':'AVYRON-OS'},...(payload?{body:payload}:{})});
 if(!response.ok){await response.body?.cancel();throw new Error(response.status===401||response.status===403?'credential_or_scope_invalid':response.status===429?'provider_rate_limit':'provider_request_failed');}
 const reader=response.body?.getReader();if(!reader)throw new Error('provider_empty_response');let size=0,text='';const decoder=new TextDecoder();
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>512000){await reader.cancel();throw new Error('provider_response_too_large');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 const parsed=JSON.parse(text);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||parsed.error||parsed.success===false)throw new Error('provider_rejected');return parsed;
}
export const accountSchema=z.object({brand:z.enum(['avyron','cutiutamagica']),provider:z.enum(['instagram','facebook','cloudflare','github','google','tiktok','other']),label:z.string().trim().min(1).max(120),auth_method:z.enum(['api_token','oauth_token','password','passkey','device']),login_url:z.string().url().max(1000),external_id:z.string().max(100),api_version:z.string().regex(/^v\d{1,2}\.0$/),expires_at:z.number().int().min(0).max(8640000000000000).nullable(),revision:z.number().int().positive().optional()}).strict();
type Ctx=Context<AppBindings>;
export function mountAccounts(router:Hono<AppBindings>){
 router.get('/api/centers/accounts',async c=>{
  if(!await centerAllowed(c,'accounts'))return fail(c,'forbidden',403);
  return c.json({data:(await c.env.DB.prepare('SELECT id,brand,provider,label,auth_method,login_url,external_id,api_version,status,expires_at,verified_at,error_code,revision,secret_reference IS NOT NULL has_secret FROM os_accounts ORDER BY brand,label').all()).results});
 });
 const save=async(c:Ctx)=>{
  if(!await centerAllowed(c,'accounts',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const p=accountSchema.safeParse(await c.req.json().catch(()=>null));if(!p.success)return fail(c,'invalid_input');const b=p.data;
  if(!normalizeEngineUrl(b.login_url))return fail(c,'invalid_login_url');
  if(['instagram','facebook'].includes(b.provider)&&['api_token','oauth_token'].includes(b.auth_method)&&!/^\d{3,50}$/.test(b.external_id))return fail(c,'numeric_meta_account_id_required');
  if(b.provider==='cloudflare'&&!/^[a-f0-9]{32}$/.test(b.external_id))return fail(c,'cloudflare_account_id_required');
  const id=c.req.param('id')||crypto.randomUUID(),t=Date.now();
  if(c.req.param('id')){
   const old=await c.env.DB.prepare('SELECT provider,auth_method,brand,external_id,revision FROM os_accounts WHERE id=?').bind(id).first<Account>();
   if(!old||old.revision!==b.revision)return fail(c,'revision_conflict',409);
   if(old.provider!==b.provider||old.auth_method!==b.auth_method||old.brand!==b.brand||old.external_id!==b.external_id)return fail(c,'create_separate_account_for_identity_change');
  }
  const sql=c.req.param('id')?c.env.DB.prepare("UPDATE os_accounts SET label=?,login_url=?,api_version=?,expires_at=?,status='configured',verified_at=NULL,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?").bind(b.label,b.login_url,b.api_version,b.expires_at,t,b.revision!,id):c.env.DB.prepare('INSERT INTO os_accounts(id,brand,provider,label,auth_method,login_url,external_id,api_version,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,b.brand,b.provider,b.label,b.auth_method,b.login_url,b.external_id,b.api_version,b.expires_at,t,t);
  return write(c,{id},[sql,audit(c,'account.saved',id)]);
 };
 router.post('/api/centers/accounts',save);router.patch('/api/centers/accounts/:id',save);
 router.put('/api/centers/accounts/:id/secret',async c=>{
  if(!await centerAllowed(c,'accounts',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const p=z.object({secret:z.string().min(8).max(8000),revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!p.success)return fail(c,'invalid_input');
  const account=await c.env.DB.prepare('SELECT * FROM os_accounts WHERE id=?').bind(c.req.param('id')).first<Account>();if(!account||account.revision!==p.data.revision)return fail(c,'revision_conflict',409);
  if(!['password','api_token','oauth_token'].includes(account.auth_method))return fail(c,'secret_not_required');
  if(!c.env.MFA_ENCRYPTION_KEY)return fail(c,'vault_not_configured',503);
  const ref=`os-account:${crypto.randomUUID()}`;await c.env.KV.put(ref,await sealCredential(p.data.secret,c.env.MFA_ENCRYPTION_KEY,ref));
  try{const response=await write(c,{ok:true},[c.env.DB.prepare("UPDATE os_accounts SET secret_reference=?,status='configured',verified_at=NULL,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?").bind(ref,Date.now(),p.data.revision,account.id),audit(c,'account.credential.rotated',account.id)]);
   const stored=await c.env.DB.prepare('SELECT secret_reference FROM os_accounts WHERE id=?').bind(account.id).first<{secret_reference:string}>();
   if(stored?.secret_reference!==ref)await c.env.KV.delete(ref);else if(account.secret_reference)await c.env.KV.delete(account.secret_reference);return response;
  }catch(e){await c.env.KV.delete(ref);throw e;}
 });
 router.post('/api/centers/accounts/:id/reveal',async c=>{
  if(!await centerAllowed(c,'accounts',true))return fail(c,'forbidden',403);
  const b=z.object({reason:z.string().trim().min(8).max(200)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
  const account=await c.env.DB.prepare('SELECT * FROM os_accounts WHERE id=?').bind(c.req.param('id')).first<Account>();if(!account||account.auth_method!=='password')return fail(c,'password_only');
  if(account.status==='disabled'||(account.expires_at!==null&&account.expires_at<=Date.now()))return fail(c,'account_unavailable_or_expired');
  const secret=await accountSecret(c.env,account);
  await c.env.DB.prepare("INSERT INTO security_events(id,actor_user_id,actor_type,action,target_id,outcome,severity,metadata_json,created_at) VALUES (?,?,'user','account.password.revealed',?,'allowed','warning',?,?)").bind(crypto.randomUUID(),c.get('userId'),account.id,JSON.stringify({reason:b.data.reason}),Date.now()).run();return c.json({secret});
 });
 router.post('/api/centers/accounts/:id/verify',async c=>{
  if(!await centerAllowed(c,'accounts',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const b=z.object({revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
  const account=await c.env.DB.prepare('SELECT * FROM os_accounts WHERE id=?').bind(c.req.param('id')).first<Account>();if(!account||account.revision!==b.data.revision)return fail(c,'revision_conflict',409);
  if(!['api_token','oauth_token'].includes(account.auth_method)||!['instagram','facebook','cloudflare','github'].includes(account.provider))return fail(c,'manual_login_required');
  let error:string|null=null;
  try{const token=await accountSecret(c.env,account),url=account.provider==='cloudflare'?`https://api.cloudflare.com/client/v4/accounts/${account.external_id}/d1/database/${c.env.BACKUP_DATABASE_ID}`:account.provider==='github'?'https://api.github.com/user':`https://graph.facebook.com/${account.api_version}/${account.external_id}?fields=id,${account.provider==='instagram'?'username':'name'}`;
   const result=await providerJson(url,token);if(account.provider==='cloudflare'?!(result.result as {uuid?:string})?.uuid:!result.id)throw new Error('provider_identity_missing');
  }catch{error='connection_verification_failed';}
  return write(c,{ok:!error,error_code:error},[c.env.DB.prepare('UPDATE os_accounts SET status=?,verified_at=?,error_code=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?').bind(error?'error':'verified',error?null:Date.now(),error,b.data.revision,account.id),audit(c,'account.connection.checked',account.id)]);
 });
 router.post('/api/centers/accounts/:id/disable',async c=>{
  if(!await centerAllowed(c,'accounts',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const b=z.object({revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
  if(!await c.env.DB.prepare('SELECT id FROM os_accounts WHERE id=? AND revision=?').bind(c.req.param('id'),b.data.revision).first())return fail(c,'revision_conflict',409);
  return write(c,{ok:true},[c.env.DB.prepare("UPDATE os_accounts SET status='disabled',revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?").bind(b.data.revision,c.req.param('id')),audit(c,'account.disabled',c.req.param('id'))]);
 });
 router.get('/api/centers/devices',async c=>{
  if(!await centerAllowed(c,'accounts'))return fail(c,'forbidden',403);
  return c.json({data:(await c.env.DB.prepare('SELECT id,label,status,expires_at,last_seen_at FROM os_device_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(c.get('userId')).all()).results});
 });
 router.post('/api/centers/devices',async c=>{
  if(!await centerAllowed(c,'accounts',true))return fail(c,'forbidden',403);
  const b=z.object({label:z.string().trim().min(1).max(80)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
  const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),t=Date.now();
  await c.env.DB.batch([c.env.DB.prepare("INSERT INTO os_device_sessions(id,user_id,label,token_hash,status,expires_at,last_seen_at,created_at) VALUES (?,?,?,?,'active',?,?,?)").bind(id,c.get('userId'),b.data.label,await sha256(token),t+8*3600000,t,t),audit(c,'device.registered',id)]);
  return c.json({id,token,expires_at:t+8*3600000});
 });
 const device=async(c:Ctx)=>{
  if(!await centerAllowed(c,'accounts',true))return null;
  return c.env.DB.prepare("SELECT id FROM os_device_sessions WHERE id=? AND user_id=? AND token_hash=? AND status='active' AND expires_at>?").bind(c.req.param('id'),c.get('userId'),await sha256(c.req.header('X-Device-Token')||''),Date.now()).first<{id:string}>();
 };
 router.post('/api/centers/devices/:id/heartbeat',async c=>{
  const d=await device(c);if(!d)return fail(c,'forbidden',403);
  await c.env.DB.prepare('UPDATE os_device_sessions SET last_seen_at=? WHERE id=?').bind(Date.now(),d.id).run();
  return c.json({data:(await c.env.DB.prepare("SELECT t.id,t.action,t.instructions,t.status,t.expires_at,a.label,a.login_url FROM os_device_tasks t JOIN os_accounts a ON a.id=t.account_id WHERE t.session_id=? AND t.status='pending' AND t.expires_at>? AND a.status!='disabled' ORDER BY t.created_at LIMIT 20").bind(d.id,Date.now()).all()).results});
 });
 router.post('/api/centers/devices/:id/tasks',async c=>{
  if(!await centerAllowed(c,'accounts',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const b=z.object({account_id:z.string(),action:z.enum(['login','publish','review_unfollow']),instructions:z.string().trim().min(5).max(1500)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
  if(!await c.env.DB.prepare("SELECT 1 FROM os_device_sessions WHERE id=? AND user_id=? AND status='active' AND expires_at>? AND last_seen_at>?").bind(c.req.param('id'),c.get('userId'),Date.now(),Date.now()-90000).first())return fail(c,'device_not_online');
  if(!await c.env.DB.prepare("SELECT id FROM os_accounts WHERE id=? AND status!='disabled'").bind(b.data.account_id).first())return fail(c,'not_found',404);
  const id=crypto.randomUUID(),t=Date.now();return write(c,{id},[c.env.DB.prepare('INSERT INTO os_device_tasks(id,session_id,account_id,action,instructions,expires_at,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,c.req.param('id'),b.data.account_id,b.data.action,b.data.instructions,t+900000,t),audit(c,'device.task.requested',id)]);
 });
 router.post('/api/centers/devices/:id/tasks/:taskId',async c=>{
  const d=await device(c);if(!d)return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const b=z.object({status:z.enum(['completed','failed']),evidence:z.string().trim().min(5).max(1000)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
  const task=c.req.param('taskId');if(!await c.env.DB.prepare("SELECT id FROM os_device_tasks WHERE id=? AND session_id=? AND status='pending' AND expires_at>?").bind(task,d.id,Date.now()).first())return fail(c,'task_expired_or_completed',409);
  return write(c,{ok:true},[c.env.DB.prepare("UPDATE os_device_tasks SET status=CASE WHEN status='pending' AND expires_at>? THEN ? ELSE NULL END,evidence=?,completed_at=? WHERE id=? AND session_id=?").bind(Date.now(),b.data.status,b.data.evidence,Date.now(),task,d.id),audit(c,'device.task.confirmed',task)]);
 });
 router.post('/api/centers/devices/:id/revoke',async c=>{
  if(!await centerAllowed(c,'accounts',true))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  if(!await c.env.DB.prepare('SELECT id FROM os_device_sessions WHERE id=? AND user_id=?').bind(c.req.param('id'),c.get('userId')).first())return fail(c,'forbidden',403);
  return write(c,{ok:true},[c.env.DB.prepare("UPDATE os_device_sessions SET status='revoked' WHERE id=?").bind(c.req.param('id')),c.env.DB.prepare("UPDATE os_device_tasks SET status='cancelled' WHERE session_id=? AND status='pending'").bind(c.req.param('id')),audit(c,'device.revoked',c.req.param('id'))]);
 });
}
