import { describe, expect, it, vi } from "vitest";
import {
  ECB_DAILY_RATES_URL,
  EXCHANGE_RATE_KV_KEY,
  getPublicExchangeRate,
  isExchangeRateSnapshot,
  parseEcbRonRate,
  refreshExchangeRate,
} from "../../cloudflare/workers/api/src/exchangeRate";

const ECB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope>
  <Cube>
    <Cube time="2026-08-28">
      <Cube currency="USD" rate="1.1643"/>
      <Cube rate="5.2584" currency="RON"/>
    </Cube>
  </Cube>
</gesmes:Envelope>`;

describe("ECB EUR/RON exchange rate", () => {
  it("parses and validates the official daily XML shape", () => {
    const snapshot = parseEcbRonRate(ECB_XML, 1_777_000_000_000);
    expect(snapshot).toEqual({
      base: "EUR",
      quote: "RON",
      rate: 5.2584,
      referenceDate: "2026-08-28",
      fetchedAt: 1_777_000_000_000,
      provider: "European Central Bank",
      sourceUrl: ECB_DAILY_RATES_URL,
    });
    expect(isExchangeRateSnapshot(snapshot)).toBe(true);
  });

  it("rejects missing, malformed and implausible RON rates", () => {
    expect(() => parseEcbRonRate("<Cube time=\"2026-08-28\"><Cube currency=\"RON\" rate=\"0.2\" /></Cube>"))
      .toThrow("ecb_ron_rate_invalid");
    expect(() => parseEcbRonRate("<Cube time=\"2026-08-28\"><Cube currency=\"USD\" rate=\"1.1\" /></Cube>"))
      .toThrow("ecb_ron_rate_invalid");
  });

  it("stores only a successfully parsed snapshot in KV", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response(ECB_XML, {
      status: 200,
      headers: { "content-type": "application/xml" },
    }));

    const snapshot = await refreshExchangeRate(
      { KV: { put } } as unknown as Parameters<typeof refreshExchangeRate>[0],
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith(ECB_DAILY_RATES_URL, expect.objectContaining({
      headers: { accept: "application/xml,text/xml;q=0.9" },
    }));
    expect(put).toHaveBeenCalledWith(EXCHANGE_RATE_KV_KEY, JSON.stringify(snapshot));
  });

  it("uses the official feed when KV is temporarily unavailable", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const get = vi.fn().mockRejectedValue(new Error("kv_unavailable"));
    const fetcher = vi.fn().mockResolvedValue(new Response(ECB_XML, { status: 200 }));

    const result = await getPublicExchangeRate(
      { KV: { get, put } } as unknown as Parameters<typeof getPublicExchangeRate>[0],
      1_777_000_000_000,
      fetcher,
    );

    expect(result.status).toBe("fresh");
    expect(result.rate).toBe(5.2584);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("labels the safe fallback when both KV and ECB are unavailable", async () => {
    const get = vi.fn().mockResolvedValue(null);
    const fetcher = vi.fn().mockRejectedValue(new Error("network_unavailable"));

    const result = await getPublicExchangeRate(
      { KV: { get } } as unknown as Parameters<typeof getPublicExchangeRate>[0],
      1_777_000_000_000,
      fetcher,
    );

    expect(result).toMatchObject({ status: "fallback", provider: "Avyron fallback", rate: 5.25 });
  });
});
