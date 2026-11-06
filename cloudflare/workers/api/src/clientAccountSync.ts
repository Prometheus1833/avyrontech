/** Reconcile legacy client records only. Managed/revoked grants remain explicit. */
export async function linkClientsByEmail(db: D1Database, userId: string) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO client_account_access(client_id,user_id,granted_by,created_at)
    SELECT cl.id,u.id,u.id,? FROM users u JOIN clients cl ON lower(trim(cl.email))=lower(trim(u.email))
    WHERE u.id=? AND u.email_verified=1 AND u.disabled_at IS NULL AND cl.access_managed=0
    AND NOT EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))
    AND NOT EXISTS(SELECT 1 FROM staff_rank_assignments a WHERE a.user_id=u.id)
    AND NOT EXISTS(SELECT 1 FROM platform_principals p WHERE lower(p.email)=lower(u.email) AND p.status='active')
  `,
    )
    .bind(Date.now(), userId)
    .run();
}
