import { useState } from "react";
import type { DemoProps } from "./registry";

/**
 * Geocodare: demo-ul nu apelează Nominatim direct (politica lor cere worker cu
 * User-Agent propriu și o cerere pe secundă), deci arată fluxul cu un răspuns
 * de exemplu. Codul livrat conține worker-ul care face apelul real.
 */
const SAMPLE = [
  { label: "Strada Palat 1, Iași, Iași, 700032, România", lat: 47.1585, lon: 27.5877 },
  { label: "Piața Unirii, Iași, România", lat: 47.1719, lon: 27.5766 },
  { label: "Copou, Iași, România", lat: 47.1875, lon: 27.5708 },
];

export default function GeoDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const [query, setQuery] = useState("Palat 1 Iasi");
  const [results, setResults] = useState<typeof SAMPLE>([]);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    window.setTimeout(() => {
      setResults(SAMPLE);
      setBusy(false);
    }, 500);
  };

  return (
    <div className="h-full w-full overflow-auto p-4 text-white">
      <p className="pa-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
        {ro ? "Geocodare · răspuns de exemplu" : "Geocoding · sample response"}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={ro ? "Adresă" : "Address"}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
        />
        <button type="button" onClick={run} className="rounded-xl bg-gradient-to-br from-brand to-brand-2 px-3 py-2 text-sm font-semibold">
          {busy ? "…" : ro ? "Caută" : "Search"}
        </button>
      </div>
      <ul className="mt-3 grid list-none gap-1.5 p-0">
        {results.map((entry) => (
          <li key={entry.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-xs">
            <p className="text-white/85">{entry.label}</p>
            <p className="pa-mono mt-0.5 text-[11px] text-white/45">
              {entry.lat.toFixed(4)}, {entry.lon.toFixed(4)}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-white/40">
        {ro
          ? "Date © colaboratorii OpenStreetMap. Worker-ul livrat respectă limita de o cerere pe secundă și pune rezultatele în cache 30 de zile."
          : "Data © OpenStreetMap contributors. The shipped worker respects the one-request-per-second limit and caches results for 30 days."}
      </p>
    </div>
  );
}
