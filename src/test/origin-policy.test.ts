import { describe, expect, it } from "vitest";
import { allowedOrigin } from "../../cloudflare/workers/api/src/originPolicy";
import type { Env } from "../../cloudflare/workers/api/src/types";

describe("credentialed API origin policy", () => {
  const env = { ALLOWED_ORIGINS: "https://avyron.ro,https://review.avyrontech.pages.dev" } as Env;
  it("allows only the exact configured origin", () => {
    expect(allowedOrigin(env, "https://avyron.ro")).toBe("https://avyron.ro");
    expect(allowedOrigin(env, "https://review.avyrontech.pages.dev")).toBe("https://review.avyrontech.pages.dev");
  });
  it("does not grant arbitrary branch previews access to credentialed production API calls", () => {
    expect(allowedOrigin(env, "https://attacker.avyrontech.pages.dev")).toBe("");
    expect(allowedOrigin(env, "http://review.avyrontech.pages.dev")).toBe("");
    expect(allowedOrigin(env, "https://avyron.ro.evil.test")).toBe("");
  });
});
