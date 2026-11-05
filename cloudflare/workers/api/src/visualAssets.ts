import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { hasCapability, platformRoleForUser } from "./authorization";
import { canAccessProject } from "./projects";
import { maintenanceProjectScope } from "./maintenancePolicy";
import { managedStaff, managedPermission } from "./staffAccessPolicy";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { readJsonBodyUpTo } from "./requestBody";
import { safeFilename } from "./storage";
import { inspectProjectMedia } from "./mediaPolicy";
import { sha256 } from "./security";
import { VISUAL_CATEGORIES } from "../../../../src/shared/visualAssets";
const root = "/api/visual-assets",
  MAX = 15 * 1024 * 1024;
type Ctx = Context<AppBindings>;
export const visualAssetsRouter = new Hono<AppBindings>();
const fail = (
  c: Ctx,
  code: string,
  status: 400 | 403 | 404 | 409 | 413 | 415 | 423 | 429 | 503 = 400,
  message = "Verifică datele și reîncearcă.",
) => c.json({ error: { code, message } }, status);
const category = z.enum(
  Object.keys(VISUAL_CATEGORIES) as [
    keyof typeof VISUAL_CATEGORIES,
    ...(keyof typeof VISUAL_CATEGORIES)[],
  ],
);
const metadata = z
  .object({
    title: z.string().trim().min(1).max(180),
    category,
    description: z.string().trim().max(2000),
    tags: z.array(z.string().trim().min(1).max(40)).max(12),
  })
  .strict();
const input = metadata
  .extend({
    scope: z.enum(["agency", "client"]),
    clientId: z.string().min(1).max(160).nullable(),
    projectId: z.string().min(1).max(160).nullable(),
  })
  .strict()
  .refine((v) =>
    v.scope === "agency" ? !v.clientId && !v.projectId : !!v.clientId,
  );
type Row = {
  id: string;
  scope: string;
  client_id: string | null;
  project_id: string | null;
  created_by: string;
  scan_status: string;
  object_key: string;
  file_name: string;
  content_type: string;
  sha256: string;
  size_bytes: number;
  revision: number;
  archived_at: number | null;
};
async function principal(c: Ctx) {
  return !!(await platformRoleForUser(c.env.DB, c.get("userId")));
}
async function staffAllowed(c: Ctx, write = false) {
  if (await principal(c)) return true;
  const ranked = await managedStaff(c.env.DB, c.get("userId"));
  if (ranked)
    return managedPermission(
      ranked,
      write ? "projects.write" : "projects.read",
    );
  return c.get("roles").some((r) => r === "staff" || r === "admin");
}
async function assetProjects(c: Ctx) {
  if (await hasCapability(c.env.DB, c.get("userId"), "projects.all"))
    return { sql: "1", values: [] as string[] };
  const base = maintenanceProjectScope(c.get("userId"), false);
  return {
    sql: `(${base.sql} OR EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=p.id AND ps.user_id=?))`,
    values: [...base.values, c.get("userId")],
  };
}
async function readScope(c: Ctx, full: boolean) {
  if (full) return { sql: "1", args: [] as (string | number)[] };
  const scope = await assetProjects(c);
  return {
    sql: `((a.scope='agency' AND ${c.get("roles").some((r) => r === "staff" || r === "admin") ? "1" : "0"}) OR (a.scope='client' AND ((a.project_id IS NOT NULL AND EXISTS(SELECT 1 FROM projects p WHERE p.id=a.project_id AND p.client_id=a.client_id AND ${scope.sql})) OR (a.project_id IS NULL AND EXISTS(SELECT 1 FROM client_account_access g WHERE g.client_id=a.client_id AND g.user_id=?))))) AND (a.scan_status='clean' OR (a.scope='client' AND a.created_by=?))`,
    args: [...scope.values, c.get("userId"), c.get("userId")],
  };
}
async function row(c: Ctx, id: string) {
  const s = await readScope(c, await principal(c));
  return c.env.DB.prepare(
    `SELECT a.* FROM visual_assets a WHERE a.id=? AND ${s.sql}`,
  )
    .bind(id, ...s.args)
    .first<Row>();
}
async function writeContext(
  c: Ctx,
  scope: string,
  clientId: string | null,
  projectId: string | null,
) {
  if (await principal(c)) return true;
  if (scope === "agency" || !projectId || !(await staffAllowed(c, true)))
    return false;
  const p = await c.env.DB.prepare("SELECT client_id FROM projects WHERE id=?")
    .bind(projectId)
    .first<{ client_id: string }>();
  return (
    p?.client_id === clientId &&
    (
      await canAccessProject(
        c.env.DB,
        projectId,
        c.get("userId"),
        c.get("roles"),
      )
    ).write
  );
}
function event(c: Ctx, action: string, id: string, detail: unknown = {}) {
  return c.env.DB.prepare(
    "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user',?,'visual_asset',?,'allowed','info',?,?)",
  ).bind(
    crypto.randomUUID(),
    c.get("userId"),
    action,
    id,
    JSON.stringify(detail),
    Date.now(),
  );
}
async function body(c: Ctx) {
  const parsed = await readJsonBodyUpTo(c.req.raw, 8192);
  return parsed.ok &&
    parsed.value &&
    typeof parsed.value === "object" &&
    !Array.isArray(parsed.value)
    ? (parsed.value as Record<string, unknown>)
    : null;
}
const ready = (c: Ctx) => c.env.DOCUMENT_STORAGE_PRIVACY_VERIFIED === "true";
const backupsReady = (c: Ctx) =>
  ready(c) &&
  c.env.DOCUMENT_BACKUP_ISOLATION_VERIFIED === "true" &&
  !!c.env.DOCUMENT_BACKUPS &&
  !!c.env.DOCUMENT_COMPANY_BACKUPS;
visualAssetsRouter.use(root + "*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  if (!(await staffAllowed(c))) return fail(c, "forbidden", 403);
  if (c.req.method !== "GET" && !(await privilegedMfaSatisfied(c)))
    return fail(c, "mfa_required", 403);
  const r = await checkRateLimit(c.env.DB, [
    {
      key: `visual-assets:${c.req.method === "GET" ? "read" : "write"}:${c.get("userId")}`,
      limit: c.req.method === "GET" ? 480 : 60,
      windowSec: 3600,
    },
  ]);
  if (!r.ok) return fail(c, "rate_limited", 429);
  await next();
});
visualAssetsRouter.get(root + "/options", async (c) => {
  const full = await principal(c),
    s = await assetProjects(c);
  const projects = await c.env.DB.prepare(
    `SELECT p.id,p.client_id,p.name,cl.company_name client_name FROM projects p JOIN clients cl ON cl.id=p.client_id WHERE ${full ? "1" : s.sql} ORDER BY p.name LIMIT 500`,
  )
    .bind(...(full ? [] : s.values))
    .all();
  const clients = full
    ? await c.env.DB.prepare(
        "SELECT id,company_name FROM clients ORDER BY company_name LIMIT 1000",
      ).all()
    : {
        results: Array.from(
          new Map(
            (
              projects.results as { client_id: string; client_name: string }[]
            ).map((p) => [
              p.client_id,
              { id: p.client_id, company_name: p.client_name },
            ]),
          ).values(),
        ),
      };
  return c.json({
    projects: projects.results,
    clients: clients.results,
    canManageAgency: full,
    storageReady: ready(c),
    backupReady: backupsReady(c),
    scanner: "unconfigured",
  });
});
visualAssetsRouter.get(root + "/context", async (c) => {
  const id = c.req.query("project") || "",
    p = await c.env.DB.prepare("SELECT client_id FROM projects WHERE id=?")
      .bind(id)
      .first<{ client_id: string }>();
  if (!p) return fail(c, "not_found", 404);
  const perm = await canAccessProject(
    c.env.DB,
    id,
    c.get("userId"),
    c.get("roles"),
  );
  if (!perm.read) return fail(c, "not_found", 404);
  return c.json({ write: await writeContext(c, "client", p.client_id, id) });
});
visualAssetsRouter.get(root, async (c) => {
  const full = await principal(c),
    s = await readScope(c, full),
    scope = c.req.query("scope") || "agency",
    q = (c.req.query("q") || "").trim().slice(0, 100),
    cat = c.req.query("category") || "",
    client = c.req.query("client") || "",
    project = c.req.query("project") || "",
    archived = c.req.query("archived") === "1",
    offset = Number(c.req.query("offset") || 0);
  if (
    !["agency", "client"].includes(scope) ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 100000 ||
    (cat && !category.safeParse(cat).success)
  )
    return fail(c, "invalid_filter");
  const where = [
      s.sql,
      "a.scope=?",
      `a.archived_at IS ${archived ? "NOT " : ""}NULL`,
    ],
    args: (string | number)[] = [...s.args, scope];
  if (client) {
    where.push("a.client_id=?");
    args.push(client);
  }
  if (project) {
    where.push("a.project_id=?");
    args.push(project);
  }
  if (cat) {
    where.push("a.category=?");
    args.push(cat);
  }
  if (q) {
    where.push(
      "lower(a.title||' '||a.file_name||' '||a.description||' '||a.tags_json) LIKE ? ESCAPE '\\'",
    );
    args.push("%" + q.toLowerCase().replace(/[\\%_]/g, "\\$&") + "%");
  }
  const [rows, count] = await Promise.all([
    c.env.DB.prepare(
      `SELECT a.id,a.scope,a.client_id,a.project_id,a.title,a.category,a.description,a.tags_json,a.file_name,a.content_type,a.size_bytes,a.sha256,a.scan_status,a.archived_at,a.revision,a.created_by,a.created_at,a.updated_at,cl.company_name client_name,p.name project_name FROM visual_assets a LEFT JOIN clients cl ON cl.id=a.client_id LEFT JOIN projects p ON p.id=a.project_id WHERE ${where.join(" AND ")} ORDER BY a.updated_at DESC,a.id LIMIT 36 OFFSET ?`,
    )
      .bind(...args, offset)
      .all<Record<string, unknown>>(),
    c.env.DB.prepare(
      `SELECT count(*) n FROM visual_assets a WHERE ${where.join(" AND ")}`,
    )
      .bind(...args)
      .first<{ n: number }>(),
  ]);
  return c.json({
    data: await Promise.all(
      rows.results.map(async (r) => ({
        ...r,
        tags: JSON.parse(String(r.tags_json)),
        tags_json: undefined,
        canEdit: await writeContext(
          c,
          String(r.scope),
          r.client_id as string | null,
          r.project_id as string | null,
        ),
        canInspect: full || r.created_by === c.get("userId"),
      })),
    ),
    total: count?.n || 0,
    limit: 36,
    offset,
  });
});
visualAssetsRouter.post(root + "/upload", async (c) => {
  if (!ready(c)) return fail(c, "private_storage_unconfigured", 503);
  if ((c.req.header("X-Asset-Metadata") || "").length > 10000)
    return fail(c, "metadata_too_large", 413);
  const parsed = input.safeParse(
    (() => {
      try {
        return JSON.parse(
          decodeURIComponent(c.req.header("X-Asset-Metadata") || "null"),
        );
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) return fail(c, "invalid_metadata");
  const b = parsed.data;
  if (!(await writeContext(c, b.scope, b.clientId, b.projectId)))
    return fail(c, "forbidden", 403);
  if (
    b.scope === "client" &&
    !(await c.env.DB.prepare(
      "SELECT 1 FROM clients WHERE id=? AND status<>'archived'",
    )
      .bind(b.clientId)
      .first())
  )
    return fail(c, "client_not_found", 404);
  if (
    b.projectId &&
    !(await c.env.DB.prepare(
      "SELECT 1 FROM projects WHERE id=? AND client_id=?",
    )
      .bind(b.projectId, b.clientId)
      .first())
  )
    return fail(c, "beneficiary_mismatch", 409);
  const key = c.req.header("Idempotency-Key") || "";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key))
    return fail(c, "idempotency_key_required");
  let fileName: string;
  try {
    fileName = decodeURIComponent(c.req.header("X-Asset-Filename") || "file");
  } catch {
    return fail(c, "invalid_filename");
  }
  const name = safeFilename(fileName),
    mime = (c.req.header("Content-Type") || "").toLowerCase();
  if (
    ![
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "application/pdf",
    ].includes(mime)
  )
    return fail(c, "unsupported_type", 415);
  if (Number(c.req.header("Content-Length") || 0) > MAX)
    return fail(c, "too_large", 413);
  const reader = c.req.raw.body?.getReader();
  if (!reader) return fail(c, "empty_file");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > MAX) {
        await reader.cancel();
        return fail(c, "too_large", 413);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const v of chunks) {
    bytes.set(v, at);
    at += v.length;
  }
  const svg =
    mime === "image/svg+xml" &&
    name.toLowerCase().endsWith(".svg") &&
    size > 0 &&
    size <= 2 * 1024 * 1024 &&
    (() => {
      try {
        return /<svg[\s>]/i.test(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        );
      } catch {
        return false;
      }
    })();
  if (!svg && !inspectProjectMedia(name, mime, bytes))
    return fail(c, "invalid_file", 415);
  const sum = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((v) => v.toString(16).padStart(2, "0"))
      .join(""),
    hash = await sha256(JSON.stringify({ b, name, mime, sum })),
    scope = `visual-upload:${c.get("userId")}`;
  const previous = () =>
    c.env.DB.prepare(
      "SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
    )
      .bind(scope, key)
      .first<{ request_hash: string; response_json: string }>();
  const cached = await previous();
  if (cached)
    return cached.request_hash === hash
      ? c.json(JSON.parse(cached.response_json), 201)
      : fail(c, "idempotency_key_reused", 409);
  const id = crypto.randomUUID(),
    objectKey = `visual-assets/quarantine/${id}`,
    t = Date.now(),
    result = { id, scanStatus: "quarantined", scanner: "unconfigured" };
  try {
    await c.env.FILES.put(objectKey, bytes, {
      httpMetadata: { contentType: mime, contentDisposition: "attachment" },
      customMetadata: { assetId: id, sha256: sum },
    });
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,201,?,?,?)",
      ).bind(scope, key, hash, JSON.stringify(result), t, t + 86400000),
      c.env.DB.prepare(
        "INSERT INTO visual_assets(id,scope,client_id,project_id,title,category,description,tags_json,object_key,file_name,content_type,size_bytes,sha256,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        b.scope,
        b.clientId,
        b.projectId,
        b.title,
        b.category,
        b.description,
        JSON.stringify(b.tags),
        objectKey,
        name,
        mime,
        size,
        sum,
        c.get("userId"),
        t,
        t,
      ),
      event(c, "visual_asset.uploaded", id, {
        scope: b.scope,
        clientId: b.clientId,
        scanStatus: "quarantined",
      }),
    ]);
  } catch (e) {
    await c.env.FILES.delete(objectKey).catch(() =>
      console.error(
        JSON.stringify({
          event: "visual_asset_orphan_cleanup_failed",
          assetId: id,
        }),
      ),
    );
    const replay = await previous();
    if (replay)
      return replay.request_hash === hash
        ? c.json(JSON.parse(replay.response_json), 201)
        : fail(c, "idempotency_key_reused", 409);
    if (/constraint/i.test(String(e))) return fail(c, "context_changed", 409);
    throw e;
  }
  return c.json(result, 201);
});
visualAssetsRouter.patch(root + "/:id", async (c) => {
  const a = await row(c, c.req.param("id") || "");
  if (!a) return fail(c, "not_found", 404);
  if (!(await writeContext(c, a.scope, a.client_id, a.project_id)))
    return fail(c, "forbidden", 403);
  const body = await readJsonBodyUpTo(c.req.raw, 8192),
    p = metadata
      .extend({ revision: z.number().int().positive(), archived: z.boolean() })
      .strict()
      .safeParse(body.ok ? body.value : null);
  if (!p.success) return fail(c, "invalid_metadata");
  const b = p.data;
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE visual_assets SET title=?,category=?,description=?,tags_json=?,archived_at=?,revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,updated_at=? WHERE id=?",
      ).bind(
        b.title,
        b.category,
        b.description,
        JSON.stringify(b.tags),
        b.archived ? Date.now() : null,
        b.revision,
        Date.now(),
        a.id,
      ),
      event(c, "visual_asset.metadata.updated", a.id, { archived: b.archived }),
    ]);
  } catch (e) {
    if (/constraint/i.test(String(e))) return fail(c, "revision_conflict", 409);
    throw e;
  }
  return c.json({ ok: true });
});
visualAssetsRouter.get(root + "/:id/content", async (c) => {
  const a = await row(c, c.req.param("id") || "");
  if (!a) return fail(c, "not_found", 404);
  if (!ready(c)) return fail(c, "private_storage_unconfigured", 503);
  const inspection =
    c.req.query("inspect") === "1" &&
    ((await principal(c)) || a.created_by === c.get("userId"));
  if (a.scan_status !== "clean" && !inspection)
    return fail(
      c,
      "quarantined",
      423,
      "Fișier în carantină; scanarea nu este configurată.",
    );
  const object = await c.env.FILES.get(a.object_key);
  if (!object) return fail(c, "file_missing", 404);
  const preview =
      c.req.query("preview") === "1" &&
      /^image\/(png|jpeg|webp|gif)$/.test(a.content_type),
    disposition = preview ? "inline" : "attachment";
  return new Response(object.body, {
    headers: {
      "Content-Type": a.content_type,
      "Content-Length": String(object.size),
      "Content-Disposition": `${disposition}; filename="${a.file_name.replace(/["\\\r\n]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(a.file_name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
});
visualAssetsRouter.get(root + "/:id/backups", async (c) => {
  const a = await row(c, c.req.param("id") || "");
  if (!a) return fail(c, "not_found", 404);
  if (!(await principal(c))) return fail(c, "forbidden", 403);
  const rows = await c.env.DB.prepare(
    "SELECT id,sha256,size_bytes,created_at FROM visual_asset_backups WHERE asset_id=? ORDER BY created_at DESC LIMIT 20",
  )
    .bind(a.id)
    .all();
  return c.json({ data: rows.results, configured: backupsReady(c) });
});
visualAssetsRouter.post(root + "/:id/backup", async (c) => {
  const a = await row(c, c.req.param("id") || "");
  if (!a) return fail(c, "not_found", 404);
  if (!(await principal(c))) return fail(c, "forbidden", 403);
  if (!backupsReady(c)) return fail(c, "backup_unconfigured", 503);
  if ((await body(c))?.confirmed !== true)
    return fail(c, "confirmation_required");
  const object = await c.env.FILES.get(a.object_key);
  if (!object || object.size > MAX) return fail(c, "file_missing", 404);
  const bytes = await object.arrayBuffer();
  const checksum = async (v: ArrayBuffer) =>
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", v)))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  if ((await checksum(bytes)) !== a.sha256)
    return fail(c, "integrity_failed", 409);
  const dest =
      a.scope === "agency"
        ? c.env.DOCUMENT_COMPANY_BACKUPS!
        : c.env.DOCUMENT_BACKUPS!,
    id = crypto.randomUUID(),
    key = `visual-assets/${id}`;
  const existing = await c.env.DB.prepare(
    "SELECT id,object_key,manifest_sha256 FROM visual_asset_backups WHERE asset_id=? AND sha256=? ORDER BY created_at DESC LIMIT 1",
  )
    .bind(a.id, a.sha256)
    .first<{ id: string; object_key: string; manifest_sha256: string }>();
  if (existing) {
    const copy = await dest.get(existing.object_key),
      manifest = await dest.get(existing.object_key + ".json");
    const manifestText =
      manifest && manifest.size <= 65536 ? await manifest.text() : null;
    if (
      copy &&
      manifestText &&
      (await sha256(manifestText)) === existing.manifest_sha256 &&
      JSON.stringify(JSON.parse(manifestText).asset) === JSON.stringify(a) &&
      copy.size <= MAX &&
      (await checksum(await copy.arrayBuffer())) === a.sha256
    )
      return c.json({
        ok: true,
        id: existing.id,
        verified: true,
        reused: true,
      });
  }
  const manifest = JSON.stringify({
      schema: 1,
      asset: a,
      backupId: id,
      createdBy: c.get("userId"),
      createdAt: Date.now(),
      accessModel:
        "current native CRM/project permissions; no grants restored implicitly",
    }),
    manifestHash = await sha256(manifest);
  let complete = false;
  try {
    await dest.put(key, bytes, {
      customMetadata: { assetId: a.id, sha256: a.sha256 },
    });
    await dest.put(key + ".json", manifest, {
      httpMetadata: { contentType: "application/json" },
    });
    const manifestCopy = await dest.get(key + ".json");
    if (
      !manifestCopy ||
      manifestCopy.size > 65536 ||
      (await sha256(await manifestCopy.text())) !== manifestHash
    ) {
      return fail(c, "backup_integrity_failed", 409);
    }
    const copy = await dest.get(key);
    if (!copy || (await checksum(await copy.arrayBuffer())) !== a.sha256) {
      return fail(c, "backup_integrity_failed", 409);
    }
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO visual_asset_backups(id,asset_id,object_key,sha256,manifest_sha256,size_bytes,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        a.id,
        key,
        a.sha256,
        manifestHash,
        a.size_bytes,
        c.get("userId"),
        Date.now(),
      ),
      event(c, "visual_asset.backup.verified", a.id, { backupId: id }),
    ]);
    complete = true;
    return c.json({ ok: true, id, verified: true });
  } finally {
    if (!complete) {
      const cleanup = await Promise.allSettled([
        dest.delete(key),
        dest.delete(key + ".json"),
      ]);
      if (cleanup.some((r) => r.status === "rejected"))
        console.error(
          JSON.stringify({
            event: "visual_backup_orphan_cleanup_failed",
            assetId: a.id,
            backupId: id,
          }),
        );
    }
  }
});
visualAssetsRouter.post(root + "/:id/restore", async (c) => {
  const a = await row(c, c.req.param("id") || "");
  if (!a) return fail(c, "not_found", 404);
  if (!(await principal(c))) return fail(c, "forbidden", 403);
  if (!backupsReady(c)) return fail(c, "backup_unconfigured", 503);
  const parsed = z
    .object({
      backupId: z.string().min(1).max(160),
      confirmed: z.literal(true),
    })
    .strict()
    .safeParse(await body(c));
  if (!parsed.success) return fail(c, "confirmation_required");
  const b = parsed.data;
  const record = await c.env.DB.prepare(
    "SELECT object_key,manifest_sha256 FROM visual_asset_backups WHERE id=? AND asset_id=? AND sha256=?",
  )
    .bind(b.backupId, a.id, a.sha256)
    .first<{ object_key: string; manifest_sha256: string }>();
  if (!record) return fail(c, "not_found", 404);
  const source =
      a.scope === "agency"
        ? c.env.DOCUMENT_COMPANY_BACKUPS!
        : c.env.DOCUMENT_BACKUPS!,
    object = await source.get(record.object_key);
  if (!object || object.size > MAX) return fail(c, "backup_missing", 404);
  const manifest = await source.get(record.object_key + ".json");
  if (
    !manifest ||
    manifest.size > 65536 ||
    (await sha256(await manifest.text())) !== record.manifest_sha256
  )
    return fail(c, "manifest_integrity_failed", 409);
  const bytes = await object.arrayBuffer(),
    sum = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  if (sum !== a.sha256) return fail(c, "integrity_failed", 409);
  await c.env.FILES.put(a.object_key, bytes, {
    httpMetadata: {
      contentType: a.content_type,
      contentDisposition: "attachment",
    },
    customMetadata: { assetId: a.id, sha256: a.sha256 },
  });
  const restored = await c.env.FILES.get(a.object_key);
  if (!restored || restored.size > MAX)
    return fail(c, "restore_integrity_failed", 409);
  const restoredHash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await restored.arrayBuffer()),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  if (restoredHash !== a.sha256)
    return fail(c, "restore_integrity_failed", 409);
  await event(c, "visual_asset.restored", a.id, { backupId: b.backupId }).run();
  return c.json({ ok: true, scanStatus: a.scan_status });
});
