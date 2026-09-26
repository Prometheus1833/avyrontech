import { useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: {
    go: "navighează",
    hint: "Apasă: pagina curentă se destramă în plăci, iar cea nouă e deja dedesubt. Fără flash alb, fără salt de scroll.",
    pages: [
      { eyebrow: "Pagina curentă", title: "Servicii", body: "Șase domenii, un singur mod de lucru." },
      { eyebrow: "Pagina următoare", title: "Portofoliu", body: "Proiecte livrate, cu rezultate măsurate." },
    ],
  },
  en: {
    go: "navigate",
    hint: "Press: the current page shatters into tiles while the next one is already underneath. No white flash, no scroll jump.",
    pages: [
      { eyebrow: "Current page", title: "Services", body: "Six domains, one way of working." },
      { eyebrow: "Next page", title: "Portfolio", body: "Delivered projects, with measured results." },
    ],
  },
};

const COLS = 8;
const ROWS = 5;

/**
 * PRZ-S4 — tranziție de pagină „cortină".
 *
 * Pagina veche se taie în plăci care se rotesc și se sting, plecând din
 * punctul apăsat. Pagina nouă e montată dedesubt din start, deci nu apare
 * niciodată fundalul alb al browserului și poziția de scroll rămâne stabilă.
 * Pe site, aceleași plăci se pun peste conținutul real al rutei.
 */
export default function CurtainTransition() {
  const { lang } = useLang();
  const t = COPY[lang];
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const tilesRef = useRef<HTMLDivElement | null>(null);

  const surface = (index: number) => {
    const copy = t.pages[index % 2];
    const hue = index % 2 === 0 ? 265 : 20;
    return (
      <div
        className="flex h-full w-full flex-col justify-end p-6"
        style={{
          background: `radial-gradient(120% 90% at 25% 15%, hsla(${hue},70%,38%,0.55), transparent 62%), radial-gradient(90% 80% at 80% 70%, hsla(${hue + 60},70%,32%,0.5), transparent 65%), #0a0c13`,
        }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{copy.eyebrow}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-white">{copy.title}</p>
        <p className="mt-1 text-sm text-white/60">{copy.body}</p>
      </div>
    );
  };

  const run = (event: React.MouseEvent<HTMLButtonElement>) => {
    const host = hostRef.current;
    const tiles = tilesRef.current;
    if (!host || !tiles || busy) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPage((p) => p + 1);
      return;
    }

    setBusy(true);
    const rect = host.getBoundingClientRect();
    const originX = ((event.clientX - rect.left) / rect.width) * COLS;
    const originY = ((event.clientY - rect.top) / rect.height) * ROWS;

    const children = Array.from(tiles.children) as HTMLElement[];
    let longest = 0;

    children.forEach((tile, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const distance = Math.hypot(col - originX, row - originY);
      const delay = distance * 46;
      longest = Math.max(longest, delay + 520);

      tile.animate(
        [
          { transform: "translate3d(0,0,0) rotate(0deg) scale(1)", opacity: 1 },
          {
            transform: `translate3d(${(col - originX) * 6}px, ${40 + distance * 8}px, 0) rotate(${(col - originX) * 3}deg) scale(0.82)`,
            opacity: 0,
          },
        ],
        { duration: 520, delay, easing: "cubic-bezier(0.55, 0, 0.35, 1)", fill: "forwards" },
      );
    });

    window.setTimeout(() => {
      setPage((p) => p + 1);
      for (const tile of children) tile.getAnimations().forEach((a) => a.cancel());
      setBusy(false);
    }, longest);
  };

  return (
    <div className="p-6">
      <div ref={hostRef} className="relative h-[240px] overflow-hidden rounded-lg border border-white/12">
        {/* Pagina următoare, montată dedesubt din start. */}
        <div className="absolute inset-0">{surface(page + 1)}</div>

        {/* Pagina curentă, tăiată în plăci. */}
        <div
          ref={tilesRef}
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
          key={page}
        >
          {Array.from({ length: COLS * ROWS }, (_, index) => {
            const col = index % COLS;
            const row = Math.floor(index / COLS);
            return (
              <div key={index} className="relative overflow-hidden will-change-transform">
                {/* Fiecare placă arată aceeași suprafață, decalată cu poziția ei. */}
                <div
                  className="absolute"
                  style={{
                    width: `${COLS * 100}%`,
                    height: `${ROWS * 100}%`,
                    left: `${-col * 100}%`,
                    top: `${-row * 100}%`,
                  }}
                >
                  {surface(page)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-full border border-white/25 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/80 transition-colors hover:border-white/60 hover:text-white disabled:opacity-40"
        >
          {t.go}
        </button>
        <p className="max-w-[46ch] text-xs text-white/45">{t.hint}</p>
      </div>
    </div>
  );
}
