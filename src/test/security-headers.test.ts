// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { beforeEach, afterEach, it, expect } from "vitest";
import { securityReportsRouter } from "../../cloudflare/workers/api/src/securityReports";
import { applicationHostResponse } from "../worker/applicationHost";
import { htmlSecurityHeaders } from "../worker/securityHeaders";
import type { Env } from "../../cloudflare/workers/api/src/types";
let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE rate_limit_counters(scope_key TEXT,window_start INTEGER,count INTEGER,expires_at INTEGER,PRIMARY KEY(scope_key,window_start));
CREATE TABLE security_events(id TEXT,actor_type TEXT,action TEXT,outcome TEXT,severity TEXT,metadata_json TEXT,created_at INTEGER);`);
});
afterEach(() => db.close());
const env = () =>
  ({
    DB: {
      prepare: (sql: string) => {
        let values: SQLInputValue[] = [];
        const statement = {
          bind(...input: SQLInputValue[]) {
            values = input;
            return statement;
          },
          async first() {
            return db.prepare(sql).get(...values) || null;
          },
          async run() {
            return db.prepare(sql).run(...values);
          },
        };
        return statement;
      },
    },
    PUBLIC_API_RATE_LIMITER: { limit: async () => ({ success: true }) },
  }) as unknown as Env;
const html = () =>
  new Response("<html><body>AVYRON</body></html>", {
    headers: {
      "content-type": "text/html",
      "cache-control": "public, max-age=60",
    },
  });
it("enforces compatible HTML baseline, starts scripts in report-only, and isolates private caches", async () => {
  const response = applicationHostResponse(
    new Request("https://app.avyron.ro/auth"),
    html(),
  );
  expect(response.headers.get("Content-Security-Policy")).toBe(
    "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  );
  expect(response.headers.get("Content-Security-Policy-Report-Only")).toContain(
    "script-src",
  );
  expect(response.headers.get("Strict-Transport-Security")).toBe(
    "max-age=31536000",
  );
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(await response.text()).toContain("AVYRON");
  const publicPage = applicationHostResponse(
    new Request("https://avyron.ro/"),
    html(),
  );
  expect(publicPage.headers.get("Cache-Control")).toBe("public, max-age=60");
  expect(publicPage.headers.has("X-Robots-Tag")).toBe(false);
});
it("leaves unrelated client hostnames and non-HTML resources unchanged and retains stricter CSP", () => {
  const original = html();
  expect(
    applicationHostResponse(
      new Request("https://cabinet.example.test/"),
      original,
    ),
  ).toBe(original);
  const json = Response.json({ ok: true });
  expect(htmlSecurityHeaders(new Request("https://avyron.ro/"), json)).toBe(
    json,
  );
  const strict = html();
  strict.headers.set("Content-Security-Policy", "default-src 'none'");
  expect(
    htmlSecurityHeaders(new Request("http://localhost/"), strict).headers.get(
      "Content-Security-Policy",
    ),
  ).toBe("default-src 'none'");
  expect(
    htmlSecurityHeaders(new Request("http://localhost/"), html()).headers.has(
      "Strict-Transport-Security",
    ),
  ).toBe(false);
});
it("stores only a bounded directive, never report URLs, samples or secrets, and limits repeated reports", async () => {
  const bindings = env();
  const report = {
    "csp-report": {
      "effective-directive": "script-src",
      "document-uri": "https://private.example.test/?token=synthetic-secret",
      "script-sample": "Bearer synthetic-secret",
      "blocked-uri": "https://private.example.test",
    },
  };
  const call = (body: unknown) =>
    securityReportsRouter.request(
      "https://avyron.ro/api/security/csp-report",
      {
        method: "POST",
        headers: {
          "content-type": "application/csp-report",
          "cf-connecting-ip": "192.0.2.10",
        },
        body: JSON.stringify(body),
      },
      bindings,
    );
  for (let n = 0; n < 6; n++) expect((await call(report)).status).toBe(204);
  expect((await call(report)).status).toBe(429);
  const rows = db.prepare("SELECT * FROM security_events").all();
  expect(rows).toHaveLength(6);
  expect(JSON.stringify(rows)).not.toMatch(
    /synthetic-secret|private\.example|Bearer/,
  );
  expect(JSON.parse(String(rows[0].metadata_json))).toEqual({
    directive: "script-src",
    source: "untrusted_browser_report",
  });
});
it("rejects oversized or unrecognized reports without storing them", async () => {
  const bindings = env();
  for (const body of [
    JSON.stringify({
      "csp-report": {
        "effective-directive": "script-src",
        sample: "x".repeat(17000),
      },
    }),
    JSON.stringify({
      "csp-report": { "effective-directive": "attacker-defined-action" },
    }),
    "invalid",
  ]) {
    expect(
      (
        await securityReportsRouter.request(
          "https://avyron.ro/api/security/csp-report",
          { method: "POST", body },
          bindings,
        )
      ).status,
    ).toBe(400);
  }
  expect(
    db.prepare("SELECT count(*) AS count FROM security_events").get()!.count,
  ).toBe(0);
});
