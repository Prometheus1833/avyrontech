import MiniSearch from "minisearch";
import type { Lang } from "@/i18n/translations";
import { ITEMS } from "../data/items";
import { CATEGORIES, TECH_LABEL, TYPE_BY_ID } from "../data/taxonomy";
import type { CatalogItem } from "../data/types";

/**
 * Căutarea paginii. Indexul se construiește o singură dată, în memorie, din
 * catalog — ~50 de produse încap în câțiva kB, deci nu avem nevoie de server.
 *
 * Plierea diacriticelor e făcută în `processTerm`: „animatie”, „animație” și
 * „ANIMAȚIE” dau același termen. Ambele limbi sunt indexate mereu, pentru că
 * un freelancer român caută des în engleză („hero”, „toast”, „loader”).
 */

export const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .toLowerCase();

type Doc = {
  id: string;
  name: string;
  short: string;
  keywords: string;
  meta: string;
};

let index: MiniSearch<Doc> | null = null;

function build(): MiniSearch<Doc> {
  const search = new MiniSearch<Doc>({
    fields: ["name", "keywords", "meta", "short"],
    storeFields: ["id"],
    processTerm: (term) => {
      const folded = fold(term);
      return folded.length > 1 ? folded : null;
    },
    searchOptions: {
      boost: { name: 4, keywords: 3, meta: 2, short: 1 },
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      combineWith: "AND",
    },
  });

  search.addAll(
    ITEMS.map((item) => {
      const type = TYPE_BY_ID.get(item.type)!;
      const category = CATEGORIES[item.category];
      return {
        id: item.slug,
        name: `${item.name.ro} ${item.name.en}`,
        short: `${item.short.ro} ${item.short.en}`,
        keywords: [...item.keywords.ro, ...item.keywords.en].join(" "),
        meta: [
          type.name.ro,
          type.name.en,
          type.plural.ro,
          type.plural.en,
          category?.ro,
          category?.en,
          ...item.tech.map((tech) => TECH_LABEL[tech]),
          item.access,
          item.access === "free" ? "gratuit gratis free" : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    }),
  );
  return search;
}

const BY_SLUG = new Map(ITEMS.map((item) => [item.slug, item]));

/** Caută în catalog. Dacă „AND” nu găsește nimic, relaxăm la „OR”. */
export function searchItems(query: string): CatalogItem[] {
  const q = query.trim();
  if (!q) return [];
  index ??= build();
  let hits = index.search(q);
  if (hits.length === 0) hits = index.search(q, { combineWith: "OR" });
  return hits.map((hit) => BY_SLUG.get(String(hit.id))).filter((item): item is CatalogItem => Boolean(item));
}

/** Sugestii pentru completarea automată. */
export function suggest(query: string, lang: Lang, limit = 5): string[] {
  const q = query.trim();
  if (q.length < 2) return [];
  index ??= build();
  return index
    .autoSuggest(q, { fuzzy: 0.2 })
    .slice(0, limit)
    .map((s) => s.suggestion)
    .filter((s) => s !== fold(q))
    .map((s) => (lang === "ro" ? s : s));
}
