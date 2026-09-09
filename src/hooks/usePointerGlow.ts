import { useEffect, useRef } from "react";

/**
 * Urmărește cursorul peste un card și scrie poziția și o înclinare ușoară în
 * variabile CSS (`--px`, `--py`, `--rx`, `--ry`). Nu face nimic pe ecrane
 * tactile și nici când vizitatorul preferă mișcare redusă.
 */
export function usePointerGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    let frame = 0;
    const reset = () => {
      element.style.setProperty("--rx", "0deg");
      element.style.setProperty("--ry", "0deg");
      element.style.setProperty("--glow", "0");
    };
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        element.style.setProperty("--px", `${(x * 100).toFixed(2)}%`);
        element.style.setProperty("--py", `${(y * 100).toFixed(2)}%`);
        element.style.setProperty("--rx", `${((0.5 - y) * 4.5).toFixed(2)}deg`);
        element.style.setProperty("--ry", `${((x - 0.5) * 5.5).toFixed(2)}deg`);
        element.style.setProperty("--glow", "1");
      });
    };

    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", reset);
    element.addEventListener("pointercancel", reset);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", reset);
      element.removeEventListener("pointercancel", reset);
    };
  }, []);

  return ref;
}
