import { Hono, type Context } from "hono";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";
import { privilegedMfaSatisfied } from "./mfaPolicy";
import { checkRateLimit } from "./antispam";
import { readJsonBodyUpTo } from "./requestBody";
import { sha256 } from "./security";
import { BouncerError } from "./bouncer";
import { ANTIVIRUS_SOURCES } from "../../../../src/shared/antivirus";
import {
  antivirusFailure,
  complianceReasons,
  sensitiveApproved,
  scanningBlock,
  scanUpload,
  scanJob,
  pollMalwareJob,
  reconcileMalwareJob,
  submitMalwareJob,
  syncMalwareUsage,
  malwareEvent,
  releaseQuarantine,
  registerScannedObject,
  bytesHash,
} from "./malware";
const root = "/api/antivirus";
export const antivirusRouter = new Hono<AppBindings>();
antivirusRouter.use(root + "*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  if (!(await platformRoleForUser(c.env.DB, c.get("userId"))))
    return c.json({ error: { code: "forbidden" } }, 403);
  if (c.req.method !== "GET" && !(await privilegedMfaSatisfied(c)))
    return c.json({ error: { code: "mfa_required" } }, 403);
  const rate = await checkRateLimit(c.env.DB, [
    {
      key: `antivirus:${c.get("userId")}:${c.req.method === "GET" ? "read" : "write"}`,
      limit: c.req.method === "GET" ? 120 : 30,
      windowSec: 3600,
    },
  ]);
  if (!rate.ok)
    return c.json({ error: { code: "rate_limited" } }, 429, {
      "Retry-After": String(rate.retryAfter),
    });
  await next();
});
antivirusRouter.get(root, async (c) => {
  const source = c.req.query("source");
  if (
    source &&
    !ANTIVIRUS_SOURCES.includes(source as (typeof ANTIVIRUS_SOURCES)[number])
  )
    return c.json({ error: { code: "invalid_source" } }, 400);
  const where = source ? " WHERE source=?" : "",
    args = source ? [source] : [];
  const [quota, storage, counts, jobs, legacyCount, legacy, events] =
    await Promise.all([
      c.env.DB.prepare("SELECT * FROM malware_monthly_usage WHERE period=?")
        .bind(new Date().toISOString().slice(0, 7))
        .first(),
      c.env.DB.prepare(
        "SELECT held_bytes FROM malware_storage_budget WHERE id=1",
      ).first<{ held_bytes: number }>(),
      c.env.DB.prepare(
        "SELECT status,count(*) n FROM malware_scan_jobs" +
          where +
          " GROUP BY status",
      )
        .bind(...args)
        .all<{ status: string; n: number }>(),
      c.env.DB.prepare(
        "SELECT id,source,status,size_bytes,mime_type,sensitive,reason,attempts,quarantine_held,created_at,updated_at,provider_scan_id FROM malware_scan_jobs" +
          where +
          " ORDER BY updated_at DESC,id LIMIT 40",
      )
        .bind(...args)
        .all(),
      c.env.DB.prepare(
        "SELECT count(*) n FROM malware_object_verdicts WHERE scan_id IS NULL" +
          (source ? " AND source=?" : ""),
      )
        .bind(...args)
        .first<{ n: number }>(),
      c.env.DB.prepare(
        "SELECT id,source,bucket,size_bytes FROM malware_object_verdicts WHERE scan_id IS NULL" +
          (source ? " AND source=?" : "") +
          " ORDER BY registered_at,id LIMIT 30",
      )
        .bind(...args)
        .all(),
      c.env.DB.prepare(
        "SELECT id,scan_id,source,action,code,created_at FROM malware_audit_events" +
          where +
          " ORDER BY created_at DESC,id LIMIT 40",
      )
        .bind(...args)
        .all(),
    ]);
  return c.json({
    provider: "bouncer",
    storageVerified: c.env.BOUNCER_STORAGE_PRIVACY_VERIFIED === "true",
    configured: !!c.env.BOUNCER_API_KEY,
    enabled: c.env.BOUNCER_ENABLED === "true",
    sensitiveApproved: sensitiveApproved(c.env),
    complianceReasons: complianceReasons(c.env),
    quota,
    storageBytes: storage?.held_bytes || 0,
    counts: Object.fromEntries(counts.results.map((r) => [r.status, r.n])),
    jobs: jobs.results,
    legacyCount: legacyCount?.n || 0,
    legacy: legacy.results,
    events: events.results,
  });
});
// Writes require confirmation and stable intent keys. Keys bind to the exact body.
antivirusRouter.post(root + "/*", async (c, next) => {
  const parsed = await readJsonBodyUpTo(c.req.raw, 2048);
  if (!parsed.ok) return c.json({ error: { code: parsed.error } }, 400);
  const b = parsed.value as { confirmed?: boolean; sample?: string };
  if (
    !b ||
    typeof b !== "object" ||
    b.confirmed !== true ||
    Object.keys(b).some((k) => !["confirmed", "sample"].includes(k))
  )
    return c.json({ error: { code: "confirmation_required" } }, 400);
  const id = c.req.header("idempotency-key") || "";
  if (!/^[A-Za-z0-9_.:-]{16,128}$/.test(id))
    return c.json({ error: { code: "idempotency_key_required" } }, 400);
  const scope = `antivirus:${c.get("userId")}:${c.req.path}`,
    hash = await sha256(JSON.stringify(b));
  const previous = await c.env.DB.prepare(
    "SELECT request_hash FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
  )
    .bind(scope, id)
    .first<{ request_hash: string }>();
  if (previous && previous.request_hash !== hash)
    return c.json({ error: { code: "idempotency_key_reused" } }, 409);
  let first = false;
  if (!previous) {
    const inserted = await c.env.DB.prepare(
      "INSERT OR IGNORE INTO idempotency_keys(scope,idempotency_key,request_hash,response_json,created_at,expires_at) VALUES(?,?,?,'{}',?,?)",
    )
      .bind(scope, id, hash, Date.now(), Date.now() + 86400000)
      .run();
    first = !!inserted.meta.changes;
    const stored = await c.env.DB.prepare(
      "SELECT request_hash FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
    )
      .bind(scope, id)
      .first<{ request_hash: string }>();
    if (stored?.request_hash !== hash)
      return c.json({ error: { code: "idempotency_key_reused" } }, 409);
  }
  c.set("antivirusIntent", { first, body: b, key: id, scope });
  await next();
});
async function captureIntent(
  c: Context<AppBindings>,
  value: Record<string, unknown>,
) {
  const i = c.get("antivirusIntent");
  await c.env.DB.prepare(
    "UPDATE idempotency_keys SET response_json=? WHERE scope=? AND idempotency_key=? AND response_json='{}'",
  )
    .bind(JSON.stringify(value), i.scope, i.key)
    .run();
  const row = await c.env.DB.prepare(
    "SELECT response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?",
  )
    .bind(i.scope, i.key)
    .first<{ response_json: string }>();
  return JSON.parse(row?.response_json || "{}") as Record<string, unknown>;
}
antivirusRouter.post(root + "/usage/sync", async (c) => {
  try {
    await syncMalwareUsage(c.env);
    await malwareEvent(c.env, "system", "usage.synced", c.get("userId"));
    return c.json({ ok: true });
  } catch (e) {
    return antivirusFailure(c, {
      status: "blocked",
      code: e instanceof BouncerError ? e.code : "provider_unavailable",
    });
  }
});
antivirusRouter.post(root + "/test", async (c) => {
  const intent = c.get("antivirusIntent"),
    sample = intent.body.sample;
  if (!["clean", "eicar", "large_clean"].includes(sample || ""))
    return c.json({ error: { code: "invalid_sample" } }, 400);
  const text =
    sample === "eicar"
      ? "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
      : "AVYRON synthetic antivirus test. No personal or confidential data.\n";
  let bytes = new TextEncoder().encode(text);
  if (sample === "large_clean") {
    bytes = new Uint8Array(5_000_000);
    const pattern = new TextEncoder().encode(text);
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = pattern[i % pattern.length];
  }
  const result = await scanUpload(c.env, bytes, {
    source: "synthetic",
    scope: `${c.get("userId")}:${intent.key}`,
    mimeType: "text/plain",
    actorId: c.get("userId"),
  });
  if (result.status === "blocked") return antivirusFailure(c, result);
  return c.json({
    scanId: result.id,
    status: result.status,
    code: result.code || null,
    provider: "bouncer",
  });
});
antivirusRouter.post(root + "/jobs/:id/poll", async (c) => {
  const job = await pollMalwareJob(
    c.env,
    c.req.param("id") || "",
    c.get("userId"),
  );
  if (!job) return c.json({ error: { code: "not_found" } }, 404);
  return c.json({ scanId: job.id, status: job.status, code: job.reason });
});
antivirusRouter.post(root + "/jobs/:id/reconcile", async (c) => {
  try {
    const job = await reconcileMalwareJob(
      c.env,
      c.req.param("id") || "",
      c.get("userId"),
    );
    if (!job) return c.json({ error: { code: "not_found" } }, 404);
    return c.json({ scanId: job.id, status: job.status, code: job.reason });
  } catch (error) {
    return antivirusFailure(c, {
      status: "blocked",
      code: error instanceof BouncerError ? error.code : "history_unavailable",
    });
  }
});
antivirusRouter.post(root + "/jobs/:id/retry", async (c) => {
  const job = await scanJob(c.env, c.req.param("id") || "");
  if (!job) return c.json({ error: { code: "not_found" } }, 404);
  const intent = await captureIntent(c, { attempts: job.attempts });
  if (job.attempts > Number(intent.attempts))
    return c.json({ scanId: job.id, status: job.status });
  if (!["quarantined", "failed"].includes(job.status) || !job.quarantine_held)
    return c.json({ error: { code: "retry_forbidden" } }, 409);
  const block = scanningBlock(c.env, job.source);
  if (block) return antivirusFailure(c, { status: "blocked", code: block });
  const obj = await c.env.FILES.get(job.quarantine_key);
  if (!obj || obj.size !== job.size_bytes) {
    await obj?.body.cancel();
    return c.json({ error: { code: "quarantine_missing" } }, 404);
  }
  try {
    await malwareEvent(
      c.env,
      job.source,
      "scan.retry_confirmed",
      c.get("userId"),
      job.id,
    );
    const result = await submitMalwareJob(
      c.env,
      job.id,
      new Uint8Array(await obj.arrayBuffer()),
    );
    return c.json({ scanId: result?.id, status: result?.status });
  } catch (e) {
    return antivirusFailure(c, {
      status: "blocked",
      id: job.id,
      code: e instanceof BouncerError ? e.code : "provider_unavailable",
    });
  }
});
antivirusRouter.post(root + "/jobs/:id/purge", async (c) => {
  const job = await scanJob(c.env, c.req.param("id") || "");
  if (!job) return c.json({ error: { code: "not_found" } }, 404);
  try {
    await c.env.DB.prepare(
      "UPDATE malware_scan_jobs SET status=CASE WHEN revision=? AND status NOT IN('pending','submitting') THEN CASE WHEN status='clean' THEN 'clean' ELSE 'purging' END ELSE NULL END,reason=CASE WHEN status IN('malicious','suspicious') THEN 'purge_'||status ELSE reason END,revision=revision+1 WHERE id=?",
    )
      .bind(job.revision, job.id)
      .run();
  } catch {
    return c.json({ error: { code: "scan_in_progress_or_changed" } }, 409);
  }
  await releaseQuarantine(c.env, job);
  await c.env.DB.prepare(
    "UPDATE malware_scan_jobs SET status='purged',dedup_key=CASE WHEN reason IN('purge_malicious','purge_suspicious') THEN dedup_key ELSE dedup_key||':retired:'||id END,updated_at=? WHERE id=? AND status='purging'",
  )
    .bind(Date.now(), job.id)
    .run();
  await malwareEvent(
    c.env,
    job.source,
    "quarantine.purged",
    c.get("userId"),
    job.id,
  );

  return c.json({ ok: true });
});
antivirusRouter.post(root + "/legacy/:id/scan", async (c) => {
  const file = await c.env.DB.prepare(
    "SELECT * FROM malware_object_verdicts WHERE id=?",
  )
    .bind(c.req.param("id") || "")
    .first<{
      id: string;
      source: (typeof ANTIVIRUS_SOURCES)[number];
      bucket: "FILES" | "MEDIA";
      object_key: string;
      scan_id: string | null;
    }>();
  if (!file) return c.json({ error: { code: "not_found" } }, 404);
  if (!ANTIVIRUS_SOURCES.includes(file.source) || file.source === "synthetic")
    return c.json({ error: { code: "invalid_source" } }, 400);
  const block = scanningBlock(c.env, file.source);
  if (block) return antivirusFailure(c, { status: "blocked", code: block });
  const object = await c.env[file.bucket].get(file.object_key);
  if (!object) return c.json({ error: { code: "file_missing" } }, 404);
  if (object.size < 1 || object.size > 25_000_000) {
    await object.body.cancel();
    return antivirusFailure(c, { status: "blocked", code: "file_too_large" });
  }
  const intent = await captureIntent(c, { version: object.version });
  if (intent.version !== object.version) {
    await object.body.cancel();
    return c.json({ error: { code: "legacy_object_changed" } }, 409);
  }
  const bytes = new Uint8Array(await object.arrayBuffer());
  const checksum = await bytesHash(bytes);
  const nativeQueries: Record<string, string> = {
    documents:
      "SELECT sha256 FROM document_files WHERE object_key=? AND kind='import'",
    visual_assets: "SELECT sha256 FROM visual_assets WHERE object_key=?",
    finance: "SELECT sha256 FROM financial_documents WHERE r2_object_key=?",
    engine: "SELECT sha256 FROM engine_documents WHERE r2_object_key=?",
    products: "SELECT sha256 FROM product_versions WHERE r2_key=?",
  };
  const expected = nativeQueries[file.source]
    ? await c.env.DB.prepare(nativeQueries[file.source])
        .bind(file.object_key)
        .first<{ sha256: string }>()
    : null;
  if (
    expected &&
    /^[a-f0-9]{64}$/i.test(expected.sha256) &&
    expected.sha256.toLowerCase() !== checksum
  )
    return c.json({ error: { code: "legacy_integrity_failed" } }, 409);
  const scan = await scanUpload(c.env, bytes, {
    source: file.source,
    scope: `legacy:${file.id}`,
    mimeType: object.httpMetadata?.contentType || "application/octet-stream",
    actorId: c.get("userId"),
  });
  if (scan.status !== "clean") return antivirusFailure(c, scan);
  // The etag of exactly the scanned legacy bytes is bound; replacements stay blocked.
  await registerScannedObject(
    c.env,
    file.bucket,
    file.object_key,
    object,
    scan,
  );
  if (file.source === "documents")
    await c.env.DB.prepare(
      "UPDATE document_files SET scan_status='clean_scanned',scanner_reference=?,sha256=? WHERE object_key=? AND kind='import'",
    )
      .bind(scan.id, await bytesHash(bytes), file.object_key)
      .run();
  if (file.source === "visual_assets")
    await c.env.DB.prepare(
      "UPDATE visual_assets SET scan_status='clean' WHERE object_key=?",
    )
      .bind(file.object_key)
      .run();
  await malwareEvent(
    c.env,
    file.source,
    "legacy.verified",
    c.get("userId"),
    scan.id,
  );
  return c.json({ ok: true, scanId: scan.id, status: "clean" });
});
// Bounded inventory finds unlinked historical uploads too. It never reads file
// content, sends files, marks CLEAN or creates storage/service resources.
const inventorySources: Record<
  string,
  { bucket: "FILES" | "MEDIA"; prefix: string }
> = {
  documents: { bucket: "FILES", prefix: "documents/" },
  visual_assets: { bucket: "FILES", prefix: "visual-assets/" },
  project_media: { bucket: "FILES", prefix: "projects/" },
  survey: { bucket: "FILES", prefix: "surveys/" },
  finance: { bucket: "FILES", prefix: "finance/" },
  engine: { bucket: "FILES", prefix: "engine/" },
  contact: { bucket: "FILES", prefix: "leads/" },
  products: { bucket: "FILES", prefix: "products/" },
  blog: { bucket: "MEDIA", prefix: "blog/covers/" },
  avatar: { bucket: "MEDIA", prefix: "avatars/" },
};
antivirusRouter.post(root + "/inventory/:source", async (c) => {
  const source = c.req.param("source") || "",
    setting = inventorySources[source];
  if (!setting) return c.json({ error: { code: "invalid_source" } }, 400);
  const current = await c.env.DB.prepare(
    "SELECT cursor FROM malware_inventory_cursors WHERE source=?",
  )
    .bind(source)
    .first<{ cursor: string | null }>();
  const listing = await c.env[setting.bucket].list({
    prefix: setting.prefix,
    limit: 25,
    ...(current?.cursor ? { cursor: current.cursor } : {}),
  });
  const timestamp = Date.now();
  await c.env.DB.batch([
    ...listing.objects.map((o) =>
      c.env.DB.prepare(
        `INSERT INTO malware_object_verdicts(id,bucket,object_key,source,r2_version,size_bytes,registered_at)
    SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM document_files WHERE object_key=? AND kind IN('pdf','docx') AND scan_status='clean_generated')
    ON CONFLICT(bucket,object_key) DO UPDATE SET scan_id=CASE WHEN malware_object_verdicts.r2_version IS NOT excluded.r2_version THEN NULL ELSE malware_object_verdicts.scan_id END,
    etag=CASE WHEN malware_object_verdicts.r2_version IS NOT excluded.r2_version THEN NULL ELSE malware_object_verdicts.etag END,
    r2_version=excluded.r2_version,size_bytes=excluded.size_bytes`,
      ).bind(
        crypto.randomUUID(),
        setting.bucket,
        o.key,
        source,
        o.version,
        o.size,
        timestamp,
        o.key,
      ),
    ),
    c.env.DB.prepare(
      "INSERT INTO malware_inventory_cursors(source,cursor,updated_at) VALUES(?,?,?) ON CONFLICT(source) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at",
    ).bind(source, listing.truncated ? listing.cursor : null, timestamp),
  ]);
  await malwareEvent(c.env, source, "inventory.refreshed", c.get("userId"));
  return c.json({
    ok: true,
    observed: listing.objects.length,
    more: listing.truncated,
  });
});
