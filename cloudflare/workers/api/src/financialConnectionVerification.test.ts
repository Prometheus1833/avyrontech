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
    expect(fetchMock.mock.calls[0][1].body).toBe("client_id=client&client_secret=secret");
  });

  it.each([
    [403, "<html>Gateway refused request</html>", "oblio_auth_403_invalid_response"],
    [400, JSON.stringify({error: "invalid credentials"}), "oblio_auth_400"],
    [200, JSON.stringify({status: 200}), "oblio_auth_invalid_response"],
  ])("keeps the HTTP auth failure distinguishable without exposing provider content: %s", async (status, body, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body as string, {status: status as number})));
    const env = { OBLIO_CLIENT_ID: "synthetic", OBLIO_CLIENT_SECRET: "synthetic-secret", OBLIO_CIF: "12345678", OBLIO_SERIES: "AVY" } as Env;
    expect(await verifyFinancialConnection(env, "oblio")).toEqual({ok:false,code});
  });

  it("does not expose exception details containing credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("synthetic-sensitive-value")));
    const env = { OBLIO_CLIENT_ID: "synthetic", OBLIO_CLIENT_SECRET: "synthetic-secret", OBLIO_CIF: "12345678", OBLIO_SERIES: "AVY" } as Env;
    expect(await verifyFinancialConnection(env, "oblio")).toEqual({ok:false,code:"oblio_auth_network"});
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
