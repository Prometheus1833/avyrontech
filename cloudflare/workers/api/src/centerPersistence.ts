import type { Context } from 'hono';
import type { AppBindings } from './types';
import { sha256 } from './security';
type Ctx=Context<AppBindings>;
export const fail=(c:Ctx,code:string,status:400|403|404|409|503=400)=>c.json({error:{code,message:({forbidden:'Nu ai acces la această funcție.',revision_conflict:'Datele au fost modificate. Reîncarcă înainte de a salva.',invalid_input:'Verifică toate câmpurile obligatorii.',consent_required:'Este necesară dovada consimțământului.',not_found:'Înregistrarea nu există.'} as Record<string,string>)[code]||code}},status);
export const audit=(c:Ctx,action:string,target:string)=>c.env.DB.prepare("INSERT INTO security_events(id,actor_user_id,actor_type,action,target_id,outcome,severity,created_at) VALUES (?,?,'user',?,?,'allowed','info',?)").bind(crypto.randomUUID(),c.get('userId'),action,target,Date.now());
const scope=(c:Ctx)=>`centers:${c.get('userId')}:${c.req.method}:${c.req.path}`;
export async function replay(c:Ctx){
 const row=await c.env.DB.prepare('SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?').bind(scope(c),c.req.header('idempotency-key')).first<{request_hash:string;response_json:string}>();
 if(!row)return null;
 return row.request_hash===await sha256(JSON.stringify(await c.req.json().catch(()=>null)))?c.json(JSON.parse(row.response_json)):fail(c,'idempotency_key_reused',409);
}
export async function write(c:Ctx,result:Record<string,unknown>,sql:D1PreparedStatement[]){
 const t=Date.now();
 try{await c.env.DB.batch([c.env.DB.prepare('INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES (?,?,?,200,?,?,?)').bind(scope(c),c.req.header('idempotency-key'),await sha256(JSON.stringify(await c.req.json().catch(()=>null))),JSON.stringify(result),t,t+86400000),...sql]);}
 catch(e){const prior=await replay(c);if(prior)return prior;if(/(NOT NULL constraint failed: .*revision|UNIQUE constraint failed)/.test(String(e)))return fail(c,'revision_conflict',409);throw e;}
 return c.json(result);
}
