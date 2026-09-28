import type { CSSProperties, ReactNode } from "react";

/**
 * MeshGradient — Avyron Products (avyron.ro/produse)
 * Fundal cu pete de culoare care plutesc lent. Doar CSS.
 */

type Props = {
  color?: string;
  colors?: [string, string, string, string];
  speed?: number;
  children?: ReactNode;
  style?: CSSProperties;
};

const KEYFRAMES = `
@keyframes avy-mesh-a { 0%,100% { transform: translate(-10%, -8%) scale(1); } 50% { transform: translate(12%, 10%) scale(1.15); } }
@keyframes avy-mesh-b { 0%,100% { transform: translate(10%, 6%) scale(1.1); } 50% { transform: translate(-14%, -6%) scale(.9); } }
@keyframes avy-mesh-c { 0%,100% { transform: translate(0, 12%) scale(.95); } 50% { transform: translate(8%, -12%) scale(1.2); } }
@media (prefers-reduced-motion: reduce) { [data-avy-mesh] span { animation: none !important; } }
`;

export function MeshGradient({ color = "#7c3aed", colors, speed = 1, children, style }: Props) {
  const palette = colors ?? [color, "#22d3ee", "#ec4899", "#84cc16"];
  const blob = (bg: string, name: string, pos: CSSProperties, dur: number): ReactNode => (
    <span
      style={{
        position: "absolute",
        width: "70%",
        height: "70%",
        borderRadius: "50%",
        background: bg,
        filter: "blur(60px)",
        opacity: 0.55,
        animation: `${name} ${dur / speed}s ease-in-out infinite`,
        ...pos,
      }}
    />
  );

  return (
    <div data-avy-mesh style={{ position: "relative", overflow: "hidden", background: "#07080d", isolation: "isolate", ...style }}>
      <style>{KEYFRAMES}</style>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: -1 }}>
        {blob(palette[0], "avy-mesh-a", { left: "-10%", top: "-20%" }, 18)}
        {blob(palette[1], "avy-mesh-b", { right: "-15%", top: "0%" }, 22)}
        {blob(palette[2], "avy-mesh-c", { left: "10%", bottom: "-30%" }, 26)}
        {blob(palette[3], "avy-mesh-a", { right: "5%", bottom: "-25%", opacity: 0.25 }, 30)}
      </div>
      {children}
    </div>
  );
}

export default MeshGradient;
