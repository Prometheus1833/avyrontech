import { useEffect, useRef } from "react";

/**
 * ScrollProgress — Avyron Products (avyron.ro/produse)
 * Bara de progres a paginii, desenată pe un singur element și actualizată
 * dintr-un `requestAnimationFrame`, ca să nu recalculeze layout la fiecare
 * eveniment de scroll. Are și rol de `progressbar` pentru cititoare de ecran.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export function ScrollProgress({ color = "#8b5cf6", height = 3, target }: { color?: string; height?: number; target?: React.RefObject<HTMLElement> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    let frame = 0;

    const read = () => {
      const element = target?.current;
      const scrolled = element ? element.scrollTop : window.scrollY;
      const total = element ? element.scrollHeight - element.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
      const ratio = total > 0 ? Math.min(1, scrolled / total) : 0;
      bar.style.transform = `scaleX(${ratio})`;
      bar.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    const source: HTMLElement | Window = target?.current ?? window;
    source.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      source.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-label="Progresul citirii"
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: "sticky",
        top: 0,
        height,
        transformOrigin: "0 50%",
        transform: "scaleX(0)",
        background: `linear-gradient(90deg, ${color}, #22d3ee)`,
        borderRadius: 999,
        zIndex: 50,
      }}
    />
  );
}

export default ScrollProgress;
