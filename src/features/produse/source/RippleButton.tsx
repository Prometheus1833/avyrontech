import { useCallback, useRef, type ButtonHTMLAttributes, type PointerEvent, type KeyboardEvent } from "react";

/**
 * RippleButton — Avyron Products (avyron.ro/produse)
 * Undă de refracție din punctul exact al apăsării. Fără dependențe.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: string;
  duration?: number;
  radius?: number;
};

export function RippleButton({ color = "#8b5cf6", duration = 600, radius = 999, style, children, onPointerDown, onKeyDown, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  const spawn = useCallback(
    (x: number, y: number) => {
      const button = ref.current;
      if (!button) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = button.getBoundingClientRect();
      const size = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y)) * 2;
      const wave = document.createElement("span");
      wave.setAttribute("aria-hidden", "true");
      Object.assign(wave.style, {
        position: "absolute",
        left: `${x - size / 2}px`,
        top: `${y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        pointerEvents: "none",
        background: `radial-gradient(circle, rgba(255,255,255,.55) 0%, rgba(255,255,255,.18) 38%, transparent 62%)`,
        boxShadow: `0 0 0 1px rgba(255,255,255,.35) inset`,
        mixBlendMode: "screen",
        transform: "scale(0)",
        opacity: "1",
        transition: `transform ${duration}ms cubic-bezier(.22,1,.36,1), opacity ${duration}ms ease-out`,
      });
      button.appendChild(wave);
      requestAnimationFrame(() => {
        wave.style.transform = "scale(1)";
        wave.style.opacity = "0";
      });
      window.setTimeout(() => wave.remove(), duration + 50);
    },
    [duration],
  );

  const handlePointer = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    spawn(event.clientX - rect.left, event.clientY - rect.top);
    onPointerDown?.(event);
  };

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      const rect = event.currentTarget.getBoundingClientRect();
      spawn(rect.width / 2, rect.height / 2);
    }
    onKeyDown?.(event);
  };

  return (
    <button
      ref={ref}
      {...rest}
      onPointerDown={handlePointer}
      onKeyDown={handleKey}
      style={{
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        border: 0,
        cursor: "pointer",
        padding: "0.85rem 1.6rem",
        borderRadius: radius,
        color: "#fff",
        fontWeight: 600,
        background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, #22d3ee))`,
        boxShadow: `0 10px 30px -12px ${color}`,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export default RippleButton;
