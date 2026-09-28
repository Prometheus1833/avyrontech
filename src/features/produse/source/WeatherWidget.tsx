import { useEffect, useState } from "react";

/**
 * WeatherWidget — Avyron Products (avyron.ro/produse)
 * Prognoză Open-Meteo, fără cheie API. Atribuirea cerută e afișată.
 * Docs: https://open-meteo.com/en/docs
 */

type Forecast = { temp: number; code: number; wind: number; daily: Array<{ day: string; min: number; max: number; code: number }> };

const ICON: Record<number, string> = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 61: "🌧️", 63: "🌧️", 65: "🌧️", 71: "🌨️", 73: "🌨️", 75: "❄️", 80: "🌦️", 95: "⛈️", 96: "⛈️" };
export const weatherIcon = (code: number) => ICON[code] ?? "🌡️";

export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Forecast> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  const json = (await response.json()) as {
    current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
    daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[] };
  };
  return {
    temp: json.current.temperature_2m,
    code: json.current.weather_code,
    wind: json.current.wind_speed_10m,
    daily: json.daily.time.map((day, i) => ({
      day,
      min: json.daily.temperature_2m_min[i],
      max: json.daily.temperature_2m_max[i],
      code: json.daily.weather_code[i],
    })),
  };
}

export function WeatherWidget({ lat = 47.1585, lon = 27.6014, place = "Iași", locale = "ro-RO" }: { lat?: number; lon?: number; place?: string; locale?: string }) {
  const [data, setData] = useState<Forecast | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchForecast(lat, lon, controller.signal)
      .then(setData)
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [lat, lon]);

  if (error) return <p style={{ fontSize: 12, color: "#f87171" }}>Nu am putut încărca prognoza ({error}).</p>;
  if (!data) return <p style={{ fontSize: 12, opacity: 0.6 }}>Se încarcă prognoza…</p>;

  const dayName = (iso: string) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(`${iso}T12:00:00`));

  return (
    <div style={{ color: "#fff", width: "100%", maxWidth: 320 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 34, lineHeight: 1 }} aria-hidden>
          {weatherIcon(data.code)}
        </span>
        <div>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{Math.round(data.temp)}°C</p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
            {place} · {Math.round(data.wind)} km/h
          </p>
        </div>
      </div>
      <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, textAlign: "center", fontSize: 11 }}>
        {data.daily.map((d) => (
          <li key={d.day} style={{ borderRadius: 10, background: "rgba(255,255,255,.05)", padding: "7px 4px" }}>
            <span style={{ display: "block", opacity: 0.55 }}>{dayName(d.day)}</span>
            <span style={{ display: "block", fontSize: 16 }} aria-hidden>
              {weatherIcon(d.code)}
            </span>
            <span style={{ display: "block", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(d.max)}° / {Math.round(d.min)}°
            </span>
          </li>
        ))}
      </ul>
      <p style={{ margin: "8px 0 0", fontSize: 10, opacity: 0.4 }}>Date meteo: Open-Meteo.com (CC BY 4.0)</p>
    </div>
  );
}

export default WeatherWidget;
