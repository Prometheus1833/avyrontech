// Base URL pentru API-ul Cloudflare Workers (avyrontech).
//
// - În producție (avyron.ro sau workers.dev direct), folosim același origin cu string gol → `/api/*`.
// - În preview Lovable folosim domeniul API first-party, protejat de Cloudflare.
// Poate fi suprascris prin VITE_CF_API_BASE dacă schimbi domeniul.

const FALLBACK = "https://api.avyron.ro";
const ADMIN_HOST = (import.meta.env.VITE_ADMIN_HOSTNAME || "").trim().toLowerCase();

export function apiBaseForHost(host: string, configured?: string, adminHost = ADMIN_HOST): string {
  if (adminHost && host.toLowerCase() === adminHost) return "";
  if (configured) return configured.replace(/\/+$/, "");
  if (
    host === "surveys.avyron.ro" ||
    host === "avyron.ro" ||
    host === "www.avyron.ro" ||
    host === "app.avyron.ro" ||
    host.endsWith(".avyrontech.workers.dev")
  ) {
    return "";
  }
  return FALLBACK;
}

function detect(): string {
  const env = import.meta.env.VITE_CF_API_BASE as string | undefined;
  return apiBaseForHost(typeof window === "undefined" ? "" : window.location.hostname, env);
}

export const API_BASE = detect();

export const apiUrl = (path: string) =>
  path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

/** One host-only HttpOnly session cookie for the public website and account.
 * Never broaden the cookie to client subdomains or put refresh tokens in URLs. */
export function authBaseForHost(host: string, configured?: string, adminHost = ADMIN_HOST): string {
  if (adminHost && host.toLowerCase() === adminHost) return "";
  if (configured) return configured.replace(/\/+$/, "");
  return ["avyron.ro", "www.avyron.ro", "app.avyron.ro"].includes(host.toLowerCase())
    ? FALLBACK
    : apiBaseForHost(host, undefined, adminHost);
}

const AUTH_BASE = authBaseForHost(
  typeof window === "undefined" ? "" : window.location.hostname,
  import.meta.env.VITE_CF_API_BASE as string | undefined,
);
export const authUrl = (path: string) => `${AUTH_BASE}${path}`;

/** Only configured first-party API/auth transports may receive the session token.
 * Public catalog/provider URLs must use an unauthenticated fetch or browser link. */
export function authenticatedApiUrl(path: string): string {
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const destination = apiUrl(path);
  const url = new URL(destination, origin);
  const allowed = new Set([new URL(apiUrl("/"), origin).origin, new URL(authUrl("/"), origin).origin]);
  if (!allowed.has(url.origin) || !["https:", "http:"].includes(url.protocol) ||
      url.username || url.password || url.hash || !url.pathname.startsWith("/api/")) {
    throw new Error("untrusted_api_destination");
  }
  return destination;
}
