import { useLayoutEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

type Item = { id: number; name: { ro: string; en: string }; group: string; price: string };

const GROUP_LABEL: Record<string, { ro: string; en: string }> = {
  toate: { ro: "toate", en: "all" },
  iluminat: { ro: "iluminat", en: "lighting" },
  mobilier: { ro: "mobilier", en: "furniture" },
  decor: { ro: "decor", en: "decor" },
};

const ITEMS: Item[] = [
  { id: 1, name: { ro: "Lampă Nord", en: "Nord Lamp" }, group: "iluminat", price: "349 lei" },
  { id: 2, name: { ro: "Scaun Fold", en: "Fold Chair" }, group: "mobilier", price: "890 lei" },
  { id: 3, name: { ro: "Vază Lut", en: "Clay Vase" }, group: "decor", price: "129 lei" },
  { id: 4, name: { ro: "Aplică Arc", en: "Arc Sconce" }, group: "iluminat", price: "259 lei" },
  { id: 5, name: { ro: "Masă Pin", en: "Pine Table" }, group: "mobilier", price: "1 240 lei" },
  { id: 6, name: { ro: "Ramă Mat", en: "Matte Frame" }, group: "decor", price: "99 lei" },
  { id: 7, name: { ro: "Bandă LED", en: "LED Strip" }, group: "iluminat", price: "179 lei" },
  { id: 8, name: { ro: "Raft Cub", en: "Cube Shelf" }, group: "mobilier", price: "540 lei" },
];

const GROUPS = ["toate", "iluminat", "mobilier", "decor"];

/**
 * SHP-F2 — filtre cu reordonare animată.
 *
 * Tehnica FLIP: măsurăm pozițiile înainte de filtrare, lăsăm browserul să
 * așeze grila nouă, apoi animăm diferența. Cardurile se mută vizibil dintr-un
 * loc în altul, în loc să clipească — utilizatorul urmărește produsul, nu
 * caută din nou de la capăt.
 */
export default function FlipFilters() {
  const { lang } = useLang();
  const [group, setGroup] = useState("toate");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positions = useRef(new Map<number, DOMRect>());

  const visible = ITEMS.filter((item) => group === "toate" || item.group === group);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-flip-id]"));
    for (const card of cards) {
      const id = Number(card.dataset.flipId);
      const previous = positions.current.get(id);
      const next = card.getBoundingClientRect();
      if (previous) {
        const dx = previous.left - next.left;
        const dy = previous.top - next.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          card.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0,0)" }],
            { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          );
        }
      }
      positions.current.set(id, next);
    }
  }, [group]);

  return (
    <div className="min-h-[260px] p-6">
      <div className="flex flex-wrap gap-2">
        {GROUPS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setGroup(option)}
            aria-pressed={group === option}
            className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
              group === option
                ? "border-white bg-white text-black"
                : "border-white/20 text-white/60 hover:text-white"
            }`}
          >
            {GROUP_LABEL[option][lang]}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {visible.map((item) => (
          <div
            key={item.id}
            data-flip-id={item.id}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
          >
            <div className="h-10 rounded bg-white/10" />
            <p className="mt-2 truncate text-xs font-medium text-white">{item.name[lang]}</p>
            <p className="text-[11px] text-white/45">{item.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
