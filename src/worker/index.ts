/**
 * Site Worker (Cloudflare) — serves the prerendered static build and applies
 * correct HTTP semantics: 301 redirects, hard 404/403/500/503 statuses and
 * X-Robots-Tag: noindex on private/auth areas. Assets and /api/* pass through.
 */

import { decide, isKnownSpaRoute, normalizePath } from "./router";

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

const NOINDEX = "noindex, nofollow";

async function serveFile(env: Env, url: URL, file: string, status: number, noindex: boolean) {
  const res = await env.ASSETS.fetch(new Request(new URL(file, url.origin), { method: "GET" }));
  const headers = new Headers(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  if (noindex) headers.set("X-Robots-Tag", NOINDEX);
  return new Response(res.body, { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const decision = decide(url);

    switch (decision.kind) {
      case "redirect":
        return Response.redirect(new URL(decision.location, url.origin).toString(), decision.status);

      case "api":
      case "asset":
        return env.ASSETS.fetch(request);

      case "static":
        return serveFile(env, url, decision.file, decision.status, decision.noindex);

      case "page": {
        const path = normalizePath(url.pathname);
        const assetRes = await env.ASSETS.fetch(request);

        if (assetRes.status === 404) {
          // Known SPA-only route (auth, dashboard) -> plain shell, noindex.
          if (isKnownSpaRoute(path)) {
            return serveFile(env, url, "/_shell.html", 200, true);
          }
          // Anything else is a real 404 — never a soft 404.
          return serveFile(env, url, "/404.html", 404, true);
        }

        if (!decision.noindex) return assetRes;
        const headers = new Headers(assetRes.headers);
        headers.set("X-Robots-Tag", NOINDEX);
        return new Response(assetRes.body, { status: assetRes.status, headers });
      }
    }
  },
};
