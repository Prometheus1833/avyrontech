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
export const ANNUAL_DISCOUNT_PERCENT = 20;
export const ANNUAL_PROMOTION_CODE = "ANUALAVY20";
const CART_STORAGE_KEY = "avyron_cart_v2";

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

export const annualSubscriptionTotal = (monthlyPriceCents: number) =>
  Math.round(monthlyPriceCents * 12 * (1 - ANNUAL_DISCOUNT_PERCENT / 100));

export function addAnnualSubscriptionToCart(input: { sku: string; name: string; monthlyPriceCents: number }) {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  let items: Array<Record<string, unknown>> = [];
  try { items = raw ? JSON.parse(raw) : []; } catch { items = []; }
  if (!Array.isArray(items)) items = [];
  items = items.filter((item) => item?.type !== "subscription");
  items.push({
    id: crypto.randomUUID(), sku: input.sku, type: "subscription", name: input.name,
    period: "annual", price_estimate: input.monthlyPriceCents, price_currency: "RON",
    notes: `Pachet anual · ${ANNUAL_DISCOUNT_PERCENT}% avantaj aplicat la validarea comenzii`,
  });
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
  window.dispatchEvent(new CustomEvent("avyron:cart-updated"));
  return true;
}

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
