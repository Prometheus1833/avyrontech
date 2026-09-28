import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

/**
 * Cursul BNR, citit prin endpointul public al site-ului (`/api/public/exchange-rate`),
 * care face deja cache pe edge — exact fluxul pe care îl livrează produsul.
 */
export default function BnrDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const [state, setState] = useState<{ rate: number; date?: string; source?: string } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("/api/public/exchange-rate"), { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((json: { rate?: number; referenceDate?: string; status?: string }) => {
        if (typeof json.rate === "number") setState({ rate: json.rate, date: json.referenceDate, source: json.status });
        else setError(true);
      })
      .catch(() => setError(true));
    return () => controller.abort();
  }, []);

  return (
    <Stage>
      <div className="text-center text-white">
        {error && <p className="text-xs text-white/60">{ro ? "Cursul nu e disponibil în previzualizare." : "The rate isn't available in the preview."}</p>}
        {state && (
          <>
            <p className="pa-mono text-[10px] uppercase tracking-[0.2em] text-white/45">EUR → RON</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{state.rate.toFixed(4)}</p>
            <p className="mt-1 text-xs text-white/50">
              {ro ? "curs de referință" : "reference rate"} {state.date ?? ""} {state.source ? `· ${state.source}` : ""}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-left text-[11px]">
              {[100, 500, 1500].map((amount) => (
                <div key={amount} className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                  <p className="pa-mono text-white/45">{amount} €</p>
                  <p className="pa-mono mt-0.5 tabular-nums text-white">{Math.round(amount * state.rate)} lei</p>
                </div>
              ))}
            </div>
          </>
        )}
        {!state && !error && <p className="text-xs text-white/50">{ro ? "Se încarcă cursul…" : "Loading the rate…"}</p>}
      </div>
    </Stage>
  );
}
