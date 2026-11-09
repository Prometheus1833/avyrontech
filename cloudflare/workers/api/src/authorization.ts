import { STAFF_PERMISSION_KEYS } from "../../../../src/shared/staffAccess";
export type PlatformRole = "platform_owner" | "superadmin";
export type OrganizationRole =
  | "owner" | "admin" | "manager" | "specialist" | "client_admin" | "client_member" | "viewer";

/** Email identities designated for the platform control plane, including suspended ones. */
export async function isReservedPlatformEmail(db: D1Database, email: string): Promise<boolean> {
  const row = await db.prepare(
    "SELECT 1 AS reserved FROM platform_principals WHERE email = ? COLLATE NOCASE LIMIT 1",
  ).bind(email).first<{ reserved: number }>();
  return row?.reserved === 1;
}

/**
 * Platform privileges are resolved from D1 on every privileged request. The
 * JWT is an authentication credential, not the source of truth for elevated
 * authorization.
 */
export async function platformRoleForUser(db: D1Database, userId: string): Promise<PlatformRole | null> {
  const row = await db.prepare(
    `SELECT principal.role
       FROM users AS account
       JOIN user_roles AS assigned
         ON assigned.user_id = account.id AND assigned.role = 'admin'
       JOIN platform_principals AS principal
         ON principal.email = account.email COLLATE NOCASE
      WHERE account.id = ?
        AND account.disabled_at IS NULL
        AND account.email_verified = 1
        AND principal.status = 'active'
      LIMIT 1`,
  ).bind(userId).first<{ role: PlatformRole }>();
  return row?.role ?? null;
}

export async function hasCapability(
  db: D1Database,
  userId: string,
  capability: string,
  organizationId?: string,
  timestamp = Date.now(),
): Promise<boolean> {
  if (
    STAFF_PERMISSION_KEYS.includes(capability) &&
    (await platformRoleForUser(db, userId))
  )
    return true;
  const row = await db.prepare(
    `SELECT 1 AS allowed
       FROM user_capabilities
      WHERE user_id = ?
        AND capability = ?
        AND (organization_id IS NULL OR organization_id = ?)
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > ?)
      LIMIT 1`,
  ).bind(userId, capability, organizationId ?? null, timestamp).first<{ allowed: number }>();
  return row?.allowed === 1;
}

export async function organizationRoleForUser(
  db: D1Database,
  organizationId: string,
  userId: string,
): Promise<OrganizationRole | null> {
  const row = await db.prepare(
    `SELECT role
       FROM organization_memberships
      WHERE organization_id = ? AND user_id = ? AND status = 'active'
      LIMIT 1`,
  ).bind(organizationId, userId).first<{ role: OrganizationRole }>();
  return row?.role ?? null;
}

/** A client grant can cover tenant projects only when that tenant is the
 * client's mapped legal entity. It never grants staff/project write access. */
export const clientProjectGrantSql=(alias: "p" | "project")=>`EXISTS(SELECT 1 FROM client_account_access cg WHERE cg.client_id=${alias}.client_id AND cg.user_id=? AND (${alias}.organization_id IS NULL OR EXISTS(SELECT 1 FROM client_organizations co WHERE co.client_id=${alias}.client_id AND co.organization_id=${alias}.organization_id)))`;
export async function hasClientProjectGrant(db:D1Database,projectId:string,userId:string){
  return !!(await db.prepare(`SELECT 1 FROM projects p WHERE p.id=? AND ${clientProjectGrantSql("p")}`).bind(projectId,userId).first());
}

/** Subscription websites retain historical payer identity, but the owner field
 * is never an alternative to the client's current explicit access grant. */
export const projectOwnerResourceGrantSql=(alias:"p"|"project")=>`(NOT EXISTS(SELECT 1 FROM website_subscription_projects w WHERE w.project_id=${alias}.id) OR EXISTS(SELECT 1 FROM client_account_access cg WHERE cg.client_id=${alias}.client_id AND cg.user_id=${alias}.owner_user_id))`;
export const projectOwnerAccessSql=(alias:"p"|"project")=>`(${alias}.owner_user_id=? AND ${projectOwnerResourceGrantSql(alias)})`;
