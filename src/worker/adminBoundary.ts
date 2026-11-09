import {
  boundaryPolicy,
  internalPage,
  type SecurityBoundaryEnv,
} from "../shared/securityBoundary";
import { verifyAccessAssertion } from "./accessAssertion";

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

/** No DNS mutation, public-client redirect, URL token or alternate authentication store. */
export async function boundaryEntry(
  request: Request,
  env: SecurityBoundaryEnv,
): Promise<Response | null> {
  const policy = boundaryPolicy(env);
  if (policy.mode === "off") return null;
  const url = new URL(request.url);
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return null;
  const admin = url.hostname.toLowerCase() === policy.hostname;
  if (!admin && !internalPage(url.pathname)) return null;
  if (policy.mode === "observe") return null;
  if (!policy.configured) return failure("security_boundary_unconfigured", 503);
  if (!["GET", "HEAD"].includes(request.method))
    return failure("method_not_allowed", 405);
  if (!admin) {
    const destination = new URL(request.url);
    destination.protocol = "https:";
    destination.host = policy.hostname;
    destination.username = "";
    destination.password = "";
    destination.search = "";
    destination.hash = "";
    // No credentials are carried to another origin. The browser signs into
    // the same native accounts on the isolated administration hostname.
    return new Response(null, {
      status: 302,
      headers: {
        Location: destination.href,
        "Cache-Control": "private, no-store",
      },
    });
  }
  const identity = await verifyAccessAssertion(request, env);
  if (!identity?.email) return failure("access_identity_required");
  return null;
}
