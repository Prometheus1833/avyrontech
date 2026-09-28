import type { DemoProps } from "./registry";

/** Previzualizare la scară a template-ului: structura, în ordinea care convertește. */
const BLOCKS = [
  { ro: "Hero cu propunere clară", en: "Hero with a clear promise", h: 44 },
  { ro: "Logo-uri de încredere", en: "Trust logos", h: 16 },
  { ro: "Trei beneficii", en: "Three benefits", h: 30 },
  { ro: "Demo / captură de produs", en: "Product demo", h: 40 },
  { ro: "Cum funcționează, 3 pași", en: "How it works, 3 steps", h: 28 },
  { ro: "Prețuri", en: "Pricing", h: 34 },
  { ro: "Întrebări frecvente", en: "FAQ", h: 24 },
  { ro: "CTA final", en: "Final CTA", h: 22 },
  { ro: "Subsol", en: "Footer", h: 18 },
];

export default function TplSaasDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="h-full w-full overflow-y-auto bg-[#080a12] p-3">
      <div className="mx-auto max-w-[240px] space-y-1.5">
        {BLOCKS.map((block, index) => (
          <div
            key={block.ro}
            className="flex items-center justify-center rounded-lg border border-white/10 text-[9.5px] text-white/60"
            style={{ height: block.h, background: index === 0 ? "linear-gradient(135deg,#8b5cf633,#22d3ee1a)" : index === 5 ? "#a78bfa1a" : "rgba(255,255,255,.035)" }}
          >
            {ro ? block.ro : block.en}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-white/40">{ro ? "Structura template-ului · 9 secțiuni" : "Template structure · 9 sections"}</p>
    </div>
  );
}
