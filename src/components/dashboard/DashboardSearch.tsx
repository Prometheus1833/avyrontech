import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import type { Access, SectionId } from "@/lib/access";
import {
  dashboardCommands,
  rankDashboardCommands,
} from "@/lib/dashboardSearch";
import {
  DASHBOARD_GROUP_LABELS,
  DASHBOARD_SECTION_META,
} from "./dashboardNavigation";
type Props = {
  access: Access;
  userId: string;
  current: SectionId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: SectionId, params?: Record<string, string>) => void;
  inputRef: RefObject<HTMLInputElement>;
};
export default function DashboardSearch({
  access,
  userId,
  current,
  open,
  onOpenChange,
  onNavigate,
  inputRef,
}: Props) {
  const [query, setQuery] = useState(""),
    [active, setActive] = useState(0),
    [recent, setRecent] = useState<string[]>([]),
    [position, setPosition] = useState<{
      top: number;
      left: number;
      width: number;
      maxHeight: number;
    } | null>(null);
  const root = useRef<HTMLDivElement>(null),
    panel = useRef<HTMLDivElement>(null),
    listId = useId(),
    hintId = useId();
  const storageKey = `avyron-os-search-recent:${userId}`;
  const commands = useMemo(() => dashboardCommands(access), [access]);
  const results = useMemo(
    () => rankDashboardCommands(commands, query, recent, current),
    [commands, query, recent, current],
  );
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setRecent(
        Array.isArray(value)
          ? value.filter((v): v is string => typeof v === "string").slice(0, 5)
          : [],
      );
    } catch {
      setRecent([]);
    }
    setQuery("");
  }, [storageKey]);
  useEffect(() => {
    setActive(0);
  }, [query]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setActive(0);
  }, [open, inputRef]);
  useEffect(() => {
    if (!open) return;
    const layout = () => {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const bottom = viewport
        ? viewport.height + viewport.offsetTop
        : window.innerHeight;
      const width = Math.min(480, window.innerWidth - 24);
      setPosition({
        top: rect.bottom + 6,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        width,
        maxHeight: Math.max(100, Math.min(420, bottom - rect.bottom - 18)),
      });
    };
    const outside = (event: PointerEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !panel.current?.contains(event.target as Node)
      )
        onOpenChange(false);
    };
    const focus = (event: FocusEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !panel.current?.contains(event.target as Node)
      )
        onOpenChange(false);
    };
    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("scroll", layout, true);
    window.visualViewport?.addEventListener("resize", layout);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focus);
    return () => {
      window.removeEventListener("resize", layout);
      window.removeEventListener("scroll", layout, true);
      window.visualViewport?.removeEventListener("resize", layout);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focus);
    };
  }, [open, onOpenChange]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, listId]);
  const choose = (index: number) => {
    const command = results[index];
    if (!command) return;
    const next = [
      command.key,
      ...recent.filter((v) => v !== command.key),
    ].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Navigation remains available without browser storage. */
    }
    onNavigate(command.section, command.params);
    onOpenChange(false);
    setQuery("");
    inputRef.current?.blur();
  };
  return (
    <div ref={root} className="relative min-w-0 flex-1 lg:max-w-xl">
      <div className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-2.5 focus-within:border-violet-400/50 focus-within:ring-2 focus-within:ring-violet-400/20">
        <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
        <input
          id="dashboard-search"
          ref={inputRef}
          role="combobox"
          aria-label={
            access.isClient
              ? "Caută secțiuni din cont"
              : "Caută secțiuni și fluxuri"
          }
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={
            open && results[active] ? `${listId}-${active}` : undefined
          }
          aria-describedby={open ? hintId : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onFocus={() => onOpenChange(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onOpenChange(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onOpenChange(false);
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              onOpenChange(true);
              setActive(
                (index) =>
                  (index + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
                  Math.max(1, results.length),
              );
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              choose(active);
            }
          }}
          placeholder="Caută secțiuni…"
          className="w-full min-w-0 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-400 md:text-sm"
        />
        {query ? (
          <button
            type="button"
            aria-label="Șterge căutarea"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="grid size-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white/5"
          >
            <X size={14} />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 xl:inline">
            ⌘K
          </kbd>
        )}
      </div>
      {open &&
        position &&
        createPortal(
          <div
            ref={panel}
            className="z-[60] flex flex-col overflow-hidden rounded-2xl border border-violet-400/25 bg-[#0b1120] text-slate-100 shadow-2xl"
            style={{ position: "fixed", ...position }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
              <p className="text-xs text-slate-300">
                {query.trim() ? "Sugestii pentru căutare" : "Acces rapid"}
              </p>
              <button
                type="button"
                aria-label="Închide sugestiile"
                onClick={() => onOpenChange(false)}
                className="grid size-7 place-items-center rounded-md hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>
            <div
              id={listId}
              role="listbox"
              aria-label="Sugestii de navigare"
              className="min-h-0 overflow-y-auto overscroll-contain p-1.5"
            >
              {results.map((command, index) => {
                const Icon = DASHBOARD_SECTION_META[command.section].icon;
                return (
                  <button
                    id={`${listId}-${index}`}
                    key={command.key}
                    type="button"
                    role="option"
                    aria-selected={active === index}
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onPointerMove={() => setActive(index)}
                    onClick={() => choose(index)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ${active === index ? "bg-violet-500/20" : "hover:bg-white/5"}`}
                  >
                    <Icon className="size-4 shrink-0 text-violet-300" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {command.label}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {command.hint}
                      </span>
                    </span>
                    <span className="hidden text-[10px] text-slate-400 sm:inline">
                      {DASHBOARD_GROUP_LABELS[command.group]}
                    </span>
                  </button>
                );
              })}
              {!results.length && (
                <p role="status" className="p-4 text-sm text-slate-400">
                  Nicio secțiune potrivită. Încearcă un nume sau un serviciu.
                </p>
              )}
            </div>
            <p
              id={hintId}
              className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] text-slate-400"
            >
              ↑ ↓ selectare · Enter deschide · Esc închide
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}
