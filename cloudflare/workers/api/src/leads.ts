import { LEAD_ARCHIVE_REASONS } from "../../../../src/shared/leadArchive";
import { readJsonBodyUpTo } from "./requestBody";
import { Hono,type Context } from "hono";
import { LEAD_DELETION_REASONS } from "../../../../src/shared/leadDeletionReasons";
import { hasCapability,organizationRoleForUser,platformRoleForUser } from "./authorization";
import {
LEAD_ACTIVITY_KINDS,
LEAD_CHANNELS,
LEAD_STAGES,
coarseLeadStatus,
normalizedLeadPhone,
validateNewLead,
} from "./leadPolicy";
import { now,sha256 } from "./security";
import type { AppBindings } from "./types";
import { AiCoreError } from "./aiCore";
import { reviseLeadFollowUpSection, type FollowUpRevisionSection } from "./leadFollowUps";

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
const LEAD_STAGE_SET = new Set<string>(LEAD_STAGES);
const CHANNELS = new Set<string>(LEAD_CHANNELS);
const ACTIVITY_KINDS = new Set<string>(LEAD_ACTIVITY_KINDS);
const deletionReasons = new Set<string>(LEAD_DELETION_REASONS.map(reason => reason.code));

/** Same row predicate for the active list and navigation activity counts. */
export function leadReadPredicate(userId:string,unrestricted:boolean){
  return unrestricted?{sql:"1=1",values:[] as string[]}:{sql:`(EXISTS (SELECT 1 FROM lead_assignments assignment WHERE assignment.lead_id=lead.id AND assignment.user_id=?) OR EXISTS(SELECT 1 FROM organization_memberships membership WHERE membership.organization_id=lead.organization_id AND membership.user_id=? AND membership.status='active'))`,values:[userId,userId]};
}

type LeadAccess = { read: boolean; write: boolean; organizationId: string | null; archived: boolean };

export async function leadAccess(c: Context<AppBindings>, leadId: string): Promise<LeadAccess | null> {
  const lead = await c.env.DB.prepare("SELECT organization_id,archived_at FROM leads WHERE id = ? AND deleted_at IS NULL")
    .bind(leadId).first<{ organization_id: string | null; archived_at: number | null }>();
  if (!lead) return null;
  const userId = c.get("userId");
  const platformRole = await platformRoleForUser(c.env.DB, userId);
  if (platformRole) return { read: true, write: true, organizationId: lead.organization_id, archived: lead.archived_at != null };
  const [capabilityRead, capabilityWrite] = await Promise.all([
    hasCapability(c.env.DB, userId, "leads.read", lead.organization_id || undefined),
    hasCapability(c.env.DB, userId, "leads.write", lead.organization_id || undefined),
  ]);
  if (capabilityRead || capabilityWrite) {
    return { read: true, write: capabilityWrite, organizationId: lead.organization_id, archived: lead.archived_at != null };
  }

  if (lead.organization_id) {
    const role = await organizationRoleForUser(c.env.DB, lead.organization_id, userId);
    if (role) return {
      read: true,
      write: ["owner", "admin", "manager", "specialist"].includes(role),
      organizationId: lead.organization_id, archived: lead.archived_at != null,
    };
  }

  const assignment = await c.env.DB.prepare(
    "SELECT assignment_role FROM lead_assignments WHERE lead_id = ? AND user_id = ?",
  ).bind(leadId, userId).first<{ assignment_role: string }>();
  if (assignment) return { read: true, write: assignment.assignment_role !== "reviewer", organizationId: lead.organization_id, archived: lead.archived_at != null };

  // Legacy unassigned leads remain available to platform principals and
  // explicit capability holders above; a staff role alone is not an ACL.
  return { read: false, write: false, organizationId: lead.organization_id, archived: lead.archived_at != null };
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

/** Shared native creation; an internal caller may add transactional linkage, never HTTP input. */
export async function createNativeLead(c: Context<AppBindings>, options?: {input: unknown; idempotencyContext?: unknown; statements?: (id:string,timestamp:number)=>D1PreparedStatement[]}) {
  const parsed = validateNewLead(options ? options.input : await c.req.json<unknown>().catch(() => null));
  if (!parsed.ok) return c.json({ error: { code: parsed.code, field: parsed.field } }, 400);
  const lead = parsed.value;
  const userId = c.get("userId");
  const idempotencyKey = (c.req.header("idempotency-key") || "").trim();
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(idempotencyKey)) {
    return c.json({ error: { code: "idempotency_key_required" } }, 400);
  }
  const idempotencyScope = `lead.create:${userId}`;
  const requestHash = await sha256(JSON.stringify(options?.idempotencyContext === undefined ? lead : { lead, context: options.idempotencyContext }));
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
  const canCreate = await hasCapability(c.env.DB, userId, "leads.create", lead.organizationId || undefined);

  if (lead.organizationId) {
    const organizationRole = await organizationRoleForUser(c.env.DB, lead.organizationId, userId);
    if (!platformRole && !canCreate && !["owner", "admin", "manager", "specialist"].includes(organizationRole || "")) {
      return c.json({ error: { code: "organization_scope_denied" } }, 403);
    }
  } else if (!platformRole && !legacyStaff && !canCreate) {
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
    if (duplicate) {
      const access = await leadAccess(c, duplicate.id);
      return c.json({ error: { code: "duplicate_lead", ...(access?.read ? { leadId: duplicate.id } : {}) } }, 409);
    }
  }

  const leadId = identifier("lead");
  const activityId = identifier("lead_activity");
  const timestamp = now();
  const responseJson = JSON.stringify({ id: leadId });
  if (lead.nextFollowUpAt !== null && lead.nextFollowUpAt <= timestamp) {
    return c.json({ error: { code: "invalid_follow_up", field: "nextFollowUpAt" } }, 400);
  }
  try { await c.env.DB.batch([
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
    ...(options?.statements?.(leadId, timestamp) || []),
  ]); } catch {
    const replay=await c.env.DB.prepare("SELECT request_hash,response_json,response_status FROM idempotency_keys WHERE scope=? AND idempotency_key=? AND expires_at>?")
      .bind(idempotencyScope,idempotencyKey,now()).first<{request_hash:string;response_json:string|null;response_status:number|null}>();
    if(replay?.request_hash===requestHash && replay.response_json)return new Response(replay.response_json,{status:replay.response_status||201,headers:{"content-type":"application/json; charset=UTF-8"}});
    return c.json({error:{code:replay?"idempotency_key_reused":"create_failed"}},409);
  }
  await audit(c, leadId, "lead.create", "allowed");
  return c.json({ id: leadId }, 201);
}
leadsRouter.post("/api/leads", (c) => createNativeLead(c));

leadsRouter.get("/api/leads", async (c) => {
  const userId = c.get("userId");
  const platformRole = await platformRoleForUser(c.env.DB, userId);
  const organizationId = (c.req.query("organizationId") || "").slice(0, 96) || null;
  const capabilityRead = await hasCapability(c.env.DB, userId, "leads.read", organizationId || undefined);
  const stage = (c.req.query("stage") || "").slice(0, 40) || null;
  if (stage && !LEAD_STAGE_SET.has(stage)) return c.json({ error: { code: "invalid_stage" } }, 400);
  if (organizationId && !platformRole && !capabilityRead) {
    const role = await organizationRoleForUser(c.env.DB, organizationId, userId);
    if (!role) return c.json({ error: { code: "forbidden" } }, 403);
  }

  const globalWrite = !!platformRole || await hasCapability(c.env.DB,userId,"leads.write",organizationId || undefined);
  const values: unknown[] = [];
  const archived = c.req.query("archived");
  if (archived !== undefined && archived !== "1") return c.json({error:{code:"invalid_filter"}},400);
  const rawOffset = c.req.query("offset") || "0";
  if (!/^\d{1,6}$/.test(rawOffset)) return c.json({error:{code:"invalid_offset"}},400);
  const offset = archived === "1" ? Number(rawOffset) : 0, limit = archived === "1" ? 50 : 250;
  const filters: string[] = ["lead.deleted_at IS NULL", archived === "1" ? "lead.archived_at IS NOT NULL" : "lead.archived_at IS NULL"];
  if (organizationId) { filters.push("lead.organization_id = ?"); values.push(organizationId); }
  if (stage) { filters.push("lead.lifecycle_stage = ?"); values.push(stage); }
  const visibility=leadReadPredicate(userId,!!platformRole||capabilityRead);
  filters.push(visibility.sql);values.push(...visibility.values);
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const { results } = await c.env.DB.prepare(
    `SELECT lead.id, lead.organization_id, lead.source, lead.name, lead.business,
            lead.phone, lead.email, lead.product, lead.status, lead.lifecycle_stage,
            lead.preferred_channel, lead.next_follow_up_at, lead.urgent,
            lead.converted_project_id, lead.estimate_ron, lead.delivery_status,
            CASE WHEN lead.product IN ('logo-studio','logo-studio-3d') THEN lead.config_json ELSE NULL END config_json,
            lead.created_at, lead.updated_at,lead.archived_at,lead.archived_by,lead.archive_reason,lead.archive_note,
            CASE WHEN ?=1 OR EXISTS(SELECT 1 FROM lead_assignments a WHERE a.lead_id=lead.id AND a.user_id=? AND a.assignment_role<>'reviewer') OR EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=lead.organization_id AND m.user_id=? AND m.status='active' AND m.role IN ('owner','admin','manager','specialist')) THEN 1 ELSE 0 END can_archive
       FROM leads AS lead ${where}
      ORDER BY ${archived === "1" ? "lead.archived_at DESC," : ""} lead.urgent DESC,
               CASE WHEN lead.next_follow_up_at IS NULL THEN 1 ELSE 0 END,
               lead.next_follow_up_at, lead.created_at DESC,lead.id
      LIMIT ? OFFSET ?`,
  ).bind(globalWrite?1:0,userId,userId,...values, limit, offset).all();
  c.header("Cache-Control", "private, no-store");
  return c.json({ data: results, platformRole, nextOffset: archived === "1" && results.length === limit ? offset + limit : null });
});

leadsRouter.post("/api/leads/:leadId/archive", async c => {
  const id = c.req.param("leadId"), access = await leadAccess(c,id);
  if (!access) return c.json({error:{code:"not_found"}},404);
  if (!access.write) return c.json({error:{code:"forbidden"}},403);
  const input = await readJsonBodyUpTo(c.req.raw,4096);
  if (!input.ok) return c.json({error:{code:input.error}},input.error === "payload_too_large" ? 413 : 400);
  const b = input.value as {restore?:unknown;reason?:unknown;note?:unknown;expectedUpdatedAt?:unknown;confirmed?:unknown}|null;
  if (!b || typeof b.restore !== "boolean" || b.confirmed !== true || typeof b.expectedUpdatedAt !== "number" || !Number.isSafeInteger(b.expectedUpdatedAt) || b.expectedUpdatedAt<0 || (b.note !== undefined && (typeof b.note!=="string" || b.note.length>1000)) || (!b.restore && !LEAD_ARCHIVE_REASONS.some(r=>r.code===b.reason))) return c.json({error:{code:"invalid_archive_request"}},400);
  const timestamp = Math.max(now(),b.expectedUpdatedAt+1), note = typeof b.note === "string" ? b.note.trim() : "";
  const [result] = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE leads SET archived_at=?,archived_by=?,archive_reason=?,archive_note=?,updated_at=? WHERE id=? AND deleted_at IS NULL AND coalesce(updated_at,0)=? AND ${b.restore ? "archived_at IS NOT NULL" : "archived_at IS NULL"}`)
      .bind(b.restore?null:timestamp,b.restore?null:c.get("userId"),b.restore?null:b.reason,b.restore?null:note,timestamp,id,b.expectedUpdatedAt),
    c.env.DB.prepare(`INSERT INTO lead_activities(id,lead_id,actor_user_id,kind,direction,outcome,content,occurred_at,created_at) SELECT ?,?,?,'status_change','internal',?,?,?,? WHERE changes()=1`)
      .bind(identifier("la"),id,c.get("userId"),b.restore?"restored":"archived",b.restore ? "Lead restaurat din arhivă." : `Arhivat: ${LEAD_ARCHIVE_REASONS.find(r=>r.code===b.reason)?.label}${note ? " · " + note : ""}`,timestamp,timestamp),
    c.env.DB.prepare(`INSERT INTO security_events(id,organization_id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,request_id,metadata_json,created_at)
      SELECT ?,?,?,'user',?,'lead',?,'allowed','info',?,?,? WHERE changes()=1`)
      .bind(identifier("evt"),access.organizationId,c.get("userId"),b.restore?"lead.restore":"lead.archive",id,c.get("requestId")||null,JSON.stringify({reason:b.restore?null:b.reason}),timestamp),
  ]);
  if (!result.meta.changes) return c.json({error:{code:"lead_changed",message:"Leadul s-a modificat. Reîncarcă lista înainte de confirmare."}},409);
  return c.json({ok:true});
});

leadsRouter.get("/api/leads/deletions", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) {
    return c.json({ error: { code: "forbidden" } }, 403);
  }
  const { results } = await c.env.DB.prepare(
    `SELECT event.id, event.target_id AS lead_id, event.actor_user_id,
            actor.email AS actor_email,
            COALESCE(NULLIF(lead.name,''), NULLIF(lead.business,''), 'Lead fără nume') AS lead_label,
            lead.business, lead.source, lead.lifecycle_stage,
            COALESCE(lead.deletion_reason_key,lead.deletion_reason_code) AS reason_code,
            lead.deletion_reason_detail AS reason_detail,
            event.created_at
       FROM security_events AS event
       LEFT JOIN users AS actor ON actor.id = event.actor_user_id
       LEFT JOIN leads AS lead ON lead.id = event.target_id
      WHERE event.action = 'lead.delete' AND event.outcome = 'allowed'
      ORDER BY event.created_at DESC LIMIT 100`,
  ).all();
  return c.json({ data: results });
});

leadsRouter.get("/api/leads/:leadId", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.read) return c.json({ error: { code: "forbidden" } }, 403);
  const lead = await c.env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
  const [activities, assignments, reminders, followUps] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY occurred_at DESC LIMIT 200").bind(leadId).all(),
    c.env.DB.prepare(
      `SELECT assignment.user_id, assignment.assignment_role, assignment.assigned_at,
              account.email, account.display_name
         FROM lead_assignments assignment JOIN users account ON account.id = assignment.user_id
        WHERE assignment.lead_id = ? ORDER BY assignment.assigned_at`,
    ).bind(leadId).all(),
    c.env.DB.prepare("SELECT * FROM lead_reminders WHERE lead_id = ? ORDER BY due_at DESC LIMIT 100").bind(leadId).all(),
    c.env.DB.prepare(
      `SELECT id,sequence,due_at,status,whatsapp_body,email_subject,email_body,
              generated_by_model,generated_at,sent_at,whatsapp_sent_at,email_sent_at,expires_at,approval_status,
              approved_by,approved_at,revision,updated_at
         FROM lead_follow_up_drafts WHERE lead_id=? ORDER BY sequence DESC LIMIT 10`,
    ).bind(leadId).all(),
  ]);
  return c.json({
    data: lead, activities: activities.results, assignments: assignments.results,
    reminders: reminders.results, followUps: followUps.results,
    canEdit: access.write && !access.archived, currentUserId: c.get("userId"),
  });
});

leadsRouter.patch("/api/leads/:leadId", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) { await audit(c, leadId, "lead.update", "denied"); return c.json({ error: { code: "forbidden" } }, 403); }
  if (access.archived) return c.json({error:{code:"lead_archived",message:"Restaurează leadul înainte de modificare."}},409);
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
  sets.push("updated_at = max(?, coalesce(updated_at, 0) + 1)"); values.push(now(), leadId);
  const updated = await c.env.DB.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ? AND archived_at IS NULL AND deleted_at IS NULL RETURNING updated_at`).bind(...values).first<{updated_at:number}>();
  if (!updated) return c.json({error:{code:"lead_changed"}},409);
  if (body.lifecycleStage && ["accepted", "rejected"].includes(body.lifecycleStage)) {
    await c.env.DB.prepare(
      `UPDATE lead_follow_up_drafts
          SET status='cancelled',approval_status='rejected',updated_at=?
        WHERE lead_id=? AND status IN ('queued','generating','ready')`,
    ).bind(updated.updated_at, leadId).run();
  }
  await audit(c, leadId, "lead.update", "allowed");
  return c.json({ ok: true, updatedAt: updated.updated_at });
});

leadsRouter.delete("/api/leads/:leadId", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  const destructiveAccess = Boolean(await platformRoleForUser(c.env.DB, c.get("userId")))
    || await hasCapability(c.env.DB, c.get("userId"), "leads.delete", access.organizationId || undefined);
  if (!access.write || !destructiveAccess) { await audit(c, leadId, "lead.delete", "denied"); return c.json({ error: { code: "forbidden" } }, 403); }
  const body = await c.req.json<{ reasonCode?: string; reasonDetail?: string }>().catch(() => null);
  const reasonCode = String(body?.reasonCode || "");
  const reasonDetail = String(body?.reasonDetail || "").trim().slice(0, 500);
  if (!deletionReasons.has(reasonCode) || (reasonCode === "other" && reasonDetail.length < 5)) {
    return c.json({ error: { code: "invalid_deletion_reason" } }, 400);
  }
  const lead = await c.env.DB.prepare(
    "SELECT organization_id,name,business,source,lifecycle_stage FROM leads WHERE id=? AND deleted_at IS NULL",
  ).bind(leadId).first<{ organization_id: string | null; name: string | null; business: string | null; source: string | null; lifecycle_stage: string }>();
  if (!lead) return c.json({ error: { code: "not_found" } }, 404);
  const timestamp = now();
  const eventId = identifier("evt");
  const metadata = JSON.stringify({
    reasonCode, reasonDetail: reasonDetail || null,
    label: lead.name || lead.business || "Lead fără nume", source: lead.source, lifecycleStage: lead.lifecycle_stage,
  });
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE leads SET deleted_at=?,deleted_by=?,deletion_reason_code=?,deletion_reason_key=?,deletion_reason_detail=?,updated_at=?
        WHERE id=? AND deleted_at IS NULL`,
    ).bind(timestamp, c.get("userId"), ["changed_mind","unwilling_to_pay","requirements_not_met"].includes(reasonCode) ? "other" : reasonCode, reasonCode, reasonDetail || null, timestamp, leadId),
    c.env.DB.prepare(
      `INSERT INTO security_events
         (id,organization_id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,request_id,metadata_json,created_at)
       SELECT ?,organization_id,?,'user','lead.delete','lead',?,'allowed','info',?,?,?
         FROM leads WHERE id=? AND deleted_at=? AND deleted_by=?`,
    ).bind(eventId, c.get("userId"), leadId, c.get("requestId") || null, metadata, timestamp, leadId, timestamp, c.get("userId")),
  ]);
  if (!(results[0].meta.changes ?? 0) || !(results[1].meta.changes ?? 0)) {
    return c.json({ error: { code: "not_found" } }, 404);
  }
  return c.json({ ok: true });
});

leadsRouter.post("/api/leads/:leadId/activities", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) return c.json({ error: { code: "forbidden" } }, 403);
  if (access.archived) return c.json({error:{code:"lead_archived",message:"Restaurează leadul înainte de modificare."}},409);
  const body = await c.req.json<{ kind?: string; direction?: string; outcome?: string; content?: string; occurredAt?: number }>().catch(() => null);
  if (!body?.kind || !ACTIVITY_KINDS.has(body.kind)) return c.json({ error: { code: "invalid_activity" } }, 400);
  const direction = body.direction || "internal";
  if (!["inbound", "outbound", "internal"].includes(direction)) return c.json({ error: { code: "invalid_direction" } }, 400);
  const content = String(body.content || "").trim();
  if (content.length > 4_000) return c.json({ error: { code: "content_too_long" } }, 400);
  const timestamp = now();
  const activityId = identifier("lead_activity");
  const [updated] = await c.env.DB.batch([
    c.env.DB.prepare("UPDATE leads SET updated_at = max(?,coalesce(updated_at,0)+1), first_response_at = COALESCE(first_response_at, ?) WHERE id = ? AND archived_at IS NULL AND deleted_at IS NULL")
      .bind(timestamp, direction === "outbound" ? timestamp : null, leadId),
    c.env.DB.prepare(`INSERT INTO lead_activities(id,lead_id,actor_user_id,kind,direction,outcome,content,occurred_at,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE changes()=1`)
      .bind(activityId,leadId,c.get("userId"),body.kind,direction,String(body.outcome||"").slice(0,300)||null,content||null,body.occurredAt||timestamp,timestamp),
    ...(direction === "inbound" ? [c.env.DB.prepare(
      `UPDATE lead_follow_up_drafts
          SET status='cancelled',approval_status='rejected',updated_at=?
        WHERE lead_id=? AND status IN ('queued','generating','ready')`,
    ).bind(timestamp, leadId)] : []),
  ]);
  if (!updated.meta.changes) return c.json({error:{code:"lead_changed"}},409);
  await audit(c, leadId, "lead.activity.create", "allowed");
  return c.json({ id: activityId }, 201);
});

leadsRouter.post("/api/leads/:leadId/claim", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) return c.json({ error: { code: "forbidden" } }, 403);
  if (access.archived) return c.json({error:{code:"lead_archived"}},409);
  const userId = c.get("userId");
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE lead_assignments SET assignment_role='collaborator' WHERE lead_id=? AND assignment_role='owner' AND user_id<>?",
    ).bind(leadId, userId),
    c.env.DB.prepare(
      `INSERT INTO lead_assignments (lead_id,user_id,assignment_role,assigned_by,assigned_at)
       VALUES (?,?,'owner',?,?)
       ON CONFLICT(lead_id,user_id) DO UPDATE SET
         assignment_role='owner',assigned_by=excluded.assigned_by,assigned_at=excluded.assigned_at`,
    ).bind(leadId, userId, userId, timestamp),
    c.env.DB.prepare(
      `INSERT INTO lead_activities
        (id,lead_id,actor_user_id,kind,direction,outcome,content,occurred_at,created_at)
       VALUES (?, ?, ?, 'assignment', 'internal', 'claimed',
               'Responsabilitatea principală a fost preluată din dashboardul intern.', ?, ?)`,
    ).bind(identifier("lead_activity"), leadId, userId, timestamp, timestamp),
    c.env.DB.prepare("UPDATE leads SET updated_at=? WHERE id=?").bind(timestamp, leadId),
  ]);
  await audit(c, leadId, "lead.claim", "allowed");
  return c.json({ ok: true });
});

leadsRouter.post("/api/leads/:leadId/follow-ups/:draftId/review", async (c) => {
  const leadId = c.req.param("leadId");
  const draftId = c.req.param("draftId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) return c.json({ error: { code: "forbidden" } }, 403);
  if (access.archived) return c.json({error:{code:"lead_archived"}},409);
  const body = await c.req.json<{ decision?: string; revision?: number }>().catch(() => null);
  if (!body || !["approved", "rejected"].includes(body.decision || "") || !Number.isSafeInteger(body.revision) || Number(body.revision) < 1) {
    return c.json({ error: { code: "invalid_review" } }, 400);
  }
  const timestamp = now();
  const result = await c.env.DB.prepare(
    `UPDATE lead_follow_up_drafts
        SET approval_status=?,approved_by=?,approved_at=?,revision=revision+1,updated_at=?
      WHERE id=? AND lead_id=? AND status='ready' AND expires_at>unixepoch()*1000 AND revision=?`,
  ).bind(body.decision, c.get("userId"), timestamp, timestamp, draftId, leadId, body.revision).run();
  if (!result.meta.changes) return c.json({ error: { code: "stale_or_unavailable_draft" } }, 409);
  await c.env.DB.prepare(
    `INSERT INTO lead_activities
      (id,lead_id,actor_user_id,kind,direction,outcome,content,occurred_at,created_at)
     VALUES (?, ?, ?, 'note', 'internal', ?, ?, ?, ?)`,
  ).bind(
    identifier("lead_activity"), leadId, c.get("userId"),
    `follow_up_${body.decision}`,
    body.decision === "approved"
      ? "Ciorna exactă a fost aprobată intern; nu a fost trimisă extern."
      : "Ciorna a fost respinsă și rămâne netrimisă.",
    timestamp, timestamp,
  ).run();
  await audit(c, leadId, `lead.follow_up.${body.decision}`, "allowed");
  return c.json({ ok: true, revision: Number(body.revision) + 1 });
});

leadsRouter.post("/api/leads/:leadId/follow-ups/:draftId/revise", async (c) => {
  const leadId = c.req.param("leadId");
  const draftId = c.req.param("draftId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) return c.json({ error: { code: "forbidden" } }, 403);
  if (access.archived) return c.json({error:{code:"lead_archived"}},409);
  const idempotencyKey = (c.req.header("idempotency-key") || "").trim();
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(idempotencyKey)) {
    return c.json({ error: { code: "idempotency_key_required" } }, 400);
  }
  const body = await c.req.json<{ section?: string; instruction?: string; revision?: number }>().catch(() => null);
  const section = body?.section as FollowUpRevisionSection | undefined;
  const instruction = String(body?.instruction || "").trim();
  if (!section || !["whatsapp", "email"].includes(section) || instruction.length < 5 || instruction.length > 1_200
    || !Number.isSafeInteger(body?.revision) || Number(body?.revision) < 1) {
    return c.json({ error: { code: "invalid_revision_request" } }, 400);
  }
  const requestHash = await sha256(JSON.stringify({leadId,draftId,userId:c.get("userId"),section,instruction,revision:body!.revision}));
  const previous = await c.env.DB.prepare(
    `SELECT status,section,proposed_text,proposed_subject,base_revision,error_code,request_hash
       FROM lead_follow_up_draft_revisions WHERE idempotency_key=?`,
  ).bind(idempotencyKey).first<{
    status: string; section: string; proposed_text: string | null; proposed_subject: string | null;
    base_revision: number; error_code: string | null; request_hash:string;
  }>();
  if (previous) {
    if (previous.section !== section || previous.request_hash !== requestHash) return c.json({ error: { code: "idempotency_key_reused" } }, 409);
    if (previous.status === "ready") return c.json({
      ok: true, section, body: previous.proposed_text, subject: previous.proposed_subject,
      revision: previous.base_revision + 1,
    });
    return c.json({ error: { code: previous.status === "generating" ? "revision_in_progress" : "revision_requires_new_key" } }, 409);
  }
  const draft = await c.env.DB.prepare(
    `SELECT draft.revision,draft.status,draft.whatsapp_body,draft.email_subject,draft.email_body,draft.whatsapp_sent_at,draft.email_sent_at,
            lead.name,lead.business,lead.product
       FROM lead_follow_up_drafts draft JOIN leads lead ON lead.id=draft.lead_id
      WHERE draft.id=? AND draft.lead_id=? AND lead.deleted_at IS NULL AND lead.archived_at IS NULL AND draft.expires_at>unixepoch()*1000`,
  ).bind(draftId, leadId).first<{
    revision: number; status: string; whatsapp_body: string | null; email_subject: string | null; email_body: string | null; whatsapp_sent_at:number|null;email_sent_at:number|null;
    name: string | null; business: string | null; product: string | null;
  }>();
  if (!draft) return c.json({ error: { code: "not_found" } }, 404);
  if (draft.status !== "ready" || draft.revision !== body!.revision) {
    return c.json({ error: { code: "stale_or_unavailable_draft" } }, 409);
  }
  if(section === "whatsapp" ? draft.whatsapp_sent_at : draft.email_sent_at) return c.json({error:{code:"channel_already_sent"}},409);
  const currentBody = section === "whatsapp" ? draft.whatsapp_body : draft.email_body;
  if (!currentBody) return c.json({ error: { code: "section_unavailable" } }, 400);
  const revisionId = identifier("lead_follow_up_revision");
  const timestamp = now();
  const beforeText = section === "email"
    ? JSON.stringify({ subject: draft.email_subject, body: draft.email_body })
    : currentBody;
  try {
    await c.env.DB.prepare(
      `INSERT INTO lead_follow_up_draft_revisions
        (id,draft_id,section,instruction,before_text,status,idempotency_key,requested_by,base_revision,created_at,request_hash)
       VALUES (?,?,?,?,?,'generating',?,?,?,?,?)`,
    ).bind(revisionId, draftId, section, instruction, beforeText, idempotencyKey, c.get("userId"), draft.revision, timestamp, requestHash).run();
    const proposed = await reviseLeadFollowUpSection(c.env, {
      draftId, section, instruction, idempotencyKey: `lead-follow-up-revision:${idempotencyKey}`,
      name: draft.name, business: draft.business, product: draft.product,
      currentBody, currentSubject: section === "email" ? draft.email_subject : null,
    });
    const refreshed = await leadAccess(c,leadId);
    if (!refreshed?.write || refreshed.archived) throw new AiCoreError("lead_access_revoked");
    const completedAt = now();
    const updateDraft = section === "whatsapp"
      ? c.env.DB.prepare(
        `UPDATE lead_follow_up_drafts
            SET whatsapp_body=?,approval_status='pending',approved_by=NULL,approved_at=NULL,
                generated_by_model=?,revision=revision+1,updated_at=?
          WHERE id=? AND lead_id=? AND status='ready' AND expires_at>unixepoch()*1000 AND revision=?`,
      ).bind(proposed.body, proposed.model, completedAt, draftId, leadId, draft.revision)
      : c.env.DB.prepare(
        `UPDATE lead_follow_up_drafts
            SET email_subject=?,email_body=?,approval_status='pending',approved_by=NULL,approved_at=NULL,
                generated_by_model=?,revision=revision+1,updated_at=?
          WHERE id=? AND lead_id=? AND status='ready' AND expires_at>unixepoch()*1000 AND revision=?`,
      ).bind(proposed.subject, proposed.body, proposed.model, completedAt, draftId, leadId, draft.revision);
    const results = await c.env.DB.batch([
      updateDraft,
      c.env.DB.prepare(
        `UPDATE lead_follow_up_draft_revisions
            SET proposed_text=?,proposed_subject=?,model=?,status='ready',completed_at=?
          WHERE id=? AND status='generating'`,
      ).bind(proposed.body, proposed.subject, proposed.model, completedAt, revisionId),
    ]);
    if (!results[0].meta.changes) {
      await c.env.DB.prepare(
        "UPDATE lead_follow_up_draft_revisions SET status='superseded',error_code='stale_revision',completed_at=? WHERE id=?",
      ).bind(completedAt, revisionId).run();
      return c.json({ error: { code: "stale_or_unavailable_draft" } }, 409);
    }
    await c.env.DB.prepare(
      `INSERT INTO lead_activities
        (id,lead_id,actor_user_id,actor_agent_slug,kind,direction,outcome,content,occurred_at,created_at)
       VALUES (?, ?, ?, 'leads', 'note', 'internal', 'follow_up_section_revised', ?, ?, ?)`,
    ).bind(
      identifier("lead_activity"), leadId, c.get("userId"),
      `Workers AI a revizuit exclusiv secțiunea ${section === "whatsapp" ? "WhatsApp" : "e-mail"}; aprobarea anterioară a fost resetată.`,
      completedAt, completedAt,
    ).run();
    await audit(c, leadId, "lead.follow_up.revise", "allowed");
    return c.json({ ok: true, section, body: proposed.body, subject: proposed.subject, revision: draft.revision + 1 });
  } catch (error) {
    const code = error instanceof AiCoreError ? error.code : "revision_failed";
    await c.env.DB.prepare(
      `UPDATE lead_follow_up_draft_revisions
          SET status='failed',error_code=?,completed_at=? WHERE id=? AND status='generating'`,
    ).bind(code, now(), revisionId).run().catch(() => undefined);
    return c.json({ error: { code } }, 503);
  }
});

leadsRouter.post("/api/leads/:leadId/follow-ups/:draftId/sent", async (c) => {
  const leadId=c.req.param("leadId"), draftId=c.req.param("draftId"), access=await leadAccess(c,leadId);
  if(!access?.write) return c.json({error:{code:"forbidden"}},403);
  if(access.archived) return c.json({error:{code:"lead_archived"}},409);
  const body=await c.req.json<{revision?:number;channels?:unknown}>().catch(()=>null);
  if(!Number.isSafeInteger(body?.revision)||!Array.isArray(body?.channels)||!body.channels.length||body.channels.some(v=>!["whatsapp","email"].includes(v))) return c.json({error:{code:"invalid_send_confirmation"}},400);
  const channels=[...new Set(body.channels)] as string[], stamp=now();
  const draft=await c.env.DB.prepare("SELECT sequence,whatsapp_body,email_body,whatsapp_sent_at,email_sent_at FROM lead_follow_up_drafts WHERE id=? AND lead_id=? AND status='ready' AND approval_status='approved' AND revision=? AND expires_at>?").bind(draftId,leadId,body.revision,stamp).first<{sequence:number;whatsapp_body:string|null;email_body:string|null;whatsapp_sent_at:number|null;email_sent_at:number|null}>();
  if(!draft) return c.json({error:{code:"stale_unapproved_or_unavailable_draft"}},409);
  if(channels.some(v=>v==='whatsapp'?(!draft.whatsapp_body||draft.whatsapp_sent_at):(!draft.email_body||draft.email_sent_at))) return c.json({error:{code:"channel_unavailable_or_already_confirmed"}},409);
  const complete=(!draft.whatsapp_body||!!draft.whatsapp_sent_at||channels.includes('whatsapp'))&&(!draft.email_body||!!draft.email_sent_at||channels.includes('email'));
  try {
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE lead_follow_up_drafts SET whatsapp_sent_at=CASE WHEN ? THEN ? ELSE whatsapp_sent_at END,email_sent_at=CASE WHEN ? THEN ? ELSE email_sent_at END,status=?,sent_at=?,updated_at=?,revision=CASE WHEN revision=? AND status='ready' AND approval_status='approved' AND expires_at>? THEN revision+1 ELSE NULL END WHERE id=? AND lead_id=?").bind(Number(channels.includes('whatsapp')),stamp,Number(channels.includes('email')),stamp,complete?'sent':'ready',complete?stamp:null,stamp,body.revision,stamp,draftId,leadId),
      ...channels.map(channel=>c.env.DB.prepare("INSERT INTO lead_activities(id,lead_id,actor_user_id,kind,direction,outcome,content,occurred_at,created_at) VALUES(?,?,?,?,'outbound','sent_confirmed_by_staff',?,?,?)").bind(identifier('lead_activity'),leadId,c.get('userId'),channel,`Trimiterea revenirii ${draft.sequence} prin ${channel} a fost confirmată manual de staff.`,stamp,stamp)),
      c.env.DB.prepare("UPDATE leads SET next_follow_up_at=CASE WHEN ?=1 AND ?=1 THEN first_response_at+? WHEN ?=1 THEN NULL ELSE next_follow_up_at END,updated_at=? WHERE id=?").bind(draft.sequence,Number(complete),7*24*60*60*1000,Number(complete),stamp,leadId),
      c.env.DB.prepare("UPDATE lead_reminders SET status='done',completed_at=? WHERE id=? AND status='pending' AND ?=1").bind(stamp,`lead_reminder_${draftId}`,Number(complete)),
    ]);
  } catch {return c.json({error:{code:"stale_unapproved_or_unavailable_draft"}},409);}
  await audit(c,leadId,'lead.follow_up.sent_confirmed','allowed');
  return c.json({ok:true,revision:Number(body.revision)+1,complete});
});

leadsRouter.post("/api/leads/:leadId/reminders", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) return c.json({ error: { code: "forbidden" } }, 403);
  if (access.archived) return c.json({error:{code:"lead_archived",message:"Restaurează leadul înainte de modificare."}},409);
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
  const inserted = await c.env.DB.prepare(
    `INSERT INTO lead_reminders (id, lead_id, assigned_to, due_at, note, created_by, created_at)
     SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM leads WHERE id=? AND archived_at IS NULL AND deleted_at IS NULL)`,
  ).bind(reminderId, leadId, assignedTo, dueAt, note, c.get("userId"), now(),leadId).run();
  if (!inserted.meta.changes) return c.json({error:{code:"lead_changed"}},409);
  await audit(c, leadId, "lead.reminder.create", "allowed");
  return c.json({ id: reminderId }, 201);
});

leadsRouter.patch("/api/leads/:leadId/reminders/:reminderId", async (c) => {
  const leadId = c.req.param("leadId");
  const access = await leadAccess(c, leadId);
  if (!access) return c.json({ error: { code: "not_found" } }, 404);
  if (!access.write) return c.json({ error: { code: "forbidden" } }, 403);
  if (access.archived) return c.json({error:{code:"lead_archived",message:"Restaurează leadul înainte de modificare."}},409);
  const body = await c.req.json<{ status?: string }>().catch(() => null);
  if (!body?.status || !["done", "cancelled"].includes(body.status)) {
    return c.json({ error: { code: "invalid_reminder_status" } }, 400);
  }
  const reminder = await c.env.DB.prepare(
    "SELECT id FROM lead_reminders WHERE id = ? AND lead_id = ? AND status = 'pending'",
  ).bind(c.req.param("reminderId"), leadId).first();
  if (!reminder) return c.json({ error: { code: "not_found" } }, 404);
  const timestamp = now();
  const updated = await c.env.DB.prepare(
    "UPDATE lead_reminders SET status = ?, completed_at = ? WHERE id = ? AND lead_id = ? AND EXISTS(SELECT 1 FROM leads WHERE id=? AND archived_at IS NULL AND deleted_at IS NULL)",
  ).bind(body.status, body.status === "done" ? timestamp : null, c.req.param("reminderId"), leadId,leadId).run();
  if (!updated.meta.changes) return c.json({error:{code:"lead_changed"}},409);
  await audit(c, leadId, `lead.reminder.${body.status}`, "allowed");
  return c.json({ ok: true });
});
