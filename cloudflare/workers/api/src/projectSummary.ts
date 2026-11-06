import { hasCapability, platformRoleForUser } from "./authorization";
export async function projectBudgetAccess(
  db: D1Database,
  user: string,
  roles: string[],
) {
  const staff = roles.some((r) => r === "staff" || r === "admin") || !!(await db.prepare("SELECT 1 FROM staff_rank_assignments WHERE user_id=?").bind(user).first()) || await hasCapability(db,user,"projects.all");
  return (
    !staff ||
    !!(await platformRoleForUser(db, user)) ||
    (await hasCapability(db, user, "finance.read"))
  );
}
/** Same projection for every scope; no per-project network/SQL lookups. */
export function projectSummaryColumns(
  alias: "p" | "project",
  finance: boolean,
) {
  return `${alias}.id,${alias}.organization_id,${alias}.client_id,${alias}.slug,${alias}.name,${alias}.kind,${alias}.banner_status,${alias}.status,${alias}.url,${alias}.favicon_url,${alias}.created_at,coalesce(${alias}.updated_at,${alias}.created_at) updated_at,
 (SELECT company_name FROM clients WHERE id=${alias}.client_id) client_name,
 (SELECT group_concat(service_name,' · ') FROM (SELECT DISTINCT service_name FROM services WHERE project_id=${alias}.id ORDER BY service_name)) service_names,
 ${finance ? `${alias}.price_ron,${alias}.price_eur` : "NULL price_ron,NULL price_eur"},${finance ? 1 : 0} budget_visible,
 ${alias}.planned_start_at,${alias}.planned_end_at`;
}
