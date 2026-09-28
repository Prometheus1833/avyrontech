import { useEffect, useMemo, useState } from "react";

/**
 * CountrySelect — Avyron Products (avyron.ro/produse)
 * Selector de țară cu steag, prefix telefonic și monedă, alimentat de
 * REST Countries. Lista se descarcă o dată și rămâne în memorie/localStorage.
 * Docs: https://restcountries.com
 */

export type Country = { code: string; name: string; flag: string; dial: string; currency: string };

const CACHE_KEY = "avy-countries-v1";
const FIELDS = "cca2,name,flag,idd,currencies,translations";

export async function fetchCountries(signal?: AbortSignal): Promise<Country[]> {
  try {
    const cached = window.localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached) as Country[];
  } catch {
    /* fără cache: descărcăm din nou */
  }
  const response = await fetch(`https://restcountries.com/v3.1/all?fields=${FIELDS}`, { signal });
  if (!response.ok) throw new Error(`REST Countries ${response.status}`);
  const json = (await response.json()) as Array<{
    cca2: string;
    name: { common: string };
    flag: string;
    idd?: { root?: string; suffixes?: string[] };
    currencies?: Record<string, unknown>;
    translations?: Record<string, { common?: string }>;
  }>;
  const list = json
    .map((entry) => ({
      code: entry.cca2,
      name: entry.translations?.ron?.common ?? entry.name.common,
      flag: entry.flag,
      dial: `${entry.idd?.root ?? ""}${entry.idd?.suffixes?.[0] ?? ""}`,
      currency: Object.keys(entry.currencies ?? {})[0] ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    /* storage plin sau blocat */
  }
  return list;
}

export function CountrySelect({ value = "RO", onChange }: { value?: string; onChange?: (country: Country) => void }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchCountries(controller.signal)
      .then(setCountries)
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);

  const fold = (value_: string) => value_.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return (q ? countries.filter((country) => fold(country.name).includes(q) || country.code.toLowerCase().includes(q) || country.dial.includes(q)) : countries).slice(0, 60);
  }, [countries, query]);
  const current = countries.find((country) => country.code === selected);

  if (error) return <p style={{ fontSize: 12, color: "#f87171" }}>Nu am putut încărca lista de țări ({error}).</p>;

  return (
    <div style={{ color: "#fff", width: "100%", maxWidth: 320, fontSize: 12.5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }} aria-hidden>
          {current?.flag ?? "🌍"}
        </span>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>{current?.name ?? "—"}</p>
          <p style={{ margin: 0, opacity: 0.6, fontSize: 11 }}>
            {current?.dial} · {current?.currency}
          </p>
        </div>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Caută țara sau prefixul"
        aria-label="Caută țara"
        style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", padding: "6px 10px", fontSize: 12.5 }}
      />
      <ul role="listbox" aria-label="Țări" style={{ margin: "8px 0 0", padding: 0, listStyle: "none", maxHeight: 130, overflowY: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)" }}>
        {filtered.map((country) => (
          <li key={country.code} role="option" aria-selected={country.code === selected}>
            <button
              type="button"
              onClick={() => {
                setSelected(country.code);
                onChange?.(country);
              }}
              style={{ display: "flex", width: "100%", gap: 8, alignItems: "center", padding: "6px 9px", border: 0, background: country.code === selected ? "rgba(255,255,255,.08)" : "transparent", color: "#fff", cursor: "pointer", fontSize: 12.5, textAlign: "left" }}
            >
              <span aria-hidden>{country.flag}</span>
              <span style={{ flex: 1 }}>{country.name}</span>
              <span style={{ opacity: 0.5, fontSize: 11 }}>{country.dial}</span>
            </button>
          </li>
        ))}
        {countries.length === 0 && <li style={{ padding: 10, opacity: 0.55 }}>Se încarcă…</li>}
      </ul>
    </div>
  );
}

export default CountrySelect;
