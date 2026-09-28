import { useEffect, useMemo, useState } from "react";

/**
 * CurrencyConverter — Avyron Products (avyron.ro/produse)
 * Conversie pe cursurile BCE prin API-ul open-source Frankfurter (fără cheie).
 * Docs: https://frankfurter.dev
 */

const CURRENCIES = ["RON", "EUR", "USD", "GBP", "CHF", "HUF", "PLN"];

export async function fetchRate(from: string, to: string, signal?: AbortSignal): Promise<{ rate: number; date: string }> {
  if (from === to) return { rate: 1, date: new Date().toISOString().slice(0, 10) };
  const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`, { signal });
  if (!response.ok) throw new Error(`Frankfurter ${response.status}`);
  const json = (await response.json()) as { rates: Record<string, number>; date: string };
  return { rate: json.rates[to], date: json.date };
}

export function CurrencyConverter({ locale = "ro-RO" }: { locale?: string }) {
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("RON");
  const [state, setState] = useState<{ rate: number; date: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchRate(from, to, controller.signal)
      .then(setState)
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [from, to]);

  const result = useMemo(() => (state ? amount * state.rate : null), [amount, state]);
  const select: React.CSSProperties = { borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", padding: "6px 8px", fontSize: 12 };

  return (
    <div style={{ color: "#fff", display: "grid", gap: 8, width: "100%", maxWidth: 320, fontSize: 12 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-label="Sumă"
          style={{ ...select, flex: 1, fontVariantNumeric: "tabular-nums" }}
        />
        <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Din" style={select}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label="Inversează" style={{ ...select, cursor: "pointer" }}>
          ⇄
        </button>
        <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="În" style={select}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {error && <p style={{ margin: 0, color: "#f87171" }}>Curs indisponibil ({error}).</p>}
      {result !== null && !error && (
        <>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {new Intl.NumberFormat(locale, { style: "currency", currency: to, maximumFractionDigits: 2 }).format(result)}
          </p>
          <p style={{ margin: 0, opacity: 0.5, fontSize: 11 }}>
            1 {from} = {state?.rate.toFixed(4)} {to} · curs BCE {state?.date}
          </p>
        </>
      )}
    </div>
  );
}

export default CurrencyConverter;
