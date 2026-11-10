import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { hasCapability, platformRoleForUser } from "./authorization";
import { privilegedMfaSatisfied, financialMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { readJsonBodyUpTo } from "./requestBody";
import { sha256 } from "./security";
import { subscriptionPlans } from "./maintenance";
import { normalizeExternalLink } from "../../../../src/shared/externalUrl";
import { nextSubscriptionMonth } from "../../../../src/shared/subscriptionOperations";

type Ctx = Context<AppBindings>;
const stamp = z.number().int().min(0).max(4102444800000);
const ident = z.string().min(1).max(160);
const billingForm = z
  .object({
    entityType: z.enum(["individual", "company", "pfa", "ngo", "other"]),
    legalName: z.string().trim().min(1).max(180),
    taxId: z.string().trim().max(80),
    address: z.string().trim().min(1).max(600),
    invoiceEmail: z.string().trim().email().max(254),
    paymentTermsDays: z.number().int().min(0).max(90),
  })
  .strict()
  .refine(
    (b) => (b.entityType !== "company" && b.entityType !== "pfa") || !!b.taxId,
    { message: "Completează identificatorul fiscal." },
  );
const allocationForm = z
  .object({
    clientId: ident.nullable(),
    newClient: z
      .object({
        companyName: z.string().trim().min(1).max(180),
        contactName: z.string().trim().max(180),
        email: z.string().trim().email().max(254),
        phone: z.string().trim().max(40),
      })
      .strict()
      .nullable(),
    accountId: ident.nullable(),
    projectId: ident.nullable(),
    planSku: ident.nullable(),
    name: z.string().trim().min(1).max(180),
    priceMinor: z.number().int().min(0).max(100000000),
    specifications: z
      .record(
        z.string().trim().min(1).max(100),
        z.string().trim().min(1).max(1500),
      )
      .refine((v) => Object.keys(v).length > 0 && Object.keys(v).length <= 30),
    targetLabel: z.string().trim().max(180),
    externalUrl: z.string().max(2048).nullable(),
    productSlug: ident.nullable(),
    nextBillingDate: stamp,
    billing: billingForm,
    confirmed: z.literal(true),
  })
  .strict()
  .refine((v) => !!v.clientId !== !!v.newClient);
const internalForm = z
  .object({
    vendorId: ident.nullable(),
    vendorName: z.string().trim().min(1).max(160),
    serviceName: z.string().trim().min(1).max(180),
    accountLabel: z.string().trim().min(1).max(180),
    accountEmail: z.union([z.literal(""), z.string().trim().email().max(254)]),
    workspaceLabel: z.string().trim().max(180),
    responsibleUserId: ident.nullable(),
    status: z.enum([
      "active",
      "free",
      "trial",
      "paused",
      "cancelled",
      "needs_configuration",
      "expired",
      "payment_due",
      "overdue",
    ]),
    billingType: z.enum([
      "recurring",
      "usage_based",
      "free",
      "trial",
      "variable",
    ]),
    billingCycle: z.enum(["monthly", "quarterly", "yearly"]).nullable(),
    amountMinor: z.number().int().min(0).max(100000000).nullable(),
    currency: z.enum(["RON", "EUR", "USD"]),
    nextBillingDate: stamp.nullable(),
    autoRenewal: z.boolean(),
    notes: z.string().trim().max(1500),
    revision: z.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => v.billingType !== "recurring" || !!v.billingCycle)
  .refine((v) => v.status !== "free" || v.amountMinor === 0)
  .refine((v) => v.status !== "active" || v.nextBillingDate !== null);
const fail = (
  c: Ctx,
  code: string,
  status: 400 | 403 | 404 | 409 | 413 = 400,
  message = "Verifică datele și reîncearcă.",
) => c.json({ error: { code, message } }, status);
const event = (c: Ctx, action: string, id: string) =>
  c.env.DB.prepare(
    "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user',?,'subscription',?,'allowed','info','{}',?)",
  ).bind(crypto.randomUUID(), c.get("userId"), action, id, Date.now());
const financialEvent = (
  c: Ctx,
  action: string,
  id: string,
  before: unknown = null,
  after: unknown = null,
) =>
  c.env.DB.prepare(
    "INSERT INTO financial_audit_events(id,actor_user_id,action,resource_type,resource_id,source,before_json,after_json,created_at) VALUES(?,?,?,'subscription',?,'manual',?,?,?)",
  ).bind(
    crypto.randomUUID(),
    c.get("userId"),
    action,
    id,
    before === null ? null : JSON.stringify(before),
    after === null ? null : JSON.stringify(after),
    Date.now(),
  );
async function read(c: Ctx) {
  const result = await readJsonBodyUpTo(c.req.raw, 64 * 1024);
  return result.ok ? result.value : null;
}
async function financeWrite(c: Ctx) {
  return (
    (await platformRoleForUser(c.env.DB, c.get("userId"))) ===
      "platform_owner" ||
    (await hasCapability(c.env.DB, c.get("userId"), "finance.write"))
  );
}
async function previousMutation(c: Ctx, value: unknown) {
  const key = c.req.header("idempotency-key") || "";
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(key))
    return fail(c, "idempotency_key_required");
  const old = await c.env.DB.prepare(
    "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
  )
    .bind(`subscriptions:${c.get("userId")}:${c.req.method}:${c.req.path}`, key)
    .first<{ request_hash: string; response_json: string }>();
  return old
    ? old.request_hash === (await sha256(JSON.stringify(value)))
      ? c.json(JSON.parse(old.response_json))
      : fail(c, "idempotency_key_reused", 409)
    : null;
}
async function mutation(
  c: Ctx,
  value: unknown,
  result: Record<string, unknown>,
  statements: D1PreparedStatement[],
) {
  const key = c.req.header("idempotency-key") || "";
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(key))
    return fail(c, "idempotency_key_required");
  const scope = `subscriptions:${c.get("userId")}:${c.req.method}:${c.req.path}`,
    hash = await sha256(JSON.stringify(value));
  const lookup = () =>
    c.env.DB.prepare(
      "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
    )
      .bind(scope, key)
      .first<{ request_hash: string; response_json: string }>();
  const replay = (old: { request_hash: string; response_json: string }) =>
    old.request_hash === hash
      ? c.json(JSON.parse(old.response_json))
      : fail(c, "idempotency_key_reused", 409);
  const prior = await lookup();
  if (prior) return replay(prior);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,200,?,?,?)",
      ).bind(
        scope,
        key,
        hash,
        JSON.stringify(result),
        Date.now(),
        Date.now() + 86400000,
      ),
      ...statements,
    ]);
  } catch (error) {
    const old = await lookup();
    if (old) return replay(old);
    if (
      /constraint failed|subscription_allocation_beneficiary_mismatch/i.test(
        String(error),
      )
    )
      return fail(
        c,
        "revision_or_allocation_conflict",
        409,
        "Datele s-au modificat sau alocarea există deja. Reîncarcă lista înainte de a continua.",
      );
    throw error;
  }
  return c.json(result);
}
export const subscriptionOperationsRouter = new Hono<AppBindings>();
subscriptionOperationsRouter.use(
  "/api/admin/client-subscriptions*",
  async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    if (!(await platformRoleForUser(c.env.DB, c.get("userId"))))
      return fail(
        c,
        "forbidden",
        403,
        "Doar administratorii de platformă autorizați pot gestiona alocările.",
      );
    const rate = await checkRateLimit(c.env.DB, [
      {
        key: `subscription-admin:${c.get("userId")}`,
        limit: 300,
        windowSec: 3600,
      },
    ]);
    if (!rate.ok) return c.json({ error: { code: "rate_limited" } }, 429);
    if (c.req.method !== "GET" && !(await privilegedMfaSatisfied(c)))
      return fail(
        c,
        "mfa_required",
        403,
        "Este necesară verificarea de securitate.",
      );
    await next();
  },
);
subscriptionOperationsRouter.get(
  "/api/admin/client-subscriptions",
  async (c) => {
    const scope=c.req.query('client')||'';
    if(scope&&!await c.env.DB.prepare('SELECT 1 FROM clients WHERE id=?').bind(scope).first())return fail(c,'client_not_found',404);
    const [rows, clients, accounts, projects, products, providers] =
      await Promise.all([
        c.env.DB.prepare(
          `SELECT s.*,v.service_name,v.price,v.billing_cycle,cl.company_name,p.id project_id,p.name project_name,p.status project_status,(SELECT count(*) FROM client_account_access g JOIN users u ON u.id=g.user_id WHERE g.client_id=s.client_id AND u.disabled_at IS NULL AND u.email_verified=1 AND NOT EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role IN('staff','admin'))) account_count,
 (SELECT json_object('entityType',b.entity_type,'legalName',b.legal_name,'taxId',coalesce(b.tax_id,''),'address',b.billing_address,'invoiceEmail',b.invoice_email,'paymentTermsDays',b.payment_terms_days,'clientId',b.client_id) FROM subscription_billing_settings b WHERE b.subscription_id=s.id) billing_json,
 (SELECT json_group_array(json_object('billing_date',q.billing_date,'period_end',q.period_end,'due_date',q.due_date,'revenue_id',q.revenue_id,'status',q.status,'invoice_number',q.invoice_number)) FROM (SELECT q.*,r.status,r.invoice_number FROM subscription_invoice_periods q JOIN financial_revenues r ON r.id=q.revenue_id WHERE q.subscription_id=s.id ORDER BY q.billing_date DESC LIMIT 12) q) periods_json
 FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN projects p ON p.id=v.project_id JOIN clients cl ON cl.id=s.client_id WHERE p.client_id=s.client_id ${scope?'AND s.client_id=?':''} ORDER BY s.status='active' DESC,s.next_billing_date,s.id LIMIT 500`,
        ).bind(...(scope?[scope]:[])).all<Record<string, unknown>>(),
        c.env.DB.prepare(
          `SELECT c.id,c.company_name,c.email,c.contact_name,l.entity_type,l.legal_name,l.tax_id,l.address FROM clients c LEFT JOIN client_legal_profiles l ON l.client_id=c.id WHERE ${scope?'c.id=?':"c.status<>'archived'"} ORDER BY c.company_name LIMIT 1000`,
        ).bind(...(scope?[scope]:[])).all(),
        c.env.DB.prepare(
          `SELECT u.id,u.email,coalesce(p.display_name,u.display_name,u.email) name,(SELECT json_group_array(g.client_id) FROM client_account_access g WHERE g.user_id=u.id) client_ids_json FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.disabled_at IS NULL AND u.email_verified=1 AND NOT EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin')) ${scope?'AND (EXISTS(SELECT 1 FROM client_account_access ac WHERE ac.user_id=u.id AND ac.client_id=?) OR lower(u.email)=(SELECT lower(email) FROM clients WHERE id=?))':''} ORDER BY u.email LIMIT 1000`,
        ).bind(...(scope?[scope,scope]:[])).all<{ id: string; client_ids_json: string }>(),
        c.env.DB.prepare(
          `SELECT id,name,client_id FROM projects WHERE status<>'archived' ${scope?'AND client_id=?':''} ORDER BY name LIMIT 1000`,
        ).bind(...(scope?[scope]:[])).all(),
        c.env.DB.prepare(
          "SELECT slug,name_ro name FROM product_items WHERE status='live' ORDER BY name_ro LIMIT 500",
        ).all(),
        scope?Promise.resolve({results:[]}):c.env.DB.prepare(
          "SELECT bs.id,bs.provider,bs.sku,bs.status,bs.amount_minor,bs.currency,bs.current_period_end,u.email FROM billing_subscriptions bs JOIN users u ON u.id=bs.user_id ORDER BY bs.updated_at DESC LIMIT 500",
        ).all(),
      ]);
    return c.json({
      data: rows.results.map(({ billing_json, periods_json, ...row }) => {
        const billing = billing_json ? JSON.parse(String(billing_json)) : null;
        const { clientId: billingClientId, ...details } = billing || {};
        return {
          ...row,
          billing: billing ? details : null,
          billingClientMatches: !!billing && billingClientId === row.client_id,
          periods: JSON.parse(String(periods_json || "[]")),
        };
      }),
      clients: clients.results,
      accounts: accounts.results.map(({ client_ids_json, ...a }) => ({
        ...a,
        client_ids: JSON.parse(client_ids_json || "[]"),
      })),
      projects: projects.results,
      products: products.results,
      plans: await subscriptionPlans(c.env.DB),
      providerSubscriptions: providers.results,
      canPrepareInvoices: (await financeWrite(c)) && financialMfaSatisfied(c),
    });
  },
);
subscriptionOperationsRouter.post(
  "/api/admin/client-subscriptions",
  async (c) => {
    const parsed = allocationForm.safeParse(await read(c));
    if (!parsed.success)
      return fail(
        c,
        "invalid_input",
        400,
        "Completează clientul, specificațiile, datele de facturare și confirmarea alocării.",
      );
    if(c.req.query('client')&&c.req.query('client')!==parsed.data.clientId)return fail(c,'client_scope_mismatch',409);
    const replay = await previousMutation(c, parsed.data);
    if (replay) return replay;
    const b = parsed.data,
      t = Date.now(),
      id = crypto.randomUUID(),
      clientId = b.clientId || crypto.randomUUID(),
      projectId = b.projectId || crypto.randomUUID(),
      serviceId = crypto.randomUUID();
    if (
      b.planSku &&
      !(await subscriptionPlans(c.env.DB)).some((p) => p.sku === b.planSku)
    )
      return fail(c, "invalid_plan");
    if (
      b.clientId &&
      !(await c.env.DB.prepare(
        "SELECT 1 FROM clients WHERE id=? AND status<>'archived'",
      )
        .bind(b.clientId)
        .first())
    )
      return fail(c, "client_not_found", 404);
    if (
      b.newClient &&
      (await c.env.DB.prepare(
        "SELECT 1 FROM clients WHERE lower(trim(email))=?",
      )
        .bind(b.newClient.email.toLowerCase())
        .first())
    )
      return fail(
        c,
        "client_exists",
        409,
        "Există o fișă cu acest e-mail. Selecteaz-o din lista clienților.",
      );
    if (
      b.projectId &&
      !(await c.env.DB.prepare(
        "SELECT 1 FROM projects WHERE id=? AND client_id=? AND status<>'archived'",
      )
        .bind(b.projectId, clientId)
        .first())
    )
      return fail(c, "project_client_mismatch", 409);
    if (
      b.accountId &&
      !(await c.env.DB.prepare(
        "SELECT 1 FROM users u WHERE u.id=? AND u.email_verified=1 AND u.disabled_at IS NULL AND NOT EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))",
      )
        .bind(b.accountId)
        .first())
    )
      return fail(c, "invalid_client_account");
    if (
      b.productSlug &&
      !(await c.env.DB.prepare(
        "SELECT 1 FROM product_items WHERE slug=? AND status='live'",
      )
        .bind(b.productSlug)
        .first())
    )
      return fail(c, "invalid_product");
    const url = b.externalUrl ? normalizeExternalLink(b.externalUrl) : null;
    if ((b.externalUrl && !url) || (b.externalUrl && b.productSlug))
      return fail(c, "invalid_target");
    const mapping = b.clientId
      ? await c.env.DB.prepare(
          "SELECT organization_id FROM client_organizations WHERE client_id=?",
        )
          .bind(b.clientId)
          .first<{ organization_id: string }>()
      : null;
    const key = await sha256(
      JSON.stringify([
        b.clientId || b.newClient!.email.toLowerCase(),
        b.projectId,
        b.planSku || b.name.toLowerCase(),
        b.productSlug,
        url,
        b.targetLabel,
      ]),
    );
    const writes: D1PreparedStatement[] = [];
    if (b.newClient)
      writes.push(
        c.env.DB.prepare(
          "INSERT INTO clients(id,company_name,contact_name,email,phone,status,created_at) VALUES(?,?,?,?,?,'active',?)",
        ).bind(
          clientId,
          b.newClient.companyName,
          b.newClient.contactName || null,
          b.newClient.email.toLowerCase(),
          b.newClient.phone || null,
          t,
        ),
      );
    if (b.accountId)
      writes.push(
        c.env.DB.prepare(
          "INSERT OR IGNORE INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES(?,?,?,?)",
        ).bind(clientId, b.accountId, c.get("userId"), t),
      );
    if (!b.projectId)
      writes.push(
        c.env.DB.prepare(
          "INSERT INTO projects(id,client_id,name,slug,kind,status,organization_id,created_at,updated_at) VALUES(?,?,?,?,'subscription','in_progress',?,?,?)",
        ).bind(
          projectId,
          clientId,
          `Abonament · ${b.name}`,
          `subscription-${projectId}`,
          mapping?.organization_id || null,
          t,
          t,
        ),
      );
    writes.push(
      c.env.DB.prepare(
        "INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES(?,?,?,?,'monthly')",
      ).bind(serviceId, projectId, b.name, b.priceMinor / 100),
      c.env.DB.prepare(
        "INSERT INTO subscriptions(id,client_id,service_id,next_billing_date,status,plan_sku,specifications_json,product_slug,external_url,target_label,allocation_key,created_at,updated_at) VALUES(?,?,?,?,'active',?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        clientId,
        serviceId,
        b.nextBillingDate,
        b.planSku,
        JSON.stringify(b.specifications),
        b.productSlug,
        url,
        b.targetLabel,
        key,
        t,
        t,
      ),
      c.env.DB.prepare(
        "INSERT INTO subscription_billing_settings(subscription_id,client_id,entity_type,legal_name,tax_id,billing_address,invoice_email,payment_terms_days,anchor_day,start_date,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        clientId,
        b.billing.entityType,
        b.billing.legalName,
        b.billing.taxId || null,
        b.billing.address,
        b.billing.invoiceEmail.toLowerCase(),
        b.billing.paymentTermsDays,
        new Date(b.nextBillingDate).getUTCDate(),
        b.nextBillingDate,
        c.get("userId"),
        t,
      ),
      event(c, "subscription.client.allocated", id),
    );
    return mutation(c, b, { id, clientId, projectId, revision: 1 }, writes);
  },
);
subscriptionOperationsRouter.put(
  "/api/admin/client-subscriptions/:id/billing",
  async (c) => {
    const input = z
      .object({
        revision: z.number().int().positive(),
        nextBillingDate: stamp,
        billing: billingForm,
        status: z.enum(["active", "paused", "cancelled"]),
      })
      .strict()
      .safeParse(await read(c));
    if (!input.success) return fail(c, "invalid_input");
    const b = input.data,
      id = c.req.param("id");
    const replay = await previousMutation(c, b);
    if (replay) return replay;
    const sub = await c.env.DB.prepare(
      "SELECT s.client_id,s.next_billing_date,(SELECT anchor_day FROM subscription_billing_settings WHERE subscription_id=s.id) anchor_day,v.billing_cycle FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN projects p ON p.id=v.project_id WHERE s.id=? AND p.client_id=s.client_id",
    )
      .bind(id)
      .first<{
        client_id: string;
        next_billing_date: number;
        anchor_day: number | null;
        billing_cycle: string;
      }>();
    if (!sub) return fail(c, "not_found", 404);
    if(await c.env.DB.prepare("SELECT 1 FROM billing_recurring_agreements WHERE subscription_id=? AND closed_at IS NULL").bind(id).first())return fail(c,"provider_managed_recurring_subscription",409,"Gestionează debitarea în Stripe; condițiile acceptate nu se suprascriu manual.");
    if(await c.env.DB.prepare("SELECT 1 FROM website_subscription_projects WHERE subscription_id=?").bind(id).first()) return fail(c,"provider_managed_website_subscription",409,"Folosește Site-uri prin abonament pentru date și portalul Stripe pentru anulare. Scadența și starea se confirmă prin procesator.");
    if (sub.billing_cycle !== "monthly")
      return fail(
        c,
        "monthly_required",
        409,
        "Configurează întâi ciclul lunar al serviciului.",
      );
    return mutation(c, b, { id, revision: b.revision + 1 }, [
      c.env.DB.prepare(
        "UPDATE subscriptions SET status=?,next_billing_date=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?",
      ).bind(b.status, b.nextBillingDate, b.revision, Date.now(), id),
      c.env.DB.prepare(
        "INSERT INTO subscription_billing_settings(subscription_id,client_id,entity_type,legal_name,tax_id,billing_address,invoice_email,payment_terms_days,anchor_day,start_date,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(subscription_id) DO UPDATE SET client_id=excluded.client_id,entity_type=excluded.entity_type,legal_name=excluded.legal_name,tax_id=excluded.tax_id,billing_address=excluded.billing_address,invoice_email=excluded.invoice_email,payment_terms_days=excluded.payment_terms_days,anchor_day=excluded.anchor_day,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
      ).bind(
        id,
        sub.client_id,
        b.billing.entityType,
        b.billing.legalName,
        b.billing.taxId || null,
        b.billing.address,
        b.billing.invoiceEmail.toLowerCase(),
        b.billing.paymentTermsDays,
        sub.next_billing_date === b.nextBillingDate && sub.anchor_day
          ? sub.anchor_day
          : new Date(b.nextBillingDate).getUTCDate(),
        b.nextBillingDate,
        c.get("userId"),
        Date.now(),
      ),
      event(c, "subscription.billing.configured", id),
    ]);
  },
);
subscriptionOperationsRouter.post(
  "/api/admin/client-subscriptions/:id/prepare-invoice",
  async (c) => {
    if (!(await financeWrite(c))) return fail(c, "forbidden", 403);
    if(await c.env.DB.prepare("SELECT 1 FROM subscriptions WHERE id=? AND plan_sku LIKE 'AVY-WEB-SUB-%'").bind(c.req.param("id")).first())return fail(c,"provider_managed_website_invoice",409,"Facturile acestui abonament se sincronizează prin procesator. Folosește istoricul central, fără o a doua factură pentru aceeași perioadă.");
    if (!financialMfaSatisfied(c))
      return fail(
        c,
        "mfa_required",
        403,
        "Pregătirea în registrul financiar necesită MFA.",
      );
    const input = z
      .object({
        revision: z.number().int().positive(),
        billingDate: stamp,
        confirmed: z.literal(true),
      })
      .strict()
      .safeParse(await read(c));
    if (!input.success) return fail(c, "invalid_input");
    const b = input.data,
      id = c.req.param("id");
    if(await c.env.DB.prepare("SELECT 1 FROM billing_recurring_agreements WHERE subscription_id=? AND closed_at IS NULL").bind(id).first())return fail(c,"provider_managed_recurring_subscription",409,"Facturile acestui abonament urmează plățile Stripe confirmate, fără o a doua factură manuală.");
    const replay = await previousMutation(c, b);
    if (replay) return replay;
    const existing = await c.env.DB.prepare(
      "SELECT revenue_id FROM subscription_invoice_periods WHERE subscription_id=? AND billing_date=?",
    )
      .bind(id, b.billingDate)
      .first<{ revenue_id: string }>();
    if (existing)
      return c.json({ id: existing.revenue_id, prepared: true, reused: true });
    const row = await c.env.DB.prepare(
      `SELECT s.revision,s.client_id,s.status,s.next_billing_date,v.service_name,v.price,v.billing_cycle,p.id project_id,b.client_id billing_client_id,b.anchor_day,b.payment_terms_days FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN projects p ON p.id=v.project_id JOIN subscription_billing_settings b ON b.subscription_id=s.id WHERE s.id=? AND p.client_id=s.client_id`,
    )
      .bind(id)
      .first<{
        revision: number;
        client_id: string;
        status: string;
        next_billing_date: number;
        service_name: string;
        price: number;
        billing_cycle: string;
        project_id: string;
        billing_client_id: string;
        anchor_day: number;
        payment_terms_days: number;
      }>();
    if (!row) return fail(c, "billing_not_configured", 409);
    if (row.client_id !== row.billing_client_id)
      return fail(c, "beneficiary_changed", 409);
    if (row.status !== "active" || row.billing_cycle !== "monthly")
      return fail(c, "subscription_inactive", 409);
    if (row.revision !== b.revision || row.next_billing_date !== b.billingDate)
      return fail(c, "revision_conflict", 409);
    const next = nextSubscriptionMonth(b.billingDate, row.anchor_day),
      due = b.billingDate + row.payment_terms_days * 86400000,
      revenueId = crypto.randomUUID(),
      t = Date.now(),
      amount = Math.round(row.price * 100);
    return mutation(c, b, { id: revenueId, prepared: true }, [
      c.env.DB.prepare(
        "UPDATE subscriptions SET next_billing_date=?,revision=CASE WHEN revision=? AND next_billing_date=? AND status='active' AND client_id=? AND EXISTS(SELECT 1 FROM services v JOIN projects p ON p.id=v.project_id WHERE v.id=subscriptions.service_id AND p.id=? AND p.client_id=?) THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?",
      ).bind(
        next,
        b.revision,
        b.billingDate,
        row.client_id,
        row.project_id,
        row.client_id,
        t,
        id,
      ),
      c.env.DB.prepare(
        "INSERT INTO financial_revenues(id,revenue_type,client_id,project_id,service_name,invoice_date,due_date,status,currency,gross_amount_minor,amount_ron_minor,notes,source,created_by,updated_by,created_at,updated_at) VALUES(?,'subscriptions',?,?,?,?,?,'draft','RON',?,?,?,'system_generated',?,?,?,?)",
      ).bind(
        revenueId,
        row.client_id,
        row.project_id,
        row.service_name,
        b.billingDate,
        due,
        amount,
        amount,
        "Ciornă de facturare lunară. Verifică regimul fiscal și aprobă în Financiar înainte de emitere.",
        c.get("userId"),
        c.get("userId"),
        t,
        t,
      ),
      c.env.DB.prepare(
        "INSERT INTO subscription_invoice_periods(subscription_id,billing_date,period_end,due_date,revenue_id,created_by,created_at) VALUES(?,?,?,?,?,?,?)",
      ).bind(id, b.billingDate, next, due, revenueId, c.get("userId"), t),
      financialEvent(c, "subscription.invoice.prepared", id),
      event(c, "subscription.invoice.prepared", id),
    ]);
  },
);
subscriptionOperationsRouter.use(
  "/api/internal/subscriptions*",
  async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    if (
      !c.get("roles").some((r) => r === "staff" || r === "admin") &&
      !(await platformRoleForUser(c.env.DB, c.get("userId")))
    )
      return fail(c, "forbidden", 403);
    const rate = await checkRateLimit(c.env.DB, [
      {
        key: `internal-subscriptions:${c.get("userId")}`,
        limit: 300,
        windowSec: 3600,
      },
    ]);
    if (!rate.ok) return c.json({ error: { code: "rate_limited" } }, 429);
    if (c.req.method !== "GET") {
      if (!(await financeWrite(c))) return fail(c, "forbidden", 403);
      if (!financialMfaSatisfied(c))
        return fail(
          c,
          "mfa_required",
          403,
          "Modificarea registrului financiar necesită MFA.",
        );
    }
    await next();
  },
);
subscriptionOperationsRouter.get("/api/internal/subscriptions", async (c) => {
  const principal = await platformRoleForUser(c.env.DB, c.get("userId")),
    costs =
      !!principal ||
      (await hasCapability(c.env.DB, c.get("userId"), "finance.read")),
    manage = await financeWrite(c);
  const rows = await c.env.DB.prepare(
    `SELECT e.id,e.vendor_id,v.name vendor_name,e.service_name,e.account_label,e.workspace_label,e.status,e.billing_type,e.billing_cycle,e.next_billing_date,e.subscription_revision,CASE WHEN u.id IS NULL THEN NULL ELSE coalesce(pr.pseudonym,pr.display_name,u.display_name,'Membru staff') END responsible_name${costs ? ",e.account_email,e.gross_amount_minor,e.currency,e.notes,e.responsible_user_id,e.auto_renewal" : ""} FROM financial_expenses e JOIN financial_vendors v ON v.id=e.vendor_id LEFT JOIN users u ON u.id=e.responsible_user_id AND u.disabled_at IS NULL LEFT JOIN profiles pr ON pr.id=u.id WHERE e.client_id IS NULL AND e.project_id IS NULL AND e.archived_at IS NULL AND e.billing_type IN('recurring','usage_based','free','trial','variable') ORDER BY e.status IN('active','trial','payment_due','overdue') DESC,e.next_billing_date IS NULL,e.next_billing_date,v.name,e.id LIMIT 1000`,
  ).all();
  const [vendors, staff] = manage
    ? await Promise.all([
        c.env.DB.prepare(
          "SELECT id,name FROM financial_vendors WHERE status<>'archived' ORDER BY name",
        ).all(),
        c.env.DB.prepare(
          "SELECT u.id,coalesce(p.pseudonym,p.display_name,u.display_name,u.email) name FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin')) ORDER BY name",
        ).all(),
      ])
    : [{ results: [] }, { results: [] }];
  return c.json({
    data: rows.results,
    canManage: manage,
    canSeeCosts: costs,
    vendors: vendors.results,
    staff: staff.results,
  });
});
async function saveInternal(c: Ctx, id?: string) {
  const parsed = internalForm.safeParse(await read(c));
  if (!parsed.success)
    return fail(
      c,
      "invalid_input",
      400,
      "Completează furnizorul, contul, ciclul și data de reînnoire. Pentru gratuit, introdu valoarea 0.",
    );
  const replay = await previousMutation(c, parsed.data);
  if (replay) return replay;
  const b = parsed.data,
    t = Date.now();
  if (
    id &&
    (!b.revision ||
      !(await c.env.DB.prepare(
        "SELECT 1 FROM financial_expenses WHERE id=? AND client_id IS NULL AND project_id IS NULL AND archived_at IS NULL",
      )
        .bind(id)
        .first()))
  )
    return fail(c, "not_found", 404);
  if (
    b.responsibleUserId &&
    !(await c.env.DB.prepare(
      "SELECT 1 FROM users u WHERE u.id=? AND u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))",
    )
      .bind(b.responsibleUserId)
      .first())
  )
    return fail(c, "invalid_staff");
  let vendorId = b.vendorId;
  let vendorCategory = "development_saas";
  const writes: D1PreparedStatement[] = [];
  if (vendorId) {
    const vendor = await c.env.DB.prepare(
      "SELECT category FROM financial_vendors WHERE id=? AND status<>'archived'",
    )
      .bind(vendorId)
      .first<{ category: string }>();
    if (!vendor) return fail(c, "invalid_vendor");
    vendorCategory = vendor.category;
  } else {
    const found = await c.env.DB.prepare(
      "SELECT id,category FROM financial_vendors WHERE lower(trim(name))=? AND status<>'archived' ORDER BY created_at,id LIMIT 1",
    )
      .bind(b.vendorName.toLowerCase())
      .first<{ id: string; category: string }>();
    vendorCategory = found?.category || vendorCategory;
    vendorId =
      found?.id ||
      `vendor-sub-${(await sha256(b.vendorName.toLowerCase())).slice(0, 24)}`;
    if (!found)
      writes.push(
        c.env.DB.prepare(
          "INSERT OR IGNORE INTO financial_vendors(id,name,category,service_type,status,created_at,updated_at) VALUES(?,?,'development_saas','subscription','needs_configuration',?,?)",
        ).bind(vendorId, b.vendorName, t, t),
      );
  }
  const expenseId = id || crypto.randomUUID();
  const prior = id
    ? await c.env.DB.prepare(
        "SELECT net_amount_minor,vat_amount_minor,gross_amount_minor,currency,invoice_number,paid_date,amount_ron_minor FROM financial_expenses WHERE id=?",
      )
        .bind(id)
        .first<{
          net_amount_minor: number | null;
          vat_amount_minor: number | null;
          gross_amount_minor: number | null;
          currency: string;
          invoice_number: string | null;
          paid_date: number | null;
          amount_ron_minor: number | null;
        }>()
    : null;
  if (
    prior &&
    (prior.invoice_number ||
      prior.paid_date ||
      prior.net_amount_minor !== null ||
      prior.vat_amount_minor !== null) &&
    (prior.gross_amount_minor !== b.amountMinor ||
      prior.currency !== b.currency)
  )
    return fail(
      c,
      "use_finance",
      409,
      "Înregistrarea are date fiscale sau plăți. Modifică valoarea în Financiar, păstrând istoricul.",
    );
  if (id)
    writes.push(
      c.env.DB.prepare(
        "UPDATE financial_expenses SET vendor_id=?,service_name=?,account_label=?,account_email=?,workspace_label=?,responsible_user_id=?,status=?,billing_type=?,billing_cycle=?,gross_amount_minor=?,amount_ron_minor=?,currency=?,next_billing_date=?,auto_renewal=?,notes=?,updated_by=?,updated_at=?,subscription_revision=CASE WHEN subscription_revision=? AND archived_at IS NULL AND client_id IS NULL AND project_id IS NULL THEN subscription_revision+1 ELSE NULL END WHERE id=?",
      ).bind(
        vendorId,
        b.serviceName,
        b.accountLabel,
        b.accountEmail || null,
        b.workspaceLabel,
        b.responsibleUserId,
        b.status,
        b.billingType,
        b.billingCycle,
        b.amountMinor,
        b.currency === "RON"
          ? b.amountMinor
          : prior?.gross_amount_minor === b.amountMinor &&
              prior?.currency === b.currency
            ? prior.amount_ron_minor
            : null,
        b.currency,
        b.nextBillingDate,
        b.autoRenewal ? 1 : 0,
        b.notes,
        c.get("userId"),
        t,
        b.revision!,
        expenseId,
      ),
    );
  else
    writes.push(
      c.env.DB.prepare(
        "INSERT INTO financial_expenses(id,vendor_id,service_name,category,status,billing_type,billing_cycle,currency,gross_amount_minor,amount_ron_minor,next_billing_date,auto_renewal,notes,source,created_by,updated_by,created_at,updated_at,account_label,account_email,workspace_label,responsible_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'manual',?,?,?,?,?,?,?,?)",
      ).bind(
        expenseId,
        vendorId,
        b.serviceName,
        vendorCategory,
        b.status,
        b.billingType,
        b.billingCycle,
        b.currency,
        b.amountMinor,
        b.currency === "RON" ? b.amountMinor : null,
        b.nextBillingDate,
        b.autoRenewal ? 1 : 0,
        b.notes,
        c.get("userId"),
        c.get("userId"),
        t,
        t,
        b.accountLabel,
        b.accountEmail || null,
        b.workspaceLabel,
        b.responsibleUserId,
      ),
    );
  writes.push(
    financialEvent(
      c,
      id ? "internal_subscription.updated" : "internal_subscription.created",
      expenseId,
      prior
        ? { amountMinor: prior.gross_amount_minor, currency: prior.currency }
        : null,
      { amountMinor: b.amountMinor, currency: b.currency },
    ),
    event(c, "subscription.internal.saved", expenseId),
  );
  return mutation(
    c,
    b,
    { id: expenseId, revision: (b.revision || 0) + 1 },
    writes,
  );
}
subscriptionOperationsRouter.post("/api/internal/subscriptions", (c) =>
  saveInternal(c),
);
subscriptionOperationsRouter.put("/api/internal/subscriptions/:id", (c) =>
  saveInternal(c, c.req.param("id")),
);
