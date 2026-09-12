export type PlatformRole = "platform_owner" | "superadmin";
export type OrganizationRole = "owner" | "admin" | "manager" | "specialist" | "client_admin" | "client_member" | "viewer";

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
