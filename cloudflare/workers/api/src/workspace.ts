import {domainProviderStatus} from "./domainProvider";
import {clientPaymentHistory} from "./clientPayments";
import { linkClientsByEmail } from "./clientAccountSync";
export { linkClientsByEmail } from "./clientAccountSync";
import { dashboardActivityRouter } from "./dashboardActivity";
import {managedStaff,canManageStaffTarget} from "./staffAccessPolicy";
import { createMaintenanceRouter } from "./maintenance";
import {maintenanceWorkAccess,maintenanceProjectScope} from "./maintenancePolicy";
import { normalizeDomain, lookupDomain } from "./domain";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { hasCapability, isReservedPlatformEmail, platformRoleForUser,projectOwnerAccessSql } from "./authorization";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { sha256 } from "./security";
import { readJsonBodyUpTo } from "./requestBody";
import { canAccessProject } from "./projects";
import { getScannedObject } from "./malware";

export const workspaceRouter = new Hono<AppBindings>();
workspaceRouter.route("/", dashboardActivityRouter);
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
async function mutate(c: Ctx, _value: unknown, result: Record<string,unknown>, statements: D1PreparedStatement[], requestHash?:string) {
  const key = c.req.header('idempotency-key') || '';
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(key)) return fail(c,'idempotency_key_required');
  const scope = `workspace:${c.get('userId')}:${c.req.method}:${c.req.path}`;
  const hash = requestHash ?? await sha256(JSON.stringify(await c.req.json().catch(()=>null)));
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
    if (/NOT NULL constraint failed: (support_tickets|project_work_items|subscriptions)\.revision/.test(String(error))) return fail(c,'revision_conflict',409);
    if (/NOT NULL constraint failed: support_messages\.ticket_id/.test(String(error))) return fail(c,'ticket_closed',409);
    if (/UNIQUE constraint failed: subscriptions\.maintenance_key/.test(String(error))) return fail(c,'maintenance_exists',409);
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
  if(!['GET','HEAD','OPTIONS'].includes(c.req.method)&&c.req.path.startsWith('/api/workspace/maintenance')){
    if(!await platformRoleForUser(c.env.DB,c.get('userId'))&&!await hasCapability(c.env.DB,c.get('userId'),'maintenance.manage'))return fail(c,'forbidden',403);
    if(!await privilegedMfaSatisfied(c))return fail(c,'mfa_required',403);
  }
  // Revalidate assignments before returning a cached write result after revocation.
  const workPath=c.req.path.match(/^\/api\/workspace\/work-items\/([^/]+)(?:\/([^/]+))?$/);
  if(workPath&&['POST','PATCH'].includes(c.req.method)){
    const body=await c.req.json<{kind?:unknown}>().catch(()=>null);
    const original=workPath[2]?await c.env.DB.prepare('SELECT kind FROM project_work_items WHERE project_id=? AND id=?').bind(workPath[1],workPath[2]).first<{kind:string}>():null;
    const maintenance=body?.kind==='maintenance'&&(!workPath[2]||original?.kind==='maintenance');
    const access=maintenance?await maintenanceWorkAccess(c.env,workPath[1],c.get('userId'),c.get('roles')):await canAccessProject(c.env.DB,workPath[1],c.get('userId'),c.get('roles'));
    if(!access.write)return fail(c,'forbidden',403);
  }
  // Read receipts validate their resource and bounded body before replaying a result.
  const supportRead=c.req.method==='POST'&&/^\/api\/workspace\/tickets\/[^/]+\/read$/.test(c.req.path);
  if (!['GET','HEAD','OPTIONS'].includes(c.req.method)&&!supportRead) {
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
  if (!staff(c)) await linkClientsByEmail(c.env.DB,c.get('userId'));
  const {results} = await c.env.DB.prepare(`SELECT record.id,record.company_name FROM clients record WHERE ${clientScope.replace('record.client_id','record.id')} ORDER BY record.company_name`).bind(c.get('userId')).all();
  return c.json({data:results});
});
workspaceRouter.get('/api/workspace/invoices',async c => {
  if (!staff(c)) await linkClientsByEmail(c.env.DB,c.get('userId'));
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare(`SELECT record.id,record.invoice_number,record.gross_amount_minor amount_cents,record.currency,record.status,record.invoice_date,record.due_date,(SELECT fulfillment.order_id FROM billing_order_fulfillments fulfillment JOIN commerce_orders purchase ON purchase.id=fulfillment.order_id AND purchase.user_id=? WHERE (fulfillment.provider='stripe' AND fulfillment.provider_reference=record.stripe_reference) OR (fulfillment.provider='revolut' AND fulfillment.provider_reference=record.revolut_reference) LIMIT 1) order_id,
    EXISTS(SELECT 1 FROM financial_documents document WHERE document.revenue_id=record.id AND document.document_type='invoice' AND document.content_type='application/pdf' AND document.status='active') has_pdf
    FROM financial_revenues record WHERE ${clientScope} AND record.archived_at IS NULL AND record.status NOT IN ('draft','archived') ORDER BY record.invoice_date DESC,record.id LIMIT ? OFFSET ?`)
    .bind(c.get('userId'),c.get('userId'),limit,offset).all<Record<string,unknown>>();
  c.header('cache-control','private, no-store');
  return c.json({data:results.map(r=>({...r,invoice_number:r.invoice_number||r.id,status:r.status==='paid'?'paid':r.status==='overdue'?'overdue':['cancelled','refunded'].includes(String(r.status))?'cancelled':'pending',issued_at:iso(r.invoice_date),due_at:iso(r.due_date),pdf_url:null,download_url:r.has_pdf?`/api/workspace/invoices/${encodeURIComponent(String(r.id))}/content`:null})),nextOffset:results.length===limit?offset+limit:null});
});
workspaceRouter.get('/api/workspace/payments',async c=>{
  if(!staff(c))await linkClientsByEmail(c.env.DB,c.get('userId'));
  const {limit,offset}=page(c);
  return c.json(await clientPaymentHistory(c.env.DB,c.get('userId'),limit,offset));
});
workspaceRouter.get('/api/workspace/invoices/:invoiceId/content',async c=>{
  if(!staff(c))await linkClientsByEmail(c.env.DB,c.get('userId'));
  const invoice=await c.env.DB.prepare(`SELECT record.id FROM financial_revenues record WHERE record.id=? AND ${clientScope} AND record.archived_at IS NULL AND record.status NOT IN ('draft','archived')`).bind(c.req.param('invoiceId'),c.get('userId')).first();
  if(!invoice)return fail(c,'not_found',404);
  const file=await c.env.DB.prepare("SELECT r2_object_key,file_name FROM financial_documents WHERE revenue_id=? AND document_type='invoice' AND content_type='application/pdf' AND status='active' ORDER BY version DESC,created_at DESC,id DESC LIMIT 1").bind(c.req.param('invoiceId')).first<{r2_object_key:string;file_name:string}>();
  if(!file)return fail(c,'not_found',404);
  const object=await getScannedObject(c.env,'FILES',file.r2_object_key);
  if(!object)return fail(c,'not_found',404);
  await audit(c,'client.invoice.download',c.req.param('invoiceId')).run();
  return new Response(object.body,{headers:{'content-type':'application/pdf','content-disposition':`attachment; filename="${file.file_name.replace(/[^A-Za-z0-9._-]/g,'_').slice(0,120)||'factura.pdf'}"`,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
});
workspaceRouter.get('/api/workspace/subscriptions',async c => {
  if (!staff(c)) await linkClientsByEmail(c.env.DB,c.get('userId'));
  const {limit,offset}=page(c),scope=maintenanceProjectScope(c.get('userId'),false);
  const {results}=await c.env.DB.prepare(`SELECT record.id,service.service_name product_name,service.price,service.billing_cycle,record.status,record.next_billing_date,
   (SELECT payment_terms_days FROM subscription_billing_settings b WHERE b.subscription_id=record.id AND b.client_id=record.client_id) payment_terms_days,record.maintenance_enabled,record.plan_sku,record.specifications_json,record.target_label,record.product_slug,record.external_url,record.created_at,p.id project_id,
   (SELECT group_concat(COALESCE(profile.pseudonym,profile.display_name,u.display_name,'Membru staff'),', ') FROM subscription_staff ss JOIN users u ON u.id=ss.user_id LEFT JOIN profiles profile ON profile.id=u.id WHERE ss.subscription_id=record.id AND u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role IN('staff','admin'))) staff_names
    FROM subscriptions record JOIN services service ON service.id=record.service_id JOIN projects p ON p.id=service.project_id WHERE record.client_id=p.client_id AND ${scope.sql} ORDER BY record.next_billing_date,record.id LIMIT ? OFFSET ?`)
    .bind(...scope.values,limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,billing_ready:r.payment_terms_days!==null,price_cents:Math.round(Number(r.price)*100),currency:'RON',status:r.status==='paused'?'suspended':r.status,description:r.target_label||null,started_at:r.created_at?iso(r.created_at):null,next_renewal_at:iso(r.next_billing_date)}))});
});

workspaceRouter.get('/api/workspace/account-access/:userId',async c => {
  if (!(await platformRoleForUser(c.env.DB,c.get('userId')))) return fail(c,'forbidden',403);
  const {results}=await c.env.DB.prepare('SELECT client_id FROM client_account_access WHERE user_id=?').bind(c.req.param('userId')).all();
  return c.json({data:results});
});
workspaceRouter.put('/api/workspace/account-access/:userId',async c => {
  const rate=await checkRateLimit(c.env.DB,[{key:`workspace-access:${c.get('userId')}`,limit:30,windowSec:3600}]);
  if(!rate.ok)return c.json({error:{code:'rate_limited'}},429);
  const actorPlatformRole=await platformRoleForUser(c.env.DB,c.get('userId'));
  if (!actorPlatformRole) return fail(c,'forbidden',403);
  const parsed=z.object({client_ids:z.array(z.string().min(1).max(100)).max(100),access_level:z.enum(['user','staff','admin']).optional()}).strict().safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const user=c.req.param('userId');
  const target=await c.env.DB.prepare('SELECT id,email,email_verified FROM users WHERE id=? AND disabled_at IS NULL').bind(user).first<{id:string;email:string;email_verified:number}>();
  if (!target) return fail(c,'not_found',404);
  const accessLevel=parsed.data.access_level;
  if(!await canManageStaffTarget(c.env.DB,c.get('userId'),user))return fail(c,'platform_owner_required',403);
  if(await managedStaff(c.env.DB,user))return fail(c,'use_staff_access_manager',409);
  if (accessLevel && await isReservedPlatformEmail(c.env.DB,target.email)) {
    if (accessLevel !== 'admin') return fail(c,'platform_principal_protected',409);
    if (target.email_verified !== 1) return fail(c,'verification_required',409);
    if (actorPlatformRole !== 'platform_owner') return fail(c,'platform_owner_required',403);
  }
  const ids=[...new Set(parsed.data.client_ids)];
  for (const id of ids) if (!(await c.env.DB.prepare("SELECT id FROM clients WHERE id=? AND status!='archived'").bind(id).first())) return fail(c,'invalid_client');
  return mutate(c,parsed.data,{ok:true},[
    ...(accessLevel ? [c.env.DB.prepare('DELETE FROM user_roles WHERE user_id=?').bind(user), ...(['user',...(accessLevel==='user'?[]:[accessLevel])].map(role=>c.env.DB.prepare('INSERT INTO user_roles(user_id,role) VALUES (?,?)').bind(user,role)))] : []),
    c.env.DB.prepare('UPDATE clients SET access_managed=1 WHERE id IN(SELECT client_id FROM client_account_access WHERE user_id=?)').bind(user),
    ...ids.map(id=>c.env.DB.prepare('UPDATE clients SET access_managed=1 WHERE id=?').bind(id)),
    c.env.DB.prepare('DELETE FROM client_account_access WHERE user_id=?').bind(user),
    ...ids.map(id=>c.env.DB.prepare('INSERT INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES (?,?,?,?)').bind(id,user,c.get('userId'),Date.now())),
    audit(c,'workspace.client_access.updated',user,{client_ids:ids,access_level:accessLevel}),
  ]);
});

// Support is a team workflow: staff and admins work the whole queue.
async function ensureClientForUser(c: Ctx,requested?: string): Promise<string|null> {
  const userId=c.get('userId'), db=c.env.DB;
  const linked=async()=>{
    const row=requested
      ? await db.prepare('SELECT client_id FROM client_account_access WHERE client_id=? AND user_id=?').bind(requested,userId).first<{client_id:string}>()
      : await db.prepare('SELECT client_id FROM client_account_access WHERE user_id=? ORDER BY created_at LIMIT 1').bind(userId).first<{client_id:string}>();
    return row?.client_id ?? null;
  };
  let id=await linked(); if (id) return id;
  await linkClientsByEmail(db,userId);
  id=await linked(); if (id || requested) return id;
  const user=await db.prepare('SELECT email,display_name FROM users WHERE id=?').bind(userId).first<{email:string;display_name:string|null}>();
  if (!user) return null;
  if(await db.prepare("SELECT 1 FROM clients WHERE lower(trim(email))=lower(trim(?)) AND access_managed=1").bind(user.email).first())return null;
  const clientId=crypto.randomUUID(), t=Date.now();
  await db.batch([
    db.prepare("INSERT INTO clients(id,company_name,contact_name,email,status,created_at) VALUES (?,?,?,?,'active',?)").bind(clientId,user.display_name||user.email,user.display_name,user.email,t),
    db.prepare('INSERT OR IGNORE INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES (?,?,?,?)').bind(clientId,userId,userId,t),
  ]);
  return clientId;
}

async function ticketAccess(c: Ctx,id: string) {
  const principal=staff(c);
  return c.env.DB.prepare(`SELECT record.* FROM support_tickets record WHERE record.id=? AND (${principal?'1':clientScope})`)
    .bind(...(principal?[id]:[id,c.get('userId')])).first<{id:string;status:string;revision:number;client_id:string}>();
}
workspaceRouter.get('/api/workspace/support-unread-count',async c => {
  if(staff(c))return fail(c,'forbidden',403);
  const user=c.get('userId');
  const row=await c.env.DB.prepare(`SELECT count(*) total FROM client_account_access access
    JOIN support_tickets record ON record.client_id=access.client_id
    JOIN support_messages message ON message.ticket_id=record.id
    LEFT JOIN support_ticket_reads seen ON seen.ticket_id=record.id AND seen.user_id=?
    WHERE access.user_id=? AND message.author_id<>? AND
      (seen.message_at IS NULL OR message.created_at>seen.message_at OR
      (message.created_at=seen.message_at AND message.id>seen.message_id))`)
    .bind(user,user,user).first<{total:number}>();
  return c.json({unread:Number(row?.total||0)});
});
workspaceRouter.post('/api/workspace/tickets/:id/read',async c => {
  const ticket=await ticketAccess(c,c.req.param('id'));
  if(!ticket)return fail(c,'not_found',404);
  const input=await readJsonBodyUpTo(c.req.raw,2048);
  if(!input.ok)return c.json({error:{code:input.error}},input.error==='payload_too_large'?413:400);
  const parsed=z.object({messageId:z.string().min(1).max(160)}).strict().safeParse(input.value);
  if(!parsed.success)return fail(c,'invalid_input');
  const message=await c.env.DB.prepare('SELECT id,created_at FROM support_messages WHERE ticket_id=? AND id=?')
    .bind(ticket.id,parsed.data.messageId).first<{id:string;created_at:number}>();
  if(!message)return fail(c,'not_found',404);
  return mutate(c,parsed.data,{ok:true},[
    c.env.DB.prepare(`INSERT INTO support_ticket_reads(user_id,ticket_id,message_id,message_at,updated_at) VALUES(?,?,?,?,?)
      ON CONFLICT(user_id,ticket_id) DO UPDATE SET message_id=excluded.message_id,message_at=excluded.message_at,updated_at=excluded.updated_at,is_baseline=0
      WHERE excluded.message_at>support_ticket_reads.message_at OR (excluded.message_at=support_ticket_reads.message_at AND (excluded.message_id>support_ticket_reads.message_id OR (excluded.message_id=support_ticket_reads.message_id AND support_ticket_reads.is_baseline=1)))`)
      .bind(c.get('userId'),ticket.id,message.id,message.created_at,Date.now()),
    audit(c,'workspace.ticket.read',ticket.id),
  ],await sha256(JSON.stringify(parsed.data)));
});
workspaceRouter.get('/api/workspace/tickets',async c => {
  const principal=staff(c);
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare(`SELECT record.id,record.subject,record.description,record.priority,record.status,record.created_at,record.revision
    FROM support_tickets record WHERE ${principal?'1':clientScope} ORDER BY record.created_at DESC,record.id LIMIT ? OFFSET ?`)
    .bind(...(principal?[limit,offset]:[c.get('userId'),limit,offset])).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,status:r.status==='pending'?'in_progress':r.status,created_at:iso(r.created_at)}))});
});
workspaceRouter.post('/api/workspace/tickets',async c => {
  const parsed=z.object({client_id:z.string().optional(),subject:z.string().trim().min(1).max(200),description:z.string().trim().max(2000),priority:z.enum(['low','medium','high','urgent'])}).strict().safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const b=parsed.data;
  const clientId=await ensureClientForUser(c,b.client_id);
  if (!clientId) return fail(c,'client_access_required',403);
  const id=crypto.randomUUID(), t=Date.now();
  return mutate(c,b,{id},[
    c.env.DB.prepare('INSERT INTO support_tickets(id,client_id,subject,description,priority,requester_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,clientId,b.subject,b.description,b.priority,c.get('userId'),t,t),
    audit(c,'workspace.ticket.created',id),
  ]);
});
workspaceRouter.get('/api/workspace/tickets/:id/messages',async c => {
  if (!(await ticketAccess(c,c.req.param('id')))) return fail(c,'not_found',404);
  const {limit,offset}=page(c);
  const columns='id,ticket_id,author_id,content,is_staff_reply,created_at';
  const sql=c.req.query('recent')==='1'
    ? `SELECT * FROM (SELECT ${columns} FROM support_messages WHERE ticket_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?) ORDER BY created_at,id`
    : `SELECT ${columns} FROM support_messages WHERE ticket_id=? ORDER BY created_at,id LIMIT ? OFFSET ?`;
  const {results}=await c.env.DB.prepare(sql).bind(c.req.param('id'),limit,offset).all<Record<string,unknown>>();
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
  if (!staff(c)) return fail(c,'forbidden',403);
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
  const {results}=await c.env.DB.prepare('SELECT a.id,a.author_id,a.title,a.content,a.priority,a.created_at,r.read_at FROM staff_announcements a LEFT JOIN staff_announcement_reads r ON r.announcement_id=a.id AND r.user_id=? WHERE a.archived_at IS NULL ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?').bind(c.get('userId'),limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,created_at:iso(r.created_at)}))});
});
workspaceRouter.post('/api/workspace/announcements/:id/read',async c => {
  if (!staff(c)) return fail(c,'forbidden',403);
  const id=c.req.param('id');
  const row=await c.env.DB.prepare('SELECT 1 FROM staff_announcements WHERE id=? AND archived_at IS NULL').bind(id).first();
  if(!row)return fail(c,'not_found',404);
  return mutate(c,{id},{ok:true},[c.env.DB.prepare('INSERT INTO staff_announcement_reads(user_id,announcement_id,read_at) VALUES(?,?,?) ON CONFLICT(user_id,announcement_id) DO NOTHING').bind(c.get('userId'),id,Date.now())]);
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
  const onlyMaintenance=c.req.query('kind')==='maintenance';
  const perm=onlyMaintenance?await maintenanceWorkAccess(c.env,c.req.param('projectId'),c.get('userId'),c.get('roles')):await canAccessProject(c.env.DB,c.req.param('projectId'),c.get('userId'),c.get('roles'));
  if (!perm.read) return fail(c,'not_found',404);
  const {results}=await c.env.DB.prepare("SELECT id,project_id,kind,title,description,status,assignee_id,due_at,completed_at,revision FROM project_work_items WHERE project_id=? AND (?=0 OR kind='maintenance') ORDER BY due_at IS NULL,due_at,id LIMIT 200").bind(c.req.param('projectId'),onlyMaintenance?1:0).all();
  return c.json({data:results,canWrite:perm.write});
});
const itemSchema=z.object({kind:z.enum(['task','deliverable','onboarding','offboarding','maintenance']),title:z.string().trim().min(1).max(200),description:z.string().max(4000).nullable().optional(),due_at:z.number().int().min(0).nullable(),status:z.enum(['open','in_progress','blocked','done','cancelled'])}).strict();
workspaceRouter.post('/api/workspace/work-items/:projectId',async c => {
  const project=c.req.param('projectId');
  const parsed=itemSchema.safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const b=parsed.data,id=crypto.randomUUID(),t=Date.now();
  const permission=b.kind==='maintenance'?await maintenanceWorkAccess(c.env,project,c.get('userId'),c.get('roles')):await canAccessProject(c.env.DB,project,c.get('userId'),c.get('roles'));
  if(!permission.write)return fail(c,'forbidden',403);
  return mutate(c,b,{id},[c.env.DB.prepare(`INSERT INTO project_work_items(id,project_id,kind,title,description,status,due_at,completed_at,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id,project,b.kind,b.title,b.description||null,b.status,b.due_at,b.status==='done'?t:null,c.get('userId'),t,t),audit(c,'workspace.work.created',id)]);
});
workspaceRouter.patch('/api/workspace/work-items/:projectId/:id',async c => {
  const project=c.req.param('projectId');
  const row=await c.env.DB.prepare('SELECT revision,kind FROM project_work_items WHERE project_id=? AND id=?').bind(project,c.req.param('id')).first<{revision:number;kind:string}>();
  if (!row) return fail(c,'not_found',404);
  const parsed=itemSchema.extend({revision:z.number().int().positive()}).safeParse(await c.req.json().catch(()=>null));
  if (!parsed.success) return fail(c,'invalid_input');
  const b=parsed.data,t=Date.now();
  const permission=b.kind==='maintenance'&&row.kind==='maintenance'?await maintenanceWorkAccess(c.env,project,c.get('userId'),c.get('roles')):await canAccessProject(c.env.DB,project,c.get('userId'),c.get('roles'));
  if(!permission.write)return fail(c,'forbidden',403);
  if (b.revision!==row.revision) return fail(c,'revision_conflict',409);
  return mutate(c,b,{ok:true},[c.env.DB.prepare(`UPDATE project_work_items SET kind=?,title=?,description=?,status=?,due_at=?,completed_at=?,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE project_id=? AND id=?`).bind(b.kind,b.title,b.description||null,b.status,b.due_at,b.status==='done'?t:null,t,b.revision,project,c.req.param('id')),audit(c,'workspace.work.updated',c.req.param('id'))]);
});

const staffDirectory=async (c:Ctx) => {
  if (!staff(c)) return fail(c,'forbidden',403);
  const {results}=await c.env.DB.prepare(`SELECT u.id,COALESCE(p.pseudonym,p.display_name,u.display_name,'Membru') display_name,p.staff_role,COALESCE(CASE WHEN u.email_verified=1 AND EXISTS(SELECT 1 FROM user_roles ar WHERE ar.user_id=u.id AND ar.role='admin') THEN principal.role END,rank.rank_id) rank_id
    FROM users u LEFT JOIN profiles p ON p.id=u.id LEFT JOIN staff_rank_assignments rank ON rank.user_id=u.id LEFT JOIN platform_principals principal ON principal.email=u.email COLLATE NOCASE AND principal.status='active' WHERE u.disabled_at IS NULL AND EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN ('staff','admin')) ORDER BY display_name LIMIT 200`).all();
  return c.json({data:results});
};
workspaceRouter.get('/api/workspace/staff',staffDirectory);
workspaceRouter.get('/api/workspace/chat/members',staffDirectory);

const chatSchema=z.object({recipient_id:z.string().min(1).max(100).nullable(),channel:z.enum(['general','dev','design','marketing','random']),content:z.string().trim().min(1).max(4000)}).strict();
workspaceRouter.get('/api/workspace/chat',async c => {
  if (!staff(c)) return fail(c,'forbidden',403);
  const recipient=c.req.query('recipient_id'), channel=c.req.query('channel')||'general';
  const {limit,offset}=page(c);
  const where=recipient?'((author_id=? AND recipient_id=?) OR (author_id=? AND recipient_id=?))':'recipient_id IS NULL AND channel=?';
  const binds:(string|number)[]=recipient?[c.get('userId'),recipient,recipient,c.get('userId')]:[channel];
  if(!['general','dev','design','marketing','random'].includes(channel))return fail(c,'invalid_channel');
  const before=c.req.query('before');
  let cursorSql='';
  if(before){const separator=before.indexOf(':');const at=Number(before.slice(0,separator)),id=before.slice(separator+1);if(separator<1||!Number.isSafeInteger(at)||at<0||!/^[-a-zA-Z0-9_.:]{1,160}$/.test(id))return fail(c,'invalid_cursor');cursorSql=' AND (created_at<? OR(created_at=? AND id<?))';binds.push(at,at,id);}
  const {results}=await c.env.DB.prepare(`SELECT id,author_id,recipient_id,channel,content,created_at FROM staff_chat_messages WHERE project_id IS NULL AND (${where}) ${cursorSql} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(...binds,limit,before?0:offset).all<Record<string,unknown>>();
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

workspaceRouter.get('/api/workspace/domains/provider',async c=>{if(!staff(c))return fail(c,'forbidden',403);c.header('Cache-Control','private, no-store');return c.json(domainProviderStatus(c.env));});
workspaceRouter.get('/api/workspace/domains',async c=>{
  if(!staff(c))return fail(c,'forbidden',403);
  const from=Number(c.req.query('from')||0),to=Number(c.req.query('to')||Date.now());
  if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to<from)return fail(c,'invalid_period');
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare(`SELECT id,domain,status,source,created_at,origin FROM (
    SELECT id,domain,status,source,created_at,'internal' AS origin FROM internal_domain_checks WHERE created_at BETWEEN ? AND ?
    UNION ALL
    SELECT id,domain,status,source,created_at,'public' AS origin FROM public_domain_checks WHERE created_at BETWEEN ? AND ?
  ) ORDER BY created_at DESC,id LIMIT ? OFFSET ?`).bind(from,to,from,to,limit,offset).all<Record<string,unknown>>();
  return c.json({data:results.map(r=>({...r,name:String(r.domain).split('.')[0],tld:String(r.domain).split('.').at(-1),created_at:iso(r.created_at)}))});
});
workspaceRouter.post('/api/workspace/domains',async c=>{
  if(!staff(c))return fail(c,'forbidden',403);
  const b=z.object({domain:z.string().max(253)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!b.success)return fail(c,'invalid_domain');
  const domain=normalizeDomain(b.data.domain);if(!domain)return fail(c,'invalid_domain');
  const rate=await checkRateLimit(c.env.DB,[{key:`domain-internal:${c.get('userId')}`,limit:30,windowSec:3600}]);
  if(!rate.ok)return c.json({error:{code:'rate_limited'}},429);
  const result=await lookupDomain(domain,c.env),id=crypto.randomUUID();
  return mutate(c,b.data,{id,...result},[c.env.DB.prepare('INSERT INTO internal_domain_checks(id,domain,status,source,checked_by,created_at) VALUES (?,?,?,?,?,?)').bind(id,domain,result.status,result.source,c.get('userId'),Date.now()),audit(c,'workspace.domain.checked',id)]);
});
workspaceRouter.get('/api/workspace/statistics',async c=>{
  const principal=await platformRoleForUser(c.env.DB,c.get('userId'));
  const {limit,offset}=page(c);
  const {results}=await c.env.DB.prepare(`SELECT metric.*,project.name product_name FROM project_statistics metric JOIN projects project ON project.id=metric.project_id
    WHERE (?=1 OR ${projectOwnerAccessSql("project")} OR EXISTS (SELECT 1 FROM project_staff WHERE project_id=project.id AND user_id=?) OR EXISTS (SELECT 1 FROM organization_memberships WHERE organization_id=project.organization_id AND user_id=? AND status='active'))
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

workspaceRouter.route("/",createMaintenanceRouter(mutate));

// Thread previews contain only shared channels and the caller's own direct messages.
workspaceRouter.get('/api/workspace/chat/conversations',async c=>{
 if(!staff(c))return fail(c,'forbidden',403);
 const user=c.get('userId');
 const rows=await c.env.DB.prepare(`WITH visible AS(
  SELECT *,CASE WHEN recipient_id IS NULL THEN 'channel:'||channel WHEN author_id=? THEN 'dm:'||recipient_id ELSE 'dm:'||author_id END target FROM staff_chat_messages WHERE project_id IS NULL AND (recipient_id IS NULL OR author_id=? OR recipient_id=?)
 ),ranked AS(SELECT *,row_number() OVER(PARTITION BY target ORDER BY created_at DESC,id DESC) rn FROM visible)
 SELECT v.target,max(CASE WHEN rn=1 THEN v.id END) last_id,max(CASE WHEN rn=1 THEN v.content END) last_content,max(v.created_at) last_at,
 sum(CASE WHEN v.author_id<>? AND (r.message_at IS NULL OR v.created_at>r.message_at OR(v.created_at=r.message_at AND v.id>r.message_id)) THEN 1 ELSE 0 END) unread
 FROM ranked v LEFT JOIN staff_chat_reads r ON r.user_id=? AND r.target=v.target GROUP BY v.target ORDER BY last_at DESC LIMIT 500`).bind(user,user,user,user,user).all<Record<string,unknown>>();
 return c.json({data:rows.results.map(r=>({...r,last_at:iso(r.last_at)}))});
});
workspaceRouter.post('/api/workspace/chat/read',async c=>{
 if(!staff(c))return fail(c,'forbidden',403);
 const parsed=z.object({target:z.string().regex(/^(channel:(general|dev|design|marketing|random)|dm:[-a-zA-Z0-9_.:]{1,160})$/),messageId:z.string().min(1).max(160)}).strict().safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return fail(c,'invalid_input');
 const b=parsed.data,user=c.get('userId');
 const row=await c.env.DB.prepare("SELECT created_at,author_id,recipient_id,channel FROM staff_chat_messages WHERE id=? AND project_id IS NULL AND (recipient_id IS NULL OR author_id=? OR recipient_id=?)").bind(b.messageId,user,user).first<{created_at:number;author_id:string;recipient_id:string|null;channel:string}>();
 if(!row)return fail(c,'not_found',404);
 const target=row.recipient_id===null?'channel:'+row.channel:'dm:'+(row.author_id===user?row.recipient_id:row.author_id);if(target!==b.target)return fail(c,'invalid_scope',403);
 return mutate(c,b,{ok:true},[c.env.DB.prepare(`INSERT INTO staff_chat_reads(user_id,target,message_id,message_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,target) DO UPDATE SET message_id=excluded.message_id,message_at=excluded.message_at,updated_at=excluded.updated_at WHERE excluded.message_at>staff_chat_reads.message_at OR(excluded.message_at=staff_chat_reads.message_at AND excluded.message_id>staff_chat_reads.message_id)`).bind(user,b.target,b.messageId,row.created_at,Date.now())]);
});
