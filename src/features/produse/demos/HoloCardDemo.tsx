import { useEffect, useRef } from "react";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

/** Folie holografică iridescentă: gradient conic + zgomot + blend modes. */
export default function HoloCardDemo({ values, lang }: DemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const intensity = num(values.intensity, 0.8);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--hx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty("--hy", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      el.style.setProperty("--ang", `${((event.clientX - rect.left) / rect.width) * 360}deg`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Stage>
      <div
        ref={ref}
        className="relative h-[180px] w-[280px] overflow-hidden rounded-2xl border border-white/15 bg-[#0b0d16] p-5"
        style={{ "--hx": "50%", "--hy": "50%", "--ang": "0deg" } as React.CSSProperties}
      >
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "conic-gradient(from var(--ang), #ff5f6d, #ffc371, #47ffb4, #37b3ff, #b57bff, #ff5f6d)",
            opacity: 0.55 * intensity,
            mixBlendMode: "color-dodge",
          }}
        />
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(200px circle at var(--hx) var(--hy), rgba(255,255,255,.45), transparent 60%)",
            mixBlendMode: "overlay",
            opacity: intensity,
          }}
        />
        <span
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,.14) 0 2px, transparent 2px 6px)", mixBlendMode: "soft-light" }}
        />
        <div className="relative">
          <p className="pa-mono text-[10px] uppercase tracking-[0.3em] text-white/70">Avyron</p>
          <p className="mt-8 text-lg font-bold text-white">{lang === "ro" ? "Partener Studio" : "Studio partner"}</p>
          <p className="pa-mono mt-1 text-[11px] text-white/60">2026 — 2027</p>
        </div>
      </div>
    </Stage>
  );
}
