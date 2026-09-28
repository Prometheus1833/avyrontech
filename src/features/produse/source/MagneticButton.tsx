import { useEffect, useRef, type ReactNode } from "react";

/**
 * MagneticButton — Avyron Products (avyron.ro/produse)
 * Atras de cursor în raza dată, revine elastic. Oprit pe touch.
 */

type Props = {
  children: ReactNode;
  strength?: number;
  radius?: number;
  color?: string;
  onClick?: () => void;
};

export function MagneticButton({ children, strength = 0.4, radius = 120, color = "#22d3ee", onClick }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const reach = radius + Math.max(rect.width, rect.height) / 2;
      if (dist < reach) {
        const pull = (1 - dist / reach) * strength;
        tx = dx * pull;
        ty = dy * pull;
      } else {
        tx = 0;
        ty = 0;
      }
    };

    const loop = () => {
      // Arc simplu: ne apropiem de țintă cu 18% pe cadru.
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      frame = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [strength, radius]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${color}66`,
        background: `radial-gradient(120% 120% at 50% 0%, ${color}33, transparent 70%), rgba(10,12,20,.8)`,
        color: "#fff",
        padding: "0.95rem 1.8rem",
        borderRadius: 999,
        fontWeight: 600,
        cursor: "pointer",
        willChange: "transform",
        boxShadow: `0 0 40px -12px ${color}`,
      }}
    >
      {children}
    </button>
  );
}

export default MagneticButton;
