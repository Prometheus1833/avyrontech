/**
 * Site edge runtime (Cloudflare Pages advanced mode or standalone Worker) —
 * serves the prerendered static build and applies correct HTTP semantics: 301
 * redirects, hard 404/403/500/503 statuses and X-Robots-Tag on private areas.
 */

import { decide, isKnownSpaRoute, normalizePath } from "./router";
import { headersForTransformedBody, injectBlogHtml, mergeBlogSitemap, type EdgeBlogPost, type EdgeSitemapEntry } from "./blogHtml";
import { serveCachedAsset } from "./assetCache";

interface Fetcher {
  fetch: (req: Request) => Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  /** Service binding to the existing API Worker ("avyrontech"). */
  API?: Fetcher;
}

const NOINDEX = "noindex, nofollow";
const PRIVATE_TITLE = "Avyron — Acces securizat";
const PRIVATE_DESCRIPTION = "Spațiu securizat pentru autentificare și administrarea contului Avyron.";

function replaceMeta(html: string, attribute: "name" | "property", key: string, value: string) {
  const expression = new RegExp(`<meta\\s+${attribute}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${attribute}="${key}" content="${value}">`;
  return expression.test(html) ? html.replace(expression, tag) : html.replace("</head>", `  ${tag}\n</head>`);
}

function privateShellHtml(html: string, url: URL) {
  let result = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${PRIVATE_TITLE}</title>`)
    .replace(/\s*<meta\s+name=["']keywords["'][^>]*>/gi, "")
    .replace(/\s*<meta\s+name=["']geo\.[^"']+["'][^>]*>/gi, "")
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/\s*<link\s+rel=["']alternate["'][^>]*>/gi, "")
    .replace(/\s*<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
  result = replaceMeta(result, "name", "description", PRIVATE_DESCRIPTION);
  result = replaceMeta(result, "name", "robots", NOINDEX);
  result = replaceMeta(result, "property", "og:title", PRIVATE_TITLE);
  result = replaceMeta(result, "property", "og:description", PRIVATE_DESCRIPTION);
  result = replaceMeta(result, "property", "og:url", `${url.origin}${url.pathname}`);
  result = replaceMeta(result, "name", "twitter:title", PRIVATE_TITLE);
  result = replaceMeta(result, "name", "twitter:description", PRIVATE_DESCRIPTION);
  return result;
}

async function serveFile(env: Env, url: URL, file: string, status: number, noindex: boolean) {
  const res = await env.ASSETS.fetch(new Request(new URL(file, url.origin), { method: "GET" }));
  const headers = new Headers(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  if (noindex) headers.set("X-Robots-Tag", NOINDEX);
  return new Response(res.body, { status, headers });
}

async function servePrivateShell(env: Env, url: URL) {
  const res = await env.ASSETS.fetch(new Request(new URL("/_shell.html", url.origin), { method: "GET" }));
  const headers = headersForTransformedBody(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "private, no-store");
  headers.set("X-Robots-Tag", NOINDEX);
  return new Response(privateShellHtml(await res.text(), url), { status: 200, headers });
}

async function apiFetch(env: Env, path: string) {
  if (!env.API) return null;
  return env.API.fetch(new Request(`https://avyron.internal${path}`, {
    method: "GET",
    headers: { accept: "application/json" },
  }));
}

async function serveBlog(env: Env, request: Request, url: URL, language: "ro" | "en", slug: string) {
  const apiRes = await apiFetch(env, `/api/blog/posts/${encodeURIComponent(slug)}?lang=${language}`);
  if (!apiRes || apiRes.status === 404) return serveFile(env, url, "/404.html", 404, true);
  if (!apiRes.ok) return new Response("Blog service temporarily unavailable", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8", "Retry-After": "60", "X-Robots-Tag": NOINDEX },
  });
  let payload: { data?: EdgeBlogPost } = {};
  try { payload = await apiRes.json(); } catch { /* Invalid upstream JSON becomes a hard 404 below. */ }
  if (!payload.data) return serveFile(env, url, "/404.html", 404, true);
  const shell = await env.ASSETS.fetch(new Request(new URL("/_shell.html", url.origin)));
  if (!shell.ok) return new Response("Site shell unavailable", { status: 503, headers: { "X-Robots-Tag": NOINDEX } });
  const headers = headersForTransformedBody(shell.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
  headers.set("Vary", "Accept-Encoding");
  const html = injectBlogHtml(await shell.text(), payload.data);
  return new Response(request.method === "HEAD" ? null : html, { status: 200, headers });
}

async function serveSitemap(env: Env, request: Request) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  const apiRes = await apiFetch(env, "/api/blog/sitemap");
  if (!apiRes?.ok) return asset;
  let payload: { data?: EdgeSitemapEntry[] } = {};
  try { payload = await apiRes.json(); } catch { /* Keep the generated static sitemap. */ }
  const headers = headersForTransformedBody(asset.headers);
  headers.set("content-type", "application/xml; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, s-maxage=900, stale-while-revalidate=86400");
  const xml = mergeBlogSitemap(await asset.text(), payload.data || []);
  return new Response(request.method === "HEAD" ? null : xml, { status: 200, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/sitemap.xml") return serveSitemap(env, request);
    const decision = decide(url);

    switch (decision.kind) {
      case "redirect":
        return Response.redirect(new URL(decision.location, url.origin).toString(), decision.status);

      // /api/* belongs to the API Worker, not to the static assets.
      case "api":
        if (!env.API) {
          return new Response("API service binding is not configured", {
            status: 502,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        return env.API.fetch(request);

      case "blog":
        return serveBlog(env, request, url, decision.language, decision.slug);

      case "asset":
        return serveCachedAsset(env.ASSETS, request);

      case "static":
        return serveFile(env, url, decision.file, decision.status, decision.noindex);

      case "page": {
        const path = normalizePath(url.pathname);
        const assetRes = await env.ASSETS.fetch(request);

        if (assetRes.status === 404) {
          // Known SPA-only route (auth, dashboard) -> plain shell, noindex.
          if (isKnownSpaRoute(path)) {
            return servePrivateShell(env, url);
          }
          // Anything else is a real 404 — never a soft 404.
          return serveFile(env, url, "/404.html", 404, true);
        }

        if (!decision.robots) return assetRes;
        const headers = new Headers(assetRes.headers);
        headers.set("X-Robots-Tag", decision.robots);
        return new Response(assetRes.body, { status: assetRes.status, headers });
      }
    }
  },
};
