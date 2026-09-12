export type DemoSiteStatus = "active" | "preparing";

export type DemoSite = {
  /** Canonical hostname for this deployment. */
  hostname: string;
  /** Alternate hostnames resolving to the same deployment and data boundary. */
  aliases: readonly string[];
  project: string;
  label: string;
  industry: string;
  description: string;
  previewUrl?: string;
  repository?: string;
  deployment?: string;
  indexing: boolean;
  visibility: "public" | "private";
  protection: "public" | "authenticated";
  expiresAt?: string;
  linkedProject?: string;
  status: DemoSiteStatus;
  /**
   * Optional path inside the public build. When the site becomes active, its
   * files live below this isolated prefix and are served through ASSETS only.
   */
  assetRoot?: string;
};

const legacyRomanianSites = (count: number): DemoSite[] =>
  Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      hostname: `exemplu${number}.avyron.ro`,
      aliases: [],
      project: `example-ro-${number}`,
      label: `Exemplu ${number}`,
      industry: "neconfigurată",
      description: "Slot demonstrativ legacy păstrat pentru compatibilitate.",
      indexing: false,
      visibility: "public",
      protection: "public",
      status: "preparing",
    };
  });

const numberedEuropeanSites = (count: number): DemoSite[] =>
  Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      hostname: `demo${number}.avyron.eu`,
      aliases: [`exemplu${number}.avyron.eu`],
      project: `demo-eu-${number}`,
      label: `Demo ${number}`,
      industry: "neconfigurată",
      description: "Slot izolat pentru un proiect demonstrativ Avyron.",
      indexing: false,
      visibility: "public",
      protection: "public",
      status: "preparing",
    };
  });

/**
 * Single source of truth for independently hosted demo projects.
 *
 * A project is deliberately unavailable until its isolated static bundle is
 * added and both `status: "active"` and `assetRoot` are set. This avoids ever
 * exposing the main Avyron SPA, API, client data or production secrets on an
 * unconfigured demo hostname.
 */
export const DEMO_SITES: readonly DemoSite[] = [
  ...legacyRomanianSites(3),
  ...numberedEuropeanSites(10),
  {
    hostname: "salaforza.avyron.eu",
    aliases: [],
    project: "salaforza",
    label: "SalaForza",
    industry: "fitness",
    description: "Proiect demonstrativ pentru o sală de fitness.",
    indexing: false,
    visibility: "public",
    protection: "public",
    status: "preparing",
  },
  {
    hostname: "pensiuneabradetul.avyron.eu",
    aliases: [],
    project: "pensiuneabradetul",
    label: "Pensiunea Brădetul",
    industry: "ospitalitate",
    description: "Proiect demonstrativ pentru o pensiune.",
    indexing: false,
    visibility: "public",
    protection: "public",
    status: "preparing",
  },
  {
    hostname: "asociatia-europa.avyron.eu",
    aliases: [],
    project: "asociatia-europa",
    label: "Asociația Europa",
    industry: "nonprofit",
    description: "Proiect demonstrativ pentru o organizație nonprofit.",
    indexing: false,
    visibility: "public",
    protection: "public",
    status: "preparing",
  },
];

const sitesByHostname = new Map(
  DEMO_SITES.flatMap((site) => [site.hostname, ...site.aliases].map((hostname) => [hostname, site] as const)),
);

export type HostResolution =
  | { kind: "canonical-redirect"; preservePath: boolean }
  | { kind: "demo"; site: DemoSite }
  | { kind: "unknown-demo" }
  | { kind: "main" };

export function resolveHostname(hostname: string): HostResolution {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (normalized === "www.avyron.ro") {
    return { kind: "canonical-redirect", preservePath: true };
  }
  if (normalized === "avyron.eu" || normalized === "www.avyron.eu") {
    return { kind: "canonical-redirect", preservePath: true };
  }
  const site = sitesByHostname.get(normalized);
  if (site) return { kind: "demo", site };
  if (normalized.endsWith(".avyron.eu")) return { kind: "unknown-demo" };
  return { kind: "main" };
}

function securityHeaders(indexing: boolean): Record<string, string> {
  return {
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": indexing ? "index, follow" : "noindex, nofollow",
  };
}

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

export function unavailableDemoResponse(label = "Avyron", method = "GET"): Response {
  const html = `<!doctype html>
<html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Demo în pregătire | Avyron</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#07050d;color:#f8f7fb;font-family:Inter,ui-sans-serif,system-ui,sans-serif}body:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 50% 22%,#6938ef33,transparent 38%),linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:auto,40px 40px,40px 40px;mask-image:linear-gradient(#000,transparent 85%)}main{position:relative;width:min(100%,620px);padding:clamp(28px,7vw,64px);border:1px solid #ffffff1f;border-radius:28px;background:#100c19cc;box-shadow:0 32px 100px #0009;text-align:center}.brand{font-size:12px;font-weight:800;letter-spacing:.28em;color:#bca7ff}.project{margin:18px 0 0;color:#ffffff8f;font-size:12px;text-transform:uppercase;letter-spacing:.16em}h1{margin:10px 0 12px;font-size:clamp(34px,8vw,62px);line-height:1.02;letter-spacing:-.045em}p{margin:0 auto;max-width:430px;color:#c6c0d1;line-height:1.7}a{display:inline-flex;margin-top:28px;padding:12px 20px;border:1px solid #ffffff2b;border-radius:999px;color:#fff;text-decoration:none;font-weight:700}a:hover{background:#ffffff12}</style></head>
<body><main><div class="brand">AVYRON</div><div class="project">${escapeHtml(label)}</div><h1>Demo în pregătire</h1><p>Acest proiect demonstrativ este în curs de configurare.</p><a href="https://avyron.ro/">avyron.ro</a></main></body></html>`;
  return new Response(method === "HEAD" ? null : html, {
    status: 404,
    headers: securityHeaders(false),
  });
}

const SENSITIVE_QUERY_KEY = /(^|[_-])(access|auth|authorization|code|credential|jwt|key|password|refresh|secret|session|signature|token)([_-]|$)/i;

function safeRedirectSearch(searchParams: URLSearchParams): string {
  const safe = new URLSearchParams();
  let totalLength = 0;
  for (const [key, value] of searchParams) {
    if (SENSITIVE_QUERY_KEY.test(key) || key.length > 100 || value.length > 500) continue;
    totalLength += key.length + value.length;
    if (totalLength > 1500) break;
    safe.append(key, value);
  }
  const serialized = safe.toString();
  return serialized ? `?${serialized}` : "";
}

function safeAssetPath(pathname: string): string {
  try {
    const segments = pathname.split("/").filter(Boolean).map((segment) => encodeURIComponent(decodeURIComponent(segment)));
    return segments.length ? `/${segments.join("/")}` : "/index.html";
  } catch {
    return "/index.html";
  }
}

async function activeDemoResponse(request: Request, assets: Fetcher, site: DemoSite): Promise<Response> {
  if (!site.assetRoot) return unavailableDemoResponse(site.label, request.method);
  const url = new URL(request.url);
  const assetPath = safeAssetPath(url.pathname);
  const assetUrl = new URL(`${site.assetRoot.replace(/\/$/, "")}${assetPath}`, url.origin);
  let response = await assets.fetch(new Request(assetUrl, { method: request.method === "HEAD" ? "HEAD" : "GET" }));
  if (response.status === 404 && !assetPath.includes(".")) {
    response = await assets.fetch(new Request(new URL(`${site.assetRoot.replace(/\/$/, "")}/index.html`, url.origin), { method: request.method === "HEAD" ? "HEAD" : "GET" }));
  }
  if (!response.ok) return unavailableDemoResponse(site.label, request.method);
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", site.indexing ? "index, follow" : "noindex, nofollow");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(response.body, { status: response.status, headers });
}

/** Returns null only for the primary Avyron hostnames handled by the main app. */
export async function handleMappedHostname(request: Request, assets: Fetcher): Promise<Response | null> {
  const url = new URL(request.url);
  const resolution = resolveHostname(url.hostname);
  if (resolution.kind === "main") return null;
  if (resolution.kind === "canonical-redirect") {
    const target = new URL("https://avyron.ro/");
    if (resolution.preservePath) target.pathname = url.pathname;
    target.search = safeRedirectSearch(url.searchParams);
    return Response.redirect(target.toString(), 301);
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: { ...securityHeaders(false), Allow: "GET, HEAD" },
    });
  }
  if (resolution.kind === "unknown-demo") return unavailableDemoResponse("Avyron", request.method);
  if (resolution.site.status !== "active") return unavailableDemoResponse(resolution.site.label, request.method);
  return activeDemoResponse(request, assets, resolution.site);
}
