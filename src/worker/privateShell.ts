import { headersForTransformedBody } from "./blogHtml";

interface PrivateShellEnv { ASSETS: { fetch: (request: Request) => Promise<Response> } }

export const NOINDEX = "noindex, nofollow";
const PRIVATE_TITLE = "Avyron — Acces securizat";
const PRIVATE_DESCRIPTION = "Spațiu securizat pentru autentificare și administrarea contului Avyron.";

function replaceMeta(html: string, attribute: "name" | "property", key: string, value: string) {
  const expression = new RegExp(`<meta\\s+${attribute}=["']${key}["'][^>]*>`, "i");
  const escaped = value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
  const tag = `<meta ${attribute}="${key}" content="${escaped}">`;
  return expression.test(html) ? html.replace(expression, () => tag) : html.replace("</head>", () => `  ${tag}\n</head>`);
}

function privateShellHtml(html: string, url: URL) {
  // This is repository-built shell HTML, never document/user HTML. Remove
  // structured data to a fixed point so nested matches cannot be exposed by
  // an earlier removal; retain the application's executable module scripts.
  let stripped = html;
  let previous: string;
  do {
    previous = stripped;
    stripped = stripped.replace(/\s*<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
  } while (stripped !== previous);
  let result = stripped
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${PRIVATE_TITLE}</title>`)
    .replace(/\s*<meta\s+name=["']keywords["'][^>]*>/gi, "")
    .replace(/\s*<meta\s+name=["']geo\.[^"']+["'][^>]*>/gi, "")
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/\s*<link\s+rel=["']alternate["'][^>]*>/gi, "");
  result = replaceMeta(result, "name", "description", PRIVATE_DESCRIPTION);
  result = replaceMeta(result, "name", "robots", NOINDEX);
  result = replaceMeta(result, "property", "og:title", PRIVATE_TITLE);
  result = replaceMeta(result, "property", "og:description", PRIVATE_DESCRIPTION);
  result = replaceMeta(result, "property", "og:url", `${url.origin}${url.pathname}`);
  result = replaceMeta(result, "name", "twitter:title", PRIVATE_TITLE);
  result = replaceMeta(result, "name", "twitter:description", PRIVATE_DESCRIPTION);
  return result;
}

export async function servePrivateShell(env: PrivateShellEnv, url: URL, method = "GET") {
  const res = await env.ASSETS.fetch(new Request(new URL("/_shell.html", url.origin), { method: "GET" }));
  const headers = headersForTransformedBody(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "private, no-store");
  headers.set("X-Robots-Tag", NOINDEX);
  if (!res.ok) return new Response(method === "HEAD" ? null : "Secure application shell unavailable", { status: 503, headers });
  return new Response(method === "HEAD" ? null : privateShellHtml(await res.text(), url), { status: 200, headers });
}
