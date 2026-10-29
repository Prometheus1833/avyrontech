import { describe, expect, it } from "vitest";
import { normalizeExternalLink } from "../shared/externalUrl";
import { externalUrl } from "../../cloudflare/workers/api/src/adminOperations";

describe("persisted browser links", () => {
  it("accepts ordinary public HTTP(S) links", () => {
    expect(normalizeExternalLink("https://example.test/path")).toBe("https://example.test/path");
  });
  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "https://user:pass@example.test/", "//example.test/path", "file:///etc/passwd"])("rejects executable or ambiguous link %s", (value) => {
    expect(normalizeExternalLink(value)).toBeNull();
  });
});

describe("internal resource URL validation", () => {
  it("accepts an empty optional URL or an ordinary HTTPS URL", () => {
    expect(externalUrl("")).toBe(true);
    expect(externalUrl("https://example.test/reference")).toBe(true);
  });
  it.each(["javascript:alert(1)", "https://user:pass@example.test/", "https://", "data:text/html,payload"])("rejects unsafe resource URL %s", (value) => {
    expect(externalUrl(value)).toBe(false);
  });
});
