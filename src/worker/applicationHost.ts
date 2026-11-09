import type { SecurityBoundaryEnv } from "../shared/securityBoundary";
import { htmlSecurityHeaders } from "./securityHeaders";
/** The application hostname is never a second search surface for public pages. */
export function applicationHostResponse(request: Request, response: Response, env: SecurityBoundaryEnv = {}): Response {
  const hostname = new URL(request.url).hostname.toLowerCase().replace(/\.$/, "");
  const privatePage = hostname === "app.avyron.ro" || !!env.ADMIN_HOSTNAME && hostname === env.ADMIN_HOSTNAME.toLowerCase();
  const firstParty = ["avyron.ro", "www.avyron.ro", "surveys.avyron.ro"].includes(hostname) || hostname.endsWith(".avyrontech.workers.dev");
  if (!privatePage) return firstParty ? htmlSecurityHeaders(request, response, { cspMode: env.SECURITY_CSP_MODE }) : response;
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  if (headers.get("Content-Type")?.toLowerCase().includes("text/html")) {
    headers.set("Cache-Control", "private, no-store");
  }
  // Retain the stream and all existing auth, security and asset-cache headers.
  return htmlSecurityHeaders(request, new Response(response.body, { status: response.status, statusText: response.statusText, headers }), { privatePage: true, cspMode: env.SECURITY_CSP_MODE });
}
