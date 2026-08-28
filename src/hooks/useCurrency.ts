import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/apiBase";

export type DisplayCurrency = "EUR" | "RON";
export type ExchangeRateStatus = "loading" | "fresh" | "stale" | "fallback";

type ExchangeRate = {
  base: "EUR";
  quote: "RON";
  rate: number;
  referenceDate: string;
  fetchedAt: number;
  provider: string;
  sourceUrl: string;
  status: Exclude<ExchangeRateStatus, "loading">;
};

const CURRENCY_STORAGE_KEY = "avyron-display-currency";
const CURRENCY_EVENT = "avyron:currency-change";
const FALLBACK_RATE = 5.25;

let cachedRate: ExchangeRate | null = null;
let pendingRate: Promise<ExchangeRate> | null = null;

const isDisplayCurrency = (value: unknown): value is DisplayCurrency => value === "EUR" || value === "RON";

const readPreferredCurrency = (): DisplayCurrency => {
  if (typeof window === "undefined") return "EUR";
  try {
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isDisplayCurrency(stored) ? stored : "EUR";
  } catch {
    return "EUR";
  }
};

const fallbackExchangeRate = (): ExchangeRate => ({
  base: "EUR",
  quote: "RON",
  rate: FALLBACK_RATE,
  referenceDate: "",
  fetchedAt: 0,
  provider: "Avyron",
  sourceUrl: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html",
  status: "fallback",
});

const validExchangeRate = (value: unknown): value is ExchangeRate => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ExchangeRate>;
  return candidate.base === "EUR"
    && candidate.quote === "RON"
    && typeof candidate.rate === "number"
    && Number.isFinite(candidate.rate)
    && candidate.rate >= 1
    && candidate.rate <= 20
    && typeof candidate.referenceDate === "string"
    && typeof candidate.fetchedAt === "number"
    && typeof candidate.provider === "string"
    && typeof candidate.sourceUrl === "string"
    && ["fresh", "stale", "fallback"].includes(String(candidate.status));
};

async function loadExchangeRate(): Promise<ExchangeRate> {
  if (cachedRate) return cachedRate;
  if (pendingRate) return pendingRate;

  pendingRate = fetch(apiUrl("/api/public/exchange-rate"), {
    headers: { accept: "application/json" },
    credentials: "omit",
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`exchange_rate_http_${response.status}`);
      const body = await response.json() as { data?: unknown };
      if (!validExchangeRate(body.data)) throw new Error("exchange_rate_payload_invalid");
      if (body.data.status !== "fallback") cachedRate = body.data;
      return body.data;
    })
    .catch(() => fallbackExchangeRate())
    .finally(() => {
      pendingRate = null;
    });

  return pendingRate;
}

export function useCurrency(locale = "ro-RO") {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(readPreferredCurrency);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>(() => cachedRate ?? fallbackExchangeRate());
  const [rateStatus, setRateStatus] = useState<ExchangeRateStatus>(() => cachedRate?.status ?? "loading");

  useEffect(() => {
    let active = true;
    loadExchangeRate().then((rate) => {
      if (!active) return;
      setExchangeRate(rate);
      setRateStatus(rate.status);
    });

    const syncCurrency = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (isDisplayCurrency(detail)) setCurrencyState(detail);
    };
    window.addEventListener(CURRENCY_EVENT, syncCurrency);
    window.addEventListener("storage", syncCurrency);
    return () => {
      active = false;
      window.removeEventListener(CURRENCY_EVENT, syncCurrency);
      window.removeEventListener("storage", syncCurrency);
    };
  }, []);

  const setCurrency = useCallback((next: DisplayCurrency) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {
      // The current view still updates when storage is disabled.
    }
    window.dispatchEvent(new CustomEvent(CURRENCY_EVENT, { detail: next }));
  }, []);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }), [locale]);

  const formatEur = useCallback((amountEur: number) => currency === "EUR"
    ? `${numberFormatter.format(amountEur)} €`
    : `${numberFormatter.format(Math.round(amountEur * exchangeRate.rate))} RON`, [currency, exchangeRate.rate, numberFormatter]);

  const formatRonCents = useCallback((amountCents: number) => currency === "RON"
    ? `${numberFormatter.format(amountCents / 100)} RON`
    : `${numberFormatter.format(amountCents / 100 / exchangeRate.rate)} €`, [currency, exchangeRate.rate, numberFormatter]);

  return {
    currency,
    setCurrency,
    rate: exchangeRate.rate,
    referenceDate: exchangeRate.referenceDate,
    sourceUrl: exchangeRate.sourceUrl,
    rateStatus,
    formatEur,
    formatRonCents,
  };
}
