export const money = (minor: number | null | undefined, currency = "RON") => minor == null
  ? "De configurat"
  : new Intl.NumberFormat("ro-RO", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);

export const financeDate = (value: number | null | undefined) => value
  ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeZone: "Europe/Bucharest" }).format(value)
  : "—";
