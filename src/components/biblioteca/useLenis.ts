import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * Scroll neted, sincronizat cu bucla de randare.
 *
 * O singură sursă de timp pentru DOM și WebGL: efectele citesc aceeași poziție
 * de scroll pe care o interpolează Lenis, deci nu apare decalajul clasic între
 * fundalul 3D și conținutul HTML. Nu deturnăm rotița — doar netezim scroll-ul
 * nativ, iar pe „mișcare redusă" nu pornim deloc.
 */
export function useLenis(enabled = true) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.4 });
    lenisRef.current = lenis;

    let frame = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  return lenisRef;
}
