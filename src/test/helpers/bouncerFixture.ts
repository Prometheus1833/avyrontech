/** External Bouncer contract fixture only. It never replaces the AVYRON quota, policy or read gates. */
import { vi } from "vitest";
import type { Env } from "../../../cloudflare/workers/api/src/types";
import { bytesHash } from "../../../cloudflare/workers/api/src/malware";
export const fixtureScannerSettings = {
  BOUNCER_API_KEY: "bnc_live_synthetic_fixture_never_real",
  BOUNCER_ENABLED: "true",
  BOUNCER_STORAGE_PRIVACY_VERIFIED: "true",
  BOUNCER_SENSITIVE_PROCESSING_APPROVED: "true",
  BOUNCER_DPA_REFERENCE: "synthetic-fixture-dpa",
  BOUNCER_TRANSFER_REVIEW_REFERENCE: "synthetic-fixture-transfer",
};
export type FixtureVerdict =
  | "clean"
  | "malicious"
  | "suspicious"
  | "pending"
  | "failed"
  | "hash_mismatch"
  | "contradiction";
export function bouncerFixture(initial: FixtureVerdict = "clean") {
  let verdict = initial,
    used = 0,
    creates = 0,
    uploads = 0,
    gets = 0;
  const scans = new Map<
    string,
    { sha256: string; size: number; name: string }
  >();
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin === "https://api.usebouncer.dev") {
        if (init?.headers && !new Headers(init.headers).get("X-API-Key"))
          throw new Error("missing fixture auth");
        if (url.pathname === "/v1/scan/usage") {
          const d = new Date();
          return Response.json({
            status: "success",
            data: {
              period: d.toISOString().slice(0, 7),
              scans_used: used,
              scans_limit: 500,
              tier: "free",
              resets_at: new Date(
                Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1),
              ).toISOString(),
            },
          });
        }
        if (url.pathname === "/v1/scan")
          return Response.json({
            status: "success",
            data: [...scans].map(([scan_id, s]) => ({
              scan_id,
              status: s.sha256 ? "completed" : "pending",
              file: { name: s.name, size: s.size, sha256: s.sha256 },
            })),
            meta: { next_cursor: null },
          });
        if (url.pathname === "/v2/scan" && init?.method === "POST") {
          creates++;
          used++;
          const id = "scan_" + crypto.randomUUID().replace(/-/g, "");
          const b = JSON.parse(String(init.body));
          scans.set(id, { sha256: "", size: 0, name: b.file_name });
          return Response.json(
            {
              status: "success",
              data: {
                scan_id: id,
                status: "pending",
                upload: {
                  url: "https://bouncer-dev-uploads-fixture.s3.ap-south-1.amazonaws.com/",
                  fields: {
                    key: id,
                    policy: "fixture-only",
                    "x-amz-signature": "fixture-not-a-secret",
                  },
                },
                max_file_size: 26214400,
              },
            },
            { status: 201 },
          );
        }
        if (url.pathname.startsWith("/v2/scan/")) {
          gets++;
          const id = url.pathname.split("/").pop()!,
            s = scans.get(id);
          if (!s) return Response.json({ status: "error" }, { status: 404 });
          const status =
            !s.sha256 || verdict === "pending"
              ? "pending"
              : verdict === "failed"
                ? "failed"
                : "completed";
          return Response.json({
            status: "success",
            data: {
              scan_id: id,
              status,
              verdict: ["malicious", "suspicious"].includes(verdict)
                ? verdict
                : "clean",
              file: {
                sha256: verdict === "hash_mismatch" ? "0".repeat(64) : s.sha256,
                size: s.size,
              },
              threats: verdict === "contradiction" ? [{ name: "fixture" }] : [],
              engines: {
                signature: {
                  result:
                    verdict === "contradiction"
                      ? "malicious"
                      : verdict === "malicious"
                        ? "malicious"
                        : "clean",
                },
                pattern: {
                  result: verdict === "suspicious" ? "suspicious" : "clean",
                },
              },
            },
          });
        }
      }
      if (
        url.hostname ===
        "bouncer-dev-uploads-fixture.s3.ap-south-1.amazonaws.com"
      ) {
        uploads++;
        const form = init?.body as FormData,
          file = form.get("file") as File,
          id = String(form.get("key"));
        const bytes = new Uint8Array(await file.arrayBuffer());
        const scan = scans.get(id)!;
        scan.sha256 = await bytesHash(bytes);
        scan.size = bytes.length;
        return new Response(null, { status: 204 });
      }
      throw new Error("Unexpected external destination in Bouncer fixture");
    },
  );
  vi.stubGlobal("fetch", fetcher);
  return {
    fetcher,
    scans,
    setVerdict(v: FixtureVerdict) {
      verdict = v;
    },
    setUsed(n: number) {
      used = n;
    },
    get creates() {
      return creates;
    },
    get uploads() {
      return uploads;
    },
    get gets() {
      return gets;
    },
  };
}
/** Minimal versioned R2 fixture; every replacement has a new immutable version. */
export function malwareBucket() {
  const data = new Map<string, Uint8Array>();
  const meta = new Map<
    string,
    {
      etag: string;
      version: string;
      httpMetadata: R2HTTPMetadata;
      customMetadata: Record<string, string>;
    }
  >();
  let failPut = false,
    failDelete = false;
  const object = (key: string) => {
    const bytes = data.get(key),
      m = meta.get(key);
    if (!bytes) return null;
    return {
      key,
      etag: m?.etag || "unregistered",
      version: m?.version || "unregistered",
      httpEtag: '"' + (m?.etag || "unregistered") + '"',
      size: bytes.length,
      uploaded: new Date(),
      httpMetadata: m?.httpMetadata || {},
      customMetadata: m?.customMetadata || {},
      body: new Blob([Uint8Array.from(bytes).buffer]).stream(),
      arrayBuffer: async () => Uint8Array.from(bytes).buffer,
      text: async () => new TextDecoder().decode(bytes),
      writeHttpMetadata: (headers: Headers) => {
        if (m?.httpMetadata.contentType)
          headers.set("content-type", m.httpMetadata.contentType);
      },
    };
  };
  return {
    data,
    meta,
    get failPut() {
      return failPut;
    },
    set failPut(v: boolean) {
      failPut = v;
    },
    get failDelete() {
      return failDelete;
    },
    set failDelete(v: boolean) {
      failDelete = v;
    },
    async put(
      key: string,
      value: Uint8Array | ArrayBuffer | string,
      options?: R2PutOptions,
    ) {
      if (failPut) throw new Error("fixture R2 put failed");
      const bytes =
        typeof value === "string"
          ? new TextEncoder().encode(value)
          : value instanceof Uint8Array
            ? Uint8Array.from(value)
            : new Uint8Array(value);
      data.set(key, bytes);
      meta.set(key, {
        etag: await bytesHash(bytes),
        version: crypto.randomUUID(),
        httpMetadata: (options?.httpMetadata || {}) as R2HTTPMetadata,
        customMetadata: options?.customMetadata || {},
      });
      return object(key)!;
    },
    async get(key: string) {
      return object(key);
    },
    async head(key: string) {
      return object(key);
    },
    async list(options?: { prefix?: string; limit?: number; cursor?: string }) {
      const keys = [...data.keys()]
        .filter((k) => k.startsWith(options?.prefix || ""))
        .sort();
      const offset = Number(options?.cursor || 0),
        limit = options?.limit || 25,
        selected = keys.slice(offset, offset + limit);
      return {
        objects: selected.map((k) => object(k)!),
        truncated: offset + limit < keys.length,
        cursor: String(offset + limit),
        delimitedPrefixes: [],
      };
    },
    async delete(key: string) {
      if (failDelete) throw new Error("fixture R2 delete failed");
      data.delete(key);
      meta.delete(key);
    },
  };
}
export function configureFixture(env: Env) {
  Object.assign(env, fixtureScannerSettings);
  return bouncerFixture();
}
