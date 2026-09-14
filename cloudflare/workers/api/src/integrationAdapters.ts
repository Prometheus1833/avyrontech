import type { Env } from './types';

export const integrationProviders = {
  github: { name: 'GitHub', description: 'Verificare cont și sincronizare repository-uri accesibile', documentation: 'https://docs.github.com/en/rest/users/users' },
  stripe: { name: 'Stripe', description: 'Verificare acces și import facturi pentru reconciliere', documentation: 'https://docs.stripe.com/api/invoices/list' },
  cloudflare: { name: 'Cloudflare', description: 'Verificare token personal și inventar zone DNS', documentation: 'https://developers.cloudflare.com/api/resources/user/subresources/tokens/' },
  revolut: { name: 'Revolut Business', description: 'Citire conturi și solduri, fără inițiere de plăți', documentation: 'https://developer.revolut.com/docs/business/get-accounts' },
} as const;
export type IntegrationProvider = keyof typeof integrationProviders;
export type IntegrationAccount = {id:string;provider:IntegrationProvider;environment:'test'|'live';secret_reference:string|null;revision:number;status:string};
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
export async function boundedProviderJson(url:string,token:string,provider:IntegrationProvider,fetcher:typeof fetch=fetch):Promise<unknown> {
  const allowed:Record<IntegrationProvider,string[]>={github:['api.github.com'],stripe:['api.stripe.com'],cloudflare:['api.cloudflare.com'],revolut:['b2b.revolut.com','sandbox-b2b.revolut.com']};
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||!allowed[provider].includes(parsed.hostname)||parsed.username||parsed.password)throw new ProviderError('provider_url_denied');
  const headers:Record<string,string>={Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'AVYRON-OS'};
  if(provider==='github')headers['X-GitHub-Api-Version']='2026-03-10';
  if(provider==='stripe')headers['Stripe-Version']='2024-06-20';
  const response=await fetcher(url,{headers,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok){await response.body?.cancel();throw new ProviderError(response.status===401||response.status===403?'credentials_or_scope_invalid':response.status===429?'provider_rate_limited':'provider_unavailable');}
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
export async function readIntegration(env:Env,account:IntegrationAccount,sync:boolean,fetcher:typeof fetch=fetch) {
  if(!account.secret_reference||account.status==='disconnected')throw new ProviderError('account_not_activated');
  const encrypted=await env.KV.get(account.secret_reference);
  if(!encrypted)throw new ProviderError('credential_unavailable');
  const token=await openCredential(encrypted,env.MFA_ENCRYPTION_KEY,account.secret_reference);
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
  } else {
    const host=account.environment==='test'?'sandbox-b2b.revolut.com':'b2b.revolut.com';
    const rows=await read(`https://${host}/api/1.0/accounts`);if(!Array.isArray(rows))throw new ProviderError('provider_invalid_response');summary={accounts:rows.length};
    if(sync)for(const raw of rows.slice(0,100)){const row=object(raw);if(typeof row.id==='string')documents.push({id:row.id,kind:'bank_account',data:{name:text(row.name),currency:text(row.currency),state:text(row.state),balance:typeof row.balance==='number'?row.balance:null}});}
  }
  return {summary:{...summary,documents:documents.length},documents};
}
