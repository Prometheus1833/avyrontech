/**
 * Punctul unic prin care trece selectarea unui abonament.
 *
 * Workerul acceptă un singur abonament pe comandă, cu cantitatea 1 și perioada
 * „monthly" sau „annual"; el recalculează prețul din catalog, deci valorile de
 * aici sunt doar pentru afișare.
 *
 * Plata cu cardul este pregătită, dar dezactivată până la integrarea
 * procesatorului (Stripe / Netopia): când gateway-ul intră în funcțiune se
 * schimbă `PAYMENT_GATEWAY_ENABLED` și implementarea din `startCardPayment`,
 * restul fluxului rămâne neatins.
 */

export const PAYMENT_GATEWAY_ENABLED = false;

export type BillingPeriodValue = "monthly" | "annual";

export type BillingPeriod = {
  value: BillingPeriodValue;
  months: number;
  ro: string;
  en: string;
  hintRo: string;
  hintEn: string;
};

export const BILLING_PERIODS: BillingPeriod[] = [
  { value: "monthly", months: 1, ro: "Lunar", en: "Monthly", hintRo: "flexibil, oprești oricând", hintEn: "flexible, stop any time" },
  { value: "annual", months: 12, ro: "Anual", en: "Annual", hintRo: "12 luni facturate o dată", hintEn: "12 months billed once" },
];

export type OrderItemPayload = {
  sku: string;
  quantity: 1;
  period: BillingPeriodValue;
  notes?: string;
};

export const buildOrderItems = (sku: string, period: BillingPeriod, notes?: string): OrderItemPayload[] => [
  { sku, quantity: 1, period: period.value, notes },
];

/**
 * Starea trimisă către /auth ca vizitatorul să revină exact la abonamentul
 * ales după autentificare. Pagina de login navighează pe `state.from`.
 */
export const authStateFor = (path: string, sku: string) => ({ from: `${path}?plan=${sku}` });

/**
 * Locul în care se va cupla procesatorul de plăți. Până atunci, apelul aruncă
 * intenționat, ca nicio interfață să nu poată pretinde că a încasat ceva.
 */
export async function startCardPayment(): Promise<never> {
  throw new Error("payment_gateway_unavailable");
}
