import { describe, expect, it } from "vitest";
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
import { normalizeDomain } from "../../cloudflare/workers/api/src/domain";

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
    expect(apiDiscovery.modules.platform).toContain("promotions");
  });
});

describe("public API cache policy", () => {
  it("normalizes safe public query parameters", () => {
    const key = publicApiCacheRequest(new Request("https://api.avyron.ro/api/blog/posts?utm_source=x&lang=en&limit=20"));
    expect(key?.url).toBe("https://api.avyron.ro/api/blog/posts?lang=en&limit=20");
    const exchangeKey = publicApiCacheRequest(new Request("https://api.avyron.ro/api/public/exchange-rate?utm_source=x"));
    expect(exchangeKey?.url).toBe("https://api.avyron.ro/api/public/exchange-rate");
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
});
