import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import {
  collaboratorInput,
  COLLABORATOR_LIMITS,
  type Collaborator,
  type CollaboratorInput,
} from "../../../../src/shared/collaborators";
import {
  blankPayload,
  plainText,
} from "../../../../src/shared/documents/model";
import {
  collaboratorPermissions,
  collaboratorAccountSql,
  collaboratorClientAllowed,
} from "./collaboratorPolicy";
import { platformRoleForUser } from "./authorization";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { readJsonBodyUpTo } from "./requestBody";
import { sha256 } from "./security";
import { safeFilename } from "./storage";
import { inspectProjectMedia } from "./mediaPolicy";
import {
  scanUpload,
  scanningBlock,
  antivirusFailure,
  putScannedObject,
  getScannedObject,
  bytesHash,
} from "./malware";
type Ctx = Context<AppBindings>;
type Row = {
  id: string;
  code: string;
  name: string;
  category: Collaborator["category"];
  relationship: Collaborator["relationship"];
  status: Collaborator["status"];
  contact_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  specialization: string;
  summary: string;
  terms: string;
  internal_notes: string;
  starts_on: string;
  ends_on: string;
  client_id: string | null;
  account_user_id: string | null;
  document_id: string;
  revision: number;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
  client_name: string | null;
  account_email: string | null;
  file_count: number;
};
const admin = "/api/collaborators",
  root = "/api/collaborations";
export const collaboratorsRouter = new Hono<AppBindings>();
const fail = (
  c: Ctx,
  code: string,
  status: 400 | 403 | 404 | 409 | 413 | 415 | 423 | 429 | 503 = 400,
  message = "Verifică datele și reîncearcă.",
) => c.json({ error: { code, message } }, status);
const perm = (c: Ctx) =>
  collaboratorPermissions(c.env.DB, c.get("userId"), c.get("roles"));
const select = `SELECT c.*,cl.company_name client_name,u.email account_email,(SELECT count(*) FROM collaborator_documents f WHERE f.collaborator_id=c.id AND f.removed_at IS NULL AND (f.document_file_id IS NOT NULL OR f.lease_expires_at>CAST(strftime('%s','now') AS INTEGER)*1000)) file_count FROM agency_collaborators c LEFT JOIN clients cl ON cl.id=c.client_id LEFT JOIN users u ON u.id=c.account_user_id`;
const audit = (c: Ctx, id: string, action: string, fileId?: string) =>
  c.env.DB.prepare(
    "INSERT INTO audit_log(user_id,action,meta_json,created_at) VALUES(?,?,?,?)",
  ).bind(
    c.get("userId"),
    action,
    JSON.stringify({ collaboratorId: id, ...(fileId ? { fileId } : {}) }),
    Date.now(),
  );
const documentAudit = (
  c: Ctx,
  documentId: string,
  action: string,
  metadata: Record<string, unknown> = {},
) =>
  c.env.DB.prepare(
    "INSERT INTO document_audit_events(id,document_id,actor_id,action,version_id,metadata_json,created_at) SELECT ?,id,?,?,current_version_id,?,? FROM documents WHERE id=?",
  ).bind(
    crypto.randomUUID(),
    c.get("userId"),
    action,
    JSON.stringify(metadata),
    Date.now(),
    documentId,
  );
function mapped(r: Row, p: { read: boolean; manage: boolean }): Collaborator {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    relationship: r.relationship,
    status: r.status,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    whatsapp: r.whatsapp,
    website: r.website,
    specialization: r.specialization,
    summary: r.summary,
    terms: r.terms,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    revision: r.revision,
    archivedAt: r.archived_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    fileCount: r.file_count,
    canManage: p.manage,
    canUpload: !r.archived_at && r.status !== "closed" && (p.manage || !p.read),
    ...(p.read
      ? {
          clientId: r.client_id,
          accountUserId: r.account_user_id,
          internalNotes: r.internal_notes,
          clientName: r.client_name,
          accountEmail: r.account_email,
        }
      : {}),
  };
}
async function readable(c: Ctx, id: string) {
  const p = await perm(c),
    uid = c.get("userId"),
    r = await c.env.DB.prepare(
      select +
        ` WHERE c.id=? ${p.read ? "" : `AND ${collaboratorAccountSql()}`}`,
    )
      .bind(id, ...(p.read ? [] : [uid, uid, uid]))
      .first<Row>();
  return r ? { r, p } : null;
}
async function json(c: Ctx) {
  const b = await readJsonBodyUpTo(c.req.raw, 18000);
  return b.ok ? b.value : null;
}
async function references(c: Ctx, input: CollaboratorInput, previous?: Row) {
  if (
    input.clientId &&
    previous?.client_id !== input.clientId &&
    !(await collaboratorClientAllowed(c.env, c.get("userId"), input.clientId))
  )
    return false;
  if (
    input.accountUserId &&
    (previous?.account_user_id !== input.accountUserId ||
      previous?.client_id !== input.clientId)
  ) {
    const u = await c.env.DB.prepare(
      "SELECT 1 FROM users WHERE id=? AND disabled_at IS NULL AND email_verified=1",
    )
      .bind(input.accountUserId)
      .first();
    if (!u) return false;
    if (input.clientId) {
      const grant = await c.env.DB.prepare(
        `SELECT 1 FROM clients cl WHERE cl.id=? AND (EXISTS(SELECT 1 FROM client_account_access g WHERE g.client_id=cl.id AND g.user_id=?) OR EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships m ON m.organization_id=co.organization_id JOIN organizations o ON o.id=m.organization_id WHERE co.client_id=cl.id AND m.user_id=? AND m.status='active' AND o.status='active'))`,
      )
        .bind(input.clientId, input.accountUserId, input.accountUserId)
        .first();
      if (!grant) return false;
    }
  }
  return true;
}
for (const path of [admin + "*", root + "*", "/api/my/collaborations"])
  collaboratorsRouter.use(path, async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    c.header("X-Robots-Tag", "noindex, nofollow");
    const write = c.req.method !== "GET";
    if (
      write &&
      c.get("roles").some((r) => r === "staff" || r === "admin") &&
      !(await privilegedMfaSatisfied(c))
    )
      return fail(c, "mfa_required", 403);
    const rate = await checkRateLimit(c.env.DB, [
      {
        key: `collaborators:${c.get("userId")}:${write ? "write" : "read"}`,
        limit: write ? 40 : 240,
        windowSec: 3600,
      },
    ]);
    if (!rate.ok) return fail(c, "rate_limited", 429);
    try {
      await next();
    } catch (e) {
      if (/no such table/.test(String(e)))
        return fail(
          c,
          "collaborators_unavailable",
          503,
          "Secțiunea necesită migrarea bazei de date înainte de activare.",
        );
      throw e;
    }
  });
collaboratorsRouter.get(admin, async (c) => {
  const p = await perm(c);
  if (!p.read) return fail(c, "forbidden", 403);
  const q = (c.req.query("q") || "").trim().slice(0, 160),
    category = c.req.query("category") || "",
    status = c.req.query("status") || "",
    offset = Math.min(100000, Math.max(0, Number(c.req.query("offset")) || 0));
  const where = `c.archived_at IS ${c.req.query("archived") === "true" ? "NOT " : ""}NULL AND (?='' OR instr(lower(c.name||' '||c.code||' '||c.specialization||' '||c.contact_name||' '||c.email),lower(?))>0) AND (?='' OR c.category=?) AND (?='' OR c.status=?)`,
    v = [q, q, category, category, status, status];
  const [rows, count] = await Promise.all([
    c.env.DB.prepare(
      select +
        " WHERE " +
        where +
        " ORDER BY c.updated_at DESC,c.id LIMIT 24 OFFSET ?",
    )
      .bind(...v, offset)
      .all<Row>(),
    c.env.DB.prepare(
      "SELECT count(*) n FROM agency_collaborators c WHERE " + where,
    )
      .bind(...v)
      .first<{ n: number }>(),
  ]);
  return c.json({
    data: rows.results.map((r) => mapped(r, p)),
    total: count?.n || 0,
    canManage: p.manage,
  });
});
collaboratorsRouter.get("/api/my/collaborations", async (c) => {
  const uid = c.get("userId");
  const rows = await c.env.DB.prepare(
    select +
      ` WHERE ${collaboratorAccountSql()} ORDER BY c.updated_at DESC,c.id LIMIT 100`,
  )
    .bind(uid, uid, uid)
    .all<Row>();
  return c.json({
    data: rows.results.map((r) => mapped(r, { read: false, manage: false })),
  });
});
collaboratorsRouter.get(admin + "/options", async (c) => {
  if (!(await perm(c)).manage) return fail(c, "forbidden", 403);
  const q = (c.req.query("q") || "").trim().slice(0, 254),
    clientId = c.req.query("client") || "";
  if (q.length < 3) return c.json({ clients: [], accounts: [] });
  const principal = !!(await platformRoleForUser(c.env.DB, c.get("userId")));
  const clients = await c.env.DB.prepare(
    `SELECT c.id,c.company_name name,c.contact_name contactName,c.email,c.phone FROM clients c WHERE c.status<>'archived' AND instr(lower(c.company_name||' '||coalesce(c.email,'')),lower(?))>0 ${principal ? "" : `AND EXISTS(SELECT 1 FROM client_account_access g WHERE g.client_id=c.id AND g.user_id=?)`} ORDER BY c.company_name LIMIT 15`,
  )
    .bind(q, ...(principal ? [] : [c.get("userId")]))
    .all();
  if (
    clientId &&
    !(await collaboratorClientAllowed(c.env, c.get("userId"), clientId))
  )
    return fail(c, "invalid_association", 403);
  const accounts = await c.env.DB.prepare(
    `SELECT u.id,u.email,coalesce(u.display_name,u.username,u.email) name FROM users u WHERE u.email_verified=1 AND u.disabled_at IS NULL AND (lower(u.email)=lower(?) OR lower(u.username)=lower(?)) ${clientId ? "AND (EXISTS(SELECT 1 FROM client_account_access g WHERE g.client_id=? AND g.user_id=u.id) OR EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships m ON m.organization_id=co.organization_id JOIN organizations o ON o.id=m.organization_id WHERE co.client_id=? AND m.user_id=u.id AND m.status='active' AND o.status='active'))" : ""} LIMIT 15`,
  )
    .bind(q, q, ...(clientId ? [clientId, clientId] : []))
    .all();
  return c.json({ clients: clients.results, accounts: accounts.results });
});
const mutation = z
  .object({
    input: collaboratorInput,
    revision: z.number().int().positive().optional(),
    archived: z.boolean().optional(),
    accountConfirmed: z.boolean(),
  })
  .strict();
const columns = [
  "name",
  "category",
  "relationship",
  "status",
  "contact_name",
  "email",
  "phone",
  "whatsapp",
  "website",
  "specialization",
  "summary",
  "terms",
  "internal_notes",
  "starts_on",
  "ends_on",
  "client_id",
  "account_user_id",
];
const values = (v: CollaboratorInput) => [
  v.name,
  v.category,
  v.relationship,
  v.status,
  v.contactName,
  v.email.toLowerCase(),
  v.phone,
  v.whatsapp,
  v.website,
  v.specialization,
  v.summary,
  v.terms,
  v.internalNotes,
  v.startsOn,
  v.endsOn,
  v.clientId,
  v.accountUserId,
];
collaboratorsRouter.post(admin, async (c) => {
  if (!(await perm(c)).manage) return fail(c, "forbidden", 403);
  const b = mutation.safeParse(await json(c));
  if (!b.success)
    return fail(c, "invalid_input", 400, b.error.issues[0]?.message);
  const v = b.data.input;
  if (v.accountUserId && !b.data.accountConfirmed)
    return fail(
      c,
      "account_confirmation_required",
      400,
      "Confirmă explicit accesul contului asociat.",
    );
  if (!(await references(c, v)))
    return fail(
      c,
      "invalid_association",
      403,
      "Contul trebuie să fie verificat și autorizat pentru clientul selectat.",
    );
  const key = c.req.header("Idempotency-Key") || "";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key))
    return fail(c, "idempotency_key_required");
  const scope = "collaborator-create:" + c.get("userId"),
    hash = await sha256(JSON.stringify(b.data));
  const cached = () =>
    c.env.DB.prepare(
      "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
    )
      .bind(scope, key)
      .first<{ request_hash: string; response_json: string }>();
  const old = await cached();
  if (old)
    return old.request_hash === hash
      ? c.json(JSON.parse(old.response_json), 201)
      : fail(c, "idempotency_key_reused", 409);
  const id = crypto.randomUUID(),
    doc = crypto.randomUUID(),
    version = crypto.randomUUID(),
    code = "AVP-" + id.replace(/-/g, "").slice(0, 10).toUpperCase(),
    t = Date.now(),
    uid = c.get("userId");
  const payload = blankPayload();
  payload.title = "Dosar colaborare " + code;
  payload.body = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `Dosarul administrativ centralizează documentele colaborării ${code}. Accesul colaboratorului este gestionat explicit din fișa sa, fără acordarea unor drepturi asupra proiectelor, produselor sau conturilor altor beneficiari.`,
          },
        ],
      },
    ],
  };
  const data = JSON.stringify(payload);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,201,?,?,?)",
      ).bind(
        scope,
        key,
        hash,
        JSON.stringify({ id, code }),
        t,
        t + 30 * 86400000,
      ),
      c.env.DB.prepare(
        "INSERT INTO documents(id,number,scope,collection,beneficiary_id,current_version_id,created_by,created_at,updated_at) VALUES(?,?,'internal','library',?,?,?,?,?)",
      ).bind(doc, "COL-" + code, v.clientId, version, uid, t, t),
      c.env.DB.prepare(
        "INSERT INTO document_versions(id,document_id,version,payload_json,search_text,sha256,created_by,created_at) VALUES(?,?,1,?,?,?,?,?)",
      ).bind(
        version,
        doc,
        data,
        plainText(payload.body),
        await sha256(data),
        uid,
        t,
      ),
      c.env.DB.prepare(
        `INSERT INTO agency_collaborators(id,code,${columns.join(",")},document_id,created_by,created_at,updated_at) VALUES(${Array(23).fill("?").join(",")})`,
      ).bind(id, code, ...values(v), doc, uid, t, t),
      audit(c, id, "collaborator.created"),
      documentAudit(c, doc, "collaboration.created", { collaboratorId: id }),
    ]);
  } catch (e) {
    const race = await cached();
    if (race?.request_hash === hash)
      return c.json(JSON.parse(race.response_json), 201);
    throw e;
  }
  return c.json({ id, code }, 201);
});
collaboratorsRouter.patch(admin + "/:id", async (c) => {
  if (!(await perm(c)).manage) return fail(c, "forbidden", 403);
  const old = await c.env.DB.prepare(select + " WHERE c.id=?")
    .bind(c.req.param("id") || "")
    .first<Row>();
  if (!old) return fail(c, "not_found", 404);
  const b = mutation.safeParse(await json(c));
  if (!b.success || !b.data.revision) return fail(c, "invalid_input");
  const v = b.data.input,
    accountChanged = v.accountUserId !== old.account_user_id;
  if (accountChanged && !b.data.accountConfirmed)
    return fail(c, "account_confirmation_required");
  if (!(await references(c, v, old)))
    return fail(c, "invalid_association", 403);
  if (
    old.client_id !== v.clientId &&
    (await c.env.DB.prepare(
      "SELECT 1 FROM collaborator_documents WHERE collaborator_id=? AND document_file_id IS NOT NULL LIMIT 1",
    )
      .bind(old.id)
      .first())
  )
    return fail(
      c,
      "beneficiary_locked",
      409,
      "Fișa conține documente. Pentru alt beneficiar creează o fișă distinctă.",
    );
  const archivedAt =
    b.data.archived === undefined
      ? old.archived_at
      : b.data.archived
        ? old.archived_at || Date.now()
        : null;
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE agency_collaborators SET ${columns.map((n) => n + "=?").join(",")},archived_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?`,
      ).bind(...values(v), archivedAt, b.data.revision, Date.now(), old.id),
      c.env.DB.prepare(
        "UPDATE documents SET beneficiary_id=?,archived_at=?,updated_at=?,revision=revision+1 WHERE id=?",
      ).bind(v.clientId, archivedAt, Date.now(), old.document_id),
      documentAudit(
        c,
        old.document_id,
        accountChanged
          ? "collaboration.account_changed"
          : "collaboration.updated",
        {
          collaboratorId: old.id,
          ...(accountChanged
            ? {
                previousAccountId: old.account_user_id,
                accountUserId: v.accountUserId,
              }
            : {}),
          archived: archivedAt !== null,
        },
      ),
      ...(accountChanged
        ? [
            c.env.DB.prepare(
              "UPDATE collaborator_documents SET visible_to_partner=0 WHERE collaborator_id=?",
            ).bind(old.id),
          ]
        : []),
      audit(
        c,
        old.id,
        accountChanged
          ? "collaborator.account_changed"
          : "collaborator.updated",
      ),
    ]);
  } catch (e) {
    if (/constraint/i.test(String(e)))
      return fail(
        c,
        "revision_conflict",
        409,
        "Fișa s-a schimbat. Reîncarcă și reîncearcă.",
      );
    throw e;
  }
  return c.json({ ok: true });
});
collaboratorsRouter.get(root + "/:id", async (c) => {
  const a = await readable(c, c.req.param("id") || "");
  if (!a) return fail(c, "not_found", 404);
  const uid = c.get("userId");
  const files = await c.env.DB.prepare(
    `SELECT f.*,d.scan_status FROM collaborator_documents f LEFT JOIN document_files d ON d.id=f.document_file_id WHERE f.collaborator_id=? AND f.removed_at IS NULL AND (f.document_file_id IS NOT NULL OR f.lease_expires_at>CAST(strftime('%s','now') AS INTEGER)*1000) ${a.p.read ? "" : "AND (f.visible_to_partner=1 OR (f.document_file_id IS NULL AND f.uploaded_by=?))"} ORDER BY f.created_at`,
  )
    .bind(a.r.id, ...(a.p.read ? [] : [uid]))
    .all<{
      id: string;
      file_name: string;
      content_type: string;
      size_bytes: number;
      visible_to_partner: number;
      created_at: number;
      uploaded_by: string;
      document_file_id: string | null;
      scan_status: string | null;
    }>();
  return c.json({
    collaborator: mapped(a.r, a.p),
    files: files.results.map((f) => ({
      id: f.id,
      name: f.file_name,
      contentType: f.content_type,
      size: f.size_bytes,
      visible: f.visible_to_partner === 1,
      createdAt: f.created_at,
      uploadedByMe: f.uploaded_by === uid,
      ready: !!f.document_file_id && f.scan_status === "clean_scanned",
      canRemove:
        !a.r.archived_at &&
        (a.p.manage || (!a.p.read && f.uploaded_by === uid)),
    })),
    uploadBlock: scanningBlock(c.env, "documents"),
  });
});
collaboratorsRouter.post(root + "/:id/files", async (c) => {
  const a = await readable(c, c.req.param("id") || "");
  if (!a) return fail(c, "not_found", 404);
  if (a.r.archived_at || a.r.status === "closed" || (a.p.read && !a.p.manage))
    return fail(c, "forbidden", 403);
  if (c.env.DOCUMENT_STORAGE_PRIVACY_VERIFIED !== "true")
    return fail(
      c,
      "private_storage_unverified",
      503,
      "Stocarea privată trebuie verificată înainte de încărcare.",
    );
  const block = scanningBlock(c.env, "documents");
  if (block) return antivirusFailure(c, { status: "blocked", code: block });
  const key = c.req.header("Idempotency-Key") || "";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key))
    return fail(c, "idempotency_key_required");
  let name: string;
  try {
    name = safeFilename(decodeURIComponent(c.req.header("X-File-Name") || ""));
  } catch {
    return fail(c, "invalid_filename");
  }
  const mime = (c.req.header("Content-Type") || "").toLowerCase(),
    docx =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (!["application/pdf", "image/png", "image/jpeg", docx].includes(mime))
    return fail(c, "unsupported_type", 415, "Încarcă PDF, DOCX, PNG sau JPG.");
  if (Number(c.req.header("Content-Length")) > COLLABORATOR_LIMITS.fileBytes)
    return fail(c, "too_large", 413, "Maximum 5 MB per document.");
  const reader = c.req.raw.body?.getReader();
  if (!reader) return fail(c, "empty_file");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > COLLABORATOR_LIMITS.fileBytes) {
        await reader.cancel();
        return fail(c, "too_large", 413, "Maximum 5 MB per document.");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  if (
    !size ||
    !(mime === docx
      ? name.toLowerCase().endsWith(".docx") &&
        [80, 75, 3, 4].every((v, i) => bytes[i] === v)
      : inspectProjectMedia(name, mime, bytes))
  )
    return fail(
      c,
      "invalid_file",
      415,
      "Conținutul nu corespunde formatului declarat.",
    );
  const visible = a.p.manage ? c.req.query("visible") === "1" : true,
    uid = c.get("userId"),
    checksum = await bytesHash(bytes),
    hash = await sha256(JSON.stringify({ checksum, name, mime, visible }));
  type Slot = {
    id: string;
    document_file_id: string | null;
    request_hash: string;
    removed_at: number | null;
    lease_token: string | null;
    lease_expires_at: number | null;
  };
  const previous = () =>
    c.env.DB.prepare(
      "SELECT * FROM collaborator_documents WHERE collaborator_id=? AND uploaded_by=? AND intent_key=?",
    )
      .bind(a.r.id, uid, key)
      .first<Slot>();
  let row = await previous();
  if (row) {
    if (row.request_hash !== hash)
      return fail(c, "idempotency_key_reused", 409);
    if (row.removed_at)
      return fail(
        c,
        "document_removed",
        409,
        "Documentul a fost retras. Alege o încărcare nouă.",
      );
    if (row.document_file_id)
      return c.json({ id: row.id, status: "clean_scanned" }, 201);
    if ((row.lease_expires_at || 0) > Date.now())
      return fail(
        c,
        "upload_in_progress",
        409,
        "Încărcarea este deja în curs.",
      );
  }
  const t = Date.now(),
    id = crypto.randomUUID(),
    lease = crypto.randomUUID();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "DELETE FROM collaborator_documents WHERE collaborator_id=? AND document_file_id IS NULL AND lease_expires_at<=?",
      ).bind(a.r.id, t),
      c.env.DB.prepare(
        `INSERT INTO collaborator_documents(id,collaborator_id,slot,file_name,content_type,size_bytes,visible_to_partner,uploaded_by,intent_key,request_hash,lease_token,lease_expires_at,created_at) SELECT ?,?,s.slot,?,?,?,?,?,?,?,?,?,? FROM (SELECT 1 slot UNION ALL SELECT 2 UNION ALL SELECT 3) s WHERE NOT EXISTS(SELECT 1 FROM collaborator_documents f WHERE f.collaborator_id=? AND f.slot=s.slot AND f.removed_at IS NULL) ORDER BY s.slot LIMIT 1`,
      ).bind(
        id,
        a.r.id,
        name,
        mime,
        size,
        visible ? 1 : 0,
        uid,
        key,
        hash,
        lease,
        t + 120000,
        t,
        a.r.id,
      ),
    ]);
  } catch (e) {
    row = await previous();
    if (row?.document_file_id && row.request_hash === hash)
      return c.json({ id: row.id, status: "clean_scanned" }, 201);
    if (/constraint/i.test(String(e)))
      return fail(c, "upload_in_progress", 409);
    throw e;
  }
  row = await previous();
  if (!row)
    return fail(
      c,
      "document_limit",
      409,
      "Fișa permite maximum 3 documente active. Retrage un document pentru a elibera un loc.",
    );
  if (row.id !== id) return fail(c, "upload_in_progress", 409);
  const release = () =>
    c.env.DB.prepare(
      "DELETE FROM collaborator_documents WHERE id=? AND document_file_id IS NULL AND lease_token=?",
    )
      .bind(id, lease)
      .run();
  const objectKey = `documents/${a.r.document_id}/collaborators/${id}`;
  let written = false;
  try {
    const scan = await scanUpload(c.env, bytes, {
      source: "documents",
      scope: "collaborator:" + a.r.id,
      mimeType: mime,
      actorId: uid,
    });
    if (scan.status !== "clean") {
      await release();
      return antivirusFailure(c, scan);
    }
    const fresh = await readable(c, a.r.id);
    if (
      !fresh ||
      fresh.r.archived_at ||
      fresh.r.status === "closed" ||
      (fresh.p.read && !fresh.p.manage) ||
      fresh.r.account_user_id !== a.r.account_user_id ||
      fresh.r.client_id !== a.r.client_id
    ) {
      await release();
      return fail(
        c,
        "access_changed",
        403,
        "Accesul sau asocierea fișei s-a schimbat în timpul verificării. Încărcarea nu a fost publicată.",
      );
    }
    await putScannedObject(
      c.env,
      "FILES",
      objectKey,
      bytes,
      { httpMetadata: { contentType: mime, contentDisposition: "attachment" } },
      scan,
    );
    written = true;
    const doc = await c.env.DB.prepare(
      "SELECT current_version_id FROM documents WHERE id=?",
    )
      .bind(a.r.document_id)
      .first<{ current_version_id: string }>();
    if (!doc) throw Error("collaborator_document_missing");
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE agency_collaborators SET revision=CASE WHEN archived_at IS NULL AND status<>'closed' AND account_user_id IS ? AND client_id IS ? ${a.p.manage ? "" : `AND (${collaboratorAccountSql("agency_collaborators")})`} AND EXISTS(SELECT 1 FROM collaborator_documents f WHERE f.id=? AND f.lease_token=? AND f.document_file_id IS NULL) THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?`,
      ).bind(
        a.r.account_user_id,
        a.r.client_id,
        ...(a.p.manage ? [] : [uid, uid, uid]),
        id,
        lease,
        Date.now(),
        a.r.id,
      ),
      c.env.DB.prepare(
        "INSERT INTO document_files(id,document_id,version_id,kind,object_key,file_name,content_type,sha256,size_bytes,scan_status,scanner_reference,created_at) VALUES(?,?,?,'import',?,?,?,?,?,'clean_scanned',?,?)",
      ).bind(
        id,
        a.r.document_id,
        doc.current_version_id,
        objectKey,
        name,
        mime,
        checksum,
        size,
        scan.id,
        Date.now(),
      ),
      c.env.DB.prepare(
        "UPDATE collaborator_documents SET document_file_id=?,lease_token=NULL,lease_expires_at=NULL WHERE id=? AND lease_token=?",
      ).bind(id, id, lease),
      audit(c, a.r.id, "collaborator.document_uploaded", id),
      documentAudit(c, a.r.document_id, "import.clean_scanned", {
        collaboratorId: a.r.id,
        fileId: id,
        sizeBytes: size,
      }),
    ]);
    return c.json({ id, status: "clean_scanned" }, 201);
  } catch (e) {
    if (written)
      await c.env.FILES.delete(objectKey).catch(() =>
        console.error(
          JSON.stringify({
            event: "collaborator_upload_cleanup_failed",
            code: "storage_unavailable",
          }),
        ),
      );
    await release();
    console.error(
      JSON.stringify({
        event: "collaborator_upload_failed",
        code: "storage_or_metadata_unavailable",
      }),
    );
    return fail(
      c,
      "upload_failed",
      503,
      "Încărcarea nu a fost finalizată. Reîncarcă fișa și reîncearcă; verdictul existent va fi reutilizat.",
    );
  }
});
collaboratorsRouter.get(root + "/:id/files/:fileId", async (c) => {
  const a = await readable(c, c.req.param("id") || "");
  if (!a) return fail(c, "not_found", 404);
  const uid = c.get("userId");
  const f = await c.env.DB.prepare(
    `SELECT d.object_key,d.file_name,d.content_type,d.scan_status FROM collaborator_documents f JOIN document_files d ON d.id=f.document_file_id WHERE f.collaborator_id=? AND f.id=? AND f.removed_at IS NULL ${a.p.read ? "" : "AND f.visible_to_partner=1"}`,
  )
    .bind(a.r.id, c.req.param("fileId"))
    .first<{
      object_key: string;
      file_name: string;
      content_type: string;
      scan_status: string;
    }>();
  void uid;
  if (!f) return fail(c, "not_found", 404);
  if (f.scan_status !== "clean_scanned")
    return fail(
      c,
      "quarantined",
      423,
      "Documentul nu are un verdict CLEAN confirmat.",
    );
  const object = await getScannedObject(c.env, "FILES", f.object_key);
  if (!object)
    return fail(
      c,
      "quarantined",
      423,
      "Verificarea fișierului trebuie reînnoită.",
    );
  await audit(
    c,
    a.r.id,
    "collaborator.document_accessed",
    c.req.param("fileId"),
  ).run();
  return new Response(object.body, {
    headers: {
      "Content-Type": f.content_type,
      "Content-Length": String(object.size),
      "Content-Disposition": `attachment; filename="${safeFilename(f.file_name).replace(/["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(f.file_name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
});
collaboratorsRouter.patch(root + "/:id/files/:fileId", async (c) => {
  const a = await readable(c, c.req.param("id") || "");
  if (!a) return fail(c, "not_found", 404);
  if (a.r.archived_at) return fail(c, "forbidden", 403);
  const b = z
    .object({
      revision: z.number().int().positive(),
      confirmed: z.literal(true),
      visible: z.boolean().optional(),
      remove: z.literal(true).optional(),
    })
    .strict()
    .safeParse(await json(c));
  if (!b.success || (!b.data.remove && b.data.visible === undefined))
    return fail(c, "confirmation_required");
  const f = await c.env.DB.prepare(
    "SELECT id,uploaded_by FROM collaborator_documents WHERE collaborator_id=? AND id=? AND document_file_id IS NOT NULL AND removed_at IS NULL",
  )
    .bind(a.r.id, c.req.param("fileId"))
    .first<{ id: string; uploaded_by: string }>();
  if (!f) return fail(c, "not_found", 404);
  if (
    !a.p.manage &&
    (a.p.read ||
      f.uploaded_by !== c.get("userId") ||
      !b.data.remove ||
      b.data.visible !== undefined)
  )
    return fail(c, "forbidden", 403);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE agency_collaborators SET revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?",
      ).bind(b.data.revision, Date.now(), a.r.id),
      c.env.DB.prepare(
        "UPDATE collaborator_documents SET visible_to_partner=coalesce(?,visible_to_partner),removed_at=? WHERE id=? AND removed_at IS NULL",
      ).bind(
        b.data.visible === undefined ? null : b.data.visible ? 1 : 0,
        b.data.remove ? Date.now() : null,
        f.id,
      ),
      documentAudit(
        c,
        a.r.document_id,
        b.data.remove
          ? "collaboration.document_withdrawn"
          : "collaboration.document_visibility",
        {
          collaboratorId: a.r.id,
          fileId: f.id,
          visible: b.data.visible ?? null,
        },
      ),
      audit(
        c,
        a.r.id,
        b.data.remove
          ? "collaborator.document_withdrawn"
          : "collaborator.document_visibility",
      ),
    ]);
  } catch (e) {
    if (/constraint/i.test(String(e)))
      return fail(
        c,
        "revision_conflict",
        409,
        "Fișa s-a schimbat. Reîncarcă înainte de modificare.",
      );
    throw e;
  }
  return c.json({ ok: true });
});
