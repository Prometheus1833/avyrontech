import { type CSSProperties } from "react";

/**
 * Stepper — Avyron Products (avyron.ro/produse)
 * Pași de proces cu linie care se umple. Accesibil: lista e un `<ol>`, pasul
 * curent poartă `aria-current`, iar animația respectă „mișcare redusă".
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export type Step = { label: string; hint?: string };

export function Stepper({
  steps,
  current = 0,
  color = "#8b5cf6",
  style,
}: {
  steps: Step[];
  current?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const progress = steps.length > 1 ? Math.min(1, Math.max(0, current / (steps.length - 1))) : 1;

  return (
    <ol style={{ position: "relative", display: "flex", listStyle: "none", margin: 0, padding: 0, gap: 4, ...style }}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: "1.1rem",
          right: "1.1rem",
          top: 13,
          height: 2,
          background: "rgba(255,255,255,.14)",
          borderRadius: 2,
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: "1.1rem",
          top: 13,
          height: 2,
          width: `calc((100% - 2.2rem) * ${progress})`,
          background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 45%, #22d3ee))`,
          borderRadius: 2,
          transition: "width .5s cubic-bezier(.22,1,.36,1)",
        }}
      />
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.label} style={{ position: "relative", flex: 1, textAlign: "center" }} aria-current={active ? "step" : undefined}>
            <span
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: 28,
                height: 28,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                color: done || active ? "#fff" : "rgba(255,255,255,.55)",
                background: done || active ? `linear-gradient(135deg, ${color}, #22d3ee)` : "rgba(255,255,255,.08)",
                boxShadow: active ? `0 0 0 4px color-mix(in oklab, ${color} 25%, transparent)` : "none",
                transition: "background .3s ease, box-shadow .3s ease",
              }}
            >
              {done ? "✓" : index + 1}
            </span>
            <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,.7)" }}>{step.label}</p>
            {step.hint && <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,.45)" }}>{step.hint}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export default Stepper;
