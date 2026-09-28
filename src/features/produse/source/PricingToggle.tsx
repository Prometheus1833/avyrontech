import { useState } from "react";

/**
 * PricingToggle — Avyron Products (avyron.ro/produse)
 * Trei planuri, comutator lunar/anual, economia calculată în bani și procente.
 */

export type Plan = {
  id: string;
  name: string;
  monthly: number;
  yearly: number;
  currency?: string;
  perks: string[];
  recommended?: boolean;
  cta?: string;
};

type Props = {
  plans: Plan[];
  locale?: string;
  labels?: Partial<Record<"monthly" | "yearly" | "save" | "perMonth" | "perYear" | "recommended", string>>;
  onSelect?: (id: string, cycle: "monthly" | "yearly") => void;
};

export function PricingToggle({ plans, locale = "ro-RO", labels = {}, onSelect }: Props) {
  const l = { monthly: "Lunar", yearly: "Anual", save: "economisești", perMonth: "/lună", perYear: "/an", recommended: "Recomandat", ...labels };
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const fmt = (value: number, currency = "RON") =>
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <div role="group" aria-label={l.monthly + " / " + l.yearly} style={{ display: "inline-flex", padding: 4, borderRadius: 999, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }}>
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cycle === c}
              onClick={() => setCycle(c)}
              style={{
                border: 0,
                cursor: "pointer",
                borderRadius: 999,
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: cycle === c ? "#fff" : "rgba(255,255,255,.6)",
                background: cycle === c ? "linear-gradient(135deg,#8b5cf6,#22d3ee)" : "transparent",
              }}
            >
              {c === "monthly" ? l.monthly : l.yearly}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        {plans.map((plan) => {
          const price = cycle === "monthly" ? plan.monthly : plan.yearly;
          const saved = plan.monthly * 12 - plan.yearly;
          const pct = plan.monthly > 0 ? Math.round((saved / (plan.monthly * 12)) * 100) : 0;
          return (
            <div
              key={plan.id}
              style={{
                position: "relative",
                padding: 18,
                borderRadius: 20,
                border: `1px solid ${plan.recommended ? "rgba(139,92,246,.55)" : "rgba(255,255,255,.1)"}`,
                background: plan.recommended ? "linear-gradient(160deg, rgba(139,92,246,.16), rgba(34,211,238,.05))" : "rgba(255,255,255,.03)",
                color: "#fff",
              }}
            >
              {plan.recommended && (
                <span style={{ position: "absolute", top: -10, left: 18, borderRadius: 999, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", padding: "2px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>
                  {l.recommended}
                </span>
              )}
              <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{plan.name}</p>
              <p style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>
                {fmt(price, plan.currency)}
                <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.55 }}>{cycle === "monthly" ? l.perMonth : l.perYear}</span>
              </p>
              {cycle === "yearly" && saved > 0 && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#86efac" }}>
                  {l.save} {fmt(saved, plan.currency)} ({pct}%)
                </p>
              )}
              <ul style={{ margin: "12px 0 14px", padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 12.5, opacity: 0.75 }}>
                {plan.perks.map((perk) => (
                  <li key={perk}>— {perk}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onSelect?.(plan.id, cycle)}
                style={{ width: "100%", padding: "0.65rem", borderRadius: 999, border: plan.recommended ? 0 : "1px solid rgba(255,255,255,.18)", background: plan.recommended ? "linear-gradient(135deg,#8b5cf6,#22d3ee)" : "transparent", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                {plan.cta ?? plan.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PricingToggle;
