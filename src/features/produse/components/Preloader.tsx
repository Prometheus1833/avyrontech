import { useEffect, useRef, useState } from "react";

const MIN_MS = 1300;
const MAX_MS = 2000;
const SEEN = "avyron-produse-seen";

/**
 * Preloader-ul paginii Produse: maximum 2 secunde.
 *
 * Particulele pornesc dintr-o sferă 3D care se rotește, se adună în marca „A”
 * și, la final, se deschid radial peste pagină. Totul pe un canvas 2D cu
 * proiecție perspectivă calculată manual — nu așteptăm chunk-ul three.js ca să
 * avem ce arăta. A doua vizită din sesiune primește varianta de 350 ms.
 */
export default function Preloader({ onDone, lang }: { onDone: () => void; lang: "ro" | "en" }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      onDone();
      return;
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN) === "1";
      sessionStorage.setItem(SEEN, "1");
    } catch {
      /* fără storage: rulăm varianta completă */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduced || seen ? 350 : MIN_MS + Math.min(MAX_MS - MIN_MS, 400);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Ținta: pixelii literei A, desenată pe un canvas ascuns.
    const off = document.createElement("canvas");
    const S = 160;
    off.width = S;
    off.height = S;
    const octx = off.getContext("2d")!;
    octx.fillStyle = "#fff";
    octx.font = `700 ${S * 0.95}px "Times New Roman", Times, serif`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText("A", S / 2, S / 2 + S * 0.06);
    const data = octx.getImageData(0, 0, S, S).data;
    const targets: Array<[number, number]> = [];
    for (let y = 0; y < S; y += 3) for (let x = 0; x < S; x += 3) if (data[(y * S + x) * 4 + 3] > 120) targets.push([x / S - 0.5, y / S - 0.5]);

    const count = Math.min(targets.length, w < 640 ? 520 : 1100);
    const pts = Array.from({ length: count }, (_, i) => {
      // Pornire pe o sferă Fibonacci.
      const k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * k;
      const t = targets[Math.floor((i / count) * targets.length)];
      return {
        sx: Math.cos(theta) * Math.sin(phi),
        sy: Math.sin(theta) * Math.sin(phi),
        sz: Math.cos(phi),
        tx: t[0],
        ty: t[1],
        hue: 250 + (i % 60),
      };
    });

    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const start = performance.now();
    let frame = 0;
    let finished = false;

    const draw = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / total);
      setPct(Math.round(p * 100));
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) * 0.34;
      const rot = elapsed * 0.0012;
      const gather = ease(Math.min(1, Math.max(0, (p - 0.25) / 0.55)));
      const burst = ease(Math.max(0, (p - 0.86) / 0.14));

      for (const pt of pts) {
        // Sferă rotită în jurul axei Y, proiectată în perspectivă.
        const x3 = pt.sx * Math.cos(rot) + pt.sz * Math.sin(rot);
        const z3 = -pt.sx * Math.sin(rot) + pt.sz * Math.cos(rot);
        const persp = 1 / (1.8 - z3 * 0.6);
        const ax = x3 * persp * 1.1;
        const ay = pt.sy * persp * 1.1;
        let x = ax + (pt.tx * 1.25 - ax) * gather;
        let y = ay + (pt.ty * 1.25 - ay) * gather;
        if (burst > 0) {
          const d = Math.hypot(x, y) || 0.001;
          x += (x / d) * burst * 1.6;
          y += (y / d) * burst * 1.6;
        }
        const alpha = (0.35 + 0.65 * (gather > 0.5 ? 1 : persp)) * (1 - burst);
        ctx.fillStyle = `hsla(${pt.hue}, 90%, ${60 + gather * 15}%, ${alpha})`;
        const size = 1.1 + gather * 0.6;
        ctx.fillRect(cx + x * scale, cy + y * scale, size, size);
      }

      if (p < 1) frame = requestAnimationFrame(draw);
      else if (!finished) {
        finished = true;
        setLeaving(true);
        window.setTimeout(onDone, 380);
      }
    };
    frame = requestAnimationFrame(draw);
    // Plasă de siguranță: nimic nu ține ecranul mai mult de 2,4 s.
    const guard = window.setTimeout(() => {
      if (!finished) {
        finished = true;
        onDone();
      }
    }, MAX_MS + 400);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(guard);
      window.removeEventListener("resize", resize);
    };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={lang === "ro" ? "Se încarcă Produse Avyron" : "Loading Avyron Products"}
      className="fixed inset-0 z-[100] grid place-items-center bg-[hsl(228_16%_6%)] transition-opacity duration-400"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/70">
        <span className="pa-mono text-[10px] uppercase tracking-[0.4em]">{lang === "ro" ? "Produse Avyron" : "Avyron Products"}</span>
        <span className="pa-mono text-xs tabular-nums text-white/40">{String(pct).padStart(3, "0")}</span>
      </div>
    </div>
  );
}
