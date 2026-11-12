import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { hasCapability, platformRoleForUser } from "./authorization";
import { managedStaff, managedPermission } from "./staffAccessPolicy";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { readJsonBodyUpTo } from "./requestBody";
import { sha256 } from "./security";
import {
  CAROUSEL_PAGES,
  carouselConfigSchema,
  defaultCarousel,
  blankCarousel,
  activeExampleItems,
  publicCarousel,
  type CarouselConfig,
  type ExampleState,
} from "../../../../src/shared/exampleCarousels";
type Ctx = Context<AppBindings>;
type Row = {
  revision: number;
  draft_json: string;
  published_revision: number | null;
  review_state: ExampleState;
};
const base = "/api/admin/example-carousels";
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
            ? "Există o versiune mai nouă. Reîncarcă înainte de a continua."
            : code === "forbidden"
              ? "Nu ai permisiunea necesară."
              : "Verifică datele și starea curentă a caruselului.",
      },
    },
    status,
  );
const validKey = (key: string) => CAROUSEL_PAGES.some((p) => p.key === key);
const getRow = (db: D1Database, key: string) =>
  db
    .prepare(
      "SELECT revision,draft_json,published_revision,review_state FROM example_carousel_configs WHERE page_key=?",
    )
    .bind(key)
    .first<Row>();

/** Strict public projection. Private drafts, hidden items and history never reach this endpoint. */
export async function publishedCarousel(
  db: D1Database,
  key: string,
): Promise<CarouselConfig | null> {
  const row = await db
    .prepare(
      "SELECT v.content_json FROM example_carousel_configs c JOIN example_carousel_versions v ON v.page_key=c.page_key AND v.revision=c.published_revision WHERE c.page_key=?",
    )
    .bind(key)
    .first<{ content_json: string }>();
  return publicCarousel(
    row
      ? carouselConfigSchema.parse(JSON.parse(row.content_json))
      : defaultCarousel(key),
  );
}
export const exampleCarouselsRouter = new Hono<AppBindings>();
exampleCarouselsRouter.get("/api/public/example-carousels/:key", async (c) => {
  const key = c.req.param("key") || "";
  if (!validKey(key)) return fail(c, "not_found", 404);
  c.header("Cache-Control", "public, max-age=0, must-revalidate");
  return c.json({ config: await publishedCarousel(c.env.DB, key) });
});
exampleCarouselsRouter.use(base + "*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  const principal = !!(await platformRoleForUser(c.env.DB, c.get("userId")));
  const ranked = await managedStaff(c.env.DB, c.get("userId"));
  const staff = c.get("roles").some((r) => r === "staff" || r === "admin");
  if (
    !principal &&
    (!staff || (ranked && !managedPermission(ranked, "examples.read")))
  )
    return fail(c, "forbidden", 403);
  if (c.req.method !== "GET") {
    const action = c.req.path.split("/")[5];
    const permission =
      action === "publish"
        ? "examples.publish"
        : ["approve", "reject"].includes(action)
          ? "examples.approve"
          : "examples.edit";
    if (
      (!principal &&
        (!(await hasCapability(c.env.DB, c.get("userId"), permission)) ||
          (ranked && !managedPermission(ranked, permission)))) ||
      !(await privilegedMfaSatisfied(c))
    )
      return fail(c, "forbidden", 403);
  }
  const rate = await checkRateLimit(c.env.DB, [
    {
      key: `example-carousel:${c.get("userId")}:${c.req.method === "GET" ? "read" : "write"}`,
      limit: c.req.method === "GET" ? 600 : 90,
      windowSec: 3600,
    },
  ]);
  if (!rate.ok)
    return c.json({ error: { code: "rate_limited" } }, 429, {
      "Retry-After": String(rate.retryAfter),
    });
  await next();
});
exampleCarouselsRouter.get(base, async (c) => {
  const data = await c.env.DB.prepare(
    "SELECT page_key,revision,published_revision,review_state,updated_at FROM example_carousel_configs ORDER BY updated_at DESC",
  ).all();
  return c.json({
    data: CAROUSEL_PAGES.map((p) => ({
      ...p,
      ...(data.results.find((row) => row.page_key === p.key) || {
        revision: 0,
        published_revision: null,
        review_state: "draft",
      }),
      builtin: !!defaultCarousel(p.key),
    })),
  });
});
exampleCarouselsRouter.get(base + "/:key", async (c) => {
  const key = c.req.param("key") || "";
  if (!validKey(key)) return fail(c, "not_found", 404);
  const row = await getRow(c.env.DB, key);
  const principal = !!(await platformRoleForUser(c.env.DB, c.get("userId")));
  const history = await c.env.DB.prepare(
    "SELECT v.revision,v.created_at,coalesce(p.pseudonym,p.display_name,u.display_name,'Membru') actor_name FROM example_carousel_versions v JOIN users u ON u.id=v.actor_user_id LEFT JOIN profiles p ON p.id=u.id WHERE v.page_key=? ORDER BY v.revision DESC LIMIT 30",
  )
    .bind(key)
    .all();
  const events = await c.env.DB.prepare(
    "SELECT e.action,e.created_at,json_extract(e.metadata_json,'$.revision') revision,coalesce(p.pseudonym,p.display_name,u.display_name,'Membru') actor_name FROM security_events e LEFT JOIN users u ON u.id=e.actor_user_id LEFT JOIN profiles p ON p.id=u.id WHERE e.target_type='example_carousel' AND e.target_id=? ORDER BY e.created_at DESC,e.id DESC LIMIT 100",
  )
    .bind(key)
    .all();
  const config: CarouselConfig = row
    ? JSON.parse(row.draft_json)
    : defaultCarousel(key) || blankCarousel();
  return c.json({
    events: events.results,
    key,
    revision: row?.revision || 0,
    state: row?.review_state || "draft",
    config: { ...config, items: activeExampleItems(config.items) },
    publishedRevision: row?.published_revision ?? null,
    published: await publishedCarousel(c.env.DB, key),
    history: history.results,
    permissions: {
      edit:
        principal ||
        (await hasCapability(c.env.DB, c.get("userId"), "examples.edit")),
      approve:
        principal ||
        (await hasCapability(c.env.DB, c.get("userId"), "examples.approve")),
      publish:
        principal ||
        (await hasCapability(c.env.DB, c.get("userId"), "examples.publish")),
    },
  });
});
exampleCarouselsRouter.get(base + "/:key/versions/:revision", async (c) => {
  const key = c.req.param("key") || "",
    raw = c.req.param("revision") || "";
  if (!validKey(key) || !/^[1-9]\d{0,8}$/.test(raw))
    return fail(c, "not_found", 404);
  const row = await c.env.DB.prepare(
    "SELECT content_json FROM example_carousel_versions WHERE page_key=? AND revision=?",
  )
    .bind(key, Number(raw))
    .first<{ content_json: string }>();
  return row
    ? c.json({ config: JSON.parse(row.content_json) })
    : fail(c, "not_found", 404);
});
const audit = (c: Ctx, key: string, revision: number, action: string) =>
  c.env.DB.prepare(
    "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user',?,'example_carousel',?,'allowed','info',?,?)",
  ).bind(
    crypto.randomUUID(),
    c.get("userId"),
    `examples.${action}`,
    key,
    JSON.stringify({ revision }),
    Date.now(),
  );

/** Idempotency reservation, CAS mutation, immutable version and audit commit together. */
async function mutate(
  c: Ctx,
  key: string,
  input: unknown,
  statements: D1PreparedStatement[],
  result: object,
) {
  const id = c.req.header("idempotency-key") || "";
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(id))
    return fail(c, "idempotency_key_required");
  const scope = `examples:${c.get("userId")}:${c.req.method}:${c.req.path}`,
    hash = await sha256(JSON.stringify(input));
  const lookup = () =>
    c.env.DB.prepare(
      "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
    )
      .bind(scope, id)
      .first<{ request_hash: string; response_json: string }>();
  const replay = await lookup();
  if (replay)
    return replay.request_hash === hash
      ? c.json(JSON.parse(replay.response_json))
      : fail(c, "idempotency_key_reused", 409);
  const t = Date.now();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,200,?,?,?)",
      ).bind(scope, id, hash, JSON.stringify(result), t, t + 86400000),
      ...statements,
    ]);
  } catch (error) {
    const cached = await lookup();
    if (cached)
      return cached.request_hash === hash
        ? c.json(JSON.parse(cached.response_json))
        : fail(c, "idempotency_key_reused", 409);
    if (/constraint failed|immutable_example/i.test(String(error)))
      return fail(c, "revision_conflict", 409);
    throw error;
  }
  return c.json(result);
}
exampleCarouselsRouter.put(base + "/:key", async (c) => {
  const key = c.req.param("key") || "";
  if (!validKey(key)) return fail(c, "not_found", 404);
  const read = await readJsonBodyUpTo(c.req.raw, 200 * 1024);
  if (!read.ok)
    return fail(c, read.error, read.error === "payload_too_large" ? 413 : 400);
  const parsed = z
    .object({
      revision: z.number().int().min(0).max(10000000),
      config: carouselConfigSchema,
    })
    .strict()
    .safeParse(read.value);
  if (!parsed.success) return fail(c, "invalid_config");
  const { revision, config } = parsed.data,
    next = revision + 1,
    t = Date.now();
  const content = JSON.stringify({
    ...config,
    items: activeExampleItems(config.items),
  });
  return mutate(
    c,
    key,
    parsed.data,
    [
      revision === 0
        ? c.env.DB.prepare(
            "INSERT INTO example_carousel_configs(page_key,revision,draft_json,updated_by,updated_at) VALUES(?,1,?,?,?)",
          ).bind(key, content, c.get("userId"), t)
        : c.env.DB.prepare(
            "UPDATE example_carousel_configs SET revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,draft_json=?,review_state='draft',updated_by=?,updated_at=? WHERE page_key=?",
          ).bind(revision, content, c.get("userId"), t, key),
      c.env.DB.prepare(
        "INSERT INTO example_carousel_versions(page_key,revision,content_json,actor_user_id,created_at) VALUES(?,?,?,?,?)",
      ).bind(key, next, content, c.get("userId"), t),
      audit(c, key, next, "draft_saved"),
    ],
    { revision: next },
  );
});
exampleCarouselsRouter.post(base + "/:key/:action", async (c) => {
  const key = c.req.param("key") || "",
    action = c.req.param("action") || "";
  if (
    !validKey(key) ||
    !["submit", "approve", "reject", "publish"].includes(action)
  )
    return fail(c, "not_found", 404);
  const read = await readJsonBodyUpTo(c.req.raw, 2048);
  if (!read.ok)
    return fail(c, read.error, read.error === "payload_too_large" ? 413 : 400);
  const parsed = z
    .object({
      revision: z.number().int().positive(),
      confirmed: z.literal(true),
    })
    .strict()
    .safeParse(read.value);
  if (!parsed.success) return fail(c, "confirmation_required");
  const revision = parsed.data.revision;
  const from =
    action === "submit"
      ? "('draft','rejected')"
      : action === "publish"
        ? "('approved')"
        : "('in_review')";
  const state =
    action === "submit"
      ? "in_review"
      : action === "approve"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : "published";
  // Missing rows cannot produce a phantom successful transition. Replays still
  // pass through mutate and current authorization before returning cached data.
  const current = await getRow(c.env.DB, key);
  if (!current) return fail(c, "not_found", 404);
  const currentConfig = carouselConfigSchema.parse(
    JSON.parse(current.draft_json),
  );
  if (
    action === "submit" &&
    currentConfig.enabled &&
    !currentConfig.items.some((i) => i.visibility === "visible")
  )
    return fail(c, "missing_examples");
  const statements = [
    c.env.DB.prepare(
      `UPDATE example_carousel_configs SET review_state=CASE WHEN revision=? AND review_state IN ${from} THEN ? ELSE NULL END,${action === "publish" ? "published_revision=?," : ""}updated_by=?,updated_at=? WHERE page_key=?`,
    ).bind(
      revision,
      state,
      ...(action === "publish" ? [revision] : []),
      c.get("userId"),
      Date.now(),
      key,
    ),
    audit(c, key, revision, action),
  ];
  if (action === "submit")
    statements.push(
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at)
    SELECT lower(hex(randomblob(16))),u.id,?,? ,?,'example-carousels',? FROM users u JOIN platform_principals p ON p.email=u.email COLLATE NOCASE
    WHERE u.disabled_at IS NULL AND u.email_verified=1 AND p.status='active' AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role='admin')`,
      ).bind(
        `carousel:${key}:${revision}`,
        "Carusel trimis la verificare",
        `${CAROUSEL_PAGES.find((p) => p.key === key)!.name} · versiunea ${revision}`,
        Date.now(),
      ),
    );
  return mutate(c, key, parsed.data, statements, { ok: true, revision, state });
});
