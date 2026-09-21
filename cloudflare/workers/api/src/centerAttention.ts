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
 const rows=await c.env.DB.prepare(`SELECT id,kind,title,status,due_at,data_json FROM os_center_records WHERE status NOT IN ('archived','resolved','unsubscribed') AND (due_at<=? OR (kind='domains' AND json_extract(data_json,'$.ssl_expires_at')<=?) OR (kind='sla' AND due_at<=?+COALESCE(json_extract(data_json,'$.warning_hours'),48)*3600000) OR (kind='security' AND status IN ('active','warning'))) ORDER BY due_at IS NULL,due_at LIMIT 100`).bind(until,until,timestamp).all<{id:string;kind:string;title:string;status:string;due_at:number|null;data_json:string}>();
 const attention:CenterAttention[]=rows.results.filter(r=>allowed(r.kind)).map(r=>({id:`center-${r.id}`,kind:r.kind==='security'?'securitate':'proiect',severity:(r.due_at!==null&&r.due_at<timestamp)||r.status==='warning'?'critic':'atenție',title:r.title,detail:`${r.kind==='domains'?'Domeniu / SSL':r.kind.toUpperCase()} · termen ${r.due_at?new Date(r.due_at).toLocaleDateString('ro-RO'):'de verificat'}`,destination:'os-centers',center:r.kind}));
 if(superAdmin){
  const records=await c.env.DB.prepare("SELECT kind,COUNT(*) total,SUM(CASE WHEN due_at<? THEN 1 ELSE 0 END) overdue FROM operation_records WHERE archived_at IS NULL AND status NOT IN ('done','cancelled') AND due_at<=? GROUP BY kind").bind(timestamp,until).all<{kind:string;total:number;overdue:number}>();
  const names:Record<string,string>={contract:'contracte de reînnoit',change_request:'cereri de modificare',appointment:'programări',compliance:'obligații de conformitate',privacy_request:'cereri de confidențialitate',experiment:'experimente de evaluat'};
  const destinations:Record<string,string>={contract:'contracts',change_request:'changes',appointment:'appointments',compliance:'compliance',privacy_request:'privacy',experiment:'experiments'};
  for(const r of records.results)attention.push({id:`records-${r.kind}`,kind:'proiect',severity:r.overdue?'critic':'atenție',title:`${r.total} ${names[r.kind]}`,detail:`${r.overdue||0} depășite · fereastră ${days} zile`,destination:'os-centers',center:destinations[r.kind]});
  const subscriptions=await c.env.DB.prepare("SELECT COUNT(*) total FROM subscriptions WHERE status='active' AND next_billing_date<=?").bind(until).first<{total:number}>();
  if(subscriptions?.total)attention.push({id:'renewals',kind:'financiar',severity:'atenție',title:`${subscriptions.total} abonamente urmează să se factureze`,detail:`Scadență în ${days} zile sau deja depășită. Verifică situația înainte de facturare.`,destination:'finance'});
 }
 return {attention,preferences:prefs||{enabled:1,lookahead_days:7,include_finance:1}};
}
