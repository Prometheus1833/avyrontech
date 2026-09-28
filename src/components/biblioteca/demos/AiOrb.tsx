import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: "Scrie ceva — orbul reacționează",
  en: "Type something — the orb reacts",
};

/**
 * AIA-S1 — orb conversațional.
 *
 * Conturul sferei e o sumă de sinusoide cu faze diferite; când utilizatorul
 * scrie, amplitudinea crește. E cea mai ieftină formă de „agentul ăsta e viu"
 * pe care o cunoaștem: canvas 2D, fără nicio bibliotecă.
 */
export default function AiOrb() {
  const { lang } = useLang();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const energy = useRef(0.25);
  const [text, setText] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const render = (now: number) => {
      const t = now / 1000;
      energy.current += (0.25 - energy.current) * 0.02;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const base = size * 0.3;

      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.06) {
          const wobble =
            Math.sin(a * 3 + t * 1.3 + ring) * 0.5 +
            Math.sin(a * 5 - t * 0.9 + ring * 2) * 0.3 +
            Math.sin(a * 8 + t * 2.1) * 0.2;
          const radius = base * (1 + ring * 0.16) + wobble * base * energy.current * (reduced ? 0.15 : 0.55);
          const x = cx + Math.cos(a) * radius;
          const y = cy + Math.sin(a) * radius;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const alpha = 0.5 - ring * 0.14;
        ctx.strokeStyle = `hsla(${162 + ring * 16}, 85%, ${58 + ring * 8}%, ${alpha})`;
        ctx.lineWidth = 1.4 - ring * 0.35;
        ctx.stroke();
      }

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 1.5);
      glow.addColorStop(0, `hsla(165, 90%, 60%, ${0.16 + energy.current * 0.22})`);
      glow.addColorStop(1, "hsla(165, 90%, 60%, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-5 p-6">
      <canvas ref={canvasRef} className="h-[220px] w-[220px]" aria-hidden="true" />
      <input
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          energy.current = Math.min(1, energy.current + 0.22);
        }}
        placeholder={COPY[lang]}
        className="w-full max-w-sm rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
      />
    </div>
  );
}
