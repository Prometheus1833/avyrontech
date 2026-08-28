export type DemoSiteStatus = "active" | "unavailable";

export type DemoSite = {
  hostname: string;
  project: string;
  label: string;
  indexing: boolean;
  status: DemoSiteStatus;
  /**
   * Optional path inside the public build. When the site becomes active, its
   * files live below this isolated prefix and are served through ASSETS only.
   */
  assetRoot?: string;
};

const numberedSites = (zone: "ro" | "eu", count: number): DemoSite[] =>
  Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      hostname: `exemplu${number}.avyron.${zone}`,
      project: `example-${zone}-${number}`,
      label: `Exemplu ${number}`,
      indexing: false,
      status: "unavailable",
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
  ...numberedSites("ro", 3),
  ...numberedSites("eu", 10),
  {
    hostname: "salaforza.avyron.eu",
    project: "salaforza",
    label: "SalaForza",
    indexing: false,
    status: "unavailable",
  },
  {
    hostname: "pensiuneabradetul.avyron.eu",
    project: "pensiuneabradetul",
    label: "Pensiunea Brădetul",
    indexing: false,
    status: "unavailable",
  },
  {
    hostname: "asociatia-europa.avyron.eu",
    project: "asociatia-europa",
    label: "Asociația Europa",
    indexing: false,
    status: "unavailable",
  },
];

const sitesByHostname = new Map(DEMO_SITES.map((site) => [site.hostname, site]));

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
    return { kind: "canonical-redirect", preservePath: false };
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
<meta name="robots" content="noindex,nofollow"><title>Demo indisponibil | Avyron</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#07050d;color:#f8f7fb;font-family:Inter,ui-sans-serif,system-ui,sans-serif}body:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 50% 22%,#6938ef33,transparent 38%),linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:auto,40px 40px,40px 40px;mask-image:linear-gradient(#000,transparent 85%)}main{position:relative;width:min(100%,620px);padding:clamp(28px,7vw,64px);border:1px solid #ffffff1f;border-radius:28px;background:#100c19cc;box-shadow:0 32px 100px #0009;text-align:center}.brand{font-size:12px;font-weight:800;letter-spacing:.28em;color:#bca7ff}.project{margin:18px 0 0;color:#ffffff8f;font-size:12px;text-transform:uppercase;letter-spacing:.16em}h1{margin:10px 0 12px;font-size:clamp(34px,8vw,62px);line-height:1.02;letter-spacing:-.045em}p{margin:0 auto;max-width:430px;color:#c6c0d1;line-height:1.7}a{display:inline-flex;margin-top:28px;padding:12px 20px;border:1px solid #ffffff2b;border-radius:999px;color:#fff;text-decoration:none;font-weight:700}a:hover{background:#ffffff12}</style></head>
<body><main><div class="brand">AVYRON</div><div class="project">${escapeHtml(label)}</div><h1>Demo indisponibil</h1><p>Acest proiect demonstrativ nu este momentan disponibil.</p><a href="https://avyron.ro/">avyron.ro</a></main></body></html>`;
  return new Response(method === "HEAD" ? null : html, {
    status: 404,
    headers: securityHeaders(false),
  });
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
    target.search = url.search;
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
