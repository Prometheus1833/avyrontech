import {
  bucharestDay,
  futureReminderOffset,
} from "../../../../src/shared/futureLeads";
import type { Env } from "./types";
/** Existing quarter-hour queue; at most three D1 binding calls, regardless of recipient count. */
export async function runFutureLeadReminders(env: Env, timestamp = Date.now()) {
  const day = bucharestDay(timestamp);
  const rows = await env.DB.prepare(
    `SELECT f.lead_id,f.contact_on,f.scheduled_at,f.schedule_version
    FROM future_leads f JOIN leads l ON l.id=f.lead_id WHERE f.status='scheduled' AND f.contact_on>=? AND f.contact_on<=date(?,'+10 days')
    AND l.deleted_at IS NULL AND l.archived_at IS NULL AND l.converted_project_id IS NULL AND l.lifecycle_stage NOT IN('rejected','converted')
    ORDER BY f.contact_on,f.lead_id`,
  )
    .bind(day, day)
    .all<{
      lead_id: string;
      contact_on: string;
      scheduled_at: number;
      schedule_version: number;
    }>();
  const due = rows.results.flatMap((row) => {
    const offset = futureReminderOffset(
      row.contact_on,
      row.scheduled_at,
      timestamp,
    );
    return offset === null
      ? []
      : [{ id: row.lead_id, version: row.schedule_version, offset }];
  });
  if (!due.length) return { created: 0 };
  // UNION uses indexed native allocations and the small principal registry rather than all users per lead.
  const recipients = await env.DB.prepare(
    `WITH due AS (
      SELECT f.lead_id,f.title,f.contact_on,f.schedule_version,json_extract(d.value,'$.offset') days_before
      FROM json_each(?) d JOIN future_leads f ON f.lead_id=json_extract(d.value,'$.id') AND f.schedule_version=json_extract(d.value,'$.version')
      JOIN leads l ON l.id=f.lead_id WHERE f.status='scheduled' AND l.deleted_at IS NULL AND l.archived_at IS NULL
      AND l.converted_project_id IS NULL AND l.lifecycle_stage NOT IN('rejected','converted')
    ), candidates AS (
      SELECT d.lead_id,a.user_id FROM due d JOIN lead_assignments a ON a.lead_id=d.lead_id
      UNION
      SELECT d.lead_id,u.id FROM due d CROSS JOIN platform_principals p JOIN users u ON u.email=p.email COLLATE NOCASE
        JOIN user_roles r ON r.user_id=u.id AND r.role='admin' WHERE p.status='active'
    ) SELECT d.*,u.id recipient_id FROM candidates c JOIN due d ON d.lead_id=c.lead_id JOIN users u ON u.id=c.user_id
      WHERE u.disabled_at IS NULL AND u.email_verified=1 AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))
      AND NOT EXISTS(SELECT 1 FROM future_lead_notices n WHERE n.lead_id=d.lead_id AND n.schedule_version=d.schedule_version AND n.days_before=d.days_before AND n.recipient_id=u.id)
      ORDER BY d.contact_on,d.lead_id,u.id LIMIT 100`,
  )
    .bind(JSON.stringify(due))
    .all<{
      lead_id: string;
      title: string;
      contact_on: string;
      schedule_version: number;
      days_before: number;
      recipient_id: string;
    }>();
  const statements: D1PreparedStatement[] = [];
  for (const row of recipients.results) {
    const id = crypto.randomUUID(),
      key = `future-lead:${row.lead_id}:${row.schedule_version}:${row.days_before}:${row.recipient_id}`;
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_id)
        SELECT ?,?,?,?, ?,?,?,'activity','important',f.lead_id FROM future_leads f JOIN leads l ON l.id=f.lead_id
        WHERE f.lead_id=? AND f.schedule_version=? AND f.status='scheduled' AND l.deleted_at IS NULL AND l.archived_at IS NULL
        AND l.converted_project_id IS NULL AND l.lifecycle_stage NOT IN('rejected','converted') AND EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.disabled_at IS NULL AND u.email_verified=1
        AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin')) AND
        (EXISTS(SELECT 1 FROM platform_principals p JOIN user_roles r ON r.user_id=u.id AND r.role='admin' WHERE p.email=u.email COLLATE NOCASE AND p.status='active')
        OR EXISTS(SELECT 1 FROM lead_assignments a WHERE a.lead_id=f.lead_id AND a.user_id=u.id)))`,
      ).bind(
        id,
        row.recipient_id,
        key,
        "Lead de contactat · " + row.title,
        `Contactare / inițiere programată pentru ${row.contact_on.split("-").reverse().join(".")}. Deschide fișa pentru detalii și responsabil.`,
        `/profil?tab=future-leads&futureLead=${encodeURIComponent(row.lead_id)}`,
        timestamp,
        row.lead_id,
        row.schedule_version,
        row.recipient_id,
      ),
      env.DB.prepare(
        `INSERT OR IGNORE INTO future_lead_notices(notification_id,lead_id,schedule_version,days_before,recipient_id)
        SELECT id,?,?,?,? FROM operation_notifications WHERE user_id=? AND deduplication_key=?`,
      ).bind(
        row.lead_id,
        row.schedule_version,
        row.days_before,
        row.recipient_id,
        row.recipient_id,
        key,
      ),
    );
  }
  const results = statements.length ? await env.DB.batch(statements) : [];
  // Only count notification inserts, not ledger writes or recipients revoked during preflight.
  return {
    created: results.reduce(
      (total, result, index) =>
        total + (index % 2 === 0 ? Number(result.meta.changes || 0) : 0),
      0,
    ),
  };
}
