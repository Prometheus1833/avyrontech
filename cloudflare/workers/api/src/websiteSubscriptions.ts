import { websitePlans } from "./websiteSubscriptionPlans";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";
import { projectAccessMap } from "./projects";
import { readJsonBodyUpTo } from "./requestBody";
import { sha256 } from "./security";
import { checkRateLimit, clientIp, hashKey, verifyTurnstile } from "./antispam";
import { createCheckoutForOrder } from "./billing";
import { checkStripeAccount } from "./stripeAccount";
import { deliverMail, logDelivery } from "./mailer";
import { normalizeExternalLink } from "../../../../src/shared/externalUrl";
import {
  publicWebsitePlanRate,
  websitePlanReady,
  WEBSITE_FIRST_PAYMENT_DAYS,
  WEBSITE_FIRST_PAYMENT_DELAY_MS,
  WEBSITE_WORKFLOW,
  type WebsitePlan,
  type WebsiteSubscriptionProject,
} from "../../../../src/shared/websiteSubscriptions";
export const websiteSubscriptionsRouter = new Hono<AppBindings>();
type Ctx = Context<AppBindings>;
const ident = z.string().min(1).max(160),
  planId = z.enum(["start", "business", "premium"]);
const fail = (
  c: Ctx,
  code: string,
  status: 400 | 403 | 404 | 409 | 413 | 429 | 503 = 400,
) =>
  c.json(
    {
      error: {
        code,
        message:
          (
            {
              forbidden: "Nu ai permisiunea pentru această acțiune.",
              configuration_required:
                "Prețul, termenii și contul de încasare trebuie confirmate.",
              billing_details_required:
                "Completează și salvează datele de facturare din fișa acestui proiect înainte de abonare.",
              quota_or_review_conflict:
                "Nu există suficiente modificări în perioada achitată activă sau solicitarea s-a schimbat. Defectele și incidentele de securitate nu consumă această limită.",
              client_approval_required:
                "Trimite proiectul în testare și solicită aprobarea clientului înainte de lansare.",
              first_payment_pending:
                `Prima plată devine disponibilă la ${WEBSITE_FIRST_PAYMENT_DAYS} de zile după aprobarea site-ului final.`,
              revision_conflict:
                "Datele s-au schimbat. Reîncarcă și verifică înainte de a continua.",
            } as Record<string, string>
          )[code] || "Verifică datele și încearcă din nou.",
      },
    },
    status,
  );
const owner = (c: Ctx) => platformRoleForUser(c.env.DB, c.get("userId"));
const audit = (c: Ctx, action: string, id: string) =>
  c.env.DB.prepare(
    "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user',?,'website_subscription',?,'allowed','info','{}',?)",
  ).bind(crypto.randomUUID(), c.get("userId"), action, id, Date.now());
async function body(c: Ctx) {
  const parsed = await readJsonBodyUpTo(c.req.raw, 65536);
  return parsed.ok ? parsed.value : null;
}
websiteSubscriptionsRouter.get(
  "/api/website-subscriptions/plans",
  async (c) => {
    const plans = await websitePlans(c.env.DB);
    c.header("Cache-Control", "public, max-age=30");
    return c.json({
      data: plans.map((p) =>
        p.available
          ? p
          : {
              ...p,
              ...publicWebsitePlanRate(p),
              terms: "",
              cancellation: "",
              reviewed: false,
            },
      ),
    });
  },
);
const requestForm = z
  .object({
    planId,
    company: z.string().trim().min(2).max(180),
    industry: z.string().trim().min(2).max(120),
    website: z.string().trim().max(2048).default(""),
    objectives: z.string().trim().min(3).max(1500),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).default(""),
    consent: z.literal(true),
    lang: z.enum(["ro", "en"]).default("ro"),
    trap: z.string().max(200).default(""),
    token: z.string().max(4096).default(""),
  })
  .strict();
websiteSubscriptionsRouter.post(
  "/api/website-subscriptions/requests",
  async (c) => {
    const parsed = requestForm.safeParse(await body(c));
    if (!parsed.success) return fail(c, "invalid_request");
    const b = parsed.data;
    if (b.trap) return fail(c, "invalid_request");
    const key = c.req.header("Idempotency-Key");
    if (!key || !z.string().uuid().safeParse(key).success)
      return fail(c, "idempotency_key_required");
    const website = b.website ? normalizeExternalLink(b.website) : null;
    if (b.website && !website)
      return fail(c, "invalid_website");
    const ip = await hashKey(clientIp(c.req.raw));
    const limit = await checkRateLimit(
      c.env.DB,
      [{ key: `website-lead:${ip}`, limit: 10, windowSec: 3600 }],
      { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `website-lead:${ip}` },
    );
    if (!limit.ok) return fail(c, "rate_limited", 429);
    const { token, trap, ...brief } = b;
    const requestHash = await sha256(JSON.stringify(brief)),
      requestKey = await sha256(key);
    const old = await c.env.DB.prepare(
      "SELECT id,request_hash FROM website_subscription_requests WHERE request_key=?",
    )
      .bind(requestKey)
      .first<{ id: string; request_hash: string }>();
    if (old)
      return old.request_hash === requestHash
        ? c.json({ ok: true, reference: old.id, replay: true })
        : fail(c, "idempotency_conflict", 409);
    const challenge = await verifyTurnstile(
      c.env.TURNSTILE_SECRET,
      token,
      clientIp(c.req.raw),
      {
        expectedAction: "website-subscription",
        allowedHostnames: c.env.TURNSTILE_ALLOWED_HOSTNAMES,
      },
    );
    if (!challenge.ok) return fail(c, "captcha_failed");
    const plan = (await websitePlans(c.env.DB)).find((p) => p.id === b.planId);
    if (!plan) return fail(c, "invalid_plan");
    const id = crypto.randomUUID(),
      lead = `wslead_${requestKey}`,
      t = Date.now();
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO leads(id,source,name,email,phone,message,status,created_at,product,config_json,lifecycle_stage,business,website,language,updated_at) VALUES(?,'website-subscription',?,?,?,?,'new',?,'website-subscription',?,'new_lead',?,?,?,?)",
      ).bind(
        lead,
        b.name,
        b.email.toLowerCase(),
        b.phone,
        `${b.company} · ${b.industry}\n${b.objectives}`,
        t,
        JSON.stringify({ ...brief, contactConsentAt: t }),
        b.company,
        website,
        b.lang,
        t,
      ),
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO website_subscription_requests(id,lead_id,plan_id,request_key,request_hash,created_at) VALUES(?,?,?,?,?,?)",
      ).bind(id, lead, b.planId, requestKey, requestHash, t),
    ]);
    const saved = await c.env.DB.prepare(
      "SELECT id,request_hash FROM website_subscription_requests WHERE request_key=?",
    )
      .bind(requestKey)
      .first<{ id: string; request_hash: string }>();
    if (saved?.request_hash !== requestHash)
      return fail(c, "idempotency_conflict", 409);
    if (saved.id !== id)
      return c.json({ ok: true, reference: saved.id, replay: true });

    const notify = async () => {
      const recipient = c.env.LEAD_TO || c.env.SMTP_FROM;
      const result = recipient
        ? await deliverMail(c.env, {
            to: recipient,
            replyTo: b.email.toLowerCase(),
            subject: `Solicitare Website la 0 lei · ${plan.name}`,
            text: [
              `Pachet: ${plan.name}`,
              `Afacere: ${b.company}`,
              `Domeniu de activitate: ${b.industry}`,
              `Contact: ${b.name} · ${b.email}`,
              ...(b.phone ? [`Telefon: ${b.phone}`] : []),
              ...(website ? [`Site actual: ${website}`] : []),
              `Limba solicitării: ${b.lang}`,
              "",
              "Obiectivele proiectului",
              b.objectives,
              "",
              `Referință: ${id}`,
              "AVYRON OS: https://app.avyron.ro/profil?tab=website-subscriptions",
            ].join("\n"),
          })
        : { delivered: false };
      const error = result.delivered
        ? null
        : recipient
          ? "website_request_email_failed"
          : "website_request_recipient_unconfigured";
      await c.env.DB.prepare(
        "UPDATE leads SET delivery_status=?,delivery_error=?,updated_at=? WHERE id=?",
      ).bind(result.delivered ? "sent" : "failed", error, Date.now(), lead).run();
      if (recipient) {
        await logDelivery(c.env, {
          kind: "website_subscription_request",
          entityId: id,
          recipient,
          result: { delivered: result.delivered, error: error ?? undefined },
        });
      }
    };
    const delivery = notify().catch(() => {
      console.error("website_request_email_audit_failed", { reference: id });
    });
    let execution: Ctx["executionCtx"] | undefined;
    try {
      execution = c.executionCtx;
    } catch {
      // Hono's local request helper can run without a Worker context.
    }
    if (execution) execution.waitUntil(delivery);
    else await delivery;
    return c.json({ ok: true, reference: id }, 201);
  },
);
websiteSubscriptionsRouter.get(
  "/api/website-subscriptions/internal/options",
  async (c) => {
    if (!(await owner(c))) return fail(c, "forbidden", 403);
    const [clients, accounts, staff, requests, plans] = await Promise.all([
      c.env.DB.prepare(
        "SELECT id,company_name,email FROM clients WHERE status='active' ORDER BY company_name LIMIT 1000",
      ).all(),
      c.env.DB.prepare(
        "SELECT id,email,display_name FROM users u WHERE disabled_at IS NULL AND email_verified=1 AND NOT EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin')) ORDER BY email LIMIT 1000",
      ).all(),
      c.env.DB.prepare(
        "SELECT DISTINCT u.id,coalesce(u.display_name,u.email) name FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.disabled_at IS NULL AND r.role IN('staff','admin') LIMIT 500",
      ).all(),
      c.env.DB.prepare(
        "SELECT wr.id,wr.lead_id,wr.plan_id,wr.project_id,l.name,l.email,l.config_json brief_json,l.delivery_status,wr.created_at FROM website_subscription_requests wr JOIN leads l ON l.id=wr.lead_id WHERE l.deleted_at IS NULL AND l.archived_at IS NULL ORDER BY wr.created_at DESC LIMIT 200",
      ).all(),
      websitePlans(c.env.DB),
    ]);
    return c.json({
      clients: clients.results,
      accounts: accounts.results,
      staff: staff.results,
      requests: requests.results,
      plans,
      canManage: true,
    });
  },
);
const configForm = z
  .object({
    revision: z.number().int().positive(),
    priceMinor: z.number().int().min(1).max(100000000).nullable(),
    currency: z.literal("RON"),
    vatBasisPoints: z.number().int().min(0).max(10000),
    taxVerified: z.boolean(),
    reviewed: z.boolean(),
    terms: z.string().max(16000),
    cancellation: z.string().max(3000),
    emailPolicy: z.string().min(20).max(2000),
    pages: z.string().min(1).max(80),
    changes: z.number().int().min(0).max(1000),
    buttons: z.number().int().min(0).max(20),
    emails: z.number().int().min(0).max(50),
    tagline: z.object({
      ro: z.string().min(3).max(500),
      en: z.string().min(3).max(500),
    }),
    features: z.object({
      ro: z.array(z.string().min(1).max(500)).min(1).max(20),
      en: z.array(z.string().min(1).max(500)).min(1).max(20),
    }),
  })
  .strict();
websiteSubscriptionsRouter.put(
  "/api/website-subscriptions/internal/plans/:id",
  async (c) => {
    if (!(await owner(c))) return fail(c, "forbidden", 403);
    const parsed = configForm.safeParse(await body(c));
    if (!parsed.success) return fail(c, "invalid_configuration");
    const b = parsed.data,
      p = (await websitePlans(c.env.DB)).find(
        (v) => v.id === c.req.param("id"),
      );
    if (!p) return fail(c, "not_found", 404);
    if (p.revision !== b.revision) return fail(c, "revision_conflict", 409);
    const next = { ...p, ...b, revision: p.revision + 1, available: false };
    if (b.reviewed) {
      if (!websitePlanReady(next))
        return fail(c, "configuration_required", 409);
      const identity = await checkStripeAccount(c.env);
      if (!identity.ok || !identity.chargesEnabled)
        return fail(c, "payment_account_unverified", 409);
    }
    const t = Date.now();
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          "INSERT INTO website_subscription_plan_versions(plan_id,revision,config_json,created_by,created_at) VALUES(?,?,?,?,?)",
        ).bind(p.id, next.revision, JSON.stringify(next), c.get("userId"), t),
        c.env.DB.prepare(
          "UPDATE website_subscription_plans SET current_revision=? WHERE id=? AND current_revision=?",
        ).bind(next.revision, p.id, p.revision),
        c.env.DB.prepare(
          "UPDATE commercial_catalog_codes SET base_price_minor=?,currency=?,vat_basis_points=?,tax_status=?,tax_verified_by=?,tax_verified_at=?,payment_route='stripe',preferred_payment_provider='stripe',payment_status=?,updated_by=?,updated_at=? WHERE id=(SELECT catalog_id FROM website_subscription_plans WHERE id=?)",
        ).bind(
          b.priceMinor,
          b.currency,
          b.vatBasisPoints,
          b.taxVerified ? "verified" : "unverified",
          b.taxVerified ? c.get("userId") : null,
          b.taxVerified ? t : null,
          b.reviewed ? "active" : "needs_configuration",
          c.get("userId"),
          t,
          p.id,
        ),
        audit(c, "website.plan.versioned", p.id),
      ]);
    } catch {
      return fail(c, "revision_conflict", 409);
    }
    return c.json({ ok: true });
  },
);
const allocateForm = z
  .object({
    key: z.string().uuid(),
    requestId: ident.nullable(),
    clientId: ident.nullable(),
    newClient: z
      .object({
        companyName: z.string().trim().min(2).max(180),
        email: z.string().email().max(254),
        contactName: z.string().trim().min(2).max(120),
        phone: z.string().max(40),
      })
      .nullable(),
    accountId: ident.nullable(),
    planId,
    name: z.string().trim().min(3).max(180),
    staffIds: z.array(ident).max(20),
    confirmed: z.literal(true),
  })
  .strict()
  .refine((v) => !!v.clientId !== !!v.newClient);
websiteSubscriptionsRouter.post(
  "/api/website-subscriptions/internal/allocate",
  async (c) => {
    if (!(await owner(c))) return fail(c, "forbidden", 403);
    const parsed = allocateForm.safeParse(await body(c));
    if (!parsed.success) return fail(c, "invalid_allocation");
    const b = parsed.data,
      t = Date.now(),
      hash = await sha256(JSON.stringify(b)),
      suffix = (await sha256("website-allocation:" + b.key)).slice(0, 24),
      id = "wsp_" + suffix,
      service = "wss_" + suffix,
      sub = "wsub_" + suffix;
    const prior = await c.env.DB.prepare(
      "SELECT project_id,allocation_hash FROM website_subscription_projects WHERE allocation_key=?",
    )
      .bind(b.key)
      .first<{ project_id: string; allocation_hash: string }>();
    if (prior)
      return prior.allocation_hash === hash
        ? c.json({ ok: true, projectId: prior.project_id, replay: true })
        : fail(c, "idempotency_conflict", 409);
    const plan = (await websitePlans(c.env.DB)).find((p) => p.id === b.planId);
    if (!plan) return fail(c, "invalid_plan");
    if (b.requestId) {
      const request = await c.env.DB.prepare(
        "SELECT project_id FROM website_subscription_requests WHERE id=?",
      )
        .bind(b.requestId)
        .first<{ project_id: string | null }>();
      if (!request) return fail(c, "not_found", 404);
      if (request.project_id) return fail(c, "already_allocated", 409);
    }
    const client = b.clientId || "wscl_" + suffix;
    if (
      b.clientId &&
      !(await c.env.DB.prepare(
        "SELECT 1 FROM clients WHERE id=? AND status='active'",
      )
        .bind(client)
        .first())
    )
      return fail(c, "invalid_client");
    if (
      b.accountId &&
      !(await c.env.DB.prepare(
        "SELECT 1 FROM users u WHERE id=? AND email_verified=1 AND disabled_at IS NULL AND NOT EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('admin','staff'))",
      )
        .bind(b.accountId)
        .first())
    )
      return fail(c, "invalid_account");
    for (const staff of b.staffIds)
      if (
        !(await c.env.DB.prepare(
          "SELECT 1 FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=? AND u.disabled_at IS NULL AND r.role IN('staff','admin')",
        )
          .bind(staff)
          .first())
      )
        return fail(c, "invalid_staff");
    const statements: D1PreparedStatement[] = [];
    if (b.newClient)
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO clients(id,company_name,contact_name,email,phone,status,created_at,access_managed) VALUES(?,?,?,?,?,'active',?,1)",
        ).bind(
          client,
          b.newClient.companyName,
          b.newClient.contactName,
          b.newClient.email,
          b.newClient.phone,
          t,
        ),
      );
    statements.push(
      c.env.DB.prepare("UPDATE clients SET access_managed=1 WHERE id=?").bind(
        client,
      ),
    );
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO projects(id,client_id,name,slug,status,kind,owner_user_id,banner_status,created_at) VALUES(?,?,?,?,'lead','website_prezentare',?,'proposed',?)",
      ).bind(
        id,
        client,
        b.name,
        "website-" + suffix.toLowerCase(),
        b.accountId,
        t,
      ),
    );
    if (b.accountId)
      statements.push(
        c.env.DB.prepare(
          "INSERT OR IGNORE INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES(?,?,?,?)",
        ).bind(client, b.accountId, c.get("userId"), t),
      );
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO services(id,project_id,service_name,price,billing_cycle,catalog_code_id) VALUES(?,?,?,?, 'monthly',?)",
      ).bind(
        service,
        id,
        `Website prin abonament — ${plan.name}`,
        (plan.priceMinor || 0) / 100,
        "website-sub-" + plan.id,
      ),
    );
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO subscriptions(id,client_id,service_id,next_billing_date,status,plan_sku,specifications_json,target_label,created_at,updated_at,allocation_key) VALUES(?,?,?,?,'paused',?,?,?,?,?,?)",
      ).bind(
        sub,
        client,
        service,
        t,
        plan.sku,
        JSON.stringify({
          pages: plan.pages,
          changes: String(plan.changes),
          email: plan.emailPolicy,
        }),
        b.name,
        t,
        t,
        "website:" + b.key,
      ),
    );
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO website_subscription_projects(project_id,plan_id,plan_revision,subscription_id,plan_snapshot_json,created_at,allocation_key,allocation_hash,request_id) VALUES(?,?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        plan.id,
        plan.revision,
        sub,
        JSON.stringify(plan),
        t,
        b.key,
        hash,
        b.requestId,
      ),
    );
    for (const staff of b.staffIds)
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO project_staff(project_id,user_id,role,assigned_at) VALUES(?,?,'contributor',?)",
        ).bind(id, staff, t),
      );
    for (const task of WEBSITE_WORKFLOW)
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO project_work_items(id,project_id,kind,title,status,created_by,created_at,updated_at) VALUES(?,?,'onboarding',?,'open',?,?,?)",
        ).bind(crypto.randomUUID(), id, task, c.get("userId"), t, t),
      );
    if (b.requestId)
      statements.push(
        c.env.DB.prepare(
          "UPDATE website_subscription_requests SET project_id=? WHERE id=? AND project_id IS NULL",
        ).bind(id, b.requestId),
        c.env.DB.prepare(
          "UPDATE leads SET converted_project_id=?,status='won',lifecycle_stage='accepted' WHERE id=(SELECT lead_id FROM website_subscription_requests WHERE id=?)",
        ).bind(id, b.requestId),
      );
    statements.push(audit(c, "website.project.allocated", id));
    try {
      await c.env.DB.batch(statements);
    } catch {
      const replay = await c.env.DB.prepare(
        "SELECT project_id,allocation_hash FROM website_subscription_projects WHERE allocation_key=?",
      )
        .bind(b.key)
        .first<{ project_id: string; allocation_hash: string }>();
      if (replay?.allocation_hash === hash)
        return c.json({ ok: true, projectId: replay.project_id, replay: true });
      return fail(c, "allocation_conflict", 409);
    }
    return c.json({ ok: true, projectId: id }, 201);
  },
);
const projectSelect = `SELECT w.*,p.name,p.client_id,p.owner_user_id,p.domain,p.status,p.banner_status,cl.company_name,s.status subscription_status,
 (SELECT count(*) FROM website_subscription_periods per WHERE per.project_id=p.id) paid_months,
 (SELECT json_object('id',per.id,'starts_at',per.starts_at,'ends_at',per.ends_at,'change_limit',per.change_limit,'used',coalesce((SELECT sum(units) FROM website_subscription_consumption WHERE period_id=per.id),0)) FROM website_subscription_periods per WHERE per.project_id=p.id AND per.starts_at<=? AND per.ends_at>? ORDER BY per.starts_at DESC LIMIT 1) period_json
 FROM website_subscription_projects w JOIN projects p ON p.id=w.project_id JOIN clients cl ON cl.id=p.client_id JOIN subscriptions s ON s.id=w.subscription_id AND s.client_id=p.client_id`;
type StoredProject = Omit<WebsiteSubscriptionProject, "checkoutAvailableAt"> & {
  period_json: string | null;
};
function presentation(
  row: StoredProject,
  c: Ctx,
  principal: boolean,
  write: boolean,
) {
  const client = !c.get("roles").some((r) => r === "staff" || r === "admin");
  const { period_json, ...safe } = row;
  for (const key of [
    "allocation_key",
    "allocation_hash",
    "checkout_claim",
    "revision_claim",
    "approval_claim",
    "reconciled_at",
    "reconcile_cursor",
  ])
    Reflect.deleteProperty(safe, key);
  const plan = JSON.parse(row.plan_snapshot_json) as WebsitePlan;
  if (client && !plan.available) {
    plan.terms = "";
    plan.cancellation = "";
    plan.priceMinor = null;
    safe.plan_snapshot_json = JSON.stringify(plan);
  }
  return {
    ...safe,
    plan,
    checkoutAvailableAt: row.approved_at && row.approved_revision === row.content_revision
      ? row.approved_at + WEBSITE_FIRST_PAYMENT_DELAY_MS
      : null,
    period: period_json
      ? (JSON.parse(period_json) as WebsiteSubscriptionProject["period"])
      : null,
    canManage: principal,
    canWork: write,
    canSubscribe: client && row.owner_user_id === c.get("userId"),
    clientApproval: client,
  };
}
export async function websiteProject(c: Ctx, id: string) {
  const acl = (
    await projectAccessMap(c.env.DB, [id], c.get("userId"), c.get("roles"))
  ).get(id);
  if (!acl?.read) return null;
  const row = await c.env.DB.prepare(projectSelect + " WHERE w.project_id=?")
    .bind(Date.now(), Date.now(), id)
    .first<StoredProject>();
  return row ? presentation(row, c, !!(await owner(c)), acl.write) : null;
}
websiteSubscriptionsRouter.get(
  "/api/website-subscriptions/account/projects",
  async (c) => {
    const principal = !!(await owner(c)),
      q = (c.req.query("q") || "").slice(0, 120),
      plan = c.req.query("plan") || "";
    if (plan && !planId.safeParse(plan).success) return fail(c, "invalid_plan");
    const { results } = await c.env.DB.prepare(
      projectSelect +
        ` WHERE (?=1 OR p.owner_user_id=? OR EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=p.client_id AND ca.user_id=?) OR EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=p.id AND ps.user_id=?)) AND (?='' OR w.plan_id=?) AND (?='' OR lower(p.name||' '||cl.company_name||' '||coalesce(p.domain,'')) LIKE ?) ORDER BY w.created_at DESC,p.id LIMIT 200`,
    )
      .bind(
        Date.now(),
        Date.now(),
        principal ? 1 : 0,
        c.get("userId"),
        c.get("userId"),
        c.get("userId"),
        plan,
        plan,
        q,
        "%" + q.toLowerCase() + "%",
      )
      .all<StoredProject>();
    const access = await projectAccessMap(
      c.env.DB,
      results.map((r) => r.project_id),
      c.get("userId"),
      c.get("roles"),
    );
    return c.json({
      data: results
        .filter((r) => access.get(r.project_id)?.read)
        .map((r) =>
          presentation(r, c, principal, !!access.get(r.project_id)?.write),
        ),
      canManage: principal,
      truncated: results.length === 200,
    });
  },
);
websiteSubscriptionsRouter.get(
  "/api/website-subscriptions/account/projects/:id",
  async (c) => {
    const p = await websiteProject(c, c.req.param("id"));
    if (!p) return fail(c, "not_found", 404);
    const [changes, work, links, activity, statistics] = await Promise.all([
      c.env.DB.prepare(
        "SELECT pr.*,ch.kind,ch.units,ch.reviewed_by,ch.period_id FROM website_subscription_changes ch JOIN project_proposals pr ON pr.id=ch.proposal_id WHERE ch.project_id=? ORDER BY pr.created_at DESC LIMIT 200",
      )
        .bind(p.project_id)
        .all(),
      c.env.DB.prepare(
        "SELECT id,title,status,due_at,assignee_id FROM project_work_items WHERE project_id=? ORDER BY created_at,id LIMIT 100",
      )
        .bind(p.project_id)
        .all(),
      c.env.DB.prepare(
        "SELECT kind,label,url FROM project_links WHERE project_id=? LIMIT 30",
      )
        .bind(p.project_id)
        .all(),
      c.env.DB.prepare(
        "SELECT id,title,body description,created_at FROM project_updates WHERE project_id=? ORDER BY created_at DESC LIMIT 50",
      )
        .bind(p.project_id)
        .all(),
      c.env.DB.prepare(
        "SELECT period_start,period_end,visits,unique_visitors,uptime_percent,avg_response_ms,source,created_at FROM project_statistics WHERE project_id=? ORDER BY period_end DESC LIMIT 12",
      )
        .bind(p.project_id)
        .all(),
    ]);
    return c.json({
      data: p,
      statistics: statistics.results,
      changes: changes.results,
      work: work.results,
      links: links.results.flatMap((l) => {
        const url = normalizeExternalLink(String(l.url || ""));
        return url ? [{ ...l, url }] : [];
      }),
      activity: activity.results,
    });
  },
);
const changeForm = z
  .object({
    key: z.string().uuid(),
    title: z.string().trim().min(3).max(180),
    description: z.string().trim().min(5).max(3000),
    kind: z.enum(["content", "bug", "security"]),
  })
  .strict();
websiteSubscriptionsRouter.post(
  "/api/website-subscriptions/account/projects/:id/changes",
  async (c) => {
    const p = await websiteProject(c, c.req.param("id"));
    if (!p) return fail(c, "not_found", 404);
    const parsed = changeForm.safeParse(await body(c));
    if (!parsed.success) return fail(c, "invalid_change");
    const b = parsed.data;
    const limit = await checkRateLimit(c.env.DB, [
      { key: `website-changes:${c.get("userId")}`, limit: 20, windowSec: 3600 },
    ]);
    if (!limit.ok) return fail(c, "rate_limited", 429);
    const id =
        "wsch_" +
        (await sha256(p.project_id + ":" + c.get("userId") + ":" + b.key)),
      t = Date.now();
    const submittedHash = await sha256(
      JSON.stringify({
        title: b.title,
        description: b.description,
        kind: b.kind,
      }),
    );
    const previous = await c.env.DB.prepare(
      "SELECT submission_hash FROM website_subscription_changes WHERE proposal_id=?",
    )
      .bind(id)
      .first<{ submission_hash: string | null }>();
    if (previous)
      return previous.submission_hash === submittedHash
        ? c.json({ ok: true, replay: true })
        : fail(c, "idempotency_conflict", 409);
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO project_proposals(id,project_id,author_id,title,description,status,created_at,updated_at) VALUES(?,?,?,?,?,'proposed',?,?)",
      ).bind(id, p.project_id, c.get("userId"), b.title, b.description, t, t),
      c.env.DB.prepare(
        "UPDATE website_subscription_changes SET kind=?,period_id=?,submission_hash=? WHERE proposal_id=? AND submission_hash IS NULL",
      ).bind(b.kind, p.period?.id || null, submittedHash, id),
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user','website.change.requested','website_subscription',?,'allowed','info','{}',?)",
      ).bind("website-change:" + id, c.get("userId"), id, t),
    ]);
    const stored = await c.env.DB.prepare(
      "SELECT submission_hash FROM website_subscription_changes WHERE proposal_id=?",
    )
      .bind(id)
      .first<{ submission_hash: string | null }>();
    if (stored?.submission_hash !== submittedHash)
      return fail(c, "idempotency_conflict", 409);
    return c.json({ ok: true }, 201);
  },
);
websiteSubscriptionsRouter.patch(
  "/api/website-subscriptions/account/changes/:id",
  async (c) => {
    const ch = await c.env.DB.prepare(
      "SELECT project_id FROM website_subscription_changes WHERE proposal_id=?",
    )
      .bind(c.req.param("id"))
      .first<{ project_id: string }>();
    if (!ch) return fail(c, "not_found", 404);
    const p = await websiteProject(c, ch.project_id);
    if (!p?.canWork) return fail(c, "not_found", 404);
    const parsed = z
      .object({
        kind: z.enum(["content", "bug", "security"]),
        units: z.number().int().min(1).max(20),
        status: z.enum(["reviewed", "in_progress", "done", "rejected"]),
      })
      .strict()
      .safeParse(await body(c));
    if (!parsed.success) return fail(c, "invalid_change");
    const b = parsed.data;
    if (
      await c.env.DB.prepare(
        "SELECT 1 FROM website_subscription_consumption WHERE proposal_id=?",
      )
        .bind(c.req.param("id"))
        .first()
    )
      return fail(c, "immutable_consumption", 409);
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          "UPDATE website_subscription_changes SET kind=?,units=?,reviewed_by=?,period_id=? WHERE proposal_id=?",
        ).bind(
          b.kind,
          b.units,
          c.get("userId"),
          p.period?.id || null,
          c.req.param("id"),
        ),
        c.env.DB.prepare(
          "UPDATE project_proposals SET status=?,updated_at=? WHERE id=?",
        ).bind(b.status, Date.now(), c.req.param("id")),
        audit(c, "website.change.reviewed", c.req.param("id")),
      ]);
    } catch {
      return fail(c, "quota_or_review_conflict", 409);
    }
    return c.json({ ok: true });
  },
);
websiteSubscriptionsRouter.post(
  "/api/website-subscriptions/account/projects/:id/checkout",
  async (c) => {
    const p = await websiteProject(c, c.req.param("id"));
    if (!p?.canSubscribe) return fail(c, "not_found", 404);
    const parsed = z
      .object({
        revision: z.number().int().positive(),
        accepted: z.literal(true),
        provider: z.literal("stripe"),
      })
      .strict()
      .safeParse(await body(c));
    if (!parsed.success) return fail(c, "explicit_terms_required");
    // Preconfigured projects may receive an approved version only through a fresh,
    // explicit allocation; existing accepted agreements are never silently rewritten.
    if (parsed.data.revision !== p.plan_revision)
      return fail(c, "revision_conflict", 409);
    if (!websitePlanReady(p.plan) || !p.plan.available)
      return fail(c, "configuration_required", 409);
    const billingProfile = await c.env.DB.prepare(
      "SELECT client_id,entity_type,legal_name,tax_id,billing_address,invoice_email FROM subscription_billing_settings WHERE subscription_id=? AND client_id=?",
    )
      .bind(p.subscription_id, p.client_id)
      .first<{
        client_id: string;
        entity_type: string;
        legal_name: string;
        tax_id: string | null;
        billing_address: string;
        invoice_email: string;
      }>();
    if (
      !billingProfile?.legal_name ||
      !billingProfile.billing_address ||
      !billingProfile.invoice_email
    )
      return fail(c, "billing_details_required", 409);
    const buyer = {
      name: billingProfile.legal_name,
      email: billingProfile.invoice_email,
      taxId: billingProfile.tax_id,
      address: billingProfile.billing_address,
      entityType: billingProfile.entity_type,
      clientId: p.client_id,
    };
    if (p.provider_subscription_id)
      return fail(c, "subscription_already_started", 409);
    let order = p.current_order_id;
    const t = Date.now();
    if (!order) {
      if (!p.checkoutAvailableAt || t < p.checkoutAvailableAt)
        return fail(c, "first_payment_pending", 409);
      order = crypto.randomUUID();
      const item = {
        sku: p.plan.sku,
        type: "subscription",
        name: `Website prin abonament — ${p.plan.name}`,
        period: "monthly",
        quantity: 1,
        unitPriceCents: p.plan.priceMinor,
        lineTotalCents: p.plan.priceMinor,
        serviceKey: "website-subscription",
        accountingCode: p.plan.sku,
        unitLabel: "lună",
        vatBasisPoints: p.plan.vatBasisPoints,
        invoiceProvider: p.plan.invoiceProvider,
      };
      try {
        await c.env.DB.batch([
          c.env.DB.prepare(
            "INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,discount_percent,discount_base_cents,discount_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES(?,?,?,?,0,0,0,?,?,0,'requested',?,?)",
          ).bind(
            order,
            c.get("userId"),
            JSON.stringify([item]),
            p.plan.priceMinor,
            p.plan.priceMinor,
            p.plan.currency,
            t,
            t,
          ),
          c.env.DB.prepare(
            "INSERT INTO website_subscription_acceptances(order_id,project_id,user_id,plan_id,plan_revision,terms_hash,terms_snapshot_json,accepted_at,buyer_snapshot_json) VALUES(?,?,?,?,?,?,?,?,?)",
          ).bind(
            order,
            p.project_id,
            c.get("userId"),
            p.plan_id,
            p.plan_revision,
            await sha256(JSON.stringify(p.plan)),
            JSON.stringify(p.plan),
            t,
            JSON.stringify(buyer),
          ),
          c.env.DB.prepare(
            "INSERT INTO website_subscription_orders(order_id,project_id,acceptance_order_id) VALUES(?,?,?)",
          ).bind(order, p.project_id, order),
          c.env.DB.prepare(
            "UPDATE website_subscription_projects SET current_order_id=?,checkout_claim=CASE WHEN current_order_id IS NULL AND provider_subscription_id IS NULL AND plan_revision=? AND approved_revision=content_revision AND approved_at<=? THEN ? ELSE NULL END WHERE project_id=?",
          ).bind(order, p.plan_revision, t - WEBSITE_FIRST_PAYMENT_DELAY_MS, order, p.project_id),
          audit(c, "website.terms.accepted", p.project_id),
        ]);
      } catch {
        return fail(c, "checkout_conflict", 409);
      }
    }
    const result = await createCheckoutForOrder(c, {
      orderId: order,
      provider: "stripe",
    });
    return c.json(result.body, result.status);
  },
);
websiteSubscriptionsRouter.post(
  "/api/website-subscriptions/account/projects/:id/approve",
  async (c) => {
    const p = await websiteProject(c, c.req.param("id"));
    if (!p?.clientApproval) return fail(c, "not_found", 404);
    const parsed = z
      .object({
        revision: z.number().int().positive(),
        confirmed: z.literal(true),
      })
      .strict()
      .safeParse(await body(c));
    if (!parsed.success) return fail(c, "explicit_approval_required");
    if (p.banner_status !== "testing") return fail(c, "review_not_ready", 409);
    if (parsed.data.revision !== p.content_revision)
      return fail(c, "revision_conflict", 409);
    if (p.approved_revision === p.content_revision)
      return c.json({ ok: true, replay: true });
    const approvedAt = Date.now();
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          "UPDATE website_subscription_projects SET approved_revision=?,approved_by=CASE WHEN approved_revision=content_revision THEN approved_by ELSE ? END,approved_at=CASE WHEN approved_revision=content_revision AND approved_at IS NOT NULL THEN approved_at ELSE ? END,approval_claim=CASE WHEN content_revision=? AND EXISTS(SELECT 1 FROM projects WHERE id=project_id AND banner_status='testing') THEN ? ELSE NULL END WHERE project_id=?",
        ).bind(
          p.content_revision,
          c.get("userId"),
          approvedAt,
          p.content_revision,
          p.content_revision,
          p.project_id,
        ),
        audit(c, "website.client.approved", p.project_id),
      ]);
    } catch {
      return fail(c, "revision_conflict", 409);
    }
    return c.json({ ok: true });
  },
);
websiteSubscriptionsRouter.post(
  "/api/website-subscriptions/account/projects/:id/transition",
  async (c) => {
    const p = await websiteProject(c, c.req.param("id"));
    if (!p?.clientApproval) return fail(c, "not_found", 404);
    if (p.paid_months < 12) return fail(c, "twelve_paid_periods_required", 409);
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE website_subscription_projects SET transition_requested_at=coalesce(transition_requested_at,?) WHERE project_id=?",
      ).bind(Date.now(), p.project_id),
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO project_updates(id,project_id,title,body,author_id,created_at) VALUES(?,?,'Solicitare · Mentenanță standard','Clientul solicită evaluarea trecerii la mentenanță standard. Abonamentul actual nu este modificat automat.',?,?)",
      ).bind(
        "website-transition-request-" + p.project_id,
        p.project_id,
        c.get("userId"),
        Date.now(),
      ),
      audit(c, "website.maintenance.transition_requested", p.project_id),
    ]);
    return c.json({ ok: true });
  },
);
websiteSubscriptionsRouter.patch(
  "/api/website-subscriptions/internal/projects/:id",
  async (c) => {
    const p = await websiteProject(c, c.req.param("id"));
    if (!p?.canWork) return fail(c, "not_found", 404);
    const b = z
      .object({
        revision: z.number().int().positive(),
        stage: z.enum([
          "lead",
          "in_progress",
          "testing",
          "live",
          "maintenance",
        ]),
        domain: z.string().trim().max(253).default(""),
        update: z.string().trim().max(2000),
      })
      .strict()
      .safeParse(await body(c));
    if (!b.success) return fail(c, "invalid_project");
    if (b.data.revision !== p.revision)
      return fail(c, "revision_conflict", 409);
    if (
      b.data.domain &&
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
        b.data.domain,
      )
    )
      return fail(c, "invalid_domain");
    if (
      ["live", "maintenance"].includes(b.data.stage) &&
      p.approved_revision !== p.content_revision
    )
      return fail(c, "client_approval_required", 409);
    const status = b.data.stage === "testing" ? "in_progress" : b.data.stage,
      banner =
        b.data.stage === "testing"
          ? "testing"
          : ["live", "maintenance"].includes(status)
            ? "online"
            : "in_progress";
    const t = Date.now();
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          "UPDATE website_subscription_projects SET revision=revision+1,revision_claim=CASE WHEN revision=? THEN ? ELSE NULL END,content_revision=content_revision+?,approved_revision=CASE WHEN ?=1 THEN NULL ELSE approved_revision END,approved_by=CASE WHEN ?=1 THEN NULL ELSE approved_by END,approved_at=CASE WHEN ?=1 THEN NULL ELSE approved_at END WHERE project_id=?",
        ).bind(
          p.revision,
          p.revision + 1,
          ...Array(4).fill(
            p.banner_status === "testing" && b.data.stage === "testing" ? 1 : 0,
          ),
          p.project_id,
        ),
        c.env.DB.prepare(
          "UPDATE projects SET status=?,banner_status=?,domain=? WHERE id=?",
        ).bind(status, banner, b.data.domain || null, p.project_id),
        c.env.DB.prepare(
          "INSERT INTO project_updates(id,project_id,title,body,author_id,created_at) VALUES(?,?,?,?,?,?)",
        ).bind(
          crypto.randomUUID(),
          p.project_id,
          "Website prin abonament · " + b.data.stage,
          b.data.update || "Etapa proiectului a fost actualizată.",
          c.get("userId"),
          t,
        ),
        audit(c, "website.project.stage", p.project_id),
      ]);
    } catch {
      return fail(c, "revision_conflict", 409);
    }
    return c.json({ ok: true });
  },
);

websiteSubscriptionsRouter.post(
  "/api/website-subscriptions/internal/projects/:id/plan",
  async (c) => {
    if (!(await owner(c))) return fail(c, "forbidden", 403);
    const p = await websiteProject(c, c.req.param("id"));
    if (!p) return fail(c, "not_found", 404);
    const b = z
      .object({
        revision: z.number().int().positive(),
        planId,
        confirmed: z.literal(true),
      })
      .strict()
      .safeParse(await body(c));
    if (!b.success) return fail(c, "invalid_plan");
    if (p.current_order_id || p.provider_subscription_id)
      return fail(c, "accepted_plan_immutable", 409);
    if (p.revision !== b.data.revision)
      return fail(c, "revision_conflict", 409);
    const plan = (await websitePlans(c.env.DB)).find(
      (v) => v.id === b.data.planId,
    );
    if (!plan) return fail(c, "invalid_plan");
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE website_subscription_projects SET plan_id=?,plan_revision=?,plan_snapshot_json=?,revision=revision+1,revision_claim=CASE WHEN revision=? AND current_order_id IS NULL THEN revision+1 ELSE NULL END WHERE project_id=?",
      ).bind(
        plan.id,
        plan.revision,
        JSON.stringify(plan),
        p.revision,
        p.project_id,
      ),
      c.env.DB.prepare(
        "UPDATE services SET service_name=?,price=?,catalog_code_id=? WHERE id=(SELECT service_id FROM subscriptions WHERE id=?)",
      ).bind(
        "Website prin abonament — " + plan.name,
        (plan.priceMinor || 0) / 100,
        "website-sub-" + plan.id,
        p.subscription_id,
      ),
      c.env.DB.prepare(
        "UPDATE subscriptions SET plan_sku=?,specifications_json=?,updated_at=? WHERE id=?",
      ).bind(
        plan.sku,
        JSON.stringify({
          pages: plan.pages,
          changes: String(plan.changes),
          email: plan.emailPolicy,
        }),
        Date.now(),
        p.subscription_id,
      ),
      audit(c, "website.plan.refreshed_before_acceptance", p.project_id),
    ]);
    return c.json({ ok: true });
  },
);

const legalBilling = z
  .object({
    entityType: z.enum(["individual", "company", "pfa", "ngo", "other"]),
    legalName: z.string().trim().min(2).max(180),
    taxId: z.string().trim().max(80),
    address: z.string().trim().min(5).max(600),
    invoiceEmail: z.string().trim().email().max(254),
    paymentTermsDays: z.number().int().min(0).max(90),
  })
  .strict()
  .refine(
    (b) => !["company", "pfa"].includes(b.entityType) || b.taxId.length >= 2,
  );
websiteSubscriptionsRouter.get(
  "/api/website-subscriptions/account/projects/:id/billing",
  async (c) => {
    const p = await websiteProject(c, c.req.param("id"));
    if (!p || (!p.canSubscribe && !p.canManage))
      return fail(c, "not_found", 404);
    const saved = await c.env.DB.prepare(
      "SELECT entity_type entityType,legal_name legalName,coalesce(tax_id,'') taxId,billing_address address,invoice_email invoiceEmail,payment_terms_days paymentTermsDays FROM subscription_billing_settings WHERE subscription_id=? AND client_id=?",
    )
      .bind(p.subscription_id, p.client_id)
      .first();
    const legal = await c.env.DB.prepare(
      "SELECT entity_type,legal_name,tax_id,address FROM client_legal_profiles WHERE client_id=?",
    )
      .bind(p.client_id)
      .first<{
        entity_type: string;
        legal_name: string;
        tax_id: string;
        address: string;
      }>();
    const contact = await c.env.DB.prepare(
      "SELECT email FROM clients WHERE id=?",
    )
      .bind(p.client_id)
      .first<{ email: string }>();
    return c.json({
      data: saved || {
        entityType:
          legal?.entity_type === "individual"
            ? "individual"
            : legal?.entity_type === "pfa"
              ? "pfa"
              : legal?.entity_type === "ngo"
                ? "ngo"
                : "company",
        legalName: legal?.legal_name || p.company_name,
        taxId: legal?.tax_id || "",
        address: legal?.address || "",
        invoiceEmail: contact?.email || "",
        paymentTermsDays: 0,
      },
      locked: !!p.current_order_id,
    });
  },
);
websiteSubscriptionsRouter.put(
  "/api/website-subscriptions/account/projects/:id/billing",
  async (c) => {
    const p = await websiteProject(c, c.req.param("id"));
    if (!p || (!p.canSubscribe && !p.canManage))
      return fail(c, "not_found", 404);
    if (p.current_order_id)
      return fail(c, "accepted_billing_identity_immutable", 409);
    const b = legalBilling.safeParse(await body(c));
    if (!b.success) return fail(c, "invalid_billing_details");
    const legal = await c.env.DB.prepare(
      "SELECT tax_id FROM client_legal_profiles WHERE client_id=?",
    )
      .bind(p.client_id)
      .first<{ tax_id: string | null }>();
    if (
      legal?.tax_id &&
      legal.tax_id.replace(/\s/g, "").toUpperCase() !==
        b.data.taxId.replace(/\s/g, "").toUpperCase()
    )
      return fail(c, "legal_identity_mismatch", 409);
    const now = Date.now();
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO subscription_billing_settings(subscription_id,client_id,entity_type,legal_name,tax_id,billing_address,invoice_email,payment_terms_days,anchor_day,start_date,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(subscription_id) DO UPDATE SET entity_type=excluded.entity_type,legal_name=excluded.legal_name,tax_id=excluded.tax_id,billing_address=excluded.billing_address,invoice_email=excluded.invoice_email,payment_terms_days=excluded.payment_terms_days,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
      ).bind(
        p.subscription_id,
        p.client_id,
        b.data.entityType,
        b.data.legalName,
        b.data.taxId || null,
        b.data.address,
        b.data.invoiceEmail,
        b.data.paymentTermsDays,
        new Date(now).getUTCDate(),
        now,
        c.get("userId"),
        now,
      ),
      audit(c, "website.billing.identity_saved", p.project_id),
    ]);
    return c.json({ ok: true });
  },
);
websiteSubscriptionsRouter.post(
  "/api/website-subscriptions/internal/projects/:id/account",
  async (c) => {
    if (!(await owner(c))) return fail(c, "forbidden", 403);
    const p = await websiteProject(c, c.req.param("id"));
    if (!p) return fail(c, "not_found", 404);
    const b = z
      .object({
        accountId: ident,
        revision: z.number().int().positive(),
        confirmed: z.literal(true),
      })
      .strict()
      .safeParse(await body(c));
    if (!b.success) return fail(c, "invalid_account");
    if (p.current_order_id || p.provider_subscription_id)
      return fail(c, "accepted_billing_identity_immutable", 409);
    if (
      !(await c.env.DB.prepare(
        "SELECT 1 FROM users u WHERE id=? AND disabled_at IS NULL AND email_verified=1 AND NOT EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))",
      )
        .bind(b.data.accountId)
        .first())
    )
      return fail(c, "invalid_account");
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          "UPDATE website_subscription_projects SET revision=revision+1,revision_claim=CASE WHEN revision=? AND current_order_id IS NULL THEN revision+1 ELSE NULL END WHERE project_id=?",
        ).bind(b.data.revision, p.project_id),
        c.env.DB.prepare(
          "INSERT OR IGNORE INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES(?,?,?,?)",
        ).bind(p.client_id, b.data.accountId, c.get("userId"), Date.now()),
        c.env.DB.prepare("UPDATE projects SET owner_user_id=? WHERE id=?").bind(
          b.data.accountId,
          p.project_id,
        ),
        c.env.DB.prepare(
          "INSERT INTO project_updates(id,project_id,title,body,author_id,created_at) VALUES(?,?,'Cont client asociat','Proiectul și serviciul Website prin abonament sunt disponibile în contul autorizat. Echipa confirmă separat tariful, termenii și pașii de livrare.',?,?)",
        ).bind(crypto.randomUUID(), p.project_id, c.get("userId"), Date.now()),
        audit(c, "website.account.allocated", p.project_id),
      ]);
    } catch {
      return fail(c, "revision_conflict", 409);
    }
    return c.json({ ok: true });
  },
);
