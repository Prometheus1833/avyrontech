import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { readJsonBodyUpTo } from "./requestBody";
import { sha256 } from "./security";
import manifest from "../../../../src/shared/serviceContentManifest.json";
import type { ServiceTextValues } from "../../../../src/shared/servicePagePolicy";
type Ctx = Context<AppBindings>;
const pages: Record<string, { values: ServiceTextValues }> = manifest;
const fail = (
  c: Ctx,
  code: string,
  status: 400 | 403 | 404 | 409 | 413 = 400,
) =>
  c.json(
    {
      error: {
        code,
        message:
          code === "revision_conflict"
            ? "Pagina s-a modificat. Reîncarcă înainte de salvare."
            : code === "forbidden"
              ? "Nu ai permisiunea necesară."
              : "Verifică datele și reîncearcă.",
      },
    },
    status,
  );
const event = (c: Ctx, key: string, revision: number, action: string) =>
  c.env.DB.prepare(
    `INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user',?,'service_page',?,'allowed','info',?,?)`,
  ).bind(
    crypto.randomUUID(),
    c.get("userId"),
    action,
    key,
    JSON.stringify({ revision }),
    Date.now(),
  );
export const servicePagesRouter = new Hono<AppBindings>();
servicePagesRouter.get("/api/public/service-pages/:key", async (c) => {
  const key = c.req.param("key");
  if (!Object.hasOwn(pages, key)) return fail(c, "not_found", 404);
  const row = await c.env.DB.prepare(
    "SELECT v.content_json,v.revision FROM service_page_configs p JOIN service_page_versions v ON v.page_key=p.page_key AND v.revision=p.published_revision WHERE p.page_key=?",
  )
    .bind(key)
    .first<{ content_json: string; revision: number }>();
  const etag = `"service-${key}-${row?.revision || 0}"`;
  c.header("ETag", etag);
  c.header("Cache-Control", "public, max-age=0, must-revalidate");
  if (c.req.header("if-none-match") === etag) return c.body(null, 304);
  return c.json({
    values: row ? JSON.parse(row.content_json) : {},
    revision: row?.revision || 0,
  });
});
servicePagesRouter.use("/api/admin/service-pages/*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  if (
    !c.get("roles").some((role) => role === "staff" || role === "admin") &&
    !(await platformRoleForUser(c.env.DB, c.get("userId")))
  )
    return fail(c, "forbidden", 403);
  if (!Object.hasOwn(pages, c.req.path.split("/")[4] || ""))
    return fail(c, "not_found", 404);
  if (c.req.method !== "GET") {
    if (
      !(await platformRoleForUser(c.env.DB, c.get("userId"))) ||
      !(await privilegedMfaSatisfied(c))
    )
      return fail(c, "forbidden", 403);
    const rate = await checkRateLimit(c.env.DB, [
      { key: `service-edit:${c.get("userId")}`, limit: 60, windowSec: 3600 },
    ]);
    if (!rate.ok) return c.json({ error: { code: "rate_limited" } }, 429);
  }
  await next();
});
servicePagesRouter.get("/api/admin/service-pages/:key", async (c) => {
  const key = c.req.param("key");
  const row = await c.env.DB.prepare(
    "SELECT revision,draft_json,published_revision,updated_at FROM service_page_configs WHERE page_key=?",
  )
    .bind(key)
    .first<{
      revision: number;
      draft_json: string;
      published_revision: number | null;
      updated_at: number;
    }>();
  const history = await c.env.DB.prepare(
    "SELECT v.revision,v.created_at,COALESCE(p.pseudonym,p.display_name,u.display_name,'Administrator') actor_name FROM service_page_versions v JOIN users u ON u.id=v.actor_user_id LEFT JOIN profiles p ON p.id=u.id WHERE v.page_key=? ORDER BY v.revision DESC LIMIT 30",
  )
    .bind(key)
    .all();
  return c.json({
    key,
    revision: row?.revision || 0,
    values: row ? JSON.parse(row.draft_json) : {},
    publishedRevision: row?.published_revision ?? null,
    updatedAt: row?.updated_at ?? null,
    canManage: !!(await platformRoleForUser(c.env.DB, c.get("userId"))),
    history: history.results,
  });
});
servicePagesRouter.get(
  "/api/admin/service-pages/:key/versions/:revision",
  async (c) => {
    const raw = c.req.param("revision");
    if (!/^[1-9]\d{0,8}$/.test(raw)) return fail(c, "not_found", 404);
    const row = await c.env.DB.prepare(
      "SELECT content_json FROM service_page_versions WHERE page_key=? AND revision=?",
    )
      .bind(c.req.param("key"), Number(raw))
      .first<{ content_json: string }>();
    if (!row) return fail(c, "not_found", 404);
    return c.json({ values: JSON.parse(row.content_json) });
  },
);
servicePagesRouter.put("/api/admin/service-pages/:key", async (c) => {
  const key = c.req.param("key"),
    idempotencyKey = c.req.header("idempotency-key") || "";
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(idempotencyKey))
    return fail(c, "idempotency_key_required");
  const read = await readJsonBodyUpTo(c.req.raw, 128 * 1024);
  if (!read.ok)
    return fail(c, read.error, read.error === "payload_too_large" ? 413 : 400);
  const parsed = z
    .object({
      revision: z.number().int().nonnegative(),
      values: z.record(z.string(), z.string().trim().min(1).max(6000)),
    })
    .strict()
    .safeParse(read.value);
  if (!parsed.success) return fail(c, "invalid_input");
  const input = parsed.data,
    defaults = pages[key].values;
  if (
    Object.keys(input.values).some((field) => !Object.hasOwn(defaults, field))
  )
    return fail(c, "unknown_content_field");
  // Persist only differences. Code, URLs, SKU, amounts and styles are never editable text fields.
  const values = Object.fromEntries(
    Object.entries(input.values).filter(
      ([field, value]) => value !== defaults[field],
    ),
  );
  const scope = `service-config:${c.get("userId")}:${key}`,
    hash = await sha256(JSON.stringify(input));
  const lookup = () =>
    c.env.DB.prepare(
      "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
    )
      .bind(scope, idempotencyKey)
      .first<{ request_hash: string; response_json: string }>();
  const prior = await lookup();
  if (prior)
    return prior.request_hash === hash
      ? c.json(JSON.parse(prior.response_json))
      : fail(c, "idempotency_key_reused", 409);
  const revision = input.revision + 1,
    t = Date.now(),
    response = { revision };
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,200,?,?,?)",
      ).bind(
        scope,
        idempotencyKey,
        hash,
        JSON.stringify(response),
        t,
        t + 86400000,
      ),
      input.revision === 0
        ? c.env.DB.prepare(
            "INSERT INTO service_page_configs(page_key,revision,draft_json,updated_by,updated_at) VALUES(?,1,?,?,?)",
          ).bind(key, JSON.stringify(values), c.get("userId"), t)
        : c.env.DB.prepare(
            "UPDATE service_page_configs SET revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,draft_json=?,updated_by=?,updated_at=? WHERE page_key=?",
          ).bind(
            input.revision,
            JSON.stringify(values),
            c.get("userId"),
            t,
            key,
          ),
      c.env.DB.prepare(
        "INSERT INTO service_page_versions(page_key,revision,content_json,actor_user_id,created_at) VALUES(?,?,?,?,?)",
      ).bind(key, revision, JSON.stringify(values), c.get("userId"), t),
      event(c, key, revision, "service_page.draft_saved"),
    ]);
  } catch (error) {
    const replay = await lookup();
    if (replay)
      return replay.request_hash === hash
        ? c.json(JSON.parse(replay.response_json))
        : fail(c, "idempotency_key_reused", 409);
    if (/constraint failed|immutable_service_page_version/i.test(String(error)))
      return fail(c, "revision_conflict", 409);
    throw error;
  }
  return c.json(response);
});
servicePagesRouter.post("/api/admin/service-pages/:key/publish", async (c) => {
  const key = c.req.param("key");
  const input = z
    .object({
      revision: z.number().int().positive(),
      confirmed: z.literal(true),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!input.success) return fail(c, "confirmation_required");
  const revision = input.data.revision;
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE service_page_configs SET published_revision=? WHERE page_key=? AND revision=? AND published_revision IS NOT ?",
    ).bind(revision, key, revision, revision),
    c.env.DB.prepare(
      `INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at) SELECT ?,?,'user','service_page.published','service_page',?,'allowed','info',?,? WHERE changes()=1`,
    ).bind(
      crypto.randomUUID(),
      c.get("userId"),
      key,
      JSON.stringify({ revision }),
      Date.now(),
    ),
  ]);
  if (!result[0].meta.changes) {
    const current = await c.env.DB.prepare(
      "SELECT revision,published_revision FROM service_page_configs WHERE page_key=?",
    )
      .bind(key)
      .first<{ revision: number; published_revision: number }>();
    if (
      current?.revision !== revision ||
      current.published_revision !== revision
    )
      return fail(c, "revision_conflict", 409);
  }
  return c.json({ ok: true });
});
