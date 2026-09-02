import { ListTree, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

export interface QuickNavItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface Props {
  items: QuickNavItem[];
}

/**
 * Floating liquid-glass mini menu (top-right) with on-page section anchors.
 * Highlights the section currently in view via IntersectionObserver.
 */
const QuickNav = ({ items }: Props) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [present, setPresent] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const { lang } = useLang();
  const ro = lang === "ro";

  // Keep only anchors that really exist on the page (relevant buttons only).
  useEffect(() => {
    const sync = () => {
      const found = items.filter(({ id }) => document.getElementById(id)).map((i) => i.id);
      setPresent((prev) => (prev.join("|") === found.join("|") ? prev : found));
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [items]);

  const visibleItems = items.filter((i) => present.includes(i.id));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    present.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [present]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Not worth a floating menu for one or two sections.
  if (visibleItems.length < 3) return null;


  const menuLabel = ro ? "Cuprinsul paginii" : "On this page";
  const toggleLabel = open
    ? ro ? "Închide cuprinsul paginii" : "Close page contents"
    : ro ? "Deschide cuprinsul paginii" : "Open page contents";

  return (
    <div
      ref={rootRef}
      className="fixed right-3 top-20 z-40 sm:right-4 md:top-24"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="quick-nav-panel"
        aria-label={toggleLabel}
        title={menuLabel}
        className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 bg-background/60 shadow-elev backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-brand/40 hover:bg-background/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background before:pointer-events-none before:absolute before:inset-px before:rounded-full before:bg-gradient-to-b before:from-foreground/10 before:to-transparent"
      >
        {open ? (
          <X className="size-4.5 text-foreground/80" aria-hidden="true" focusable="false" />
        ) : (
          <ListTree
            className="size-4.5 text-foreground/70 transition-colors group-hover:text-brand"
            aria-hidden="true"
            focusable="false"
          />
        )}
        <span className="sr-only">{menuLabel}</span>
      </button>

      {open && (
        <nav
          id="quick-nav-panel"
          aria-label={menuLabel}
          className="absolute right-0 mt-2 w-56 origin-top-right animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 rounded-2xl border border-foreground/15 bg-background/70 p-2 shadow-elev backdrop-blur-xl"
        >
          <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
            {menuLabel}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const isActive = active === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "location" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${
                      isActive
                        ? "bg-brand/10 text-brand"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-4 w-1 rounded-full transition-all duration-300 ${
                        isActive ? "bg-gradient-to-b from-brand to-brand-2" : "bg-foreground/15"
                      }`}
                    />
                    {Icon && <Icon className="size-3.5 shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default QuickNav;
