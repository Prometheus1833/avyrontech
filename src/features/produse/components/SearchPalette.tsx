import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { ITEMS } from "../data/items";
import { ACCESS_LABEL, TYPE_BY_ID } from "../data/taxonomy";
import { itemPath } from "../lib/paths";
import { searchItems } from "../lib/search";
import { store, useProduseStore } from "../lib/store";

/**
 * Paleta ⌘K. Aceeași căutare locală ca bara din pagină, cu navigare din
 * tastatură și istoric recent. Deschiderea mută focusul în câmp și îl
 * întoarce la elementul anterior la închidere.
 */
export default function SearchPalette({ lang, onClose, onPick }: { lang: Lang; onClose: () => void; onPick: (path: string) => void }) {
  const ro = lang === "ro";
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = useProduseStore((s) => s.recent);

  const results = useMemo(() => (query.trim() ? searchItems(query).slice(0, 8) : ITEMS.filter((i) => i.status === "popular" || i.status === "new").slice(0, 6)), [query]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((c) => Math.min(results.length - 1, c + 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      }
      if (event.key === "Enter" && results[cursor]) {
        store.pushRecent(query);
        onPick(itemPath(lang, results[cursor]));
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [results, cursor, query, lang, onClose, onPick]);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="pa-glass pa-edge w-full max-w-lg overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ro ? "Căutare în catalog" : "Search the catalogue"}
      >
        <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="pa-search-results"
            placeholder={ro ? "Caută componente, secțiuni, unelte…" : "Search components, sections, tools…"}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <kbd className="pa-mono rounded border border-foreground/15 px-1.5 py-0.5 text-[10px] text-muted-foreground">esc</kbd>
        </div>

        <ul id="pa-search-results" className="max-h-[52vh] list-none overflow-y-auto p-1.5" role="listbox">
          {results.map((item, index) => (
            <li key={item.slug} role="option" aria-selected={index === cursor}>
              <button
                type="button"
                onMouseEnter={() => setCursor(index)}
                onClick={() => {
                  store.pushRecent(query);
                  onPick(itemPath(lang, item));
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${index === cursor ? "bg-foreground/[0.07]" : ""}`}
              >
                <span aria-hidden className="size-7 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, hsl(${item.hue} 85% 55%), hsl(${(item.hue + 40) % 360} 85% 45%))` }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-foreground">{item.name[lang]}</span>
                  <span className="pa-mono block truncate text-[10.5px] uppercase tracking-wide text-muted-foreground">
                    {TYPE_BY_ID.get(item.type)!.name[lang]} · {ACCESS_LABEL[item.access][lang]}
                  </span>
                </span>
                {index === cursor && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">{ro ? "Niciun rezultat. Încearcă „hero”, „toast” sau „particule”." : "No results. Try “hero”, “toast” or “particles”."}</li>
          )}
        </ul>

        {!query && recent.length > 0 && (
          <div className="border-t border-foreground/10 px-4 py-2.5">
            <p className="pa-mono mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{ro ? "Căutări recente" : "Recent searches"}</p>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((entry) => (
                <button key={entry} type="button" onClick={() => setQuery(entry)} className="rounded-full border border-foreground/12 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">
                  {entry}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
