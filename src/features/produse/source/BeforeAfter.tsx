import { useRef, useState } from "react";

/**
 * BeforeAfter — Avyron Products (avyron.ro/produse)
 * Comparație înainte/după cu mâner tras. Funcționează și din tastatură
 * (săgeți, Home/End), pentru că altfel jumătate din oameni n-o pot folosi.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export function BeforeAfter({
  before,
  after,
  beforeAlt,
  afterAlt,
  start = 50,
}: {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
  start?: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(start);

  const moveTo = (clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div
      ref={frame}
      style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", overflow: "hidden", borderRadius: 18, border: "1px solid rgba(255,255,255,.12)", touchAction: "none" }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && moveTo(event.clientX)}
    >
      <img src={after} alt={afterAlt} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <img
        src={before}
        alt={beforeAlt}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", clipPath: `inset(0 ${100 - split}% 0 0)` }}
      />
      <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: `${split}%`, width: 2, background: "rgba(255,255,255,.85)", boxShadow: "0 0 18px rgba(0,0,0,.5)" }} />
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(split)}
        onChange={(event) => setSplit(Number(event.target.value))}
        aria-label="Poziția comparației"
        style={{
          position: "absolute",
          left: "5%",
          right: "5%",
          bottom: 12,
          width: "90%",
          accentColor: "#8b5cf6",
        }}
      />
    </div>
  );
}

export default BeforeAfter;
