import { useEffect, useRef, type ReactNode } from "react";

/**
 * ScrollMarquee — Avyron Products (avyron.ro/produse)
 * Bandă infinită care accelerează cu viteza de scroll și își poate inversa
 * direcția. Pauză la hover și când iese din ecran.
 */

type Props = {
  children: ReactNode;
  speed?: number;
  reverse?: boolean;
  gap?: number;
};

export function ScrollMarquee({ children, speed = 1, reverse = false, gap = 48 }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrap.current;
    const el = track.current;
    if (!root || !el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let x = 0;
    let boost = 0;
    let lastY = window.scrollY;
    let visible = true;
    let hovered = false;
    let frame = 0;
    const dir = reverse ? 1 : -1;

    const onScroll = () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      boost += dy * 0.08;
    };
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    observer.observe(root);
    const enter = () => (hovered = true);
    const leave = () => (hovered = false);
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", onScroll, { passive: true });

    const loop = () => {
      if (visible && !hovered) {
        const half = el.scrollWidth / 2;
        x += dir * (0.6 * speed) + boost;
        boost *= 0.92;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
    };
  }, [speed, reverse]);

  return (
    <div
      ref={wrap}
      style={{
        overflow: "hidden",
        maskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
      }}
    >
      <div ref={track} style={{ display: "flex", width: "max-content", gap, willChange: "transform" }}>
        <div style={{ display: "flex", gap }}>{children}</div>
        <div style={{ display: "flex", gap }} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

export default ScrollMarquee;
