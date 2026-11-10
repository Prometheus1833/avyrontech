import { hasCapability, platformRoleForUser } from "./authorization";
/** Staff identity is checked in D1, never inferred from a client organization membership. */
export async function futureLeadPermissions(db: D1Database, user: string) {
  const active = await db
    .prepare(
      `SELECT 1 FROM users u WHERE u.id=? AND u.disabled_at IS NULL AND u.email_verified=1
    AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))`,
    )
    .bind(user)
    .first();
  if (!active)
    return {
      read: false,
      manage: false,
      create: false,
      convert: false,
      all: false,
    };
  const principal = !!(await platformRoleForUser(db, user));
  const manage = principal || (await hasCapability(db, user, "leads.write"));
  return {
    read: true,
    manage,
    create:
      manage && (principal || (await hasCapability(db, user, "leads.create"))),
    convert:
      manage &&
      (principal || (await hasCapability(db, user, "projects.create"))),
    all: manage || principal || (await hasCapability(db, user, "leads.read")),
  };
}
export function futureLeadScope(user: string, all: boolean) {
  return all
    ? { sql: "1=1", values: [] as string[] }
    : {
        sql: "EXISTS(SELECT 1 FROM lead_assignments a WHERE a.lead_id=f.lead_id AND a.user_id=?)",
        values: [user],
      };
}
/** Live checks also apply to old notices after rescheduling, conversion or assignment revocation. */
export async function allowedFutureNotices(
  db: D1Database,
  user: string,
  ids: string[],
) {
  if (!ids.length) return new Set<string>();
  const p = await futureLeadPermissions(db, user);
  if (!p.read) return new Set<string>();
  // Global CRM readers are not reminder recipients unless explicitly allocated.
  const principal = !!(await platformRoleForUser(db, user));
  const rows = await db
    .prepare(
      `SELECT n.notification_id id FROM future_lead_notices n
    JOIN future_leads f ON f.lead_id=n.lead_id JOIN leads l ON l.id=f.lead_id
    WHERE n.recipient_id=? AND n.notification_id IN(SELECT value FROM json_each(?))
    AND f.schedule_version=n.schedule_version AND f.status='scheduled'
    AND l.deleted_at IS NULL AND l.archived_at IS NULL AND l.converted_project_id IS NULL
    AND l.lifecycle_stage NOT IN('rejected','converted')
    AND (? OR EXISTS(SELECT 1 FROM lead_assignments a WHERE a.lead_id=f.lead_id AND a.user_id=?))`,
    )
    .bind(user, JSON.stringify(ids), principal ? 1 : 0, user)
    .all<{ id: string }>();
  return new Set(rows.results.map((r) => r.id));
}

/** Transaction-time authorization. An allocation/grant revoked after preflight cannot authorize a write. */
export function futureWriteSql(
  action: "edit" | "manage" | "create" | "convert",
  leadExpression: string,
  timestamp: number,
) {
  const cap = (name: string) =>
    `EXISTS(SELECT 1 FROM user_capabilities g WHERE g.user_id=actor.id AND g.capability='${name}' AND g.organization_id IS NULL AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>${timestamp}))`;
  const principal = `EXISTS(SELECT 1 FROM platform_principals pp JOIN user_roles pr ON pr.user_id=actor.id AND pr.role='admin' WHERE pp.email=actor.email COLLATE NOCASE AND pp.status='active')`;
  const assignment = `EXISTS(SELECT 1 FROM lead_assignments a WHERE a.lead_id=${leadExpression} AND a.user_id=actor.id AND a.assignment_role<>'reviewer')`;
  const explicit =
    action === "edit"
      ? `(${cap("leads.write")} OR ${assignment})`
      : action === "manage"
        ? cap("leads.write")
        : `(${cap("leads.write")} AND ${cap(action === "create" ? "leads.create" : "projects.create")})`;
  return `actor.disabled_at IS NULL AND actor.email_verified=1 AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=actor.id AND r.role IN('staff','admin')) AND (${principal} OR ${explicit})`;
}
