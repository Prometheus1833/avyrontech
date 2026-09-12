import { Hono, type Context } from "hono";
import type { AppBindings } from "./types";
import { organizationRoleForUser, platformRoleForUser } from "./authorization";
import { now, sha256 } from "./security";
import {
  LEAD_ACTIVITY_KINDS,
  LEAD_CHANNELS,
  LEAD_STAGES,
  coarseLeadStatus,
  normalizedLeadPhone,
  validateNewLead,
} from "./leadPolicy";

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
const LEAD_STAGE_SET = new Set<string>(LEAD_STAGES);
const CHANNELS = new Set<string>(LEAD_CHANNELS);
const ACTIVITY_KINDS = new Set<string>(LEAD_ACTIVITY_KINDS);

type LeadAccess = { read: boolean; write: boolean; organizationId: string | null };

async function leadAccess(c: Context<AppBindings>, leadId: string): Promise<LeadAccess | null> {
  const lead = await c.env.DB.prepare("SELECT organization_id FROM leads WHERE id = ?")
    .bind(leadId).first<{ organization_id: string | null }>();
  if (!lead) return null;
  const userId = c.get("userId");
  const platformRole = await platformRoleForUser(c.env.DB, userId);
  if (platformRole) return { read: true, write: true, organizationId: lead.organization_id };

  if (lead.organization_id) {
    const role = await organizationRoleForUser(c.env.DB, lead.organization_id, userId);
    if (role) return {
      read: true,
      write: ["owner", "admin", "manager", "specialist"].includes(role),
      organizationId: lead.organization_id,
    };
  }

  const assignment = await c.env.DB.prepare(
    "SELECT assignment_role FROM lead_assignments WHERE lead_id = ? AND user_id = ?",
  ).bind(leadId, userId).first<{ assignment_role: string }>();
  if (assignment) return { read: true, write: assignment.assignment_role !== "reviewer", organizationId: lead.organization_id };

  // Compatibility for legacy leads that predate organizations/assignments.
  const legacyRole = (c.get("roles") || []).some((role) => role === "staff" || role === "admin");
  return { read: legacyRole, write: legacyRole, organizationId: lead.organization_id };
}

async function audit(c: Context<AppBindings>, leadId: string, action: string, outcome: "allowed" | "denied") {
  const organization = await c.env.DB.prepare("SELECT organization_id FROM leads WHERE id = ?")
    .bind(leadId).first<{ organization_id: string | null }>();
  await c.env.DB.prepare(
    `INSERT INTO security_events
       (id, organization_id, actor_user_id, actor_type, action, target_type,
        target_id, outcome, severity, request_id, metadata_json, created_at)
     VALUES (?, ?, ?, 'user', ?, 'lead', ?, ?, ?, ?, '{}', ?)`,
  ).bind(
    identifier("evt"), organization?.organization_id || null, c.get("userId"), action,
    leadId, outcome, outcome === "allowed" ? "info" : "warning", c.get("requestId") || null, now(),
  ).run();
}

export const leadsRouter = new Hono<AppBindings>();

leadsRouter.post("/api/leads", async (c) => {
  const parsed = validateNewLead(await c.req.json<unknown>().catch(() => null));
  if (!parsed.ok) return c.json({ error: { code: parsed.code, field: parsed.field } }, 400);
  const lead = parsed.value;
  const userId = c.get("userId");
  const idempotencyKey = (c.req.header("idempotency-key") || "").trim();
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(idempotencyKey)) {
    return c.json({ error: { code: "idempotency_key_required" } }, 400);
  }
  const idempotencyScope = `lead.create:${userId}`;
  const requestHash = await sha256(JSON.stringify(lead));
  const previous = await c.env.DB.prepare(
    `SELECT request_hash, response_status, response_json
       FROM idempotency_keys WHERE scope = ? AND idempotency_key = ? AND expires_at > ?`,
  ).bind(idempotencyScope, idempotencyKey, now()).first<{
    request_hash: string; response_status: number | null; response_json: string | null;
  }>();
  if (previous) {
    if (previous.request_hash !== requestHash) {
      return c.json({ error: { code: "idempotency_key_reused" } }, 409);
    }
    if (previous.response_json) {
      return new Response(previous.response_json, {
        status: previous.response_status || 201,
        headers: { "content-type": "application/json; charset=UTF-8" },
      });
    }
    return c.json({ error: { code: "request_in_progress" } }, 409);
  }
  const platformRole = await platformRoleForUser(c.env.DB, userId);
  const legacyStaff = (c.get("roles") || []).some((role) => role === "staff" || role === "admin");

  if (lead.organizationId) {
    const organizationRole = await organizationRoleForUser(c.env.DB, lead.organizationId, userId);
    if (!platformRole && !["owner", "admin", "manager", "specialist"].includes(organizationRole || "")) {
      return c.json({ error: { code: "organization_scope_denied" } }, 403);
    }
  } else if (!platformRole && !legacyStaff) {
    return c.json({ error: { code: "forbidden" } }, 403);
  }

  const phoneDigits = normalizedLeadPhone(lead.phone);
  if (lead.email || phoneDigits) {
    const duplicate = await c.env.DB.prepare(
      `SELECT id FROM leads
        WHERE ((organization_id = ?) OR (organization_id IS NULL AND ? IS NULL))
          AND lifecycle_stage NOT IN ('rejected','converted')
          AND ((? IS NOT NULL AND lower(email) = ?)
            OR (? IS NOT NULL AND replace(replace(replace(replace(replace(replace(phone,' ',''),'+',''),'-',''),'(',''),')',''),'.','') = ?))
        LIMIT 1`,
    ).bind(
      lead.organizationId, lead.organizationId,
      lead.email, lead.email,
      phoneDigits, phoneDigits,
    ).first<{ id: string }>();
    if (duplicate) return c.json({ error: { code: "duplicate_lead", leadId: duplicate.id } }, 409);
  }

  const leadId = identifier("lead");
  const activityId = identifier("lead_activity");
  const timestamp = now();
  const responseJson = JSON.stringify({ id: leadId });
  if (lead.nextFollowUpAt !== null && lead.nextFollowUpAt <= timestamp) {
    return c.json({ error: { code: "invalid_follow_up", field: "nextFollowUpAt" } }, 400);
  }
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO idempotency_keys
        (scope, idempotency_key, request_hash, response_status, response_json,
         resource_type, resource_id, created_at, expires_at)
       VALUES (?, ?, ?, 201, ?, 'lead', ?, ?, ?)`,
    ).bind(
      idempotencyScope, idempotencyKey, requestHash, responseJson, leadId,
      timestamp, timestamp + 24 * 60 * 60 * 1_000,
    ),
    c.env.DB.prepare(
      `INSERT INTO leads
        (id, organization_id, source, name, business, phone, email, message, website,
         product, status, lifecycle_stage, preferred_channel, next_follow_up_at,
         urgent, estimate_ron, provenance_url, outreach_eligibility,
         delivery_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'new_lead', ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    ).bind(
      leadId, lead.organizationId, lead.source, lead.name, lead.business, lead.phone,
      lead.email, lead.message, lead.website, lead.product, lead.preferredChannel,
      lead.nextFollowUpAt, lead.urgent ? 1 : 0, lead.estimateRon,
      lead.provenanceUrl, lead.outreachEligibility, timestamp, timestamp,
    ),
    c.env.DB.prepare(
      `INSERT INTO lead_assignments (lead_id, user_id, assignment_role, assigned_by, assigned_at)
       VALUES (?, ?, 'owner', ?, ?)`,
    ).bind(leadId, userId, userId, timestamp),
    c.env.DB.prepare(
      `INSERT INTO lead_activities
        (id, lead_id, actor_user_id, kind, direction, outcome, content, occurred_at, created_at)
       VALUES (?, ?, ?, 'note', 'internal', 'created', ?, ?, ?)`,
    ).bind(activityId, leadId, userId, lead.message || "Lead adăugat manual în AVYRON OS.", timestamp, timestamp),
  ]);
  await audit(c, leadId, "lead.create", "allowed");
  return c.json({ id: leadId }, 201);
});

leadsRouter.get("/api/leads", async (c) => {
  const userId = c.get("userId");
  const platformRole = await platformRoleForUser(c.env.DB, userId);
  const organizationId = (c.req.query("organizationId") || "").slice(0, 96) || null;
  const stage = (c.req.query("stage") || "").slice(0, 40) || null;
  if (stage && !LEAD_STAGE_SET.has(stage)) return c.json({ error: { code: "invalid_stage" } }, 400);
  if (organizationId && !platformRole) {
    const role = await organizationRoleForUser(c.env.DB, organizationId, userId);
    if (!role) return c.json({ error: { code: "forbidden" } }, 403);
  }

  const values: unknown[] = [];
  const filters: string[] = [];
  if (organizationId) { filters.push("lead.organization_id = ?"); values.push(organizationId); }
  if (stage) { filters.push("lead.lifecycle_stage = ?"); values.push(stage); }
  if (!platformRole) {
    filters.push(`(
      EXISTS (SELECT 1 FROM lead_assignments assignment WHERE assignment.lead_id = lead.id AND assignment.user_id = ?)
      OR EXISTS (SELECT 1 FROM organization_memberships membership
                  WHERE membership.organization_id = lead.organization_id
                    AND membership.user_id = ? AND membership.status = 'active')
      OR (lead.organization_id IS NULL AND ? = 1)
    )`);
    const legacyStaff = (c.get("roles") || []).some((role) => role === "staff" || role === "admin") ? 1 : 0;
    values.push(userId, userId, legacyStaff);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const { results } = await c.env.DB.prepare(
    `SELECT lead.id, lead.organization_id, lead.source, lead.name, lead.business,
            lead.phone, lead.email, lead.product, lead.status, lead.lifecycle_stage,
            lead.preferred_channel, lead.next_follow_up_at, lead.urgent,
            lead.converted_project_id, lead.estimate_ron, lead.delivery_status,
            lead.created_at, lead.updated_at
       FROM leads AS lead ${where}
      ORDER BY lead.urgent DESC,
               CASE WHEN lead.next_follow_up_at IS NULL THEN 1 ELSE 0 END,
               lead.next_follow_up_at, lead.created_at DESC
      LIMIT 250`,
  ).bind(...values).all();
  return c.json({ data: results, platformRole });
});

leadsRouter.get("/api/leads/:leadId", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.read) return c.json({ error: { code: "forbidden" } }, 403);
  const lead = await c.env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
  const [activities, assignments, reminders] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY occurred_at DESC LIMIT 200").bind(leadId).all(),
    c.env.DB.prepare(
      `SELECT assignment.user_id, assignment.assignment_role, assignment.assigned_at,
              account.email, account.display_name
         FROM lead_assignments assignment JOIN users account ON account.id = assignment.user_id
        WHERE assignment.lead_id = ? ORDER BY assignment.assigned_at`,
    ).bind(leadId).all(),
    c.env.DB.prepare("SELECT * FROM lead_reminders WHERE lead_id = ? ORDER BY due_at DESC LIMIT 100").bind(leadId).all(),
  ]);
  return c.json({ data: lead, activities: activities.results, assignments: assignments.results, reminders: reminders.results, canEdit: access.write });
});

leadsRouter.patch("/api/leads/:leadId", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) { await audit(c, leadId, "lead.update", "denied"); return c.json({ error: { code: "forbidden" } }, 403); }
  const body = await c.req.json<{
    lifecycleStage?: string; urgent?: boolean; nextFollowUpAt?: number | null;
    preferredChannel?: string | null; lostReason?: string | null;
  }>().catch(() => null);
  if (!body) return c.json({ error: { code: "bad_request" } }, 400);
  const sets: string[] = [];
  const values: unknown[] = [];
  if (body.lifecycleStage !== undefined) {
    if (!LEAD_STAGE_SET.has(body.lifecycleStage) || body.lifecycleStage === "converted") {
      return c.json({ error: { code: "invalid_stage" } }, 400);
    }
    sets.push("lifecycle_stage = ?"); values.push(body.lifecycleStage);
    const coarse = coarseLeadStatus(body.lifecycleStage as Parameters<typeof coarseLeadStatus>[0]);
    sets.push("status = ?"); values.push(coarse);
    if (body.lifecycleStage === "accepted") { sets.push("accepted_at = ?"); values.push(now()); }
  }
  if (body.urgent !== undefined) { sets.push("urgent = ?"); values.push(body.urgent ? 1 : 0); }
  if (body.nextFollowUpAt !== undefined) {
    if (body.nextFollowUpAt !== null && (!Number.isSafeInteger(body.nextFollowUpAt) || body.nextFollowUpAt < 0)) {
      return c.json({ error: { code: "invalid_follow_up" } }, 400);
    }
    sets.push("next_follow_up_at = ?"); values.push(body.nextFollowUpAt);
  }
  if (body.preferredChannel !== undefined) {
    if (body.preferredChannel !== null && !CHANNELS.has(body.preferredChannel)) return c.json({ error: { code: "invalid_channel" } }, 400);
    sets.push("preferred_channel = ?"); values.push(body.preferredChannel);
  }
  if (body.lostReason !== undefined) {
    const reason = body.lostReason === null ? null : body.lostReason.trim().slice(0, 1_000);
    sets.push("lost_reason = ?"); values.push(reason || null);
  }
  if (!sets.length) return c.json({ error: { code: "nothing_to_update" } }, 400);
  sets.push("updated_at = ?"); values.push(now(), leadId);
  await c.env.DB.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
  await audit(c, leadId, "lead.update", "allowed");
  return c.json({ ok: true });
});

leadsRouter.post("/api/leads/:leadId/activities", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<{ kind?: string; direction?: string; outcome?: string; content?: string; occurredAt?: number }>().catch(() => null);
  if (!body?.kind || !ACTIVITY_KINDS.has(body.kind)) return c.json({ error: { code: "invalid_activity" } }, 400);
  const direction = body.direction || "internal";
  if (!["inbound", "outbound", "internal"].includes(direction)) return c.json({ error: { code: "invalid_direction" } }, 400);
  const content = String(body.content || "").trim();
  if (content.length > 4_000) return c.json({ error: { code: "content_too_long" } }, 400);
  const timestamp = now();
  const activityId = identifier("lead_activity");
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO lead_activities
         (id, lead_id, actor_user_id, kind, direction, outcome, content, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(activityId, leadId, c.get("userId"), body.kind, direction, String(body.outcome || "").slice(0, 300) || null, content || null, body.occurredAt || timestamp, timestamp),
    c.env.DB.prepare("UPDATE leads SET updated_at = ?, first_response_at = COALESCE(first_response_at, ?) WHERE id = ?")
      .bind(timestamp, direction === "outbound" ? timestamp : null, leadId),
  ]);
  await audit(c, leadId, "lead.activity.create", "allowed");
  return c.json({ id: activityId }, 201);
});

leadsRouter.post("/api/leads/:leadId/reminders", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<{ assignedTo?: string; dueAt?: number; note?: string }>().catch(() => null);
  const dueAt = Number(body?.dueAt);
  const note = String(body?.note || "").trim();
  const assignedTo = String(body?.assignedTo || c.get("userId"));
  if (!Number.isSafeInteger(dueAt) || dueAt <= now() || !note || note.length > 1_000) {
    return c.json({ error: { code: "invalid_reminder" } }, 400);
  }
  const assignee = await c.env.DB.prepare(
    `SELECT 1 FROM users account
      WHERE account.id = ? AND account.disabled_at IS NULL
        AND (? IS NULL OR EXISTS (
          SELECT 1 FROM organization_memberships membership
           WHERE membership.organization_id = ? AND membership.user_id = account.id AND membership.status = 'active'
        ))`,
  ).bind(assignedTo, access.organizationId, access.organizationId).first();
  if (!assignee) return c.json({ error: { code: "invalid_assignee" } }, 400);
  const reminderId = identifier("lead_reminder");
  await c.env.DB.prepare(
    `INSERT INTO lead_reminders (id, lead_id, assigned_to, due_at, note, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(reminderId, leadId, assignedTo, dueAt, note, c.get("userId"), now()).run();
  await audit(c, leadId, "lead.reminder.create", "allowed");
  return c.json({ id: reminderId }, 201);
});

leadsRouter.patch("/api/leads/:leadId/reminders/:reminderId", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<{ status?: string }>().catch(() => null);
  if (!body?.status || !["done", "cancelled"].includes(body.status)) {
    return c.json({ error: { code: "invalid_reminder_status" } }, 400);
  }
  const reminder = await c.env.DB.prepare(
    "SELECT id FROM lead_reminders WHERE id = ? AND lead_id = ? AND status = 'pending'",
  ).bind(c.req.param("reminderId"), leadId).first();
  if (!reminder) return c.json({ error: { code: "not_found" } }, 404);
  const timestamp = now();
  await c.env.DB.prepare(
    "UPDATE lead_reminders SET status = ?, completed_at = ? WHERE id = ? AND lead_id = ?",
  ).bind(body.status, body.status === "done" ? timestamp : null, c.req.param("reminderId"), leadId).run();
  await audit(c, leadId, `lead.reminder.${body.status}`, "allowed");
  return c.json({ ok: true });
});
