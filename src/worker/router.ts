/**
 * Pure routing decisions for the site Worker.
 * Kept free of Cloudflare APIs so it can be unit-tested directly.
 */

import { redirectTarget, STATUS_PAGES, isNoindexPath, PRERENDER_ROUTES, robotsDirectiveForPath } from "../seo/publicRoutes";

export type Decision =
  | { kind: "redirect"; location: string; status: 301 }
  | { kind: "asset" }
  | { kind: "api" }
  | { kind: "blog"; language: "ro" | "en"; slug: string }
  | { kind: "static"; file: string; status: number; noindex: boolean }
  | { kind: "page"; robots: "noindex, follow" | "noindex, nofollow" | null };

/** Removes a trailing slash (except for the root). */
export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

const ASSET_RE = /\.[a-z0-9]{2,5}$/i;

export function decide(url: URL): Decision {
  const path = normalizePath(url.pathname);

  if ((url.hostname === "avyron.ro" || url.hostname === "www.avyron.ro") && path === "/surveys") {
    return { kind: "redirect", location: `https://surveys.avyron.ro/${url.search}`, status: 301 };
  }

  if (path.startsWith("/api/")) return { kind: "api" };

  // SearchAction-ul vechi a lăsat în Search Console /?q={search_term_string}.
  // Îl consolidăm permanent pe homepage și păstrăm doar parametrii de campanie.
  if (path === "/" && url.searchParams.has("q")) {
    const clean = new URL(url);
    clean.searchParams.delete("q");
    return { kind: "redirect", location: `${path}${clean.search}${clean.hash}`, status: 301 };
  }

  // Legacy URLs -> canonical URLs, query string preserved, no loops.
  const target = redirectTarget(path);
  if (target) {
    const targetUrl = new URL(target, url.origin);
    if (normalizePath(targetUrl.pathname) !== path) {
      url.searchParams.forEach((value, key) => {
        if (!targetUrl.searchParams.has(key)) targetUrl.searchParams.append(key, value);
      });
      return {
        kind: "redirect",
        location: `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
        status: 301,
      };
    }
  }

  const blogMatch = path.match(/^\/(en\/)?blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);

  // Trailing-slash normalisation for real pages (avoids duplicate content).
  if (path !== url.pathname && (PRERENDER_ROUTES.includes(path) || blogMatch)) {
    return { kind: "redirect", location: `${path}${url.search}`, status: 301 };
  }

  const statusPage = STATUS_PAGES.find((p) => p.route === path);
  if (statusPage) {
    return { kind: "static", file: `/${statusPage.file}`, status: statusPage.status, noindex: true };
  }

  // Real files (hashed bundles, images, robots.txt, sitemap.xml…).
  if (ASSET_RE.test(path) && !PRERENDER_ROUTES.includes(path)) return { kind: "asset" };

  if (PRERENDER_ROUTES.includes(path)) return { kind: "page", robots: robotsDirectiveForPath(path) };

  // Database-backed articles do not exist as build-time files. The edge
  // Worker renders their public HTML and metadata from the API response.
  if (blogMatch) {
    return { kind: "blog", language: blogMatch[1] ? "en" : "ro", slug: blogMatch[2] };
  }

  if (isNoindexPath(path)) return { kind: "page", robots: robotsDirectiveForPath(path) };

  // Known private/app routes that are not prerendered still serve the SPA shell.
  return { kind: "page", robots: "noindex, nofollow" };
}

/** Routes that exist in the SPA router but are not prerendered (auth, dashboard…). */
export const SPA_ONLY_PREFIXES = [
  "/s",
  "/auth",
  "/autentificare",
  "/forgot-password",
  "/reset-password",
  "/profil",
  "/finance",
  "/intern",
  "/unsubscribe",
  "/offline",
];

export function isKnownSpaRoute(path: string): boolean {
  return SPA_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
