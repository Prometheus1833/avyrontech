/**
 * Single source of truth for the SEO surface of the site.
 * Used by the prerender script, the Cloudflare Worker and the tests.
 * Keep it dependency-light: the Worker bundles this file.
 */

import { ROUTE_ALTERNATES } from "../i18n/routes";
import { BLOG_SLUGS } from "../data/blogSlugs";

/** Example demo slugs — mirrored from src/examples/registry.tsx (asserted in tests). */
export const EXAMPLE_SLUGS = [
  "cofetariadulcedor.ro",
  "studiomaradesign.ro",
  "pensiuneacerbul.ro",
];

/** Standalone public routes that have no RO/EN pair. */
export const STANDALONE_PUBLIC_ROUTES = [
  "/gdpr",
  "/en/privacy",
  "/blog",
  "/en/blog",
  ...BLOG_SLUGS.flatMap((slug) => [`/blog/${slug}`, `/en/blog/${slug}`]),
  "/exemple/flawlesstudio",
  "/exemple/retuvo",
  ...EXAMPLE_SLUGS.map((s) => `/examples/${s}`),
];

/** Every canonical public route that must be prerendered as indexable HTML. */
export const PRERENDER_ROUTES: string[] = [
  ...ROUTE_ALTERNATES.flatMap((r) => [r.ro, r.en]),
  ...STANDALONE_PUBLIC_ROUTES,
];

/**
 * Non-indexable pages that are still prerendered so the Worker can serve them
 * with the right HTTP status (they carry robots noindex).
 */
export const STATUS_PAGES: Array<{ route: string; file: string; status: number }> = [
  { route: "/404", file: "404.html", status: 404 },
  { route: "/403", file: "403.html", status: 403 },
  { route: "/500", file: "500.html", status: 500 },
  { route: "/mentenanta", file: "mentenanta.html", status: 503 },
];

/** Permanent redirects for legacy URLs (301, query string preserved). */
export const REDIRECTS: Record<string, string> = {
  "/costuri": "/costurisiproduse",
  "/despre": "/despre-si-portofoliu",
  "/noutati": "/blog",
  "/produse/audit-website": "/?request=audit#cta",
  "/en/products/website-audit": "/en?request=audit#cta",
};

/** Private / auth / error areas: never indexed (X-Robots-Tag: noindex, nofollow). */
export const NOINDEX_PREFIXES = [
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/profil",
  "/intern",
  "/unsubscribe",
  "/offline",
  "/403",
  "/500",
  "/mentenanta",
  "/404",
];

export function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
