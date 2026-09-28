import { useEffect, useState } from "react";

/**
 * OpeningHours — Avyron Products (avyron.ro/produse)
 * Programul de lucru care spune singur „deschis acum" sau „se deschide la 9:00",
 * cu zilele libere scoase din calcul. Ora se citește în fusul specificat, nu în
 * cel al vizitatorului — altfel un client din altă țară vede ora lui.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

/** Program pe zilele săptămânii: 0 = duminică. `null` = închis. */
export type Week = Record<number, { open: string; close: string } | null>;

const DAY_NAMES = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];

const minutesOf = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

/** Data și ora locului, nu ale vizitatorului. */
function inZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const iso = `${get("year")}-${get("month")}-${get("day")}`;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { iso, weekday, minutes: minutesOf(`${get("hour")}:${get("minute")}`) };
}

export function OpeningHours({
  week,
  holidays = [],
  timeZone = "Europe/Bucharest",
}: {
  week: Week;
  /** Zile libere, ca `YYYY-MM-DD`. Poți lua lista din produsul „Zile libere legale". */
  holidays?: string[];
  timeZone?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const { iso, weekday, minutes } = inZone(timeZone);
  void tick;
  const holiday = holidays.includes(iso);
  const today = holiday ? null : week[weekday];
  const openNow = Boolean(today && minutes >= minutesOf(today.open) && minutes < minutesOf(today.close));

  const status = holiday
    ? "Închis — zi liberă legală"
    : !today
      ? "Închis azi"
      : openNow
        ? `Deschis acum — până la ${today.close}`
        : minutes < minutesOf(today.open)
          ? `Închis — se deschide la ${today.open}`
          : "Închis — s-a terminat programul";

  return (
    <div style={{ display: "grid", gap: 8, width: "100%", color: "#fff" }}>
      <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
        <span
          aria-hidden
          style={{ width: 8, height: 8, borderRadius: 999, background: openNow ? "#a3e635" : "#f87171", boxShadow: `0 0 10px ${openNow ? "#a3e635" : "#f87171"}` }}
        />
        {status}
      </p>
      <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
        <caption style={{ captionSide: "top", textAlign: "left", fontSize: 11, color: "rgba(255,255,255,.45)", paddingBottom: 4 }}>
          Program (ora {timeZone.split("/")[1]?.replace("_", " ")})
        </caption>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const entry = week[day];
            const isToday = day === weekday;
            return (
              <tr key={day} style={{ color: isToday ? "#fff" : "rgba(255,255,255,.65)", fontWeight: isToday ? 600 : 400 }}>
                <th scope="row" style={{ textAlign: "left", padding: "2px 12px 2px 0", fontWeight: "inherit" }}>
                  {DAY_NAMES[day]}
                </th>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{entry ? `${entry.open} – ${entry.close}` : "închis"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default OpeningHours;
