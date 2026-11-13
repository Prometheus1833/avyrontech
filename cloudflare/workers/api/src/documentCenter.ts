import { scanUpload, antivirusFailure, putScannedObject, getScannedObject } from "./malware";
import { hasCapability } from "./authorization";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { AppBindings } from "./types";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { sha256 } from "./security";
import { deliverMail, logDelivery } from "./mailer";
import {
  documentActor,
  documentCapability,
  documentVisibility,
  accessibleDocument,
  documentActionAllowed,
  beneficiaryAllowed,
  type DocumentActor,
  type DocumentRow,
} from "./documentPolicy";
import {
  assignmentColumns,
  assignmentSchema,
  blankPayload,
  documentIssues,
  payloadSchema,
  plainText,
  replaceVariables,
  paragraph,
  type Assignment,
  type DocumentPayload,
  type DocumentPermission,
} from "../../../../src/shared/documents/model";
import { DOCUMENT_TEMPLATES } from "../../../../src/shared/documents/templates";
import { isModernDocument, documentRenderer } from "../../../../src/shared/documents/design";
import { SERVICE_COMMERCIAL_SOURCES } from "../../../../src/data/serviceCommercialSources";
import staffGuides from "./documentStaffGuides.json";

type Bindings = {
  Bindings: AppBindings["Bindings"];
  Variables: AppBindings["Variables"] & { documentActor: DocumentActor };
};
type Ctx = Context<Bindings>;
export const documentCenterRouter = new Hono<Bindings>();
documentCenterRouter.onError((cause, c) => {
  if (/no such table: (documents|document_|client_legal|agency_collaborators)/.test(String(cause)))
    return error(c, "document_center_unavailable", 503);
  if (/assignment_scope_denied/.test(String(cause)))
    return error(c, "assignment_scope_denied", 403);
  if (/document_export_runtime_unconfigured/.test(String(cause)))
    return error(c, "document_export_runtime_unconfigured", 503);
  if (/constraint failed/.test(String(cause)))
    return error(c, "integrity_conflict", 409);
  console.error(
    JSON.stringify({
      event: "document_operation_failed",
      requestId: c.get("requestId"),
      path: c.req.path,
    }),
  );
  return error(c, "document_operation_failed", 503);
});
const uid = () => crypto.randomUUID();
const stamp = () => Date.now();
const error = (
  c: Ctx,
  code: string,
  status: 400 | 403 | 404 | 409 | 413 | 423 | 429 | 503 = 400,
) =>
  c.json(
    {
      error: {
        code,
        message:
          (
            {
              not_found: "Document indisponibil sau acces neautorizat.",
              forbidden: "Nu ai permisiunea necesară.",
              revision_conflict:
                "Documentul s-a schimbat. Reîncarcă versiunea înainte de salvare.",
              verification_required:
                "Completează câmpurile și verificările înainte de aprobare.",
              approval_required: "Versiunea curentă trebuie aprobată.",
              recipient_not_authorized:
                "Destinatarul nu are acces la versiunea documentului.",
              backup_unconfigured:
                "Destinația privată separată pentru backup nu este configurată.",
              document_storage_unverified:
                "Stocarea documentelor necesită verificarea accesului privat înainte de activare.",
              document_export_runtime_unconfigured:
                "Runtime-ul securizat pentru export nu este configurat. Documentul rămâne salvat.",
              quarantined: "Fișier în carantină. Verdictul antivirus CLEAN nu este confirmat.",
              document_center_unavailable:
                "Document Center necesită migrațiile aprobate înainte de activare.",
              image_quarantine_required:
                "Imaginea trebuie încărcată și scanată înainte de inserare. Scanarea nu este configurată.",
              catalog_snapshot_mismatch:
                "Identificatorii și valorile de catalog nu corespund sursei autorizate. Reîncarcă selecția.",
              legal_master_review_required:
                "Modelul juridic original necesită o revizuire de specialitate înregistrată înainte de aprobarea documentului.",
              legal_review_required:
                "Înregistrează referința revizuirii juridice a acestei versiuni.",
              mfa_required:
                "Operațiunea necesită o sesiune verificată prin MFA.",
            } as Record<string, string>
          )[code] || "Operațiunea nu poate fi efectuată. Verifică datele.",
      },
    },
    status,
  );
const audit = (
  c: Ctx,
  documentId: string,
  action: string,
  versionId: string | null = null,
  metadata: Record<string, unknown> = {},
) =>
  c.env.DB.prepare(
    "INSERT INTO document_audit_events(id,document_id,actor_id,action,version_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)",
  ).bind(
    uid(),
    documentId,
    c.get("userId"),
    action,
    versionId,
    JSON.stringify(metadata),
    stamp(),
  );
const permission = (c: Ctx, p: DocumentPermission, org: string | null = null) =>
  documentCapability(c.get("documentActor"), p, org);
function templateVisibility(c: Ctx, alias = "t") {
  const filter = documentVisibility(c.get("documentActor"), "source_document");
  return {
    sql: `(${alias}.visibility='shared' OR EXISTS(SELECT 1 FROM documents source_document WHERE source_document.id=${alias}.source_document_id AND ${filter.sql}))`,
    values: filter.values,
  };
}
function reusableTemplate(payload: DocumentPayload): DocumentPayload {
  const values = Object.entries(payload.fields)
    .filter(([, value]) => value.trim().length >= 3)
    .sort((a, b) => b[1].length - a[1].length);
  const replace = (text: string) =>
    values.reduce(
      (text, [key, value]) => text.split(value).join(`{{${key}}}`),
      text,
    );
  const node = (value: DocumentPayload["body"]): DocumentPayload["body"] => ({
    ...value,
    ...(value.text ? { text: replace(value.text) } : {}),
    ...(value.content ? { content: value.content.map(node) } : {}),
  });
  return {
    ...payload,
    title: replace(payload.title),
    header: replace(payload.header),
    footer: replace(payload.footer),
    body: node(payload.body),
    fields: Object.fromEntries(
      Object.keys(payload.fields).map((key) => [key, ""]),
    ),
    lines: [],
  };
}
const mutableSchema = z
  .object({ payload: payloadSchema, revision: z.number().int().positive() })
  .strict();
const createSchema = z
  .object({
    payload: payloadSchema,
    scope: z.enum(["client", "internal", "staff", "company"]),
    collection: z.enum(["library", "hub", "staff"]).default("library"),
    beneficiaryId: z.string().min(1).max(150).nullable(),
    templateVersionId: z.string().max(150).nullable(),
    legal: z.boolean().default(false),
    assignments: z.array(assignmentSchema).max(30).default([]),
  })
  .strict();
const current = async (
  c: Ctx,
  id: string,
  p: DocumentPermission = "documents.read",
) => {
  const d = await accessibleDocument(c.env.DB, c.get("documentActor"), id);
  if (
    !d ||
    !(await documentActionAllowed(c.env.DB, c.get("documentActor"), d, p))
  )
    return null;
  return d;
};
const readVersion = async (c: Ctx, d: DocumentRow, requested?: string) => {
  const actor = c.get("documentActor");
  const versionId =
    requested ||
    (actor.staff || actor.platform
      ? d.current_version_id
      : d.published_version_id);
  if (!actor.staff && !actor.platform && versionId !== d.published_version_id) {
    const published = await c.env.DB.prepare(
      "SELECT 1 FROM document_version_publications WHERE document_id=? AND version_id=? AND user_id=?",
    )
      .bind(d.id, versionId, actor.id)
      .first();
    if (!published) return null;
  }
  return c.env.DB.prepare(
    "SELECT * FROM document_versions WHERE id=? AND document_id=?",
  )
    .bind(versionId, d.id)
    .first<{
      id: string;
      version: number;
      payload_json: string;
      sha256: string;
      created_at: number;
    }>();
};
async function revalidateVersionAccess(
  c: Ctx,
  id: string,
  versionId: string,
  action: DocumentPermission,
) {
  const actor = await documentActor(c.env.DB, c.get("userId"));
  if (!actor) return false;
  c.set("documentActor", actor);
  const fresh = await accessibleDocument(c.env.DB, actor, id);
  return (
    !!fresh &&
    (await documentActionAllowed(c.env.DB, actor, fresh, action)) &&
    !!(await readVersion(c, fresh, versionId))
  );
}
async function write(
  c: Ctx,
  response: Record<string, unknown>,
  statements: D1PreparedStatement[],
  keyScope = c.req.path,
) {
  const key = c.req.header("idempotency-key");
  if (!key || !/^[A-Za-z0-9_-]{8,120}$/.test(key))
    return error(c, "idempotency_key_required");
  const scope = `documents:${c.get("userId")}:${keyScope}`,
    hash = await sha256(`${c.req.method}:${await c.req.text()}`);
  const old = await c.env.DB.prepare(
    "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
  )
    .bind(scope, key)
    .first<{ request_hash: string; response_json: string }>();
  if (old)
    return old.request_hash === hash
      ? c.json(JSON.parse(old.response_json))
      : error(c, "idempotency_key_reused", 409);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,200,?,?,?)",
      ).bind(
        scope,
        key,
        hash,
        JSON.stringify(response),
        stamp(),
        stamp() + 30 * 86400000,
      ),
      ...statements,
    ]);
  } catch (cause) {
    if (/UNIQUE constraint failed: idempotency_keys/.test(String(cause))) {
      const replay = await c.env.DB.prepare(
        "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
      )
        .bind(scope, key)
        .first<{ request_hash: string; response_json: string }>();
      if (replay?.request_hash === hash)
        return c.json(JSON.parse(replay.response_json));
    }
    if (/NOT NULL constraint failed: documents.revision/.test(String(cause)))
      return error(c, "revision_conflict", 409);
    throw cause;
  }
  return c.json(response);
}
async function replayWrite(c: Ctx) {
  const key = c.req.header("idempotency-key");
  if (!key || !/^[A-Za-z0-9_-]{8,120}$/.test(key))
    return error(c, "idempotency_key_required");
  const old = await c.env.DB.prepare(
    "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
  )
    .bind(`documents:${c.get("userId")}:${c.req.path}`, key)
    .first<{ request_hash: string; response_json: string }>();
  if (!old) return null;
  const hash = await sha256(`${c.req.method}:${await c.req.text()}`);
  return old.request_hash === hash
    ? c.json(JSON.parse(old.response_json))
    : error(c, "idempotency_key_reused", 409);
}
const cas = (c: Ctx, d: DocumentRow, revision: number) =>
  c.env.DB.prepare(
    "UPDATE documents SET revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?",
  ).bind(revision, stamp(), d.id);
async function assignmentStatements(
  c: Ctx,
  d: Pick<DocumentRow, "id" | "beneficiary_id">,
  assignments: Assignment[],
) {
  const statements: D1PreparedStatement[] = [];
  for (const a of assignments) {
    let beneficiary: string | null | undefined;
    if (a.kind === "project") {
      beneficiary = (
        await c.env.DB.prepare("SELECT client_id FROM projects WHERE id=?")
          .bind(a.id)
          .first<{ client_id: string }>()
      )?.client_id;
    }
    if (a.kind === "service") {
      beneficiary = (
        await c.env.DB.prepare(
          "SELECT p.client_id FROM services s JOIN projects p ON p.id=s.project_id WHERE s.id=?",
        )
          .bind(a.id)
          .first<{ client_id: string }>()
      )?.client_id;
    }
    if (a.kind === "subscription") {
      beneficiary = (
        await c.env.DB.prepare("SELECT client_id FROM subscriptions WHERE id=?")
          .bind(a.id)
          .first<{ client_id: string }>()
      )?.client_id;
    }
    if (a.kind === "partner") {
      beneficiary = (
        await c.env.DB.prepare("SELECT id FROM clients WHERE id=?")
          .bind(a.id)
          .first<{ id: string }>()
      )?.id;
    }
    if (["order", "entitlement", "billing_subscription"].includes(a.kind)) {
      const tables = {
        order: "commerce_orders",
        entitlement: "product_entitlements",
        billing_subscription: "billing_subscriptions",
      } as const;
      const kind = a.kind as keyof typeof tables;
      const row = await c.env.DB.prepare(
        `SELECT user_id FROM ${tables[kind]} WHERE id=?`,
      )
        .bind(a.id)
        .first<{ user_id: string }>();
      // A purchase account linked to several firms is ambiguous: require dedicated beneficiary mapping before reuse.
      if (row && d.beneficiary_id) {
        const links = await c.env.DB.prepare(
          "SELECT client_id FROM client_account_access WHERE user_id=?",
        )
          .bind(row.user_id)
          .all<{ client_id: string }>();
        if (links.results.length === 1)
          beneficiary = links.results[0].client_id;
      }
    }
    if (a.kind === "catalog") {
      if (
        !(await c.env.DB.prepare(
          "SELECT 1 FROM commercial_catalog_codes WHERE id=? AND active=1",
        )
          .bind(a.id)
          .first())
      )
        throw new Error("assignment_scope_denied");
    }
    if (a.kind === "product") {
      if (
        !(await c.env.DB.prepare("SELECT 1 FROM product_items WHERE slug=?")
          .bind(a.id)
          .first())
      )
        throw new Error("assignment_scope_denied");
    } else if (
      a.kind !== "catalog" &&
      (!d.beneficiary_id || beneficiary !== d.beneficiary_id)
    )
      throw new Error("assignment_scope_denied");
    statements.push(
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO document_assignments(id,document_id,${assignmentColumns[a.kind]},created_by,created_at) VALUES(?,?,?,?,?)`,
      ).bind(uid(), d.id, a.id, c.get("userId"), stamp()),
    );
  }
  return statements;
}
async function embeddedImagesAllowed(
  c: Ctx,
  payload: DocumentPayload,
  documentId?: string,
) {
  const sources: string[] = [];
  const visit = (node: DocumentPayload["body"]) => {
    if (node.type === "image") sources.push(node.attrs?.src || "");
    for (const child of node.content || []) visit(child);
  };
  visit(payload.body);
  for (const src of sources) {
    if (!documentId || !src) return false;
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(src.split(",")[1]), (c) => c.charCodeAt(0));
    } catch {
      return false;
    }
    const checksum = await digestBytes(bytes);
    if (
      !(await c.env.DB.prepare(
        "SELECT 1 FROM document_files f JOIN malware_object_verdicts o ON o.bucket='FILES' AND o.object_key=f.object_key JOIN malware_scan_jobs s ON s.id=o.scan_id AND s.status='clean' AND s.sha256=f.sha256 WHERE f.document_id=? AND f.sha256=? AND f.content_type IN('image/png','image/jpeg') AND f.scan_status='clean_scanned'",
      )
        .bind(documentId, checksum)
        .first())
    )
      return false;
  }
  return true;
}
const versionStatement = async (
  c: Ctx,
  documentId: string,
  versionId: string,
  payload: DocumentPayload,
) =>
  c.env.DB.prepare(
    "INSERT INTO document_versions(id,document_id,version,payload_json,search_text,sha256,created_by,created_at) VALUES(?,?,(SELECT coalesce(max(version),0)+1 FROM document_versions WHERE document_id=?),?,?,?,?,?)",
  ).bind(
    versionId,
    documentId,
    documentId,
    JSON.stringify(payload),
    `${payload.title}\n${plainText(payload.body)}`,
    await sha256(JSON.stringify(payload)),
    c.get("userId"),
    stamp(),
  );
async function commercialSnapshotValid(
  c: Ctx,
  payload: DocumentPayload,
  document?: DocumentRow,
) {
  const previous = document
    ? await c.env.DB.prepare(
        "SELECT payload_json FROM document_versions WHERE id=? AND document_id=?",
      )
        .bind(document.current_version_id, document.id)
        .first<{ payload_json: string }>()
    : null;
  const oldLines: DocumentPayload["lines"] = previous
    ? JSON.parse(previous.payload_json).lines
    : [];
  for (const line of payload.lines) {
    const old = oldLines.find((item) => item.catalogId === line.catalogId);
    if (old) {
      if (
        [
          "catalogPriceMinor",
          "sku",
          "currency",
          "vatBasisPoints",
          "taxVerified",
          "priceModel",
        ].some(
          (key) =>
            line[key as keyof typeof line] !== old[key as keyof typeof old],
        )
      )
        return false;
      continue;
    }
    const source = await c.env.DB.prepare(
      "SELECT sku,base_price_minor,currency,vat_basis_points,tax_status,price_model FROM commercial_catalog_codes WHERE id=? AND active=1",
    )
      .bind(line.catalogId)
      .first<{
        sku: string | null;
        base_price_minor: number | null;
        currency: string;
        vat_basis_points: number;
        tax_status: string;
        price_model: string;
      }>();
    if (
      !source ||
      line.catalogPriceMinor !== source.base_price_minor ||
      line.sku !== (source.sku || "") ||
      line.currency !== source.currency ||
      line.vatBasisPoints !== source.vat_basis_points ||
      line.taxVerified !== (source.tax_status === "verified") ||
      line.priceModel !== source.price_model
    )
      return false;
  }
  return true;
}
async function requiredFields(c: Ctx, d: DocumentRow) {
  if (!d.template_version_id) return [];
  const t = await c.env.DB.prepare(
    "SELECT required_fields_json FROM document_template_versions WHERE id=?",
  )
    .bind(d.template_version_id)
    .first<{ required_fields_json: string }>();
  return t ? (JSON.parse(t.required_fields_json) as string[]) : [];
}
// Auth is mounted in index before this router, including the exact collection path.
for (const path of ["/api/documents", "/api/documents/*"]) {
  documentCenterRouter.use(path, async (c, next) =>
    bodyLimit({
      maxSize: c.req.path.endsWith("/import") ? 16 * 1024 * 1024 : 600 * 1024,
      onError: (ctx) => ctx.json({ error: { code: "too_large" } }, 413),
    })(c, next),
  );
  documentCenterRouter.use(path, async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    c.header("X-Robots-Tag", "noindex, nofollow");
    const actor = await documentActor(c.env.DB, c.get("userId"));
    if (!actor) return error(c, "forbidden", 403);
    c.set("documentActor", actor);
    const managedId = /^\/api\/documents\/([^/]+)(?:\/|$)/.exec(c.req.path)?.[1];
    if(c.req.method!=="GET" && managedId && !c.req.path.includes('/backups') && await c.env.DB.prepare('SELECT 1 FROM agency_collaborators WHERE document_id=?').bind(managedId).first())
      return c.json({error:{code:'collaboration_documents_managed',message:'Gestionează acest dosar din fișa colaboratorului.'}},409);
    if (actor.staff && !(await privilegedMfaSatisfied(c)))
      return error(c, "mfa_required", 403);
    if (c.req.method !== "GET") {
      const rate = await checkRateLimit(c.env.DB, [
        { key: `document-mutate:${actor.id}`, limit: 120, windowSec: 60 },
      ]);
      if (!rate.ok) return error(c, "rate_limited", 429);
    } else {
      const rate = await checkRateLimit(c.env.DB, [
        { key: `document-read:${actor.id}`, limit: 180, windowSec: 60 },
      ]);
      if (!rate.ok) return error(c, "rate_limited", 429);
    }
    try {
      await next();
    } catch (cause) {
      if (
        /no such table: (documents|document_|client_legal|agency_collaborators)/.test(String(cause))
      )
        return error(c, "document_center_unavailable", 503);
      if (/assignment_scope_denied/.test(String(cause)))
        return error(c, "assignment_scope_denied", 403);
      throw cause;
    }
  });
}

documentCenterRouter.get("/api/documents/bootstrap", async (c) => {
  const a = c.get("documentActor");
  const permissions = Object.fromEntries(
    (
      [
        "documents.read",
        "documents.create",
        "documents.edit",
        "documents.export",
        "documents.share",
        "documents.publish",
        "documents.approve",
        "documents.templates.manage",
        "documents.company.owner",
        "documents.backups.manage",
      ] as DocumentPermission[]
    ).map((p) => [
      p,
      permission(c, p) ||
        (p === "documents.create" &&
          a.staff &&
          a.capabilities.some((row) => row.capability === p)),
    ]),
  );
  return c.json({
    permissions,
    staff: a.staff,
    platformRole: a.platform,
    mfaVerified: !!c.get("mfaVerified"),
    channels: {
      email:
        !!c.env.SMTP_FROM && (!!c.env.TRANSACTIONAL_EMAIL || !!c.env.SMTP_PASS),
      whatsapp: "manual",
      telegram: "manual",
    },
    scanner: "unconfigured",
    storage:
      c.env.DOCUMENT_STORAGE_PRIVACY_VERIFIED === "true"
        ? "verified"
        : "unverified",
    backup:
      c.env.DOCUMENT_BACKUPS &&
      c.env.DOCUMENT_BACKUP_ISOLATION_VERIFIED === "true"
        ? "configured_unverified"
        : "unconfigured",
  });
});
documentCenterRouter.get("/api/documents/context", async (c) => {
  const a = c.get("documentActor");
  if (!a.staff && !a.platform) return error(c, "forbidden", 403);
  const templateFilter = templateVisibility(c);
  const clientFilter = a.platform
    ? { sql: "1=1", values: [] as string[] }
    : {
        sql: `EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=cl.id AND ca.user_id=?) OR EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships om ON om.organization_id=co.organization_id JOIN organizations o ON o.id=co.organization_id WHERE co.client_id=cl.id AND om.user_id=? AND om.status='active' AND om.role IN('owner','admin','manager','specialist') AND o.status='active')`,
        values: [a.id, a.id],
      };
  const clients = await c.env.DB.prepare(
    `SELECT cl.id,cl.company_name,cl.contact_name,cl.email,co.organization_id,lp.entity_type,lp.legal_name,lp.tax_id,lp.registration_number,lp.address,lp.representative FROM clients cl LEFT JOIN client_legal_profiles lp ON lp.client_id=cl.id LEFT JOIN client_organizations co ON co.client_id=cl.id WHERE (${clientFilter.sql}) ORDER BY cl.company_name LIMIT 250`,
  )
    .bind(...clientFilter.values)
    .all();
  // Use a scoped subquery instead of one bind per client (D1 has a finite bind limit).
  const inSql = `IN (SELECT cl.id FROM clients cl WHERE (${clientFilter.sql}) ORDER BY cl.company_name LIMIT 250)`;
  const ids = clientFilter.values;
  const [
    projects,
    services,
    subscriptions,
    catalog,
    products,
    plans,
    templates,
    company,
    serviceProfiles,
    purchases,
    entitlements,
    billingSubscriptions,
  ] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id,name,client_id,kind,status FROM projects WHERE client_id ${inSql} ORDER BY name LIMIT 500`,
    )
      .bind(...ids)
      .all(),
    c.env.DB.prepare(
      `SELECT s.*,p.client_id FROM services s JOIN projects p ON p.id=s.project_id WHERE p.client_id ${inSql} LIMIT 500`,
    )
      .bind(...ids)
      .all(),
    c.env.DB.prepare(
      `SELECT s.*,sv.project_id,sv.service_name,(SELECT json_object('entity_type',b.entity_type,'legal_name',b.legal_name,'tax_id',b.tax_id,'billing_address',b.billing_address,'invoice_email',b.invoice_email,'payment_terms_days',b.payment_terms_days) FROM subscription_billing_settings b WHERE b.subscription_id=s.id AND b.client_id=s.client_id) billing_json FROM subscriptions s JOIN services sv ON sv.id=s.service_id JOIN projects p ON p.id=sv.project_id WHERE s.client_id=p.client_id AND s.client_id ${inSql} LIMIT 500`,
    )
      .bind(...ids)
      .all(),
    c.env.DB.prepare(
      "SELECT * FROM commercial_catalog_codes WHERE active=1 ORDER BY display_name LIMIT 500",
    ).all(),
    c.env.DB.prepare(
      "SELECT slug,name_ro,type,access,price_ron_cents FROM product_items WHERE status='live' ORDER BY name_ro LIMIT 250",
    ).all(),
    c.env.DB.prepare(
      "SELECT id,name,price_ron_cents FROM partnership_plans",
    ).all(),
    c.env.DB.prepare(
      `SELECT t.id,t.name,t.family,t.legal,t.visibility,v.id version_id,v.version,v.payload_json,v.required_fields_json,v.review_status FROM document_templates t JOIN document_template_versions v ON v.template_id=t.id WHERE ${templateFilter.sql} AND v.version=(SELECT max(version) FROM document_template_versions WHERE template_id=t.id) ORDER BY t.created_at,t.id`,
    )
      .bind(...templateFilter.values)
      .all(),
    c.env.DB.prepare(
      "SELECT legal_name,tax_id,registration_number,address,registered_address,representative,contact_email,share_capital FROM document_company_profile WHERE id='avyron'",
    ).first(),
    c.env.DB.prepare(
      "SELECT catalog_id,configuration_json FROM document_service_profiles",
    ).all(),
    ...[
      {
        table: "commerce_orders",
        fields:
          "r.id,r.status,r.created_at,r.currency,r.total_cents,r.items_json",
      },
      {
        table: "product_entitlements",
        fields:
          "r.id,r.slug,r.plan,r.source,r.order_id,r.granted_at,r.expires_at,r.revoked_at",
      },
      {
        table: "billing_subscriptions",
        fields:
          "r.id,r.sku,r.status,r.period,r.amount_minor,r.currency,r.current_period_start,r.current_period_end",
      },
    ].map(({ table, fields }) =>
      c.env.DB.prepare(
        `SELECT ${fields},ca.client_id FROM ${table} r JOIN client_account_access ca ON ca.user_id=r.user_id WHERE ca.client_id ${inSql} AND (SELECT count(*) FROM client_account_access all_links WHERE all_links.user_id=r.user_id)=1 ORDER BY r.id LIMIT 250`,
      )
        .bind(...ids)
        .all(),
    ),
  ]);
  return c.json({
    clients: clients.results,
    projects: projects.results,
    services: services.results,
    subscriptions: subscriptions.results.map((row) => {
      const { billing_json, ...value } = row as Record<string, unknown>;
      return {
        ...value,
        billing: billing_json ? JSON.parse(String(billing_json)) : null,
      };
    }),
    catalog: catalog.results,
    products: products.results,
    plans: plans.results,
    templates: templates.results.map((t) => ({
      ...t,
      payload: JSON.parse(String(t.payload_json)),
      required: JSON.parse(String(t.required_fields_json)),
      payload_json: undefined,
      required_fields_json: undefined,
    })),
    company,
    serviceProfiles: serviceProfiles.results,
    unreconciledServices: SERVICE_COMMERCIAL_SOURCES.filter(
      (s) =>
        !catalog.results.some(
          (row) =>
            row.entity_type === "service" && row.entity_key === s.entity_key,
        ),
    ).map((s) => ({ entityKey: s.entity_key, name: s.display_name })),
    purchases: purchases.results,
    entitlements: entitlements.results,
    billingSubscriptions: billingSubscriptions.results,
    entityTypes: [
      "PF",
      "PJ",
      "PFA",
      "II",
      "IF",
      "ONG",
      "Asociație",
      "Fundație",
      "Instituție",
      "Partener",
      "Altă formă",
    ],
  });
});
documentCenterRouter.put("/api/documents/service-profiles/:id", async (c) => {
  if (!permission(c, "documents.templates.manage"))
    return error(c, "forbidden", 403);
  const value = z
    .object({
      fields: z
        .record(
          z.string().regex(/^[a-z][a-z0-9_]{0,49}$/),
          z.string().trim().min(1).max(160),
        )
        .refine((v) => Object.keys(v).length <= 30),
      deliverables: z.string().trim().min(20).max(8000),
      documents: z.array(z.string().min(1).max(150)).min(1).max(30),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!value.success) return error(c, "invalid_input");
  if (
    !(await c.env.DB.prepare(
      `SELECT 1 FROM commercial_catalog_codes WHERE id=? AND active=1 AND entity_type='service'`,
    )
      .bind(c.req.param("id"))
      .first())
  )
    return error(c, "not_found", 404);
  const templates = await c.env.DB.prepare(
    `SELECT id FROM document_templates WHERE id IN(${value.data.documents.map(() => "?").join(",")})`,
  )
    .bind(...value.data.documents)
    .all();
  if (templates.results.length !== new Set(value.data.documents).size)
    return error(c, "invalid_input");
  return write(c, { ok: true }, [
    c.env.DB.prepare(
      "INSERT INTO document_service_profiles(catalog_id,configuration_json,updated_by,updated_at) VALUES(?,?,?,?) ON CONFLICT(catalog_id) DO UPDATE SET configuration_json=excluded.configuration_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
    ).bind(
      c.req.param("id"),
      JSON.stringify(value.data),
      c.get("userId"),
      stamp(),
    ),
    c.env.DB.prepare(
      "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user','documents.service_profile.updated',?,'allowed','info','{}',?)",
    ).bind(uid(), c.get("userId"), c.req.param("id"), stamp()),
  ]);
});
documentCenterRouter.get("/api/documents/staff-guides", (c) =>
  c.get("documentActor").staff
    ? c.json({ data: staffGuides })
    : error(c, "forbidden", 403),
);
documentCenterRouter.get("/api/documents/legacy-hub", async (c) => {
  if (!c.get("documentActor").platform) return error(c, "forbidden", 403);
  return c.json({
    data: (
      await c.env.DB.prepare(
        "SELECT h.id,h.title,h.category,h.status,h.revision,h.client_id,h.project_id,l.document_id FROM hub_documents h LEFT JOIN document_legacy_links l ON l.source_kind='hub' AND l.source_id=h.id ORDER BY h.updated_at DESC LIMIT 200",
      ).all()
    ).results,
  });
});
documentCenterRouter.get("/api/documents", async (c) => {
  const a = c.get("documentActor"),
    filter = documentVisibility(a),
    values: (string | number)[] = [...filter.values],
    conditions = [filter.sql];
  if (c.req.query("state") === "Arhivat" || c.req.query("archived") === "1")
    conditions.push("d.archived_at IS NOT NULL");
  else if (c.req.query("archived") !== "all")
    conditions.push("d.archived_at IS NULL");
  for (const [query, column] of [
    ["client", "beneficiary_id"],
    ["collection", "collection"],
    ["scope", "scope"],
  ] as const) {
    const value = c.req.query(query);
    if (value) {
      conditions.push(`d.${column}=?`);
      values.push(value);
    }
  }
  for (const [query, column] of [
    ["project", "project_id"],
    ["service", "service_id"],
    ["subscription", "subscription_id"],
    ["product", "product_slug"],
    ["catalog", "catalog_id"],
    ["order", "order_id"],
    ["entitlement", "entitlement_id"],
    ["billing_subscription", "billing_subscription_id"],
  ] as const) {
    const value = c.req.query(query);
    if (value) {
      conditions.push(
        `EXISTS(SELECT 1 FROM document_assignments x WHERE x.document_id=d.id AND x.${column}=?)`,
      );
      values.push(value);
    }
  }
  const search = c.req.query("q")?.trim().slice(0, 200);
  if (search) {
    const tokens = search.match(/[\p{L}\p{N}]+/gu)?.slice(0, 12) || [];
    const searchIndexQuery = tokens.length
      ? tokens.map((token) => `"${token}"*`).join(" AND ")
      : '"___empty_document_query___"';
    conditions.push(
      `(EXISTS(SELECT 1 FROM document_search_index WHERE document_search_index.version_id=v.id AND document_search_index MATCH ?) OR d.number LIKE ? ESCAPE '\\' OR cl.company_name LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM document_assignments x LEFT JOIN projects p ON p.id=x.project_id LEFT JOIN services sv ON sv.id=x.service_id WHERE x.document_id=d.id AND (p.name LIKE ? ESCAPE '\\' OR sv.service_name LIKE ? ESCAPE '\\')))`,
    );
    const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    values.push(searchIndexQuery, term, term, term, term);
  }
  const family = c.req.query("family");
  if (family === "custom") conditions.push("d.template_version_id IS NULL");
  else if (family) {
    conditions.push(
      "EXISTS(SELECT 1 FROM document_template_versions tv JOIN document_templates t ON t.id=tv.template_id WHERE tv.id=d.template_version_id AND t.family=?)",
    );
    values.push(family.slice(0, 80));
  }
  const offset = Math.max(
    0,
    Math.min(100000, Number(c.req.query("offset")) || 0),
  );
  const sort =
    c.req.query("sort") === "title"
      ? "title COLLATE NOCASE ASC"
      : c.req.query("sort") === "number"
        ? "d.number DESC,d.id"
        : "d.updated_at DESC,d.id";
  const view =
    a.staff || a.platform ? "d.current_version_id" : "d.published_version_id";
  const state = c.req.query("state");
  if (state === "Publicat")
    conditions.push(`d.archived_at IS NULL AND d.published_version_id=${view}`);
  else if (state === "Aprobat")
    conditions.push(
      `d.archived_at IS NULL AND d.published_version_id IS NOT ${view} AND EXISTS(SELECT 1 FROM document_approvals sa WHERE sa.version_id=v.id)`,
    );
  else if (state === "Ciornă")
    conditions.push(
      `d.archived_at IS NULL AND d.published_version_id IS NOT ${view} AND NOT EXISTS(SELECT 1 FROM document_approvals sa WHERE sa.version_id=v.id)`,
    );
  const where = conditions.join(" AND ");
  const [list, count] = await Promise.all([
    c.env.DB.prepare(
      `SELECT d.*,json_extract(v.payload_json,'$.title') title,cl.company_name,ap.id approved,(SELECT t.family FROM document_template_versions tv JOIN document_templates t ON t.id=tv.template_id WHERE tv.id=d.template_version_id) template_family, (SELECT count(*) FROM document_files f WHERE f.document_id=d.id AND f.version_id=v.id AND f.scan_status<>'rejected') file_count FROM documents d JOIN document_versions v ON v.id=${view} LEFT JOIN clients cl ON cl.id=d.beneficiary_id LEFT JOIN document_approvals ap ON ap.version_id=v.id WHERE ${where} ORDER BY ${sort} LIMIT 50 OFFSET ?`,
    )
      .bind(...values, offset)
      .all(),
    c.env.DB.prepare(
      `SELECT count(*) total FROM documents d JOIN document_versions v ON v.id=${view} LEFT JOIN clients cl ON cl.id=d.beneficiary_id WHERE ${where}`,
    )
      .bind(...values)
      .first(),
  ]);
  return c.json({
    data:
      a.staff || a.platform
        ? list.results
        : list.results.map((row) => ({
            id: row.id,
            number: row.number,
            title: row.title,
            scope: "client",
            collection: row.collection,
            beneficiary_id: row.beneficiary_id,
            company_name: row.company_name,
            current_version_id: row.published_version_id,
            published_version_id: row.published_version_id,
            archived_at: row.archived_at,
            approved: row.approved,
            updated_at: row.updated_at,
            legal: row.legal,
            template_family: row.template_family,
          })),
    total: count?.total || 0,
    offset,
    nextOffset: list.results.length === 50 ? offset + 50 : null,
  });
});

documentCenterRouter.post("/api/documents", async (c) => {
  const body = createSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return error(c, "invalid_document");
  const b = body.data,
    a = c.get("documentActor");
  const org = b.beneficiaryId
    ? (
        await c.env.DB.prepare(
          "SELECT organization_id FROM client_organizations WHERE client_id=?",
        )
          .bind(b.beneficiaryId)
          .first<{ organization_id: string }>()
      )?.organization_id || null
    : null;
  if (!a.staff || !permission(c, "documents.create", org))
    return error(c, "forbidden", 403);
  if (b.scope === "company" && !permission(c, "documents.company.owner"))
    return error(c, "forbidden", 403);
  if (b.scope === "company" && (b.beneficiaryId || b.collection !== "library"))
    return error(c, "invalid_company_scope");
  if (b.scope === "client" && !b.beneficiaryId)
    return error(c, "beneficiary_required");
  if (!(await embeddedImagesAllowed(c, b.payload)))
    return error(c, "image_quarantine_required", 423);
  if (!(await commercialSnapshotValid(c, b.payload)))
    return error(c, "catalog_snapshot_mismatch", 409);
  if (
    b.beneficiaryId &&
    !(await beneficiaryAllowed(c.env.DB, a, b.beneficiaryId))
  )
    return error(c, "forbidden", 403);
  let legal = b.legal ? 1 : 0;
  if (b.templateVersionId) {
    const filter = templateVisibility(c);
    const t = await c.env.DB.prepare(
      `SELECT t.legal FROM document_template_versions v JOIN document_templates t ON t.id=v.template_id WHERE v.id=? AND v.review_status<>'retired' AND ${filter.sql} AND (t.visibility='shared' OR v.review_status='approved')`,
    )
      .bind(b.templateVersionId, ...filter.values)
      .first<{ legal: number }>();
    if (!t) return error(c, "template_unavailable");
    legal = t.legal || legal;
  }
  const id = uid(),
    vid = uid(),
    time = stamp(),
    number = `AVY-${new Date(time).getUTCFullYear()}-${id.slice(0, 8).toUpperCase()}`;
  const statements = await assignmentStatements(
    c,
    { id, beneficiary_id: b.beneficiaryId },
    b.assignments,
  );
  return write(c, { id, number, versionId: vid }, [
    c.env.DB.prepare(
      "INSERT INTO documents(id,number,scope,collection,beneficiary_id,organization_id,template_version_id,legal,current_version_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      id,
      number,
      b.scope,
      b.collection,
      b.beneficiaryId,
      org,
      b.templateVersionId,
      legal,
      vid,
      a.id,
      time,
      time,
    ),
    await versionStatement(c, id, vid, b.payload),
    c.env.DB.prepare(
      "INSERT INTO document_access_policies(document_id) VALUES(?)",
    ).bind(id),
    ...statements,
    audit(c, id, "created", vid),
  ]);
});

// Reuse operation_notifications. A revoked document never leaves a discoverable notice.
const noticeJoin = `JOIN documents d ON n.deduplication_key='document:'||d.id||':'||d.published_version_id OR EXISTS(SELECT 1 FROM document_shares s WHERE s.document_id=d.id AND n.deduplication_key='document-share:'||s.id)`;
documentCenterRouter.get("/api/documents/notices", async (c) => {
  const visibility = documentVisibility(c.get("documentActor"));
  const result = await c.env.DB.prepare(
    `SELECT DISTINCT n.id,n.title,n.body,n.destination,n.read_at,n.created_at FROM operation_notifications n ${noticeJoin} WHERE n.user_id=? AND n.destination='documents' AND ${visibility.sql} ORDER BY n.created_at DESC LIMIT 100`,
  )
    .bind(c.get("userId"), ...visibility.values)
    .all();
  return c.json({ data: result.results });
});
documentCenterRouter.post(
  "/api/documents/notices/:noticeId/read",
  async (c) => {
    const visibility = documentVisibility(c.get("documentActor"));
    const row = await c.env.DB.prepare(
      `SELECT n.id FROM operation_notifications n ${noticeJoin} WHERE n.id=? AND n.user_id=? AND n.destination='documents' AND ${visibility.sql} LIMIT 1`,
    )
      .bind(c.req.param("noticeId"), c.get("userId"), ...visibility.values)
      .first();
    if (!row) return error(c, "not_found", 404);
    return write(c, { ok: true }, [
      c.env.DB.prepare(
        "UPDATE operation_notifications SET read_at=? WHERE id=? AND user_id=?",
      ).bind(stamp(), c.req.param("noticeId"), c.get("userId")),
    ]);
  },
);
documentCenterRouter.get("/api/documents/:id", async (c) => {
  const d = await current(c, c.req.param("id"));
  if (!d) return error(c, "not_found", 404);
  const version = await readVersion(c, d, c.req.query("version"));
  if (!version) return error(c, "not_found", 404);
  const a = c.get("documentActor"),
    isInternal = a.staff || a.platform;
  const [versions, assignments, files, events, shares, approvals, grants] =
    await Promise.all([
      c.env.DB.prepare(
        `SELECT v.id,v.version,v.created_at,ap.approved_by,ap.created_at approved_at FROM document_versions v LEFT JOIN document_approvals ap ON ap.version_id=v.id WHERE v.document_id=? ${isInternal ? "" : "AND EXISTS(SELECT 1 FROM document_version_publications e WHERE e.version_id=v.id AND e.document_id=v.document_id AND e.user_id=?)"} ORDER BY v.version DESC LIMIT 100`,
      )
        .bind(d.id, ...(isInternal ? [] : [c.get("userId")]))
        .all(),
      c.env.DB.prepare("SELECT * FROM document_assignments WHERE document_id=?")
        .bind(d.id)
        .all(),
      c.env.DB.prepare(
        "SELECT id,kind,file_name,content_type,size_bytes,scan_status,version_id FROM document_files WHERE document_id=? AND version_id=? AND (expires_at IS NULL OR expires_at>?)",
      )
        .bind(d.id, version.id, stamp())
        .all(),
      isInternal
        ? c.env.DB.prepare(
            "SELECT id,action,version_id,created_at FROM document_audit_events WHERE document_id=? ORDER BY created_at DESC LIMIT 100",
          )
            .bind(d.id)
            .all()
        : Promise.resolve({ results: [] }),
      isInternal
        ? c.env.DB.prepare(
            "SELECT s.id,s.channel,s.status,s.version_id,s.created_at,s.error_code,s.provider_id,sender.email actor_email,recipient.email recipient_email FROM document_shares s JOIN users sender ON sender.id=s.actor_id JOIN users recipient ON recipient.id=s.recipient_user_id WHERE s.document_id=? ORDER BY s.created_at DESC LIMIT 100",
          )
            .bind(d.id)
            .all()
        : Promise.resolve({ results: [] }),
      c.env.DB.prepare(
        "SELECT version_id,approved_by,legal_review_reference,created_at FROM document_approvals WHERE document_id=? AND version_id=?",
      )
        .bind(d.id, version.id)
        .all(),
      isInternal
        ? c.env.DB.prepare(
            "SELECT user_id,can_edit,can_share,revoked_at FROM document_access_grants WHERE document_id=?",
          )
            .bind(d.id)
            .all()
        : Promise.resolve({ results: [] }),
    ]);
  const actions: Record<string, boolean> = {};
  for (const p of [
    "edit",
    "approve",
    "publish",
    "export",
    "share",
    "delete",
    "backups.manage",
  ])
    actions[p] = await documentActionAllowed(
      c.env.DB,
      a,
      d,
      `documents.${p}` as DocumentPermission,
    );
  await c.env.DB.batch([audit(c, d.id, "read", version.id)]);
  return c.json({
    document: isInternal
      ? d
      : {
          id: d.id,
          number: d.number,
          scope: d.scope,
          revision: d.revision,
          published_version_id: d.published_version_id,
          archived_at: d.archived_at,
        },
    version: {
      ...version,
      payload: JSON.parse(version.payload_json),
      payload_json: undefined,
    },
    versions: versions.results,
    assignments: assignments.results,
    files: files.results,
    events: events.results,
    shares: shares.results,
    approvals: isInternal
      ? approvals.results
      : approvals.results.map(() => ({ approved: true })),
    grants: grants.results,
    actions: {
      ...actions,
      "billing.prepare":
        d.scope === "client" &&
        !d.archived_at &&
        (await canPrepareDocumentBilling(c)),
    },
    billingPreparation: await documentBillingLink(c, d.id, version.id),
    issues: documentIssues(
      JSON.parse(version.payload_json),
      await requiredFields(c, d),
    ),
  });
});
documentCenterRouter.put("/api/documents/:id", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.edit");
  if (!d) return error(c, "not_found", 404);
  if (d.archived_at) return error(c, "archived_document", 409);
  const parsed = mutableSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return error(c, "invalid_document");
  if (!(await embeddedImagesAllowed(c, parsed.data.payload, d.id)))
    return error(c, "image_quarantine_required", 423);
  if (!(await commercialSnapshotValid(c, parsed.data.payload, d)))
    return error(c, "catalog_snapshot_mismatch", 409);
  const id = uid();
  return write(
    c,
    { id: d.id, versionId: id, revision: parsed.data.revision + 1 },
    [
      cas(c, d, parsed.data.revision),
      await versionStatement(c, d.id, id, parsed.data.payload),
      c.env.DB.prepare(
        "UPDATE documents SET current_version_id=? WHERE id=?",
      ).bind(id, d.id),
      audit(c, d.id, "version.created", id),
    ],
  );
});
documentCenterRouter.post("/api/documents/:id/approve", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.approve");
  if (!d) return error(c, "not_found", 404);
  const b = z
    .object({
      revision: z.number().int().positive(),
      legalReviewReference: z.string().trim().max(1000).default(""),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "invalid_input");
  const v = await readVersion(c, d);
  if (!v) return error(c, "not_found", 404);
  const issues = documentIssues(
    JSON.parse(v.payload_json),
    await requiredFields(c, d),
  );
  if (issues.length)
    return c.json(
      {
        error: {
          code: "verification_required",
          message: "Documentul are informații lipsă.",
        },
        issues,
      },
      409,
    );
  if (d.archived_at) return error(c, "archived_document", 409);
  if (d.legal) {
    if (!b.data.legalReviewReference)
      return error(c, "legal_review_required", 409);
    const master = await c.env.DB.prepare(
      "SELECT review_status FROM document_template_versions WHERE id=?",
    )
      .bind(d.template_version_id)
      .first<{ review_status: string }>();
    if (d.template_version_id && master?.review_status !== "approved")
      return error(c, "legal_master_review_required", 409);
  }
  return write(c, { ok: true }, [
    cas(c, d, b.data.revision),
    c.env.DB.prepare(
      "INSERT INTO document_approvals(id,document_id,version_id,approved_by,legal_review_reference,created_at) VALUES(?,?,?,?,?,?)",
    ).bind(
      uid(),
      d.id,
      v.id,
      c.get("userId"),
      b.data.legalReviewReference || null,
      stamp(),
    ),
    audit(c, d.id, "approved", v.id),
  ]);
});
documentCenterRouter.post("/api/documents/:id/publish", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.publish");
  if (!d) return error(c, "not_found", 404);
  const b = z
    .object({
      revision: z.number().int().positive(),
      recipients: z.array(z.string().min(1).max(150)).min(1).max(30),
      allowClientShare: z.boolean().default(false),
      allowAttachments: z.boolean().default(false),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "invalid_input");
  if (d.scope !== "client" || !d.beneficiary_id || d.archived_at)
    return error(c, "client_document_required", 409);
  if (
    !(await c.env.DB.prepare(
      "SELECT 1 FROM document_approvals WHERE version_id=?",
    )
      .bind(d.current_version_id)
      .first())
  )
    return error(c, "approval_required", 409);
  const statements: D1PreparedStatement[] = [cas(c, d, b.data.revision)];
  for (const userId of [...new Set(b.data.recipients)]) {
    const recipient = await documentActor(c.env.DB, userId);
    if (!recipient) return error(c, "recipient_not_authorized", 403);
    const scope = await c.env.DB.prepare(
      `SELECT 1 FROM client_account_access WHERE client_id=? AND user_id=? UNION ALL SELECT 1 FROM client_organizations co JOIN organization_memberships om ON om.organization_id=co.organization_id JOIN organizations o ON o.id=co.organization_id WHERE co.client_id=? AND om.user_id=? AND om.status='active' AND o.status='active' LIMIT 1`,
    )
      .bind(d.beneficiary_id, userId, d.beneficiary_id, userId)
      .first();
    if (!scope) return error(c, "recipient_not_authorized", 403);
    statements.push(
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO document_version_publications(document_id,version_id,user_id,created_at) VALUES(?,?,?,?)",
      ).bind(d.id, d.current_version_id, userId, stamp()),
      c.env.DB.prepare(
        "INSERT INTO document_access_grants(document_id,user_id,can_share,granted_by,created_at) VALUES(?,?,?,?,?) ON CONFLICT(document_id,user_id) DO UPDATE SET can_share=excluded.can_share,revoked_at=NULL,granted_by=excluded.granted_by,created_at=excluded.created_at",
      ).bind(
        d.id,
        userId,
        b.data.allowClientShare ? 1 : 0,
        c.get("userId"),
        stamp(),
      ),
    );
    statements.push(
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at) VALUES(?,?,?,'Document disponibil','Un document nou este disponibil în contul tău.','documents',?)",
      ).bind(
        uid(),
        userId,
        `document:${d.id}:${d.current_version_id}`,
        stamp(),
      ),
    );
  }
  statements.push(
    c.env.DB.prepare(
      "UPDATE documents SET published_version_id=current_version_id WHERE id=?",
    ).bind(d.id),
    c.env.DB.prepare(
      "UPDATE document_access_policies SET allow_client_share=?,allow_attachments=? WHERE document_id=?",
    ).bind(
      b.data.allowClientShare ? 1 : 0,
      b.data.allowAttachments ? 1 : 0,
      d.id,
    ),
    audit(c, d.id, "published", d.current_version_id),
  );
  return write(c, { ok: true }, statements);
});

documentCenterRouter.get("/api/documents/:id/recipients", async (c) => {
  const d =
    (await current(c, c.req.param("id"), "documents.share")) ||
    (await current(c, c.req.param("id"), "documents.publish"));
  if (!d) return error(c, "not_found", 404);
  if (!c.get("documentActor").staff && !c.get("documentActor").platform) {
    const peers = await c.env.DB.prepare(
      `SELECT DISTINCT u.id,u.email,u.display_name FROM users u JOIN document_access_grants g ON g.user_id=u.id AND g.document_id=? AND g.revoked_at IS NULL JOIN document_version_publications vp ON vp.user_id=u.id AND vp.document_id=g.document_id AND vp.version_id=? WHERE u.email_verified=1 AND u.disabled_at IS NULL AND (EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=? AND ca.user_id=u.id) OR EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships om ON om.organization_id=co.organization_id JOIN organizations o ON o.id=co.organization_id WHERE co.client_id=? AND om.user_id=u.id AND om.status='active' AND o.status='active')) ORDER BY u.email LIMIT 100`,
    )
      .bind(d.id, d.published_version_id, d.beneficiary_id, d.beneficiary_id)
      .all();
    return c.json({ data: peers.results });
  }
  const result = await c.env.DB.prepare(
    `SELECT DISTINCT u.id,u.email,u.display_name FROM users u WHERE u.email_verified=1 AND u.disabled_at IS NULL AND (EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.user_id=u.id AND ca.client_id=?) OR EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships om ON om.organization_id=co.organization_id JOIN organizations o ON o.id=co.organization_id WHERE co.client_id=? AND om.user_id=u.id AND om.status='active' AND o.status='active') OR EXISTS(SELECT 1 FROM platform_principals pp JOIN user_roles ur ON ur.user_id=u.id AND ur.role='admin' WHERE pp.email=u.email COLLATE NOCASE AND pp.status='active' AND (pp.role IN('platform_owner','superadmin') OR ?<>'company' OR EXISTS(SELECT 1 FROM user_capabilities pc WHERE pc.user_id=u.id AND pc.capability='documents.company.owner' AND pc.organization_id IS NULL AND pc.revoked_at IS NULL AND (pc.expires_at IS NULL OR pc.expires_at>?))))) ORDER BY u.email LIMIT 100`,
  )
    .bind(d.beneficiary_id, d.beneficiary_id, d.scope, stamp())
    .all();
  return c.json({ data: result.results });
});
documentCenterRouter.post("/api/documents/:id/access", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.publish");
  if (!d) return error(c, "not_found", 404);
  const b = z
    .object({
      revision: z.number().int().positive(),
      userId: z.string().min(1).max(150),
      revoke: z.boolean(),
      canEdit: z.boolean().default(false),
      canShare: z.boolean().default(false),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "invalid_input");
  if (
    !b.data.revoke &&
    (!c.get("documentActor").platform || d.scope === "company")
  )
    return error(c, "forbidden", 403);
  const actor = await documentActor(c.env.DB, b.data.userId);
  if (!actor || (!b.data.revoke && !actor.staff))
    return error(c, "forbidden", 403);
  if (
    !b.data.revoke &&
    d.beneficiary_id &&
    !(await beneficiaryAllowed(c.env.DB, actor, d.beneficiary_id))
  )
    return error(c, "assignment_scope_denied", 403);
  return write(c, { ok: true }, [
    cas(c, d, b.data.revision),
    b.data.revoke
      ? c.env.DB.prepare(
          "UPDATE document_access_grants SET revoked_at=? WHERE document_id=? AND user_id=?",
        ).bind(stamp(), d.id, b.data.userId)
      : c.env.DB.prepare(
          "INSERT INTO document_access_grants(document_id,user_id,can_edit,can_share,granted_by,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(document_id,user_id) DO UPDATE SET can_edit=excluded.can_edit,can_share=excluded.can_share,revoked_at=NULL",
        ).bind(
          d.id,
          b.data.userId,
          b.data.canEdit ? 1 : 0,
          b.data.canShare ? 1 : 0,
          c.get("userId"),
          stamp(),
        ),
    audit(c, d.id, b.data.revoke ? "access.revoked" : "access.granted", null, {
      userId: b.data.userId,
    }),
  ]);
});

documentCenterRouter.post("/api/documents/:id/assign", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.edit");
  if (!d) return error(c, "not_found", 404);
  const b = z
    .object({
      revision: z.number().int().positive(),
      assignments: z.array(assignmentSchema).max(30),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "invalid_input");
  return write(c, { ok: true }, [
    cas(c, d, b.data.revision),
    ...(await assignmentStatements(c, d, b.data.assignments)),
    audit(c, d.id, "assigned"),
  ]);
});
documentCenterRouter.post("/api/documents/:id/archive", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.delete");
  if (!d) return error(c, "not_found", 404);
  const b = z
    .object({ revision: z.number().int().positive(), archived: z.boolean() })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "invalid_input");
  return write(c, { ok: true }, [
    cas(c, d, b.data.revision),
    c.env.DB.prepare("UPDATE documents SET archived_at=? WHERE id=?").bind(
      b.data.archived ? stamp() : null,
      d.id,
    ),
    audit(c, d.id, b.data.archived ? "archived" : "restored"),
  ]);
});

documentCenterRouter.post("/api/documents/:id/duplicate", async (c) => {
  const d = await current(c, c.req.param("id"));
  if (!d || !permission(c, "documents.create") || !c.get("documentActor").staff)
    return error(c, "not_found", 404);
  const v = await readVersion(c, d);
  if (!v) return error(c, "not_found", 404);
  const id = uid(),
    vid = uid(),
    time = stamp(),
    payload = {
      ...JSON.parse(v.payload_json),
      title: `Copie — ${JSON.parse(v.payload_json).title}`,
    } as DocumentPayload;
  const assignments = (
    await c.env.DB.prepare(
      "SELECT * FROM document_assignments WHERE document_id=?",
    )
      .bind(d.id)
      .all()
  ).results;
  return write(c, { id }, [
    c.env.DB.prepare(
      "INSERT INTO documents(id,number,scope,collection,beneficiary_id,organization_id,template_version_id,legal,current_version_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      id,
      `AVY-${new Date(time).getUTCFullYear()}-${id.slice(0, 8).toUpperCase()}`,
      d.scope,
      d.collection,
      d.beneficiary_id,
      d.organization_id,
      d.template_version_id,
      d.legal,
      vid,
      c.get("userId"),
      time,
      time,
    ),
    await versionStatement(c, id, vid, payload),
    c.env.DB.prepare(
      "INSERT INTO document_access_policies(document_id) VALUES(?)",
    ).bind(id),
    ...assignments.map((row) => {
      const col = Object.values(assignmentColumns).find((col) => row[col]);
      return c.env.DB.prepare(
        `INSERT INTO document_assignments(id,document_id,${col},created_by,created_at) VALUES(?,?,?,?,?)`,
      ).bind(uid(), id, row[col!], c.get("userId"), time);
    }),
    audit(c, id, "duplicated", vid, { sourceDocument: d.id }),
  ]);
});

const templateEdit = z
  .object({
    name: z.string().min(1).max(200),
    payload: payloadSchema,
    required: z.array(z.string().min(1).max(100)).max(100),
    legal: z.boolean(),
  })
  .strict();
documentCenterRouter.post(
  "/api/documents/templates/:id/versions",
  async (c) => {
    if (!permission(c, "documents.templates.manage"))
      return error(c, "forbidden", 403);
    const b = templateEdit.safeParse(await c.req.json().catch(() => null));
    if (!b.success) return error(c, "invalid_template");
    const filter = templateVisibility(c);
    const id = c.req.param("id"),
      exists = await c.env.DB.prepare(
        `SELECT t.id,t.legal FROM document_templates t WHERE t.id=? AND ${filter.sql}`,
      )
        .bind(id, ...filter.values)
        .first<{ id: string; legal: number }>();
    if (!exists) return error(c, "not_found", 404);
    const vid = uid();
    return write(c, { id, versionId: vid }, [
      c.env.DB.prepare(
        "INSERT INTO document_template_versions(id,template_id,version,payload_json,required_fields_json,created_at) VALUES(?,?,(SELECT max(version)+1 FROM document_template_versions WHERE template_id=?),?,?,?)",
      ).bind(
        vid,
        id,
        id,
        JSON.stringify(b.data.payload),
        JSON.stringify(b.data.required),
        stamp(),
      ),
      c.env.DB.prepare("UPDATE document_templates SET name=? WHERE id=?").bind(
        b.data.name,
        id,
      ),
    ]);
  },
);
documentCenterRouter.post("/api/documents/templates/:id/review", async (c) => {
  if (
    !permission(c, "documents.templates.manage") ||
    !permission(c, "documents.approve")
  )
    return error(c, "forbidden", 403);
  const b = z
    .object({ reference: z.string().trim().min(8).max(1000) })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "review_reference_required");
  const filter = templateVisibility(c);
  if (
    !(await c.env.DB.prepare(
      `SELECT 1 FROM document_template_versions v JOIN document_templates t ON t.id=v.template_id WHERE v.id=? AND ${filter.sql}`,
    )
      .bind(c.req.param("id"), ...filter.values)
      .first())
  )
    return error(c, "not_found", 404);
  return write(c, { ok: true }, [
    c.env.DB.prepare(
      "UPDATE document_template_versions SET review_status='approved',reviewed_by=?,reviewed_at=? WHERE id=? AND review_status='review_required'",
    ).bind(c.get("userId"), stamp(), c.req.param("id")),
    c.env.DB.prepare(
      "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user','documents.template.reviewed',?,'allowed','info',?,?)",
    ).bind(
      uid(),
      c.get("userId"),
      c.req.param("id"),
      JSON.stringify({ reference: b.data.reference }),
      stamp(),
    ),
  ]);
});
documentCenterRouter.post("/api/documents/:id/save-template", async (c) => {
  const d = await current(c, c.req.param("id"));
  if (!d || !permission(c, "documents.templates.manage"))
    return error(c, "not_found", 404);
  if (d.scope === "company") return error(c, "company_template_forbidden", 403);
  const v = await readVersion(c, d);
  if (!v) return error(c, "not_found", 404);
  const id = uid(),
    vid = uid();
  return write(c, { id, versionId: vid }, [
    c.env.DB.prepare(
      "INSERT INTO document_templates(id,family,name,legal,visibility,source_document_id,created_at) VALUES(?,?,?,?,'private_proposal',?,?)",
    ).bind(
      id,
      "custom",
      "Model personalizat · " + d.number,
      d.legal,
      d.id,
      stamp(),
    ),
    c.env.DB.prepare(
      "INSERT INTO document_template_versions(id,template_id,version,payload_json,required_fields_json,created_at) VALUES(?,?,1,?,?,?)",
    ).bind(
      vid,
      id,
      JSON.stringify(reusableTemplate(JSON.parse(v.payload_json))),
      JSON.stringify(await requiredFields(c, d)),
      stamp(),
    ),
    audit(c, d.id, "template.proposed", v.id),
  ]);
});

documentCenterRouter.put("/api/documents/settings/company", async (c) => {
  if (!c.get("documentActor").platform)
    return error(c, "forbidden", 403);
  const schema = z
    .object({
      legal_name: z.string().min(1).max(200),
      tax_id: z.string().max(100),
      registration_number: z.string().max(100),
      address: z.string().max(1000),
      registered_address: z.string().max(1000).optional(),
      representative: z.string().max(240),
      contact_email: z.string().email().max(254),
      share_capital: z.string().max(120).optional(),
    })
    .strict();
  const b = schema.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "invalid_input");
  return write(c, { ok: true }, [
    c.env.DB.prepare(
      "UPDATE document_company_profile SET legal_name=?,tax_id=?,registration_number=?,address=?,registered_address=COALESCE(?,registered_address),representative=?,contact_email=?,share_capital=COALESCE(?,share_capital),updated_by=?,updated_at=? WHERE id='avyron'",
    ).bind(b.data.legal_name,b.data.tax_id,b.data.registration_number,b.data.address,b.data.registered_address ?? null,b.data.representative,b.data.contact_email,b.data.share_capital ?? null,c.get("userId"),stamp()),
  ]);
});
documentCenterRouter.put("/api/documents/settings/client/:id", async (c) => {
  const id = c.req.param("id"),
    a = c.get("documentActor");
  if (
    !a.staff ||
    !permission(c, "documents.create") ||
    !(await beneficiaryAllowed(c.env.DB, a, id))
  )
    return error(c, "forbidden", 403);
  const b = z
    .object({
      entity_type: z.string().min(1).max(80),
      legal_name: z.string().min(1).max(240),
      tax_id: z.string().max(100),
      registration_number: z.string().max(100),
      address: z.string().max(1000),
      representative: z.string().max(240),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "invalid_input");
  return write(c, { ok: true }, [
    c.env.DB.prepare(
      "INSERT INTO client_legal_profiles(client_id,entity_type,legal_name,tax_id,registration_number,address,representative,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(client_id) DO UPDATE SET entity_type=excluded.entity_type,legal_name=excluded.legal_name,tax_id=excluded.tax_id,registration_number=excluded.registration_number,address=excluded.address,representative=excluded.representative,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
    ).bind(id, ...Object.values(b.data), a.id, stamp()),
  ]);
});

documentCenterRouter.post("/api/documents/legacy-hub/:id/import", async (c) => {
  if (!c.get("documentActor").platform || !permission(c, "documents.create"))
    return error(c, "forbidden", 403);
  const old = await c.env.DB.prepare("SELECT * FROM hub_documents WHERE id=?")
    .bind(c.req.param("id"))
    .first();
  if (!old) return error(c, "not_found", 404);
  const linked = await c.env.DB.prepare(
    "SELECT document_id FROM document_legacy_links WHERE source_kind='hub' AND source_id=?",
  )
    .bind(old.id)
    .first();
  if (linked) return c.json({ id: linked.document_id });
  const id = uid(),
    vid = uid(),
    time = stamp(),
    payload = {
      ...blankPayload(String(old.title)),
      body: {
        type: "doc",
        content: String(old.content_text).split("\n").map(paragraph),
      },
    } as DocumentPayload;
  return write(c, { id }, [
    c.env.DB.prepare(
      "INSERT INTO documents(id,number,scope,collection,beneficiary_id,legal,current_version_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      id,
      `AVY-${new Date(time).getUTCFullYear()}-${id.slice(0, 8).toUpperCase()}`,
      old.client_id ? "client" : "internal",
      "hub",
      old.client_id || null,
      old.category === "contract" ? 1 : 0,
      vid,
      c.get("userId"),
      time,
      time,
    ),
    await versionStatement(c, id, vid, payload),
    c.env.DB.prepare(
      "INSERT INTO document_access_policies(document_id) VALUES(?)",
    ).bind(id),
    c.env.DB.prepare(
      "INSERT INTO document_legacy_links(document_id,source_kind,source_id) VALUES(?,'hub',?)",
    ).bind(id, old.id),
    ...(old.r2_key && old.size_bytes
      ? [
          c.env.DB.prepare(
            "INSERT INTO document_files(id,document_id,version_id,kind,object_key,file_name,content_type,sha256,size_bytes,scan_status,created_at) VALUES(?,?,?,'import',?,?,?,?,?,'quarantined',?)",
          ).bind(
            uid(),
            id,
            vid,
            old.r2_key,
            old.file_name || "legacy",
            old.content_type || "application/octet-stream",
            "legacy_unverified",
            old.size_bytes,
            time,
          ),
        ]
      : []),
    audit(c, id, "legacy.imported", vid),
  ]);
});

const digestBytes = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
async function generatedFile(
  c: Ctx,
  d: DocumentRow,
  version: NonNullable<Awaited<ReturnType<typeof readVersion>>>,
  format: "pdf" | "docx",
) {
  if (c.env.DOCUMENT_STORAGE_PRIVACY_VERIFIED !== "true")
    throw new Error("document_storage_unverified");
  const payload: DocumentPayload = JSON.parse(version.payload_json);
  const modern = isModernDocument(payload);
  const rendererVersion = documentRenderer(payload);
  const approved = !!(await c.env.DB.prepare(
    "SELECT 1 FROM document_approvals WHERE version_id=?",
  )
    .bind(version.id)
    .first());
  const known = await c.env.DB.prepare(
    "SELECT id,object_key,file_name,content_type FROM document_files WHERE version_id=? AND kind=? AND renderer_version=? AND scan_status='clean_generated' AND (expires_at IS NULL OR expires_at>?) AND ((?=1 AND expires_at IS NULL) OR (?=0 AND expires_at IS NOT NULL)) ORDER BY created_at DESC LIMIT 1",
  )
    .bind(version.id, format, rendererVersion, stamp(), approved ? 1 : 0, approved ? 1 : 0)
    .first<{
      id: string;
      object_key: string;
      file_name: string;
      content_type: string;
    }>();
  if (known) {
    const obj = await c.env.FILES.get(known.object_key);
    if (obj) return { ...known, object: obj };
  }
  const expired = await c.env.DB.prepare(
    "SELECT id,object_key FROM document_files WHERE version_id=? AND kind=? AND scan_status='clean_generated' AND expires_at IS NOT NULL AND expires_at<=?",
  )
    .bind(version.id, format, stamp())
    .all<{ id: string; object_key: string }>();
  for (const old of expired.results) {
    await c.env.FILES.delete(old.object_key);
    await c.env.DB.prepare(
      "DELETE FROM document_files WHERE id=? AND expires_at IS NOT NULL AND expires_at<=?",
    )
      .bind(old.id, stamp())
      .run();
  }
  if (!c.env.DOCUMENT_EXPORTS)
    throw new Error("document_export_runtime_unconfigured");
  const renderer = c.env.DOCUMENT_EXPORTS.getByName(
    `${version.id}:${format}:${approved ? "final" : "draft"}${modern ? `:${rendererVersion}` : ""}`,
  );
  const bytes = await renderer.render(
    payload,
    d.number,
    version.version,
    format,
    !approved,
  );
  if (bytes.length > 15 * 1024 * 1024) throw new Error("export_too_large");
  const id = uid(),
    objectKey = `documents/${d.id}/exports/${id}`,
    name = `${d.number.replace(/[^A-Za-z0-9-]/g, "")}-v${version.version}.${format}`,
    ct =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  await c.env.FILES.put(objectKey, bytes, {
    httpMetadata: { contentType: ct },
    ...(modern ? { customMetadata: { documentRenderer: rendererVersion } } : {}),
  });
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO document_files(id,document_id,version_id,kind,object_key,file_name,content_type,sha256,size_bytes,scan_status,expires_at,created_at,renderer_version) VALUES(?,?,?,?,?,?,?,?,?,'clean_generated',?,?,?)",
      ).bind(
        id,
        d.id,
        version.id,
        format,
        objectKey,
        name,
        ct,
        await digestBytes(bytes),
        bytes.length,
        approved ? null : stamp() + 86400000,
        stamp(),
        rendererVersion,
      ),
      audit(c, d.id, "export.created", version.id, { format }),
    ]);
  } catch (cause) {
    await c.env.FILES.delete(objectKey);
    if (/UNIQUE constraint failed/.test(String(cause))) {
      const winner = await c.env.DB.prepare(
        "SELECT id,object_key,file_name,content_type FROM document_files WHERE version_id=? AND kind=? AND renderer_version=? AND scan_status='clean_generated' AND ((?=1 AND expires_at IS NULL) OR (?=0 AND expires_at>?))",
      )
        .bind(version.id, format, rendererVersion, approved ? 1 : 0, approved ? 1 : 0, stamp())
        .first<{
          id: string;
          object_key: string;
          file_name: string;
          content_type: string;
        }>();
      if (winner) {
        const object = await c.env.FILES.get(winner.object_key);
        if (object) return { ...winner, object };
      }
    }
    throw cause;
  }
  const object = await c.env.FILES.get(objectKey);
  if (!object) throw new Error("export_missing");
  return {
    id,
    object_key: objectKey,
    file_name: name,
    content_type: ct,
    object,
  };
}
documentCenterRouter.get("/api/documents/:id/export/:format", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.export");
  if (!d) return error(c, "not_found", 404);
  if (c.env.DOCUMENT_STORAGE_PRIVACY_VERIFIED !== "true")
    return error(c, "document_storage_unverified", 503);
  const format = c.req.param("format");
  if (format !== "pdf" && format !== "docx") return error(c, "invalid_format");
  const rate = await checkRateLimit(c.env.DB, [
    { key: `document-export:${c.get("userId")}`, limit: 20, windowSec: 60 },
  ]);
  if (!rate.ok) return error(c, "rate_limited", 429);
  const version = await readVersion(c, d, c.req.query("version"));
  if (!version) return error(c, "not_found", 404);
  const file = await generatedFile(c, d, version, format);
  if (!(await revalidateVersionAccess(c, d.id, version.id, "documents.export")))
    return error(c, "not_found", 404);
  await c.env.DB.batch([
    audit(c, d.id, "export.download", version.id, { format }),
  ]);
  return new Response(file.object.body, {
    headers: {
      "Content-Type": file.content_type,
      "Content-Disposition": `${c.req.query("preview") === "1" && format === "pdf" ? "inline" : "attachment"}; filename="${file.file_name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
});
documentCenterRouter.post("/api/documents/:id/import", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.edit");
  if (!d) return error(c, "not_found", 404);
  if (c.env.DOCUMENT_STORAGE_PRIVACY_VERIFIED !== "true")
    return error(c, "document_storage_unverified", 503);
  if (d.archived_at) return error(c, "archived_document", 409);
  const type = (c.req.header("content-type") || "").split(";")[0];
  let name: string;
  try {
    name = decodeURIComponent(c.req.header("X-File-Name") || "document")
      .replace(/[\r\n"\\/]/g, "_")
      .slice(0, 120);
  } catch {
    return error(c, "invalid_file");
  }
  if (
    ![
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/png",
      "image/jpeg",
    ].includes(type)
  )
    return error(c, "unsupported_type");
  const extension = name.split(".").pop()?.toLowerCase();
  const extensions: Record<string, string[]> = {
    "application/pdf": ["pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      "docx",
    ],
    "text/plain": ["txt"],
    "image/png": ["png"],
    "image/jpeg": ["jpg", "jpeg"],
  };
  if (!extension || !extensions[type]?.includes(extension))
    return error(c, "invalid_file");
  const key = c.req.header("idempotency-key");
  if (!key || !/^[A-Za-z0-9_-]{8,120}$/.test(key))
    return error(c, "idempotency_key_required");
  const reader = c.req.raw.body?.getReader();
  if (!reader) return error(c, "empty_file");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > 15 * 1024 * 1024) {
        await reader.cancel();
        return error(c, "too_large", 413);
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.length;
  }
  const start = (signature: number[]) =>
    signature.every((n, i) => bytes[i] === n);
  const valid =
    size > 0 &&
    (type === "application/pdf"
      ? start([37, 80, 68, 70, 45])
      : type === "image/png"
        ? start([137, 80, 78, 71, 13, 10, 26, 10])
        : type === "image/jpeg"
          ? start([255, 216, 255])
          : type === "text/plain"
            ? !bytes.includes(0)
            : start([80, 75, 3, 4]));
  if (!valid) return error(c, "invalid_file");
  const hash = await digestBytes(bytes),
    scope = `documents:${c.get("userId")}:import:${d.id}`;
  const old = await c.env.DB.prepare(
    "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
  )
    .bind(scope, key)
    .first<{ request_hash: string; response_json: string }>();
  if (old)
    return old.request_hash === hash
      ? c.json(JSON.parse(old.response_json))
      : error(c, "idempotency_key_reused", 409);
  const scan=await scanUpload(c.env,bytes,{source:"documents",scope:d.id,mimeType:type,actorId:c.get("userId")});
  if(scan.status!=="clean")return antivirusFailure(c,scan);
  const id = uid(),
    objectKey = `documents/${d.id}/quarantine/${id}`,
    time = stamp(),
    response = { id, status: "clean_scanned", scanner: "bouncer" };
  await putScannedObject(c.env,"FILES",objectKey,bytes,{
    httpMetadata: { contentType: "application/octet-stream" },
  },scan);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_json,created_at,expires_at) VALUES(?,?,?,?,?,?)",
      ).bind(
        scope,
        key,
        hash,
        JSON.stringify(response),
        time,
        time + 30 * 86400000,
      ),
      c.env.DB.prepare(
        "INSERT INTO document_files(id,document_id,version_id,kind,object_key,file_name,content_type,sha256,size_bytes,scan_status,scanner_reference,created_at) VALUES(?,?,?,'import',?,?,?,?,?,'clean_scanned',?,?)",
      ).bind(
        id,
        d.id,
        d.current_version_id,
        objectKey,
        name,
        type,
        hash,
        size,
        scan.id,
        time,
      ),
      audit(c, d.id, "import.clean_scanned", d.current_version_id, {
        sizeBytes: size,
      }),
    ]);
  } catch (cause) {
    await c.env.FILES.delete(objectKey);
    throw cause;
  }
  return c.json(response, 201);
});
documentCenterRouter.get("/api/documents/:id/files/:fileId", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.export");
  if (!d) return error(c, "not_found", 404);
  if (c.env.DOCUMENT_STORAGE_PRIVACY_VERIFIED !== "true")
    return error(c, "document_storage_unverified", 503);
  const f = await c.env.DB.prepare(
    "SELECT * FROM document_files WHERE id=? AND document_id=? AND (expires_at IS NULL OR expires_at>?)",
  )
    .bind(c.req.param("fileId"), d.id, stamp())
    .first<{
      scan_status: string;
      kind: string;
      object_key: string;
      version_id: string;
      content_type: string;
      file_name: string;
    }>();
  if (!f || !(await readVersion(c, d, f.version_id)))
    return error(c, "not_found", 404);
  if (!["clean_generated", "clean_scanned"].includes(f.scan_status))
    return error(c, "quarantined", 423);
  if(f.kind==='import'&&f.scan_status!=='clean_scanned')return error(c,'quarantined',423);
  const obj = f.scan_status === "clean_generated" && f.kind!=='import' ? await c.env.FILES.get(f.object_key) : await getScannedObject(c.env,"FILES",f.object_key);
  if (
    !(await revalidateVersionAccess(c, d.id, f.version_id, "documents.export"))
  )
    return error(c, "not_found", 404);
  if (!obj) return error(c, "not_found", 404);
  await c.env.DB.batch([audit(c, d.id, "file.download", f.version_id)]);
  return new Response(obj.body, {
    headers: {
      "Content-Type": f.content_type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.file_name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
});

documentCenterRouter.post("/api/documents/:id/share", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.share");
  if (!d) return error(c, "not_found", 404);
  const b = z
    .object({
      versionId: z.string(),
      recipientId: z.string().min(1).max(150),
      channel: z.enum(["email", "whatsapp", "telegram", "internal", "link"]),
      subject: z.string().max(200),
      message: z.string().max(4000),
      attachment: z.enum(["none", "pdf", "docx"]),
      confirmed: z.literal(true),
      attachmentConfirmed: z.boolean().default(false),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "confirmation_required");
  const value = b.data,
    version = await readVersion(c, d, value.versionId);
  if (!version || d.archived_at) return error(c, "not_found", 404);
  if (
    !(await c.env.DB.prepare(
      "SELECT 1 FROM document_approvals WHERE version_id=?",
    )
      .bind(version.id)
      .first())
  )
    return error(c, "approval_required", 409);
  const recipient = await documentActor(c.env.DB, value.recipientId),
    recipientDocument = recipient
      ? await accessibleDocument(c.env.DB, recipient, d.id)
      : null;
  if (!recipient || !recipientDocument)
    return error(c, "recipient_not_authorized", 403);
  if (
    !recipient.staff &&
    !recipient.platform &&
    d.published_version_id !== version.id
  )
    return error(c, "recipient_not_authorized", 403);
  const policy = await c.env.DB.prepare(
    "SELECT allow_attachments FROM document_access_policies WHERE document_id=?",
  )
    .bind(d.id)
    .first<{ allow_attachments: number }>();
  if (
    value.attachment !== "none" &&
    (!policy?.allow_attachments ||
      !value.attachmentConfirmed ||
      value.channel !== "email")
  )
    return error(c, "attachment_confirmation_required", 409);
  const rate = await checkRateLimit(c.env.DB, [
    { key: `document-share:${c.get("userId")}`, limit: 10, windowSec: 60 },
    {
      key: `document-share-to:${d.id}:${value.recipientId}`,
      limit: 5,
      windowSec: 3600,
    },
  ]);
  if (!rate.ok) return error(c, "rate_limited", 429);
  const shareId = uid(),
    time = stamp(),
    link = `https://app.avyron.ro/profil?tab=documents&document=${encodeURIComponent(d.id)}&version=${encodeURIComponent(version.id)}`;
  const result = await write(c, { id: shareId, link, status: "prepared" }, [
    c.env.DB.prepare(
      "INSERT INTO document_shares(id,document_id,version_id,actor_id,recipient_user_id,channel,status,attachment,created_at,updated_at) VALUES(?,?,?,?,?,?,'prepared',?,?,?)",
    ).bind(
      shareId,
      d.id,
      version.id,
      c.get("userId"),
      value.recipientId,
      value.channel,
      value.attachment !== "none" ? 1 : 0,
      time,
      time,
    ),
    audit(c, d.id, "share.prepared", version.id, { channel: value.channel }),
  ]);
  if (result.status !== 200) return result;
  const response = (await result.json()) as {
    id: string;
    link: string;
    status: string;
  };
  if (value.channel === "internal") {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at) VALUES(?,?,?,'Document distribuit','Un document este disponibil în Document Center.','documents',?)",
      ).bind(
        uid(),
        value.recipientId,
        `document-share:${response.id}`,
        stamp(),
      ),
      c.env.DB.prepare(
        "UPDATE document_shares SET status='sent',updated_at=? WHERE id=? AND status='prepared'",
      ).bind(stamp(), response.id),
    ]);
  } else if (
    value.channel === "email" &&
    (!c.env.SMTP_FROM || (!c.env.TRANSACTIONAL_EMAIL && !c.env.SMTP_PASS))
  ) {
    await c.env.DB.prepare(
      "UPDATE document_shares SET status='failed',error_code='email_unconfigured',updated_at=? WHERE id=? AND status='prepared'",
    )
      .bind(stamp(), response.id)
      .run();
  } else if (value.channel === "email") {
    const claim = await c.env.DB.prepare(
      "UPDATE document_shares SET status='sending',updated_at=? WHERE id=? AND status='prepared'",
    )
      .bind(stamp(), response.id)
      .run();
    if (claim.meta.changes) {
      // Revalidate at the last possible point, after the durable intent and before provider IO.
      const sender = await current(c, d.id, "documents.share"),
        freshRecipient = await documentActor(c.env.DB, value.recipientId);
      if (
        !sender ||
        !freshRecipient ||
        !(await accessibleDocument(c.env.DB, freshRecipient, d.id))
      ) {
        await c.env.DB.prepare(
          "UPDATE document_shares SET status='failed',error_code='access_revoked',updated_at=? WHERE id=?",
        )
          .bind(stamp(), response.id)
          .run();
        return error(c, "recipient_not_authorized", 403);
      }
      const account = await c.env.DB.prepare(
        "SELECT email FROM users WHERE id=? AND email_verified=1 AND disabled_at IS NULL",
      )
        .bind(value.recipientId)
        .first<{ email: string }>();
      if (!account) return error(c, "recipient_not_authorized", 403);
      try {
        const file =
          value.attachment === "none"
            ? null
            : await generatedFile(c, d, version, value.attachment);
        const delivery = await deliverMail(c.env, {
          to: account.email,
          subject: value.subject || "Document AVYRON disponibil",
          text: `${value.message}\n\nDeschide documentul prin contul autorizat:\n${link}`,
          attachments: file
            ? [
                {
                  filename: file.file_name,
                  contentType: file.content_type,
                  content: new Uint8Array(await file.object.arrayBuffer()),
                },
              ]
            : undefined,
        });
        await c.env.DB.prepare(
          "UPDATE document_shares SET status=?,error_code=?,provider_id=?,updated_at=? WHERE id=? AND status='sending'",
        )
          .bind(
            delivery.delivered ? "sent" : "unknown",
            delivery.delivered ? null : "provider_unconfirmed",
            delivery.providerMessageId || null,
            stamp(),
            response.id,
          )
          .run();
        await logDelivery(c.env, {
          kind: "document_share",
          entityId: response.id,
          recipient: account.email,
          result: delivery,
        });
      } catch {
        await c.env.DB.prepare(
          "UPDATE document_shares SET status='unknown',error_code='provider_unconfirmed',updated_at=? WHERE id=? AND status='sending'",
        )
          .bind(stamp(), response.id)
          .run();
      }
    }
  }
  const state = await c.env.DB.prepare(
    "SELECT status,error_code FROM document_shares WHERE id=?",
  )
    .bind(response.id)
    .first<{ status: string; error_code: string | null }>();
  return c.json({
    ...response,
    ...state,
    manualUrl:
      value.channel === "whatsapp"
        ? `https://wa.me/?text=${encodeURIComponent(`${value.message}\n${link}`)}`
        : value.channel === "telegram"
          ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(value.message)}`
          : null,
  });
});

// A backup is a separate private object copy plus an immutable manifest, never a DB-only badge.
const backupBucket = (c: Ctx, d: DocumentRow) => {
  if (
    c.env.DOCUMENT_BACKUP_ISOLATION_VERIFIED !== "true" ||
    c.env.DOCUMENT_STORAGE_PRIVACY_VERIFIED !== "true"
  )
    return undefined;
  const bucket =
    d.scope === "company"
      ? c.env.DOCUMENT_COMPANY_BACKUPS
      : c.env.DOCUMENT_BACKUPS;
  if (
    !bucket ||
    bucket === c.env.FILES ||
    (d.scope === "company" && bucket === c.env.DOCUMENT_BACKUPS)
  )
    return undefined;
  return bucket;
};
documentCenterRouter.get("/api/documents/:id/backups", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.backups.manage");
  if (!d) return error(c, "not_found", 404);
  return c.json({
    configured: !!backupBucket(c, d),
    data: (
      await c.env.DB.prepare(
        "SELECT id,version_id,status,size_bytes,separate_storage,created_at,restored_at,error_code FROM document_backup_records WHERE document_id=? ORDER BY created_at DESC LIMIT 100",
      )
        .bind(d.id)
        .all()
    ).results,
  });
});
async function createBackup(c: Ctx, d: DocumentRow, keyScope = c.req.path) {
  const bucket = backupBucket(c, d);
  if (!bucket) return error(c, "backup_unconfigured", 503);
  const id = uid(),
    key = `documents/${id}/manifest.json`,
    time = stamp();
  const prepared = await write(
    c,
    { id },
    [
      c.env.DB.prepare(
        "INSERT INTO document_backup_records(id,document_id,version_id,object_key,sha256,size_bytes,status,separate_storage,created_by,created_at) VALUES(?,?,?,?, '',0,'creating',1,?,?)",
      ).bind(id, d.id, d.current_version_id, key, c.get("userId"), time),
      audit(c, d.id, "backup.requested", d.current_version_id),
    ],
    keyScope,
  );
  if (prepared.status !== 200) return prepared;
  const existing = (await prepared.json()) as { id: string };
  if (existing.id !== id) {
    const record = await c.env.DB.prepare(
      "SELECT status FROM document_backup_records WHERE id=? AND document_id=?",
    )
      .bind(existing.id, d.id)
      .first<{ status: string }>();
    return c.json(
      { ...existing, status: record?.status || "unknown" },
      record?.status === "verified" || record?.status === "restored"
        ? 200
        : record?.status === "creating"
          ? 202
          : 503,
    );
  }
  const copiedKeys: string[] = [];
  try {
    const size = await c.env.DB.prepare(
      "SELECT sum(length(payload_json)) bytes FROM document_versions WHERE document_id=?",
    )
      .bind(d.id)
      .first<{ bytes: number }>();
    if ((size?.bytes || 0) > 7 * 1024 * 1024)
      throw new Error("backup_requires_batched_execution");
    const [
      versions,
      assignments,
      policies,
      grants,
      approvals,
      shares,
      events,
      files,
      templates,
      publications,
    ] = await c.env.DB.batch<Record<string, unknown>>([
      c.env.DB.prepare(
        "SELECT * FROM document_versions WHERE document_id=?",
      ).bind(d.id),
      c.env.DB.prepare(
        "SELECT * FROM document_assignments WHERE document_id=?",
      ).bind(d.id),
      c.env.DB.prepare(
        "SELECT * FROM document_access_policies WHERE document_id=?",
      ).bind(d.id),
      c.env.DB.prepare(
        "SELECT * FROM document_access_grants WHERE document_id=?",
      ).bind(d.id),
      c.env.DB.prepare(
        "SELECT * FROM document_approvals WHERE document_id=?",
      ).bind(d.id),
      c.env.DB.prepare(
        "SELECT * FROM document_shares WHERE document_id=? AND created_at<=?",
      ).bind(d.id, time),
      c.env.DB.prepare(
        "SELECT * FROM document_audit_events WHERE document_id=? AND created_at<=?",
      ).bind(d.id, time),
      c.env.DB.prepare(
        "SELECT * FROM document_files WHERE document_id=? AND expires_at IS NULL LIMIT 101",
      ).bind(d.id),
      c.env.DB.prepare(
        "SELECT t.id,t.family,t.name,t.legal,v.* FROM document_templates t JOIN document_template_versions v ON v.template_id=t.id WHERE v.id=?",
      ).bind(d.template_version_id),
      c.env.DB.prepare(
        "SELECT * FROM document_version_publications WHERE document_id=?",
      ).bind(d.id),
    ]);
    if (files.results.length > 100)
      throw new Error("backup_requires_batched_execution");
    const objectCopies = [];
    let total = 0;
    for (const file of files.results) {
      const object = await c.env.FILES.get(String(file.object_key));
      if (!object) throw new Error("backup_source_missing");
      if (object.size > 15 * 1024 * 1024)
        throw new Error("backup_file_too_large");
      const bytes = new Uint8Array(await object.arrayBuffer()),
        checksum = await digestBytes(bytes);
      if (file.sha256 !== "legacy_unverified" && checksum !== file.sha256)
        throw new Error("backup_checksum_mismatch");
      const backupKey = `documents/${id}/objects/${file.id}`;
      copiedKeys.push(backupKey);
      await bucket.put(backupKey, bytes, {
        httpMetadata: { contentType: "application/octet-stream" },
      });
      const copy = await bucket.get(backupKey);
      if (
        !copy ||
        (await digestBytes(new Uint8Array(await copy.arrayBuffer()))) !==
          checksum
      )
        throw new Error("backup_copy_verification_failed");
      total += bytes.length;
      objectCopies.push({
        ...file,
        backup_key: backupKey,
        backup_sha256: checksum,
      });
    }
    const fresh = await current(c, d.id, "documents.backups.manage");
    if (!fresh || fresh.revision !== d.revision)
      throw new Error("backup_snapshot_changed");
    const manifest = {
      format: "avyron-document-backup-v1",
      templates: templates.results,
      publications: publications.results,
      createdAt: time,
      document: d,
      versions: versions.results,
      assignments: assignments.results,
      policies: policies.results,
      grants: grants.results,
      approvals: approvals.results,
      shares: shares.results,
      events: events.results,
      files: objectCopies,
    };
    const json = JSON.stringify(manifest);
    if (json.length > 8 * 1024 * 1024)
      throw new Error("backup_manifest_too_large");
    const hash = await sha256(json);
    copiedKeys.push(key);
    await bucket.put(key, json, {
      httpMetadata: { contentType: "application/json" },
    });
    const check = await bucket.get(key);
    if (!check || (await sha256(await check.text())) !== hash)
      throw new Error("backup_manifest_verification_failed");
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE document_backup_records SET sha256=?,size_bytes=?,status='verified' WHERE id=? AND status='creating'",
      ).bind(hash, total + new TextEncoder().encode(json).length, id),
      audit(c, d.id, "backup.verified", d.current_version_id, { backupId: id }),
    ]);
    return c.json({ id, status: "verified", files: objectCopies.length });
  } catch {
    const cleanup = await Promise.allSettled(
      copiedKeys.map((key) => bucket.delete(key)),
    );
    const code = cleanup.some((result) => result.status === "rejected")
      ? "backup_cleanup_failed"
      : "backup_verification_failed";
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE document_backup_records SET status='failed',error_code=? WHERE id=?",
      ).bind(code, id),
      audit(c, d.id, "backup.failed", d.current_version_id, {
        backupId: id,
        cleanupComplete: code !== "backup_cleanup_failed",
      }),
    ]);
    return error(c, "backup_verification_failed", 503);
  }
}

documentCenterRouter.post("/api/documents/:id/backups", async (c) => {
  const d = await current(c, c.req.param("id"), "documents.backups.manage");
  return d ? createBackup(c, d) : error(c, "not_found", 404);
});
documentCenterRouter.post("/api/documents/project-backups", async (c) => {
  const b = z
    .object({
      projectId: z.string().min(1).max(150),
      after: z.string().max(150).default(""),
      confirmed: z.literal(true),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "confirmation_required");
  const project = await c.env.DB.prepare(
    "SELECT client_id,organization_id FROM projects WHERE id=?",
  )
    .bind(b.data.projectId)
    .first<{ client_id: string; organization_id: string | null }>();
  const actor = c.get("documentActor");
  if (
    !project ||
    !actor.staff ||
    !permission(c, "documents.backups.manage", project.organization_id) ||
    !(await beneficiaryAllowed(c.env.DB, actor, project.client_id))
  )
    return error(c, "not_found", 404);
  const filter = documentVisibility(actor);
  const docs = await c.env.DB.prepare(
    `SELECT d.* FROM documents d WHERE d.id>? AND EXISTS(SELECT 1 FROM document_assignments x WHERE x.document_id=d.id AND x.project_id=?) AND ${filter.sql} ORDER BY d.id LIMIT 6`,
  )
    .bind(b.data.after, b.data.projectId, ...filter.values)
    .all<DocumentRow>();
  const results = [];
  for (const d of docs.results.slice(0, 5)) {
    if (
      !(await documentActionAllowed(
        c.env.DB,
        actor,
        d,
        "documents.backups.manage",
      ))
    )
      continue;
    const result = await createBackup(c, d, `${c.req.path}:${d.id}`);
    results.push({
      documentId: d.id,
      status: result.status,
      result: await result.json(),
    });
  }
  return c.json({
    data: results,
    nextCursor: docs.results.length > 5 ? docs.results[4].id : null,
  });
});

documentCenterRouter.post(
  "/api/documents/:id/backups/:backupId/restore",
  async (c) => {
    const d = await current(c, c.req.param("id"), "documents.backups.manage");
    if (
      !d ||
      !(await documentActionAllowed(
        c.env.DB,
        c.get("documentActor"),
        d,
        "documents.edit",
      ))
    )
      return error(c, "not_found", 404);
    const b = z
      .object({
        revision: z.number().int().positive(),
        confirmed: z.literal(true),
      })
      .strict()
      .safeParse(await c.req.json().catch(() => null));
    if (!b.success) return error(c, "confirmation_required");
    const replay = await replayWrite(c);
    if (replay) return replay;
    if (b.data.revision !== d.revision)
      return error(c, "revision_conflict", 409);
    const bucket = backupBucket(c, d);
    if (!bucket) return error(c, "backup_unconfigured", 503);
    const record = await c.env.DB.prepare(
      "SELECT id,object_key,sha256,version_id FROM document_backup_records WHERE id=? AND document_id=? AND status IN('verified','restored') AND separate_storage=1",
    )
      .bind(c.req.param("backupId"), d.id)
      .first<{
        id: string;
        object_key: string;
        sha256: string;
        version_id: string;
      }>();
    if (!record) return error(c, "not_found", 404);
    const object = await bucket.get(record.object_key);
    if (!object || object.size > 8 * 1024 * 1024)
      return error(c, "backup_invalid", 409);
    const text = await object.text();
    if ((await sha256(text)) !== record.sha256)
      return error(c, "backup_invalid", 409);
    const manifest = JSON.parse(text) as {
      format: string;
      document: DocumentRow;
      versions: { id: string; payload_json: string }[];
      files: {
        id: string;
        version_id: string;
        object_key: string;
        file_name: string;
        content_type: string;
        kind: string;
        scan_status: string;
        sha256: string;
        size_bytes: number;
        backup_key: string;
        backup_sha256: string;
      }[];
    };
    if (
      manifest.format !== "avyron-document-backup-v1" ||
      manifest.document.id !== d.id ||
      manifest.document.scope !== d.scope ||
      manifest.document.beneficiary_id !== d.beneficiary_id
    )
      return error(c, "backup_scope_denied", 409);
    const version = manifest.versions.find((v) => v.id === record.version_id);
    if (!version) return error(c, "backup_invalid", 409);
    const payload = payloadSchema.safeParse(JSON.parse(version.payload_json));
    if (!payload.success) return error(c, "backup_invalid", 409);
    // Restore into fresh opaque keys. Never overwrite a current file, publication, grant, approval or historical version.
    const vid = uid(),
      restoredFiles: D1PreparedStatement[] = [];
    const newKeys: string[] = [];
    let committed = false;
    try {
      for (const file of manifest.files.filter(
        (file) => file.version_id === record.version_id,
      )) {
        const original = await bucket.get(file.backup_key);
        if (!original || original.size > 15 * 1024 * 1024)
          return error(c, "backup_invalid", 409);
        const bytes = new Uint8Array(await original.arrayBuffer());
        if ((await digestBytes(bytes)) !== file.backup_sha256)
          return error(c, "backup_invalid", 409);
        const fileId = uid(),
          key = `documents/${d.id}/restored/${fileId}`;
        newKeys.push(key);
        await c.env.FILES.put(key, bytes);
        restoredFiles.push(
          c.env.DB.prepare(
            "INSERT INTO document_files(id,document_id,version_id,kind,object_key,file_name,content_type,sha256,size_bytes,scan_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
          ).bind(
            fileId,
            d.id,
            vid,
            ["pdf", "docx"].includes(file.kind) ? "import" : file.kind,
            key,
            file.file_name,
            file.content_type,
            file.backup_sha256,
            bytes.length,
            file.scan_status === "clean_generated"
              ? "clean_generated"
              : "quarantined",
            stamp(),
          ),
        );
      }
      const result = await write(
        c,
        { ok: true, id: d.id, versionId: vid, revision: d.revision + 1 },
        [
          cas(c, d, b.data.revision),
          await versionStatement(c, d.id, vid, payload.data),
          ...restoredFiles,
          c.env.DB.prepare(
            "UPDATE documents SET current_version_id=? WHERE id=?",
          ).bind(vid, d.id),
          c.env.DB.prepare(
            "UPDATE document_backup_records SET status='restored',restored_at=? WHERE id=?",
          ).bind(stamp(), record.id),
          audit(c, d.id, "backup.restored", vid, {
            backupId: record.id,
            accessRestored: false,
            publicationRestored: false,
          }),
        ],
      );
      const persisted = await c.env.DB.prepare(
        "SELECT 1 FROM document_versions WHERE id=? AND document_id=?",
      )
        .bind(vid, d.id)
        .first();
      committed = !!persisted;
      return result;
    } finally {
      if (!committed)
        await Promise.all(newKeys.map((key) => c.env.FILES.delete(key)));
    }
  },
);

// Only disposable draft exports expire. Official exports and imports have no general TTL.
export async function cleanupDocumentExports(
  env: AppBindings["Bindings"],
  time = Date.now(),
) {
  // An interrupted provider call is uncertain; never resend it automatically.
  await env.DB.prepare(
    "UPDATE document_shares SET status='unknown',error_code='provider_unconfirmed',updated_at=? WHERE status='sending' AND updated_at<?",
  )
    .bind(time, time - 5 * 60 * 1000)
    .run();
  const rows = await env.DB.prepare(
    "SELECT f.id,f.object_key FROM document_files f WHERE f.expires_at IS NOT NULL AND f.expires_at<? AND f.kind IN('pdf','docx') LIMIT 20",
  )
    .bind(time)
    .all<{ id: string; object_key: string }>();
  for (const row of rows.results) {
    await env.FILES.delete(row.object_key);
    await env.DB.prepare(
      "DELETE FROM document_files WHERE id=? AND expires_at IS NOT NULL AND expires_at<?",
    )
      .bind(row.id, time)
      .run();
  }
}

async function canPrepareDocumentBilling(c: Ctx) {
  return (
    c.get("documentActor").staff &&
    !!c.get("mfaVerified") &&
    (c.get("documentActor").platform === "platform_owner" ||
      (await hasCapability(c.env.DB, c.get("userId"), "finance.write")))
  );
}
async function documentBillingLink(
  c: Ctx,
  documentId: string,
  versionId: string,
) {
  const a = c.get("documentActor");
  if (
    !a.platform &&
    !(await hasCapability(c.env.DB, a.id, "finance.read")) &&
    !(await hasCapability(c.env.DB, a.id, "finance.write"))
  )
    return null;
  return c.env.DB.prepare(
    "SELECT b.revenue_id,r.status,r.invoice_number FROM document_billing_preparations b JOIN financial_revenues r ON r.id=b.revenue_id WHERE b.document_id=? AND b.version_id=?",
  )
    .bind(documentId, versionId)
    .first();
}
documentCenterRouter.post("/api/documents/:id/prepare-billing", async (c) => {
  if (!(await canPrepareDocumentBilling(c)))
    return error(c, "financial_permission_and_mfa_required", 403);
  const d = await current(c, c.req.param("id"));
  if (!d || d.scope !== "client" || !d.beneficiary_id)
    return error(c, "not_found", 404);
  const b = z
    .object({
      versionId: z.string().min(1).max(160),
      invoiceDate: z.number().int().min(0).max(4102444800000),
      dueDate: z.number().int().min(0).max(4102444800000),
      confirmed: z.literal(true),
    })
    .strict()
    .refine((value) => value.dueDate >= value.invoiceDate)
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return error(c, "invalid_billing_dates");
  const replay = await replayWrite(c);
  if (replay) return replay;
  const old = await documentBillingLink(c, d.id, b.data.versionId);
  if (old) return c.json({ ...old, reused: true });
  if (d.archived_at || d.current_version_id !== b.data.versionId)
    return error(c, "billing_source_changed", 409);
  const version = await readVersion(c, d, b.data.versionId);
  if (!version) return error(c, "not_found", 404);
  if (
    !(await c.env.DB.prepare(
      "SELECT 1 FROM document_approvals WHERE document_id=? AND version_id=?",
    )
      .bind(d.id, version.id)
      .first())
  )
    return error(c, "approved_document_required", 409);
  const payload = payloadSchema.parse(JSON.parse(version.payload_json));
  if (
    !payload.lines.length ||
    documentIssues(payload, await requiredFields(c, d)).length
  )
    return error(c, "verified_commercial_lines_required", 409);
  const totals = payload.lines.reduce(
    (total, line) => {
      const amount = line.quantity * line.offeredPriceMinor;
      total.net += Math.round(amount);
      total.gross += Math.round(amount * (1 + line.vatBasisPoints / 10000));
      return total;
    },
    { net: 0, gross: 0 },
  );
  if (!Number.isSafeInteger(totals.gross) || totals.gross <= 0)
    return error(c, "positive_billing_amount_required", 409);
  const currency = payload.lines[0].currency;
  const projects = await c.env.DB.prepare(
    "SELECT project_id FROM document_assignments WHERE document_id=? AND project_id IS NOT NULL",
  )
    .bind(d.id)
    .all<{ project_id: string }>();
  const projectId =
    projects.results.length === 1 ? projects.results[0].project_id : null;
  const revenueId = uid(),
    t = stamp();
  try {
    return await write(c, { revenue_id: revenueId, status: "draft" }, [
      c.env.DB.prepare(
        "INSERT INTO financial_revenues(id,revenue_type,client_id,project_id,service_name,invoice_date,due_date,status,currency,net_amount_minor,vat_amount_minor,gross_amount_minor,amount_ron_minor,notes,source,created_by,updated_by,created_at,updated_at) VALUES(?,'digital_services',?,?,?,?,?,'draft',?,?,?,?,?,?,'system_generated',?,?,?,?)",
      ).bind(
        revenueId,
        d.beneficiary_id,
        projectId,
        payload.title,
        b.data.invoiceDate,
        b.data.dueDate,
        currency,
        totals.net,
        totals.gross - totals.net,
        totals.gross,
        currency === "RON" ? totals.gross : null,
        `Pregătit din documentul ${d.number}, versiunea ${version.version}. Verifică datele fiscale înainte de emitere.`,
        c.get("userId"),
        c.get("userId"),
        t,
        t,
      ),
      c.env.DB.prepare(
        "INSERT INTO document_billing_preparations(version_id,document_id,client_id,revenue_id,created_by,created_at) VALUES(?,?,?,?,?,?)",
      ).bind(version.id, d.id, d.beneficiary_id, revenueId, c.get("userId"), t),
      c.env.DB.prepare(
        "INSERT INTO financial_audit_events(id,actor_user_id,action,resource_type,resource_id,source,created_at) VALUES(?,?,'document.billing.prepared','revenue',?,'manual',?)",
      ).bind(uid(), c.get("userId"), revenueId, t),
      audit(c, d.id, "billing.prepared", version.id, { revenueId }),
    ]);
  } catch (cause) {
    if (/document_billing_source_changed/.test(String(cause)))
      return error(c, "billing_source_changed", 409);
    if (
      /UNIQUE constraint failed: document_billing_preparations/.test(
        String(cause),
      )
    ) {
      const existing = await documentBillingLink(c, d.id, version.id);
      if (existing) return c.json({ ...existing, reused: true });
    }
    throw cause;
  }
});
