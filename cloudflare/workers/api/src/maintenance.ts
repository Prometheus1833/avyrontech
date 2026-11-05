import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import {
  SUBSCRIPTION_CATEGORIES,
  SPEC_LABELS,
} from "../../../../src/data/subscriptionPlans";
import { normalizeExternalLink } from "../../../../src/shared/externalUrl";
import { maintenanceActor, maintenanceProjectScope } from "./maintenancePolicy";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { sha256 } from "./security";

type Ctx = Context<AppBindings>;
type Mutation = (
  c: Ctx,
  value: unknown,
  result: Record<string, unknown>,
  statements: D1PreparedStatement[],
) => Promise<Response>;
const form = z
  .object({
    projectId: z.string().min(1).max(120).optional(),
    externalProject: z
      .object({
        clientId: z.string().min(1).max(120),
        name: z.string().trim().min(1).max(180),
      })
      .strict()
      .optional(),
    existingSubscriptionId: z.string().min(1).max(120).optional(),
    revision: z.number().int().positive().optional(),
    planSku: z.string().max(120).nullable(),
    name: z.string().trim().min(1).max(180),
    priceMinor: z.number().int().min(0).max(100000000),
    specifications: z
      .record(
        z.string().trim().min(1).max(100),
        z.string().trim().min(1).max(1500),
      )
      .refine((x) => Object.keys(x).length <= 30),
    productSlug: z.string().max(180).nullable(),
    externalUrl: z.string().max(2048).nullable(),
    targetLabel: z.string().trim().max(180),
    staffIds: z.array(z.string().min(1).max(120)).max(30),
    nextBillingDate: z.number().int().min(0).max(8640000000000000),
    status: z.enum(["active", "paused", "cancelled"]),
  })
  .strict()
  .refine((x) => Boolean(x.projectId) !== Boolean(x.externalProject));
export async function subscriptionPlans(db: D1Database) {
  const base = SUBSCRIPTION_CATEGORIES.flatMap((category) =>
    category.plans.map((plan) => ({
      sku: plan.sku,
      name: plan.name,
      category: category.copy.ro.title,
      priceMinor: plan.priceCents,
      specifications: Object.fromEntries(
        plan.specs.map((spec) => [SPEC_LABELS[spec.key].ro, spec.ro]),
      ),
    })),
  );
  const { results } = await db
    .prepare(
      "SELECT id,name,price_ron_cents,components_per_day,sections_per_day,templates_per_day FROM partnership_plans ORDER BY price_ron_cents,id",
    )
    .all<{
      id: string;
      name: string;
      price_ron_cents: number;
      components_per_day: number;
      sections_per_day: number;
      templates_per_day: number;
    }>();
  return [
    ...base,
    ...results.map((plan) => ({
      sku: plan.id,
      name: plan.name,
      category: "AVY Partener / AVY Studio",
      priceMinor: plan.price_ron_cents,
      specifications: {
        "Componente pe zi": String(plan.components_per_day),
        "Secțiuni pe zi": String(plan.sections_per_day),
        "Template-uri pe zi": String(plan.templates_per_day),
        Licență:
          "Accesul și drepturile se acordă separat, conform achiziției și licenței aprobate.",
      },
    })),
  ];
}

const problem = (
  c: Ctx,
  code: string,
  message: string,
  status: 400 | 403 | 404 | 409 = 400,
) => c.json({ error: { code, message } }, status);
const audit = (c: Ctx, id: string, kind: string) =>
  c.env.DB.prepare(
    `INSERT INTO security_events(id,actor_user_id,actor_type,action,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user',?,?,'allowed','info','{}',?)`,
  ).bind(crypto.randomUUID(), c.get("userId"), kind, id, Date.now());

export function createMaintenanceRouter(mutate: Mutation) {
  const router = new Hono<AppBindings>();
  router.get("/api/workspace/maintenance/config", async (c) => {
    const actor = await maintenanceActor(
      c.env,
      c.get("userId"),
      c.get("roles"),
    );
    const scope = actor.manage
      ? { sql: "1=1", values: [] }
      : maintenanceProjectScope(c.get("userId"), actor.staff);
    const [projects, clients, products, staff] = await Promise.all([
      c.env.DB.prepare(
        `SELECT p.id,p.slug,p.name,p.client_id,p.status FROM projects p WHERE p.status<>'archived' AND ${scope.sql} ORDER BY p.name LIMIT 500`,
      )
        .bind(...scope.values)
        .all(),
      actor.manage
        ? c.env.DB.prepare(
            "SELECT id,company_name FROM clients WHERE status<>'archived' ORDER BY company_name LIMIT 500",
          ).all()
        : Promise.resolve({ results: [] }),
      actor.manage
        ? c.env.DB.prepare(
            "SELECT slug,name_ro name FROM product_items WHERE status='live' ORDER BY name_ro LIMIT 500",
          ).all()
        : Promise.resolve({ results: [] }),
      actor.manage
        ? c.env.DB.prepare(
            "SELECT u.id,COALESCE(p.pseudonym,p.display_name,u.display_name,'Membru staff') name FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin')) ORDER BY name LIMIT 300",
          ).all()
        : Promise.resolve({ results: [] }),
    ]);
    return c.json({
      canManage: actor.manage,
      projects: projects.results,
      clients: clients.results,
      products: products.results,
      staff: staff.results,
      plans: await subscriptionPlans(c.env.DB),
    });
  });
  router.get("/api/workspace/maintenance", async (c) => {
    const actor = await maintenanceActor(
      c.env,
      c.get("userId"),
      c.get("roles"),
    );
    const scope = actor.manage
      ? { sql: "1=1", values: [] }
      : maintenanceProjectScope(c.get("userId"), actor.staff);
    const project = c.req.query("project");
    const { results } = await c.env.DB.prepare(
      `SELECT s.id,s.status,s.next_billing_date,s.maintenance_enabled,s.plan_sku,s.specifications_json,s.product_slug,s.external_url,s.target_label,s.revision,v.id service_id,v.service_name,v.price,v.billing_cycle,p.id project_id,p.name project_name,p.status project_status,p.client_id,cl.company_name,
   (SELECT json_group_array(json_object('id',u.id,'name',COALESCE(pr.pseudonym,pr.display_name,u.display_name,'Membru staff'))) FROM subscription_staff ss JOIN users u ON u.id=ss.user_id LEFT JOIN profiles pr ON pr.id=u.id WHERE ss.subscription_id=s.id AND u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role IN('staff','admin'))) staff_json
   FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN projects p ON p.id=v.project_id JOIN clients cl ON cl.id=p.client_id
   WHERE s.client_id=p.client_id AND ${scope.sql} ${project ? "AND p.id=?" : ""} ORDER BY s.status='active' DESC,s.next_billing_date,s.id LIMIT 500`,
    )
      .bind(...scope.values, ...(project ? [project] : []))
      .all<Record<string, unknown>>();
    return c.json({
      data: results.map((row) => {
        const { staff_json, ...value } = row;
        return { ...value, staff: JSON.parse(String(staff_json || "[]")) };
      }),
      canManage: actor.manage,
    });
  });
  const save = async (c: Ctx, id?: string) => {
    const actor = await maintenanceActor(
      c.env,
      c.get("userId"),
      c.get("roles"),
    );
    if (!actor.manage)
      return problem(
        c,
        "forbidden",
        "Doar administratorii autorizați pot configura abonamente.",
        403,
      );
    if (!(await privilegedMfaSatisfied(c)))
      return problem(
        c,
        "mfa_required",
        "Este necesară verificarea de securitate.",
        403,
      );
    const parsed = form.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      return problem(
        c,
        "invalid_input",
        "Completează proiectul, planul, specificațiile, tariful lunar și data următoarei perioade.",
      );
    const b = parsed.data,
      t = Date.now(),
      plan = b.planSku
        ? (await subscriptionPlans(c.env.DB)).find((p) => p.sku === b.planSku)
        : null;
    if (b.planSku && !plan)
      return problem(c, "invalid_plan", "Planul nu mai există în catalog.");
    if (!Object.keys(b.specifications).length)
      return problem(
        c,
        "specifications_required",
        "Specifică serviciile și limitele abonamentului.",
      );
    if (b.productSlug && b.externalUrl)
      return problem(
        c,
        "invalid_target",
        "Selectează un produs din catalog sau un produs extern.",
      );
    const externalUrl = b.externalUrl
      ? normalizeExternalLink(b.externalUrl)
      : null;
    if (b.externalUrl && !externalUrl)
      return problem(
        c,
        "invalid_url",
        "Adresa externă trebuie să fie HTTP/HTTPS, fără credențiale.",
      );
    if (
      b.productSlug &&
      !(await c.env.DB.prepare(
        "SELECT 1 FROM product_items WHERE slug=? AND status='live'",
      )
        .bind(b.productSlug)
        .first())
    )
      return problem(
        c,
        "invalid_product",
        "Produsul selectat nu este disponibil.",
      );
    const staffIds = [...new Set(b.staffIds)];
    if (staffIds.length) {
      const valid = await c.env.DB.prepare(
        `SELECT count(*) total FROM users u WHERE u.id IN(${staffIds.map(() => "?").join(",")}) AND u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))`,
      )
        .bind(...staffIds)
        .first<{ total: number }>();
      if (valid?.total !== staffIds.length)
        return problem(
          c,
          "invalid_staff",
          "Selectează numai membri staff activi.",
        );
    }
    let project: {
      id: string;
      client_id: string;
      status: string;
      organization_id: string | null;
    } | null = null;
    const statements: D1PreparedStatement[] = [];
    if (b.externalProject) {
      if (id || b.existingSubscriptionId)
        return problem(
          c,
          "invalid_target",
          "Un abonament existent păstrează proiectul asociat.",
        );
      const client = await c.env.DB.prepare(
        "SELECT c.id,co.organization_id FROM clients c LEFT JOIN client_organizations co ON co.client_id=c.id WHERE c.id=? AND c.status<>'archived'",
      )
        .bind(b.externalProject.clientId)
        .first<{ id: string; organization_id: string | null }>();
      if (!client)
        return problem(
          c,
          "invalid_client",
          "Clientul selectat nu este disponibil.",
        );
      const projectId = crypto.randomUUID();
      project = {
        id: projectId,
        client_id: client.id,
        status: "in_progress",
        organization_id: client.organization_id,
      };
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO projects(id,client_id,organization_id,name,slug,kind,status,banner_status,url,created_at,updated_at) VALUES(?,?,?,?,?,'external_asset','in_progress','in_progress',?,?,?)",
        ).bind(
          projectId,
          client.id,
          client.organization_id,
          b.externalProject.name,
          "extern-" + projectId,
          externalUrl,
          t,
          t,
        ),
      );
    } else
      project = await c.env.DB.prepare(
        "SELECT id,client_id,status,organization_id FROM projects WHERE id=?",
      )
        .bind(b.projectId!)
        .first();
    if (!project || project.status === "archived")
      return problem(
        c,
        "project_unavailable",
        "Proiectul este indisponibil sau arhivat.",
        404,
      );
    const subscriptionId =
      id || b.existingSubscriptionId || crypto.randomUUID();
    const current =
      id || b.existingSubscriptionId
        ? await c.env.DB.prepare(
            "SELECT s.id,s.service_id,s.revision,v.project_id FROM subscriptions s JOIN services v ON v.id=s.service_id WHERE s.id=? AND s.client_id=?",
          )
            .bind(subscriptionId, project.client_id)
            .first<{
              id: string;
              service_id: string;
              revision: number;
              project_id: string;
            }>()
        : null;
    if (
      (id || b.existingSubscriptionId) &&
      (!current || current.project_id !== project.id)
    )
      return problem(
        c,
        "subscription_unavailable",
        "Abonamentul nu aparține acestui proiect.",
        404,
      );
    if (current && current.revision !== b.revision)
      return problem(
        c,
        "revision_conflict",
        "Abonamentul s-a modificat. Reîncarcă datele.",
        409,
      );
    const serviceId = current?.service_id || crypto.randomUUID();
    const target = b.productSlug
      ? "product:" + b.productSlug
      : externalUrl
        ? "external:" + (await sha256(externalUrl))
        : "project";
    const key = project.id + ":" + target;
    const duplicate = await c.env.DB.prepare(
      "SELECT id FROM subscriptions WHERE maintenance_key=? AND maintenance_enabled=1 AND status<>'cancelled' AND id<>?",
    )
      .bind(key, subscriptionId)
      .first();
    if (duplicate && b.status !== "cancelled")
      return problem(
        c,
        "maintenance_exists",
        "Există deja un abonament pentru această asociere. Editează-l din listă.",
        409,
      );
    if (current)
      statements.push(
        c.env.DB.prepare(
          "UPDATE services SET service_name=?,price=?,billing_cycle='monthly' WHERE id=?",
        ).bind(b.name, b.priceMinor / 100, serviceId),
        c.env.DB.prepare(
          "UPDATE subscriptions SET maintenance_enabled=1,plan_sku=?,specifications_json=?,product_slug=?,external_url=?,target_label=?,maintenance_key=?,status=?,next_billing_date=?,updated_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE id=?",
        ).bind(
          b.planSku,
          JSON.stringify(b.specifications),
          b.productSlug,
          externalUrl,
          b.targetLabel,
          key,
          b.status,
          b.nextBillingDate,
          t,
          b.revision!,
          subscriptionId,
        ),
      );
    else
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES(?,?,?,?,'monthly')",
        ).bind(serviceId, project.id, b.name, b.priceMinor / 100),
        c.env.DB.prepare(
          "INSERT INTO subscriptions(id,client_id,service_id,next_billing_date,status,maintenance_enabled,plan_sku,specifications_json,product_slug,external_url,target_label,maintenance_key,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?,?,?,?,?,?)",
        ).bind(
          subscriptionId,
          project.client_id,
          serviceId,
          b.nextBillingDate,
          b.status,
          b.planSku,
          JSON.stringify(b.specifications),
          b.productSlug,
          externalUrl,
          b.targetLabel,
          key,
          t,
          t,
        ),
      );
    statements.push(
      c.env.DB.prepare(
        "DELETE FROM subscription_staff WHERE subscription_id=?",
      ).bind(subscriptionId),
    );
    for (const staffId of staffIds)
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO subscription_staff(subscription_id,user_id,assigned_by,assigned_at) VALUES(?,?,?,?)",
        ).bind(subscriptionId, staffId, c.get("userId"), t),
      );
    if (target === "project" || b.externalProject)
      statements.push(
        c.env.DB.prepare(
          "UPDATE projects SET status=CASE WHEN ?='active' THEN 'maintenance' ELSE status END,subscription_plan=?,subscription_status=?,billing_next=?,updated_at=? WHERE id=?",
        ).bind(
          b.status,
          b.planSku || b.name,
          b.status,
          b.nextBillingDate,
          t,
          project.id,
        ),
      );
    statements.push(
      audit(
        c,
        subscriptionId,
        current ? "maintenance.updated" : "maintenance.created",
      ),
    );
    return mutate(
      c,
      b,
      {
        id: subscriptionId,
        projectId: project.id,
        revision: current ? current.revision + 1 : 1,
      },
      statements,
    );
  };
  router.post("/api/workspace/maintenance", (c) => save(c));
  router.patch("/api/workspace/maintenance/:id", (c) =>
    save(c, c.req.param("id")),
  );
  return router;
}
