import { platformRoleForUser, type PlatformRole } from "./authorization";
import type {
  DocumentPermission,
  DocumentScope,
} from "../../../../src/shared/documents/model";
export type DocumentActor = {
  id: string;
  platform: PlatformRole | null;
  staff: boolean;
  capabilities: { capability: string; organization_id: string | null }[];
};
export type DocumentRow = {
  id: string;
  number: string;
  scope: DocumentScope;
  collection: string;
  beneficiary_id: string | null;
  organization_id: string | null;
  template_version_id: string | null;
  legal: number;
  current_version_id: string;
  published_version_id: string | null;
  revision: number;
  archived_at: number | null;
  created_by: string;
  created_at: number;
  updated_at: number;
};
export async function documentActor(
  db: D1Database,
  userId: string,
): Promise<DocumentActor | null> {
  const account = await db
    .prepare(
      "SELECT id FROM users WHERE id=? AND email_verified=1 AND disabled_at IS NULL",
    )
    .bind(userId)
    .first();
  if (!account) return null;
  const [platform, roles, capabilities] = await Promise.all([
    platformRoleForUser(db, userId),
    db
      .prepare("SELECT role FROM user_roles WHERE user_id=?")
      .bind(userId)
      .all<{ role: string }>(),
    db
      .prepare(
        `SELECT capability,organization_id FROM user_capabilities WHERE user_id=? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?)`,
      )
      .bind(userId, Date.now())
      .all<{ capability: string; organization_id: string | null }>(),
  ]);
  return {
    id: userId,
    platform,
    staff:
      !!platform ||
      roles.results.some((r) => ["staff", "admin"].includes(r.role)),
    capabilities: capabilities.results,
  };
}
export function documentCapability(
  actor: DocumentActor,
  permission: DocumentPermission,
  organizationId: string | null = null,
) {
  if (actor.platform === "platform_owner" || actor.platform === "superadmin")
    return true;
  if (permission === "documents.company.owner") return false;
  if (
    ["documents.read", "documents.export"].includes(permission) &&
    !actor.capabilities.some((row) => row.capability === "staff.access.managed")
  )
    return true;
  return actor.capabilities.some(
    (row) =>
      row.capability === permission &&
      (row.organization_id === null || row.organization_id === organizationId),
  );
}
/** Same SQL boundary is used for lists, search, counts and direct resource access. */
export function documentVisibility(
  actor: DocumentActor,
  alias = "d",
): { sql: string; values: (string | number)[] } {
  const company = documentCapability(actor, "documents.company.owner");
  if (actor.platform)
    return { sql: company ? "1=1" : `${alias}.scope<>'company'`, values: [] };
  const grant = `EXISTS(SELECT 1 FROM document_access_grants g WHERE g.document_id=${alias}.id AND g.user_id=? AND g.revoked_at IS NULL)`;
  const beneficiary = `(${alias}.beneficiary_id IS NULL OR EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=${alias}.beneficiary_id AND ca.user_id=?) OR EXISTS(SELECT 1 FROM organization_memberships om JOIN client_organizations co ON co.organization_id=om.organization_id JOIN organizations o ON o.id=om.organization_id WHERE co.client_id=${alias}.beneficiary_id AND om.user_id=? AND om.status='active' AND o.status='active'))`;
  if (actor.staff)
    return {
      sql: `(${alias}.scope<>'company' AND (${alias}.scope='staff' OR ((${alias}.created_by=? OR ${grant}) AND ${beneficiary})))`,
      values: [actor.id, actor.id, actor.id, actor.id],
    };
  return {
    sql: `(${alias}.scope='client' AND ${alias}.published_version_id IS NOT NULL AND ${grant} AND EXISTS(SELECT 1 FROM document_version_publications vp WHERE vp.document_id=${alias}.id AND vp.version_id=${alias}.published_version_id AND vp.user_id=?) AND ${beneficiary})`,
    values: [actor.id, actor.id, actor.id, actor.id],
  };
}
export async function accessibleDocument(
  db: D1Database,
  actor: DocumentActor,
  id: string,
) {
  const filter = documentVisibility(actor);
  return db
    .prepare(`SELECT d.* FROM documents d WHERE d.id=? AND ${filter.sql}`)
    .bind(id, ...filter.values)
    .first<DocumentRow>();
}
export async function documentActionAllowed(
  db: D1Database,
  actor: DocumentActor,
  document: DocumentRow,
  permission: DocumentPermission,
) {
  if (
    document.scope === "company" &&
    !documentCapability(actor, "documents.company.owner")
  )
    return false;
  if (!actor.staff && !actor.platform && permission === "documents.share")
    return !!(await db
      .prepare(
        `SELECT 1 FROM document_access_grants g JOIN document_access_policies p ON p.document_id=g.document_id WHERE g.document_id=? AND g.user_id=? AND g.revoked_at IS NULL AND g.can_share=1 AND p.allow_client_share=1`,
      )
      .bind(document.id, actor.id)
      .first());
  if (!documentCapability(actor, permission, document.organization_id)) {
    if (permission !== "documents.share" || actor.staff) return false;
    const grant = await db
      .prepare(
        `SELECT 1 FROM document_access_grants g JOIN document_access_policies p ON p.document_id=g.document_id WHERE g.document_id=? AND g.user_id=? AND g.revoked_at IS NULL AND g.can_share=1 AND p.allow_client_share=1`,
      )
      .bind(document.id, actor.id)
      .first();
    return !!grant;
  }
  if (actor.platform) return true;
  if (["documents.read", "documents.export"].includes(permission)) return true;
  if (!actor.staff) return false;
  if (document.created_by === actor.id) return true;
  return !!(await db
    .prepare(
      "SELECT 1 FROM document_access_grants WHERE document_id=? AND user_id=? AND revoked_at IS NULL AND can_edit=1",
    )
    .bind(document.id, actor.id)
    .first());
}
export async function beneficiaryAllowed(
  db: D1Database,
  actor: DocumentActor,
  clientId: string,
) {
  if (actor.platform)
    return !!(await db
      .prepare("SELECT 1 FROM clients WHERE id=?")
      .bind(clientId)
      .first());
  return !!(await db
    .prepare(
      `SELECT 1 FROM clients c WHERE c.id=? AND (EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=c.id AND ca.user_id=?) OR EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships m ON m.organization_id=co.organization_id JOIN organizations o ON o.id=co.organization_id WHERE co.client_id=c.id AND m.user_id=? AND m.status='active' AND m.role IN('owner','admin','manager','specialist') AND o.status='active'))`,
    )
    .bind(clientId, actor.id, actor.id)
    .first());
}

/** Existing notification feeds must not bypass resource revocation or corporate isolation. */
export async function filterPrivateDocumentNotices<
  T extends { id: unknown; deduplication_key?: unknown },
>(db: D1Database, userId: string, notices: T[]): Promise<T[]> {
  const documentNotices = notices.filter((n) =>
    /^(document:|document-share:)/.test(String(n.deduplication_key || "")),
  );
  if (!documentNotices.length) return notices;
  const privateIds = new Set(documentNotices.map((n) => String(n.id)));
  const actor = await documentActor(db, userId);
  if (!actor) return notices.filter((n) => !privateIds.has(String(n.id)));
  const filter = documentVisibility(actor);
  try {
    const allowed = await db
      .prepare(
        `SELECT n.id FROM operation_notifications n JOIN documents d ON n.deduplication_key='document:'||d.id||':'||d.published_version_id OR EXISTS(SELECT 1 FROM document_shares s WHERE s.document_id=d.id AND n.deduplication_key='document-share:'||s.id) WHERE n.user_id=? AND n.id IN(SELECT value FROM json_each(?)) AND ${filter.sql}`,
      )
      .bind(userId, JSON.stringify([...privateIds]), ...filter.values)
      .all<{ id: string }>();
    const visible = new Set(allowed.results.map((n) => n.id));
    return notices.filter(
      (n) => !privateIds.has(String(n.id)) || visible.has(String(n.id)),
    );
  } catch {
    // Preserve the pre-existing feed during staged migration, while failing closed for document notices.
    return notices.filter((n) => !privateIds.has(String(n.id)));
  }
}
