import { hasCapability, platformRoleForUser } from "./authorization";
import type { AgencyPermissions } from "../../../../src/shared/agency/model";
export type { AgencyPermissions } from "../../../../src/shared/agency/model";
export async function agencyPermissions(
  db: D1Database,
  user: string,
): Promise<AgencyPermissions> {
  const active = await db
    .prepare(
      "SELECT 1 FROM users WHERE id=? AND disabled_at IS NULL AND email_verified=1",
    )
    .bind(user)
    .first();
  const denied: AgencyPermissions = {
    read: false,
    manage: false,
    financeRead: false,
    financeWrite: false,
    transfer: false,
    documents: false,
    operator: false,
  };
  if (!active) return denied;
  const [staffRow, principal, grants] = await Promise.all([
    db
      .prepare(
        "SELECT 1 FROM user_roles WHERE user_id=? AND role IN('staff','admin')",
      )
      .bind(user)
      .first(),
    platformRoleForUser(db, user),
    db
      .prepare(
        "SELECT capability FROM user_capabilities WHERE user_id=? AND organization_id IS NULL AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?)",
      )
      .bind(user, Date.now())
      .all<{ capability: string }>(),
  ]);
  const staff = !!staffRow,
    keys = new Set(grants.results.map((g) => g.capability));
  const allowed = (key: string) => !!principal || keys.has(key);
  const manage = staff && allowed("leads_agency.manage");
  const explicitRead = manage || allowed("leads_agency.read");
  const operator =
    !staff &&
    explicitRead &&
    !!(await db
      .prepare(
        "SELECT 1 FROM agent_operator_bindings WHERE user_id=? AND agent_slug='leads' AND status='active'",
      )
      .bind(user)
      .first());
  const read = explicitRead && (staff || operator);
  return {
    read,
    manage: read && manage,
    operator,
    financeRead: read && staff && allowed("finance.read"),
    financeWrite: read && manage && allowed("finance.write"),
    transfer:
      read && manage && allowed("leads.read") && allowed("leads.create"),
    documents: read && staff && allowed("documents.create"),
  };
}
export async function agencyOwnerAllowed(db: D1Database, user: string | null) {
  if (!user) return true;
  const p = await agencyPermissions(db, user);
  return p.read && !p.operator;
}

export async function agencyClientAllowed(
  db: D1Database,
  user: string,
  client: string | null,
) {
  if (!client) return true;
  if (!(await hasCapability(db, user, "clients.read"))) return false;
  return (
    !!(await db
      .prepare("SELECT 1 FROM clients WHERE id=? AND status<>'archived'")
      .bind(client)
      .first()) &&
    (!!(await platformRoleForUser(db, user)) ||
      !!(await db
        .prepare(
          "SELECT 1 FROM clients c WHERE c.id=? AND (EXISTS(SELECT 1 FROM client_account_access a WHERE a.client_id=c.id AND a.user_id=?) OR EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships m ON m.organization_id=co.organization_id WHERE co.client_id=c.id AND m.user_id=? AND m.status='active' AND m.role IN('owner','admin','manager','specialist')))",
        )
        .bind(client, user, user)
        .first()))
  );
}
