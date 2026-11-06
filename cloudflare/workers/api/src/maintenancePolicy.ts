import { hasCapability } from "./authorization";
import { managedStaff, managedPermission } from "./staffAccessPolicy";
import type { Env, Role } from "./types";
import {
  platformRoleForUser,
  clientProjectGrantSql,
  hasClientProjectGrant,
} from "./authorization";
import { canAccessProject } from "./projects";

export function maintenanceProjectScope(userId: string, staff: boolean) {
  return {
    sql: `(p.owner_user_id=? OR EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=p.organization_id AND m.user_id=? AND m.status='active') OR ${staff ? "(p.organization_id IS NULL AND EXISTS(SELECT 1 FROM client_account_access g WHERE g.client_id=p.client_id AND g.user_id=?))" : clientProjectGrantSql("p")} ${staff ? "OR EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=p.id AND ps.user_id=?) OR EXISTS(SELECT 1 FROM subscriptions ms JOIN services mv ON mv.id=ms.service_id JOIN subscription_staff assigned ON assigned.subscription_id=ms.id WHERE mv.project_id=p.id AND ms.maintenance_enabled=1 AND ms.status='active' AND assigned.user_id=?)" : ""})`,
    values: staff
      ? [userId, userId, userId, userId, userId]
      : [userId, userId, userId],
  };
}
export async function maintenanceWorkAccess(
  env: Env,
  projectId: string,
  userId: string,
  roles: Role[],
) {
  const policy = await managedStaff(env.DB, userId);
  if (policy && !managedPermission(policy, "maintenance.read"))
    return { read: false, write: false };
  const original = await canAccessProject(env.DB, projectId, userId, roles);
  if (policy && (await hasCapability(env.DB, userId, "maintenance.manage"))) {
    const exists = !!(await env.DB.prepare("SELECT 1 FROM projects WHERE id=?")
      .bind(projectId)
      .first());
    return { read: exists, write: exists };
  }
  const canWork = !policy || managedPermission(policy, "maintenance.work");
  if (
    policy &&
    (await env.DB.prepare(
      "SELECT 1 FROM project_staff WHERE project_id=? AND user_id=?",
    )
      .bind(projectId, userId)
      .first())
  )
    return { read: true, write: canWork };
  if (original.write) return { read: true, write: canWork };
  const staff = roles.some((r) => r === "staff" || r === "admin");
  const assigned =
    staff &&
    !!(await env.DB.prepare(
      `SELECT 1 FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN subscription_staff a ON a.subscription_id=s.id WHERE v.project_id=? AND s.maintenance_enabled=1 AND s.status='active' AND a.user_id=?`,
    )
      .bind(projectId, userId)
      .first());
  if (original.read || assigned)
    return { read: true, write: assigned && canWork };
  const grant =
    !staff && (await hasClientProjectGrant(env.DB, projectId, userId));
  return { read: !!grant, write: false };
}
export async function maintenanceActor(
  env: Env,
  userId: string,
  roles: Role[],
) {
  return {
    manage:
      !!(await platformRoleForUser(env.DB, userId)) ||
      (await hasCapability(env.DB, userId, "maintenance.manage")),
    staff: roles.some((r) => r === "staff" || r === "admin"),
  };
}
