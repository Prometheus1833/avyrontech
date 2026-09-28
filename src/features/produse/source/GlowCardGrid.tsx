import { useRef, type ReactNode, type PointerEvent } from "react";

/**
 * GlowCardGrid — Avyron Products (avyron.ro/produse)
 * Un singur listener pe grilă; fiecare card își citește poziția luminii din
 * variabile CSS și o aplică pe contur printr-o mască.
 */

type Props = {
  items: Array<{ title: string; text: string; icon?: ReactNode }>;
  color?: string;
  size?: number;
  radius?: number;
};

export function GlowCardGrid({ items, color = "#38bdf8", size = 260, radius = 20 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const grid = ref.current;
    if (!grid) return;
    for (const card of Array.from(grid.children) as HTMLElement[]) {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--y", `${event.clientY - rect.top}px`);
    }
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
    >
      {items.map((item) => (
        <article
          key={item.title}
          style={{
            position: "relative",
            borderRadius: radius,
            padding: 20,
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.08)",
            overflow: "hidden",
          }}
        >
          {/* Conturul luminos: gradient radial vizibil doar pe 1px de margine. */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: radius,
              padding: 1,
              background: `radial-gradient(${size}px circle at var(--x, -100px) var(--y, -100px), ${color}, transparent 60%)`,
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(${size * 0.8}px circle at var(--x, -100px) var(--y, -100px), ${color}14, transparent 60%)`,
            }}
          />
          <div style={{ position: "relative" }}>
            {item.icon}
            <h3 style={{ margin: "10px 0 6px", fontSize: 15, fontWeight: 650 }}>{item.title}</h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, opacity: 0.65 }}>{item.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export default GlowCardGrid;
