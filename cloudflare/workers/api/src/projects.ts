import {projectSummaryColumns,projectBudgetAccess} from "./projectSummary";
import {PROJECT_KIND_LABELS} from "../../../../src/shared/projectSummary";
import {confirmedServiceItems,type ClientServicePurchase,type ClientProjectService} from "../../../../src/shared/clientServices";
import { managedStaff, managedPermission } from "./staffAccessPolicy";
import { hasCapability } from "./authorization";
// Avyron API — Rute Platformă Internă pentru proiecte
// Import și mount în src/index.ts: `app.route("/", projectsRouter);`
//
// Toate rutele necesită auth. Accesul este evaluat per proiect prin rol de
// platformă, apartenență activă la organizație, alocare explicită ori grant
// pentru clientul proiectului; proprietarul client poate citi proiectul.

import { Hono, type Context } from "hono";
import type { Env, AppBindings } from "./types";
import { fetchMetadataHtml, validateMetadataUrl } from "./metadata";
import { organizationRoleForUser, platformRoleForUser,clientProjectGrantSql,projectOwnerResourceGrantSql,projectOwnerAccessSql } from "./authorization";
import { normalizeExternalLink } from "../../../../src/shared/externalUrl";
import { PROJECT_STAGES, type ProjectStage } from "../../../../src/shared/projectLifecycle";
import { readJsonBodyUpTo } from "./requestBody";

type Role = "user" | "staff" | "admin";

const uuid = () => crypto.randomUUID();
const now = () => Date.now();

type ProjectAccess = { read: boolean; write: boolean; isStaff: boolean; isOwner: boolean };
/** One native ACL evaluator for both project actions and multi-resource private feeds.
 * All authorization inputs are live D1 records, scoped to this request. */
export async function projectAccessMap(db:D1Database, projectIds:string[], userId:string, roles:Role[]):Promise<Map<string,ProjectAccess>> {
  const ids=[...new Set(projectIds)].slice(0,200);
  if(!ids.length)return new Map();
  const principal=await platformRoleForUser(db,userId);
  const policy=principal?null:await managedStaff(db,userId);
  const rows=await db.prepare(`SELECT p.id,p.owner_user_id,p.organization_id,${projectOwnerResourceGrantSql("p")} owner_granted,
    (SELECT m.role FROM organization_memberships m WHERE m.organization_id=p.organization_id AND m.user_id=? AND m.status='active') membership,
    EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=p.id AND ps.user_id=?) assigned,
    ${clientProjectGrantSql("p")} client_grant,
    EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=p.client_id AND ca.user_id=?) legacy_grant
    FROM projects p WHERE p.id IN(SELECT value FROM json_each(?))`)
    .bind(userId,userId,userId,userId,JSON.stringify(ids)).all<{id:string;owner_user_id:string|null;organization_id:string|null;owner_granted:number;membership:string|null;assigned:number;client_grant:number;legacy_grant:number}>();
  const staff=roles.includes("staff")||roles.includes("admin"),admin=roles.includes("admin");
  return new Map(rows.results.map(p=>{
    const isOwner=p.owner_user_id===userId && Boolean(p.owner_granted);
    let read=false,write=false;
    if(principal){read=true;write=true;}
    else if(p.membership){read=true;write=["owner","admin","manager","specialist"].includes(p.membership);}
    else if(p.organization_id){read=Boolean((staff&&p.assigned)||isOwner||(!staff&&p.client_grant));write=staff&&Boolean(p.assigned);}
    else if(staff){read=Boolean(p.assigned||p.legacy_grant||isOwner);write=Boolean(p.assigned||(admin&&p.legacy_grant));}
    else{read=isOwner||Boolean(p.client_grant);}
    if(policy){const all=managedPermission(policy,"projects.all");read=(all||read)&&managedPermission(policy,"projects.read");write=(all||write)&&managedPermission(policy,"projects.write");}
    return [p.id,{read,write,isStaff:principal?true:staff,isOwner}];
  }));
}
export async function canAccessProject(db:D1Database,projectId:string,userId:string,roles:Role[]):Promise<ProjectAccess> {
  return (await projectAccessMap(db,[projectId],userId,roles)).get(projectId)??{read:false,write:false,isStaff:false,isOwner:false};
}

async function log(db: D1Database, projectId: string, actorId: string, action: string, targetType?: string, targetId?: string, meta?: unknown) {
  await db.prepare(
    "INSERT INTO project_logs (id, project_id, actor_id, action, target_type, target_id, meta_json, created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(uuid(), projectId, actorId, action, targetType ?? null, targetId ?? null, meta ? JSON.stringify(meta) : null, now()).run();
}

// Auth middleware trebuie deja aplicat pe app-ul principal — asigură-te că "userId"/"roles" există în Vars.
export const projectsRouter = new Hono<AppBindings>();

// ─── LISTĂ ────────────────────────────────────────────────────────────────
projectsRouter.get("/api/projects", async (c) => {
  const userId = c.get("userId");
  const roles = c.get("roles");
  const isStaff = roles.includes("staff") || roles.includes("admin");
  const isAdmin = roles.includes("admin");

  const principal=!!await platformRoleForUser(c.env.DB,userId);
  const policy=principal?null:await managedStaff(c.env.DB,userId);
  if(policy&&!managedPermission(policy,"projects.read"))return c.json({error:{code:"forbidden"}},403);
  const finance=await projectBudgetAccess(c.env.DB,userId,roles);
  const projection=(alias:"p"|"project")=>projectSummaryColumns(alias,finance);
  let rows;
  if(c.req.query('scope')==='mine'){
    const result=await c.env.DB.prepare(`SELECT ${projection("p")},
      (SELECT count(*) FROM project_staff ps JOIN users u ON u.id=ps.user_id WHERE ps.project_id=p.id AND u.disabled_at IS NULL) member_count
      FROM projects p WHERE ${projectOwnerAccessSql("p")} ${isStaff?'OR EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=p.id AND ps.user_id=?)':''} OR EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=p.organization_id AND m.user_id=? AND m.status='active') ${isStaff?'':`OR ${clientProjectGrantSql('p')}`} ORDER BY p.updated_at DESC,p.id LIMIT 200`).bind(userId,userId,userId).all();
    return c.json({data:result.results.map(row=>({...row,budget_visible:finance})),purchases:[],sales:[],scope:'mine'});
  }
  if (
    principal ||
    (await hasCapability(c.env.DB, userId, "projects.all"))) {
    rows = await c.env.DB.prepare(
      `SELECT ${projection("p")} FROM projects p ORDER BY p.updated_at DESC LIMIT 200`
    ).all();
  } else if (isAdmin || isStaff) {
    rows = await c.env.DB.prepare(
      `SELECT DISTINCT ${projection("project")}
         FROM projects AS project
         LEFT JOIN organization_memberships AS membership
           ON membership.organization_id = project.organization_id
          AND membership.user_id = ? AND membership.status = 'active'
         LEFT JOIN project_staff AS assignment
           ON assignment.project_id = project.id AND assignment.user_id = ?
         LEFT JOIN client_account_access AS client_access
           ON client_access.client_id = project.client_id AND client_access.user_id = ?
        WHERE ${projectOwnerAccessSql("project")} OR membership.user_id IS NOT NULL OR assignment.user_id IS NOT NULL OR (project.organization_id IS NULL AND client_access.user_id IS NOT NULL)
        ORDER BY project.updated_at DESC LIMIT 200`,
    ).bind(userId, userId, userId, userId).all();
  } else {
    rows = await c.env.DB.prepare(
      `SELECT DISTINCT ${projection("project")}
         FROM projects AS project
         LEFT JOIN organization_memberships AS membership
           ON membership.organization_id = project.organization_id
          AND membership.user_id = ? AND membership.status = 'active'
        WHERE ${projectOwnerAccessSql("project")} OR membership.user_id IS NOT NULL
          OR ${clientProjectGrantSql("project")}
        ORDER BY project.updated_at DESC`,
    ).bind(userId, userId,userId).all();
  }
  let purchases: Array<Record<string, unknown>> = [];
  const serviceView=c.req.query("view")==="services";
  let servicePurchases:ClientServicePurchase[]=[];
  let services:ClientProjectService[]=[];
  if(serviceView&&rows.results.length){
    const ids=rows.results.map(row=>String(row.id));
    services=(await c.env.DB.prepare("SELECT id,project_id,service_name FROM services WHERE project_id IN(SELECT value FROM json_each(?)) ORDER BY service_name,id").bind(JSON.stringify(ids)).all<ClientProjectService>()).results;
  }
  let sales: Array<Record<string, unknown>> = [];
  if (!isStaff) {
    try {
      const { results } = await c.env.DB.prepare(
        `SELECT id,items_json,total_cents,currency,status,updated_at
           FROM commerce_orders
          WHERE user_id=? AND status='paid'
          ORDER BY updated_at DESC LIMIT 100`,
      ).bind(userId).all<{ id: string; items_json: string; total_cents: number; currency: string; status: string; updated_at: number;
        }>();
      if(serviceView)servicePurchases=results.flatMap(confirmedServiceItems);
      purchases = results.map((order) => {
        let items: Array<Record<string, unknown>> = [];
        try {
          const parsed = JSON.parse(order.items_json);
          if (Array.isArray(parsed)) items = parsed.slice(0, 20);
        } catch { /* Order remains visible with its reference. */ }
        const names = items.map((item) => String(item.name ?? item.id ?? item.sku ?? "").trim()).filter(Boolean);
        const types = new Set(items.map((item) => String(item.type ?? item.kind ?? "")));
        const kind = types.has("subscription") || types.has("plan") ? "subscription" : types.has("item") || types.has("product") ? "product" : "service";
        return {
          id: order.id,
          name: names.join(" · ") || `Achiziție ${order.id.slice(0, 8).toUpperCase()}`,
          kind,
          total_cents: order.total_cents,
          currency: order.currency,
          status: order.status,
          updated_at: order.updated_at,
        };
      });
    } catch (error) {
      if (!/no such table: commerce_orders/i.test(String(error))) throw error;
    }
  }
  if (isStaff && finance) {
    try {
      const platformPrincipal = Boolean(await platformRoleForUser(c.env.DB, userId));
      const { results } = await c.env.DB.prepare(
        `SELECT revenue.id,revenue.project_id,project.name AS project_name,
                revenue.service_name AS name,revenue.revenue_type,
                COALESCE(revenue.amount_ron_minor,revenue.gross_amount_minor) AS total_cents,
                CASE WHEN revenue.amount_ron_minor IS NOT NULL THEN 'RON' ELSE revenue.currency END AS currency,
                revenue.status,revenue.updated_at
           FROM financial_revenues AS revenue
           LEFT JOIN projects AS project ON project.id=revenue.project_id
          WHERE revenue.archived_at IS NULL AND revenue.status IN ('paid','partially_paid')
            AND (? = 1 OR EXISTS (
              SELECT 1 FROM client_account_access AS access
               WHERE access.client_id = revenue.client_id AND access.user_id = ?
            ) OR EXISTS (
              SELECT 1 FROM project_staff AS assignment
               WHERE assignment.project_id = revenue.project_id AND assignment.user_id = ?
            ) OR EXISTS (
              SELECT 1 FROM organization_memberships AS membership
               WHERE membership.organization_id = project.organization_id AND membership.user_id = ?
                 AND membership.status = 'active' AND membership.role IN ('owner','admin','manager','specialist')
            ))
          ORDER BY revenue.updated_at DESC LIMIT 100`,
      ).bind(platformPrincipal ? 1 : 0, userId, userId, userId).all();
      sales = results;
    } catch (error) {
      if (!/no such table: financial_revenues/i.test(String(error))) throw error;
    }
  }
  return c.json({ data: rows.results.map(row=>({...row,budget_visible:finance})), purchases, sales,...(serviceView?{services,servicePurchases}:{}) });
});

// ─── CREARE (staff only — via floating button "Creează proiect") ─────────
/** Internal extensions participate in the same validated, authorized project transaction. */
export async function createNativeProject(c: Context<AppBindings>, options?: {
  input: unknown;
  idempotencyContext?: unknown;
  statements?: (id: string, timestamp: number) => D1PreparedStatement[];
}) {
  const roles = c.get("roles");
  if (!roles.includes("staff") && !roles.includes("admin")) return c.json({ error: { code: "forbidden" } }, 403);
  const ranked = await managedStaff(c.env.DB, c.get("userId"));
  if (ranked && !managedPermission(ranked, "projects.create")) return c.json({ error: { code: "forbidden" } }, 403);
  const userId = c.get("userId");
  const input = options ? { ok: true as const, value: options.input } : await readJsonBodyUpTo(c.req.raw, 16 * 1024);
  if (!input.ok) return c.json({error:{code:input.error}}, input.error === "payload_too_large" ? 413 : 400);
  const b = input.value as {
    name?: string; slug?: string; kind?: string; url?: string; description?: string;
    client_id?: string | null; owner_user_id?: string; organization_id?: string; stage?: ProjectStage;
    recurring_service?: {
      enabled?: boolean; service_name?: string; price?: number; billing_cycle?: string;
      next_billing_date?: number; subscription_status?: string;
    };
  };
  if (!b || typeof b !== "object" || Array.isArray(b) ||
      (b.url != null && typeof b.url !== "string") ||
      (b.organization_id != null && (typeof b.organization_id !== "string" || b.organization_id.length > 160)) ||
      (b.owner_user_id != null && (typeof b.owner_user_id !== "string" || b.owner_user_id.length > 160)) ||
      (b.kind !== undefined && !Object.hasOwn(PROJECT_KIND_LABELS,b.kind)) ||
      (b.recurring_service != null && (typeof b.recurring_service !== "object" || Array.isArray(b.recurring_service))) ||
      typeof b.name !== "string" || !b.name.trim() || b.name.length > 180 ||
      (b.slug !== undefined && (typeof b.slug !== "string" || !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(b.slug))) ||
      (b.client_id != null && (typeof b.client_id !== "string" || !b.client_id.trim() || b.client_id.length > 160)) ||
      (b.description != null && (typeof b.description !== "string" || b.description.length > 3000)))
    return c.json({ error: { code: "invalid_input", message: "Completează numele și un context valid pentru proiect." } }, 400);
  const stage = PROJECT_STAGES.find(stage => stage.id === (b.stage ?? "in_progress"));
  if (!stage) return c.json({ error: { code: "invalid_stage" } }, 400);
  b.name = b.name.trim();
  if (!b.client_id && (b.organization_id || b.owner_user_id || b.recurring_service?.enabled))
    return c.json({ error: { code: "client_required", message: "Asociază un client înainte de cont, organizație sau abonament." } }, 400);
  const projectUrl = b.url ? normalizeExternalLink(b.url) : null;
  if (b.url && !projectUrl) return c.json({ error: { code: "invalid_url" } }, 400);
  const clientOrganization = b.client_id ? await c.env.DB.prepare("SELECT organization_id FROM client_organizations WHERE client_id = ?")
    .bind(b.client_id).first<{ organization_id: string }>() : null;
  if (!b.organization_id) b.organization_id = clientOrganization?.organization_id;
  if (clientOrganization?.organization_id !== (b.organization_id || undefined)) {
    return c.json({ error: { code: "organization_scope_denied" } }, 403);
  }
  const broadCreation =
    (await hasCapability(c.env.DB, userId, "projects.create")) &&
    (await hasCapability(c.env.DB, userId, "projects.all"));
  if (b.client_id && !b.organization_id && !(await platformRoleForUser(c.env.DB, userId)) &&
    !broadCreation
  ) {
    const access = await c.env.DB.prepare("SELECT 1 FROM client_account_access WHERE client_id = ? AND user_id = ?")
      .bind(b.client_id, userId).first();
    if (!access) return c.json({ error: { code: "client_scope_denied" } }, 403);
  }
  if (b.owner_user_id) {
    const ownerAccess = await c.env.DB.prepare("SELECT 1 FROM client_account_access WHERE client_id = ? AND user_id = ?")
      .bind(b.client_id, b.owner_user_id).first();
    const ownerMembership = b.organization_id
      ? await organizationRoleForUser(c.env.DB, b.organization_id, b.owner_user_id)
      : null;
    if (!ownerAccess && !ownerMembership) return c.json({ error: { code: "owner_scope_denied" } }, 403);
  }
  const id = uuid();
  const slug = b.slug ?? `${b.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "proiect"}-${id.slice(0, 8)}`;
  const t = now();
  if (b.organization_id) {
    const [platformRole, membership] = await Promise.all([
      platformRoleForUser(c.env.DB, userId),
      organizationRoleForUser(c.env.DB, b.organization_id, userId),
    ]);
    const canCreate = platformRole !== null ||
      broadCreation || ["owner", "admin", "manager"].includes(membership || "");
    if (!canCreate || clientOrganization?.organization_id !== b.organization_id) {
      return c.json({ error: { code: "organization_scope_denied" } }, 403);
    }
  }
  const key = c.req.header("Idempotency-Key");
  if (key && !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) return c.json({error:{code:"invalid_idempotency_key"}},400);
  const scope = `project-create:${userId}`;
  const hash = key ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(options?.idempotencyContext === undefined ? b : { input: b, context: options.idempotencyContext }))))).map(v=>v.toString(16).padStart(2,"0")).join("") : "";
  const previous = async () => key ? c.env.DB.prepare("SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=? AND expires_at>?").bind(scope,key,Date.now()).first<{request_hash:string;response_json:string}>() : null;
  const cached = await previous();
  if(cached) return cached.request_hash === hash ? c.json(JSON.parse(cached.response_json),201) : c.json({error:{code:"idempotency_key_reused"}},409);
  try {
    const statements = [c.env.DB.prepare(
      `INSERT INTO projects
         (id, client_id, organization_id, name, slug, kind, url, description,
          owner_user_id, banner_status, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, b.client_id ?? null, b.organization_id ?? null, b.name, slug,
      b.kind ?? "website_prezentare", projectUrl, b.description ?? null,
      b.owner_user_id ?? null, stage.banner, stage.status, t, t,
    ), c.env.DB.prepare("INSERT INTO project_staff (project_id, user_id, role, assigned_at) VALUES (?,?,?,?)")
      .bind(id, userId, "owner", t)];
    const recurring = b.recurring_service;
    if (recurring?.enabled) {
      const serviceName = String(recurring.service_name || "Mentenanță AVYRON").trim().slice(0, 160);
      const price = Number(recurring.price);
      const billingCycle = String(recurring.billing_cycle || "monthly");
      const subscriptionStatus = String(recurring.subscription_status || "active");
      const nextBillingDate = Number(recurring.next_billing_date || t + 30 * 86_400_000);
      if (!serviceName || !Number.isFinite(price) || price < 0 || !["monthly", "yearly"].includes(billingCycle) || !["active", "paused"].includes(subscriptionStatus) || !Number.isFinite(nextBillingDate)) {
        return c.json({ error: { code: "invalid_recurring_service", message: "Datele de mentenanță și abonament nu sunt valide." } }, 400);
      }
      const serviceId = uuid();
      const subscriptionId = uuid();
      statements.push(
        c.env.DB.prepare("INSERT INTO services (id,project_id,service_name,price,billing_cycle) VALUES (?,?,?,?,?)").bind(serviceId, id, serviceName, price, billingCycle),
        c.env.DB.prepare("INSERT INTO subscriptions (id,client_id,service_id,next_billing_date,status) VALUES (?,?,?,?,?)").bind(subscriptionId, b.client_id, serviceId, nextBillingDate, subscriptionStatus),
      );
    }
    statements.push(c.env.DB.prepare(
      "INSERT INTO project_logs (id,project_id,actor_id,action,target_type,target_id,meta_json,created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(uuid(), id, userId, "project.create", "project", id, JSON.stringify({ recurringService: Boolean(recurring?.enabled), stage: stage.id, clientId: b.client_id ?? null }), t));
    if(key) statements.unshift(c.env.DB.prepare("INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,201,?,?,?)").bind(scope,key,hash,JSON.stringify({id,slug}),t,t+86400000));
    statements.push(...(options?.statements?.(id, t) || []));
    await c.env.DB.batch(statements);
    return c.json({ id, slug }, 201);
  } catch {
    const replay = await previous();
    if(replay) return replay.request_hash === hash ? c.json(JSON.parse(replay.response_json),201) : c.json({error:{code:"idempotency_key_reused"}},409);
    return c.json({ error: { code: "create_failed", message: "Proiectul nu a putut fi creat. Verifică identificatorul și contextul clientului." } }, 409);
  }
}
projectsRouter.post("/api/projects", (c) => createNativeProject(c));

// ─── DETALIU (după slug) ──────────────────────────────────────────────────
projectsRouter.get("/api/projects/:slug", async (c) => {
  const slug = c.req.param("slug");
  const proj = await c.env.DB.prepare(
    `SELECT ${projectSummaryColumns("p",true)},p.domain,p.description,p.owner_user_id,p.og_title,p.og_description,p.og_image_url,p.cover_image_url,p.subscription_plan,p.subscription_status,p.billing_next FROM projects p WHERE p.slug = ?`,
  ).bind(slug).first<Record<string, unknown> & { id: string }>();
  if (!proj) return c.json({ error: { code: "not_found" } }, 404);
  const perm = await canAccessProject(c.env.DB, proj.id, c.get("userId"), c.get("roles"));
  if (!perm.read) return c.json({ error: { code: "forbidden" } }, 403);
  const finance=await projectBudgetAccess(c.env.DB,c.get("userId"),c.get("roles"));
  if(!finance){proj.price_ron=null;proj.price_eur=null;proj.subscription_plan=null;}
  proj.budget_visible=finance;
  const financeWrite=!!await platformRoleForUser(c.env.DB,c.get("userId"))||await hasCapability(c.env.DB,c.get("userId"),"finance.write");

  const [links, proposals, updates, staff, subscriptions] = await Promise.all([
    c.env.DB.prepare("SELECT id,project_id,kind,label,url,updated_by,updated_at FROM project_links WHERE project_id = ? ORDER BY updated_at DESC").bind(proj.id).all(),
    c.env.DB.prepare("SELECT id,project_id,author_id,title,description,status,created_at,updated_at FROM project_proposals WHERE project_id = ? ORDER BY created_at DESC LIMIT 100").bind(proj.id).all(),
    c.env.DB.prepare("SELECT id,project_id,author_id,proposal_id,title,body,created_at FROM project_updates WHERE project_id = ? ORDER BY created_at DESC LIMIT 20").bind(proj.id).all(),
    c.env.DB.prepare(
      `SELECT ps.user_id, ps.role, u.email, p.display_name, p.avatar_url
       FROM project_staff ps JOIN users u ON u.id = ps.user_id
       LEFT JOIN profiles p ON p.id = ps.user_id WHERE ps.project_id = ?`
    ).bind(proj.id).all(),
    c.env.DB.prepare(`SELECT s.id,s.status,s.next_billing_date,s.plan_sku,v.service_name,v.billing_cycle,${finance?"v.price":"NULL price"} FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN projects p ON p.id=v.project_id WHERE p.id=? AND s.client_id=p.client_id ORDER BY s.status='active' DESC,s.next_billing_date,s.id LIMIT 100`).bind(proj.id).all(),
  ]);
  return c.json({ subscriptions:subscriptions.results, project: proj, links: links.results, proposals: proposals.results, updates: updates.results, staff: staff.results, permission: {...perm,finance:financeWrite} });
});

// ─── UPDATE proiect (staff/admin doar) ────────────────────────────────────
projectsRouter.patch("/api/projects/:id", async (c) => {
  const id = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, id, c.get("userId"), c.get("roles"));
  if (!perm.write) return c.json({ error: { code: "forbidden" } }, 403);
  const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  if ("url" in b && b.url !== null && b.url !== "") {
    if (typeof b.url !== "string") return c.json({ error: { code: "invalid_url" } }, 400);
    const url = normalizeExternalLink(b.url);
    if (!url) return c.json({ error: { code: "invalid_url" } }, 400);
    b.url = url;
  }
  const financeFields=["price_ron","price_eur"];
  if(financeFields.some(key=>key in b)&&!await platformRoleForUser(c.env.DB,c.get("userId"))&&!await hasCapability(c.env.DB,c.get("userId"),"finance.write"))return c.json({error:{code:"finance_permission_required"}},403);
  for(const key of financeFields)if(key in b&&b[key]!==null&&(typeof b[key]!=="number"||!Number.isFinite(b[key])||Number(b[key])<0||Number(b[key])>1e12))return c.json({error:{code:"invalid_budget"}},400);
  if("kind" in b&&(typeof b.kind!=="string"||!Object.hasOwn(PROJECT_KIND_LABELS,b.kind)))return c.json({error:{code:"invalid_kind"}},400);
  for(const key of ["planned_start_at","planned_end_at"])if(key in b&&b[key]!==null&&(!Number.isSafeInteger(b[key])||Number(b[key])<0||Number(b[key])>8640000000000000))return c.json({error:{code:"invalid_schedule"}},400);
  const schedule=await c.env.DB.prepare("SELECT planned_start_at,planned_end_at FROM projects WHERE id=?").bind(id).first<{planned_start_at:number|null;planned_end_at:number|null}>();
  const start="planned_start_at" in b?b.planned_start_at:schedule?.planned_start_at,end="planned_end_at" in b?b.planned_end_at:schedule?.planned_end_at;
  if(typeof start==="number"&&typeof end==="number"&&start>end)return c.json({error:{code:"invalid_schedule"}},400);
  delete b.status;
  if ("banner_status" in b) {
    const stage = PROJECT_STAGES.find(stage => stage.banner === b.banner_status);
    if (!stage && !["offline", "revizuire"].includes(String(b.banner_status))) return c.json({ error: { code: "invalid_stage" } }, 400);
    if (stage) b.status = stage.status;
  }
  // Ownership is an access grant. It must never be mass-assigned by a project editor.
  if ("owner_user_id" in b) return c.json({ error: { code: "owner_transfer_forbidden" } }, 403);
  const allowed = ["planned_start_at", "planned_end_at", "name", "kind", "description", "status", "banner_status", "url", "favicon_url", "og_title", "og_description", "og_image_url", "cover_image_url", "price_ron", "price_eur", "subscription_plan", "subscription_status", "billing_next"];
  const sets: string[] = [], vals: Array<string | number | null> = [];
  for (const k of allowed) {
    if (!(k in b)) continue;
    const value = b[k];
    if (value !== null && typeof value !== "string" && typeof value !== "number") {
      return c.json({ error: { code: "invalid_input", field: k } }, 400);
    }
    sets.push(`${k} = ?`);
    vals.push(value as string | number);
  }
  if (!sets.length) return c.json({ ok: true });
  sets.push("updated_at = ?"); vals.push(now()); vals.push(id);
  await c.env.DB.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
  await log(c.env.DB, id, c.get("userId"), "project.update", "project", id, Object.fromEntries(allowed.filter(key=>key in b).map(key=>[key,b[key]])));
  return c.json({ ok: true });
});

// ─── PROPUNERI ────────────────────────────────────────────────────────────
projectsRouter.post("/api/projects/:id/proposals", async (c) => {
  const id = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, id, c.get("userId"), c.get("roles"));
  if (!perm.read) return c.json({ error: { code: "forbidden" } }, 403);
  const b = (await c.req.json().catch(() => ({}))) as { title?: string; description?: string;
  };
  if (!b.title) return c.json({ error: { code: "invalid_input" } }, 400);
  const pid = uuid();
  const t = now();
  await c.env.DB.prepare(
    "INSERT INTO project_proposals (id, project_id, author_id, title, description, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(pid, id, c.get("userId"), b.title, b.description ?? null, "proposed", t, t).run();
  await log(c.env.DB, id, c.get("userId"), "proposal.create", "proposal", pid);
  return c.json({ id: pid }, 201);
});

projectsRouter.patch("/api/proposals/:id", async (c) => {
  const pid = c.req.param("id");
  const prop = await c.env.DB.prepare("SELECT project_id FROM project_proposals WHERE id = ?").bind(pid).first<{ project_id: string }>();
  if (!prop) return c.json({ error: { code: "not_found" } }, 404);
  const perm = await canAccessProject(c.env.DB, prop.project_id, c.get("userId"), c.get("roles"));
  if (!perm.write) return c.json({ error: { code: "forbidden", message: "Doar staff-ul poate schimba starea propunerilor" } }, 403);
  const b = (await c.req.json().catch(() => ({}))) as { status?: string; title?: string; description?: string;
  };
  const allowed = ["status", "title", "description"];
  const sets: string[] = [], vals: Array<string | number | null> = [];
  for (const k of allowed) {
    if (!(k in b)) continue;
    const value = b[k as keyof typeof b];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return c.json({ error: { code: "invalid_input", field: k } }, 400);
    }
    sets.push(`${k} = ?`);
    vals.push(value ?? null);
  }
  if (!sets.length) return c.json({ ok: true });
  sets.push("updated_at = ?"); vals.push(now()); vals.push(pid);
  await c.env.DB.prepare(`UPDATE project_proposals SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
  await log(c.env.DB, prop.project_id, c.get("userId"), "proposal.update", "proposal", pid, b);
  return c.json({ ok: true });
});

// ─── LINKS (Cloudflare / GSC / GBP / social) ─────────────────────────────
projectsRouter.post("/api/projects/:id/links", async (c) => {
  const id = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, id, c.get("userId"), c.get("roles"));
  if (!perm.write) return c.json({ error: { code: "forbidden" } }, 403);
  const b = (await c.req.json().catch(() => ({}))) as { kind?: string; label?: string; url?: string; id?: string;
  };
  if (!b.kind || !b.label || !b.url) return c.json({ error: { code: "invalid_input" } }, 400);
  const url = normalizeExternalLink(b.url);
  if (!url) return c.json({ error: { code: "invalid_url" } }, 400);
  const linkId = b.id ?? uuid();
  const t = now();
  const result = await c.env.DB.prepare(
    `INSERT INTO project_links (id, project_id, kind, label, url, updated_by, updated_at) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, label=excluded.label, url=excluded.url, updated_by=excluded.updated_by, updated_at=excluded.updated_at
       WHERE project_links.project_id = excluded.project_id`
  ).bind(linkId, id, b.kind, b.label, url, c.get("userId"), t).run();
  if (!result.meta.changes) return c.json({ error: { code: "link_scope_denied" } }, 403);
  await log(c.env.DB, id, c.get("userId"), "link.upsert", "link", linkId, b);
  return c.json({ id: linkId });
});

projectsRouter.delete("/api/links/:id", async (c) => {
  const linkId = c.req.param("id");
  const link = await c.env.DB.prepare("SELECT project_id FROM project_links WHERE id = ?").bind(linkId).first<{ project_id: string }>();
  if (!link) return c.json({ ok: true });
  const perm = await canAccessProject(c.env.DB, link.project_id, c.get("userId"), c.get("roles"));
  if (!perm.write) return c.json({ error: { code: "forbidden" } }, 403);
  await c.env.DB.prepare("DELETE FROM project_links WHERE id = ?").bind(linkId).run();
  await log(c.env.DB, link.project_id, c.get("userId"), "link.delete", "link", linkId);
  return c.json({ ok: true });
});

// ─── LOGS (audit trail — read only) ──────────────────────────────────────
projectsRouter.get("/api/projects/:id/logs", async (c) => {
  const id = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, id, c.get("userId"), c.get("roles"));
  if (!perm.read) return c.json({ error: { code: "forbidden" } }, 403);
  const { results } = await c.env.DB.prepare(
    `SELECT l.*, p.display_name as actor_name FROM project_logs l
     LEFT JOIN profiles p ON p.id = l.actor_id
     WHERE l.project_id = ? ORDER BY l.created_at DESC LIMIT 100`
  ).bind(id).all();
  const finance=await projectBudgetAccess(c.env.DB,c.get("userId"),c.get("roles"));
  return c.json({ data: finance?results:results.map(row=>({...row,meta_json:null})) });
});

// ─── METADATA extract (favicon + OG) ─────────────────────────────────────
projectsRouter.get("/api/metadata/extract", async (c) => {
  const requestedUrl = c.req.query("url");
  let target: URL;
  try {
    target = validateMetadataUrl(requestedUrl || "");
  } catch {
    return c.json({ error: { code: "invalid_url" } }, 400);
  }
  try {
    const { html, url } = await fetchMetadataHtml(target);
    const pick = (re: RegExp) => html.match(re)?.[1]?.trim();
    const abs = (value?: string) =>
      value ? new URL(value, url).toString() : undefined;
    const title = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ?? pick(/<title[^>]*>([^<]+)<\/title>/i);
    const description = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ?? pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const image = abs(pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i));
    const iconRel = pick(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i);
    const favicon = abs(iconRel) ?? `${url.origin}/favicon.ico`;
    return c.json({ url: url.toString(), title, description, image, favicon });
  } catch (e) {
    console.warn(JSON.stringify({ event: "metadata_fetch_failed", url: target.origin, error: String((e as Error).message) }));
    return c.json({ error: { code: "fetch_failed", message: "Nu am putut prelua metadata în siguranță" } }, 502);
  }
});
