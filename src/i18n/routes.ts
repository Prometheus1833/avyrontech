import type { Lang } from "./translations";
import { FEATURES } from "../config/features";
import { alternatePath as produseAlternate } from "../features/produse/lib/paths";
import { produseRoutePairs } from "../features/produse/data/routes";

/**
 * Language-prefixed routes for SEO.
 * RO is canonical at the root; EN lives under /en/*.
 * Only pages fully translated are included here.
 */
export const ROUTE_ALTERNATES: Array<{ ro: string; en: string }> = [
  { ro: "/", en: "/en" },
  { ro: "/servicii", en: "/en/services" },
  { ro: "/despre-noi", en: "/en/about" },
  { ro: "/portofoliu", en: "/en/portfolio" },
  { ro: "/termeni", en: "/en/terms" },
  { ro: "/politica-cookies", en: "/en/cookie-policy" },
  { ro: "/servicii/website-prezentare-profesional", en: "/en/services/professional-presentation-website" },
  { ro: "/servicii/creare-logo-3d-dinamic-cinematic", en: "/en/services/cinematic-dynamic-3d-logo-design" },
  { ro: "/servicii/creare-logo-3d-dinamic-cinematic/creeaza", en: "/en/services/cinematic-dynamic-3d-logo-design/create" },
  { ro: "/servicii/identitate-social-media", en: "/en/services/social-media-identity" },
  { ro: "/servicii/magazin-online", en: "/en/services/online-store" },
  { ro: "/servicii/blog-profesional", en: "/en/services/professional-blog" },
  { ro: "/mentenanta-si-colaborari", en: "/en/maintenance-and-partnerships" },
  { ro: "/servicii/aplicatii-si-platforme", en: "/en/services/apps-and-platforms" },
  { ro: "/servicii/automatizari-si-ai", en: "/en/services/automation-and-ai" },
  { ro: "/servicii/qa-testing-web-mobile", en: "/en/services/web-mobile-qa-testing" },
  // Biblioteca este publică; VITE_BIBLIOTECA=0 rămâne kill switch de urgență.
  ...(FEATURES.bibliotecaLive
    ? [{ ro: "/biblioteca", en: "/en/library" }]
    : []),
  // Produse Avyron este public implicit; VITE_PRODUSE_LIVE=0 îl poate retrage.
  ...(FEATURES.produseLive ? produseRoutePairs() : []),
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
  if (!match) return produseAlternate(pathname, target);
  return target === "en" ? match.en : match.ro;
}

/** For a given canonical RO path, return both RO and EN URLs. */
export function getAlternatesFor(roPath: string): { ro: string; en: string } | null {
  const match = ROUTE_ALTERNATES.find((r) => r.ro === roPath);
  return match ? { ro: match.ro, en: match.en } : null;
}
