import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * SmartTooltip — Avyron Products (avyron.ro/produse)
 * Tooltip care se întoarce singur când n-are loc: măsoară fereastra și alege
 * sus/jos/stânga/dreapta. Se deschide și la tastatură (focus), se închide cu
 * Escape, iar textul e legat prin `aria-describedby`.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

type Side = "top" | "bottom" | "left" | "right";

export function SmartTooltip({ label, children, preferred = "top" }: { label: string; children: ReactNode; preferred?: Side }) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<Side>(preferred);

  useEffect(() => {
    if (!open) return;
    const host = anchor.current;
    const tip = bubble.current;
    if (!host || !tip) return;
    const rect = host.getBoundingClientRect();
    const size = tip.getBoundingClientRect();
    const room = {
      top: rect.top,
      bottom: window.innerHeight - rect.bottom,
      left: rect.left,
      right: window.innerWidth - rect.right,
    };
    const needed = { top: size.height + 10, bottom: size.height + 10, left: size.width + 10, right: size.width + 10 };
    setSide(room[preferred] >= needed[preferred] ? preferred : (Object.keys(room) as Side[]).sort((a, b) => room[b] - room[a])[0]);
  }, [open, preferred]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const place: Record<Side, React.CSSProperties> = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  };

  return (
    <span
      ref={anchor}
      style={{ position: "relative", display: "inline-flex" }}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <span
        ref={bubble}
        id={id}
        role="tooltip"
        style={{
          position: "absolute",
          ...place[side],
          zIndex: 40,
          whiteSpace: "nowrap",
          padding: ".4rem .6rem",
          borderRadius: 10,
          fontSize: 12,
          color: "#fff",
          background: "rgba(12,14,24,.96)",
          border: "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 12px 30px -16px rgba(0,0,0,.9)",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity .18s ease",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </span>
  );
}

export default SmartTooltip;
