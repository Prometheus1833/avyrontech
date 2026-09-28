import { useEffect, useRef } from "react";
import { useLang } from "@/i18n/LanguageContext";

type Point = { x: number; y: number; hx: number; hy: number; vx: number; vy: number };

const COPY = {
  ro: { note: "Treci cursorul prin literă: particulele se împrăștie și se refac.", alt: "Marca Avyron formată din particule" },
  en: { note: "Move the cursor through the letters: the particles scatter and reform.", alt: "The Avyron mark formed from particles" },
};

/**
 * LGO-S2 — asamblare din particule.
 *
 * Punctele sunt eșantionate din marca desenată pe un canvas ascuns, apoi
 * atrase spre poziția lor. Cursorul le împinge; când îl retragi, marca se
 * reface singură. Aceeași tehnică merge pe orice SVG de client.
 */
export default function LogoParticles() {
  const { lang } = useLang();
  const t = COPY[lang];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth;
    const H = 220;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const octx = off.getContext("2d");
    if (!octx) return;
    const fontSize = Math.min(W * 0.19, 96);
    octx.fillStyle = "#fff";
    octx.font = `800 ${fontSize}px "Inter", system-ui, sans-serif`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.letterSpacing = `${fontSize * 0.08}px`;
    octx.fillText("AVYRON", W / 2, H / 2);

    const data = octx.getImageData(0, 0, W, H).data;
    const points: Point[] = [];
    const step = W < 520 ? 3 : 2;
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 128) {
          points.push({
            x: W / 2 + (Math.random() - 0.5) * W,
            y: H / 2 + (Math.random() - 0.5) * H * 2,
            hx: x,
            hy: y,
            vx: 0,
            vy: 0,
          });
        }
      }
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const render = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of points) {
        const dx = p.hx - p.x;
        const dy = p.hy - p.y;
        p.vx = (p.vx + dx * 0.02) * 0.86;
        p.vy = (p.vy + dy * 0.02) * 0.86;

        if (!reduced) {
          const mx = p.x - pointer.current.x;
          const my = p.y - pointer.current.y;
          const distance = mx * mx + my * my;
          if (distance < 5000) {
            const force = (5000 - distance) / 5000;
            p.vx += (mx / Math.sqrt(distance + 1)) * force * 5;
            p.vy += (my / Math.sqrt(distance + 1)) * force * 5;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        const speed = Math.min(1, Math.hypot(p.vx, p.vy) / 6);
        ctx.fillStyle = `hsla(${34 + speed * 40}, 95%, ${66 + speed * 22}%, ${0.7 + speed * 0.3})`;
        ctx.fillRect(p.x, p.y, 1.6, 1.6);
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onLeave = () => (pointer.current = { x: -9999, y: -9999 });

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="p-6">
      <canvas ref={canvasRef} className="h-[220px] w-full" aria-label={t.alt} />
      <p className="mt-2 text-xs text-white/45">{t.note}</p>
    </div>
  );
}
