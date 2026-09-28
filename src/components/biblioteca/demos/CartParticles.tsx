import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: { product: "Lampă Nord", price: "349 lei", hint: "Apasă produsul." },
  en: { product: "Nord Lamp", price: "349 lei", hint: "Press the product." },
};

type Particle = {
  x: number; y: number;
  tx: number; ty: number;
  cx: number; cy: number;
  born: number;
  life: number;
  hue: number;
  size: number;
};

/**
 * SHP-S2 — adăugare în coș cu traiectorie.
 *
 * Produsul se desface în particule care urmează o curbă Bézier până în iconul
 * de coș. Confirmarea nu mai e un text care apare undeva: e mișcarea care
 * leagă produsul de coș, deci ochiul știe unde să se uite.
 */
export default function CartParticles() {
  const { lang } = useLang();
  const t = COPY[lang];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const productRef = useRef<HTMLButtonElement | null>(null);
  const cartRef = useRef<HTMLDivElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const [count, setCount] = useState(0);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(host.clientWidth * dpr);
      canvas.height = Math.floor(host.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    const render = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, host.clientWidth, host.clientHeight);

      particles.current = particles.current.filter((p) => now - p.born < p.life);
      for (const p of particles.current) {
        const t = (now - p.born) / p.life;
        const e = t * t * (3 - 2 * t);
        // Bézier pătratic: punctul de control ridică traiectoria.
        const x = (1 - e) * (1 - e) * p.x + 2 * (1 - e) * e * p.cx + e * e * p.tx;
        const y = (1 - e) * (1 - e) * p.y + 2 * (1 - e) * e * p.cy + e * e * p.ty;
        ctx.fillStyle = `hsla(${p.hue}, 90%, 68%, ${1 - e})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 - e * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const add = () => {
    const host = hostRef.current;
    const product = productRef.current;
    const cart = cartRef.current;
    if (!host || !product || !cart) return;

    const hostRect = host.getBoundingClientRect();
    const from = product.getBoundingClientRect();
    const to = cart.getBoundingClientRect();

    const sx = from.left - hostRect.left + from.width / 2;
    const sy = from.top - hostRect.top + from.height / 2;
    const tx = to.left - hostRect.left + to.width / 2;
    const ty = to.top - hostRect.top + to.height / 2;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduced ? 0 : 26;

    for (let i = 0; i < total; i++) {
      const spread = 34;
      particles.current.push({
        x: sx + (Math.random() - 0.5) * spread,
        y: sy + (Math.random() - 0.5) * spread,
        tx,
        ty,
        cx: (sx + tx) / 2 + (Math.random() - 0.5) * 60,
        cy: Math.min(sy, ty) - 70 - Math.random() * 50,
        born: performance.now() + i * 8,
        life: 620 + Math.random() * 260,
        hue: 18 + Math.random() * 30,
        size: 2 + Math.random() * 2.6,
      });
    }

    setCount((c) => c + 1);
    setBump(true);
    window.setTimeout(() => setBump(false), 320);
  };

  return (
    <div ref={hostRef} className="relative min-h-[260px] p-6">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-6">
        <div className="w-40">
          <button
            ref={productRef}
            type="button"
            onClick={add}
            className="block w-full rounded-lg border border-white/12 bg-gradient-to-br from-amber-300/25 to-orange-500/10 p-4 text-left transition-transform hover:scale-[1.02]"
          >
            <div className="h-16 rounded bg-white/10" />
            <p className="mt-3 text-sm font-medium text-white">{t.product}</p>
            <p className="text-xs text-white/50">{t.price}</p>
          </button>
          <p className="mt-2 text-xs text-white/40">{t.hint}</p>
        </div>

        <div
          ref={cartRef}
          className={`relative rounded-lg border border-white/15 p-3 transition-transform duration-300 ${
            bump ? "scale-110" : "scale-100"
          }`}
        >
          <ShoppingBag className="size-5 text-white/80" aria-hidden="true" />
          {count > 0 && (
            <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-black">
              {count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
