import { useEffect, useRef } from "react";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

/** Bandă de final cu gradient care urmărește cursorul și text care se ridică. */
export default function CtaGradientDemo({ lang }: DemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const ro = lang === "ro";

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      element.style.setProperty("--y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    };
    element.addEventListener("pointermove", move);
    return () => element.removeEventListener("pointermove", move);
  }, []);

  return (
    <Stage>
      <div
        ref={ref}
        className="relative w-full max-w-[340px] overflow-hidden rounded-3xl border border-white/12 p-6 text-center"
        style={{ "--x": "50%", "--y": "50%", background: "#0a0d18" } as React.CSSProperties}
      >
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(420px circle at var(--x) var(--y), rgba(139,92,246,.45), transparent 62%)" }}
        />
        <span aria-hidden className="absolute inset-0" style={{ background: "conic-gradient(from 210deg at 50% 120%, rgba(34,211,238,.35), transparent 40%)" }} />
        <div className="relative">
          <p className="pa-mono text-[10px] uppercase tracking-[0.3em] text-white/55">{ro ? "pasul următor" : "next step"}</p>
          <h3 className="mt-2 font-display text-xl font-bold text-white">{ro ? "Îți construim site-ul în 3 săptămâni" : "Your site, built in 3 weeks"}</h3>
          <p className="mt-2 text-[12px] text-white/65">{ro ? "Primești machetele în 5 zile și plătești pe etape." : "Mockups in 5 days, payment in stages."}</p>
          <button type="button" className="mt-4 rounded-full bg-gradient-to-br from-brand to-brand-2 px-5 py-2.5 text-[12.5px] font-semibold text-white" data-ripple>
            {ro ? "Cere o ofertă" : "Request a quote"}
          </button>
        </div>
      </div>
    </Stage>
  );
}
