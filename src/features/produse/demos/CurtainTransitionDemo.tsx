import { useState } from "react";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

/**
 * Tranziție de pagină „cortină": panourile acoperă ecranul, conținutul se
 * schimbă în spatele lor, apoi se retrag. Pe „mișcare redusă" schimbarea e
 * instantanee, fără panouri.
 */
const PAGES = [
  { ro: "Acasă", en: "Home", hue: 265 },
  { ro: "Servicii", en: "Services", hue: 200 },
  { ro: "Portofoliu", en: "Portfolio", hue: 330 },
];

export default function CurtainTransitionDemo({ values, lang }: DemoProps) {
  const ro = lang === "ro";
  const columns = num(values.columns, 5);
  const [page, setPage] = useState(0);
  const [phase, setPhase] = useState<"idle" | "in" | "out">("idle");

  const go = (next: number) => {
    if (phase !== "idle" || next === page) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPage(next);
      return;
    }
    setPhase("in");
    window.setTimeout(() => {
      setPage(next);
      setPhase("out");
      window.setTimeout(() => setPhase("idle"), 520);
    }, 420);
  };

  return (
    <Stage pad={false}>
      <div className="relative h-full w-full overflow-hidden">
        <div className="grid h-full w-full place-items-center" style={{ background: `linear-gradient(140deg, hsl(${PAGES[page].hue} 70% 22%), #06070d)` }}>
          <p className="font-display text-2xl font-bold text-white">{ro ? PAGES[page].ro : PAGES[page].en}</p>
        </div>

        <div className="pointer-events-none absolute inset-0 flex">
          {Array.from({ length: columns }, (_, index) => (
            <span
              key={index}
              className="h-full flex-1 origin-bottom bg-[#0a0c16]"
              style={{
                transform: phase === "in" ? "scaleY(1)" : "scaleY(0)",
                transformOrigin: phase === "out" ? "top" : "bottom",
                transition: `transform .42s cubic-bezier(.76,0,.24,1) ${index * 55}ms`,
              }}
            />
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {PAGES.map((entry, index) => (
            <button
              key={entry.en}
              type="button"
              onClick={() => go(index)}
              aria-pressed={page === index}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${page === index ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
            >
              {ro ? entry.ro : entry.en}
            </button>
          ))}
        </div>
      </div>
    </Stage>
  );
}
