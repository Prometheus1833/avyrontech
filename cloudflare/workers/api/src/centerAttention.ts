import type { Context } from 'hono';
import type { AppBindings } from './types';
import { staffPolicy } from './centerAccess';
import { ownerOnly, type CenterId } from '../../../../src/shared/osCatalog';
export type CenterAttention={id:string;kind:'financiar'|'lead'|'proiect'|'suport'|'securitate';severity:'informare'|'atenție'|'critic';title:string;detail:string;destination:string;center?:string};
export async function centerAttention(c:Context<AppBindings>,superAdmin:boolean,timestamp:number){
 const prefs=await c.env.DB.prepare('SELECT enabled,lookahead_days,include_finance FROM os_briefing_preferences WHERE user_id=?').bind(c.get('userId')).first<{enabled:number;lookahead_days:number;include_finance:number}>();
 const days=prefs?.lookahead_days||7,until=timestamp+days*86400000;
 const policy=await staffPolicy(c.env.DB,c.get('userId'));
 const allowed=(id:string)=>superAdmin||(!ownerOnly.includes(id as CenterId)&&policy.read.includes(id as CenterId));
 const rows=await c.env.DB.prepare(`SELECT id,kind,title,status,due_at,data_json FROM os_center_records WHERE status NOT IN ('archived','resolved','unsubscribed') AND (due_at<=? OR (kind='domains' AND (json_extract(data_json,'$.ssl_expires_at')<=? OR json_extract(data_json,'$.ssl_status') IN ('warning','expired'))) OR (kind='sla' AND due_at<=?+COALESCE(json_extract(data_json,'$.warning_hours'),48)*3600000) OR (kind='security' AND status IN ('active','warning'))) ORDER BY due_at IS NULL,due_at LIMIT 100`).bind(until,until,timestamp).all<{id:string;kind:string;title:string;status:string;due_at:number|null;data_json:string}>();
 const attention:CenterAttention[]=rows.results.filter(r=>allowed(r.kind)).map(r=>({id:`center-${r.id}`,kind:r.kind==='security'?'securitate':'proiect',severity:(r.due_at!==null&&r.due_at<timestamp)||r.status==='warning'||(r.kind==='domains'&&(JSON.parse(r.data_json).ssl_status==='expired'||(JSON.parse(r.data_json).ssl_expires_at!==null&&Number(JSON.parse(r.data_json).ssl_expires_at)<timestamp)))?'critic':'atenție',title:r.title,detail:`${r.kind==='domains'?'Domeniu / SSL':r.kind.toUpperCase()} · termen ${r.due_at?new Date(r.due_at).toLocaleDateString('ro-RO'):'de verificat'}`,destination:'os-centers',center:r.kind}));
 if(allowed('marketing')){
  const pending=await c.env.DB.prepare("SELECT count(*) total FROM marketing_posts WHERE status IN ('draft','failed','uncertain')").first<{total:number}>();
  if(pending?.total)attention.push({id:'marketing-review',kind:'proiect',severity:'atenție',title:`${pending.total} postări necesită revizuire`,detail:'Ciorne, publicări nereușite sau rezultate incerte.',destination:'os-centers',center:'marketing'});
 }
 if(superAdmin){
  const backup=await c.env.DB.prepare("SELECT status FROM backup_runs WHERE status!='deleted' ORDER BY created_at DESC LIMIT 1").first<{status:string}>();
  if(backup?.status==='failed')attention.push({id:'backup-failed',kind:'securitate',severity:'critic',title:'Ultimul backup a eșuat',detail:'Verifică execuția și acoperirea copiilor complete.',destination:'os-centers',center:'backup'});
  const accounts=await c.env.DB.prepare("SELECT count(*) total FROM os_accounts WHERE status!='disabled' AND expires_at<=?").bind(until).first<{total:number}>();
  if(accounts?.total)attention.push({id:'accounts-expiring',kind:'securitate',severity:'atenție',title:`${accounts.total} credentiale expiră sau au expirat`,detail:'Verifică și rotește accesul în seiful de conturi.',destination:'os-centers',center:'accounts'});

  const documents=await c.env.DB.prepare("SELECT count(*) total FROM hub_documents WHERE status!='archived' AND review_after<=?").bind(timestamp).first<{total:number}>();
  if(documents?.total)attention.push({id:'documents-review',kind:'proiect',severity:'atenție',title:`${documents.total} documente de revizuit`,detail:'Termenul de revizuire a fost depășit. Verifică sursele înainte de folosirea în răspunsuri AI.',destination:'os-centers',center:'documents'});
  const records=await c.env.DB.prepare("SELECT kind,COUNT(*) total,SUM(CASE WHEN due_at<? THEN 1 ELSE 0 END) overdue FROM operation_records WHERE archived_at IS NULL AND status NOT IN ('done','cancelled') AND due_at<=? GROUP BY kind").bind(timestamp,until).all<{kind:string;total:number;overdue:number}>();
  const names:Record<string,string>={contract:'contracte de reînnoit',change_request:'cereri de modificare',appointment:'programări',compliance:'obligații de conformitate',privacy_request:'cereri de confidențialitate',experiment:'experimente de evaluat'};
  const destinations:Record<string,string>={contract:'contracts',change_request:'changes',appointment:'appointments',compliance:'compliance',privacy_request:'privacy',experiment:'experiments'};
  for(const r of records.results)attention.push({id:`records-${r.kind}`,kind:'proiect',severity:r.overdue?'critic':'atenție',title:`${r.total} ${names[r.kind]}`,detail:`${r.overdue||0} depășite · fereastră ${days} zile`,destination:'os-centers',center:destinations[r.kind]});
  const subscriptions=await c.env.DB.prepare("SELECT COUNT(*) total FROM subscriptions WHERE status='active' AND next_billing_date<=?").bind(until).first<{total:number}>();
  if(subscriptions?.total)attention.push({id:'renewals',kind:'financiar',severity:'atenție',title:`${subscriptions.total} abonamente urmează să se factureze`,detail:`Scadență în ${days} zile sau deja depășită. Verifică situația înainte de facturare.`,destination:'finance'});
 }
 return {attention,preferences:prefs||{enabled:1,lookahead_days:7,include_finance:1}};
}
