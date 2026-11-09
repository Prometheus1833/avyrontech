import { Hono } from "hono";
import type { AppBindings } from "./types";
import { readJsonBodyUpTo } from "./requestBody";
import { checkRateLimit, clientIp, hashKey } from "./antispam";
const directives = new Set([
  "script-src",
  "script-src-elem",
  "script-src-attr",
  "object-src",
  "base-uri",
  "frame-ancestors",
  "default-src",
  "worker-src",
  "connect-src",
]);
export const securityReportsRouter = new Hono<AppBindings>();
securityReportsRouter.post("/api/security/csp-report", async (c) => {
  const ip = await hashKey(clientIp(c.req.raw));
  const limit = await checkRateLimit(
    c.env.DB,
    [
      { key: `security-report:${ip}:m`, limit: 6, windowSec: 60 },
      { key: "security-report:global:d", limit: 100, windowSec: 86400 },
    ],
    { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `security-report:${ip}` },
  );
  if (!limit.ok) return c.body(null, 429);
  const parsed = await readJsonBodyUpTo(c.req.raw, 16384);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object")
    return c.body(null, 400);
  const report = (parsed.value as Record<string, unknown>)["csp-report"];
  if (!report || typeof report !== "object" || Array.isArray(report))
    return c.body(null, 400);
  const directive = (report as Record<string, unknown>)["effective-directive"];
  if (typeof directive !== "string" || !directives.has(directive))
    return c.body(null, 400);
  // Reports are untrusted observations, never evidence that a policy was
  // changed or an attack succeeded. No URLs, queries, samples or identities.
  await c.env.DB.prepare(
    `INSERT INTO security_events(id,actor_type,action,outcome,severity,metadata_json,created_at)
    VALUES(?,'anonymous','security.csp.observed','allowed','info',?,?)`,
  )
    .bind(
      crypto.randomUUID(),
      JSON.stringify({ directive, source: "untrusted_browser_report" }),
      Date.now(),
    )
    .run();
  return c.body(null, 204);
});
