import {
  bucharestDay,
  futureReminderOffset,
} from "../../../../src/shared/futureLeads";
import type { Env } from "./types";
/** Existing quarter-hour queue. Atomic notice + ledger, no external messaging or new service. */
export async function runFutureLeadReminders(env: Env, timestamp = Date.now()) {
  const day = bucharestDay(timestamp);
  const rows = await env.DB.prepare(
    `SELECT f.lead_id,f.title,f.contact_on,f.scheduled_at,f.schedule_version
    FROM future_leads f JOIN leads l ON l.id=f.lead_id WHERE f.status='scheduled' AND f.contact_on>=? AND f.contact_on<=date(?,'+10 days')
    AND l.deleted_at IS NULL AND l.archived_at IS NULL AND l.converted_project_id IS NULL AND l.lifecycle_stage NOT IN('rejected','converted')
    ORDER BY f.contact_on,f.lead_id`,
  )
    .bind(day, day)
    .all<{
      lead_id: string;
      title: string;
      contact_on: string;
      scheduled_at: number;
      schedule_version: number;
    }>();
  let created = 0;
  for (const row of rows.results) {
    const offset = futureReminderOffset(
      row.contact_on,
      row.scheduled_at,
      timestamp,
    );
    if (offset === null) continue;
    const recipients = await env.DB.prepare(
      `SELECT DISTINCT u.id FROM users u WHERE u.disabled_at IS NULL AND u.email_verified=1
      AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('admin','staff'))
      AND (EXISTS(SELECT 1 FROM platform_principals p JOIN user_roles r ON r.user_id=u.id AND r.role='admin'
        WHERE p.email=u.email COLLATE NOCASE AND p.status='active') OR EXISTS(SELECT 1 FROM lead_assignments a WHERE a.lead_id=? AND a.user_id=u.id))
      AND NOT EXISTS(SELECT 1 FROM future_lead_notices n WHERE n.lead_id=? AND n.schedule_version=? AND n.days_before=? AND n.recipient_id=u.id)`,
    )
      .bind(row.lead_id, row.lead_id, row.schedule_version, offset)
      .all<{ id: string }>();
    for (const recipient of recipients.results) {
      const id = crypto.randomUUID(),
        key = `future-lead:${row.lead_id}:${row.schedule_version}:${offset}:${recipient.id}`;
      await env.DB.batch([
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
          recipient.id,
          key,
          "Lead de contactat · " + row.title,
          `Contactare / inițiere programată pentru ${row.contact_on.split("-").reverse().join(".")}. Deschide fișa pentru detalii și responsabil.`,
          `/profil?tab=future-leads&futureLead=${encodeURIComponent(row.lead_id)}`,
          timestamp,
          row.lead_id,
          row.schedule_version,
          recipient.id,
        ),
        env.DB.prepare(
          `INSERT OR IGNORE INTO future_lead_notices(notification_id,lead_id,schedule_version,days_before,recipient_id)
          SELECT id,?,?,?,? FROM operation_notifications WHERE user_id=? AND deduplication_key=?`,
        ).bind(
          row.lead_id,
          row.schedule_version,
          offset,
          recipient.id,
          recipient.id,
          key,
        ),
      ]);
      created++;
      // Bound writes per queue invocation; the next quarter-hour continues the unnotified rows.
      if (created >= 100) return { created };
    }
  }
  return { created };
}
