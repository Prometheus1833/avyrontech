import type { Env } from './types';
import { checkRateLimit } from './antispam';
import { runAiCore, AiCoreError, type AiModelRole } from './aiCore';

export type ResourceHealth = {id:string;label:string;status:'funcțional'|'configurat'|'atenție'|'eroare'|'neconfigurat';detail:string;checkedAt?:number;code?:string;model?:string};
const cacheKey=(env:Env)=>`os:resource-health:v1:${env.APP_ENV==='preview'?'preview':'production'}`;
const ttl=900;
// Mirror the existing enforced global D1 budget; diagnostics never modify it.
const nativeDailyLimit=5000,diagnosticUnits=69;
async function diagnosticModel(env:Env){
 const rows=await env.DB.prepare("SELECT role,model_id,status,requires_billing,daily_neuron_limit,(SELECT coalesce(sum(estimated_neurons),0) FROM ai_core_reservations u WHERE u.model_role=m.role AND usage_day=date('now')) reserved,(SELECT coalesce(sum(estimated_neurons),0) FROM ai_core_reservations WHERE usage_day=date('now')) global_reserved FROM ai_model_registry m WHERE role IN('primary','secondary') ORDER BY CASE role WHEN 'primary' THEN 0 ELSE 1 END").all<{role:AiModelRole;model_id:string;status:string;requires_billing:number;daily_neuron_limit:number;reserved:number;global_reserved:number}>();
 return rows.results.find(row=>row.status!=='disabled'&&row.requires_billing===0&&row.reserved+diagnosticUnits<=row.daily_neuron_limit&&row.global_reserved+diagnosticUnits<=nativeDailyLimit)||null;
}
async function cached<T>(env:Env,key:string):Promise<T|null>{try{const raw=await env.KV?.get(key);return raw?JSON.parse(raw) as T:null;}catch{return null;}}
async function remember(env:Env,key:string,value:unknown){try{await env.KV?.put(key,JSON.stringify(value),{expirationTtl:ttl});}catch{/* Monitoring must not block native operations when cache is unavailable. */}}
async function aiPaused(env:Env){return !!await env.DB.prepare("SELECT 1 blocked WHERE EXISTS(SELECT 1 FROM ai_kill_switches WHERE enabled=1 AND ((scope_type='global' AND scope_id='*') OR (scope_type='agent' AND scope_id='avy'))) OR NOT EXISTS(SELECT 1 FROM ai_agents a JOIN ai_agent_versions v ON v.agent_slug=a.slug AND v.version=a.current_version WHERE a.slug='avy' AND a.status='active' AND v.status='approved')").first();}
async function bounded(read:()=>Promise<unknown>){let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('probe_timeout')),4000);})]);}finally{if(timer)clearTimeout(timer);}}
export async function readCoreHealth(env:Env,verify=true):Promise<ResourceHealth[]>{
 const definitions=[{id:'files',label:'Documente R2',bucket:env.FILES},{id:'media',label:'Media R2',bucket:env.MEDIA}];
 let storage=verify?await cached<{checkedAt:number;resources:ResourceHealth[]}>(env,cacheKey(env)):null;
 if(storage&&Date.now()-storage.checkedAt>ttl*1000)storage=null;
 if(verify&&!storage){
  const rate=await checkRateLimit(env.DB,[{key:'overview-resource-probes',limit:6,windowSec:3600}]);
  if(rate.ok){
   const checkedAt=Date.now();
   const resources=await Promise.all(definitions.map(async({id,label,bucket}):Promise<ResourceHealth>=>{
    if(!bucket)return{id,label,status:'neconfigurat',detail:'Bucketul nu este asociat mediului curent.',checkedAt};
    try{await bounded(()=>bucket.list({limit:1}));return{id,label,status:'funcțional',detail:'Citire R2 verificată prin Worker. Scrierea și restaurarea necesită verificări separate.',checkedAt};}
    catch(error){const message=String(error);const code=/403|10000|unauthor|forbidden|access.denied/i.test(message)?'access_denied':message.includes('probe_timeout')?'timeout':'read_failed';return{id,label,status:'eroare',code,checkedAt,detail:code==='access_denied'?'Citirea este refuzată. Verifică asocierea bucketului și drepturile mediului.':code==='timeout'?'Citirea nu a răspuns în 4 secunde. Reîncearcă după expirarea verificării.':'Citirea prin Worker a eșuat. Consultă configurarea și jurnalul Cloudflare.'};}
   }));storage={checkedAt,resources};await remember(env,cacheKey(env),storage);
  }
 }
 const resources=storage?.resources||definitions.map(({id,label,bucket}):ResourceHealth=>({id,label,status:bucket?'configurat':'neconfigurat',detail:bucket?'Binding existent; citirea nu a fost verificată în această fereastră. Verificările sunt memorate 15 minute pentru economie de operațiuni.':'Binding absent din mediul curent.'}));
 if(!env.AI)return[...resources,{id:'ai',label:'Workers AI',status:'neconfigurat',detail:'Bindingul AI lipsește din mediul curent.'}];
 if(verify&&await aiPaused(env))return[...resources,{id:'ai',label:'Workers AI',status:'atenție',code:'ai_paused',detail:'Execuțiile sunt oprite de controlul uman sau agentul de diagnostic nu are o versiune activă aprobată.'}];
 const evidence=verify?await cached<ResourceHealth>(env,cacheKey(env)+':ai'):null;
 if(evidence?.checkedAt&&Date.now()-evidence.checkedAt<ttl*1000)return[...resources,evidence];
 if(!verify)return[...resources,{id:'ai',label:'Workers AI',status:'configurat',detail:'Binding existent. Diagnosticul detaliat este rezervat administratorilor autorizați.'}];
 const [model,quota,policy]=await Promise.all([
  diagnosticModel(env),
  env.DB.prepare("SELECT status,quota_total,quota_used,hard_stop_before_paid FROM financial_provider_quotas WHERE vendor_id='fin_vendor_cloudflare_ai' AND status<>'archived' ORDER BY updated_at DESC LIMIT 1").first<{status:string;quota_total:number|null;quota_used:number;hard_stop_before_paid:number}>(),
  env.DB.prepare("SELECT status FROM financial_agent_provider_policies WHERE agent_slug='avy' AND vendor_id='fin_vendor_cloudflare_ai'").first<{status:string}>(),
 ]);
 const blocked=!model||model.status==='disabled'||model.requires_billing!==0||!quota||!['active','warning'].includes(quota.status)||!quota.hard_stop_before_paid||quota.quota_total===null||quota.quota_used>=quota.quota_total||policy?.status!=='active';
 return[...resources,{id:'ai',label:'Workers AI',status:blocked?'atenție':'configurat',detail:blocked?'Modelul sau bugetul Free nu este disponibil. Protecțiile de cost rămân active; verifică AI Core și Financiar.':`Model Free disponibil: ${model.model_id}${model.role==='secondary'?' (alternativa existentă; cota modelului principal nu este disponibilă)':''}. Fără execuție recentă verificată; testul manual trece prin AI Core și Cost Guard.`,code:blocked?'free_guard_blocked':'not_tested'}];
}
export async function probeFreeAi(env:Env,userId:string,key:string):Promise<ResourceHealth>{
 if(await aiPaused(env))return{id:'ai',label:'Workers AI',status:'atenție',code:'ai_paused',detail:'Testul respectă oprirea AI și versiunea aprobată a agentului. Reactivează controlul nativ înainte de testare.'};
 const previous=await cached<ResourceHealth>(env,cacheKey(env)+':ai');
 if(previous?.checkedAt&&Date.now()-previous.checkedAt<ttl*1000)return previous;
 const rate=await checkRateLimit(env.DB,[{key:'overview-ai-probe',limit:2,windowSec:3600}]);
 if(!rate.ok)return{id:'ai',label:'Workers AI',status:'atenție',code:'probe_rate_limited',detail:'Testul de diagnostic este limitat la două execuții pe oră pentru întreaga platformă. Generările obișnuite păstrează limitele existente.'};
 const intent=await checkRateLimit(env.DB,[{key:`overview-ai-intent:${userId}:${key}`,limit:1,windowSec:3600}]);
 if(!intent.ok)return{id:'ai',label:'Workers AI',status:'configurat',code:'probe_result_unknown',detail:'Acest test a fost deja solicitat. Rezultatul nu este încă disponibil; nu se repetă inferența prin retry.'};
 const model=await diagnosticModel(env);
 if(!model)return{id:'ai',label:'Workers AI',status:'atenție',code:'free_model_required',detail:'Nu există un model Free cu suficientă cotă în limitele native. Testul nu activează servicii plătite și nu modifică bugetele.'};
 const checkedAt=Date.now();let result:ResourceHealth;
 try{const answer=await runAiCore({env,agentSlug:'avy',operation:'os_health_probe',role:model.role,idempotencyKey:`os-health:${userId}:${key}:${Math.floor(Date.now()/3600000)}`,promptCharacters:20,requestedMaxTokens:64,priority:'user',input:{messages:[{role:'user',content:'Return only OK.'}],...(model.model_id.startsWith('@cf/google/gemma-4-')?{chat_template_kwargs:{enable_thinking:false}}:{})}});if(typeof (answer.output as {response?:unknown})?.response!=='string'||!(answer.output as {response:string}).response.trim())throw Error('empty_output');result={id:'ai',label:'Workers AI',status:'funcțional',checkedAt,model:answer.model,detail:`Execuție Free confirmată prin ${answer.model}; maximum ${answer.maxTokens} tokenuri de ieșire. Fără documente sau date de client în test.`};}
 catch(error){const code=error instanceof AiCoreError?error.code:'provider_execution_failed';result={id:'ai',label:'Workers AI',status:'atenție',checkedAt,code,detail:code==='provider_execution_failed'?'Execuția nu a fost confirmată de furnizor. Verifică disponibilitatea modelului și configurația Worker.':`Testul a fost oprit de protecțiile existente: ${code}. Nu s-au activat costuri suplimentare.`};}
 await remember(env,cacheKey(env)+':ai',result);return result;
}
