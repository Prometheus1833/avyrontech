import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Search, X } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { ITEMS } from "../data/items";
import { ACCESS_LABEL, CATEGORIES, TECH_LABEL, TYPES } from "../data/taxonomy";
import type { Access, CatalogItem, ItemType, Tech } from "../data/types";
import { sortItems, type Sort } from "../lib/item";
import { typePath } from "../lib/paths";
import { searchItems } from "../lib/search";
import { store, useProduseStore } from "../lib/store";
import ItemCard from "./ItemCard";
import { Reveal } from "./Primitives";

/**
 * Răsfoirea catalogului: tab-uri pe tip, filtre pe tehnologie și acces,
 * sortare și căutare. Starea stă în URL-ul paginii curente doar prin tab
 * (rută proprie, bună pentru SEO); filtrele rămân locale, ca să nu producem
 * URL-uri duplicate pentru aceeași listă.
 */

const SORTS: Array<{ id: Sort; ro: string; en: string }> = [
  { id: "relevance", ro: "Recomandate", en: "Recommended" },
  { id: "new", ro: "Cele mai noi", en: "Newest" },
  { id: "popular", ro: "Populare", en: "Popular" },
  { id: "light", ro: "Cele mai ușoare", en: "Lightest" },
  { id: "price", ro: "Preț", en: "Price" },
];

const ACCESS: Access[] = ["free", "pro", "studio"];

export default function Catalog({
  lang,
  activeType,
  initialQuery = "",
  showTabs = true,
}: {
  lang: Lang;
  activeType?: ItemType;
  initialQuery?: string;
  showTabs?: boolean;
}) {
  const ro = lang === "ro";
  const [query, setQuery] = useState(initialQuery);
  const [tech, setTech] = useState<Tech | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState<Sort>("relevance");
  const [openFilters, setOpenFilters] = useState(false);
  const favorites = useProduseStore((s) => s.favorites);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  const counts = useMemo(() => {
    const map = new Map<ItemType, number>();
    for (const item of ITEMS) map.set(item.type, (map.get(item.type) ?? 0) + 1);
    return map;
  }, []);

  const results = useMemo(() => {
    let list: CatalogItem[] = query.trim() ? searchItems(query) : ITEMS;
    if (activeType) list = list.filter((item) => item.type === activeType);
    if (tech) list = list.filter((item) => item.tech.includes(tech));
    if (access) list = list.filter((item) => item.access === access);
    if (onlyFavorites) list = list.filter((item) => favorites.includes(item.slug));
    return query.trim() && sort === "relevance" ? list : sortItems(list, sort === "relevance" ? "popular" : sort);
  }, [query, activeType, tech, access, onlyFavorites, favorites, sort]);

  const techs = useMemo(() => {
    const set = new Set<Tech>();
    for (const item of ITEMS) item.tech.forEach((t) => set.add(t));
    return [...set];
  }, []);

  const activeFilters = (tech ? 1 : 0) + (access ? 1 : 0) + (onlyFavorites ? 1 : 0);

  return (
    <div>
      {showTabs && (
        <div className="pa-scroll-x sticky top-[4.6rem] z-30 -mx-4 mb-4 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
          <div className="pa-glass inline-flex min-w-full gap-1 rounded-2xl p-1 sm:min-w-0">
            <Link
              to={typePath(lang, "component").replace(/\/[^/]+$/, "")}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition ${
                activeType ? "text-muted-foreground hover:text-foreground" : "bg-gradient-to-br from-brand to-brand-2 text-white"
              }`}
            >
              {ro ? "Toate" : "All"} <span className="pa-mono opacity-60">{ITEMS.length}</span>
            </Link>
            {TYPES.filter((t) => t.id !== "logo").map((type) => (
              <Link
                key={type.id}
                to={typePath(lang, type.id)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  activeType === type.id ? "bg-gradient-to-br from-brand to-brand-2 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type.plural[lang]} <span className="pa-mono opacity-60">{counts.get(type.id) ?? 0}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="pa-glass flex min-w-[220px] flex-1 items-center gap-2 rounded-xl px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => store.pushRecent(query)}
            placeholder={ro ? "Caută: hero, toast, particule, CSV, login…" : "Search: hero, toast, particles, CSV, login…"}
            aria-label={ro ? "Caută în catalog" : "Search the catalogue"}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label={ro ? "Șterge căutarea" : "Clear search"} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpenFilters((v) => !v)}
          aria-expanded={openFilters}
          className="pa-glass inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-medium text-foreground"
        >
          <Filter className="size-3.5" aria-hidden />
          {ro ? "Filtre" : "Filters"}
          {activeFilters > 0 && <span className="pa-mono rounded-full bg-brand px-1.5 text-[10px] text-white">{activeFilters}</span>}
        </button>
        <label className="pa-glass inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px]">
          <span className="text-muted-foreground">{ro ? "Sortare" : "Sort"}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="bg-transparent text-foreground outline-none"
            aria-label={ro ? "Sortare" : "Sort"}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id} className="bg-background text-foreground">
                {ro ? s.ro : s.en}
              </option>
            ))}
          </select>
        </label>
      </div>

      {openFilters && (
        <div className="pa-glass mb-4 rounded-2xl p-3">
          <p className="pa-mono mb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{ro ? "Tehnologie" : "Technology"}</p>
          <div className="flex flex-wrap gap-1.5">
            {techs.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tech === t}
                onClick={() => setTech(tech === t ? null : t)}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] transition ${tech === t ? "border-brand bg-brand/15 text-foreground" : "border-foreground/10 text-muted-foreground hover:text-foreground"}`}
              >
                {TECH_LABEL[t]}
              </button>
            ))}
          </div>
          <p className="pa-mono mb-2 mt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{ro ? "Acces" : "Access"}</p>
          <div className="flex flex-wrap gap-1.5">
            {ACCESS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={access === a}
                onClick={() => setAccess(access === a ? null : a)}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] transition ${access === a ? "border-brand bg-brand/15 text-foreground" : "border-foreground/10 text-muted-foreground hover:text-foreground"}`}
              >
                {ACCESS_LABEL[a][lang]}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={onlyFavorites}
              onClick={() => setOnlyFavorites((v) => !v)}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] transition ${onlyFavorites ? "border-pink-400 bg-pink-400/15 text-foreground" : "border-foreground/10 text-muted-foreground hover:text-foreground"}`}
            >
              {ro ? `Colecția mea (${favorites.length})` : `My collection (${favorites.length})`}
            </button>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTech(null);
                  setAccess(null);
                  setOnlyFavorites(false);
                }}
                className="rounded-full px-2.5 py-1 text-[11.5px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {ro ? "Curăță filtrele" : "Clear filters"}
              </button>
            )}
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="pa-glass rounded-2xl p-6 text-center">
          <p className="text-sm text-foreground">{ro ? "Nu am găsit nimic pentru căutarea asta." : "Nothing matched that search."}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ro ? "Spune-ne ce cauți și îl construim — cererile cu cele mai multe voturi intră primele în lucru." : "Tell us what you need and we'll build it — the most-voted requests go first."}
          </p>
          <button
            type="button"
            onClick={() => {
              const target = document.getElementById("cerere");
              const input = document.getElementById("cerere-text") as HTMLTextAreaElement | null;
              target?.scrollIntoView({ behavior: "smooth", block: "center" });
              if (input) {
                input.value = query;
                input.focus();
              }
            }}
            className="mt-3 inline-flex rounded-full bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-xs font-semibold text-white"
            data-ripple
          >
            {ro ? "Solicită funcția" : "Request the feature"}
          </button>
        </div>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item, index) => (
            <Reveal as="li" key={item.slug} index={Math.min(index, 6)}>
              <ItemCard item={item} lang={lang} index={index} />
            </Reveal>
          ))}
        </ul>
      )}

      {!activeType && results.length > 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {ro ? `${results.length} produse afișate · ${ITEMS.filter((i) => i.access === "free").length} gratuite` : `${results.length} products shown · ${ITEMS.filter((i) => i.access === "free").length} free`}
        </p>
      )}
    </div>
  );
}
