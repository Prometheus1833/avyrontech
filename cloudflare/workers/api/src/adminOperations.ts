import { Hono, type Context } from "hono";
import type { Env, Role } from "./types";
import { platformRoleForUser } from "./authorization";

type Vars = { userId: string; roles: Role[]; requestId: string };
type App = { Bindings: Env; Variables: Vars };

const uuid = () => crypto.randomUUID();
const now = () => Date.now();
const text = (value: unknown, max = 240) => typeof value === "string" ? value.trim().slice(0, max) : "";

export const adminOperationsRouter = new Hono<App>();

adminOperationsRouter.use("/api/admin/operations/*", async (c, next) => {
  const resourcesRead = c.req.method === "GET" && c.req.path === "/api/admin/operations/resources";
  if (!resourcesRead && !(await platformRoleForUser(c.env.DB, c.get("userId")))) {
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

adminOperationsRouter.get("/api/admin/operations/clients", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT client.id,client.company_name,client.contact_name,client.email,client.phone,client.status,client.created_at,
            (SELECT COUNT(*) FROM projects project WHERE project.client_id=client.id) AS project_count,
            (SELECT COUNT(*) FROM subscriptions subscription WHERE subscription.client_id=client.id AND subscription.status='active') AS active_subscription_count,
            (SELECT COUNT(DISTINCT access.user_id) FROM client_account_access access WHERE access.client_id=client.id) AS account_count
       FROM clients AS client
      ORDER BY client.created_at DESC, client.company_name COLLATE NOCASE ASC`,
  ).all();
  return c.json({ data: results });
});

adminOperationsRouter.get("/api/admin/operations/clients/:id", async (c) => {
  const id = c.req.param("id");
  const client = await c.env.DB.prepare(
    "SELECT id,company_name,contact_name,email,phone,status,created_at FROM clients WHERE id=?",
  ).bind(id).first();
  if (!client) return c.json({ error: { code: "not_found" } }, 404);

  const [projects, subscriptions, accounts, orders, carts, availableProjects, accountOptions] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id,name,slug,kind,status,url,updated_at FROM projects WHERE client_id=? ORDER BY updated_at DESC,created_at DESC`,
    ).bind(id).all(),
    c.env.DB.prepare(
      `SELECT subscription.id,subscription.status,subscription.next_billing_date,
              service.id AS service_id,service.service_name,service.price,service.billing_cycle,
              project.id AS project_id,project.name AS project_name
         FROM subscriptions AS subscription
         JOIN services AS service ON service.id=subscription.service_id
         JOIN projects AS project ON project.id=service.project_id
        WHERE subscription.client_id=? ORDER BY subscription.next_billing_date ASC`,
    ).bind(id).all(),
    c.env.DB.prepare(
      `SELECT account.id,account.email,profile.display_name,profile.company_name
         FROM client_account_access AS access
         JOIN users AS account ON account.id=access.user_id
         LEFT JOIN profiles AS profile ON profile.id=account.id
        WHERE access.client_id=? ORDER BY account.email`,
    ).bind(id).all(),
    c.env.DB.prepare(
      `SELECT orders.id,orders.status,orders.total_cents,orders.currency,orders.items_json,orders.created_at,orders.updated_at
         FROM commerce_orders AS orders
         JOIN client_account_access AS access ON access.user_id=orders.user_id
        WHERE access.client_id=? ORDER BY orders.created_at DESC LIMIT 100`,
    ).bind(id).all(),
    c.env.DB.prepare(
      `SELECT cart.user_id,cart.items_json,cart.updated_at,account.email,profile.display_name
         FROM account_carts AS cart
         JOIN client_account_access AS access ON access.user_id=cart.user_id
         JOIN users AS account ON account.id=cart.user_id
         LEFT JOIN profiles AS profile ON profile.id=cart.user_id
        WHERE access.client_id=? ORDER BY cart.updated_at DESC`,
    ).bind(id).all(),
    c.env.DB.prepare(
      `SELECT id,name,status,client_id FROM projects ORDER BY updated_at DESC,created_at DESC LIMIT 250`,
    ).all(),
    c.env.DB.prepare(
      `SELECT account.id,account.email,profile.display_name,profile.company_name
         FROM users AS account
         LEFT JOIN profiles AS profile ON profile.id=account.id
        WHERE account.disabled_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM user_roles AS role
             WHERE role.user_id=account.id AND role.role IN ('staff','admin')
          )
        ORDER BY COALESCE(profile.display_name,profile.company_name,account.email) COLLATE NOCASE`,
    ).all(),
  ]);
  return c.json({ client, projects: projects.results, subscriptions: subscriptions.results, accounts: accounts.results, orders: orders.results, carts: carts.results, availableProjects: availableProjects.results, accountOptions: accountOptions.results });
});

adminOperationsRouter.patch("/api/admin/operations/clients/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const companyName = text(body.companyName, 160);
  const email = text(body.email, 254).toLowerCase();
  const status = text(body.status, 20);
  if (!companyName || !email || !["active", "paused", "archived"].includes(status)) return c.json({ error: { code: "invalid_input" } }, 400);
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE clients SET company_name=?,contact_name=?,email=?,phone=?,status=? WHERE id=?")
      .bind(companyName, text(body.contactName, 160) || null, email, text(body.phone, 40) || null, status, id),
    audit(c, "client.update", "client", id, { status, updatedAt: t }),
  ]);
  return c.json({ ok: true });
});

adminOperationsRouter.put("/api/admin/operations/clients/:id/accounts", async (c) => {
  const clientId = c.req.param("id");
  const body = await c.req.json<{ userIds?: unknown }>().catch(() => ({} as { userIds?: unknown }));
  const userIds = Array.isArray(body.userIds) ? [...new Set(body.userIds.filter((value): value is string => typeof value === "string"))].slice(0, 20) : [];
  if (userIds.length) {
    const placeholders = userIds.map(() => "?").join(",");
    const privileged = await c.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM user_roles WHERE user_id IN (${placeholders}) AND role IN ('staff','admin')`,
    ).bind(...userIds).first<{ count: number }>();
    if ((privileged?.count || 0) > 0) return c.json({ error: { code: "staff_cannot_be_client", message: "Conturile STAFF nu pot fi asociate drept clienți." } }, 409);
  }
  const t = now();
  const statements = [c.env.DB.prepare("DELETE FROM client_account_access WHERE client_id=?").bind(clientId)];
  for (const userId of userIds) statements.push(c.env.DB.prepare("INSERT INTO client_account_access (client_id,user_id,granted_by,created_at) VALUES (?,?,?,?)").bind(clientId, userId, c.get("userId"), t));
  statements.push(audit(c, "client.accounts.replace", "client", clientId, { accountCount: userIds.length }));
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

adminOperationsRouter.put("/api/admin/operations/clients/:id/projects", async (c) => {
  const clientId = c.req.param("id");
  const body = await c.req.json<{ projectIds?: unknown }>().catch(() => ({} as { projectIds?: unknown }));
  const projectIds = Array.isArray(body.projectIds) ? [...new Set(body.projectIds.filter((value): value is string => typeof value === "string"))].slice(0, 100) : [];
  if (!projectIds.length) return c.json({ error: { code: "invalid_input", message: "Selectează cel puțin un proiect." } }, 400);
  const t = now();
  const statements = projectIds.flatMap((projectId) => [
    c.env.DB.prepare("UPDATE projects SET client_id=?,updated_at=? WHERE id=?").bind(clientId, t, projectId),
    c.env.DB.prepare("UPDATE subscriptions SET client_id=? WHERE service_id IN (SELECT id FROM services WHERE project_id=?)").bind(clientId, projectId),
  ]);
  statements.push(audit(c, "client.projects.assign", "client", clientId, { projectIds }));
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

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
  const body = await c.req.json<{ projectIds?: unknown }>().catch(() => ({} as { projectIds?: unknown }));
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
      `SELECT subscription.id,subscription.status,subscription.next_billing_date,
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
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const current = await c.env.DB.prepare("SELECT service_id FROM subscriptions WHERE id=?").bind(id).first<{ service_id: string }>();
  if (!current) return c.json({ error: { code: "not_found" } }, 404);
  const status = text(body.status, 20);
  const billingCycle = text(body.billingCycle, 20);
  const price = Number(body.price);
  const nextBillingDate = Number(body.nextBillingDate);
  const serviceName = text(body.serviceName, 160);
  if (!serviceName || !Number.isFinite(price) || price < 0 || !Number.isFinite(nextBillingDate) || !["active", "paused", "cancelled"].includes(status) || !["one_time", "monthly", "yearly"].includes(billingCycle)) {
    return c.json({ error: { code: "invalid_input" } }, 400);
  }
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE services SET service_name=?,price=?,billing_cycle=? WHERE id=?").bind(serviceName, price, billingCycle, current.service_id),
    c.env.DB.prepare("UPDATE subscriptions SET status=?,next_billing_date=? WHERE id=?").bind(status, nextBillingDate, id),
    audit(c, "subscription.update", "subscription", id, { status, price, billingCycle }),
  ]);
  return c.json({ ok: true });
});

adminOperationsRouter.get("/api/admin/operations/resources", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id,kind,title,description,url,category,status,created_at,updated_at FROM internal_resources ORDER BY updated_at DESC,title COLLATE NOCASE",
  ).all();
  return c.json({ data: results });
});

adminOperationsRouter.post("/api/admin/operations/resources", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const kind = text(body.kind, 20);
  const title = text(body.title, 180);
  const status = text(body.status, 20) || "active";
  const url = text(body.url, 600);
  if (!title || (url && !/^https?:\/\//i.test(url)) || !["website", "field", "tool", "reference", "career", "library"].includes(kind) || !["active", "planned", "archived"].includes(status)) return c.json({ error: { code: "invalid_input" } }, 400);
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
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const title = text(body.title, 180);
  const status = text(body.status, 20);
  const url = text(body.url, 600);
  if (!title || (url && !/^https?:\/\//i.test(url)) || !["active", "planned", "archived"].includes(status)) return c.json({ error: { code: "invalid_input" } }, 400);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE internal_resources SET title=?,description=?,url=?,category=?,status=?,updated_by=?,updated_at=? WHERE id=?")
      .bind(title, text(body.description, 1200), url || null, text(body.category, 100) || "General", status, c.get("userId"), now(), id),
    audit(c, "resource.update", "internal_resource", id, { status }),
  ]);
  return c.json({ ok: true });
});
