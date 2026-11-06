import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { canAccessProject } from "./projects";
import { clientProjectGrantSql, platformRoleForUser } from "./authorization";
import { managedStaff, managedPermission } from "./staffAccessPolicy";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { readJsonBodyUpTo } from "./requestBody";
import { sha256 } from "./security";

const root = "/api/project-chat";
type Ctx = Context<AppBindings>;
export const projectChatRouter = new Hono<AppBindings>();
const fail = (c: Ctx, code: string, status: 400 | 403 | 404 | 409 = 400) =>
  c.json({ error: { code } }, status);
async function actor(c: Ctx) {
  const principal = !!(await platformRoleForUser(c.env.DB, c.get("userId")));
  const staff = c.get("roles").some((r) => r === "staff" || r === "admin");
  const policy =
    staff && !principal ? await managedStaff(c.env.DB, c.get("userId")) : null;
  return {
    principal,
    staff,
    read: !policy || managedPermission(policy, "chat.read"),
    write: !policy || managedPermission(policy, "chat.write"),
    projects: !policy || managedPermission(policy, "projects.read"),
    all:
      principal ||
      (!!policy &&
        managedPermission(policy, "projects.read") &&
        managedPermission(policy, "projects.all")),
  };
}
async function access(c: Ctx, id: string) {
  const a = await actor(c);
  if (!a.read || !a.projects) return null;
  const project = await canAccessProject(
    c.env.DB,
    id,
    c.get("userId"),
    c.get("roles"),
  );
  return project.read ? a : null;
}
projectChatRouter.use(root + "*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  const reading = c.req.method === "GET" || c.req.path.endsWith("/read");
  const rate = await checkRateLimit(c.env.DB, [
    {
      key: `project-chat:${reading ? "read" : "write"}:${c.get("userId")}`,
      limit: reading ? 1200 : 300,
      windowSec: 3600,
    },
    ...(!reading
      ? [
          {
            key: `project-chat:burst:${c.get("userId")}`,
            limit: 20,
            windowSec: 60,
          },
        ]
      : []),
  ]);
  if (!rate.ok) return c.json({ error: { code: "rate_limited" } }, 429);
  if (
    c.req.method !== "GET" &&
    c.get("roles").some((r) => r === "staff" || r === "admin") &&
    !(await privilegedMfaSatisfied(c))
  )
    return fail(c, "mfa_required", 403);
  await next();
});
projectChatRouter.get(root + "/projects", async (c) => {
  const a = await actor(c);
  if (!a.read || !a.projects) return fail(c, "forbidden", 403);
  const user = c.get("userId"),
    args: string[] = [];
  let scope = "1";
  if (!a.all) {
    scope = `(p.owner_user_id=? OR EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=p.organization_id AND m.user_id=? AND m.status='active') OR ${a.staff ? "EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=p.id AND ps.user_id=?) OR (p.organization_id IS NULL AND EXISTS(SELECT 1 FROM client_account_access g WHERE g.client_id=p.client_id AND g.user_id=?))" : clientProjectGrantSql("p")})`;
    args.push(user, user, user);
    if (a.staff) args.push(user);
  }
  const query = (c.req.query("q") || "").trim().slice(0, 120),
    focus = (c.req.query("focus") || "").slice(0, 160);
  if (query) {
    let name = "p.name";
    for (const [letter, base] of Object.entries({
      ă: "a",
      Ă: "a",
      â: "a",
      Â: "a",
      î: "i",
      Î: "i",
      ș: "s",
      Ș: "s",
      ş: "s",
      Ş: "s",
      ț: "t",
      Ț: "t",
      ţ: "t",
      Ţ: "t",
    }))
      name = `replace((${name}),'${letter}','${base}')`;
    scope += ` AND lower(${name}) LIKE ? ESCAPE '\\'`;
    args.push(
      "%" +
        query
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[\\%_]/g, "\\$&") +
        "%",
    );
  }
  const rows = await c.env.DB.prepare(
    `SELECT p.id,p.slug,p.name,p.kind,p.status,
 (SELECT m.content FROM staff_chat_messages m WHERE m.project_id=p.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) last_content,
 (SELECT max(m.created_at) FROM staff_chat_messages m WHERE m.project_id=p.id) last_at,
 (SELECT count(*) FROM staff_chat_messages m LEFT JOIN staff_chat_reads r ON r.user_id=? AND r.target='project:'||p.id WHERE m.project_id=p.id AND m.author_id<>? AND (r.message_at IS NULL OR m.created_at>r.message_at OR (m.created_at=r.message_at AND m.id>r.message_id))) unread
 FROM projects p WHERE ${scope} ORDER BY CASE WHEN p.id=? THEN 0 ELSE 1 END,COALESCE((SELECT max(m.created_at) FROM staff_chat_messages m WHERE m.project_id=p.id),p.updated_at) DESC,p.id LIMIT 100`,
  )
    .bind(user, user, ...args, focus)
    .all();
  return c.json({ data: rows.results, canWrite: a.write, limit: 100 });
});
projectChatRouter.get(root + "/:id/messages", async (c) => {
  const id = c.req.param("id") || "";
  if (!(await access(c, id))) return fail(c, "not_found", 404);
  const before = c.req.query("before");
  let cursor = "",
    args: (string | number)[] = [id];
  if (before) {
    const p = z
      .object({
        at: z.number().int().nonnegative(),
        id: z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/),
      })
      .safeParse(
        (() => {
          try {
            return JSON.parse(before);
          } catch {
            return null;
          }
        })(),
      );
    if (!p.success) return fail(c, "invalid_cursor");
    cursor = " AND (m.created_at<? OR(m.created_at=? AND m.id<?))";
    args = [...args, p.data.at, p.data.at, p.data.id];
  }
  const rows = await c.env.DB.prepare(
    `SELECT m.id,m.author_id,m.content,m.created_at,COALESCE(p.pseudonym,p.display_name,u.display_name,'Participant') author_name FROM staff_chat_messages m JOIN users u ON u.id=m.author_id LEFT JOIN profiles p ON p.id=u.id WHERE m.project_id=? ${cursor} ORDER BY m.created_at DESC,m.id DESC LIMIT 50`,
  )
    .bind(...args)
    .all();
  return c.json({ data: rows.results.reverse() });
});
async function mutation(
  c: Ctx,
  scope: string,
  value: unknown,
  statement: (id: string) => D1PreparedStatement,
) {
  const key = c.req.header("Idempotency-Key") || "";
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(key))
    return fail(c, "idempotency_key_required");
  const hash = await sha256(JSON.stringify(value)),
    id = crypto.randomUUID(),
    user = c.get("userId"),
    t = Date.now();
  const lookup = () =>
    c.env.DB.prepare(
      "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
    )
      .bind(scope, key)
      .first<{ request_hash: string; response_json: string }>();
  const replay = (old: { request_hash: string; response_json: string }) =>
    old.request_hash === hash
      ? c.json(JSON.parse(old.response_json))
      : fail(c, "idempotency_key_reused", 409);
  const previous = await lookup();
  if (previous) return replay(previous);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,200,?,?,?)",
      ).bind(scope, key, hash, JSON.stringify({ id }), t, t + 86400000),
      statement(id),
      c.env.DB.prepare(
        "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,created_at) VALUES(?,?,'user','project.chat.updated','project',?,'allowed','info',?)",
      ).bind(crypto.randomUUID(), user, c.req.param("id") || "" || "", t),
    ]);
  } catch (e) {
    const concurrent = await lookup();
    if (concurrent) return replay(concurrent);
    throw e;
  }
  return c.json({ id });
}
projectChatRouter.post(root + "/:id/messages", async (c) => {
  const id = c.req.param("id") || "",
    a = await access(c, id);
  if (!a) return fail(c, "not_found", 404);
  if (!a.write) return fail(c, "forbidden", 403);
  const body = await readJsonBodyUpTo(c.req.raw, 16384),
    p = z
      .object({ content: z.string().trim().min(1).max(4000) })
      .strict()
      .safeParse(body.ok ? body.value : null);
  if (!p.success) return fail(c, "invalid_message");
  return mutation(
    c,
    `project-chat:send:${c.get("userId")}:${id}`,
    p.data,
    (message) =>
      c.env.DB.prepare(
        "INSERT INTO staff_chat_messages(id,author_id,recipient_id,channel,content,created_at,project_id) VALUES(?,?,?,'general',?,?,?)",
      ).bind(
        message,
        c.get("userId"),
        c.get("userId"),
        p.data.content,
        Date.now(),
        id,
      ),
  );
});
projectChatRouter.post(root + "/:id/read", async (c) => {
  const id = c.req.param("id") || "";
  if (!(await access(c, id))) return fail(c, "not_found", 404);
  const body = await readJsonBodyUpTo(c.req.raw, 2048),
    p = z
      .object({ messageId: z.string().min(1).max(160) })
      .strict()
      .safeParse(body.ok ? body.value : null);
  if (!p.success) return fail(c, "invalid_message");
  const message = await c.env.DB.prepare(
    "SELECT id,created_at FROM staff_chat_messages WHERE id=? AND project_id=?",
  )
    .bind(p.data.messageId, id)
    .first<{ id: string; created_at: number }>();
  if (!message) return fail(c, "not_found", 404);
  return mutation(c, `project-chat:read:${c.get("userId")}:${id}`, p.data, () =>
    c.env.DB.prepare(
      `INSERT INTO staff_chat_reads(user_id,target,message_id,message_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,target) DO UPDATE SET message_id=excluded.message_id,message_at=excluded.message_at,updated_at=excluded.updated_at WHERE excluded.message_at>staff_chat_reads.message_at OR(excluded.message_at=staff_chat_reads.message_at AND excluded.message_id>staff_chat_reads.message_id)`,
    ).bind(
      c.get("userId"),
      "project:" + id,
      message.id,
      message.created_at,
      Date.now(),
    ),
  );
});
