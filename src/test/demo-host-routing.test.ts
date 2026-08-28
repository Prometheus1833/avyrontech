import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEMO_SITES,
  handleMappedHostname,
  resolveHostname,
} from "../../cloudflare/workers/api/src/sites.config";

const unusedAssets = {
  fetch: async () => {
    throw new Error("Demo placeholders and redirects must not read the main site assets");
  },
} as unknown as Fetcher;

const readJsonc = (file: string) => JSON.parse(
  readFileSync(resolve(process.cwd(), file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1"),
);

describe("multi-domain demo registry", () => {
  it("contains every requested hostname once and keeps all demos non-indexable by default", () => {
    expect(DEMO_SITES).toHaveLength(16);
    expect(new Set(DEMO_SITES.map((site) => site.hostname)).size).toBe(DEMO_SITES.length);
    expect(DEMO_SITES.filter((site) => site.hostname.endsWith(".avyron.ro")).map((site) => site.hostname))
      .toEqual(["exemplu1.avyron.ro", "exemplu2.avyron.ro", "exemplu3.avyron.ro"]);
    expect(DEMO_SITES.filter((site) => /^exemplu\d+\.avyron\.eu$/.test(site.hostname))).toHaveLength(10);
    expect(DEMO_SITES.map((site) => site.hostname)).toEqual(expect.arrayContaining([
      "salaforza.avyron.eu",
      "pensiuneabradetul.avyron.eu",
      "asociatia-europa.avyron.eu",
    ]));
    expect(DEMO_SITES.every((site) => !site.indexing && site.status === "unavailable")).toBe(true);
  });

  it("normalises DNS hostnames without treating unrelated .ro hosts as demos", () => {
    expect(resolveHostname("EXEMPLU1.AVYRON.EU.")).toMatchObject({
      kind: "demo",
      site: { project: "example-eu-1" },
    });
    expect(resolveHostname("app.avyron.ro")).toEqual({ kind: "main" });
    expect(resolveHostname("restaurant.avyron.eu")).toEqual({ kind: "unknown-demo" });
  });

  it("preserves path/query for www.ro and avoids .eu duplicate-content paths", async () => {
    const ro = await handleMappedHostname(
      new Request("https://www.avyron.ro/servicii?utm_source=test"),
      unusedAssets,
    );
    expect(ro?.status).toBe(301);
    expect(ro?.headers.get("location")).toBe("https://avyron.ro/servicii?utm_source=test");

    const eu = await handleMappedHostname(
      new Request("https://www.avyron.eu/produs-inexistent?utm_source=eu"),
      unusedAssets,
    );
    expect(eu?.status).toBe(301);
    expect(eu?.headers.get("location")).toBe("https://avyron.ro/?utm_source=eu");
  });

  it("fails closed before API routing for configured and unknown demo hosts", async () => {
    for (const hostname of ["salaforza.avyron.eu", "restaurant.avyron.eu", "exemplu2.avyron.ro"]) {
      const response = await handleMappedHostname(
        new Request(`https://${hostname}/api/auth/me`),
        unusedAssets,
      );
      expect(response?.status).toBe(404);
      expect(response?.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(response?.headers.get("Cache-Control")).toBe("private, no-store");
      expect(await response?.text()).toContain("Demo indisponibil");
    }
  });

  it("does not intercept the canonical site or app subdomain", async () => {
    expect(await handleMappedHostname(new Request("https://avyron.ro/"), unusedAssets)).toBeNull();
    expect(await handleMappedHostname(new Request("https://app.avyron.ro/api/health"), unusedAssets)).toBeNull();
  });

  it("declares only exact .ro demo routes and a scalable .eu wildcard", () => {
    const config = readJsonc("wrangler.jsonc");
    const patterns = config.routes.map((route: { pattern: string }) => route.pattern);
    expect(patterns).toEqual(expect.arrayContaining([
      "app.avyron.ro/api/*",
      "exemplu1.avyron.ro/*",
      "exemplu2.avyron.ro/*",
      "exemplu3.avyron.ro/*",
      "avyron.eu/*",
      "*.avyron.eu/*",
    ]));
    expect(patterns).not.toContain("*.avyron.ro/*");
    expect(config.env.preview.routes).toEqual([]);
  });
});
