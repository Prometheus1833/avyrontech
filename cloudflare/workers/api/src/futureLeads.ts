import { checkRateLimit } from "./antispam";
import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  bucharestDay,
  futureLeadInput,
  type FutureLeadInput,
  type FutureLeadRow,
} from "../../../../src/shared/futureLeads";
import { PROJECT_STAGES } from "../../../../src/shared/projectLifecycle";
import { hasCapability, platformRoleForUser } from "./authorization";
import {
  futureLeadPermissions,
  futureLeadScope,
  futureWriteSql,
} from "./futureLeadPolicy";
import { createNativeLead, leadAccess } from "./leads";
import { createNativeProject } from "./projects";
import { readJsonBodyUpTo } from "./requestBody";
import { sha256 } from "./security";
import type { AppBindings } from "./types";
const root = "/api/future-leads";
const uid = () => crypto.randomUUID();
const fail = (
  c: Context<AppBindings>,
  code: string,
  status: 400 | 401 | 403 | 404 | 409 | 429 | 503 = 400,
) => c.json({ error: { code } }, status);
export const futureLeadsRouter = new Hono<AppBindings>();
futureLeadsRouter.use(root + "*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  if (!c.get("userId")) return fail(c, "unauthenticated", 401);
  if (!(await futureLeadPermissions(c.env.DB, c.get("userId"))).read)
    return fail(c, "forbidden", 403);
  const write = !["GET", "HEAD", "OPTIONS"].includes(c.req.method);
  const rate = await checkRateLimit(c.env.DB, [
    {
      key: `future-leads:${c.get("userId")}:${write ? "write" : "read"}`,
      limit: write ? 300 : 1200,
      windowSec: 3600,
    },
  ]);
  if (!rate.ok) {
    c.header("Retry-After", String(rate.retryAfter || 60));
    return fail(c, "rate_limited", 429);
  }
  await next();
});
futureLeadsRouter.onError((_error, c) => {
  console.error(
    JSON.stringify({
      event: "future_leads_failed",
      requestId: c.get("requestId") || null,
    }),
  );
  return fail(c, "temporarily_unavailable", 503);
});
const foldSearch = (expression: string) =>
  [
    ...[
      "ăa",
      "Ăa",
      "âa",
      "Âa",
      "îi",
      "Îi",
      "șs",
      "Șs",
      "şs",
      "Şs",
      "țt",
      "Țt",
      "ţt",
      "Ţt",
    ],
  ].reduce(
    (sql, pair) => `replace(${sql},'${pair[0]}','${pair[1]}')`,
    expression,
  );
const select = `SELECT f.*,l.name,l.business,l.phone,l.email,l.source,l.converted_project_id,l.updated_at lead_updated_at,
  l.organization_id,cl.company_name client_name,p.slug project_slug,
  COALESCE((SELECT json_group_array(json_object('id',a.user_id,'name',COALESCE(u.display_name,u.email),'role',a.assignment_role))
    FROM lead_assignments a JOIN users u ON u.id=a.user_id WHERE a.lead_id=f.lead_id AND u.disabled_at IS NULL
    AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))),'[]') staff_json
  FROM future_leads f JOIN leads l ON l.id=f.lead_id LEFT JOIN clients cl ON cl.id=f.client_id
  LEFT JOIN projects p ON p.id=l.converted_project_id`;
type Stored = FutureLeadRow & {
  staff_json: string;
  lead_updated_at: number;
  organization_id: string | null;
};
async function load(c: Context<AppBindings>, id: string) {
  const p = await futureLeadPermissions(c.env.DB, c.get("userId")),
    scope = futureLeadScope(c.get("userId"), p.all);
  const row = await c.env.DB.prepare(
    `${select} WHERE f.lead_id=? AND l.deleted_at IS NULL AND ${scope.sql}`,
  )
    .bind(id, ...scope.values)
    .first<Stored>();
  if (!row) return null;
  row.staff = JSON.parse(row.staff_json);
  row.can_edit =
    p.manage ||
    row.staff.some((a) => a.id === c.get("userId") && a.role !== "reviewer");
  return row;
}
function publicRow(row: Stored): FutureLeadRow {
  const {
    staff_json: _staffJson,
    lead_updated_at: _updated,
    organization_id: _org,
    ...visible
  } = row;
  return visible;
}
async function clientAllowed(c: Context<AppBindings>, client: string | null) {
  if (!client) return true;
  const principal = !!(await platformRoleForUser(c.env.DB, c.get("userId")));
  const broad =
    (await hasCapability(c.env.DB, c.get("userId"), "projects.all")) &&
    (await hasCapability(c.env.DB, c.get("userId"), "projects.create"));
  return !!(await c.env.DB.prepare(
    `SELECT 1 FROM clients cl WHERE cl.id=? AND (? OR ? OR
    EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=cl.id AND ca.user_id=?) OR
    EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships m ON m.organization_id=co.organization_id
      WHERE co.client_id=cl.id AND m.user_id=? AND m.status='active' AND m.role IN('owner','admin','manager')))`,
  )
    .bind(
      client,
      principal ? 1 : 0,
      broad ? 1 : 0,
      c.get("userId"),
      c.get("userId"),
    )
    .first());
}
async function validStaff(c: Context<AppBindings>, ids: string[]) {
  const rows = await c.env.DB.prepare(
    `SELECT u.id FROM users u WHERE u.id IN(SELECT value FROM json_each(?)) AND u.disabled_at IS NULL
    AND u.email_verified=1 AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))`,
  )
    .bind(JSON.stringify(ids))
    .all<{ id: string }>();
  return rows.results.length === ids.length;
}
function assignments(
  c: Context<AppBindings>,
  id: string,
  ids: string[],
  time: number,
) {
  return [
    c.env.DB.prepare(
      "DELETE FROM lead_assignments WHERE lead_id=? AND user_id NOT IN(SELECT value FROM json_each(?))",
    ).bind(id, JSON.stringify(ids)),
    c.env.DB.prepare(
      `INSERT INTO lead_assignments(lead_id,user_id,assignment_role,assigned_by,assigned_at)
      SELECT ?,value,'collaborator',?,? FROM json_each(?) WHERE 1
      ON CONFLICT(lead_id,user_id) DO NOTHING`,
    ).bind(id, c.get("userId"), time, JSON.stringify(ids)),
  ];
}
function event(
  c: Context<AppBindings>,
  id: string,
  revision: number,
  action: string,
  time: number,
  expected?: number,
  leadUpdated?: number,
  authority: "edit" | "manage" | "convert" = "edit",
) {
  return c.env.DB.prepare(
    `INSERT INTO future_lead_events(id,lead_id,revision,actor_id,action,created_at)
    VALUES(?,?,${expected === undefined ? "?" : `(SELECT f.revision+1 FROM future_leads f JOIN leads l ON l.id=f.lead_id JOIN users actor ON actor.id=? WHERE f.lead_id=? AND f.revision=? AND l.deleted_at IS NULL AND l.archived_at IS NULL AND l.converted_project_id IS NULL AND l.updated_at=? AND ${futureWriteSql(authority, "f.lead_id", time)})`},?,?,?)`,
  ).bind(
    uid(),
    id,
    ...(expected === undefined
      ? [revision]
      : [c.get("userId"), id, expected, leadUpdated!]),
    c.get("userId"),
    action,
    time,
  );
}
function activity(
  c: Context<AppBindings>,
  id: string,
  action: string,
  time: number,
  kind = "note",
) {
  return c.env.DB.prepare(
    `INSERT INTO lead_activities(id,lead_id,actor_user_id,kind,direction,outcome,content,occurred_at,created_at)
    VALUES(?,?,?,?,'internal',?,?,?,?)`,
  ).bind(
    uid(),
    id,
    c.get("userId"),
    kind,
    action,
    "Leaduri Viitoare · " + action,
    time,
    time,
  );
}
function schedule(
  c: Context<AppBindings>,
  id: string,
  input: FutureLeadInput,
  time: number,
  expectedLeadUpdated?: number,
) {
  return c.env.DB.prepare(
    `INSERT INTO future_leads(lead_id,title,contact_on,requirements,project_kind,client_id,scheduled_at,created_at,updated_at)
    SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM leads l JOIN users actor ON actor.id=? WHERE l.id=? AND l.deleted_at IS NULL AND l.archived_at IS NULL
    AND l.converted_project_id IS NULL AND l.lifecycle_stage NOT IN('rejected','converted') ${expectedLeadUpdated === undefined ? "" : "AND l.updated_at=?"} AND ${futureWriteSql("create", "l.id", time)})`,
  ).bind(
    id,
    input.title,
    input.contactOn,
    input.requirements,
    input.projectKind,
    input.clientId,
    time,
    time,
    time,
    c.get("userId"),
    id,
    ...(expectedLeadUpdated === undefined ? [] : [expectedLeadUpdated]),
  );
}
async function body(c: Context<AppBindings>) {
  const parsed = await readJsonBodyUpTo(c.req.raw, 16 * 1024);
  return parsed.ok ? parsed.value : null;
}
futureLeadsRouter.get(root + "/bootstrap", async (c) => {
  const p = await futureLeadPermissions(c.env.DB, c.get("userId"));
  const staff = p.manage
    ? (
        await c.env.DB.prepare(
          `SELECT u.id,COALESCE(u.display_name,u.email) name FROM users u WHERE u.disabled_at IS NULL AND u.email_verified=1
    AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin')) ORDER BY name LIMIT 300`,
        ).all<{ id: string; name: string }>()
      ).results
    : [];
  // Return only client IDs already accessible through the native project creation policy.
  const principal = !!(await platformRoleForUser(c.env.DB, c.get("userId")));
  const broad =
    (await hasCapability(c.env.DB, c.get("userId"), "projects.all")) &&
    (await hasCapability(c.env.DB, c.get("userId"), "projects.create"));
  const clients = p.manage
    ? (
        await c.env.DB.prepare(
          `SELECT cl.id,cl.company_name name,cl.contact_name,cl.email,cl.phone FROM clients cl WHERE ? OR ? OR
    EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=cl.id AND ca.user_id=?) OR
    EXISTS(SELECT 1 FROM client_organizations co JOIN organization_memberships m ON m.organization_id=co.organization_id
      WHERE co.client_id=cl.id AND m.user_id=? AND m.status='active' AND m.role IN('owner','admin','manager')) ORDER BY name LIMIT 500`,
        )
          .bind(
            principal ? 1 : 0,
            broad ? 1 : 0,
            c.get("userId"),
            c.get("userId"),
          )
          .all<{
            id: string;
            name: string;
            contact_name: string | null;
            email: string;
            phone: string | null;
          }>()
      ).results
    : [];
  return c.json({
    canManage: p.manage,
    canCreate: p.create,
    canConvert: p.convert,
    currentUserId: c.get("userId"),
    staff,
    clients,
  });
});
futureLeadsRouter.get(root, async (c) => {
  const p = await futureLeadPermissions(c.env.DB, c.get("userId")),
    scope = futureLeadScope(c.get("userId"), p.all);
  const status = c.req.query("status") || "active",
    query = (c.req.query("q") || "").trim().slice(0, 180),
    offset = Number(c.req.query("offset") || "0");
  if (
    !["active", "converted", "archived", "all"].includes(status) ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 100000
  )
    return fail(c, "invalid_filter");
  const filter = `l.deleted_at IS NULL AND l.archived_at IS NULL AND ${scope.sql}
    AND (?='all' OR (?='active' AND f.status IN('scheduled','contacted') AND l.converted_project_id IS NULL AND l.lifecycle_stage NOT IN('rejected','converted')) OR f.status=?)
    AND (?='' OR instr(lower(${foldSearch("f.title||' '||coalesce(l.name,'')||' '||coalesce(l.business,'')||' '||coalesce(l.source,'')||' '||coalesce(l.email,'')||' '||coalesce(l.phone,'')||' '||f.requirements")}),lower(?))>0)`;
  const values = [
    ...scope.values,
    status,
    status,
    status,
    query,
    query.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  ];
  const rows = await c.env.DB.prepare(
    `${select} WHERE ${filter} ORDER BY f.contact_on,f.title,f.lead_id LIMIT 51 OFFSET ?`,
  )
    .bind(...values, offset)
    .all<Stored>();
  return c.json({
    data: rows.results.slice(0, 50).map((row) =>
      publicRow({
        ...row,
        staff: JSON.parse(row.staff_json),
        can_edit:
          p.manage ||
          JSON.parse(row.staff_json).some(
            (a: { id: string; role: string }) =>
              a.id === c.get("userId") && a.role !== "reviewer",
          ),
      }),
    ),
    hasMore: rows.results.length > 50,
  });
});
const createSchema = z
  .object({
    input: futureLeadInput,
    leadId: z.string().min(1).max(160).optional(),
  })
  .strict();
futureLeadsRouter.post(root, async (c) => {
  const p = await futureLeadPermissions(c.env.DB, c.get("userId"));
  if (!p.create) return fail(c, "forbidden", 403);
  const parsed = createSchema.safeParse(await body(c));
  if (!parsed.success) return fail(c, "invalid_input");
  const { input, leadId } = parsed.data;
  if (input.contactOn < bucharestDay()) return fail(c, "invalid_date");
  if (!(await validStaff(c, input.staffIds))) return fail(c, "invalid_staff");
  if (!(await clientAllowed(c, input.clientId)))
    return fail(c, "invalid_client", 403);
  const extra = (id: string, time: number, expectedLeadUpdated?: number) => [
    schedule(c, id, input, time, expectedLeadUpdated),
    event(c, id, 1, "scheduled", time),
    c.env.DB.prepare(
      "UPDATE leads SET lifecycle_stage='accepted',status='won',next_follow_up_at=NULL,name=?,business=?,email=?,phone=?,source=?,updated_at=? WHERE id=?",
    ).bind(
      input.name || null,
      input.business || null,
      input.email || null,
      input.phone || null,
      input.source,
      time,
      id,
    ),
    c.env.DB.prepare(
      "UPDATE lead_follow_up_drafts SET status='cancelled',updated_at=? WHERE lead_id=? AND status IN('queued','generating','ready','failed')",
    ).bind(time, id),
    ...assignments(c, id, input.staffIds, time),
    activity(c, id, "scheduled", time),
  ];
  if (!leadId)
    return createNativeLead(c, {
      input: {
        name: input.name,
        business: input.business,
        email: input.email,
        phone: input.phone,
        source: input.source,
        message: input.requirements,
        product: input.title,
      },
      idempotencyContext: input,
      statements: extra,
    });
  const access = await leadAccess(c, leadId);
  if (!access?.write || access.archived) return fail(c, "not_found", 404);
  const lead = await c.env.DB.prepare(
    "SELECT organization_id,lifecycle_stage,converted_project_id,updated_at FROM leads WHERE id=? AND deleted_at IS NULL",
  )
    .bind(leadId)
    .first<{
      updated_at: number;
      organization_id: string | null;
      lifecycle_stage: string;
      converted_project_id: string | null;
    }>();
  if (
    !lead ||
    lead.converted_project_id ||
    ["rejected", "converted"].includes(lead.lifecycle_stage)
  )
    return fail(c, "not_schedulable", 409);
  if (
    lead.organization_id &&
    input.clientId &&
    !(await c.env.DB.prepare(
      "SELECT 1 FROM client_organizations WHERE client_id=? AND organization_id=?",
    )
      .bind(input.clientId, lead.organization_id)
      .first())
  )
    return fail(c, "invalid_client", 403);
  const key = c.req.header("Idempotency-Key") || "";
  if (!/^[\w-]{16,128}$/.test(key)) return fail(c, "idempotency_key_required");
  const hash = await sha256(JSON.stringify(parsed.data)),
    scope = "future.schedule:" + c.get("userId"),
    t = Date.now();
  const prev = async () =>
    c.env.DB.prepare(
      "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=? AND expires_at>?",
    )
      .bind(scope, key, t)
      .first<{ request_hash: string; response_json: string }>();
  const prior = await prev();
  if (prior)
    return prior.request_hash === hash
      ? c.json(JSON.parse(prior.response_json), 201)
      : fail(c, "idempotency_key_reused", 409);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_json,response_status,created_at,expires_at) VALUES(?,?,?,?,201,?,?)",
      ).bind(scope, key, hash, JSON.stringify({ id: leadId }), t, t + 86400000),
      ...extra(leadId, t, lead.updated_at),
    ]);
  } catch {
    const replay = await prev();
    if (replay?.request_hash === hash) return c.json({ id: leadId }, 201);
    return fail(c, "already_scheduled", 409);
  }
  return c.json({ id: leadId }, 201);
});
futureLeadsRouter.get(root + "/:id", async (c) => {
  const row = await load(c, c.req.param("id")!);
  if (!row) return fail(c, "not_found", 404);
  const events = await c.env.DB.prepare(
    "SELECT action,created_at,revision FROM future_lead_events WHERE lead_id=? ORDER BY revision DESC LIMIT 20",
  )
    .bind(row.lead_id)
    .all();
  return c.json({ data: publicRow(row), events: events.results });
});
const updateSchema = z
  .object({
    input: futureLeadInput,
    revision: z.number().int().positive(),
    status: z.enum(["scheduled", "contacted", "archived"]),
  })
  .strict();
futureLeadsRouter.patch(root + "/:id", async (c) => {
  const row = await load(c, c.req.param("id")!);
  if (!row) return fail(c, "not_found", 404);
  if (!row.can_edit) return fail(c, "forbidden", 403);
  const parsed = updateSchema.safeParse(await body(c));
  if (!parsed.success) return fail(c, "invalid_input");
  const { input, revision, status } = parsed.data,
    p = await futureLeadPermissions(c.env.DB, c.get("userId"));
  if (
    row.revision !== revision ||
    row.converted_project_id ||
    row.status === "converted"
  )
    return fail(c, "revision_conflict", 409);
  if (
    !p.manage &&
    (status === "archived" ||
      input.clientId !== row.client_id ||
      JSON.stringify([...input.staffIds].sort()) !==
        JSON.stringify(row.staff.map((a) => a.id).sort()))
  )
    return fail(c, "forbidden", 403);
  const rescheduled =
    input.contactOn !== row.contact_on ||
    (status === "scheduled" && row.status !== "scheduled");
  if (rescheduled && input.contactOn < bucharestDay())
    return fail(c, "invalid_date");
  if (!(await validStaff(c, input.staffIds))) return fail(c, "invalid_staff");
  if (
    input.clientId !== row.client_id &&
    !(await clientAllowed(c, input.clientId))
  )
    return fail(c, "invalid_client", 403);
  if (
    row.organization_id &&
    input.clientId &&
    !(await c.env.DB.prepare(
      "SELECT 1 FROM client_organizations WHERE client_id=? AND organization_id=?",
    )
      .bind(input.clientId, row.organization_id)
      .first())
  )
    return fail(c, "invalid_client", 403);
  const t = Date.now();
  try {
    await c.env.DB.batch([
      event(
        c,
        row.lead_id,
        revision + 1,
        status !== row.status
          ? status
          : rescheduled
            ? "rescheduled"
            : "updated",
        t,
        revision,
        row.lead_updated_at,
        p.manage ? "manage" : "edit",
      ),
      c.env.DB.prepare(
        `UPDATE future_leads SET title=?,contact_on=?,requirements=?,project_kind=?,client_id=?,status=?,revision=revision+1,
      schedule_version=schedule_version+?,scheduled_at=?,updated_at=? WHERE lead_id=? AND revision=?`,
      ).bind(
        input.title,
        input.contactOn,
        input.requirements,
        input.projectKind,
        input.clientId,
        status,
        rescheduled ? 1 : 0,
        rescheduled ? t : row.scheduled_at,
        t,
        row.lead_id,
        revision,
      ),
      c.env.DB.prepare(
        "UPDATE leads SET name=?,business=?,email=?,phone=?,source=?,updated_at=? WHERE id=?",
      ).bind(
        input.name || null,
        input.business || null,
        input.email || null,
        input.phone || null,
        input.source,
        t,
        row.lead_id,
      ),
      ...(p.manage ? assignments(c, row.lead_id, input.staffIds, t) : []),
      activity(
        c,
        row.lead_id,
        status !== row.status
          ? status
          : rescheduled
            ? "rescheduled"
            : "updated",
        t,
      ),
    ]);
  } catch {
    return fail(c, "revision_conflict", 409);
  }
  return c.json({ data: publicRow((await load(c, row.lead_id))!) });
});
const conversion = z
  .object({
    revision: z.number().int().positive(),
    stage: z.enum(PROJECT_STAGES.map((s) => s.id)),
  })
  .strict();
futureLeadsRouter.post(root + "/:id/convert", async (c) => {
  const p = await futureLeadPermissions(c.env.DB, c.get("userId"));
  if (!p.convert) return fail(c, "forbidden", 403);
  const row = await load(c, c.req.param("id")!);
  if (!row) return fail(c, "not_found", 404);
  if (row.converted_project_id)
    return c.json(
      { id: row.converted_project_id, slug: row.project_slug },
      200,
    );
  const parsed = conversion.safeParse(await body(c));
  if (!parsed.success) return fail(c, "invalid_input");
  if (row.status === "archived" || row.revision !== parsed.data.revision)
    return fail(c, "revision_conflict", 409);
  const description = `${row.requirements}\n\nClient: ${row.business || row.name || "—"}\nContact: ${[row.name, row.email, row.phone].filter(Boolean).join(" · ")}\nSursă lead: ${row.source}\nData programată: ${row.contact_on}`;
  const response = await createNativeProject(c, {
    idempotencyContext: { futureLeadId: row.lead_id, revision: row.revision },
    input: {
      name: row.title,
      description,
      kind: row.project_kind,
      client_id: row.client_id,
      ...(row.client_id
        ? { organization_id: row.organization_id || undefined }
        : {}),
      stage: parsed.data.stage,
    },
    statements: (project, time) => [
      event(
        c,
        row.lead_id,
        row.revision + 1,
        "converted",
        time,
        row.revision,
        row.lead_updated_at,
        "convert",
      ),
      c.env.DB.prepare(
        "UPDATE future_leads SET status='converted',revision=revision+1,updated_at=? WHERE lead_id=?",
      ).bind(time, row.lead_id),
      c.env.DB.prepare(
        "UPDATE leads SET converted_project_id=?,lifecycle_stage='converted',status='won',updated_at=? WHERE id=?",
      ).bind(project, time, row.lead_id),
      c.env.DB.prepare(
        `INSERT INTO project_staff(project_id,user_id,role,assigned_at)
        SELECT ?,a.user_id,CASE WHEN a.assignment_role='reviewer' THEN 'viewer' ELSE 'contributor' END,? FROM lead_assignments a JOIN users u ON u.id=a.user_id
        WHERE a.lead_id=? AND u.disabled_at IS NULL AND u.email_verified=1 AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN('staff','admin'))
        ON CONFLICT(project_id,user_id) DO NOTHING`,
      ).bind(project, time, row.lead_id),
      activity(c, row.lead_id, "converted", time, "conversion"),
    ],
  });
  if (response.status === 409) {
    const latest = await load(c, row.lead_id);
    if (latest?.converted_project_id)
      return c.json(
        { id: latest.converted_project_id, slug: latest.project_slug },
        200,
      );
  }
  return response;
});
