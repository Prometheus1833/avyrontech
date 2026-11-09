import {
  boundaryPolicy,
  internalApi,
  safeSecurityMetadata,
} from "../../../../src/shared/securityBoundary";
import { platformRoleForUser } from "./authorization";
import { verifyAccessAssertion, type AccessIdentity } from "./accessAssertion";
import { constantTimeEqual, sha256 } from "./security";
import type { Context } from "hono";
import type { AppBindings, Env, Role } from "./types";

export { boundaryEntry } from "../../../../src/worker/adminBoundary";
const failure = (code: string, status = 403) =>
  Response.json(
    { error: { code } },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );

export function serviceBound(
  env: Env,
  identity: AccessIdentity,
  userId: string,
  roles: Role[],
  request: Request,
) {
  if (
    !identity.service ||
    !roles.length ||
    roles.some((role) => role !== "user")
  )
    return false;
  try {
    const bindings: unknown = JSON.parse(env.SECURITY_SERVICE_BINDINGS || "[]");
    if (!Array.isArray(bindings) || bindings.length > 100) return false;
    const path = new URL(request.url).pathname;
    return bindings.some((binding) => {
      if (
        !binding ||
        typeof binding !== "object" ||
        binding.clientId !== identity.service ||
        binding.userId !== userId ||
        !Array.isArray(binding.routes) ||
        binding.routes.length > 30
      )
        return false;
      return binding.routes.some((route: unknown) => {
        if (
          !route ||
          typeof route !== "object" ||
          !("prefix" in route) ||
          !("methods" in route)
        )
          return false;
        const { prefix, methods } = route;
        return (
          typeof prefix === "string" &&
          /^\/api\/[A-Za-z0-9_/-]+$/.test(prefix) &&
          prefix !== "/api/" &&
          !prefix.includes("//") &&
          !prefix.endsWith("/") &&
          Array.isArray(methods) &&
          methods.includes(request.method) &&
          (path === prefix || path.startsWith(prefix + "/"))
        );
      });
    });
  } catch {
    return false;
  }
}

export async function breakGlassAllowed(
  env: Env,
  request: Request,
  userId: string,
  timestamp = Date.now(),
) {
  const supplied = request.headers.get("x-avyron-recovery") || "";
  if (
    supplied.length < 32 ||
    supplied.length > 256 ||
    !env.SECURITY_BREAK_GLASS
  )
    return false;
  try {
    const config = JSON.parse(env.SECURITY_BREAK_GLASS);
    if (
      !Number.isSafeInteger(config.issuedAt) ||
      !Number.isSafeInteger(config.expiresAt) ||
      config.issuedAt > timestamp ||
      config.expiresAt <= timestamp ||
      config.expiresAt <= config.issuedAt ||
      config.expiresAt - config.issuedAt > 30 * 60_000 ||
      !/^[A-Za-z0-9_-]{43}$/.test(config.tokenHash) ||
      !Array.isArray(config.userIds) ||
      !config.userIds.includes(userId)
    )
      return false;
    if (!(await constantTimeEqual(await sha256(supplied), config.tokenHash)))
      return false;
    return (await platformRoleForUser(env.DB, userId)) === "platform_owner";
  } catch {
    return false;
  }
}

async function event(
  c: Context<AppBindings>,
  reason: string,
  outcome: "allowed" | "denied",
  critical = false,
) {
  const timestamp = Date.now();
  // One observation per actor/reason/15 minutes; recovery use is always audited.
  if (
    !critical &&
    (await c.env.DB.prepare(
      "SELECT 1 FROM security_events WHERE actor_user_id=? AND action=? AND created_at>? LIMIT 1",
    )
      .bind(c.get("userId"), "security.boundary." + reason, timestamp - 900_000)
      .first())
  )
    return;
  await c.env.DB.prepare(
    `INSERT INTO security_events(id,actor_user_id,actor_type,action,outcome,severity,request_id,metadata_json,created_at)
    VALUES(?,?,'user',?,?,?,?,?,?)`,
  )
    .bind(
      crypto.randomUUID(),
      c.get("userId"),
      "security.boundary." + reason,
      outcome,
      critical ? "critical" : "warning",
      c.get("requestId") || null,
      JSON.stringify(
        safeSecurityMetadata({
          reason,
          path: c.req.path,
          method: c.req.method,
        }),
      ),
      timestamp,
    )
    .run();
}

/** Adds an outer boundary to existing resource authorization, never replaces it. */
export async function authenticatedBoundary(
  c: Context<AppBindings>,
  account: { email: string; email_verified: number },
): Promise<Response | null> {
  const policy = boundaryPolicy(c.env);
  if (policy.mode === "off") return null;
  const roles = c.get("roles");
  const onAdminHost = new URL(c.req.url).hostname === policy.hostname;
  // Native self-service auth stays usable on the public account origin, even
  // for a staff member (me, password change, session revocation). It grants no
  // administrative resource access. Admin-host auth still needs Access.
  if (!onAdminHost && c.req.path.startsWith("/api/auth/")) return null;
  if (
    !roles.some((role) => role === "staff" || role === "admin") &&
    !internalApi(c.req.path) &&
    !onAdminHost
  )
    return null;
  if (
    policy.mode === "enforce" &&
    (await breakGlassAllowed(c.env, c.req.raw, c.get("userId")))
  ) {
    await event(c, "break_glass", "allowed", true); // Audit failure blocks recovery.
    return null;
  }
  const identity = await verifyAccessAssertion(c.req.raw, c.env);
  const identityBound =
    !!identity &&
    (identity.email
      ? account.email_verified === 1 &&
        identity.email === account.email.trim().toLowerCase()
      : serviceBound(c.env, identity, c.get("userId"), roles, c.req.raw));
  if (policy.configured && identityBound) return null;
  const reason = !policy.configured
    ? "unconfigured"
    : !identity
      ? "assertion_required"
      : "identity_mismatch";
  await event(
    c,
    policy.mode === "observe" ? "observed_" + reason : reason,
    policy.mode === "observe" ? "allowed" : "denied",
  );
  return policy.mode === "observe"
    ? null
    : failure("access_" + reason, policy.configured ? 403 : 503);
}
