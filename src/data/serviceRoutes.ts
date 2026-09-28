/**
 * Canonical public paths for Avyron services.
 *
 * Services are bespoke client engagements. Reusable digital products live in
 * the separate `/produse` catalog and must never reuse these URLs.
 */
export const SERVICE_ROUTES = {
  home: { ro: "/servicii", en: "/en/services" },
  website: {
    ro: "/servicii/website-prezentare-profesional",
    en: "/en/services/professional-presentation-website",
  },
  logo3d: {
    ro: "/servicii/creare-logo-3d-dinamic-cinematic",
    en: "/en/services/cinematic-dynamic-3d-logo-design",
  },
  logoStudio: {
    ro: "/servicii/creare-logo-3d-dinamic-cinematic/creeaza",
    en: "/en/services/cinematic-dynamic-3d-logo-design/create",
  },
  socialIdentity: {
    ro: "/servicii/identitate-social-media",
    en: "/en/services/social-media-identity",
  },
  onlineStore: {
    ro: "/servicii/magazin-online",
    en: "/en/services/online-store",
  },
  professionalBlog: {
    ro: "/servicii/blog-profesional",
    en: "/en/services/professional-blog",
  },
  apps: {
    ro: "/servicii/aplicatii-si-platforme",
    en: "/en/services/apps-and-platforms",
  },
  automationAi: {
    ro: "/servicii/automatizari-si-ai",
    en: "/en/services/automation-and-ai",
  },
  qa: {
    ro: "/servicii/qa-testing-web-mobile",
    en: "/en/services/web-mobile-qa-testing",
  },
  audit: {
    ro: "/servicii/audit-website",
    en: "/en/services/website-audit",
  },
} as const;

export type ServiceRouteKey = keyof typeof SERVICE_ROUTES;
