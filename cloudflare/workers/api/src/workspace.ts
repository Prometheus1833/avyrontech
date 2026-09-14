import { normalizeDomain, lookupDomain } from "./domain";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { sha256 } from "./security";
import { canAccessProject } from "./projects";

export const workspaceRouter = new Hono<AppBindings>();
type Ctx = Context<AppBindings>;
const staff = (c: Ctx) => c.get("roles").some(r => r === "staff" || r === "admin");
const fail = (c: Ctx, code: string, status: 400 | 403 | 404 | 409 = 400) => c.json({error:{code}},status);
const page = (c: Ctx) => ({limit: Math.min(100,Math.max(1,Number(c.req.query('limit')) || 50)),offset: Math.max(0,Number(c.req.query('offset')) || 0)});
// A client account only receives data explicitly shared by a platform principal.
const clientScope = `EXISTS (SELECT 1 FROM client_account_access access WHERE access.client_id=record.client_id AND access.user_id=?)`;
const iso = (value: unknown) => typeof value === 'number' ? new Date(value).toISOString() : null;
const audit = (c: Ctx, action: string, target: string, metadata: unknown = {}) => c.env.DB.prepare(
  `INSERT INTO security_events(id,actor_user_id,actor_type,action,target_id,outcome,severity,metadata_json,created_at)
   VALUES (?,?,'user',?,?,'allowed','info',?,?)`,
).bind(crypto.randomUUID(),c.get('userId'),action,target,JSON.stringify(metadata),Date.now());

// The idempotency reservation and every domain/audit write share one D1 batch.
// A concurrent duplicate fails the unique reservation before it can write again.
async function mutate(c: Ctx, _value: unknown, result: Record<string,unknown>, statements: D1PreparedStatement[]) {
  const key = c.req.header('idempotency-key') || '';
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(key)) return fail(c,'idempotency_key_required');
  const scope = `workspace:${c.get('userId')}:${c.req.method}:${c.req.path}`;
  const hash = await sha256(JSON.stringify(await c.req.json().catch(()=>null)));
  const lookup = () => c.env.DB.prepare('SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?')
    .bind(scope,key).first<{request_hash:string;response_json:string}>();
  const replay = (old: {request_hash:string;response_json:string}) => old.request_hash === hash
    ? c.json(JSON.parse(old.response_json)) : fail(c,'idempotency_key_reused',409);
  const previous = await lookup();
  if (previous) return replay(previous);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES (?,?,?,200,?,?,?)`)
        .bind(scope,key,hash,JSON.stringify(result),Date.now(),Date.now()+86400000),
      ...statements,
    ]);
  } catch (error) {
    const concurrent = await lookup();
    if (concurrent) return replay(concurrent);
    if (/NOT NULL constraint failed: (support_tickets|project_work_items)\.revision/.test(String(error))) return fail(c,'revision_conflict',409);
    if (/NOT NULL constraint failed: support_messages\.ticket_id/.test(String(error))) return fail(c,'ticket_closed',409);
    throw error;
  }
  return c.json(result);
}

workspaceRouter.use('/api/workspace/*',async (c,next) => {
  c.header('Cache-Control','private, no-store');
  for (const key of ['limit','offset']) {
    const value=c.req.query(key);
    if (value !== undefined && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value)>1000000)) return fail(c,'invalid_pagination');
  }
  const rate = await checkRateLimit(c.env.DB,[{key:`workspace:${c.get('userId')}`,limit:600,windowSec:3600}]);
  if (!rate.ok) return c.json({error:{code:'rate_limited'}},429);
  if (c.req.method !== 'GET' && staff(c) && !(await privilegedMfaSatisfied(c))) return fail(c,'mfa_required',403);
  if (!['GET','HEAD','OPTIONS'].includes(c.req.method)) {
    const key=c.req.header('idempotency-key') || '';
    if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(key)) return fail(c,'idempotency_key_required');
    const prior=await c.env.DB.prepare('SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?')
      .bind(`workspace:${c.get('userId')}:${c.req.method}:${c.req.path}`,key).first<{request_hash:string;response_json:string}>();
    if (prior) {
      const hash=await sha256(JSON.stringify(await c.req.json().catch(()=>null)));
      return prior.request_hash===hash?c.json(JSON.parse(prior.response_json)):fail(c,'idempotency_key_reused',409);
    }
  }
  await next();
});

workspaceRouter.get('/api/workspace/clients',async c => {
  const {results} = await c.env.DB.prepare(`SELECT record.id,record.company_name FROM clients record WHERE ${clientScope.replace('record.client_id','record.id')} ORDER BY record.company_name`).bind(c.get('userId')).all();
  return c.json({data:results});
});
workspaceRouter.get('/api/workspace/invoices',async c => {
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare(`SELECT record.id,record.invoice_number,record.gross_amount_minor amount_cents,record.currency,record.status,record.invoice_date,record.due_date
    FROM financial_revenues record WHERE ${clientScope} AND record.archived_at IS NULL AND record.status NOT IN ('draft','archived') ORDER BY record.invoice_date DESC,record.id LIMIT ? OFFSET ?`)
    .bind(c.get('userId'),limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,invoice_number:r.invoice_number||r.id,status:r.status==='paid'?'paid':r.status==='overdue'?'overdue':['cancelled','refunded'].includes(String(r.status))?'cancelled':'pending',issued_at:iso(r.invoice_date),due_at:iso(r.due_date),pdf_url:null}))});
});
workspaceRouter.get('/api/workspace/subscriptions',async c => {
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare(`SELECT record.id,service.service_name product_name,service.price,service.billing_cycle,record.status,record.next_billing_date
    FROM subscriptions record JOIN services service ON service.id=record.service_id WHERE ${clientScope} ORDER BY record.next_billing_date,record.id LIMIT ? OFFSET ?`)
    .bind(c.get('userId'),limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,price_cents:Math.round(Number(r.price)*100),currency:'RON',status:r.status==='paused'?'suspended':r.status,description:null,started_at:null,next_renewal_at:iso(r.next_billing_date)}))});
});

workspaceRouter.get('/api/workspace/account-access/:userId',async c => {
  if (!(await platformRoleForUser(c.env.DB,c.get('userId')))) return fail(c,'forbidden',403);
  const {results}=await c.env.DB.prepare('SELECT client_id FROM client_account_access WHERE user_id=?').bind(c.req.param('userId')).all();
  return c.json({data:results});
});
workspaceRouter.put('/api/workspace/account-access/:userId',async c => {
  const rate=await checkRateLimit(c.env.DB,[{key:`workspace-access:${c.get('userId')}`,limit:30,windowSec:3600}]);
  if(!rate.ok)return c.json({error:{code:'rate_limited'}},429);
  if (!(await platformRoleForUser(c.env.DB,c.get('userId')))) return fail(c,'forbidden',403);
  const parsed=z.object({client_ids:z.array(z.string().min(1).max(100)).max(100),access_level:z.enum(['user','staff','admin']).optional()}).strict().safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const user=c.req.param('userId');
  if (!(await c.env.DB.prepare('SELECT id FROM users WHERE id=? AND disabled_at IS NULL').bind(user).first())) return fail(c,'not_found',404);
  const accessLevel=parsed.data.access_level;
  if (accessLevel && accessLevel !== 'admin' && await platformRoleForUser(c.env.DB,user)) return fail(c,'platform_principal_protected',409);
  const ids=[...new Set(parsed.data.client_ids)];
  for (const id of ids) if (!(await c.env.DB.prepare("SELECT id FROM clients WHERE id=? AND status!='archived'").bind(id).first())) return fail(c,'invalid_client');
  return mutate(c,parsed.data,{ok:true},[
    ...(accessLevel ? [c.env.DB.prepare('DELETE FROM user_roles WHERE user_id=?').bind(user), ...(['user',...(accessLevel==='user'?[]:[accessLevel])].map(role=>c.env.DB.prepare('INSERT INTO user_roles(user_id,role) VALUES (?,?)').bind(user,role)))] : []),
    c.env.DB.prepare('DELETE FROM client_account_access WHERE user_id=?').bind(user),
    ...ids.map(id=>c.env.DB.prepare('INSERT INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES (?,?,?,?)').bind(id,user,c.get('userId'),Date.now())),
    audit(c,'workspace.client_access.updated',user,{client_ids:ids,access_level:accessLevel}),
  ]);
});

async function ticketAccess(c: Ctx,id: string) {
  const principal=await platformRoleForUser(c.env.DB,c.get('userId'));
  return c.env.DB.prepare(`SELECT record.* FROM support_tickets record WHERE record.id=? AND (${principal?'1':clientScope})`)
    .bind(...(principal?[id]:[id,c.get('userId')])).first<{id:string;status:string;revision:number;client_id:string}>();
}
workspaceRouter.get('/api/workspace/tickets',async c => {
  const principal=await platformRoleForUser(c.env.DB,c.get('userId'));
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare(`SELECT record.id,record.subject,record.description,record.priority,record.status,record.created_at,record.revision
    FROM support_tickets record WHERE ${principal?'1':clientScope} ORDER BY record.created_at DESC,record.id LIMIT ? OFFSET ?`)
    .bind(...(principal?[limit,offset]:[c.get('userId'),limit,offset])).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,status:r.status==='pending'?'in_progress':r.status,created_at:iso(r.created_at)}))});
});
workspaceRouter.post('/api/workspace/tickets',async c => {
  const parsed=z.object({client_id:z.string().min(1),subject:z.string().trim().min(1).max(200),description:z.string().trim().max(2000),priority:z.enum(['low','medium','high','urgent'])}).strict().safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const b=parsed.data;
  if (!(await c.env.DB.prepare('SELECT 1 FROM client_account_access WHERE client_id=? AND user_id=?').bind(b.client_id,c.get('userId')).first())) return fail(c,'client_access_required',403);
  const id=crypto.randomUUID(), t=Date.now();
  return mutate(c,b,{id},[
    c.env.DB.prepare('INSERT INTO support_tickets(id,client_id,subject,description,priority,requester_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,b.client_id,b.subject,b.description,b.priority,c.get('userId'),t,t),
    audit(c,'workspace.ticket.created',id),
  ]);
});
workspaceRouter.get('/api/workspace/tickets/:id/messages',async c => {
  if (!(await ticketAccess(c,c.req.param('id')))) return fail(c,'not_found',404);
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare('SELECT id,ticket_id,author_id,content,is_staff_reply,created_at FROM support_messages WHERE ticket_id=? ORDER BY created_at,id LIMIT ? OFFSET ?').bind(c.req.param('id'),limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,is_staff_reply:r.is_staff_reply===1,created_at:iso(r.created_at)}))});
});
workspaceRouter.post('/api/workspace/tickets/:id/messages',async c => {
  const ticket=await ticketAccess(c,c.req.param('id'));
  if (!ticket) return fail(c,'not_found',404);
  if (ticket.status==='closed') return fail(c,'ticket_closed',409);
  const parsed=z.object({content:z.string().trim().min(1).max(4000)}).strict().safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const id=crypto.randomUUID();
  return mutate(c,parsed.data,{id},[
    c.env.DB.prepare(`INSERT INTO support_messages(id,ticket_id,author_id,content,is_staff_reply,created_at)
      VALUES (?,(SELECT id FROM support_tickets WHERE id=? AND status!='closed'),?,?,?,?)`).bind(id,ticket.id,c.get('userId'),parsed.data.content,staff(c)?1:0,Date.now()),
    audit(c,'workspace.ticket.replied',ticket.id),
  ]);
});
workspaceRouter.patch('/api/workspace/tickets/:id',async c => {
  if (!(await platformRoleForUser(c.env.DB,c.get('userId')))) return fail(c,'forbidden',403);
  const ticket=await ticketAccess(c,c.req.param('id'));
  if (!ticket) return fail(c,'not_found',404);
  const parsed=z.object({status:z.enum(['open','in_progress','resolved','closed']),revision:z.number().int().positive()}).strict().safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  if (ticket.revision!==parsed.data.revision) return fail(c,'revision_conflict',409);
  const status=parsed.data.status==='in_progress'?'pending':parsed.data.status;
  // Optimistic concurrency is enforced in SQL as well as the friendly precheck.
  return mutate(c,parsed.data,{ok:true},[
    c.env.DB.prepare(`UPDATE support_tickets SET status=?,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?`).bind(status,Date.now(),parsed.data.revision,ticket.id),
    audit(c,'workspace.ticket.status',ticket.id,{status}),
  ]);
});

workspaceRouter.get('/api/workspace/announcements',async c => {
  if (!staff(c)) return fail(c,'forbidden',403);
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare('SELECT id,author_id,title,content,priority,created_at FROM staff_announcements WHERE archived_at IS NULL ORDER BY created_at DESC,id LIMIT ? OFFSET ?').bind(limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,created_at:iso(r.created_at)}))});
});
workspaceRouter.post('/api/workspace/announcements',async c => {
  if (!staff(c)) return fail(c,'forbidden',403);
  const parsed=z.object({title:z.string().trim().min(1).max(200),content:z.string().trim().min(1).max(3000),priority:z.enum(['info','normal','important','critical'])}).strict().safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const b=parsed.data,id=crypto.randomUUID();
  return mutate(c,b,{id},[c.env.DB.prepare('INSERT INTO staff_announcements(id,author_id,title,content,priority,created_at) VALUES (?,?,?,?,?,?)').bind(id,c.get('userId'),b.title,b.content,b.priority,Date.now()),audit(c,'workspace.announcement.created',id)]);
});
workspaceRouter.delete('/api/workspace/announcements/:id',async c => {
  if (!staff(c)) return fail(c,'forbidden',403);
  const row=await c.env.DB.prepare('SELECT author_id FROM staff_announcements WHERE id=?').bind(c.req.param('id')).first<{author_id:string}>();
  if (!row || (row.author_id!==c.get('userId') && !(await platformRoleForUser(c.env.DB,c.get('userId'))))) return fail(c,'not_found',404);
  return mutate(c,{id:c.req.param('id')},{ok:true},[c.env.DB.prepare('UPDATE staff_announcements SET archived_at=? WHERE id=?').bind(Date.now(),c.req.param('id')),audit(c,'workspace.announcement.archived',c.req.param('id'))]);
});

workspaceRouter.get('/api/workspace/work-items/:projectId',async c => {
  const perm=await canAccessProject(c.env.DB,c.req.param('projectId'),c.get('userId'),c.get('roles'));
  if (!perm.read) return fail(c,'not_found',404);
  const {results}=await c.env.DB.prepare('SELECT id,project_id,kind,title,description,status,assignee_id,due_at,completed_at,revision FROM project_work_items WHERE project_id=? ORDER BY due_at IS NULL,due_at,id LIMIT 200').bind(c.req.param('projectId')).all();
  return c.json({data:results,canWrite:perm.write});
});
const itemSchema=z.object({kind:z.enum(['task','deliverable','onboarding','offboarding','maintenance']),title:z.string().trim().min(1).max(200),description:z.string().max(4000).nullable().optional(),due_at:z.number().int().min(0).nullable(),status:z.enum(['open','in_progress','blocked','done','cancelled'])}).strict();
workspaceRouter.post('/api/workspace/work-items/:projectId',async c => {
  const project=c.req.param('projectId');
  if (!(await canAccessProject(c.env.DB,project,c.get('userId'),c.get('roles'))).write) return fail(c,'forbidden',403);
  const parsed=itemSchema.safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const b=parsed.data,id=crypto.randomUUID(),t=Date.now();
  return mutate(c,b,{id},[c.env.DB.prepare(`INSERT INTO project_work_items(id,project_id,kind,title,description,status,due_at,completed_at,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id,project,b.kind,b.title,b.description||null,b.status,b.due_at,b.status==='done'?t:null,c.get('userId'),t,t),audit(c,'workspace.work.created',id)]);
});
workspaceRouter.patch('/api/workspace/work-items/:projectId/:id',async c => {
  const project=c.req.param('projectId');
  if (!(await canAccessProject(c.env.DB,project,c.get('userId'),c.get('roles'))).write) return fail(c,'forbidden',403);
  const row=await c.env.DB.prepare('SELECT revision FROM project_work_items WHERE project_id=? AND id=?').bind(project,c.req.param('id')).first<{revision:number}>();
  if (!row) return fail(c,'not_found',404);
  const parsed=itemSchema.extend({revision:z.number().int().positive()}).safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const b=parsed.data,t=Date.now();
  if (b.revision!==row.revision) return fail(c,'revision_conflict',409);
  return mutate(c,b,{ok:true},[c.env.DB.prepare(`UPDATE project_work_items SET kind=?,title=?,description=?,status=?,due_at=?,completed_at=?,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE project_id=? AND id=?`).bind(b.kind,b.title,b.description||null,b.status,b.due_at,b.status==='done'?t:null,t,b.revision,project,c.req.param('id')),audit(c,'workspace.work.updated',c.req.param('id'))]);
});

workspaceRouter.get('/api/workspace/staff',async c => {
  if (!staff(c)) return fail(c,'forbidden',403);
  const {results}=await c.env.DB.prepare(`SELECT u.id,COALESCE(p.pseudonym,p.display_name,u.display_name,'Membru') display_name,p.staff_role
    FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.disabled_at IS NULL AND EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN ('staff','admin')) ORDER BY display_name LIMIT 200`).all();
  return c.json({data:results});
});
const chatSchema=z.object({recipient_id:z.string().min(1).max(100).nullable(),channel:z.enum(['general','dev','design','marketing','random']),content:z.string().trim().min(1).max(4000)}).strict();
workspaceRouter.get('/api/workspace/chat',async c => {
  if (!staff(c)) return fail(c,'forbidden',403);
  const recipient=c.req.query('recipient_id'), channel=c.req.query('channel')||'general';
  const {limit,offset}=page(c);
  const where=recipient?'((author_id=? AND recipient_id=?) OR (author_id=? AND recipient_id=?))':'recipient_id IS NULL AND channel=?';
  const binds=recipient?[c.get('userId'),recipient,recipient,c.get('userId')]:[channel];
  const {results}=await c.env.DB.prepare(`SELECT id,author_id,recipient_id,channel,content,created_at FROM staff_chat_messages WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(...binds,limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.reverse().map(r=>({...r,created_at:iso(r.created_at)}))});
});
workspaceRouter.post('/api/workspace/chat',async c => {
  if (!staff(c)) return fail(c,'forbidden',403);
  const parsed=chatSchema.safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const b=parsed.data;
  if (b.recipient_id && !(await c.env.DB.prepare(`SELECT 1 FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=? AND u.disabled_at IS NULL AND r.role IN ('staff','admin') LIMIT 1`).bind(b.recipient_id).first())) return fail(c,'invalid_recipient');
  const id=crypto.randomUUID();
  return mutate(c,b,{id},[c.env.DB.prepare('INSERT INTO staff_chat_messages(id,author_id,recipient_id,channel,content,created_at) VALUES (?,?,?,?,?,?)').bind(id,c.get('userId'),b.recipient_id,b.channel,b.content,Date.now()),audit(c,'workspace.chat.sent',id)]);
});

workspaceRouter.get('/api/workspace/domains',async c=>{
  if(!staff(c))return fail(c,'forbidden',403);
  const from=Number(c.req.query('from')||0),to=Number(c.req.query('to')||Date.now());
  if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to<from)return fail(c,'invalid_period');
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare('SELECT id,domain,status,source,created_at FROM internal_domain_checks WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC,id LIMIT ? OFFSET ?').bind(from,to,limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,name:String(r.domain).split('.')[0],tld:String(r.domain).split('.').at(-1),created_at:iso(r.created_at)}))});
});
workspaceRouter.post('/api/workspace/domains',async c=>{
  if(!staff(c))return fail(c,'forbidden',403);
  const b=z.object({domain:z.string().max(253)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!b.success)return fail(c,'invalid_domain');
  const domain=normalizeDomain(b.data.domain);if(!domain)return fail(c,'invalid_domain');
  const rate=await checkRateLimit(c.env.DB,[{key:`domain-internal:${c.get('userId')}`,limit:30,windowSec:3600}]);
  if(!rate.ok)return c.json({error:{code:'rate_limited'}},429);
  const result=await lookupDomain(domain),id=crypto.randomUUID();
  return mutate(c,b.data,{id,...result},[c.env.DB.prepare('INSERT INTO internal_domain_checks(id,domain,status,source,checked_by,created_at) VALUES (?,?,?,?,?,?)').bind(id,domain,result.status,result.source,c.get('userId'),Date.now()),audit(c,'workspace.domain.checked',id)]);
});
workspaceRouter.get('/api/workspace/statistics',async c=>{
  const principal=await platformRoleForUser(c.env.DB,c.get('userId'));
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare(`SELECT metric.*,project.name product_name FROM project_statistics metric JOIN projects project ON project.id=metric.project_id
    WHERE (?=1 OR project.owner_user_id=? OR EXISTS (SELECT 1 FROM project_staff WHERE project_id=project.id AND user_id=?) OR EXISTS (SELECT 1 FROM organization_memberships WHERE organization_id=project.organization_id AND user_id=? AND status='active'))
    ORDER BY metric.period_end DESC,metric.id LIMIT ? OFFSET ?`).bind(principal?1:0,c.get('userId'),c.get('userId'),c.get('userId'),limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,subscription_id:r.project_id,period_start:iso(r.period_start),period_end:iso(r.period_end)}))});
});
workspaceRouter.post('/api/workspace/statistics/:projectId',async c=>{
  if(!(await canAccessProject(c.env.DB,c.req.param('projectId'),c.get('userId'),c.get('roles'))).write)return fail(c,'forbidden',403);
  const metric=z.number().int().min(0).max(9000000000).nullable();
  const parsed=z.object({period_start:z.number().int().min(0),period_end:z.number().int().positive(),visits:metric,unique_visitors:metric,uptime_percent:z.number().min(0).max(100).nullable(),avg_response_ms:metric,source:z.string().trim().min(1).max(200)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!parsed.success||parsed.data.period_end<=parsed.data.period_start||parsed.data.period_end>Date.now())return fail(c,'invalid_statistics');
  const b=parsed.data,id=crypto.randomUUID();
  return mutate(c,b,{id},[c.env.DB.prepare('INSERT INTO project_statistics(id,project_id,period_start,period_end,visits,unique_visitors,uptime_percent,avg_response_ms,source,recorded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,c.req.param('projectId'),b.period_start,b.period_end,b.visits,b.unique_visitors,b.uptime_percent,b.avg_response_ms,b.source,c.get('userId'),Date.now()),audit(c,'workspace.statistics.recorded',id)]);
});
