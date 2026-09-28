import { useMemo, useState } from "react";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

/**
 * Estimator de cost: alegi ce ai nevoie și vezi intervalul de preț și termenul,
 * calculate din aceleași reguli pe care le folosește agenția la ofertare.
 * Intervalul e larg intenționat — un estimator care dă un singur număr minte.
 */
const OPTIONS = [
  { id: "pages", ro: "Peste 5 pagini", en: "More than 5 pages", price: 1200, days: 3 },
  { id: "copy", ro: "Texte scrise de noi", en: "Copy written by us", price: 900, days: 4 },
  { id: "shop", ro: "Magazin (până la 60 produse)", en: "Shop (up to 60 products)", price: 2400, days: 7 },
  { id: "blog", ro: "Blog cu administrare", en: "Blog with admin", price: 800, days: 2 },
  { id: "3d", ro: "Efecte 3D pe primul ecran", en: "3D effects on the hero", price: 1500, days: 4 },
  { id: "multi", ro: "A doua limbă", en: "Second language", price: 700, days: 2 },
];

const BASE = { price: 2900, days: 10 };

export default function ProjectEstimatorDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const [picked, setPicked] = useState<string[]>(["copy"]);

  const total = useMemo(() => {
    const chosen = OPTIONS.filter((option) => picked.includes(option.id));
    const price = BASE.price + chosen.reduce((sum, option) => sum + option.price, 0);
    const days = BASE.days + chosen.reduce((sum, option) => sum + option.days, 0);
    return { low: Math.round(price * 0.9), high: Math.round(price * 1.25), days };
  }, [picked]);

  return (
    <Stage>
      <div className="w-full max-w-[340px]">
        <ul className="grid list-none gap-1.5 p-0">
          {OPTIONS.map((option) => {
            const on = picked.includes(option.id);
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => setPicked((current) => (on ? current.filter((id) => id !== option.id) : [...current, option.id]))}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-[12px] ${on ? "bg-brand/20 text-white" : "bg-white/[0.04] text-white/70"}`}
                >
                  <span aria-hidden className={`grid size-4 shrink-0 place-items-center rounded border text-[9px] ${on ? "border-brand bg-brand text-white" : "border-white/25"}`}>
                    {on ? "✓" : ""}
                  </span>
                  {ro ? option.ro : option.en}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 rounded-2xl border border-white/12 bg-white/[0.04] p-3">
          <p className="pa-mono text-[10px] uppercase tracking-[0.24em] text-white/50">{ro ? "estimare" : "estimate"}</p>
          <p className="mt-1 font-display text-lg font-bold text-white">
            {total.low.toLocaleString("ro-RO")} – {total.high.toLocaleString("ro-RO")} lei
          </p>
          <p className="text-[11.5px] text-white/60">
            {ro ? `aproximativ ${total.days} zile lucrătoare` : `about ${total.days} working days`}
          </p>
        </div>
      </div>
    </Stage>
  );
}
