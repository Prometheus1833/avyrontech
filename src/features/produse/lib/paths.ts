import type { Lang } from "../../../i18n/translations";
import { TYPES, TYPE_BY_ID } from "../data/taxonomy";
import { PRODUSE_COLLECTION_SEGMENTS } from "../data/routes";
import type { CatalogItem, ItemType } from "../data/types";

/**
 * Rutele canonice ale catalogului de produse digitale reutilizabile.
 * Serviciile personalizate au namespace separat, sub `/servicii`.
 */
export const BASE: Record<Lang, string> = { ro: "/produse", en: "/en/products" };

export const SPECIAL = {
  guide: { ro: "ghid", en: "guide" },
  faq: { ro: "intrebari-frecvente", en: "faq" },
  /** Prefixul colecțiilor: /produse/colectii/<segment>. */
  collections: { ro: "colectii", en: "collections" },
} as const;

export const homePath = (lang: Lang) => BASE[lang];

export const typePath = (lang: Lang, type: ItemType) => `${BASE[lang]}/${TYPE_BY_ID.get(type)!.seg[lang]}`;

export const itemPath = (lang: Lang, item: Pick<CatalogItem, "type" | "slug">) =>
  `${typePath(lang, item.type)}/${item.slug}`;

export const guidePath = (lang: Lang, anchor?: string) =>
  `${BASE[lang]}/${SPECIAL.guide[lang]}${anchor ? `#${anchor}` : ""}`;

export const faqPath = (lang: Lang) => `${BASE[lang]}/${SPECIAL.faq[lang]}`;

export const collectionsPath = (lang: Lang) => `${BASE[lang]}/${SPECIAL.collections[lang]}`;

export const collectionPath = (lang: Lang, collection: { seg: { ro: string; en: string } }) =>
  `${collectionsPath(lang)}/${collection.seg[lang]}`;

export type ParsedRoute =
  | { kind: "home" }
  | { kind: "type"; type: ItemType }
  | { kind: "item"; type: ItemType; slug: string }
  | { kind: "guide" }
  | { kind: "faq" }
  | { kind: "collections" }
  | { kind: "collection"; seg: string }
  | { kind: "missing" };

/** Transformă un pathname în ce trebuie randat. Tolerant la slash final. */
export function parseRoute(pathname: string, lang: Lang): ParsedRoute {
  const base = BASE[lang];
  const rest = pathname.replace(/\/+$/, "").slice(base.length).split("/").filter(Boolean);
  if (rest.length === 0) return { kind: "home" };
  if (rest.length === 1 && rest[0] === SPECIAL.guide[lang]) return { kind: "guide" };
  if (rest.length === 1 && rest[0] === SPECIAL.faq[lang]) return { kind: "faq" };
  if (rest[0] === SPECIAL.collections[lang]) {
    if (rest.length === 1) return { kind: "collections" };
    if (rest.length === 2) return { kind: "collection", seg: rest[1] };
    return { kind: "missing" };
  }
  const type = TYPES.find((t) => t.seg[lang] === rest[0]);
  if (!type) return { kind: "missing" };
  if (rest.length === 1) return { kind: "type", type: type.id };
  if (rest.length === 2) return { kind: "item", type: type.id, slug: rest[1] };
  return { kind: "missing" };
}

/** Limba unei rute a paginii, sau null dacă ruta nu ține de Produse Avyron. */
export function langOfPath(pathname: string): Lang | null {
  if (pathname === BASE.en || pathname.startsWith(`${BASE.en}/`)) return "en";
  if (pathname === BASE.ro || pathname.startsWith(`${BASE.ro}/`)) return "ro";
  return null;
}

/** Echivalentul unei rute în cealaltă limbă — folosit de comutatorul RO/EN. */
export function alternatePath(pathname: string, target: Lang): string | null {
  const from = langOfPath(pathname);
  if (!from) return null;
  const route = parseRoute(pathname, from);
  switch (route.kind) {
    case "guide":
      return guidePath(target);
    case "faq":
      return faqPath(target);
    case "type":
      return typePath(target, route.type);
    case "item":
      return itemPath(target, { type: route.type, slug: route.slug });
    case "collections":
      return collectionsPath(target);
    case "collection": {
      const segment = PRODUSE_COLLECTION_SEGMENTS.find((entry) => entry[from] === route.seg);
      return segment ? `${collectionsPath(target)}/${segment[target]}` : collectionsPath(target);
    }
    default:
      return homePath(target);
  }
}
