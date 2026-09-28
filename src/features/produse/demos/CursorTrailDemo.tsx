import { useEffect, useRef } from "react";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

/** Cursor propriu: punct, inel care se lipește de ținte și urmă pe canvas. */
export default function CursorTrailDemo({ values, lang, active }: DemoProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const color = str(values.color, "#a78bfa");
  const decay = num(values.trail, 0.9);

  useEffect(() => {
    const root = host.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(root.clientWidth * dpr);
      canvas.height = Math.floor(root.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);

    const pointer = { x: -100, y: -100 };
    const dot = { x: -100, y: -100 };
    const ring = { x: -100, y: -100, r: 16 };
    let snapped: DOMRect | null = null;
    const points: Array<{ x: number; y: number; life: number }> = [];

    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-magnetic]");
      snapped = target ? target.getBoundingClientRect() : null;
      if (snapped) {
        snapped = new DOMRect(snapped.left - rect.left, snapped.top - rect.top, snapped.width, snapped.height);
      }
      points.push({ x: pointer.x, y: pointer.y, life: 1 });
      if (points.length > 90) points.shift();
    };
    root.addEventListener("pointermove", onMove);

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (!active) return;
      ctx.clearRect(0, 0, root.clientWidth, root.clientHeight);

      // Urma: puncte cu viață descrescătoare, unite printr-o linie groasă.
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        ctx.strokeStyle = `${color}${Math.round(b.life * 120).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 1 + b.life * 7;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        b.life *= decay;
      }
      while (points.length && points[0].life < 0.02) points.shift();

      dot.x += (pointer.x - dot.x) * 0.55;
      dot.y += (pointer.y - dot.y) * 0.55;
      const targetX = snapped ? snapped.x + snapped.width / 2 : pointer.x;
      const targetY = snapped ? snapped.y + snapped.height / 2 : pointer.y;
      const targetR = snapped ? Math.max(snapped.width, snapped.height) / 1.6 : 16;
      ring.x += (targetX - ring.x) * 0.18;
      ring.y += (targetY - ring.y) * 0.18;
      ring.r += (targetR - ring.r) * 0.2;

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}aa`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      root.removeEventListener("pointermove", onMove);
    };
  }, [color, decay, active]);

  const ro = lang === "ro";
  return (
    <div ref={host} className="relative h-full w-full cursor-none select-none">
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      <div className="relative grid h-full place-items-center gap-3 p-4">
        <p className="text-center text-xs text-white/55">{ro ? "Mișcă cursorul; treci peste buton" : "Move the cursor; hover the button"}</p>
        <button type="button" data-magnetic className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white">
          {ro ? "Țintă magnetică" : "Magnetic target"}
        </button>
      </div>
    </div>
  );
}
