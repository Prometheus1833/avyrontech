export const STAFF_OPERATIONAL_EMAIL = "codexagent@avyron.ro";
import { platformRoleForUser } from "./authorization";
import { staffRequestPermission } from "../../../../src/shared/staffAccess";
export type ManagedStaff = {
  rank_id: string;
  permissions_json: string;
  expires_at: number | null;
  revision: number;
};
export async function managedStaff(db: D1Database, userId: string) {
  const row = await db
    .prepare(
      "SELECT rank_id,permissions_json,expires_at,revision FROM staff_rank_assignments WHERE user_id=?",
    )
    .bind(userId)
    .first<ManagedStaff>();
  if (!row?.rank_id) return null;
  // The assignment is a reviewed snapshot. Revoked/expired live grants cannot remain effective through that snapshot.
  const grants = await db
    .prepare(
      "SELECT capability FROM user_capabilities WHERE user_id=? AND organization_id IS NULL AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?)",
    )
    .bind(userId, Date.now())
    .all<{ capability: string }>();
  const active = new Set(grants.results.map((g) => g.capability));
  return {
    ...row,
    permissions_json: JSON.stringify(
      (JSON.parse(row.permissions_json) as string[]).filter((key) =>
        active.has(key),
      ),
    ),
  };
}
export function managedPermission(row: ManagedStaff, key: string) {
  if (row.expires_at !== null && row.expires_at <= Date.now()) return false;
  const keys = JSON.parse(row.permissions_json) as string[];
  if (key === "team.options")
    return keys.includes("team.read") || keys.includes("projects.create");
  if (key === "clients.options")
    return keys.includes("clients.read") || keys.includes("projects.create");
  if (key === "work.read")
    return keys.includes("projects.read") || keys.includes("maintenance.read");
  if (key === "work.write")
    return keys.includes("projects.write") || keys.includes("maintenance.work");
  return keys.includes(key);
}
export async function staffRequestAllowed(
  db: D1Database,
  userId: string,
  path: string,
  method: string,
) {
  const needed = staffRequestPermission(path, method);
  if (needed === null) return true;
  const row = await managedStaff(db, userId);
  if (!row) return true;
  if (await platformRoleForUser(db, userId)) return true;
  return managedPermission(row, needed);
}
/** Ownership is a protected identity, never an ordinary staff rank toggle. */
export async function canManageStaffTarget(
  db: D1Database,
  actor: string,
  target: string,
) {
  const actorRole = await platformRoleForUser(db, actor);
  if (!actorRole) return false;
  const reservedOwner = await db
    .prepare(
      "SELECT 1 FROM users u JOIN platform_principals p ON p.email=u.email COLLATE NOCASE WHERE u.id=? AND p.role='platform_owner'",
    )
    .bind(target)
    .first();
  const targetRole = reservedOwner
    ? "platform_owner"
    : await platformRoleForUser(db, target);
  return actorRole === "platform_owner" || targetRole !== "platform_owner";
}
