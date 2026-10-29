// @vitest-environment node
import { createRequire } from "node:module";
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { domainRouter, lookupDomain, normalizeDomain } from "../../cloudflare/workers/api/src/domain";
import { logoStudioRouter } from "../../cloudflare/workers/api/src/logoStudio";
import { runAiCore } from "../../cloudflare/workers/api/src/aiCore";
import { cleanBrief, localConcepts } from "../data/logoStudio";
import { readJsonBodyUpTo } from "../../cloudflare/workers/api/src/requestBody";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";

vi.mock("../../cloudflare/workers/api/src/aiCore", () => ({ runAiCore: vi.fn() }));

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
const executionCtx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as ExecutionContext;

class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly db: SqliteDatabase, readonly sql: string) {}
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.values) ?? null) as T | null; }
  async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}

const request = (app: Hono<AppBindings>, env: Env, path: string, init: RequestInit = {}) =>
  app.request(`https://avyron.test${path}`, init, env, executionCtx);

describe("public cost and abuse boundaries", () => {
  let db: SqliteDatabase;
  let env: Env;
  let app: Hono<AppBindings>;
  let edgeKeys: string[];

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(`CREATE TABLE rate_limit_counters(scope_key TEXT NOT NULL, window_start INTEGER NOT NULL,
      count INTEGER NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY(scope_key,window_start));
      CREATE TABLE public_domain_checks(id TEXT PRIMARY KEY, domain TEXT NOT NULL, status TEXT NOT NULL,
      source TEXT NOT NULL, language TEXT NOT NULL, surface TEXT NOT NULL, created_at INTEGER NOT NULL);`);
    edgeKeys = [];
    env = {
      DB: { prepare: (sql: string) => new Statement(db, sql) },
      PUBLIC_API_RATE_LIMITER: { limit: async ({ key }: { key: string }) => { edgeKeys.push(key); return { success: true }; } },
      AI: { run: async () => ({}) },
    } as unknown as Env;
    app = new Hono<AppBindings>();
    app.use("/api/logo-studio/generate", async (c, next) => {
      const userId = c.req.header("x-test-user");
      if (userId) c.set("userId", userId);
      await next();
    });
    app.route("/", domainRouter);
    app.route("/", logoStudioRouter);
    const brief = cleanBrief({ name: "Synthetic Brand", industry: "tech", style: "modern" })!;
    vi.mocked(runAiCore).mockResolvedValue({ output: { response: { concepts: localConcepts(brief, 4) } } } as Awaited<ReturnType<typeof runAiCore>>);
  });

  afterEach(() => { db.close(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

  const logo = (user = "user-1", body: string = JSON.stringify({ brief: { name: "Synthetic Brand" } })) => ({
    method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.10", "x-test-user": user }, body,
  });

  it("reserves each actual logo model call separately, then rejects the eleventh call by the same user", async () => {
    for (let i = 0; i < 10; i += 1) {
      const response = await request(app, env, "/api/logo-studio/generate", logo());
      expect(response.status).toBe(200);
    }
    const keys = vi.mocked(runAiCore).mock.calls.map(([input]) => input.idempotencyKey);
    expect(new Set(keys).size).toBe(10);
    const blocked = await request(app, env, "/api/logo-studio/generate", logo());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(runAiCore).toHaveBeenCalledTimes(10);
    expect((await request(app, env, "/api/logo-studio/generate", logo("user-2"))).status).toBe(200);
    expect(edgeKeys.every((key) => !key.includes("192.0.2.10"))).toBe(true);
  });

  it("rejects an oversized logo body before invoking AI, and requires an authenticated user", async () => {
    expect((await request(app, env, "/api/logo-studio/generate", logo("user-1", `{"brief":{"name":"${"a".repeat(17_000)}"}}`))).status).toBe(413);
    expect((await request(app, env, "/api/logo-studio/orders", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ padding: "a".repeat(33_000) }),
    })).status).toBe(413);
    expect((await request(app, env, "/api/logo-studio/generate", logo(""))).status).toBe(401);
    expect(runAiCore).not.toHaveBeenCalled();
  });

  it("applies the global logo budget across users", async () => {
    (env as Env & { LOGO_STUDIO_DAILY_CAP: string }).LOGO_STUDIO_DAILY_CAP = "1";
    expect((await request(app, env, "/api/logo-studio/generate", logo("user-1"))).status).toBe(200);
    expect((await request(app, env, "/api/logo-studio/generate", logo("user-2"))).status).toBe(429);
    expect(runAiCore).toHaveBeenCalledTimes(1);
  });

  it("counts streamed bytes even when Content-Length understates the body", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode(JSON.stringify({ padding: "x".repeat(3_000) }))); controller.close(); },
    });
    const parsed = await readJsonBodyUpTo(new Request("https://avyron.test/test", {
      method: "POST", headers: { "content-length": "2" }, body, duplex: "half",
    } as RequestInit), 2_048);
    expect(parsed).toEqual({ ok: false, error: "payload_too_large" });
  });

  it("shares one exact D1 quota and edge key across domain GET and POST", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://data.iana.org/rdap/dns.json") return Response.json({ services: [[['com'], ['https://rdap.registry.test/']]] });
      if (url.startsWith("https://rdap.registry.test/domain/")) return Response.json({ objectClassName: "domain" });
      throw new Error(`Unexpected test upstream: ${url}`);
    }));
    const get = () => request(app, env, "/api/public/domain-check?domain=sample.com", { headers: { "cf-connecting-ip": "192.0.2.20" } });
    const post = () => request(app, env, "/api/public/domain-check", {
      method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.20" },
      body: JSON.stringify({ domain: "sample.com", surface: "test" }),
    });
    for (let i = 0; i < 30; i += 1) expect((await get()).status).toBe(200);
    for (let i = 0; i < 30; i += 1) expect((await post()).status).toBe(201);
    expect((await get()).status).toBe(429);
    expect((await post()).status).toBe(429);
    expect(new Set(edgeKeys.filter((key) => key.startsWith("domain-check:"))).size).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS n FROM public_domain_checks").get()).toMatchObject({ n: 30 });
  });

  it("rejects oversized domain JSON before lookup, and invalid URL suffixes", async () => {
    const response = await request(app, env, "/api/public/domain-check", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain: "sample.com", padding: "x".repeat(3_000) }),
    });
    expect(response.status).toBe(413);
    expect(normalizeDomain("sample.com?probe=1")).toBeNull();
    expect(normalizeDomain("sample.com#fragment")).toBeNull();
    expect(normalizeDomain("sample.com")).toBe("sample.com");
  });

  it("does not follow an RDAP redirect to a private target or call it available", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); seen.push(url);
      if (url === "https://data.iana.org/rdap/dns.json") return Response.json({ services: [[['com'], ['https://rdap.registry.test/']]] });
      if (url.startsWith("https://rdap.registry.test/domain/")) return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } });
      if (url.startsWith("https://cloudflare-dns.com/dns-query")) return Response.json({ Status: 3 });
      throw new Error(`Unexpected test upstream: ${url}`);
    }));
    expect(await lookupDomain("redirect-check.com")).toMatchObject({ status: "unknown" });
    expect(seen.some((url) => url.includes("127.0.0.1"))).toBe(false);
  });

  it("bounds an oversized upstream DNS response and keeps the result unknown", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://data.iana.org/rdap/dns.json") return Response.json({ services: [] });
      if (url.startsWith("https://cloudflare-dns.com/dns-query")) return Response.json({ Status: 3, padding: "x".repeat(17_000) });
      throw new Error(`Unexpected test upstream: ${url}`);
    }));
    expect(await lookupDomain("oversize.ro")).toEqual({ status: "unknown", source: "unavailable" });
  });

  it.skipIf(process.env.AVYRON_BENCH_PUBLIC_LIMITS !== "1")("reports synthetic local route latency and counter cost", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://data.iana.org/rdap/dns.json") return Response.json({ services: [[['com'], ['https://rdap.registry.test/']]] });
      if (url.startsWith("https://rdap.registry.test/domain/")) return Response.json({ objectClassName: "domain" });
      throw new Error(`Unexpected test upstream: ${url}`);
    }));
    const samples: Record<string, number[]> = { directRdap: [], domainGet: [], domainPost: [], logoGenerate: [] };
    const timed = async (label: keyof typeof samples, action: () => Promise<unknown>) => {
      const start = performance.now();
      await action();
      samples[label].push(performance.now() - start);
    };
    for (let i = 0; i < 120; i += 1) {
      await timed("directRdap", () => lookupDomain("sample.com"));
      await timed("domainGet", async () => {
        const response = await request(app, env, "/api/public/domain-check?domain=sample.com", { headers: { "cf-connecting-ip": `192.0.2.${i % 200 + 1}` } });
        expect(response.status).toBe(200);
      });
      await timed("domainPost", async () => {
        const response = await request(app, env, "/api/public/domain-check", {
          method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": `198.51.100.${i % 200 + 1}` },
          body: JSON.stringify({ domain: "sample.com" }),
        });
        expect(response.status).toBe(201);
      });
      await timed("logoGenerate", async () => {
        const response = await request(app, env, "/api/logo-studio/generate", {
          ...logo(`bench-user-${i}`), headers: { ...logo().headers, "x-test-user": `bench-user-${i}`, "cf-connecting-ip": `203.0.113.${i % 200 + 1}` },
        });
        expect(response.status).toBe(200);
      });
    }
    const percentile = (values: number[], p: number) => {
      const sorted = values.slice(20).sort((a, b) => a - b);
      return Number(sorted[Math.floor((sorted.length - 1) * p)].toFixed(3));
    };
    const timings = Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, {
      p50Ms: percentile(values, 0.5), p95Ms: percentile(values, 0.95), samples: values.length - 20,
    }]));
    const counterWrites = db.prepare("SELECT SUM(count) AS n FROM rate_limit_counters").get() as { n: number };
    process.stdout.write(`PUBLIC_LIMIT_BENCH ${JSON.stringify({ timings, exactCounterWrites: counterWrites.n, domainRows: 120 })}\n`);
  });
});
