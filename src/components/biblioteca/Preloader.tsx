import { useEffect, useRef, useState } from "react";

type Props = {
  /** Devine adevărat când chunk-ul 3D și texturile primei secțiuni sunt gata. */
  ready: boolean;
  onDone: () => void;
};

const MIN_MS = 1500;
const MAX_MS = 2500;

/**
 * Preloader-ul Bibliotecii — primul efect din pagină, nu o pauză.
 *
 * Trei acte în 1,5 secunde: praf de particule împrăștiat, care se organizează
 * într-o grilă wireframe, apoi se pliază în marca Avyron. Durata minimă e
 * respectată ca actul să se vadă, dar nu depășim 2,5 s chiar dacă asseturile
 * întârzie. A doua vizită din aceeași sesiune primește versiunea de 400 ms.
 */
export default function Preloader({ ready, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const short = sessionStorage.getItem("avyron-biblioteca-seen") === "1";
    const minMs = reduced ? 300 : short ? 400 : MIN_MS;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Punctele mărcii: desenăm litera pe un canvas ascuns și citim pixelii.
    const sampleMark = (): Array<{ x: number; y: number }> => {
      const off = document.createElement("canvas");
      const size = 220;
      off.width = size;
      off.height = size;
      const octx = off.getContext("2d");
      if (!octx) return [];
      octx.fillStyle = "#fff";
      octx.font = `900 ${size * 0.92}px "Inter", system-ui, sans-serif`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText("A", size / 2, size / 2 + size * 0.04);
      const data = octx.getImageData(0, 0, size, size).data;
      const points: Array<{ x: number; y: number }> = [];
      const step = 3;
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          if (data[(y * size + x) * 4 + 3] > 128) points.push({ x: x / size - 0.5, y: y / size - 0.5 });
        }
      }
      return points;
    };

    const markPoints = sampleMark();
    const count = Math.min(
      markPoints.length,
      window.innerWidth < 640 ? 420 : 900,
    );

    type Particle = {
      x: number; y: number;
      sx: number; sy: number;   // start, în spațiu
      gx: number; gy: number;   // grilă
      mx: number; my: number;   // marcă
      seed: number;
    };

    const cols = Math.ceil(Math.sqrt(count));
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.35 + Math.random() * 0.75;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const mark = markPoints[Math.floor((i / count) * markPoints.length)] ?? { x: 0, y: 0 };
      return {
        x: 0, y: 0,
        sx: Math.cos(angle) * radius,
        sy: Math.sin(angle) * radius * 0.6,
        gx: (col / (cols - 1) - 0.5) * 0.72,
        gy: (row / (cols - 1) - 0.5) * 0.72,
        mx: mark.x * 0.62,
        my: mark.y * 0.62,
        seed: Math.random(),
      };
    });

    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const start = performance.now();
    let frame = 0;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      sessionStorage.setItem("avyron-biblioteca-seen", "1");
      onDone();
    };

    const render = (now: number) => {
      const elapsed = now - start;
      const scale = Math.min(width, height) * 0.9;
      const cx = width / 2;
      const cy = height / 2;

      setProgress(Math.min(1, elapsed / minMs));

      if (ctx && !reduced) {
        ctx.clearRect(0, 0, width, height);

        // Actele: dispersie -> grilă -> marcă.
        const t = elapsed / minMs;
        const toGrid = easeInOut(Math.min(1, Math.max(0, (t - 0.28) / 0.34)));
        const toMark = easeInOut(Math.min(1, Math.max(0, (t - 0.62) / 0.34)));

        for (const p of particles) {
          const drift = Math.sin(now / 900 + p.seed * 12) * 0.012;
          const ax = lerp(p.sx + drift, p.gx, toGrid);
          const ay = lerp(p.sy + drift, p.gy, toGrid);
          p.x = lerp(ax, p.mx, toMark);
          p.y = lerp(ay, p.my, toMark);

          const px = cx + p.x * scale;
          const py = cy + p.y * scale;
          const size = 1 + p.seed * 1.4 + toMark * 0.6;
          const alpha = 0.25 + toGrid * 0.3 + toMark * 0.45;

          ctx.fillStyle = `hsla(${262 + p.seed * 40}, 85%, ${62 + toMark * 18}%, ${alpha})`;
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }

        // Liniile grilei apar doar în actul al doilea, apoi se sting.
        const web = Math.max(0, Math.min(toGrid, 1 - toMark));
        if (web > 0.02) {
          ctx.strokeStyle = `hsla(265, 80%, 70%, ${web * 0.18})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let i = 0; i < cols; i += 2) {
            const gx = cx + (i / (cols - 1) - 0.5) * 0.72 * scale;
            ctx.moveTo(gx, cy - 0.36 * scale);
            ctx.lineTo(gx, cy + 0.36 * scale);
          }
          ctx.stroke();
        }
      }

      const assetsOk = ready || elapsed >= MAX_MS;
      if (elapsed >= minMs && assetsOk) {
        finish();
        return;
      }
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [ready, onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07080d]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      <div className="relative flex flex-col items-center gap-5 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">
          Biblioteca Avyron
        </p>
        <div className="h-px w-40 overflow-hidden bg-white/15">
          <div
            className="h-full bg-white/70 transition-[width] duration-150 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem("avyron-biblioteca-seen", "1");
          onDone();
        }}
        className="absolute bottom-8 right-8 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 transition-colors hover:text-white/80"
      >
        sari peste
      </button>
    </div>
  );
}
