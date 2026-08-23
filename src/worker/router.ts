/**
 * Pure routing decisions for the site Worker.
 * Kept free of Cloudflare APIs so it can be unit-tested directly.
 */

import { REDIRECTS, STATUS_PAGES, isNoindexPath, PRERENDER_ROUTES } from "@/seo/publicRoutes";

export type Decision =
  | { kind: "redirect"; location: string; status: 301 }
  | { kind: "asset" }
  | { kind: "api" }
  | { kind: "static"; file: string; status: number; noindex: boolean }
  | { kind: "page"; noindex: boolean };

/** Removes a trailing slash (except for the root). */
export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

const ASSET_RE = /\.[a-z0-9]{2,5}$/i;

export function decide(url: URL): Decision {
  const path = normalizePath(url.pathname);

  if (path.startsWith("/api/")) return { kind: "api" };

  // Legacy URLs -> canonical URLs, query string preserved, no loops.
  const target = REDIRECTS[path];
  if (target && normalizePath(target) !== path) {
    return { kind: "redirect", location: `${target}${url.search}`, status: 301 };
  }

  // Trailing-slash normalisation for real pages (avoids duplicate content).
  if (path !== url.pathname && PRERENDER_ROUTES.includes(path)) {
    return { kind: "redirect", location: `${path}${url.search}`, status: 301 };
  }

  const statusPage = STATUS_PAGES.find((p) => p.route === path);
  if (statusPage) {
    return { kind: "static", file: `/${statusPage.file}`, status: statusPage.status, noindex: true };
  }

  // Real files (hashed bundles, images, robots.txt, sitemap.xml…).
  if (ASSET_RE.test(path) && !PRERENDER_ROUTES.includes(path)) return { kind: "asset" };

  if (PRERENDER_ROUTES.includes(path)) return { kind: "page", noindex: isNoindexPath(path) };

  if (isNoindexPath(path)) return { kind: "page", noindex: true };

  // Known private/app routes that are not prerendered still serve the SPA shell.
  return { kind: "page", noindex: true };
}

/** Routes that exist in the SPA router but are not prerendered (auth, dashboard…). */
export const SPA_ONLY_PREFIXES = [
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/profil",
  "/intern",
  "/unsubscribe",
  "/offline",
];

export function isKnownSpaRoute(path: string): boolean {
  return SPA_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
