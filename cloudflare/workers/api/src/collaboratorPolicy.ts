import type { Env } from "./types";
import { hasCapability, platformRoleForUser } from "./authorization";
export const collaboratorAccountSql = (alias = "c") =>
  `${alias}.account_user_id=? AND ${alias}.archived_at IS NULL AND (${alias}.client_id IS NULL OR EXISTS(SELECT 1 FROM client_account_access g WHERE g.client_id=${alias}.client_id AND g.user_id=?) OR EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships m ON m.organization_id=co.organization_id JOIN organizations o ON o.id=m.organization_id WHERE co.client_id=${alias}.client_id AND m.user_id=? AND m.status='active' AND o.status='active'))`;
export async function collaboratorPermissions(
  db: D1Database,
  userId: string,
  roles: string[],
) {
  if (!roles.some((r) => ["staff", "admin"].includes(r)))
    return { read: false, manage: false };
  const manage = await hasCapability(db, userId, "collaborators.manage");
  return {
    read: manage || (await hasCapability(db, userId, "collaborators.read")),
    manage,
  };
}
export async function collaborationIdentity(db: D1Database, userId: string) {
  try {
    const row = await db
      .prepare(
        `SELECT count(*) n,coalesce(max(CASE WHEN c.status<>'closed' THEN 1 ELSE 0 END),0) badge FROM agency_collaborators c WHERE ${collaboratorAccountSql()}`,
      )
      .bind(userId, userId, userId)
      .first<{ n: number; badge: number }>();
    return { hasCollaborations: !!row?.n, isAgencyPartner: row?.badge === 1 };
  } catch (error) {
    // An optional module must never break existing authentication during a staged migration. No grants on failure.
    if (!/no such table/.test(String(error)))
      console.error(
        JSON.stringify({
          event: "collaboration_identity_unavailable",
          code: "metadata_unavailable",
        }),
      );
    return { hasCollaborations: false, isAgencyPartner: false };
  }
}
export async function collaboratorClientAllowed(
  env: Env,
  actorId: string,
  clientId: string,
) {
  if (await platformRoleForUser(env.DB, actorId))
    return !!(await env.DB.prepare(
      "SELECT 1 FROM clients WHERE id=? AND status<>'archived'",
    )
      .bind(clientId)
      .first());
  return !!(await env.DB.prepare(
    `SELECT 1 FROM clients c WHERE c.id=? AND c.status<>'archived' AND (EXISTS(SELECT 1 FROM client_account_access g WHERE g.client_id=c.id AND g.user_id=?) OR EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships m ON m.organization_id=co.organization_id WHERE co.client_id=c.id AND m.user_id=? AND m.status='active' AND m.role IN('owner','admin','manager','specialist')))`,
  )
    .bind(clientId, actorId, actorId)
    .first());
}
