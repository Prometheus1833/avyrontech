import type { Hono } from 'hono';
import { z } from 'zod';
import type { AppBindings } from './types';
import { platformRoleForUser } from './authorization';
import { audit, fail, replay, write } from './centerPersistence';
import { checkRateLimit } from './antispam';

// A deliberately narrow HTML check. This does not evaluate rendered contrast or keyboard flows.
export function inspectAccessibility(html:string) {
 const clean=html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const findings:{rule:string;count:number;message:string}[]=[];
 if(!/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(clean))findings.push({rule:'3.1.1',count:1,message:'Limba paginii lipsește sau necesită verificare.'});
 if(!/<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title>/i.test(clean))findings.push({rule:'2.4.2',count:1,message:'Titlul paginii lipsește sau este gol.'});
 const missingAlt=(clean.match(/<img\b[^>]*>/gi)||[]).filter(tag=>!/(?:\s)alt\s*=/i.test(tag)).length;
 if(missingAlt)findings.push({rule:'1.1.1',count:missingAlt,message:'Imagini fără atribut alt; verificați scopul și alternativa textuală.'});
 return {findings,checks:['Limba paginii','Titlul paginii','Prezența atributului alt'],limitation:'Verificare preliminară a HTML-ului serverului. Fără verificarea contrastului, tastaturii, componentelor dinamice sau certificare WCAG.'};
}
export function mountCommands(router:Hono<AppBindings>) {
 router.get('/api/centers/commands/query',async c=>{
  if(!await platformRoleForUser(c.env.DB,c.get('userId')))return fail(c,'forbidden',403);
  if(c.req.query('type')==='invoices')return c.json({title:'Facturi neachitate',data:(await c.env.DB.prepare("SELECT r.id,r.invoice_number,r.service_name,r.status,r.due_date,r.gross_amount_minor,r.currency,c.company_name FROM financial_revenues r LEFT JOIN clients c ON c.id=r.client_id WHERE r.status IN ('invoiced','sent','partially_paid','overdue') ORDER BY r.due_date IS NULL,r.due_date LIMIT 100").all()).results,note:'Valoarea facturată este brută; pentru plăți parțiale nu reprezintă soldul rămas.'});
  if(c.req.query('type')==='client'){
   const q=(c.req.query('q')||'').trim().slice(0,100);if(q.length<2)return fail(c,'invalid_input');
   const term=`%${q.replace(/[\\%_]/g,'\\$&')}%`;
   const clients=await c.env.DB.prepare("SELECT id,company_name,contact_name,email,phone,status FROM clients WHERE status!='archived' AND (company_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\') ORDER BY company_name LIMIT 20").bind(term,term).all();
   return c.json({title:'Clienți',data:clients.results});
  }
  return fail(c,'invalid_input');
 });
 router.get('/api/centers/commands/client/:id',async c=>{
  if(!await platformRoleForUser(c.env.DB,c.get('userId')))return fail(c,'forbidden',403);
  const client=await c.env.DB.prepare('SELECT id,company_name,contact_name,email,phone,status FROM clients WHERE id=?').bind(c.req.param('id')).first();if(!client)return fail(c,'not_found',404);
  const projects=await c.env.DB.prepare("SELECT id,name,status,domain FROM projects WHERE client_id=? AND status!='archived' ORDER BY created_at DESC LIMIT 50").bind(c.req.param('id')).all();
  return c.json({title:'Fișa clientului',data:[client,...projects.results]});
 });
 router.post('/api/centers/commands/report',async c=>{
  if(!await platformRoleForUser(c.env.DB,c.get('userId')))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const b=z.object({month:z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/)}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
  const [year,month]=b.data.month.split('-').map(Number),start=Date.UTC(year,month-1,1),end=Date.UTC(year,month,1);
  const revenues=await c.env.DB.prepare("SELECT currency,COUNT(*) invoices,SUM(gross_amount_minor) gross,SUM(gross_amount_minor IS NULL) unknown_amounts FROM financial_revenues WHERE invoice_date>=? AND invoice_date<? AND status NOT IN ('draft','cancelled','archived') GROUP BY currency").bind(start,end).all<{currency:string;invoices:number;gross:number|null;unknown_amounts:number}>();
  const traffic=await c.env.DB.prepare('SELECT count(*) events FROM page_events WHERE created_at>=? AND created_at<?').bind(start,end).first<{events:number}>();
  const runs=await c.env.DB.prepare("SELECT status,count(*) count FROM ai_runs WHERE created_at>=? AND created_at<? GROUP BY status").bind(start,end).all<{status:string;count:number}>();
  const title=`Raport operațional ${b.data.month}`,text=[title,'Perioadă calendaristică UTC. Date disponibile la momentul generării; nu este raport contabil.',...revenues.results.map(r=>`${r.currency}: ${r.invoices} facturi, valoare brută cunoscută ${r.gross===null?'necunoscută':(r.gross/100).toFixed(2)}; ${r.unknown_amounts} sume necunoscute.`),`Evenimente analytics cu consimțământ: ${traffic?.events||0}.`,...runs.results.map(r=>`Execuții AI ${r.status}: ${r.count}`)].join('\n');
  const id=crypto.randomUUID(),t=Date.now();
  return write(c,{id,title,text},[c.env.DB.prepare("INSERT INTO hub_documents(id,category,title,content_text,status,created_by,created_at,updated_at) VALUES (?,'report',?,?,'draft',?,?,?)").bind(id,title,text,c.get('userId'),t,t),audit(c,'command.report.generated',id)]);
 });
 router.post('/api/centers/commands/wcag',async c=>{
  if(!await platformRoleForUser(c.env.DB,c.get('userId')))return fail(c,'forbidden',403);const prior=await replay(c);if(prior)return prior;
  const b=z.object({path:z.enum(['/','/en'])}).strict().safeParse(await c.req.json().catch(()=>null));if(!b.success)return fail(c,'invalid_input');
  if(!(await checkRateLimit(c.env.DB,[{key:`wcag:${c.get('userId')}`,limit:6,windowSec:3600}])).ok)return c.json({error:{code:'rate_limited'}},429);
  let response:Response;
  try{response=await fetch(`https://avyron.ro${b.data.path}`,{redirect:'manual',signal:AbortSignal.timeout(10000)});}catch{return fail(c,'probe_failed',503);}
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html')){await response.body?.cancel();return fail(c,'probe_failed',503);}
  const reader=response.body?.getReader();if(!reader)return fail(c,'probe_failed',503);
  let size=0,html='';const decoder=new TextDecoder();
  try{for(;;){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>500000){await reader.cancel();return fail(c,'page_too_large');}html+=decoder.decode(item.value,{stream:true});}html+=decoder.decode();}catch{return fail(c,'probe_failed',503);}finally{reader.releaseLock();}
  const result=inspectAccessibility(html),id=crypto.randomUUID(),t=Date.now(),title=`Verificare accesibilitate · ${b.data.path}`;
  const text=[title,new Date(t).toISOString(),result.limitation,...result.findings.map(f=>`${f.rule}: ${f.message} (${f.count})`),...(!result.findings.length?['Nicio problemă detectată de cele trei verificări automate.']:[])].join('\n');
  return write(c,{id,title,text,...result},[c.env.DB.prepare("INSERT INTO hub_documents(id,category,title,content_text,status,created_by,created_at,updated_at) VALUES (?,'report',?,?,'draft',?,?,?)").bind(id,title,text,c.get('userId'),t,t),audit(c,'command.wcag.scanned',id)]);
 });
}
