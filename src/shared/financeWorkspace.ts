export const FINANCE_GROUPS = [
  {
    id: "summary",
    label: "Situație și rapoarte",
    views: ["overview", "statistics"],
  },
  {
    id: "income",
    label: "Venituri și încasări",
    views: ["revenues", "receipts"],
  },
  {
    id: "planning",
    label: "Cheltuieli și limite",
    views: ["expenses", "subscriptions", "budgets"],
  },
  { id: "accounts", label: "Conturi și facturare", views: ["accounts"] },
  { id: "control", label: "Alerte și audit", views: ["alerts", "audit"] },
] as const;
export type FinanceView = (typeof FINANCE_GROUPS)[number]["views"][number];
export function financialView(
  value: string | null,
  accounts: boolean,
  audit: boolean,
): FinanceView {
  const allowed = FINANCE_GROUPS.flatMap((g) => [...g.views] as FinanceView[])
    .filter((v) => v !== "accounts" || accounts)
    .filter((v) => v !== "audit" || audit);
  return allowed.includes(value as FinanceView)
    ? (value as FinanceView)
    : "overview";
}

const roClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Bucharest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const clockParts = (timestamp: number) =>
  Object.fromEntries(
    roClock
      .formatToParts(timestamp)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  );
/** Resolve a Romanian calendar date without assuming a fixed summer/winter offset. */
export function bucharestLocalTime(date: string, time = "00:00:00"): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time))
    throw new Error("invalid_date");
  const [year, month, day] = date.split("-").map(Number),
    [h, m, sec = 0] = time.split(":").map(Number),
    target = Date.UTC(year, month - 1, day, h, m, sec);
  if (
    new Date(target).toISOString().slice(0, 10) !== date ||
    h > 23 ||
    m > 59 ||
    sec > 59
  )
    throw new Error("invalid_date");
  let result = target;
  for (let i = 0; i < 3; i++) {
    const p = clockParts(result),
      delta =
        target -
        Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    if (!delta) return result;
    result += delta;
  }
  throw new Error("invalid_local_time");
}
export function bucharestMonthBounds(now: number) {
  const p = clockParts(now),
    day = (year: number, month: number) =>
      new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  return [
    bucharestLocalTime(day(p.year, p.month)),
    bucharestLocalTime(day(p.year, p.month + 1)),
  ] as const;
}
export function financialRange(
  period: string,
  now: number,
  customFrom = "",
  customTo = "",
): readonly [number, number] {
  const p = clockParts(now),
    first = (year: number, month: number) =>
      bucharestLocalTime(
        new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10),
      );
  if (period === "custom") {
    const from = bucharestLocalTime(customFrom),
      last = bucharestLocalTime(customTo);
    if (from > last) throw new Error("invalid_range");
    const next = new Date(customTo + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    return [from, bucharestLocalTime(next.toISOString().slice(0, 10)) - 1];
  }
  if (period === "previous")
    return [first(p.year, p.month - 1), first(p.year, p.month) - 1];
  return [
    first(
      p.year,
      period === "year"
        ? 1
        : p.month - (period === "3m" ? 2 : period === "6m" ? 5 : 0),
    ),
    now,
  ];
}
