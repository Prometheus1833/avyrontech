import { privilegedMfaSatisfied } from "./mfaPolicy";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { platformRoleForUser, isReservedPlatformEmail } from "./authorization";
import {
  STAFF_OPERATIONAL_EMAIL,
  managedStaff,
  canManageStaffTarget,
} from "./staffAccessPolicy";
import { checkRateLimit } from "./antispam";
import { sha256 } from "./security";
import {
  STAFF_PERMISSION_KEYS,
  STAFF_PERMISSIONS,
  STAFF_MANAGED,
  STAFF_RANKS,
  normalizeStaffPermissions,
  staffPermissionIssues,
  type StaffRankId,
} from "../../../../src/shared/staffAccess";
type Ctx = Context<AppBindings>;
export const staffAccessRouter = new Hono<AppBindings>();
const idList = z
  .array(z.string().min(1).max(160))
  .max(250)
  .transform((v) => [...new Set(v)]);
export const staffAssignmentSchema = z
  .object({
    rankId: z
      .enum(STAFF_RANKS.map((r) => r.id) as [StaffRankId, ...StaffRankId[]])
      .nullable(),
    permissions: z
      .array(z.enum(STAFF_PERMISSION_KEYS as [string, ...string[]]))
      .max(100),
    projectIds: idList,
    subscriptionIds: idList,
    clientIds: idList,
    aiProjectIds: idList,
    revision: z.number().int().min(0),
    expiresAt: z.number().int().min(0).max(4102444800000).nullable(),
    reason: z.string().trim().min(3).max(600),
    confirmed: z.literal(true),
  })
  .strict();
export type StaffAssignmentInput = z.infer<typeof staffAssignmentSchema>;
const deny = (
  c: Ctx,
  code = "forbidden",
  status: 400 | 403 | 404 | 409 = 403,
) =>
  c.json(
    {
      error: {
        code,
        message:
          (
            {
              mfa_required:
                "Confirmă autentificarea în doi pași pentru administrarea accesului.",
              rank_conflict:
                "Accesul a fost modificat. Reîncarcă membrul înainte de salvare.",
              owner_required: "Această modificare necesită Owner Platform.",
              invalid_scope:
                "Una dintre alocări nu mai există. Reîncarcă lista.",
              profile_conflict:
                "Profilul rangului a fost modificat. Reîncarcă lista.",
            } as Record<string, string>
          )[code] || "Operațiunea nu poate fi executată cu accesul curent.",
      },
    },
    status,
  );
function profileRow(row: Record<string, unknown>) {
  const { permissions_json, ...rest } = row;
  return { ...rest, permissions: JSON.parse(String(permissions_json)) };
}
const audit = (c: Ctx, target: string, action: string, metadata: unknown) =>
  c.env.DB.prepare(
    "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user',?,'user',?,'allowed','warning',?,?)",
  ).bind(
    crypto.randomUUID(),
    c.get("userId"),
    action,
    target,
    JSON.stringify({
      ...(metadata as object),
      mfaVerified: !!c.get("mfaVerified"),
    }),
    Date.now(),
  );

export async function planStaffAssignment(
  c: Ctx,
  target: { id: string; email: string; email_verified: number },
  input: StaffAssignmentInput,
  creating = false,
): Promise<D1PreparedStatement[]> {
  if (target.email.toLowerCase() === STAFF_OPERATIONAL_EMAIL)
    throw Error("staff_access_operational_account_protected");
  const actor = c.get("userId"),
    principal = await platformRoleForUser(c.env.DB, actor);
  if (!principal) throw Error("staff_access_forbidden");
  if (!(await privilegedMfaSatisfied(c)))
    throw Error("staff_access_mfa_required");
  if (!creating && !(await canManageStaffTarget(c.env.DB, actor, target.id)))
    throw Error("staff_access_owner_required");
  const old = creating ? null : await managedStaff(c.env.DB, target.id);
  if ((old?.revision || 0) !== input.revision)
    throw Error("staff_access_rank_conflict");
  const targetPrincipal = creating
    ? null
    : await platformRoleForUser(c.env.DB, target.id);
  if (target.id === actor) throw Error("staff_access_self_change_forbidden");
  const ownerIdentity = creating
    ? null
    : await c.env.DB.prepare(
        "SELECT 1 FROM platform_principals WHERE email=? COLLATE NOCASE AND role='platform_owner'",
      )
        .bind(target.email)
        .first();
  if (targetPrincipal === "platform_owner" || ownerIdentity)
    throw Error("staff_access_owner_protected");
  if (
    (input.rankId === "platform_owner" ||
      input.rankId === "superadmin" ||
      targetPrincipal === "superadmin") &&
    principal !== "platform_owner"
  )
    throw Error("staff_access_owner_required");
  if (input.rankId === "platform_owner" && target.email_verified !== 1)
    throw Error("staff_access_verification_required");
  if (
    !input.rankId &&
    (input.permissions.length ||
      input.projectIds.length ||
      input.subscriptionIds.length ||
      input.aiProjectIds.length)
  )
    throw Error("staff_access_invalid_scope");
  const profile = input.rankId
    ? await c.env.DB.prepare("SELECT * FROM staff_rank_profiles WHERE id=?")
        .bind(input.rankId)
        .first<Record<string, unknown>>()
    : null;
  if (input.rankId && !profile) throw Error("staff_access_invalid_scope");
  const full =
    input.rankId === "platform_owner" || input.rankId === "superadmin";
  const permissions = full
    ? [...STAFF_PERMISSION_KEYS]
    : normalizeStaffPermissions(input.permissions);
  if (full && input.expiresAt !== null)
    throw Error("staff_access_owner_expiry_forbidden");
  if (input.expiresAt !== null && input.expiresAt <= Date.now())
    throw Error("staff_access_expiry_invalid");
  if (
    input.projectIds.length &&
    !permissions.includes("projects.read") &&
    !permissions.includes("maintenance.read")
  )
    throw Error("staff_access_invalid_scope");
  if (input.subscriptionIds.length && !permissions.includes("maintenance.read"))
    throw Error("staff_access_invalid_scope");
  if (input.aiProjectIds.length && !permissions.includes("ai_projects.read"))
    throw Error("staff_access_invalid_scope");
  for (const [table, ids] of [
    ["projects", input.projectIds],
    ["subscriptions", input.subscriptionIds],
    ["clients", input.clientIds],
    ["ai_projects", input.aiProjectIds],
  ] as const) {
    if (!ids.length) continue;
    const row = await c.env.DB.prepare(
      `SELECT count(*) n FROM ${table} WHERE id IN(SELECT value FROM json_each(?))`,
    )
      .bind(JSON.stringify(ids))
      .first<{ n: number }>();
    if (row?.n !== ids.length) throw Error("staff_access_invalid_scope");
  }
  const t = Date.now(),
    keys = [
      ...permissions,
      STAFF_MANAGED,
      ...(input.rankId ? ["staff.rank." + input.rankId] : []),
    ];
  if (staffPermissionIssues(permissions).length)
    throw Error("staff_access_permission_dependencies");
  const role = full ? "admin" : input.rankId ? "staff" : "user";
  const statements: D1PreparedStatement[] = [];
  if (old)
    statements.push(
      c.env.DB.prepare(
        "UPDATE staff_rank_assignments SET revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE user_id=?",
      ).bind(input.revision, target.id),
    );
  if (input.rankId)
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO staff_rank_assignments(user_id,rank_id,permissions_json,expires_at,reason,revision,assigned_by,updated_at) VALUES(?,?,?,?,?,1,?,?) ${old ? "ON CONFLICT(user_id) DO UPDATE SET rank_id=excluded.rank_id,permissions_json=excluded.permissions_json,expires_at=excluded.expires_at,reason=excluded.reason,assigned_by=excluded.assigned_by,updated_at=excluded.updated_at" : ""}`,
      ).bind(
        target.id,
        input.rankId,
        JSON.stringify(permissions),
        input.expiresAt,
        input.reason,
        actor,
        t,
      ),
    );
  else
    statements.push(
      c.env.DB.prepare(
        "DELETE FROM staff_rank_assignments WHERE user_id=?",
      ).bind(target.id),
    );
  statements.push(
    c.env.DB.prepare("DELETE FROM user_roles WHERE user_id=?").bind(target.id),
    c.env.DB.prepare(
      "INSERT INTO user_roles(user_id,role) VALUES(?,'user')",
    ).bind(target.id),
    ...(role !== "user"
      ? [
          c.env.DB.prepare(
            "INSERT INTO user_roles(user_id,role) VALUES(?,?)",
          ).bind(target.id, role),
        ]
      : []),
    c.env.DB.prepare(
      "UPDATE user_capabilities SET revoked_at=? WHERE user_id=? AND organization_id IS NULL AND (capability IN(SELECT value FROM json_each(?)) OR capability=? OR capability LIKE 'staff.rank.%')",
    ).bind(t, target.id, JSON.stringify(STAFF_PERMISSION_KEYS), STAFF_MANAGED),
    ...(input.rankId
      ? [
          c.env.DB.prepare(
            `INSERT INTO user_capabilities(id,user_id,capability,organization_id,granted_by,reason,expires_at,revoked_at,created_at) SELECT 'staff-rank:'||?||':'||value,?,value,NULL,?,?,CASE WHEN value=? OR value LIKE 'staff.rank.%' THEN NULL ELSE ? END,NULL,? FROM json_each(?) WHERE true ON CONFLICT DO UPDATE SET granted_by=excluded.granted_by,reason=excluded.reason,expires_at=excluded.expires_at,revoked_at=NULL`,
          ).bind(
            target.id,
            target.id,
            actor,
            "staff_rank:" + input.rankId,
            STAFF_MANAGED,
            input.expiresAt,
            t,
            JSON.stringify(keys),
          ),
        ]
      : []),
    c.env.DB.prepare(
      "DELETE FROM project_staff WHERE user_id=? AND role<>'owner'",
    ).bind(target.id),
    c.env.DB.prepare(
      "INSERT INTO project_staff(project_id,user_id,role,assigned_at) SELECT value,?,'contributor',? FROM json_each(?) WHERE true ON CONFLICT(project_id,user_id) DO NOTHING",
    ).bind(target.id, t, JSON.stringify(input.projectIds)),
    c.env.DB.prepare("DELETE FROM subscription_staff WHERE user_id=?").bind(
      target.id,
    ),
    c.env.DB.prepare(
      "INSERT INTO subscription_staff(subscription_id,user_id,assigned_by,assigned_at) SELECT value,?,?,? FROM json_each(?)",
    ).bind(target.id, actor, t, JSON.stringify(input.subscriptionIds)),
    c.env.DB.prepare(
      "UPDATE clients SET access_managed=1 WHERE id IN(SELECT client_id FROM client_account_access WHERE user_id=?) OR id IN(SELECT value FROM json_each(?))",
    ).bind(target.id, JSON.stringify(input.clientIds)),
    c.env.DB.prepare("DELETE FROM client_account_access WHERE user_id=?").bind(
      target.id,
    ),
    c.env.DB.prepare(
      "INSERT INTO client_account_access(client_id,user_id,granted_by,created_at) SELECT value,?,?,? FROM json_each(?)",
    ).bind(target.id, actor, t, JSON.stringify(input.clientIds)),
    c.env.DB.prepare(
      "DELETE FROM ai_project_members WHERE user_id=? AND role<>'owner'",
    ).bind(target.id),
    c.env.DB.prepare(
      "INSERT INTO ai_project_members(project_id,user_id,role,status,granted_by,granted_at,updated_at) SELECT value,?,?,'active',?,?,? FROM json_each(?) WHERE true ON CONFLICT(project_id,user_id) DO NOTHING",
    ).bind(
      target.id,
      permissions.includes("social.approve")
        ? "manager"
        : permissions.includes("ai_content.create")
          ? "editor"
          : "viewer",
      actor,
      t,
      t,
      JSON.stringify(input.aiProjectIds),
    ),
    c.env.DB.prepare(
      "UPDATE sessions SET revoked_at=?,revoked_reason='staff_access_updated' WHERE user_id=? AND revoked_at IS NULL",
    ).bind(t, target.id),
    audit(c, target.id, "staff.access.updated", {
      before: old
        ? {
            rankId: old.rank_id,
            permissions: JSON.parse(old.permissions_json),
            revision: old.revision,
          }
        : null,
      rankId: input.rankId,
      permissions,
      projectIds: input.projectIds,
      subscriptionIds: input.subscriptionIds,
      clientIds: input.clientIds,
      aiProjectIds: input.aiProjectIds,
      expiresAt: input.expiresAt,
      reason: input.reason,
    }),
  );
  const reserved = await isReservedPlatformEmail(c.env.DB, target.email);
  if (full)
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO platform_principals(email,role,status,created_by,created_at,updated_at) VALUES(?,?,'active',?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,status='active',updated_at=excluded.updated_at",
      ).bind(target.email, input.rankId, actor, t, t),
    );
  else if (targetPrincipal || reserved) {
    if (principal !== "platform_owner")
      throw Error("staff_access_owner_required");
    statements.push(
      c.env.DB.prepare(
        "UPDATE platform_principals SET status='revoked',updated_at=? WHERE email=? COLLATE NOCASE",
      ).bind(t, target.email),
    );
  }
  return statements;
}

staffAccessRouter.use("/api/staff-access*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  if (!c.get("roles").some((r) => r === "staff" || r === "admin"))
    return deny(c);
  const rate = await checkRateLimit(c.env.DB, [
    {
      key: "staff-access:" + c.get("userId"),
      limit: c.req.method === "GET" ? 240 : 40,
      windowSec: 3600,
    },
  ]);
  if (!rate.ok) return c.json({ error: { code: "rate_limited" } }, 429);
  if (
    c.req.method !== "GET" &&
    (!(await platformRoleForUser(c.env.DB, c.get("userId"))) ||
      !(await privilegedMfaSatisfied(c)))
  )
    return deny(c, "mfa_required");
  try {
    await next();
  } catch (e) {
    const match = String(e).match(/staff_access_([a-z_]+)/);
    if (match)
      return deny(c, match[1], match[1].includes("conflict") ? 409 : 403);
    if (
      /NOT NULL constraint failed: staff_rank_(assignments|profiles)\.revision|UNIQUE constraint failed: staff_rank_assignments/.test(
        String(e),
      )
    )
      return deny(c, "rank_conflict", 409);
    throw e;
  }
});
staffAccessRouter.get("/api/staff-access", async (c) => {
  const principal = await platformRoleForUser(c.env.DB, c.get("userId")),
    manager = !!principal;
  const members = await c.env.DB.prepare(
    `SELECT u.id,COALESCE(p.pseudonym,p.display_name,u.display_name,'Membru') display_name,${manager ? "u.email,u.username,u.disabled_at,u.must_change_password," : ""}group_concat(DISTINCT ur.role) roles, a.rank_id,a.revision,a.expires_at,CASE WHEN u.email_verified=1 AND u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=u.id AND role='admin') THEN pp.role END platform_role FROM users u LEFT JOIN profiles p ON p.id=u.id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN staff_rank_assignments a ON a.user_id=u.id LEFT JOIN platform_principals pp ON pp.email=u.email COLLATE NOCASE AND pp.status='active' WHERE ${manager ? "1=1" : "u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=u.id AND role IN('staff','admin'))"} GROUP BY u.id ORDER BY display_name COLLATE NOCASE LIMIT 500`,
  ).all();
  const profiles = await c.env.DB.prepare(
    "SELECT * FROM staff_rank_profiles ORDER BY level DESC",
  ).all<Record<string, unknown>>();
  const [projects, subscriptions, clients, aiProjects] = manager
    ? await Promise.all([
        c.env.DB.prepare(
          "SELECT id,name,client_id FROM projects ORDER BY name LIMIT 500",
        ).all(),
        c.env.DB.prepare(
          "SELECT s.id,v.service_name name,v.project_id,p.name project_name FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN projects p ON p.id=v.project_id WHERE s.client_id=p.client_id AND s.status<>'cancelled' ORDER BY p.name LIMIT 500",
        ).all(),
        c.env.DB.prepare(
          "SELECT id,company_name name FROM clients WHERE status<>'archived' ORDER BY company_name LIMIT 500",
        ).all(),
        c.env.DB.prepare(
          "SELECT id,name FROM ai_projects ORDER BY name LIMIT 250",
        ).all(),
      ])
    : [{ results: [] }, { results: [] }, { results: [] }, { results: [] }];
  return c.json({
    data: members.results,
    profiles: profiles.results.map((row) =>
      manager
        ? profileRow(row)
        : {
            id: row.id,
            label: row.label,
            level: row.level,
            description:
              row.id === "superadmin"
                ? "Acces administrativ complet în aria autorizată."
                : row.description,
            permissions: [],
            revision: row.revision,
          },
    ),
    permissions: manager ? STAFF_PERMISSIONS : [],
    projects: projects.results,
    subscriptions: subscriptions.results,
    clients: clients.results,
    aiProjects: aiProjects.results,
    canManage: manager,
    mfaVerified: !!c.get("mfaVerified"),
    mfaSatisfied: await privilegedMfaSatisfied(c),
    platformRole: principal,
  });
});
staffAccessRouter.get("/api/staff-access/:userId", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return deny(c);
  const userId = c.req.param("userId"),
    row = await managedStaff(c.env.DB, userId);
  const [projects, subscriptions, clients, ai, capabilities] =
    await Promise.all([
      c.env.DB.prepare(
        "SELECT project_id id,role FROM project_staff WHERE user_id=?",
      )
        .bind(userId)
        .all(),
      c.env.DB.prepare(
        "SELECT subscription_id id FROM subscription_staff WHERE user_id=?",
      )
        .bind(userId)
        .all(),
      c.env.DB.prepare(
        "SELECT client_id id FROM client_account_access WHERE user_id=?",
      )
        .bind(userId)
        .all(),
      c.env.DB.prepare(
        "SELECT project_id id,role FROM ai_project_members WHERE user_id=? AND status='active'",
      )
        .bind(userId)
        .all(),
      c.env.DB.prepare(
        "SELECT capability,organization_id,expires_at FROM user_capabilities WHERE user_id=? AND revoked_at IS NULL AND(expires_at IS NULL OR expires_at>?)",
      )
        .bind(userId, Date.now())
        .all(),
    ]);
  return c.json({
    assignment: row
      ? {
          rankId: row.rank_id,
          permissions: JSON.parse(row.permissions_json),
          expiresAt: row.expires_at,
          revision: row.revision,
        }
      : null,
    projects: projects.results,
    subscriptions: subscriptions.results,
    clients: clients.results,
    aiProjects: ai.results,
    capabilities: capabilities.results,
    canManage: await canManageStaffTarget(c.env.DB, c.get("userId"), userId),
  });
});
staffAccessRouter.put("/api/staff-access/:userId", async (c) => {
  const parsed = staffAssignmentSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return deny(c, "invalid_input", 400);
  const target = await c.env.DB.prepare(
    "SELECT id,email,email_verified FROM users WHERE id=? AND disabled_at IS NULL",
  )
    .bind(c.req.param("userId"))
    .first<{ id: string; email: string; email_verified: number }>();
  if (!target) return deny(c, "not_found", 404);
  return staffWrite(c, () => planStaffAssignment(c, target, parsed.data), {
    ok: true,
  });
});
async function staffWrite(
  c: Ctx,
  plan: () => Promise<D1PreparedStatement[]>,
  result: unknown,
) {
  const key = c.req.header("idempotency-key") || "";
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(key))
    return deny(c, "idempotency_key_required", 400);
  const scope =
      "staff:" + c.get("userId") + ":" + c.req.method + ":" + c.req.path,
    hash = await sha256(await c.req.text()),
    t = Date.now();
  const old = await c.env.DB.prepare(
    "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=? AND expires_at>?",
  )
    .bind(scope, key, t)
    .first<{ request_hash: string; response_json: string }>();
  if (old)
    return old.request_hash === hash
      ? c.json(JSON.parse(old.response_json))
      : deny(c, "idempotency_key_reused", 409);
  try {
    const statements = await plan();
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,200,?,?,?)",
      ).bind(scope, key, hash, JSON.stringify(result), t, t + 86400000),
      ...statements,
    ]);
  } catch (cause) {
    if (/UNIQUE constraint failed: idempotency_keys/.test(String(cause))) {
      const retry = await c.env.DB.prepare(
        "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
      )
        .bind(scope, key)
        .first<{ request_hash: string; response_json: string }>();
      if (retry?.request_hash === hash)
        return c.json(JSON.parse(retry.response_json));
    }
    const match = String(cause).match(/staff_access_([a-z_]+)/);
    if (match)
      return deny(c, match[1], match[1].includes("conflict") ? 409 : 403);
    if (
      /NOT NULL constraint failed: staff_rank_(assignments|profiles)\.revision|UNIQUE constraint failed: staff_rank_assignments/.test(
        String(cause),
      )
    )
      return deny(c, "rank_conflict", 409);
    throw cause;
  }
  return c.json(result);
}
staffAccessRouter.patch("/api/staff-access/profiles/:id", async (c) => {
  const id = c.req.param("id");
  if (["platform_owner", "superadmin"].includes(id))
    return deny(c, "full_access_profile_fixed", 409);
  const b = z
    .object({
      permissions: z
        .array(z.enum(STAFF_PERMISSION_KEYS as [string, ...string[]]))
        .max(100),
      revision: z.number().int().positive(),
      confirmed: z.literal(true),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return deny(c, "invalid_input", 400);
  const profile = await c.env.DB.prepare(
    "SELECT permissions_json,revision FROM staff_rank_profiles WHERE id=?",
  )
    .bind(id)
    .first<{ permissions_json: string; revision: number }>();
  if (!profile) return deny(c, "not_found", 404);
  const keys = normalizeStaffPermissions(b.data.permissions);
  if (staffPermissionIssues(keys).length)
    return deny(c, "permission_dependencies", 400);
  return staffWrite(
    c,
    async () => {
      if (profile.revision !== b.data.revision)
        throw Error("staff_access_profile_conflict");
      return [
        c.env.DB.prepare(
          "UPDATE staff_rank_profiles SET permissions_json=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,updated_by=?,updated_at=? WHERE id=?",
        ).bind(
          JSON.stringify(keys),
          b.data.revision,
          c.get("userId"),
          Date.now(),
          id,
        ),
        audit(c, id, "staff.rank_profile.updated", {
          before: JSON.parse(profile.permissions_json),
          permissions: keys,
        }),
      ];
    },
    { ok: true },
  );
});
