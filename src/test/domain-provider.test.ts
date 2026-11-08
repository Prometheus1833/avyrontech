import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { domainRouter } from "../../cloudflare/workers/api/src/domain";
import type { AppBindings } from "../../cloudflare/workers/api/src/types";
// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  queryDomainProvider,
  domainProviderStatus,
} from "../../cloudflare/workers/api/src/domainProvider";
import { lookupDomain } from "../../cloudflare/workers/api/src/domain";
import type { Env } from "../../cloudflare/workers/api/src/types";
let db: DatabaseSync,
  env: Env,
  kv: Map<string, string>,
  cache: Map<string, Response>,
  calls: { url: string; body: Record<string, unknown> }[],
  status: string,
  domainOverride: string | undefined,
  premium: boolean,
  fail: number,
  auths: number;
class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly sql: string) {}
  bind(...v: SQLInputValue[]) {
    this.values = v;
    return this;
  }
  async run() {
    return { meta: db.prepare(this.sql).run(...this.values) };
  }
  async first() {
    return db.prepare(this.sql).get(...this.values) || null;
  }
}
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE rate_limit_counters(scope_key TEXT,window_start INTEGER,count INTEGER,expires_at INTEGER,PRIMARY KEY(scope_key,window_start))",
  );
  db.exec(
    readFileSync("cloudflare/d1/migrations/0055_public_flow_sync.sql", "utf8"),
  );
  db.exec(
    readFileSync(
      "cloudflare/d1/migrations/0109_domain_registrar_source.sql",
      "utf8",
    ),
  );
  kv = new Map();
  cache = new Map();
  calls = [];
  status = "free";
  domainOverride = undefined;
  premium = false;
  fail = 0;
  auths = 0;
  env = {
    DOMAIN_OPENPROVIDER_ENABLED: "true",
    PUBLIC_API_RATE_LIMITER: { limit: async () => ({ success: true }) },
    OPENPROVIDER_USERNAME: "synthetic-user",
    OPENPROVIDER_PASSWORD: "synthetic-password",
    MFA_ENCRYPTION_KEY: "synthetic-key-for-unit-validation-12345",
    DB: { prepare: (q: string) => new Statement(q) },
    KV: {
      get: async (k: string) => kv.get(k) || null,
      put: async (k: string, v: string) => {
        kv.set(k, v);
      },
    },
  } as unknown as Env;
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (r: Request) => cache.get(r.url)?.clone(),
      put: async (r: Request, response: Response) => {
        cache.set(r.url, response.clone());
      },
    }),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input),
        body = JSON.parse(String(init?.body || "{}"));
      calls.push({ url, body });
      if (url === "https://api.openprovider.eu/v1/auth/login") {
        auths++;
        return Response.json({
          code: 0,
          data: { token: "synthetic-token-" + auths },
        });
      }
      if (url === "https://api.openprovider.eu/v1/domains/check") {
        if (fail) {
          const code = fail;
          fail = 0;
          return Response.json(
            { desc: "Never expose synthetic-password" },
            { status: code },
          );
        }
        const item = body.domains[0];
        return Response.json({
          code: 0,
          data: {
            results: [
              {
                domain: domainOverride || item.name + "." + item.extension,
                status,
                is_premium: premium,
                whois: "synthetic-private-field",
                price: { value: 999 },
              },
            ],
          },
        });
      }
      if (url === "https://data.iana.org/rdap/dns.json")
        return Response.json({ services: [] });
      if (url.startsWith("https://cloudflare-dns.com/dns-query"))
        return Response.json({ Status: 3 });
      throw new Error("Unexpected upstream");
    }),
  );
});
afterEach(() => {
  db.close();
  vi.unstubAllGlobals();
});
it("uses only authenticated availability endpoints and encrypts cached credentials", async () => {
  const result = await queryDomainProvider(env, "atelier-test.ro");
  expect(result.status).toBe("available");
  expect(result.source).toBe("openprovider");
  expect(JSON.stringify(result)).not.toContain("synthetic-private");
  expect(JSON.stringify([...kv.values()])).not.toContain("synthetic-token");
  expect(JSON.stringify([...kv.values()])).not.toContain("synthetic-password");
  expect(calls[1]).toEqual({
    url: "https://api.openprovider.eu/v1/domains/check",
    body: {
      domains: [{ name: "atelier-test", extension: "ro" }],
      with_price: false,
    },
  });
  await queryDomainProvider(env, "alt-atelier.ro");
  expect(auths).toBe(1);
  expect(
    calls.every(
      (c) => c.url.endsWith("/auth/login") || c.url.endsWith("/domains/check"),
    ),
  ).toBe(true);
});
it("caches confirmed availability with the original check time and maps active registration", async () => {
  const one = await queryDomainProvider(env, "atelier-test.ro");
  const two = await queryDomainProvider(env, "atelier-test.ro");
  expect(two).toEqual({ ...one, cached: true });
  expect(calls.filter((c) => c.url.endsWith("/domains/check"))).toHaveLength(1);
  status = "active";
  expect(
    (await queryDomainProvider(env, "exemplu-inregistrat.ro")).status,
  ).toBe("registered");
});
it("does not query when disabled and never infers free registration from NXDOMAIN", async () => {
  env.DOMAIN_OPENPROVIDER_ENABLED = "false";
  expect(domainProviderStatus(env).configured).toBe(false);
  await expect(queryDomainProvider(env, "atelier-test.ro")).rejects.toThrow(
    "provider_unconfigured",
  );
  expect(calls).toHaveLength(0);
  expect(await lookupDomain("atelier-test.ro", env)).toMatchObject({
    status: "unknown",
    reason: "provider_unconfigured",
  });
});
it("rejects mismatched, reserved and premium results rather than claiming availability", async () => {
  domainOverride = "other-customer.ro";
  await expect(queryDomainProvider(env, "atelier-test.ro")).rejects.toThrow(
    "provider_domain_mismatch",
  );
  domainOverride = undefined;
  status = "reserved";
  await expect(queryDomainProvider(env, "atelier-test.ro")).rejects.toThrow(
    "provider_status_unconfirmed",
  );
  status = "free";
  premium = true;
  await expect(queryDomainProvider(env, "atelier-test.ro")).rejects.toThrow(
    "provider_terms_required",
  );
  expect(cache.size).toBe(0);
});
it("refreshes an expired provider session once and hides provider error bodies", async () => {
  await queryDomainProvider(env, "atelier-test.ro");
  fail = 401;
  await queryDomainProvider(env, "second-test.ro");
  expect(auths).toBe(2);
  fail = 500;
  await expect(queryDomainProvider(env, "third-test.ro")).rejects.toThrow(
    "provider_unavailable",
  );
});
it("blocks malformed names and throttles upstream calls across users before any network request", async () => {
  await expect(
    queryDomainProvider(env, "test.ro\r\nsecond.ro"),
  ).rejects.toThrow("invalid_domain");
  expect(calls).toHaveLength(0);
  const start = Math.floor(Date.now() / 60000) * 60;
  db.prepare("INSERT INTO rate_limit_counters VALUES(?,?,30,?)").run(
    "rate:v1:domain-provider:lookup",
    start,
    start + 3600,
  );
  await expect(queryDomainProvider(env, "atelier-test.ro")).rejects.toThrow(
    "provider_rate_limited",
  );
  expect(calls).toHaveLength(0);
});

it("records a real adapter verdict in the existing public history schema", async () => {
  const app = new Hono<AppBindings>();
  app.route("/", domainRouter);
  const response = await app.request(
    "https://avyron.test/api/public/domain-check",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "192.0.2.40",
      },
      body: JSON.stringify({
        domain: "atelier-api.ro",
        language: "ro",
        surface: "landing",
      }),
    },
    env,
  );
  expect(response.status).toBe(201);
  expect((await response.json()).source).toBe("openprovider");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(
    db.prepare("SELECT domain,status,source FROM public_domain_checks").get(),
  ).toMatchObject({
    domain: "atelier-api.ro",
    status: "available",
    source: "openprovider",
  });
});

it("rejects malformed provider payloads before accepting a verdict", async () => {
  for (const data of [null, [], "free"]) {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ code: 0, data }));
    await expect(
      queryDomainProvider(env, "atelier-malformed.ro"),
    ).rejects.toThrow("provider_invalid_response");
  }
  expect(cache.size).toBe(0);
});
