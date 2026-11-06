/** The sole malware provider. No configurable endpoint, SDK, webhook or fallback verdict. */
const API = "https://api.usebouncer.dev";
export class BouncerError extends Error {
  constructor(
    readonly code: string,
    readonly uncertain = false,
    readonly scanId?: string,
  ) {
    super(code);
    this.name = "BouncerError";
  }
}
export type BouncerUsage = {
  period: string;
  scans_used: number;
  scans_limit: number;
  tier: "free";
  resets_at: string;
};
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
async function json(response: Response): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new BouncerError("invalid_response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > 65536) {
        await reader.cancel();
        throw new BouncerError("invalid_response");
      }
      chunks.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const b of chunks) {
    bytes.set(b, offset);
    offset += b.length;
  }
  try {
    const parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (record(parsed)) return parsed;
  } catch {
    /* Never log the provider body or signed fields. */
  }
  throw new BouncerError("invalid_response");
}
async function request(
  key: string,
  path: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
) {
  let res: Response;
  try {
    res = await fetcher(API + path, {
      ...init,
      headers: {
        "X-API-Key": key,
        accept: "application/json",
        ...init.headers,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new BouncerError("provider_unavailable", init.method === "POST");
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new BouncerError(
      res.status === 429
        ? "quota_exceeded"
        : res.status === 401 || res.status === 403
          ? "provider_unauthorized"
          : res.status === 404
            ? "scan_not_found"
            : "provider_unavailable",
      init.method === "POST" && res.status >= 500,
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await json(res);
  } catch {
    throw new BouncerError("invalid_response", init.method === "POST");
  }
  if (body.status !== "success" || !record(body.data))
    throw new BouncerError("invalid_response", init.method === "POST");
  return body.data;
}
export async function bouncerUsage(
  key: string,
  fetcher: typeof fetch = fetch,
): Promise<BouncerUsage> {
  const d = await request(key, "/v1/scan/usage", {}, fetcher);
  const time = new Date(),
    period = time.toISOString().slice(0, 7),
    next = Date.UTC(time.getUTCFullYear(), time.getUTCMonth() + 1, 1);
  if (d.tier !== "free") throw new BouncerError("free_plan_required");
  if (
    d.period !== period ||
    !Number.isSafeInteger(d.scans_used) ||
    !Number.isSafeInteger(d.scans_limit) ||
    Number(d.scans_limit) < 1 ||
    Number(d.scans_limit) > 500 ||
    Number(d.scans_used) < 0 ||
    Number(d.scans_used) > Number(d.scans_limit) ||
    typeof d.resets_at !== "string" ||
    Date.parse(d.resets_at) !== next
  )
    throw new BouncerError("invalid_usage");
  return d as BouncerUsage;
}
export function safeBouncerUploadUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.search &&
      !u.hash &&
      u.pathname === "/" &&
      /^bouncer-[a-z0-9-]+\.s3(?:[.-]ap-south-1)?\.amazonaws\.com$/.test(
        u.hostname,
      )
    );
  } catch {
    return false;
  }
}
const validId = (id: unknown): id is string =>
  typeof id === "string" && /^scan_[A-Za-z0-9_-]{6,120}$/.test(id);
export async function createBouncerScan(
  key: string,
  name: string,
  mime: string,
  fetcher: typeof fetch = fetch,
) {
  const d = await request(
    key,
    "/v2/scan",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file_name: name, mime_type: mime }),
    },
    fetcher,
  );
  if (
    !validId(d.scan_id) ||
    !record(d.upload) ||
    !safeBouncerUploadUrl(d.upload.url) ||
    !record(d.upload.fields) ||
    !Number.isSafeInteger(d.max_file_size) ||
    Number(d.max_file_size) < 1 ||
    Number(d.max_file_size) > 26214400
  )
    throw new BouncerError(
      "invalid_upload_target",
      true,
      validId(d.scan_id) ? d.scan_id : undefined,
    );
  const entries = Object.entries(d.upload.fields);
  if (
    entries.length < 1 ||
    entries.length > 30 ||
    entries.some(
      ([k, v]) =>
        !/^[A-Za-z0-9_.-]{1,100}$/.test(k) ||
        ["file", "success_action_redirect"].includes(k.toLowerCase()) ||
        typeof v !== "string" ||
        v.length > 16384,
    )
  )
    throw new BouncerError(
      "invalid_upload_target",
      true,
      validId(d.scan_id) ? d.scan_id : undefined,
    );
  return {
    id: d.scan_id,
    url: d.upload.url,
    fields: d.upload.fields as Record<string, string>,
    maxBytes: Number(d.max_file_size),
  };
}
export async function uploadBouncerFile(
  target: Awaited<ReturnType<typeof createBouncerScan>>,
  bytes: Uint8Array,
  mime: string,
  name: string,
  fetcher: typeof fetch = fetch,
) {
  if (bytes.length > target.maxBytes) throw new BouncerError("file_too_large");
  const form = new FormData();
  for (const [k, v] of Object.entries(target.fields)) form.append(k, v);
  form.append(
    "file",
    new Blob([Uint8Array.from(bytes).buffer], { type: mime }),
    name,
  );
  let r: Response;
  try {
    r = await fetcher(target.url, {
      method: "POST",
      body: form,
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new BouncerError("upload_uncertain", true);
  }
  await r.body?.cancel().catch(() => {});
  if (![200, 201, 204].includes(r.status))
    throw new BouncerError("upload_failed", true);
}
export async function bouncerResult(
  key: string,
  id: string,
  sha256: string,
  size: number,
  fetcher: typeof fetch = fetch,
) {
  if (!validId(id)) throw new BouncerError("invalid_scan_id");
  const d = await request(
    key,
    `/v2/scan/${encodeURIComponent(id)}`,
    {},
    fetcher,
  );
  if (
    d.scan_id !== id ||
    !["pending", "scanning", "completed", "failed"].includes(String(d.status))
  )
    throw new BouncerError("invalid_result");
  if (d.status === "failed") return "failed" as const;
  if (d.status !== "completed") return "pending" as const;
  if (
    !record(d.file) ||
    d.file.size !== size ||
    typeof d.file.sha256 !== "string" ||
    d.file.sha256.toLowerCase() !== sha256
  )
    throw new BouncerError("hash_mismatch");
  if (!["clean", "malicious", "suspicious"].includes(String(d.verdict)))
    throw new BouncerError("invalid_verdict");
  if (d.verdict === "clean") {
    if (
      !Array.isArray(d.threats) ||
      d.threats.length !== 0 ||
      !record(d.engines) ||
      Object.keys(d.engines).length === 0 ||
      Object.values(d.engines).some((e) => !record(e) || e.result !== "clean")
    )
      throw new BouncerError("contradictory_verdict");
    return "clean" as const;
  }
  return d.verdict as "malicious" | "suspicious";
}
/** Read-only reconciliation of a lost create response. Never creates another scan. */
export async function findBouncerScan(
  key: string,
  fileName: string,
  hash: string,
  size: number,
  fetcher: typeof fetch = fetch,
) {
  let cursor: string | undefined;
  const matches = new Set<string>();
  for (let page = 0; page < 5; page++) {
    const query = new URLSearchParams({
      limit: "20",
      ...(cursor ? { cursor } : {}),
    });
    let response: Response;
    try {
      response = await fetcher(API + "/v1/scan?" + query, {
        headers: { "X-API-Key": key, accept: "application/json" },
        redirect: "manual",
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new BouncerError("history_unavailable");
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new BouncerError("history_unavailable");
    }
    const body = await json(response);
    if (body.status !== "success" || !Array.isArray(body.data))
      throw new BouncerError("invalid_history");
    for (const entry of body.data) {
      if (
        !record(entry) ||
        !validId(entry.scan_id) ||
        !record(entry.file) ||
        entry.file.name !== fileName
      )
        continue;
      if (
        entry.status === "completed" &&
        (entry.file.sha256 !== hash || entry.file.size !== size)
      )
        continue;
      if (
        typeof entry.file.sha256 === "string" &&
        entry.file.sha256 &&
        entry.file.sha256 !== hash
      )
        continue;
      if (
        typeof entry.file.size === "number" &&
        entry.file.size > 0 &&
        entry.file.size !== size
      )
        continue;
      matches.add(entry.scan_id);
    }
    if (!record(body.meta) || !body.meta.next_cursor) break;
    if (
      typeof body.meta.next_cursor !== "string" ||
      body.meta.next_cursor.length > 2048
    )
      throw new BouncerError("invalid_history");
    cursor = body.meta.next_cursor;
  }
  if (matches.size > 1) throw new BouncerError("history_ambiguous");
  return [...matches][0] || null;
}
