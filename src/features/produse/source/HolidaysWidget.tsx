import { useEffect, useState } from "react";

/**
 * HolidaysWidget — Avyron Products (avyron.ro/produse)
 * Zilele libere legale, din API-ul public Nager.Date — fără cheie, fără cont,
 * răspuns JSON simplu: `https://date.nager.at/api/v3/PublicHolidays/{an}/{țară}`.
 * Util pentru pagini de contact, programări și livrări: arată cât e până la
 * următoarea zi liberă, ca să nu promiți termene în sărbătoare.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

type Holiday = { date: string; localName: string; name: string };

const daysUntil = (date: string) => Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86400000);

export function HolidaysWidget({ country = "RO", limit = 4 }: { country?: string; limit?: number }) {
  const [items, setItems] = useState<Holiday[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const year = new Date().getFullYear();
    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: Holiday[]) => setItems(data.filter((entry) => daysUntil(entry.date) >= 0).slice(0, limit)))
      .catch(() => !controller.signal.aborted && setError(true));
    return () => controller.abort();
  }, [country, limit]);

  if (error) return <p style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>Calendarul nu a răspuns. Încearcă mai târziu.</p>;
  if (!items) return <p style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>Se încarcă zilele libere…</p>;

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6, width: "100%" }}>
      {items.map((holiday) => {
        const left = daysUntil(holiday.date);
        return (
          <li
            key={holiday.date + holiday.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: ".5rem .7rem",
              borderRadius: 12,
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.08)",
              color: "#fff",
              fontSize: 12.5,
            }}
          >
            <span>
              <strong style={{ fontWeight: 600 }}>{holiday.localName}</strong>
              <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                {new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long" }).format(new Date(`${holiday.date}T00:00:00`))}
              </span>
            </span>
            <span style={{ fontSize: 11, color: left <= 7 ? "#fbbf24" : "rgba(255,255,255,.6)" }}>{left === 0 ? "azi" : `în ${left} zile`}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default HolidaysWidget;
