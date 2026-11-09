import {clientWorkspaceRouter} from "./clientWorkspace";
import { managedStaff, canManageStaffTarget } from "./staffAccessPolicy";
import { Hono, type Context } from "hono";
import type { Env, Role } from "./types";
import { hasCapability, platformRoleForUser } from "./authorization";

type Vars = { userId: string; roles: Role[]; requestId: string };
type App = { Bindings: Env; Variables: Vars };

const uuid = () => crypto.randomUUID();
const now = () => Date.now();
const text = (value: unknown, max = 240) => typeof value === "string" ? value.trim().slice(0, max) : "";
export const externalUrl = (value: string) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return (
      ["http:", "https:"].includes(parsed.protocol) && !!parsed.hostname && !parsed.username && !parsed.password
    );
  } catch { return false; }
};

export const adminOperationsRouter = new Hono<App>();

adminOperationsRouter.use("/api/admin/operations/*", async (c, next) => {
  const resourcesRead = c.req.method === "GET" && c.req.path === "/api/admin/operations/resources";
  const clientCrud = /^\/api\/admin\/operations\/clients(?:\/[^/]+)?$/.test(
    c.req.path,
  );
  const delegated =
    clientCrud &&
    (await hasCapability(
      c.env.DB,
      c.get("userId"),
      c.req.method === "GET" ? "clients.read" : "clients.write",
    ));
  if (!resourcesRead &&
    !delegated && !(await platformRoleForUser(c.env.DB, c.get("userId")))) {
    return c.json({ error: { code: "forbidden", message: "Doar Super Adminul poate modifica registrul operațional." } }, 403);
  }
  await next();
});

const audit = (c: Context<App>, action: string, targetType: string, targetId: string, metadata: unknown = {}) =>
  c.env.DB.prepare(
    `INSERT INTO security_events
      (id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,request_id,metadata_json,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(uuid(), c.get("userId"), "user", action, targetType, targetId, "allowed", "info", c.get("requestId") || null, JSON.stringify(metadata), now());

adminOperationsRouter.route("/",clientWorkspaceRouter);

adminOperationsRouter.get("/api/admin/operations/staff", async (c) => {
  const [staff, projects] = await Promise.all([
    c.env.DB.prepare(
      `SELECT account.id,account.email,account.disabled_at,profile.display_name,profile.company_name,
              group_concat(DISTINCT role.role) AS roles,
              group_concat(DISTINCT assignment.project_id) AS project_ids
         FROM users AS account
         JOIN user_roles AS role ON role.user_id=account.id AND role.role IN ('staff','admin')
         LEFT JOIN profiles AS profile ON profile.id=account.id
         LEFT JOIN project_staff AS assignment ON assignment.user_id=account.id
        GROUP BY account.id ORDER BY COALESCE(profile.display_name,account.email) COLLATE NOCASE`,
    ).all(),
    c.env.DB.prepare("SELECT id,name,status FROM projects WHERE status!='archived' ORDER BY updated_at DESC,created_at DESC LIMIT 250").all(),
  ]);
  return c.json({ data: staff.results, projects: projects.results });
});

adminOperationsRouter.put("/api/admin/operations/staff/:id/projects", async (c) => {
  const staffId = c.req.param("id");
    if (!(await canManageStaffTarget(c.env.DB, c.get("userId"), staffId)))
      return c.json({ error: { code: "platform_owner_required" } }, 403);
    if (await managedStaff(c.env.DB, staffId))
      return c.json({ error: { code: "use_staff_access_manager" } }, 409);
    const body = await c.req.json<{ projectIds?: unknown }>().catch(() => ({}) as { projectIds?: unknown });
  const projectIds = Array.isArray(body.projectIds) ? [...new Set(body.projectIds.filter((value): value is string => typeof value === "string"))].slice(0, 250) : [];
  const isStaff = await c.env.DB.prepare("SELECT 1 FROM user_roles WHERE user_id=? AND role IN ('staff','admin') LIMIT 1").bind(staffId).first();
  if (!isStaff) return c.json({ error: { code: "not_staff" } }, 409);
  const t = now();
  const statements = [c.env.DB.prepare("DELETE FROM project_staff WHERE user_id=? AND role!='owner'").bind(staffId)];
  for (const projectId of projectIds) statements.push(c.env.DB.prepare(
    `INSERT INTO project_staff (project_id,user_id,role,assigned_at) VALUES (?,?,?,?)
     ON CONFLICT(project_id,user_id) DO UPDATE SET
       role=CASE WHEN project_staff.role='owner' THEN 'owner' ELSE 'contributor' END,
       assigned_at=excluded.assigned_at`,
  ).bind(projectId, staffId, "contributor", t));
  statements.push(audit(c, "staff.projects.replace", "user", staffId, { projectIds }));
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

adminOperationsRouter.get("/api/admin/operations/subscriptions", async (c) => {
  const [subscriptions, traffic] = await Promise.all([
    c.env.DB.prepare(
      `SELECT subscription.id,subscription.status,subscription.next_billing_date,subscription.maintenance_enabled,subscription.plan_sku,
              service.id AS service_id,service.service_name,service.price,service.billing_cycle,
              client.id AS client_id,client.company_name,project.id AS project_id,project.name AS project_name,project.status AS project_status
         FROM subscriptions AS subscription
         JOIN services AS service ON service.id=subscription.service_id
         JOIN projects AS project ON project.id=service.project_id
         JOIN clients AS client ON client.id=subscription.client_id
        ORDER BY subscription.next_billing_date ASC`,
    ).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS events,COUNT(DISTINCT session_id) AS sessions
         FROM page_events WHERE created_at>=? AND (lower(page) LIKE '%abon%' OR lower(page) LIKE '%subscription%')`,
    ).bind(now() - 30 * 86_400_000).first(),
  ]);
  return c.json({ data: subscriptions.results, traffic: traffic || { events: 0, sessions: 0 } });
});

adminOperationsRouter.patch("/api/admin/operations/subscriptions/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const current = await c.env.DB.prepare("SELECT service_id,maintenance_enabled,revision FROM subscriptions WHERE id=?").bind(id).first<{ service_id: string; maintenance_enabled:number; revision:number;
      }>();
  if (!current) return c.json({ error: { code: "not_found" } }, 404);
  if(await c.env.DB.prepare("SELECT 1 FROM billing_recurring_agreements WHERE subscription_id=? AND closed_at IS NULL").bind(id).first())return c.json({error:{code:"provider_managed_recurring_subscription",message:"Gestionează debitarea în Stripe înainte de a modifica acest abonament."}},409);
  if(current.maintenance_enabled)return c.json({error:{code:"use_avy_core",message:"Editează acest abonament în AVY Core pentru a păstra sincronizarea planului și alocărilor."}},409);
  const status = text(body.status, 20);
  const billingCycle = text(body.billingCycle, 20);
  const price = Number(body.price);
  const nextBillingDate = Number(body.nextBillingDate);
  const serviceName = text(body.serviceName, 160);
  if (!serviceName || !Number.isFinite(price) || price < 0 || !Number.isFinite(nextBillingDate) || !["active", "paused", "cancelled"].includes(status) || !["one_time", "monthly", "yearly"].includes(billingCycle)) {
    return c.json({ error: { code: "invalid_input" } }, 400);
  }
  try { await c.env.DB.batch([
    c.env.DB.prepare("UPDATE services SET service_name=?,price=?,billing_cycle=? WHERE id=?").bind(serviceName, price, billingCycle, current.service_id),
    c.env.DB.prepare("UPDATE subscriptions SET status=?,next_billing_date=?,revision=CASE WHEN maintenance_enabled=0 AND revision=? THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?").bind(status, nextBillingDate, current.revision, now(), id),
    audit(c, "subscription.update", "subscription", id, { status, price, billingCycle }),
  ]); } catch (error) {
    if (/NOT NULL constraint failed: subscriptions\.revision/.test(String(error))) return c.json({error:{code:"revision_conflict",message:"Abonamentul s-a modificat. Reîncarcă datele și folosește AVY Core dacă a fost configurat pentru mentenanță."}},409);
    throw error;
  }
  return c.json({ ok: true });
});

adminOperationsRouter.get("/api/admin/operations/resources", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id,kind,title,description,url,category,status,created_at,updated_at FROM internal_resources ORDER BY updated_at DESC,title COLLATE NOCASE",
  ).all();
  return c.json({ data: results });
});

adminOperationsRouter.post("/api/admin/operations/resources", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const kind = text(body.kind, 20);
  const title = text(body.title, 180);
  const status = text(body.status, 20) || "active";
  const url = text(body.url, 600);
  if (!title || !externalUrl(url) || !["website", "field", "tool", "reference", "career", "library"].includes(kind) || !["active", "planned", "archived"].includes(status)) return c.json({ error: { code: "invalid_input" } }, 400);
  const id = uuid();
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO internal_resources (id,kind,title,description,url,category,status,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, kind, title, text(body.description, 1200), url || null, text(body.category, 100) || "General", status, c.get("userId"), c.get("userId"), t, t),
    audit(c, "resource.create", "internal_resource", id, { kind, status }),
  ]);
  return c.json({ ok: true, id }, 201);
});

adminOperationsRouter.patch("/api/admin/operations/resources/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const title = text(body.title, 180);
  const status = text(body.status, 20);
  const url = text(body.url, 600);
  if (!title || !externalUrl(url) || !["active", "planned", "archived"].includes(status)) return c.json({ error: { code: "invalid_input" } }, 400);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE internal_resources SET title=?,description=?,url=?,category=?,status=?,updated_by=?,updated_at=? WHERE id=?")
      .bind(title, text(body.description, 1200), url || null, text(body.category, 100) || "General", status, c.get("userId"), now(), id),
    audit(c, "resource.update", "internal_resource", id, { status }),
  ]);
  return c.json({ ok: true });
});
