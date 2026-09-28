import { useState } from "react";

/**
 * PlanCompare — Avyron Products (avyron.ro/produse)
 * Tabelul care compară pachetele pe caracteristici, cu antet lipit sus la
 * derulare pe desktop și, pe telefon, un pachet odată — nu un tabel de 5
 * coloane strivit pe 360px. Tabel real, deci se citește și cu cititor de ecran.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export type ComparePlan = { id: string; name: string; price: string; note?: string; highlight?: boolean };
export type CompareRow = { label: string; values: Record<string, string | boolean> };

const cell = (value: string | boolean) =>
  typeof value === "boolean" ? (
    <span aria-label={value ? "inclus" : "nu e inclus"} style={{ color: value ? "#a3e635" : "rgba(255,255,255,.3)" }}>
      {value ? "✓" : "—"}
    </span>
  ) : (
    value
  );

export function PlanCompare({ plans, rows }: { plans: ComparePlan[]; rows: CompareRow[] }) {
  const [mobile, setMobile] = useState(plans.findIndex((plan) => plan.highlight) < 0 ? 0 : plans.findIndex((plan) => plan.highlight));
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 560px)").matches;
  const shown = narrow ? [plans[mobile]] : plans;

  return (
    <div style={{ width: "100%", color: "#fff", display: "grid", gap: 10 }}>
      {narrow && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {plans.map((plan, index) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setMobile(index)}
              aria-pressed={mobile === index}
              style={{
                padding: ".35rem .7rem",
                borderRadius: 999,
                border: 0,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                color: mobile === index ? "#fff" : "rgba(255,255,255,.6)",
                background: mobile === index ? "linear-gradient(135deg,#8b5cf6,#22d3ee)" : "rgba(255,255,255,.06)",
              }}
            >
              {plan.name}
            </button>
          ))}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: "left", padding: "6px 8px", position: "sticky", top: 0, background: "#0a0d18" }} />
            {shown.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                style={{
                  textAlign: "left",
                  padding: "6px 8px",
                  position: "sticky",
                  top: 0,
                  background: plan.highlight ? "rgba(139,92,246,.18)" : "#0a0d18",
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                }}
              >
                <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{plan.name}</span>
                <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.7)" }}>{plan.price}</span>
                {plan.note && <span style={{ display: "block", fontSize: 10.5, color: "rgba(255,255,255,.45)" }}>{plan.note}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <th scope="row" style={{ textAlign: "left", padding: "7px 8px", fontWeight: 500, color: "rgba(255,255,255,.75)" }}>
                {row.label}
              </th>
              {shown.map((plan) => (
                <td key={plan.id} style={{ padding: "7px 8px", background: plan.highlight ? "rgba(139,92,246,.07)" : "transparent" }}>
                  {cell(row.values[plan.id] ?? false)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PlanCompare;
