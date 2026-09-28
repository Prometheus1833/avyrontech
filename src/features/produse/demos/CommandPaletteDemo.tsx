import { useEffect, useMemo, useRef, useState } from "react";
import type { DemoProps } from "./registry";

/** Paletă ⌘K de sine stătătoare, cu grupuri, scurtături și navigare la taste. */
type Entry = { id: string; label: string; group: string; shortcut?: string };

const DATA: Record<"ro" | "en", Entry[]> = {
  ro: [
    { id: "1", label: "Deschide proiectul", group: "Navigare", shortcut: "P" },
    { id: "2", label: "Caută în facturi", group: "Navigare", shortcut: "F" },
    { id: "3", label: "Adaugă client nou", group: "Acțiuni", shortcut: "C" },
    { id: "4", label: "Trimite oferta", group: "Acțiuni" },
    { id: "5", label: "Comută tema", group: "Setări", shortcut: "T" },
    { id: "6", label: "Invită un coleg", group: "Setări" },
  ],
  en: [
    { id: "1", label: "Open project", group: "Navigate", shortcut: "P" },
    { id: "2", label: "Search invoices", group: "Navigate", shortcut: "F" },
    { id: "3", label: "Add new client", group: "Actions", shortcut: "C" },
    { id: "4", label: "Send the quote", group: "Actions" },
    { id: "5", label: "Toggle theme", group: "Settings", shortcut: "T" },
    { id: "6", label: "Invite a colleague", group: "Settings" },
  ],
};

export default function CommandPaletteDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const results = useMemo(() => {
    const q = fold(query.trim());
    return DATA[ro ? "ro" : "en"].filter((entry) => !q || fold(entry.label).includes(q));
  }, [query, ro]);

  useEffect(() => setCursor(0), [query]);

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    }
    if (event.key === "Enter" && results[cursor]) setPicked(results[cursor].label);
  };

  const groups = [...new Set(results.map((entry) => entry.group))];

  return (
    <div className="grid h-full w-full place-items-center p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/12 bg-[#0d0f18]/95 shadow-[0_30px_70px_-40px_rgba(0,0,0,.9)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
          <span aria-hidden className="text-white/40">
            ⌘K
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder={ro ? "Scrie o comandă…" : "Type a command…"}
            aria-label={ro ? "Comandă" : "Command"}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>
        <div className="max-h-[190px] overflow-y-auto p-1.5">
          {groups.map((group) => (
            <div key={group}>
              <p className="pa-mono px-2 pb-1 pt-2 text-[9.5px] uppercase tracking-[0.18em] text-white/35">{group}</p>
              {results
                .filter((entry) => entry.group === group)
                .map((entry) => {
                  const index = results.indexOf(entry);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => setPicked(entry.label)}
                      className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[13px] text-white/85 transition ${index === cursor ? "bg-white/10" : ""}`}
                    >
                      <span className="flex-1">{entry.label}</span>
                      {entry.shortcut && <kbd className="pa-mono rounded border border-white/15 px-1.5 text-[10px] text-white/50">{entry.shortcut}</kbd>}
                    </button>
                  );
                })}
            </div>
          ))}
          {results.length === 0 && <p className="px-3 py-6 text-center text-xs text-white/45">{ro ? "Nimic găsit" : "Nothing found"}</p>}
        </div>
        {picked && (
          <p className="border-t border-white/10 px-3 py-2 text-[11.5px] text-lime-300">
            {ro ? "Ai executat:" : "You ran:"} {picked}
          </p>
        )}
      </div>
    </div>
  );
}
