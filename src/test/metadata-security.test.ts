import { describe, expect, it } from "vitest";
import { readTextUpTo, validateMetadataUrl } from "../../cloudflare/workers/api/src/metadata";

describe("metadata URL validation", () => {
  it.each([
    "http://localhost/page",
    "http://127.0.0.1/page",
    "http://10.0.0.2/page",
    "http://169.254.169.254/latest/meta-data",
    "http://192.168.1.10/page",
    "http://[::1]/page",
    "http://service.internal/page",
    "https://example.com:8443/page",
    "ftp://example.com/file",
    "https://user:pass@example.com/page",
  ])("rejects non-public target %s", (value) => {
    expect(() => validateMetadataUrl(value)).toThrow();
  });

  it.each([
    "https://avyron.ro",
    "https://www.example.com/path?x=1",
    "http://example.org/page",
  ])("accepts public HTTP(S) target %s", (value) => {
    expect(validateMetadataUrl(value).toString()).toBe(new URL(value).toString());
  });
});

describe("metadata response limit", () => {
  it("decodes at most the configured byte limit", async () => {
    const response = new Response("ă".repeat(100));
    const value = await readTextUpTo(response, 20);
    expect(new TextEncoder().encode(value).byteLength).toBeLessThanOrEqual(20);
  });
});
