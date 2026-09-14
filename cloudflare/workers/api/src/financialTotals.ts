/** No implicit EUR/USD -> RON conversion. Unconfigured amounts remain unknown. */
export const RON_AMOUNT_SQL = "CASE WHEN currency = 'RON' THEN gross_amount_minor ELSE amount_ron_minor END";

export function bucharestMonthStart(timestamp: number): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest', year: 'numeric', month: 'numeric',
  }).formatToParts(timestamp);
  const year = Number(parts.find(part => part.type === 'year')!.value);
  const month = Number(parts.find(part => part.type === 'month')!.value);
  const utcMidnight = Date.UTC(year, month - 1, 1);
  const offsetHours = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest', hour: '2-digit', hourCycle: 'h23',
  }).format(utcMidnight));
  return utcMidnight - offsetHours * 3_600_000;
}

export async function financialTotals(db: D1Database, from: number, to: number) {
  return db.prepare(`SELECT
    (SELECT COALESCE(SUM(${RON_AMOUNT_SQL}),0) FROM financial_expenses
      WHERE archived_at IS NULL AND COALESCE(paid_date,invoice_date,created_at) BETWEEN ? AND ?) AS expenses,
    (SELECT COALESCE(SUM(${RON_AMOUNT_SQL}),0) FROM financial_revenues
      WHERE archived_at IS NULL AND status IN ('paid','partially_paid')
        AND COALESCE(payment_date,invoice_date,created_at) BETWEEN ? AND ?) AS revenues,
    (SELECT COUNT(*) FROM financial_alerts WHERE status IN ('open','acknowledged') AND severity = 'critical') AS critical_alerts
  `).bind(from,to,from,to).first<{expenses:number;revenues:number;critical_alerts:number}>();
}
