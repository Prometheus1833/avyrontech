import { useEffect, useRef } from "react";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

/**
 * Carusel cu inerție: tragi și continuă, cu frecare și magnetizare pe cel mai
 * apropiat card. Totul pe transformări GPU, cu un singur cadru pe tick.
 */
export default function InertiaCarouselDemo({ values, lang, active }: DemoProps) {
  const track = useRef<HTMLDivElement>(null);
  const friction = num(values.friction, 0.92);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const card = 132;
    let offset = 0;
    let velocity = 0;
    let dragging = false;
    let last = 0;
    let frame = 0;

    const apply = () => {
      element.style.transform = `translate3d(${offset}px,0,0)`;
    };

    const tick = () => {
      if (!dragging) {
        velocity *= friction;
        offset += velocity;
        // Magnetizare: când viteza a scăzut, alunecă spre cardul cel mai apropiat.
        if (Math.abs(velocity) < 0.35) {
          const snap = Math.round(offset / card) * card;
          offset += (snap - offset) * 0.12;
        }
        const limit = card * 3;
        offset = Math.max(-limit, Math.min(limit, offset));
        apply();
      }
      frame = requestAnimationFrame(tick);
    };

    const down = (event: PointerEvent) => {
      dragging = true;
      last = event.clientX;
      velocity = 0;
      element.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      const delta = event.clientX - last;
      last = event.clientX;
      offset += delta;
      velocity = delta;
      apply();
    };
    const up = () => (dragging = false);

    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    if (active) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
    };
  }, [friction, active]);

  return (
    <Stage pad={false}>
      <div className="w-full overflow-hidden">
        <div ref={track} className="flex cursor-grab gap-3 px-6 will-change-transform active:cursor-grabbing">
          {["Hero", "Prețuri", "FAQ", "Subsol", "Login", "Galerie", "Contact"].map((label, index) => (
            <div
              key={label}
              className="grid h-[120px] w-[120px] shrink-0 place-items-center rounded-2xl border border-white/12 text-[12px] font-semibold text-white"
              style={{ background: `linear-gradient(140deg, hsl(${255 + index * 14} 70% 55% / .35), hsl(${195 + index * 10} 80% 55% / .18))` }}
            >
              {label}
            </div>
          ))}
        </div>
        <p className="pa-mono mt-3 px-6 text-[10px] uppercase tracking-[0.26em] text-white/45">
          {lang === "ro" ? "trage și lasă" : "drag and release"}
        </p>
      </div>
    </Stage>
  );
}
