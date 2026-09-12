import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  extractPageEvidence, inspectEngineDocument, normalizeEngineUrl,
  parseScoutSuggestions, validateEngineSourceCreate, validateEngineSourcePatch,
} from "../../cloudflare/workers/api/src/enginePolicy";

describe("AVY Engine policy", () => {
  it("accepts canonical public HTTPS sources and rejects SSRF targets", () => {
    expect(normalizeEngineUrl("https://WWW.OriginKit.dev/docs/components#install")).toBe("https://www.originkit.dev/docs/components");
    for (const unsafe of ["http://example.com", "https://127.0.0.1/a", "https://10.0.0.3", "https://[::1]/", "https://user:pass@example.com/"]) {
      expect(normalizeEngineUrl(unsafe)).toBeNull();
    }
    expect(validateEngineSourceCreate({ name: "OriginKit", canonicalUrl: "https://www.originkit.dev/", sourceType: "platform", accessMode: "account_required", pricingModel: "freemium", summary: "Componente." })).toMatchObject({ ok: true });
  });

  it("keeps activation gates explicit and bounded", () => {
    expect(validateEngineSourcePatch({ lifecycleStatus: "active", securityStatus: "reviewed", accessMode: "oauth", robotsReviewed: true, termsReviewed: true })).toMatchObject({ ok: true });
    expect(validateEngineSourcePatch({ accessMode: "password_in_database" })).toMatchObject({ ok: false, code: "invalid_access_mode" });
    expect(validateEngineSourcePatch({ lifecycleStatus: "auto_execute" })).toMatchObject({ ok: false });
    expect(validateEngineSourcePatch({})).toMatchObject({ ok: false, code: "empty_patch" });
  });

  it("extracts bounded evidence without trusting scripts or private links", () => {
    const page = extractPageEvidence(`<html><head><title>Library</title><meta name="description" content="Verified components"></head><body><script>ignore this</script><a href="/docs">Docs</a><a href="https://127.0.0.1/private">private</a></body></html>`, "https://example.com/");
    expect(page).toMatchObject({ title: "Library", description: "Verified components" });
    expect(page.text).not.toContain("ignore this");
    expect(page.links).toEqual(["https://example.com/docs"]);
  });

  it("accepts scout suggestions only when the exact URL was observed", () => {
    const raw = JSON.stringify({ suggestions: [
      { name: "Docs", canonicalUrl: "https://example.com/docs", sourceType: "documentation", rationale: "Link observat." },
      { name: "Invented", canonicalUrl: "https://invented.example/", sourceType: "api", rationale: "Nu există în pagină." },
    ] });
    expect(parseScoutSuggestions(raw, ["https://example.com/docs"])).toEqual([
      { name: "Docs", canonicalUrl: "https://example.com/docs", sourceType: "documentation", rationale: "Link observat." },
    ]);
  });

  it("allows inert documentation formats and rejects executable/binary payloads", () => {
    expect(inspectEngineDocument(new TextEncoder().encode("# Guide"), "text/markdown")).toBe("text/markdown");
    expect(inspectEngineDocument(new TextEncoder().encode('{"name":"skill"}'), "application/json")).toBe("application/json");
    expect(inspectEngineDocument(new Uint8Array([0x4d, 0x5a, 0, 1]), "application/octet-stream")).toBeNull();
  });

  it("enforces cost guard, approval and inactive discovery in source code and schema", () => {
    const api = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/engine.ts"), "utf8");
    const migration = readFileSync(resolve(process.cwd(), "cloudflare/d1/migrations/0019_avy_engine.sql"), "utf8");
    expect(api).toContain("reserveAiCost");
    expect(api).toContain("source.lifecycle_status !== \"active\"");
    expect(api).toContain("allowed(c, \"engine.approve\")");
    expect(api).toContain("connector_validation_required");
    expect(api).toContain("AbortSignal.timeout(10_000)");
    expect(migration).toContain("'engine_policy_monthly', 'Descoperire periodică AVY Engine', 0");
    expect(migration).toContain("'uiprompts-app', 'UI Prompts'");
    expect(migration).toContain("'reviewing', 'unverified'");
  });
});
