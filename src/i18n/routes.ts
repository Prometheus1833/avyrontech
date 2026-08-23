import type { Lang } from "./translations";

/**
 * Language-prefixed routes for SEO.
 * RO is canonical at the root; EN lives under /en/*.
 * Only pages fully translated are included here.
 */
export const ROUTE_ALTERNATES: Array<{ ro: string; en: string }> = [
  { ro: "/", en: "/en" },
  { ro: "/costurisiproduse", en: "/en/pricing" },
  { ro: "/despre-si-portofoliu", en: "/en/about" },
  { ro: "/blog", en: "/en/blog" },
  { ro: "/gdpr", en: "/en/privacy" },
  { ro: "/produse/website-prezentare-premium", en: "/en/products/premium-presentation-website" },
  { ro: "/produse/identitate-social-media", en: "/en/products/social-media-identity" },
  { ro: "/produse/magazin-online", en: "/en/products/online-store" },
  { ro: "/produse/aplicatii-web-si-mobile", en: "/en/products/web-and-mobile-apps" },
  { ro: "/produse/agent-ai-personalizat", en: "/en/products/personalized-ai-agent" },
  { ro: "/produse/audit-website", en: "/en/products/website-audit" },
];

export function getLangFromPath(pathname: string): Lang {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return "ro";
}

/** Given a current pathname, return the equivalent in the target language, or null if none. */
export function getAlternateForPath(pathname: string, target: Lang): string | null {
  const match = ROUTE_ALTERNATES.find(
    (r) => r.ro === pathname || r.en === pathname,
  );
  if (!match) return null;
  return target === "en" ? match.en : match.ro;
}

/** For a given canonical RO path, return both RO and EN URLs. */
export function getAlternatesFor(roPath: string): { ro: string; en: string } | null {
  const match = ROUTE_ALTERNATES.find((r) => r.ro === roPath);
  return match ? { ro: match.ro, en: match.en } : null;
}
