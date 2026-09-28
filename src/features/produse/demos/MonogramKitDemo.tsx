import type { DemoProps } from "./registry";

/** Kitul de monograme: simboluri SVG generate, nu imagini. */
const SHAPES = ["circle", "ring", "triangle", "square", "hex", "diamond", "arc", "slash"] as const;

export default function MonogramKitDemo({ lang }: DemoProps) {
  const letters = "AVYRON".split("");
  return (
    <div className="grid h-full w-full grid-cols-4 gap-1.5 p-3">
      {SHAPES.map((shape, i) => (
        <div key={shape} className="grid place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
          <svg viewBox="0 0 48 48" className="size-9" role="img" aria-label={shape}>
            <defs>
              <linearGradient id={`g-${shape}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            {shape === "circle" && <circle cx="24" cy="24" r="14" fill={`url(#g-${shape})`} />}
            {shape === "ring" && <circle cx="24" cy="24" r="13" fill="none" stroke={`url(#g-${shape})`} strokeWidth="5" />}
            {shape === "triangle" && <path d="M24 9 39 37H9Z" fill={`url(#g-${shape})`} />}
            {shape === "square" && <rect x="11" y="11" width="26" height="26" rx="7" fill={`url(#g-${shape})`} />}
            {shape === "hex" && <path d="M24 8l14 8v16l-14 8-14-8V16z" fill={`url(#g-${shape})`} />}
            {shape === "diamond" && <path d="M24 8l16 16-16 16L8 24z" fill={`url(#g-${shape})`} />}
            {shape === "arc" && <path d="M10 34a14 14 0 0 1 28 0" fill="none" stroke={`url(#g-${shape})`} strokeWidth="5" strokeLinecap="round" />}
            {shape === "slash" && <path d="M14 36 34 12" stroke={`url(#g-${shape})`} strokeWidth="6" strokeLinecap="round" />}
            <text x="24" y="28" textAnchor="middle" fontSize="14" fontWeight="800" fill="#07080d">
              {letters[i % letters.length]}
            </text>
          </svg>
        </div>
      ))}
      <p className="col-span-4 text-center text-[11px] text-white/45">
        {lang === "ro" ? "48 de simboluri în pachetul complet, cu fonturi OFL și machete." : "48 symbols in the full kit, with OFL fonts and mockups."}
      </p>
    </div>
  );
}
