import { useEffect, useRef } from "react";
import { Stage } from "./_shell";
import { bool, num, str } from "./_props";
import type { DemoProps } from "./registry";

/** Card 3D cu înclinare, straturi în adâncime și reflexie speculară. */
export default function TiltCardDemo({ values, lang }: DemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const max = num(values.max, 14);
  const glare = bool(values.glare, true);
  const color = str(values.color, "#a78bfa");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
      el.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
    };
    const reset = () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
    };
  }, [max]);

  return (
    <Stage>
      <div style={{ perspective: "900px" }}>
        <div
          ref={ref}
          className="relative h-[190px] w-[290px] rounded-3xl border border-white/12 bg-[linear-gradient(150deg,rgba(255,255,255,.1),rgba(255,255,255,.02))] p-5"
          style={{
            transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
            transformStyle: "preserve-3d",
            transition: "transform .25s cubic-bezier(.22,1,.36,1)",
            boxShadow: `0 30px 60px -30px ${color}`,
          }}
        >
          <p style={{ transform: "translateZ(38px)" }} className="pa-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
            Avyron
          </p>
          <p style={{ transform: "translateZ(58px)" }} className="mt-3 text-xl font-bold leading-tight text-white">
            {lang === "ro" ? "Card cu adâncime reală" : "A card with real depth"}
          </p>
          <p style={{ transform: "translateZ(26px)" }} className="mt-2 text-xs text-white/55">
            {lang === "ro" ? "Straturile stau la distanțe diferite de cameră." : "Layers sit at different distances from the camera."}
          </p>
          <span
            style={{ transform: "translateZ(80px)", background: `linear-gradient(135deg, ${color}, #22d3ee)` }}
            className="absolute bottom-5 left-5 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
          >
            {lang === "ro" ? "Mișcă cursorul" : "Move the cursor"}
          </span>
          {glare && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{ background: "radial-gradient(240px circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.22), transparent 60%)" }}
            />
          )}
        </div>
      </div>
    </Stage>
  );
}
