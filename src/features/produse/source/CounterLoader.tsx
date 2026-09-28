import { useEffect, useRef, useState } from "react";

/**
 * CounterLoader — Avyron Products (avyron.ro/produse)
 * Contor 0→100 în tipografie mare, apoi cortina se ridică peste pagină.
 */

type Props = {
  /** Progres real 0..1. Lipsă = simulat. */
  progress?: number;
  duration?: number;
  label?: string;
  onDone?: () => void;
};

export function CounterLoader({ progress, duration = 1600, label = "AVYRON", onDone }: Props) {
  const [value, setValue] = useState(0);
  const [lift, setLift] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (typeof progress === "number") {
      setValue(Math.round(progress * 100));
      if (progress >= 1 && !done.current) {
        done.current = true;
        setLift(true);
        window.setTimeout(() => onDone?.(), 700);
      }
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(t * 100));
      if (t < 1) frame = requestAnimationFrame(tick);
      else if (!done.current) {
        done.current = true;
        setLift(true);
        window.setTimeout(() => onDone?.(), 700);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [progress, duration, onDone]);

  return (
    <div
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "#08090e",
        transform: lift ? "translateY(-100%)" : "none",
        transition: "transform .7s cubic-bezier(.76,0,.24,1)",
        zIndex: 20,
      }}
    >
      <div style={{ textAlign: "center", color: "#fff" }}>
        <p style={{ margin: 0, fontSize: "clamp(2.5rem,12vw,6rem)", fontWeight: 800, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {String(value).padStart(3, "0")}
        </p>
        <p style={{ margin: "10px 0 0", fontSize: 11, letterSpacing: "0.4em", opacity: 0.5 }}>{label}</p>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 2, width: `${value}%`, background: "linear-gradient(90deg,#8b5cf6,#22d3ee)", transition: "width .2s" }} />
    </div>
  );
}

export default CounterLoader;
