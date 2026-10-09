import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API_CANONICAL_ORIGIN,
  API_HOSTNAME,
  apiDiscovery,
  isApiHostname,
  isApiSurfaceRequest,
  normalizeVersionedApiRequest,
  openApiDocument,
} from "../../cloudflare/workers/api/src/apiGateway";
import { publicApiCacheRequest } from "../../cloudflare/workers/api/src/apiCache";
import { lookupDomain, normalizeDomain, officialDomainVerificationUrl } from "../../cloudflare/workers/api/src/domain";

afterEach(() => vi.unstubAllGlobals());

describe("api.avyron.ro gateway", () => {
  it("recognizes only the exact API hostname", () => {
    expect(API_HOSTNAME).toBe("api.avyron.ro");
    expect(isApiHostname("API.AVYRON.RO.")).toBe(true);
    expect(isApiHostname("notapi.avyron.ro")).toBe(false);
  });

  it("maps the public version namespace to the existing same-origin handlers", () => {
    const input = new Request("https://api.avyron.ro/v1/blog/posts?lang=ro", {
      headers: { authorization: "Bearer test" },
    });
    const normalized = normalizeVersionedApiRequest(input);
    expect(new URL(normalized.url).pathname).toBe("/api/blog/posts");
    expect(normalized.headers.get("authorization")).toBe("Bearer test");
    expect(normalizeVersionedApiRequest(new Request("https://avyron.ro/v1/blog/posts")).url)
      .toBe("https://avyron.ro/v1/blog/posts");
  });

  it("treats both canonical-host and same-origin routes as API surfaces", () => {
    expect(isApiSurfaceRequest(new Request("https://api.avyron.ro/robots.txt"))).toBe(true);
    expect(isApiSurfaceRequest(new Request("https://avyron.ro/api/health"))).toBe(true);
    expect(isApiSurfaceRequest(new Request("https://avyron.ro/blog"))).toBe(false);
  });

  it("publishes coherent discovery and OpenAPI server metadata", () => {
    expect(apiDiscovery.canonical).toBe(`${API_CANONICAL_ORIGIN}/v1`);
    expect(openApiDocument.openapi).toBe("3.1.0");
    expect(openApiDocument.servers[0].url).toBe("https://api.avyron.ro/v1");
    expect(openApiDocument.paths["/public/domain-check"]).toBeTruthy();
    expect(openApiDocument.paths["/public/exchange-rate"]).toBeTruthy();
    expect(openApiDocument.paths["/commerce/quote"]).toBeTruthy();
    expect(openApiDocument.paths["/commerce/cart"]).toBeTruthy();
    expect(apiDiscovery.modules.platform).toContain("promotions");
  });
});

describe("public API cache policy", () => {
  it("normalizes safe public query parameters", () => {
    const key = publicApiCacheRequest(new Request("https://api.avyron.ro/api/blog/posts?utm_source=x&lang=en&limit=20"));
    expect(key?.url).toBe("https://api.avyron.ro/api/blog/posts?lang=en&limit=20");
    const exchangeKey = publicApiCacheRequest(new Request("https://api.avyron.ro/api/public/exchange-rate?utm_source=x"));
    expect(exchangeKey?.url).toBe("https://api.avyron.ro/api/public/exchange-rate");
    expect(publicApiCacheRequest(new Request("https://avyrontech-preview.avyrontech.workers.dev/api/ai/agents?utm_source=x"))).toBeNull();
  });

  it("never caches authenticated or mutating requests", () => {
    expect(publicApiCacheRequest(new Request("https://api.avyron.ro/api/blog/posts", { headers: { authorization: "Bearer x" } }))).toBeNull();
    expect(publicApiCacheRequest(new Request("https://api.avyron.ro/api/public/domain-check?domain=avyron.ro", { method: "POST" }))).toBeNull();
  });
});

describe("domain lookup input", () => {
  it("accepts registrable ASCII and IDN hostnames", () => {
    expect(normalizeDomain("Avyron.RO.")).toBe("avyron.ro");
    expect(normalizeDomain("münchen.com")).toBe("xn--mnchen-3ya.com");
  });

  it("rejects URLs, subdomains, malformed labels and credentials", () => {
    expect(normalizeDomain("https://avyron.ro/path")).toBeNull();
    expect(normalizeDomain("www.avyron.ro")).toBeNull();
    expect(normalizeDomain("-avyron.ro")).toBeNull();
    expect(normalizeDomain("user@example.com")).toBeNull();
  });

  it("links .ro results to the official RoTLD confirmation without presenting it as an API result", () => {
    expect(officialDomainVerificationUrl("atelier-avyron.ro", "ro"))
      .toBe("https://forms.rotld.ro/whois/?fqdn=atelier-avyron.ro&lang=ro");
    expect(officialDomainVerificationUrl("atelier-avyron.com", "ro")).toBeNull();
  });

  it("uses authoritative IANA RDAP first and keeps DNS-only .ro results conservative", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://data.iana.org/rdap/dns.json") {
        return Response.json({ services: [[['com'], ['https://rdap.registry.test/']]] });
      }
      if (url === "https://rdap.registry.test/domain/nume-liber.com") return new Response(null, { status: 404 });
      if (url === "https://rdap.registry.test/domain/avyron.com") return Response.json({ objectClassName: "domain" });
      if (url.includes("cloudflare-dns.com") && url.includes("nume-liber.ro")) {
        return Response.json({ Status: 3 });
      }
      throw new Error(`Unexpected test request: ${url}`);
    }));

    await expect(lookupDomain("nume-liber.com")).resolves.toEqual({ status: "available", source: "iana-rdap" });
    await expect(lookupDomain("avyron.com")).resolves.toEqual({ status: "registered", source: "iana-rdap" });
    await expect(lookupDomain("nume-liber.ro")).resolves.toEqual({ status: "unknown", source: "cloudflare-doh" });
  });
});
