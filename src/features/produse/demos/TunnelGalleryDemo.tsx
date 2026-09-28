import { useEffect, useRef } from "react";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

/**
 * Tunel de galerie: cadrele se apropie pe axa Z, iar rotița controlează
 * adâncimea. Pur CSS 3D — nu cere WebGL, deci merge și pe telefoane slabe.
 */
const FRAMES = 7;

export default function TunnelGalleryDemo({ values, active }: DemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const speed = num(values.speed, 1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let depth = 0;
    let frame = 0;
    let auto = active;

    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      auto = false;
      depth += event.deltaY * 0.4;
    };

    const tick = () => {
      if (auto) depth += 1.1 * speed;
      element.style.setProperty("--depth", String(depth % (FRAMES * 220)));
      frame = requestAnimationFrame(tick);
    };

    element.addEventListener("wheel", wheel, { passive: false });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("wheel", wheel);
    };
  }, [speed, active]);

  return (
    <Stage pad={false}>
      <div ref={ref} className="relative h-full w-full overflow-hidden" style={{ perspective: "700px", ["--depth" as string]: "0" }}>
        {Array.from({ length: FRAMES }, (_, index) => (
          <div
            key={index}
            className="absolute left-1/2 top-1/2 h-[120px] w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/15"
            style={{
              transform: `translate(-50%,-50%) translateZ(calc(${index * 220}px - var(--depth) * 1px))`,
              background: `linear-gradient(135deg, hsl(${250 + index * 12} 72% 58% / .3), hsl(${195 + index * 8} 85% 55% / .12))`,
              boxShadow: "0 30px 60px -40px rgba(0,0,0,.9)",
            }}
          />
        ))}
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, transparent 40%, #05060b 88%)" }} />
      </div>
    </Stage>
  );
}
