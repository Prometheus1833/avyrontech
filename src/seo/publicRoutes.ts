/**
 * Single source of truth for the SEO surface of the site.
 * Used by the prerender script, the Cloudflare Worker and the tests.
 * Keep it dependency-light: the Worker bundles this file.
 */

import { ROUTE_ALTERNATES } from "../i18n/routes";
import { BLOG_SLUGS } from "../data/blogSlugs";
import { INTERNATIONAL_PRODUCT_HUB_ROUTES } from "../features/produse/data/productLocales";

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
  ...INTERNATIONAL_PRODUCT_HUB_ROUTES,
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
  "/costuri": "/servicii",
  "/costurisiproduse": "/servicii",
  "/en/pricing": "/en/services",
  "/despre": "/despre-noi",
  "/despre-si-portofoliu": "/servicii/website-prezentare-profesional#portofoliu",
  "/portofoliu": "/servicii/website-prezentare-profesional#portofoliu",
  "/en/portfolio": "/en/services/professional-presentation-website#portofoliu",
  "/noutati": "/blog",
  "/produse/audit-website": "/?request=audit#cta",
  "/en/products/website-audit": "/en?request=audit#cta",
  "/servicii/audit-website": "/?request=audit#cta",
  "/en/services/website-audit": "/en?request=audit#cta",
  "/produse/website-prezentare-premium": "/servicii/website-prezentare-profesional",
  "/en/products/premium-presentation-website": "/en/services/professional-presentation-website",
  "/servicii/logo": "/servicii/creare-logo-3d-dinamic-cinematic",
  "/en/services/logo": "/en/services/cinematic-dynamic-3d-logo-design",
  "/servicii/logo/creeaza": "/servicii/creare-logo-3d-dinamic-cinematic/creeaza",
  "/en/services/logo/create": "/en/services/cinematic-dynamic-3d-logo-design/create",
  "/produse/identitate-social-media": "/servicii/identitate-social-media",
  "/en/products/social-media-identity": "/en/services/social-media-identity",
  "/produse/magazin-online": "/servicii/magazin-online",
  "/en/products/online-store": "/en/services/online-store",
  "/produse/blog-profesional": "/servicii/blog-profesional",
  "/en/products/professional-blog": "/en/services/professional-blog",
  "/produse/aplicatii-web-si-mobile": "/servicii/aplicatii-si-platforme",
  "/en/products/web-and-mobile-apps": "/en/services/apps-and-platforms",
  "/produse/agent-ai-personalizat": "/servicii/automatizari-si-ai",
  "/en/products/personalized-ai-agent": "/en/services/automation-and-ai",
  "/produse/testare-qa-web-mobile": "/servicii/qa-testing-web-mobile",
  "/en/products/qa-testing-web-mobile": "/en/services/web-mobile-qa-testing",
  "/pachete-mentenanta": "/mentenanta-si-colaborari",
  "/en/care-plans": "/en/maintenance-and-partnerships",
};

/** Legacy catalog namespaces; the complete suffix is preserved. */
export const PREFIX_REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  ["/produse-avyron", "/produse"],
  ["/en/avyron-products", "/en/products"],
];

export function redirectTarget(pathname: string): string | null {
  const exact = REDIRECTS[pathname];
  if (exact) return exact;
  for (const [legacy, canonical] of PREFIX_REDIRECTS) {
    if (pathname === legacy || pathname.startsWith(`${legacy}/`)) {
      return `${canonical}${pathname.slice(legacy.length)}`;
    }
  }
  return null;
}

/** Private / auth / error areas: never indexed (X-Robots-Tag: noindex, nofollow). */
export const NOINDEX_PREFIXES = [
  "/auth",
  "/autentificare",
  "/forgot-password",
  "/reset-password",
  "/profil",
  "/finance",
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
