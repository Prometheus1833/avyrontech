import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

/**
 * SpotlightGrid — Avyron Products (avyron.ro/produse)
 * Grilă stinsă + aceeași grilă aprinsă, dezvăluită de o mască radială care
 * urmărește cursorul.
 */

type Props = { step?: number; color?: string; children?: ReactNode; style?: CSSProperties };

export function SpotlightGrid({ step = 32, color = "#8b5cf6", children, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const grid = (alpha: string) =>
    `linear-gradient(${alpha} 1px, transparent 1px) 0 0 / ${step}px ${step}px, linear-gradient(90deg, ${alpha} 1px, transparent 1px) 0 0 / ${step}px ${step}px`;

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  return (
    <div ref={ref} onPointerMove={onMove} style={{ position: "relative", overflow: "hidden", background: "#07080d", isolation: "isolate", ...style }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: -2, background: grid("rgba(255,255,255,.05)") }} />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          background: grid(`${color}`),
          maskImage: "radial-gradient(220px circle at var(--mx, 50%) var(--my, 40%), #000, transparent 70%)",
          WebkitMaskImage: "radial-gradient(220px circle at var(--mx, 50%) var(--my, 40%), #000, transparent 70%)",
        }}
      />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: -1, background: `radial-gradient(300px circle at var(--mx, 50%) var(--my, 40%), ${color}22, transparent 70%)` }} />
      {children}
    </div>
  );
}

export default SpotlightGrid;
