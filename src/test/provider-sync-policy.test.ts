import { describe, expect, it } from "vitest";
import { FINANCIAL_PROVIDER_PLAYBOOKS, financialSyncPhase } from "../../cloudflare/workers/api/src/providerSyncPolicy";

const now = Date.UTC(2026, 9, 13);

describe("financial provider sync policy", () => {
  it("keeps missing configuration and fiscal approval distinct", () => {
    expect(financialSyncPhase({ provider: "oblio", configured: false, approved: false, now })).toBe("not_connected");
    expect(financialSyncPhase({ provider: "oblio", configured: true, approved: false, now })).toBe("awaiting_approval");
    expect(financialSyncPhase({ provider: "stripe", configured: true, approved: true, now })).toBe("configuration_only");
  });

  it("never treats a connection row without a valid recent sync as synchronized", () => {
    expect(financialSyncPhase({ provider: "stripe", configured: true, approved: true, now, connection: { provider: "stripe", status: "connected", last_sync_at: null, last_error_code: null } })).toBe("connected_unsynced");
    expect(financialSyncPhase({ provider: "stripe", configured: true, approved: true, now, connection: { provider: "stripe", status: "connected", last_sync_at: now - 25 * 60 * 60 * 1000, last_error_code: null } })).toBe("stale");
    expect(financialSyncPhase({ provider: "stripe", configured: true, approved: true, now, connection: { provider: "stripe", status: "connected", last_sync_at: now - 60_000, last_error_code: null } })).toBe("synced");
    expect(financialSyncPhase({ provider: "stripe", configured: true, approved: true, now, connection: { provider: "stripe", status: "error", last_sync_at: now - 60_000, last_error_code: "token_expired" } })).toBe("error");
  });

  it("publishes only official HTTPS references and all four distinct provider roles", () => {
    expect(FINANCIAL_PROVIDER_PLAYBOOKS.map((playbook) => playbook.provider)).toEqual(["stripe", "oblio", "revolut_business", "revolut_merchant"]);
    for (const playbook of FINANCIAL_PROVIDER_PLAYBOOKS) {
      expect(playbook.sources.length).toBeGreaterThan(0);
      for (const source of playbook.sources) expect(new URL(source).protocol).toBe("https:");
    }
  });
});
