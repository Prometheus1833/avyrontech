import { managedStaff, managedPermission } from "./staffAccessPolicy";
import { hasCapability } from "./authorization";
// Avyron API — Rute Platformă Internă pentru proiecte
// Import și mount în src/index.ts: `app.route("/", projectsRouter);`
//
// Toate rutele necesită auth. Accesul este evaluat per proiect prin rol de
// platformă, apartenență activă la organizație, alocare explicită ori grant
// pentru clientul proiectului; proprietarul client poate citi proiectul.

import { Hono } from "hono";
import type { Env } from "./types";
import { fetchMetadataHtml, validateMetadataUrl } from "./metadata";
import { organizationRoleForUser, platformRoleForUser,hasClientProjectGrant,clientProjectGrantSql } from "./authorization";
import { normalizeExternalLink } from "../../../../src/shared/externalUrl";
import { PROJECT_STAGES, type ProjectStage } from "../../../../src/shared/projectLifecycle";
import { readJsonBodyUpTo } from "./requestBody";

type Role = "user" | "staff" | "admin";
type Vars = { userId: string; roles: Role[] };

const uuid = () => crypto.randomUUID();
const now = () => Date.now();

async function originalProjectAccess(db: D1Database, projectId: string, userId: string, roles: Role[]): Promise<{ read: boolean; write: boolean; isStaff: boolean; isOwner: boolean;
}> {
  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff") || isAdmin;
  const proj = await db.prepare("SELECT owner_user_id, organization_id FROM projects WHERE id = ?").bind(projectId)
    .first<{ owner_user_id: string | null; organization_id: string | null }>();
  if (!proj) return { read: false, write: false, isStaff: false, isOwner: false };
  const isOwner = proj.owner_user_id === userId;
  if (await platformRoleForUser(db, userId)) return { read: true, write: true, isStaff: true, isOwner };

  const membership = proj.organization_id
    ? await organizationRoleForUser(db, proj.organization_id, userId)
    : null;
  if (membership) {
    const write = ["owner", "admin", "manager", "specialist"].includes(membership);
    return { read: true, write, isStaff, isOwner };
  }
  if (proj.organization_id) {
    const assigned = isStaff
      ? await db.prepare("SELECT 1 FROM project_staff WHERE project_id = ? AND user_id = ?").bind(projectId, userId).first()
      : null;
    return { read: !!assigned || isOwner || (!isStaff && (await hasClientProjectGrant(db,projectId,userId))), write: !!assigned, isStaff, isOwner };
  }

  // Legacy records need the same explicit project or client grant as tenant records.
  if (isStaff) {
    const assigned = await db.prepare("SELECT 1 FROM project_staff WHERE project_id = ? AND user_id = ?").bind(projectId, userId).first();
    if (assigned) return { read: true, write: true, isStaff: true, isOwner };
    const clientGrant = await db.prepare("SELECT 1 FROM client_account_access WHERE client_id = (SELECT client_id FROM projects WHERE id = ?) AND user_id = ?")
      .bind(projectId, userId).first();
    return { read: Boolean(clientGrant) || isOwner, write: isAdmin && Boolean(clientGrant), isStaff: true, isOwner };
  }
  if (isOwner) return { read: true, write: false, isStaff: false, isOwner: true };
  const clientGrant = await hasClientProjectGrant(db,projectId,userId);
  return { read: !!clientGrant, write: false, isStaff, isOwner: false };
}

export async function canAccessProject(
  db: D1Database,
  projectId: string,
  userId: string,
  roles: Role[],
) {
  const access = await originalProjectAccess(db, projectId, userId, roles);
  if (await platformRoleForUser(db, userId)) return access;
  const policy = await managedStaff(db, userId);
  if (!policy) return access;
  const all = managedPermission(policy, "projects.all");
  const exists = all
    ? !!(await db
        .prepare("SELECT id FROM projects WHERE id=?")
        .bind(projectId)
        .first())
    : access.read;
  return {
    ...access,
    read: !!exists && managedPermission(policy, "projects.read"),
    write:
      !!exists &&
      (all || access.write) &&
      managedPermission(policy, "projects.write"),
  };
}

async function log(db: D1Database, projectId: string, actorId: string, action: string, targetType?: string, targetId?: string, meta?: unknown) {
  await db.prepare(
    "INSERT INTO project_logs (id, project_id, actor_id, action, target_type, target_id, meta_json, created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(uuid(), projectId, actorId, action, targetType ?? null, targetId ?? null, meta ? JSON.stringify(meta) : null, now()).run();
}

// Auth middleware trebuie deja aplicat pe app-ul principal — asigură-te că "userId"/"roles" există în Vars.
export const projectsRouter = new Hono<{ Bindings: Env; Variables: Vars }>();

// ─── LISTĂ ────────────────────────────────────────────────────────────────
projectsRouter.get("/api/projects", async (c) => {
  const userId = c.get("userId");
  const roles = c.get("roles");
  const isStaff = roles.includes("staff") || roles.includes("admin");
  const isAdmin = roles.includes("admin");

  let rows;
  if(c.req.query('scope')==='mine'){
    const result=await c.env.DB.prepare(`SELECT p.id,p.slug,p.name,p.kind,p.status,p.banner_status,p.url,p.favicon_url,p.updated_at,
      (SELECT count(*) FROM project_staff ps JOIN users u ON u.id=ps.user_id WHERE ps.project_id=p.id AND u.disabled_at IS NULL) member_count
      FROM projects p WHERE p.owner_user_id=? ${isStaff?'OR EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=p.id AND ps.user_id=?)':''} OR EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=p.organization_id AND m.user_id=? AND m.status='active') ${isStaff?'':`OR ${clientProjectGrantSql('p')}`} ORDER BY p.updated_at DESC,p.id LIMIT 200`).bind(userId,userId,userId).all();
    return c.json({data:result.results,purchases:[],sales:[],scope:'mine'});
  }
  if (
    (await platformRoleForUser(c.env.DB, userId)) ||
    (await hasCapability(c.env.DB, userId, "projects.all"))) {
    rows = await c.env.DB.prepare(
      "SELECT id, organization_id, slug, name, kind, banner_status, status, url, favicon_url, updated_at FROM projects ORDER BY updated_at DESC LIMIT 200"
    ).all();
  } else if (isAdmin || isStaff) {
    rows = await c.env.DB.prepare(
      `SELECT DISTINCT project.id, project.organization_id, project.slug, project.name,
              project.kind, project.banner_status, project.status, project.url, project.favicon_url, project.updated_at
         FROM projects AS project
         LEFT JOIN organization_memberships AS membership
           ON membership.organization_id = project.organization_id
          AND membership.user_id = ? AND membership.status = 'active'
         LEFT JOIN project_staff AS assignment
           ON assignment.project_id = project.id AND assignment.user_id = ?
         LEFT JOIN client_account_access AS client_access
           ON client_access.client_id = project.client_id AND client_access.user_id = ?
        WHERE membership.user_id IS NOT NULL OR assignment.user_id IS NOT NULL OR client_access.user_id IS NOT NULL
        ORDER BY project.updated_at DESC LIMIT 200`,
    ).bind(userId, userId, userId).all();
  } else {
    rows = await c.env.DB.prepare(
      `SELECT DISTINCT project.id, project.organization_id, project.slug, project.name,
              project.kind, project.banner_status, project.status, project.url, project.favicon_url, project.updated_at
         FROM projects AS project
         LEFT JOIN organization_memberships AS membership
           ON membership.organization_id = project.organization_id
          AND membership.user_id = ? AND membership.status = 'active'
        WHERE project.owner_user_id = ? OR membership.user_id IS NOT NULL
          OR ${clientProjectGrantSql("project")}
        ORDER BY project.updated_at DESC`,
    ).bind(userId, userId,userId).all();
  }
  let purchases: Array<Record<string, unknown>> = [];
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
  if (isStaff) {
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
  return c.json({ data: rows.results, purchases, sales });
});

// ─── CREARE (staff only — via floating button "Creează proiect") ─────────
projectsRouter.post("/api/projects", async (c) => {
  const roles = c.get("roles");
  if (!roles.includes("staff") && !roles.includes("admin")) return c.json({ error: { code: "forbidden" } }, 403);
  const ranked = await managedStaff(c.env.DB, c.get("userId"));
  if (ranked && !managedPermission(ranked, "projects.create")) return c.json({ error: { code: "forbidden" } }, 403);
  const userId = c.get("userId");
  const input = await readJsonBodyUpTo(c.req.raw, 16 * 1024);
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
      (b.kind !== undefined && !["external_asset", "website_prezentare", "prezentare_premium", "magazin_online", "retele_sociale", "identitate_completa", "aplicatie"].includes(b.kind)) ||
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
  const hash = key ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(b))))).map(v=>v.toString(16).padStart(2,"0")).join("") : "";
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
    await c.env.DB.batch(statements);
    return c.json({ id, slug }, 201);
  } catch {
    const replay = await previous();
    if(replay) return replay.request_hash === hash ? c.json(JSON.parse(replay.response_json),201) : c.json({error:{code:"idempotency_key_reused"}},409);
    return c.json({ error: { code: "create_failed", message: "Proiectul nu a putut fi creat. Verifică identificatorul și contextul clientului." } }, 409);
  }
});

// ─── DETALIU (după slug) ──────────────────────────────────────────────────
projectsRouter.get("/api/projects/:slug", async (c) => {
  const slug = c.req.param("slug");
  const proj = await c.env.DB.prepare(
    "SELECT id,client_id,organization_id,name,domain,status,created_at,slug,kind,description,owner_user_id,banner_status,url,favicon_url,og_title,og_description,og_image_url,cover_image_url,price_ron,price_eur,subscription_plan,subscription_status,billing_next,updated_at FROM projects WHERE slug = ?",
  ).bind(slug).first<Record<string, unknown> & { id: string }>();
  if (!proj) return c.json({ error: { code: "not_found" } }, 404);
  const perm = await canAccessProject(c.env.DB, proj.id, c.get("userId"), c.get("roles"));
  if (!perm.read) return c.json({ error: { code: "forbidden" } }, 403);

  const [links, proposals, updates, staff] = await Promise.all([
    c.env.DB.prepare("SELECT id,project_id,kind,label,url,updated_by,updated_at FROM project_links WHERE project_id = ? ORDER BY updated_at DESC").bind(proj.id).all(),
    c.env.DB.prepare("SELECT id,project_id,author_id,title,description,status,created_at,updated_at FROM project_proposals WHERE project_id = ? ORDER BY created_at DESC LIMIT 100").bind(proj.id).all(),
    c.env.DB.prepare("SELECT id,project_id,author_id,proposal_id,title,body,created_at FROM project_updates WHERE project_id = ? ORDER BY created_at DESC LIMIT 20").bind(proj.id).all(),
    c.env.DB.prepare(
      `SELECT ps.user_id, ps.role, u.email, p.display_name, p.avatar_url
       FROM project_staff ps JOIN users u ON u.id = ps.user_id
       LEFT JOIN profiles p ON p.id = ps.user_id WHERE ps.project_id = ?`
    ).bind(proj.id).all(),
  ]);
  return c.json({ project: proj, links: links.results, proposals: proposals.results, updates: updates.results, staff: staff.results, permission: perm });
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
  delete b.status;
  if ("banner_status" in b) {
    const stage = PROJECT_STAGES.find(stage => stage.banner === b.banner_status);
    if (!stage && !["offline", "revizuire"].includes(String(b.banner_status))) return c.json({ error: { code: "invalid_stage" } }, 400);
    if (stage) b.status = stage.status;
  }
  // Ownership is an access grant. It must never be mass-assigned by a project editor.
  if ("owner_user_id" in b) return c.json({ error: { code: "owner_transfer_forbidden" } }, 403);
  const allowed = ["name", "kind", "description", "status", "banner_status", "url", "favicon_url", "og_title", "og_description", "og_image_url", "cover_image_url", "price_ron", "price_eur", "subscription_plan", "subscription_status", "billing_next"];
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
  await log(c.env.DB, id, c.get("userId"), "project.update", "project", id, b);
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
  return c.json({ data: results });
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
