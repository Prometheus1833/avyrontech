import { useEffect, useRef } from "react";
import type { MarkDraw } from "./engine/sdf";
import { isRealBrowser } from "./utils";

type Props = {
  draw: MarkDraw;
  face: string;
  side: string;
  className?: string;
};

/**
 * Flat stand-in for a 3D mark: the same drawing, tinted, with a stack of
 * offset copies underneath for a hint of depth. Used before the engine is up,
 * when WebGL is unavailable and when the visitor prefers reduced motion.
 */
export default function FlatMark({ draw, face, side, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !isRealBrowser()) return;
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const mask = document.createElement("canvas");
    mask.width = size;
    mask.height = size;
    const m = mask.getContext("2d");
    if (!m) return;
    m.fillStyle = "#fff";
    m.strokeStyle = "#fff";
    m.save();
    draw(m, size);
    m.restore();

    const tinted = (color: string) => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const t = c.getContext("2d")!;
      t.drawImage(mask, 0, 0);
      t.globalCompositeOperation = "source-in";
      t.fillStyle = color;
      t.fillRect(0, 0, size, size);
      return c;
    };
    const back = tinted(side);
    const front = tinted(face);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size * 0.07, size * 0.06);
    ctx.scale(0.86, 0.86);
    for (let i = 10; i > 0; i--) ctx.drawImage(back, i * 0.9, i * 0.9);
    ctx.drawImage(front, 0, 0);
    ctx.restore();
  }, [draw, face, side]);

  return <canvas ref={ref} aria-hidden className={className} width={256} height={256} />;
}
