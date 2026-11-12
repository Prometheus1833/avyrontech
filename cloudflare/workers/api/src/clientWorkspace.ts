import {projectSummaryColumns} from "./projectSummary";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import {
  hasCapability,
  platformRoleForUser,
  isReservedPlatformEmail,
} from "./authorization";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { readJsonBodyUpTo } from "./requestBody";
import { sha256 } from "./security";
import {
  accountIdentitySchema,
  provisionAccountPlan,
} from "./accountProvisioning";
import { STAFF_OPERATIONAL_EMAIL } from "./staffAccessPolicy";
import { CLIENT_ENTITY_TYPES } from "../../../../src/shared/clientWorkspace";
import { normalizeExternalLink } from "../../../../src/shared/externalUrl";
type Ctx = Context<AppBindings>;
export const clientWorkspaceRouter = new Hono<AppBindings>();
const root = "/api/admin/operations/clients",
  ident = z.string().min(1).max(160);
export const clientIdentitySchema = z
  .object({
    companyName: z.string().trim().min(1).max(180),
    contactName: z.string().trim().max(180),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    phone: z.string().trim().max(40),
    status: z.enum(["active", "paused", "archived"]),
    entityType: z.enum(CLIENT_ENTITY_TYPES),
    legalName: z.string().trim().min(1).max(180),
    taxId: z.string().trim().max(80),
    registrationNumber: z.string().trim().max(100),
    address: z.string().trim().max(600),
    representative: z.string().trim().max(180),
    notes: z.string().trim().max(2000),
  })
  .strict();
const accountChoice = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }).strict(),
  z
    .object({
      mode: z.literal("existing"),
      accountId: ident,
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      mode: z.literal("new"),
      identity: accountIdentitySchema,
      confirmed: z.literal(true),
    })
    .strict(),
]);
const createSchema = z
  .object({ identity: clientIdentitySchema, account: accountChoice })
  .strict();
const editSchema = z
  .object({
    identity: clientIdentitySchema,
    revision: z.number().int().positive(),
  })
  .strict();
const fail = (
  c: Ctx,
  code: string,
  status: 400 | 403 | 404 | 409 | 413 = 400,
  message = "Verifică datele și reîncearcă.",
) => c.json({ error: { code, message } }, status);
const event = (c: Ctx, action: string, id: string, metadata: unknown = {}) =>
  c.env.DB.prepare(
    "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,request_id,metadata_json,created_at) VALUES(?,?,'user',?,'client',?,'allowed','info',?,?,?)",
  ).bind(
    crypto.randomUUID(),
    c.get("userId"),
    action,
    id,
    c.get("requestId") || null,
    JSON.stringify(metadata),
    Date.now(),
  );
const clientWebsiteSelect = `(SELECT json_group_array(json_object('name', link.name, 'url', link.url))
  FROM (SELECT p.name, trim(p.url) AS url FROM projects p
    WHERE p.client_id=c.id AND p.status <> 'archived' AND lower(trim(p.url)) LIKE 'https://%'
    ORDER BY CASE WHEN p.status IN ('live','maintenance') THEN 0 ELSE 1 END,
      coalesce(p.updated_at,p.created_at) DESC,p.id LIMIT 5) AS link) website_candidates`;
function recordedWebsite(raw: string) {
  const candidates = JSON.parse(raw) as { name: string; url: string }[];
  for (const candidate of candidates) {
    const safe = normalizeExternalLink(candidate.url);
    if (!safe) continue;
    const url = new URL(safe);
    // A registry link is for visiting the site, never for sharing preview or access tokens.
    url.search = "";
    url.hash = "";
    return { name: candidate.name || url.hostname, url: url.href };
  }
  return null;
}
const clientFields = `c.*,l.entity_type,l.legal_name,l.tax_id,l.registration_number,l.address,l.representative,
(SELECT count(*) FROM projects p WHERE p.client_id=c.id) project_count,
(SELECT count(*) FROM subscriptions s WHERE s.client_id=c.id AND s.status='active') active_subscription_count,
(SELECT count(*) FROM client_account_access g WHERE g.client_id=c.id) account_count`;
const clientFrom = " FROM clients c LEFT JOIN client_legal_profiles l ON l.client_id=c.id";
const clientSelect = `SELECT ${clientFields}${clientFrom}`;
const accountSelect = `SELECT u.id,u.email,u.username,coalesce(p.display_name,u.display_name) display_name,p.company_name,u.email_verified,u.disabled_at,u.must_change_password,u.last_login_at FROM users u LEFT JOIN profiles p ON p.id=u.id`;
const eligibleAccount = `u.disabled_at IS NULL AND u.email_verified=1 AND NOT EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin')) AND NOT EXISTS(SELECT 1 FROM platform_principals pp WHERE pp.email=u.email COLLATE NOCASE) AND lower(u.email)<>'${STAFF_OPERATIONAL_EMAIL}' AND NOT EXISTS(SELECT 1 FROM agent_operator_bindings ab WHERE ab.user_id=u.id AND ab.status='active')`;
// Never-assigned projects may keep internal stage/staff history. Existing beneficiary history is never transferred silently.
const blankProject = `p.organization_id IS NULL AND p.owner_user_id IS NULL AND NOT EXISTS(SELECT 1 FROM leads history WHERE history.converted_project_id=p.id)
AND NOT EXISTS(SELECT 1 FROM project_staff history WHERE history.project_id=p.id AND p.client_id IS NOT NULL)
AND NOT EXISTS(SELECT 1 FROM project_logs history WHERE history.project_id=p.id AND p.client_id IS NOT NULL) ${["staff_chat_messages", "visual_assets", "services", "project_media", "project_links", "project_proposals", "project_updates", "project_work_items", "project_statistics", "website_content", "financial_revenues", "support_tickets", "financial_expense_allocations", "financial_budgets", "financial_usage_events", "os_center_records", "surveys", "financial_expenses", "operation_records", "hub_documents", "document_assignments"].map((table) => `AND NOT EXISTS(SELECT 1 FROM ${table} history WHERE history.project_id=p.id)`).join(" ")}`;
async function principal(c: Ctx) {
  return !!(await platformRoleForUser(c.env.DB, c.get("userId")));
}
async function read(c: Ctx) {
  const b = await readJsonBodyUpTo(c.req.raw, 64 * 1024);
  return b.ok ? b.value : null;
}
async function actorCapabilities(c: Ctx) {
  const full = await principal(c);
  return {
    edit:
      full || (await hasCapability(c.env.DB, c.get("userId"), "clients.write")),
    manageAccounts: full,
    manageProjects: full,
    manageSubscriptions: full,
    finance:
      full || (await hasCapability(c.env.DB, c.get("userId"), "finance.read")),
    documents:
      full ||
      (await hasCapability(c.env.DB, c.get("userId"), "documents.read")),
  };
}
async function requireClient(c: Ctx, id: string) {
  return c.env.DB.prepare(clientSelect + " WHERE c.id=?")
    .bind(id)
    .first<Record<string, unknown>>();
}
async function eligible(c: Ctx, id: string) {
  return !!(await c.env.DB.prepare(
    `SELECT 1 FROM users u WHERE u.id=? AND ${eligibleAccount}`,
  )
    .bind(id)
    .first());
}
function accountGuard(c: Ctx, id: string, userId: string) {
  return c.env.DB.prepare(
    `UPDATE clients SET revision=CASE WHEN EXISTS(SELECT 1 FROM users u WHERE u.id=? AND ${eligibleAccount}) THEN revision ELSE NULL END WHERE id=?`,
  ).bind(userId, id);
}
function legalPlan(
  c: Ctx,
  id: string,
  b: z.infer<typeof clientIdentitySchema>,
) {
  return c.env.DB.prepare(
    `INSERT INTO client_legal_profiles(client_id,entity_type,legal_name,tax_id,registration_number,address,representative,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(client_id) DO UPDATE SET entity_type=excluded.entity_type,legal_name=excluded.legal_name,tax_id=excluded.tax_id,registration_number=excluded.registration_number,address=excluded.address,representative=excluded.representative,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
  ).bind(
    id,
    b.entityType,
    b.legalName,
    b.taxId || null,
    b.registrationNumber || null,
    b.address || null,
    b.representative || null,
    c.get("userId"),
    Date.now(),
  );
}
function notice(c: Ctx, clientId: string, userId: string) {
  return c.env.DB.prepare(
    "INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at) VALUES(?,?,?,'Acces client disponibil','Proiectele, abonamentele și documentele publicate sunt disponibile în cont.','/profil?tab=projects',?)",
  ).bind(
    crypto.randomUUID(),
    userId,
    `client-workspace:${clientId}:${userId}`,
    Date.now(),
  );
}
async function lookup(c: Ctx, value: unknown) {
  const key = c.req.header("idempotency-key") || "";
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(key))
    return { error: fail(c, "idempotency_key_required") };
  const scope = `client-workspace:${c.get("userId")}:${c.req.method}:${c.req.path}`,
    hash = await sha256(JSON.stringify(value));
  const row = await c.env.DB.prepare(
    "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=? AND expires_at>?",
  )
    .bind(scope, key, Date.now())
    .first<{ request_hash: string; response_json: string }>();
  return { scope, key, hash, row };
}
async function replay(c: Ctx, value: unknown) {
  const m = await lookup(c, value);
  if (m.error) return m.error;
  if (m.row)
    return m.row.request_hash === m.hash
      ? c.json(JSON.parse(m.row.response_json))
      : fail(c, "idempotency_key_reused", 409);
  return null;
}
async function mutate(
  c: Ctx,
  value: unknown,
  result: Record<string, unknown>,
  writes: D1PreparedStatement[],
) {
  const m = await lookup(c, value);
  if (m.error) return m.error;
  if (m.row)
    return m.row.request_hash === m.hash
      ? c.json(JSON.parse(m.row.response_json))
      : fail(c, "idempotency_key_reused", 409);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,200,?,?,?)",
      ).bind(
        m.scope!,
        m.key!,
        m.hash!,
        JSON.stringify(result),
        Date.now(),
        Date.now() + 86400000,
      ),
      ...writes,
    ]);
  } catch (e) {
    const retry = await lookup(c, value);
    if (retry.row)
      return retry.row.request_hash === retry.hash
        ? c.json(JSON.parse(retry.row.response_json))
        : fail(c, "idempotency_key_reused", 409);
    if (/constraint failed|client_workspace_/i.test(String(e)))
      return fail(
        c,
        "revision_or_scope_conflict",
        409,
        "Datele s-au modificat, identitatea este folosită sau asocierea nu mai este permisă. Reîncarcă fișa înainte de a continua.",
      );
    throw e;
  }
  return c.json(result);
}
clientWorkspaceRouter.use(root + "*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  if (!c.get("roles").some((r) => r === "staff" || r === "admin"))
    return fail(c, "forbidden", 403);
  if (
    !(await principal(c)) &&
    !(await hasCapability(c.env.DB, c.get("userId"), "clients.read"))
  )
    return fail(c, "forbidden", 403);
  if (
    c.req.method !== "GET" &&
    (!(await hasCapability(c.env.DB, c.get("userId"), "clients.write")) ||
      !(await privilegedMfaSatisfied(c)))
  )
    return fail(c, "client_write_or_mfa_required", 403);
  const rate = await checkRateLimit(c.env.DB, [
    {
      key:
        "client-workspace:" +
        (c.req.method === "GET" ? "read:" : "write:") +
        c.get("userId"),
      limit: c.req.method === "GET" ? 480 : 80,
      windowSec: 3600,
    },
  ]);
  if (!rate.ok) return c.json({ error: { code: "rate_limited" } }, 429);
  await next();
});
clientWorkspaceRouter.get(root, async (c) => {
  const q = (c.req.query("q") || "").trim().slice(0, 100),
    status = c.req.query("status") || "",
    type = c.req.query("type") || "",
    offset = Number(c.req.query("offset") || 0);
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 100000 ||
    (status && !["active", "paused", "archived"].includes(status)) ||
    (type && !(CLIENT_ENTITY_TYPES as readonly string[]).includes(type))
  )
    return fail(c, "invalid_filter");
  const filters: string[] = [],
    args: (string | number)[] = [];
  if (q) {
    let text =
      "c.company_name||' '||coalesce(c.contact_name,'')||' '||c.email||' '||coalesce(c.phone,'')||' '||coalesce(l.tax_id,'')";
    for (const [letter, base] of Object.entries({
      ă: "a",
      Ă: "a",
      â: "a",
      Â: "a",
      î: "i",
      Î: "i",
      ș: "s",
      Ș: "s",
      ş: "s",
      Ş: "s",
      ț: "t",
      Ț: "t",
      ţ: "t",
      Ţ: "t",
    }))
      text = `replace((${text}),'${letter}','${base}')`;
    filters.push(`lower(${text}) LIKE ? ESCAPE '\\'`);
    args.push(
      "%" +
        q
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[\\%_]/g, "\\$&") +
        "%",
    );
  }
  if (status) {
    filters.push("c.status=?");
    args.push(status);
  }
  if (type) {
    filters.push("l.entity_type=?");
    args.push(type);
  }
  const where = filters.length ? " WHERE " + filters.join(" AND ") : "";
  const [rows, count, metrics] = await Promise.all([
    c.env.DB.prepare(
      `SELECT ${clientFields},${clientWebsiteSelect}${clientFrom}` +
        where +
        " ORDER BY c.updated_at DESC,c.created_at DESC,c.id LIMIT 50 OFFSET ?",
    )
      .bind(...args, offset)
      .all<{ website_candidates: string } & Record<string, unknown>>(),
    c.env.DB.prepare(
      "SELECT count(*) n FROM clients c LEFT JOIN client_legal_profiles l ON l.client_id=c.id" +
        where,
    )
      .bind(...args)
      .first<{ n: number }>(),
    c.env.DB.prepare(
      "SELECT (SELECT count(*) FROM clients) clients,(SELECT count(*) FROM projects) projects,(SELECT count(*) FROM subscriptions WHERE status='active') subscriptions",
    ).first(),
  ]);
  return c.json({
    data: rows.results.map(({ website_candidates, ...row }) => ({
      ...row, website: recordedWebsite(website_candidates),
    })),
    total: count?.n || 0,
    metrics,
    limit: 50,
    offset,
  });
});
clientWorkspaceRouter.get(root + "/options", async (c) => {
  const manager = await principal(c);
  return c.json({
    entityTypes: CLIENT_ENTITY_TYPES,
    canManageAccounts: manager,
    accounts: manager
      ? (
          await c.env.DB.prepare(
            accountSelect +
              " WHERE " +
              eligibleAccount +
              " ORDER BY u.email LIMIT 1000",
          ).all()
        ).results
      : [],
  });
});
clientWorkspaceRouter.post(root, async (c) => {
  const parsed = createSchema.safeParse(await read(c));
  if (!parsed.success)
    return fail(
      c,
      "invalid_client",
      400,
      "Completează identitatea clientului și datele de acces selectate.",
    );
  const b = parsed.data;
  if (b.account.mode !== "none" && !(await principal(c)))
    return fail(c, "account_assignment_forbidden", 403);
  const old = await replay(c, b);
  if (old) return old;
  const duplicate = await c.env.DB.prepare(
    `SELECT c.id FROM clients c LEFT JOIN client_legal_profiles l ON l.client_id=c.id WHERE (lower(trim(c.company_name))=lower(?) AND lower(trim(c.email))=?) OR (?<>'' AND l.entity_type=? AND upper(replace(l.tax_id,' ',''))=upper(replace(?,' ',''))) LIMIT 1`,
  )
    .bind(
      b.identity.companyName,
      b.identity.email,
      b.identity.taxId,
      b.identity.entityType,
      b.identity.taxId,
    )
    .first();
  if (duplicate)
    return fail(
      c,
      "client_exists",
      409,
      "Există deja o fișă pentru această identitate. Deschide fișa existentă.",
    );
  const id = crypto.randomUUID(),
    t = Date.now(),
    v = b.identity;
  const writes = [
    c.env.DB.prepare(
      `INSERT INTO clients(id,company_name,contact_name,email,phone,status,notes,created_at,updated_at,access_managed) SELECT ?,?,?,?,?,?,?,?,?,1 WHERE NOT EXISTS(SELECT 1 FROM clients c LEFT JOIN client_legal_profiles l ON l.client_id=c.id WHERE (lower(trim(c.company_name))=lower(?) AND lower(trim(c.email))=?) OR (?<>'' AND l.entity_type=? AND upper(replace(l.tax_id,' ',''))=upper(replace(?,' ',''))))`,
    ).bind(
      id,
      v.companyName,
      v.contactName || null,
      v.email,
      v.phone || null,
      v.status,
      v.notes,
      t,
      t,
      v.companyName,
      v.email,
      v.taxId,
      v.entityType,
      v.taxId,
    ),
    legalPlan(c, id, v),
  ];
  let accountId: string | null = null;
  if (b.account.mode === "existing") {
    accountId = b.account.accountId;
    if (!(await eligible(c, accountId)))
      return fail(c, "invalid_client_account", 409);
  }
  if (b.account.mode === "new") {
    const a = b.account.identity;
    if (
      (await isReservedPlatformEmail(c.env.DB, a.email)) ||
      a.email === STAFF_OPERATIONAL_EMAIL
    )
      return fail(c, "reserved_identity", 403);
    if (
      await c.env.DB.prepare(
        "SELECT 1 FROM users WHERE lower(email)=? OR lower(username)=?",
      )
        .bind(a.email, a.username)
        .first()
    )
      return fail(
        c,
        "identity_taken",
        409,
        "Datele de autentificare aparțin unui cont existent. Selectează-l fără a-i schimba parola.",
      );
    accountId = crypto.randomUUID();
    writes.push(
      ...(await provisionAccountPlan(c.env.DB, {
        ...a,
        id: accountId,
        roles: ["user"],
        actorUserId: c.get("userId"),
        timestamp: t,
        requestId: c.get("requestId"),
      })),
    );
  }
  if (accountId)
    writes.push(
      accountGuard(c, id, accountId),
      c.env.DB.prepare(
        "INSERT INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES(?,?,?,?)",
      ).bind(id, accountId, c.get("userId"), t),
      notice(c, id, accountId),
    );
  writes.push(
    event(c, "client.created", id, {
      accountId,
      entityType: v.entityType,
      mfaVerified: !!c.get("mfaVerified"),
    }),
  );
  return mutate(c, b, { ok: true, id, accountId }, writes);
});
clientWorkspaceRouter.get(root + "/:id", async (c) => {
  const id = c.req.param("id") || "",
    client = await requireClient(c, id);
  if (!client) return fail(c, "not_found", 404);
  const permissions = await actorCapabilities(c),
    mapping = await c.env.DB.prepare(
      "SELECT organization_id FROM client_organizations WHERE client_id=?",
    )
      .bind(id)
      .first<{ organization_id: string }>();
  const [
    projects,
    subscriptions,
    accounts,
    available,
    options,
    invoices,
    legacy,
    receipts,
    legacyReceipts,
    orders,
    carts,
  ] = await Promise.all([
    c.env.DB.prepare(
      `SELECT ${projectSummaryColumns("p",permissions.finance)},p.owner_user_id FROM projects p WHERE p.client_id=? ORDER BY p.updated_at DESC,p.id LIMIT 500`,
    )
      .bind(id)
      .all(),
    c.env.DB.prepare(
      `SELECT s.id,s.status,s.next_billing_date,s.maintenance_enabled,s.plan_sku,s.specifications_json,v.service_name,v.billing_cycle,${permissions.finance ? "v.price," : ""}p.id project_id,p.name project_name FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN projects p ON p.id=v.project_id WHERE s.client_id=? AND p.client_id=s.client_id ORDER BY s.status='active' DESC,s.next_billing_date LIMIT 500`,
    )
      .bind(id)
      .all(),
    c.env.DB.prepare(
      accountSelect +
        " JOIN client_account_access g ON g.user_id=u.id WHERE g.client_id=? AND NOT EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin')) ORDER BY u.email LIMIT 100",
    )
      .bind(id)
      .all(),
    permissions.manageProjects
      ? c.env.DB.prepare(
          `SELECT p.id,p.name,p.slug,p.kind,p.status,p.url,p.client_id,p.organization_id,p.owner_user_id,coalesce(p.updated_at,0) updated_at,c.company_name,CASE WHEN p.client_id=? OR (${blankProject}) THEN 1 ELSE 0 END can_assign FROM projects p LEFT JOIN clients c ON c.id=p.client_id WHERE p.status<>'archived' ORDER BY p.client_id=? DESC,p.name LIMIT 500`,
        )
          .bind(id, id)
          .all()
      : Promise.resolve({ results: [] }),
    permissions.manageAccounts
      ? c.env.DB.prepare(
          accountSelect +
            " WHERE " +
            eligibleAccount +
            " ORDER BY u.email LIMIT 1000",
        ).all()
      : Promise.resolve({ results: [] }),
    permissions.finance
      ? c.env.DB.prepare(
          "SELECT r.id,r.service_name,r.invoice_number,r.status,r.currency,r.gross_amount_minor,r.due_date,r.invoice_date,p.name project_name,(SELECT coalesce(sum(amount_minor),0) FROM financial_receipts f WHERE f.revenue_id=r.id) received_minor,'financial' source FROM financial_revenues r LEFT JOIN projects p ON p.id=r.project_id WHERE r.client_id=? ORDER BY r.created_at DESC LIMIT 100",
        )
          .bind(id)
          .all()
      : Promise.resolve({ results: [] }),
    permissions.finance
      ? c.env.DB.prepare(
          "SELECT i.id,'Factură din registrul inițial' service_name,NULL invoice_number,CASE WHEN i.status='void' THEN 'cancelled' ELSE i.status END status,'RON' currency,round(i.amount*100) gross_amount_minor,i.due_date,NULL invoice_date,NULL project_name,(SELECT coalesce(round(sum(p.amount)*100),0) FROM payments p WHERE p.invoice_id=i.id) received_minor,'legacy' source FROM invoices i WHERE i.client_id=? ORDER BY i.created_at DESC LIMIT 100",
        )
          .bind(id)
          .all()
      : Promise.resolve({ results: [] }),
    permissions.finance
      ? c.env.DB.prepare(
          "SELECT f.id,f.revenue_id invoice_id,f.amount_minor,f.currency,f.paid_at,f.reference,'financial' source FROM financial_receipts f JOIN financial_revenues r ON r.id=f.revenue_id WHERE r.client_id=? ORDER BY f.paid_at DESC LIMIT 100",
        )
          .bind(id)
          .all()
      : Promise.resolve({ results: [] }),
    permissions.finance
      ? c.env.DB.prepare(
          "SELECT f.id,f.invoice_id,round(f.amount*100) amount_minor,'RON' currency,f.paid_at,NULL reference,'legacy' source FROM payments f JOIN invoices i ON i.id=f.invoice_id WHERE i.client_id=? ORDER BY f.paid_at DESC LIMIT 100",
        )
          .bind(id)
          .all()
      : Promise.resolve({ results: [] }),
    // Commerce has no legal beneficiary. Only unambiguous, singly-associated accounts are attributed here.
    permissions.finance
      ? c.env.DB.prepare(
          "SELECT o.id,o.status,o.items_json,o.total_cents,o.currency,o.created_at FROM commerce_orders o JOIN client_account_access g ON g.user_id=o.user_id WHERE g.client_id=? AND (SELECT count(*) FROM client_account_access x WHERE x.user_id=o.user_id)=1 ORDER BY o.created_at DESC LIMIT 100",
        )
          .bind(id)
          .all()
      : Promise.resolve({ results: [] }),
    permissions.manageAccounts
      ? c.env.DB.prepare(
          "SELECT x.user_id,x.updated_at,x.items_json FROM account_carts x JOIN client_account_access g ON g.user_id=x.user_id WHERE g.client_id=? AND (SELECT count(*) FROM client_account_access a WHERE a.user_id=x.user_id)=1 ORDER BY x.updated_at DESC LIMIT 50",
        )
          .bind(id)
          .all()
      : Promise.resolve({ results: [] }),
  ]);
  return c.json({
    client,
    organizationId: mapping?.organization_id || null,
    projects: projects.results.map(row=>({...row,budget_visible:permissions.finance})),
    subscriptions: subscriptions.results,
    accounts: accounts.results,
    availableProjects: available.results.map((p: Record<string, unknown>) => ({
      ...p,
      canAssign: !!p.can_assign,
      assignmentReason: p.can_assign
        ? null
        : "Proiectul are beneficiar, proprietar, organizație sau istoric asociat. Nu poate fi mutat automat.",
    })),
    accountOptions: options.results,
    invoices: [...invoices.results, ...legacy.results],
    receipts: [...receipts.results, ...legacyReceipts.results],
    orders: orders.results,
    carts: carts.results,
    permissions,
  });
});
clientWorkspaceRouter.patch(root + "/:id", async (c) => {
  const id = c.req.param("id") || "";
  if (!(await requireClient(c, id))) return fail(c, "not_found", 404);
  const parsed = editSchema.safeParse(await read(c));
  if (!parsed.success)
    return fail(
      c,
      "invalid_client",
      400,
      "Completează datele clientului și reîncarcă revizia curentă.",
    );
  const b = parsed.data,
    v = b.identity;
  return mutate(c, b, { ok: true, id }, [
    c.env.DB.prepare(
      "UPDATE clients SET access_managed=1,company_name=?,contact_name=?,email=?,phone=?,status=?,notes=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?",
    ).bind(
      v.companyName,
      v.contactName || null,
      v.email,
      v.phone || null,
      v.status,
      v.notes,
      b.revision,
      Date.now(),
      id,
    ),
    legalPlan(c, id, v),
    event(c, "client.updated", id, { entityType: v.entityType }),
  ]);
});
clientWorkspaceRouter.post(root + "/:id/accounts", async (c) => {
  if (!(await principal(c))) return fail(c, "forbidden", 403);
  const id = c.req.param("id") || "";
  if (!(await requireClient(c, id))) return fail(c, "not_found", 404);
  const parsed = z
    .object({ identity: accountIdentitySchema, confirmed: z.literal(true) })
    .strict()
    .safeParse(await read(c));
  if (!parsed.success) return fail(c, "invalid_identity");
  const b = parsed.data,
    old = await replay(c, b);
  if (old) return old;
  const a = b.identity;
  if (
    (await isReservedPlatformEmail(c.env.DB, a.email)) ||
    a.email === STAFF_OPERATIONAL_EMAIL
  )
    return fail(c, "reserved_identity", 403);
  if (
    await c.env.DB.prepare(
      "SELECT 1 FROM users WHERE lower(email)=? OR lower(username)=?",
    )
      .bind(a.email, a.username)
      .first()
  )
    return fail(
      c,
      "identity_taken",
      409,
      "Contul există deja. Alege asocierea contului existent.",
    );
  const accountId = crypto.randomUUID(),
    t = Date.now();
  return mutate(c, b, { ok: true, id, accountId }, [
    c.env.DB.prepare("UPDATE clients SET access_managed=1 WHERE id=?").bind(id),
    ...(await provisionAccountPlan(c.env.DB, {
      ...a,
      id: accountId,
      roles: ["user"],
      actorUserId: c.get("userId"),
      timestamp: t,
      requestId: c.get("requestId"),
    })),
    c.env.DB.prepare(
      "INSERT INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES(?,?,?,?)",
    ).bind(id, accountId, c.get("userId"), t),
    notice(c, id, accountId),
    event(c, "client.account.provisioned", id, { accountId }),
  ]);
});
clientWorkspaceRouter.put(root + "/:id/accounts", async (c) => {
  if (!(await principal(c))) return fail(c, "forbidden", 403);
  const id = c.req.param("id") || "";
  if (!(await requireClient(c, id))) return fail(c, "not_found", 404);
  const parsed = z
    .object({
      userIds: z
        .array(ident)
        .max(20)
        .transform((v) => [...new Set(v)]),
      expectedUserIds: z
        .array(ident)
        .max(100)
        .transform((v) => [...new Set(v)].sort()),
      confirmed: z.literal(true),
    })
    .strict()
    .safeParse(await read(c));
  if (!parsed.success) return fail(c, "invalid_accounts");
  const b = parsed.data,
    old = await replay(c, b);
  if (old) return old;
  for (const uid of b.userIds)
    if (!(await eligible(c, uid)))
      return fail(
        c,
        "invalid_client_account",
        409,
        "Alege numai conturi client verificate și active.",
      );
  const t = Date.now(),
    current = (
      await c.env.DB.prepare(
        "SELECT user_id FROM client_account_access WHERE client_id=? ORDER BY user_id",
      )
        .bind(id)
        .all<{ user_id: string }>()
    ).results.map((r) => r.user_id);
  if (JSON.stringify(current) !== JSON.stringify(b.expectedUserIds))
    return fail(
      c,
      "account_assignment_changed",
      409,
      "Conturile au fost modificate. Reîncarcă fișa.",
    );
  const writes = [
    c.env.DB.prepare("UPDATE clients SET access_managed=1 WHERE id=?").bind(id),
    c.env.DB.prepare(
      "UPDATE clients SET access_managed=1,revision=CASE WHEN (SELECT coalesce(json_group_array(user_id),'[]') FROM (SELECT user_id FROM client_account_access WHERE client_id=? ORDER BY user_id))=? THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?",
    ).bind(id, JSON.stringify(b.expectedUserIds), t, id),
    c.env.DB.prepare(
      "DELETE FROM client_account_access WHERE client_id=?",
    ).bind(id),
    ...b.userIds.flatMap((uid) => [
      accountGuard(c, id, uid),
      c.env.DB.prepare(
        "INSERT INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES(?,?,?,?)",
      ).bind(id, uid, c.get("userId"), t),
      notice(c, id, uid),
    ]),
    event(c, "client.accounts.replaced", id, { accountIds: b.userIds }),
  ];
  return mutate(c, b, { ok: true, id }, writes);
});
clientWorkspaceRouter.put(root + "/:id/projects", async (c) => {
  if (!(await principal(c))) return fail(c, "forbidden", 403);
  const id = c.req.param("id") || "";
  if (!(await requireClient(c, id))) return fail(c, "not_found", 404);
  const parsed = z
    .object({
      projects: z
        .array(
          z
            .object({
              id: ident,
              sourceClientId: ident.nullable(),
              updatedAt: z.number().int().min(0),
            })
            .strict(),
        )
        .min(1)
        .max(50),
      confirmed: z.literal(true),
    })
    .strict()
    .safeParse(await read(c));
  if (!parsed.success) return fail(c, "invalid_projects");
  const b = parsed.data,
    old = await replay(c, b);
  if (old) return old;
  const writes: D1PreparedStatement[] = [];
  for (const p of b.projects) {
    const row = await c.env.DB.prepare(
      `SELECT p.*,coalesce(p.updated_at,0) revision_timestamp,CASE WHEN p.client_id=? OR (${blankProject}) THEN 1 ELSE 0 END assignable FROM projects p WHERE p.id=?`,
    )
      .bind(id, p.id)
      .first<{
        assignable: number;
        client_id: string | null;
        revision_timestamp: number;
      }>();
    if (
      !row ||
      !row.assignable ||
      row.client_id !== p.sourceClientId ||
      row.revision_timestamp !== p.updatedAt
    )
      return fail(
        c,
        "project_assignment_not_allowed",
        409,
        "Proiectul are un alt context sau istoric. Reîncarcă fișa și selectează un proiect eligibil.",
      );
    writes.push(
      c.env.DB.prepare(
        `UPDATE clients SET revision=CASE WHEN EXISTS(SELECT 1 FROM projects p WHERE p.id=? AND p.client_id IS ? AND coalesce(p.updated_at,0)=? AND (p.client_id=? OR (${blankProject}))) THEN revision ELSE NULL END WHERE id=?`,
      ).bind(p.id, p.sourceClientId, p.updatedAt, id, id),
      c.env.DB.prepare("UPDATE projects SET client_id=?,updated_at=? WHERE id=?").bind(id, Date.now(), p.id),
      c.env.DB.prepare(
        "INSERT INTO project_logs(id,project_id,actor_id,action,meta_json,created_at) VALUES(?,?,?,'client_assigned',?,?)",
      ).bind(
        crypto.randomUUID(),
        p.id,
        c.get("userId"),
        JSON.stringify({ from: p.sourceClientId, to: id }),
        Date.now(),
      ),
    );
  }
  writes.push(
    event(c, "client.projects.assigned", id, {
      projectIds: b.projects.map((p) => p.id),
    }),
  );
  return mutate(c, b, { ok: true, id }, writes);
});
