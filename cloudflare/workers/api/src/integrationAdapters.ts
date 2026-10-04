import type { Env } from './types';

export const integrationProviders = {
  github: { name: 'GitHub', description: 'Verificare cont și sincronizare repository-uri accesibile', documentation: 'https://docs.github.com/en/rest/users/users' },
  stripe: { name: 'Stripe', description: 'Verificare acces și import facturi pentru reconciliere', documentation: 'https://docs.stripe.com/api/invoices/list' },
  cloudflare: { name: 'Cloudflare', description: 'Verificare token personal și inventar zone DNS', documentation: 'https://developers.cloudflare.com/api/resources/user/subresources/tokens/' },
  revolut: { name: 'Revolut Business', description: 'Citire conturi și solduri, fără inițiere de plăți', documentation: 'https://developer.revolut.com/docs/business/get-accounts' },
  supabase: { name: 'Supabase', description: 'Verificare Data API fără migrarea autentificării, fișierelor sau datelor', documentation: 'https://supabase.com/docs/guides/api' },
  google_drive: { name: 'Google Drive', description: 'Verificare cont și cotă prin Drive API, fără scanarea sau transferul fișierelor', documentation: 'https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get' },
} as const;
export type IntegrationProvider = keyof typeof integrationProviders;
export type IntegrationAccount = {id:string;provider:IntegrationProvider;environment:'test'|'live';secret_reference:string|null;revision:number;status:string;config_json?:string|null};
const encoder = new TextEncoder();
const encoded = (bytes:Uint8Array) => btoa(String.fromCharCode(...bytes));
const decoded = (value:string) => Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function vaultKey(master:string) {
  if (!master || master.length<32) throw new Error('vault_not_configured');
  const base=await crypto.subtle.importKey('raw',encoder.encode(master),'HKDF',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:encoder.encode('avyron-integration-vault-v1'),info:encoder.encode('api-credentials')},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function sealCredential(token:string,master:string,reference:string) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(reference)},await vaultKey(master),encoder.encode(token));
  return `v1.${encoded(iv)}.${encoded(new Uint8Array(cipher))}`;
}
export async function openCredential(ciphertext:string,master:string,reference:string) {
  const [version,iv,body]=ciphertext.split('.');
  if(version!=='v1'||!iv||!body)throw new Error('invalid_credential');
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:decoded(iv),additionalData:encoder.encode(reference)},await vaultKey(master),decoded(body));
  return new TextDecoder().decode(bytes);
}
export class ProviderError extends Error {
  constructor(readonly code:string){super(code);}
}
type GoogleOAuthCredential={type:'google_oauth_v1';access_token:string;refresh_token:string;expires_at:number;scope:string};
const googleCredential=(value:string):GoogleOAuthCredential=>{try{const parsed=JSON.parse(value) as Partial<GoogleOAuthCredential>;if(parsed.type!=='google_oauth_v1'||typeof parsed.access_token!=='string'||typeof parsed.refresh_token!=='string'||typeof parsed.expires_at!=='number'||typeof parsed.scope!=='string')throw new Error();return parsed as GoogleOAuthCredential;}catch{throw new ProviderError('google_oauth_required');}};
async function googleTokenRequest(env:Env,body:URLSearchParams,fetcher:typeof fetch){
  if(!env.GOOGLE_OAUTH_CLIENT_ID||!env.GOOGLE_OAUTH_CLIENT_SECRET)throw new ProviderError('google_oauth_not_configured');
  body.set('client_id',env.GOOGLE_OAUTH_CLIENT_ID);body.set('client_secret',env.GOOGLE_OAUTH_CLIENT_SECRET);
  const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body:body.toString(),redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok){await response.body?.cancel();throw new ProviderError(response.status===400?'google_reconnect_required':'provider_unavailable');}
  const payload=object(await response.json());if(typeof payload.access_token!=='string'||typeof payload.expires_in!=='number')throw new ProviderError('provider_invalid_response');return payload;
}
export const googleOAuthRedirectUri=(env:Env)=>env.GOOGLE_OAUTH_REDIRECT_URI||`${env.APP_URL}/api/integrations/google-drive/callback`;
export async function googleOAuthAuthorization(env:Env,accountId:string,userId:string,revision:number){
  if(!env.GOOGLE_OAUTH_CLIENT_ID||!env.GOOGLE_OAUTH_CLIENT_SECRET)throw new ProviderError('google_oauth_not_configured');
  const state=crypto.randomUUID().replace(/-/g,''),bytes=crypto.getRandomValues(new Uint8Array(48));
  const verifier=encoded(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier)));
  const challenge=encoded(digest).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  await env.KV.put(`google-oauth-state:${state}`,JSON.stringify({accountId,userId,revision,verifier,expiresAt:Date.now()+600000}),{expirationTtl:600});
  const query=new URLSearchParams({client_id:env.GOOGLE_OAUTH_CLIENT_ID,redirect_uri:googleOAuthRedirectUri(env),response_type:'code',scope:'https://www.googleapis.com/auth/drive.file',access_type:'offline',prompt:'consent',include_granted_scopes:'true',state,code_challenge:challenge,code_challenge_method:'S256',login_hint:'avyrontech@gmail.com'});
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}
export async function completeGoogleOAuth(env:Env,state:string,code:string,fetcher:typeof fetch=fetch){
  const key=`google-oauth-state:${state}`,raw=await env.KV.get(key);await env.KV.delete(key);if(!raw)throw new ProviderError('google_oauth_state_invalid');
  const saved=object(JSON.parse(raw));if(typeof saved.accountId!=='string'||typeof saved.userId!=='string'||typeof saved.revision!=='number'||typeof saved.verifier!=='string'||typeof saved.expiresAt!=='number'||saved.expiresAt<Date.now())throw new ProviderError('google_oauth_state_invalid');
  const token=await googleTokenRequest(env,new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:googleOAuthRedirectUri(env),code_verifier:saved.verifier}),fetcher);
  if(typeof token.refresh_token!=='string'||typeof token.scope!=='string'||!token.scope.split(' ').includes('https://www.googleapis.com/auth/drive.file'))throw new ProviderError('google_oauth_scope_invalid');
  const access=String(token.access_token),about=object(await boundedProviderJson('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress%2CdisplayName)%2CstorageQuota(limit%2Cusage%2CusageInDrive)',access,'google_drive',fetcher));
  const user=object(about.user),email=text(user.emailAddress)?.toLowerCase();if(email!=='avyrontech@gmail.com')throw new ProviderError('google_account_mismatch');
  return {accountId:saved.accountId,userId:saved.userId,revision:saved.revision,credential:JSON.stringify({type:'google_oauth_v1',access_token:access,refresh_token:token.refresh_token,expires_at:Date.now()+Number(token.expires_in)*1000,scope:token.scope} satisfies GoogleOAuthCredential),summary:{account_email:email,display_name:text(user.displayName),storage_limit_bytes:text(object(about.storageQuota).limit),storage_usage_bytes:text(object(about.storageQuota).usage),storage_usage_drive_bytes:text(object(about.storageQuota).usageInDrive),mode:'verification_only'}};
}
export async function boundedProviderJson(url:string,token:string,provider:IntegrationProvider,fetcher:typeof fetch=fetch):Promise<unknown> {
  const allowed:Record<Exclude<IntegrationProvider,'supabase'>,string[]>={github:['api.github.com'],stripe:['api.stripe.com'],cloudflare:['api.cloudflare.com'],revolut:['b2b.revolut.com','sandbox-b2b.revolut.com'],google_drive:['www.googleapis.com']};
  const parsed=new URL(url);
  const supabaseHost=provider==='supabase'&&/^[a-z0-9-]{8,63}\.supabase\.co$/.test(parsed.hostname);
  const knownHost=provider!=='supabase'&&allowed[provider].includes(parsed.hostname);
  if(parsed.protocol!=='https:'||(!supabaseHost&&!knownHost)||parsed.username||parsed.password||parsed.port)throw new ProviderError('provider_url_denied');
  const headers:Record<string,string>={Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'AVYRON-OS'};
  if(provider==='github')headers['X-GitHub-Api-Version']='2026-03-10';
  if(provider==='stripe')headers['Stripe-Version']='2024-06-20';
  if(provider==='supabase')headers.apikey=token;
  const response=await fetcher(url,{headers,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok){await response.body?.cancel();throw new ProviderError(response.status===401?'credentials_invalid':response.status===403?'provider_scope_or_access_denied':response.status===404?'provider_project_unavailable':response.status===402||response.status===429?'provider_quota_exceeded':'provider_unavailable');}
  const reader=response.body?.getReader();if(!reader)throw new ProviderError('provider_empty_response');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512*1024){await reader.cancel();throw new ProviderError('provider_response_too_large');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new ProviderError('provider_invalid_response');}
}
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown)=>typeof value==='string'?value.slice(0,300):null;
const integer=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)?value:null;
const jsonConfig=(value:string|null|undefined)=>{try{return object(JSON.parse(value||'{}'));}catch{return {};}};
export const normalizeSupabaseProjectUrl=(value:unknown)=>{
  if(typeof value!=='string')throw new ProviderError('supabase_project_url_missing');
  const parsed=new URL(value);
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||!/^([a-z0-9-]{8,63})\.supabase\.co$/.test(parsed.hostname)||!['','/'].includes(parsed.pathname)||parsed.search||parsed.hash)throw new ProviderError('supabase_project_url_invalid');
  return parsed.origin;
};
const jwtRole=(token:string)=>{try{const part=token.split('.')[1];if(!part)return null;const normalized=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');return text(object(JSON.parse(atob(normalized))).role);}catch{return null;}};
const assertSafeSupabaseKey=(token:string)=>{if(token.startsWith('sb_secret_')||token.includes('service_role')||jwtRole(token)==='service_role')throw new ProviderError('supabase_privileged_key_denied');};
export async function readIntegration(env:Env,account:IntegrationAccount,sync:boolean,fetcher:typeof fetch=fetch) {
  if(!account.secret_reference||account.status==='disconnected')throw new ProviderError('account_not_activated');
  const encrypted=await env.KV.get(account.secret_reference);
  if(!encrypted)throw new ProviderError('credential_unavailable');
  let token=await openCredential(encrypted,env.MFA_ENCRYPTION_KEY,account.secret_reference);
  if(account.provider==='google_drive'){
    let credential=googleCredential(token);
    if(credential.expires_at<=Date.now()+60000){const refreshed=await googleTokenRequest(env,new URLSearchParams({grant_type:'refresh_token',refresh_token:credential.refresh_token}),fetcher);credential={...credential,access_token:String(refreshed.access_token),expires_at:Date.now()+Number(refreshed.expires_in)*1000,scope:typeof refreshed.scope==='string'?refreshed.scope:credential.scope};await env.KV.put(account.secret_reference,await sealCredential(JSON.stringify(credential),env.MFA_ENCRYPTION_KEY,account.secret_reference));}
    token=credential.access_token;
  }
  const read=(url:string)=>boundedProviderJson(url,token,account.provider,fetcher);
  const documents:{id:string;kind:string;data:Record<string,unknown>}[]=[];
  let summary:Record<string,unknown>={};
  if(account.provider==='github'){
    const user=object(await read('https://api.github.com/user'));if(!user.login)throw new ProviderError('provider_invalid_response');
    summary={login:text(user.login),id:integer(user.id)};
    if(sync){const rows=await read('https://api.github.com/user/repos?per_page=100&sort=updated');if(!Array.isArray(rows))throw new ProviderError('provider_invalid_response');
      for(const raw of rows){const row=object(raw);if(integer(row.id)!==null)documents.push({id:String(row.id),kind:'repository',data:{name:text(row.full_name),private:row.private===true,default_branch:text(row.default_branch),updated_at:text(row.updated_at)}});}summary.limit=100;}
  } else if(account.provider==='stripe'){
    if(!/^(sk|rk)_(test|live)_/.test(token)||!token.includes(`_${account.environment}_`))throw new ProviderError('credential_environment_mismatch');
    const rows=object(await read(`https://api.stripe.com/v1/invoices?limit=${sync?100:1}`));if(!Array.isArray(rows.data))throw new ProviderError('provider_invalid_response');
    summary={environment:account.environment,has_more:rows.has_more===true};
    if(sync)for(const raw of rows.data){const row=object(raw);if(typeof row.id==='string')documents.push({id:row.id,kind:'invoice',data:{number:text(row.number),status:text(row.status),currency:text(row.currency),amount_due:integer(row.amount_due),amount_paid:integer(row.amount_paid),total:integer(row.total),created:integer(row.created),due_date:integer(row.due_date)}});}
  } else if(account.provider==='cloudflare'){
    const result=object(await read('https://api.cloudflare.com/client/v4/user/tokens/verify'));const tokenInfo=object(result.result);
    if(result.success!==true||tokenInfo.status!=='active')throw new ProviderError('credentials_or_scope_invalid');
    summary={status:'active',expires_on:text(tokenInfo.expires_on)};
    if(sync){const zones=object(await read('https://api.cloudflare.com/client/v4/zones?per_page=50'));if(zones.success!==true||!Array.isArray(zones.result))throw new ProviderError('credentials_or_scope_invalid');
      for(const raw of zones.result){const row=object(raw);if(typeof row.id==='string')documents.push({id:row.id,kind:'zone',data:{name:text(row.name),status:text(row.status)}});}summary.limit=50;}
  } else if(account.provider==='revolut') {
    const host=account.environment==='test'?'sandbox-b2b.revolut.com':'b2b.revolut.com';
    const rows=await read(`https://${host}/api/1.0/accounts`);if(!Array.isArray(rows))throw new ProviderError('provider_invalid_response');summary={accounts:rows.length};
    if(sync)for(const raw of rows.slice(0,100)){const row=object(raw);if(typeof row.id==='string')documents.push({id:row.id,kind:'bank_account',data:{name:text(row.name),currency:text(row.currency),state:text(row.state),balance:typeof row.balance==='number'?row.balance:null}});}
  } else if(account.provider==='supabase') {
    assertSafeSupabaseKey(token);const projectUrl=normalizeSupabaseProjectUrl(jsonConfig(account.config_json).projectUrl);
    const schema=object(await read(`${projectUrl}/rest/v1/`));
    if(!schema.openapi&&!schema.swagger)throw new ProviderError('provider_invalid_response');
    summary={project_host:new URL(projectUrl).hostname,data_api_available:true,mode:'verification_only'};
    if(sync)throw new ProviderError('data_operations_disabled');
  } else {
    const about=object(await read('https://www.googleapis.com/drive/v3/about?fields=user(displayName%2CemailAddress)%2CstorageQuota(limit%2Cusage%2CusageInDrive)'));
    const user=object(about.user),quota=object(about.storageQuota);
    const email=text(user.emailAddress)?.toLowerCase();
    if(email!=='avyrontech@gmail.com')throw new ProviderError('google_account_mismatch');
    summary={account_email:email,display_name:text(user.displayName),storage_limit_bytes:text(quota.limit),storage_usage_bytes:text(quota.usage),storage_usage_drive_bytes:text(quota.usageInDrive),mode:'verification_only'};
    if(sync)throw new ProviderError('data_operations_disabled');
  }
  return {summary:{...summary,documents:documents.length},documents};
}
