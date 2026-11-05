import { SERVICE_ROUTES } from "../data/serviceRoutes";
export const SERVICE_PAGES = [
  {
    key: "overview",
    name: "Toate serviciile",
    ...SERVICE_ROUTES.home,
  },
  {
    key: "premium-website",
    name: "Site Prezentare Profesional",
    ...SERVICE_ROUTES.website,
  },
  {
    key: "online-store",
    name: "Magazin Online",
    ...SERVICE_ROUTES.onlineStore,
  },
  {
    key: "apps",
    name: "Aplicații Web și Mobile",
    ...SERVICE_ROUTES.apps,
  },
  {
    key: "ai-agent",
    name: "Agenți AI personalizați",
    ...SERVICE_ROUTES.automationAi,
  },
  {
    key: "seo-ai",
    name: "SEO & AI Performance and Visibility",
    ...SERVICE_ROUTES.seoAi,
  },
  {
    key: "marketing-ads",
    name: "Digital Marketing & Ads",
    ...SERVICE_ROUTES.digitalMarketing,
  },
  {
    key: "logo-3d",
    name: "Logo Profesional 3D",
    ...SERVICE_ROUTES.logo3d,
  },
  {
    key: "blog-profesional",
    name: "Blog profesional",
    ...SERVICE_ROUTES.professionalBlog,
  },
  {
    key: "social-identity",
    name: "Identitate Social Media",
    ...SERVICE_ROUTES.socialIdentity,
  },
  {
    key: "qa-testing",
    name: "Testare QA Web & Mobile",
    ...SERVICE_ROUTES.qa,
  },
  {
    key: "audit",
    name: "Audit Produs Digital",
    ro: `${SERVICE_ROUTES.home.ro}#audit`,
    en: `${SERVICE_ROUTES.home.en}#audit`,
  },
] as const;
export type ServicePageKey = (typeof SERVICE_PAGES)[number]["key"];
export type ServiceTextValues = Record<string, string>;
const protectedKeys = new Set([
  "id",
  "key",
  "sku",
  "slug",
  "path",
  "paths",
  "href",
  "url",
  "src",
  "icon",
  "accent",
  "analytics",
  "color",
  "className",
  "class",
  "segment",
  "concept",
  "value",
  "type",
  "tier",
]);
export function serviceTextFields(
  source: unknown,
  prefix: string,
): ServiceTextValues {
  const fields: ServiceTextValues = {};
  const visit = (value: unknown, path: string) => {
    if (typeof value === "string") {
      if (value.trim() && !/^(?:https?:|\/|#|mailto:|tel:|data:)/i.test(value))
        fields[path] = value;
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}.${index}`));
      return;
    }
    if (value && typeof value === "object")
      for (const [key, child] of Object.entries(value)) {
        if (
          !(path === "service" && key === "category") &&
          (!protectedKeys.has(key) ||
            (key === "value" && /\.heroStats\.\d+$/.test(path))) &&
          !/^(?:price|amount|currency|discount|ron$|eur$)/i.test(key)
        )
          visit(child, `${path}.${key}`);
      }
  };
  visit(source, prefix);
  return fields;
}
export function applyServiceText<T>(
  source: T,
  prefix: string,
  values: ServiceTextValues,
): T {
  const allowed = serviceTextFields(source, prefix);
  const visit = (value: unknown, path: string): unknown => {
    if (typeof value === "string")
      return Object.prototype.hasOwnProperty.call(allowed, path) &&
        Object.prototype.hasOwnProperty.call(values, path)
        ? values[path]
        : value;
    if (Array.isArray(value))
      return value.map((item, index) => visit(item, `${path}.${index}`));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          protectedKeys.has(key) &&
          !Object.prototype.hasOwnProperty.call(allowed, `${path}.${key}`)
            ? item
            : visit(item, `${path}.${key}`),
        ]),
      );
    return value;
  };
  return visit(source, prefix) as T;
}
