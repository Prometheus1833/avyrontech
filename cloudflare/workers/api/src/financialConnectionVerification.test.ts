import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./types";
import { verifyFinancialConnection } from "./financialConnectionVerification";
import { financialSyncPhase } from "./providerSyncPolicy";

afterEach(() => vi.unstubAllGlobals());

describe("financial connection verification", () => {
  it("does not call an external API when credentials are absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await verifyFinancialConnection({} as Env, "stripe")).toEqual({ ok: false, code: "stripe_secrets_missing" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks the live Oblio invoice series before accepting the connection", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ type: "Factura", name: "AVY26", start: "0001", next: "0001" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const env = { OBLIO_CLIENT_ID: "client", OBLIO_CLIENT_SECRET: "secret", OBLIO_CIF: "12345678", OBLIO_SERIES: "AVY26" } as Env;
    expect(await verifyFinancialConnection(env, "oblio")).toEqual({ ok: true, account: "12345678", capabilities: ["series_read", "invoice_series_verified"], detail: "AVY26: 0001 → 0001" });
    expect(fetchMock.mock.calls[1][0]).toBe("https://www.oblio.eu/api/nomenclature/series?cif=12345678");
  });

  it("rejects a missing Oblio invoice series", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ type: "Proforma", name: "AVY26", start: "0001", next: "0001" }] }), { status: 200 })));
    const env = { OBLIO_CLIENT_ID: "client", OBLIO_CLIENT_SECRET: "secret", OBLIO_CIF: "12345678", OBLIO_SERIES: "AVY26" } as Env;
    expect(await verifyFinancialConnection(env, "oblio")).toEqual({ ok: false, code: "oblio_invoice_series_not_found" });
  });

  it("keeps verified access distinct from completed synchronization", () => {
    expect(financialSyncPhase({ provider: "stripe", configured: true, approved: true, connection: { provider: "stripe", status: "connected", last_sync_at: null, last_error_code: null }, now: 1000 })).toBe("connected_unsynced");
  });
});
