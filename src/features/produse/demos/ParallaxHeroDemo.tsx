import { useEffect, useRef } from "react";
import type { DemoProps } from "./registry";

/** Trei straturi la adâncimi diferite, mișcate de cursor și de scroll. */
export default function ParallaxHeroDemo({ lang, active }: DemoProps) {
  const host = useRef<HTMLDivElement>(null);
  const ro = lang === "ro";

  useEffect(() => {
    const root = host.current;
    if (!root || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]"));
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      tx = (event.clientX - rect.left) / rect.width - 0.5;
      ty = (event.clientY - rect.top) / rect.height - 0.5;
    };
    root.addEventListener("pointermove", onMove);
    const loop = () => {
      frame = requestAnimationFrame(loop);
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      for (const layer of layers) {
        const depth = Number(layer.dataset.depth ?? 0);
        layer.style.transform = `translate3d(${(-x * depth * 40).toFixed(2)}px, ${(-y * depth * 26).toFixed(2)}px, 0) scale(${1 + depth * 0.04})`;
      }
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
    };
  }, [active]);

  return (
    <div ref={host} className="relative h-full w-full overflow-hidden bg-[#05070d]">
      <div data-depth="0.2" aria-hidden className="absolute inset-[-8%]" style={{ background: "radial-gradient(60% 50% at 30% 20%, #4c1d9566, transparent 65%), radial-gradient(50% 50% at 80% 70%, #0e749066, transparent 65%)" }} />
      <div data-depth="0.5" aria-hidden className="absolute inset-x-[-6%] bottom-[-12%] h-[55%]" style={{ background: "linear-gradient(180deg, transparent, #120a24 40%, #05070d)", clipPath: "polygon(0 42%, 12% 30%, 26% 46%, 38% 22%, 52% 44%, 66% 26%, 80% 46%, 92% 32%, 100% 44%, 100% 100%, 0 100%)" }} />
      <div data-depth="1" className="relative grid h-full place-items-center px-6 text-center">
        <div>
          <p className="pa-mono text-[10px] uppercase tracking-[0.24em] text-brand">{ro ? "Hero parallax" : "Parallax hero"}</p>
          <p className="mt-2 font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            {ro ? "Adâncime din trei straturi" : "Depth from three layers"}
          </p>
          <p className="mt-2 text-xs text-white/55">{ro ? "Mișcă cursorul în cadru" : "Move the cursor inside the frame"}</p>
        </div>
      </div>
      <div data-depth="1.6" aria-hidden className="absolute left-[12%] top-[18%] size-14 rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur" />
      <div data-depth="2.1" aria-hidden className="absolute right-[14%] top-[30%] size-9 rounded-xl border border-brand/40 bg-brand/15" />
    </div>
  );
}
