import type { AppBindings } from "./types";

export const ECB_DAILY_RATES_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
export const EXCHANGE_RATE_KV_KEY = "public:exchange-rate:eur-ron:v1";
export const EXCHANGE_RATE_REFRESH_CRON = "17 7,15 * * *";
// Used only when neither KV nor the official ECB feed can answer. The API and
// UI mark it as fallback, never as an official or transactional exchange rate.
export const FALLBACK_RON_PER_EUR = 5.25;

const MAX_ECB_RESPONSE_BYTES = 128 * 1024;
const MAX_RATE_AGE_MS = 4 * 24 * 60 * 60 * 1000;

export type ExchangeRateSnapshot = {
  base: "EUR";
  quote: "RON";
  rate: number;
  referenceDate: string;
  fetchedAt: number;
  provider: "European Central Bank";
  sourceUrl: typeof ECB_DAILY_RATES_URL;
};

export type ExchangeRateStatus = "fresh" | "stale" | "fallback";

export type PublicExchangeRate = Omit<ExchangeRateSnapshot, "provider"> & {
  provider: ExchangeRateSnapshot["provider"] | "Avyron fallback";
  status: ExchangeRateStatus;
};

type ExchangeRateEnv = Pick<AppBindings["Bindings"], "KV">;
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const validRate = (value: number) => Number.isFinite(value) && value >= 1 && value <= 20;

export function isExchangeRateSnapshot(value: unknown): value is ExchangeRateSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<ExchangeRateSnapshot>;
  return snapshot.base === "EUR"
    && snapshot.quote === "RON"
    && typeof snapshot.rate === "number"
    && validRate(snapshot.rate)
    && typeof snapshot.referenceDate === "string"
    && validDate(snapshot.referenceDate)
    && typeof snapshot.fetchedAt === "number"
    && Number.isFinite(snapshot.fetchedAt)
    && snapshot.provider === "European Central Bank"
    && snapshot.sourceUrl === ECB_DAILY_RATES_URL;
}

/** Parse the small official ECB daily XML without adding an XML dependency to the Worker. */
export function parseEcbRonRate(xml: string, fetchedAt = Date.now()): ExchangeRateSnapshot {
  if (!xml || xml.length > MAX_ECB_RESPONSE_BYTES) throw new Error("ecb_payload_invalid_size");

  const date = xml.match(/<Cube\b[^>]*\btime=(?:"([^"]+)"|'([^']+)')[^>]*>/i)?.slice(1).find(Boolean);
  const ronTag = xml.match(/<Cube\b[^>]*\bcurrency=(?:"RON"|'RON')[^>]*>/i)?.[0];
  const rateText = ronTag?.match(/\brate=(?:"([^"]+)"|'([^']+)')/i)?.slice(1).find(Boolean);
  const rate = Number(rateText);

  if (!date || !validDate(date) || !validRate(rate)) throw new Error("ecb_ron_rate_invalid");

  return {
    base: "EUR",
    quote: "RON",
    rate: Number(rate.toFixed(4)),
    referenceDate: date,
    fetchedAt,
    provider: "European Central Bank",
    sourceUrl: ECB_DAILY_RATES_URL,
  };
}

export async function refreshExchangeRate(env: ExchangeRateEnv, fetcher: Fetcher = fetch): Promise<ExchangeRateSnapshot> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);
  let response: Response;
  try {
    response = await fetcher(ECB_DAILY_RATES_URL, {
      headers: { accept: "application/xml,text/xml;q=0.9" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`ecb_http_${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_ECB_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error("ecb_payload_too_large");
  }

  const snapshot = parseEcbRonRate(await response.text());
  await env.KV.put(EXCHANGE_RATE_KV_KEY, JSON.stringify(snapshot));
  console.info(JSON.stringify({
    event: "exchange_rate_refreshed",
    pair: `${snapshot.base}/${snapshot.quote}`,
    rate: snapshot.rate,
    referenceDate: snapshot.referenceDate,
  }));
  return snapshot;
}

async function readStoredRate(env: ExchangeRateEnv): Promise<ExchangeRateSnapshot | null> {
  const stored = await env.KV.get<unknown>(EXCHANGE_RATE_KV_KEY, { type: "json", cacheTtl: 300 });
  return isExchangeRateSnapshot(stored) ? stored : null;
}

export async function getPublicExchangeRate(
  env: ExchangeRateEnv,
  timestamp = Date.now(),
  fetcher: Fetcher = fetch,
): Promise<PublicExchangeRate> {
  let stored: ExchangeRateSnapshot | null = null;
  try {
    stored = await readStoredRate(env);
  } catch (error) {
    console.error(JSON.stringify({ event: "exchange_rate_kv_read_failed", error: String(error) }));
  }
  if (stored) {
    return {
      ...stored,
      status: timestamp - stored.fetchedAt <= MAX_RATE_AGE_MS ? "fresh" : "stale",
    };
  }

  try {
    return { ...(await refreshExchangeRate(env, fetcher)), status: "fresh" };
  } catch (error) {
    console.error(JSON.stringify({ event: "exchange_rate_unavailable", error: String(error) }));
    return {
      base: "EUR",
      quote: "RON",
      rate: FALLBACK_RON_PER_EUR,
      referenceDate: new Date(timestamp).toISOString().slice(0, 10),
      fetchedAt: timestamp,
      provider: "Avyron fallback",
      sourceUrl: ECB_DAILY_RATES_URL,
      status: "fallback",
    };
  }
}
