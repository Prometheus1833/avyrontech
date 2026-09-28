import { useMemo, useState } from "react";

/**
 * VatCalculator — Avyron Products (avyron.ro/produse)
 * Calculează TVA în ambele sensuri: adaugă cota la un preț fără TVA sau o
 * extrage dintr-un preț cu TVA. Cota e o setare, nu o constantă din cod: pune
 * valoarea în vigoare la data la care folosești calculatorul.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

const money = (value: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);

export function VatCalculator({ rate: initialRate = 21, amount: initialAmount = 1000 }: { rate?: number; amount?: number }) {
  const [rate, setRate] = useState(initialRate);
  const [amount, setAmount] = useState(String(initialAmount));
  const [mode, setMode] = useState<"add" | "extract">("add");

  const result = useMemo(() => {
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return null;
    const factor = 1 + rate / 100;
    if (mode === "add") {
      const vat = value * (rate / 100);
      return { net: value, vat, gross: value + vat };
    }
    const net = value / factor;
    return { net, vat: value - net, gross: value };
  }, [amount, rate, mode]);

  const field = {
    width: "100%",
    padding: ".5rem .7rem",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.04)",
    color: "#fff",
  } as const;

  return (
    <div style={{ display: "grid", gap: 10, width: "100%", color: "#fff" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {(
          [
            ["add", "Adaugă TVA"],
            ["extract", "Extrage TVA"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            aria-pressed={mode === id}
            style={{
              flex: 1,
              padding: ".4rem .6rem",
              borderRadius: 10,
              border: 0,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: mode === id ? "#fff" : "rgba(255,255,255,.6)",
              background: mode === id ? "linear-gradient(135deg,#8b5cf6,#22d3ee)" : "rgba(255,255,255,.06)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 2, fontSize: 11, color: "rgba(255,255,255,.6)" }}>
          {mode === "add" ? "Preț fără TVA" : "Preț cu TVA"}
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" style={{ ...field, marginTop: 4 }} />
        </label>
        <label style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,.6)" }}>
          Cota (%)
          <input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
            style={{ ...field, marginTop: 4 }}
          />
        </label>
      </div>

      {result && (
        <dl style={{ margin: 0, display: "grid", gap: 4, fontSize: 12.5 }}>
          {(
            [
              ["Bază (fără TVA)", result.net],
              [`TVA ${rate}%`, result.vat],
              ["Total (cu TVA)", result.gross],
            ] as const
          ).map(([label, value], index) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: index === 2 ? 6 : 0, borderTop: index === 2 ? "1px solid rgba(255,255,255,.12)" : "none" }}>
              <dt style={{ color: "rgba(255,255,255,.65)" }}>{label}</dt>
              <dd style={{ margin: 0, fontWeight: index === 2 ? 700 : 500, fontVariantNumeric: "tabular-nums" }}>{money(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.45)" }}>Cota implicită e doar o valoare de start. Pune cota în vigoare la data facturii.</p>
    </div>
  );
}

export default VatCalculator;
