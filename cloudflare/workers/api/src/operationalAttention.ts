import type { Env, Role } from './types';
import { overviewScope } from './overviewScope';
export async function attentionEvents(env:Env,userId:string,roles:Role[],key:string,offset:number){
 const {staff,superAdmin,permitted,projectScope}=await overviewScope(env,userId,roles),stamp=Date.now();
 let sql='',values:(string|number)[]=[],module='/profil?tab=overview';
 if(key==='termene-proiecte'){
 sql=`SELECT item.id,item.title,project.name detail,item.status,item.due_at created_at,project.slug context,NULL action FROM project_work_items item JOIN projects project ON project.id=item.project_id WHERE item.status IN('open','in_progress','blocked') AND item.due_at<=? AND project.status<>'archived' AND ${projectScope.sql}`;values=[stamp+48*3600000,...projectScope.values];module='/profil?tab=projects';
 }else if(key==='proiecte-revizuire'){
 sql=`SELECT project.id,project.name title,'Proiect în verificare' detail,project.banner_status status,project.updated_at created_at,project.slug context,NULL action FROM projects project WHERE project.status<>'archived' AND project.banner_status IN('revizuire','testing') AND ${projectScope.sql}`;values=projectScope.values;module='/profil?tab=projects';
 }else if(key==='leaduri-necontactate'&&staff&&permitted('leads.read')){
 sql="SELECT id,coalesce(nullif(business,''),name) title,'Lead prioritar fără răspuns' detail,status,created_at,NULL context,NULL action FROM leads WHERE deleted_at IS NULL AND archived_at IS NULL AND first_response_at IS NULL AND status IN('new','qualified') AND (urgent=1 OR (created_at<? AND status='new'))";values=[stamp-4*3600000];module='/profil?tab=leads';
 }else if(key==='tichete-deschise'&&staff&&permitted('support.read')){
 sql="SELECT id,subject title,'Solicitare de suport' detail,status,created_at,NULL context,NULL action FROM support_tickets WHERE status IN('open','pending','in_progress')";module='/profil?tab=staff-tickets';
 }else if(key==='facturi-restante'&&superAdmin){
 sql="SELECT i.id,'Factură restantă' title,c.company_name detail,i.status,i.due_date created_at,NULL context,NULL action FROM invoices i JOIN clients c ON c.id=i.client_id WHERE i.status='overdue' OR (i.status='sent' AND i.due_date<?)";values=[stamp];module='/profil?tab=finance';
 }else if(key==='securitate'&&superAdmin){
 sql="SELECT id,action title,severity detail,outcome status,created_at,NULL context,NULL action FROM security_events WHERE created_at>=? AND (severity IN('warning','critical') OR outcome IN('denied','failed'))";values=[stamp-30*86400000];module='/profil?tab=security';
 }else if(key==='alerte-financiare'&&superAdmin){
 sql="SELECT id,title,message detail,status,detected_at created_at,NULL context,CASE status WHEN 'open' THEN 'acknowledge' ELSE 'resolve' END action FROM financial_alerts WHERE status IN('open','acknowledged')";module='/profil?tab=finance';
 }else if(key.startsWith('alertă-')&&superAdmin){
 sql="SELECT id,title,message detail,status,detected_at created_at,NULL context,CASE status WHEN 'open' THEN 'acknowledge' ELSE 'resolve' END action FROM financial_alerts WHERE id=? AND status IN('open','acknowledged')";values=[key.slice(7)];module='/profil?tab=finance';
 }else return null;
 const rows=await env.DB.prepare(`SELECT *,count(*) OVER() total FROM (${sql}) ORDER BY created_at ASC,id LIMIT 25 OFFSET ?`).bind(...values,offset).all<{id:string;title:string;detail:string;status:string;created_at:number;context:string|null;action:string|null;total:number}>();
 const total=Number(rows.results[0]?.total||0);
 return{data:rows.results.map(row=>({id:row.id,title:row.title,detail:row.detail,status:row.status,created_at:row.created_at,action:row.action,href:row.context?`/intern/projects/${encodeURIComponent(row.context)}`:module+(key==='leaduri-necontactate'?`&lead=${encodeURIComponent(row.id)}`:key==='tichete-deschise'?`&ticket=${encodeURIComponent(row.id)}`:'')})),total,nextOffset:offset+rows.results.length<total?offset+rows.results.length:null};
}
