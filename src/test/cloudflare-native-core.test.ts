// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { forcedPasswordAllowedPath, mfaAuthEnabled, normalizeUsername, turnstileAuthEnabled } from "../../cloudflare/workers/api/src/authPolicy";

describe("Cloudflare-native authentication policy", () => {
  it("keeps MFA and Turnstile disabled unless explicitly enabled", () => {
    expect(mfaAuthEnabled({})).toBe(false);
    expect(mfaAuthEnabled({ MFA_AUTH_ENABLED: "false" })).toBe(false);
    expect(mfaAuthEnabled({ MFA_AUTH_ENABLED: "TRUE" })).toBe(true);
    expect(turnstileAuthEnabled({})).toBe(false);
    expect(turnstileAuthEnabled({ TURNSTILE_AUTH_ENABLED: "true" })).toBe(true);
  });

  it("allows a temporary-password account to reach only recovery endpoints", () => {
    expect(forcedPasswordAllowedPath("/api/auth/me")).toBe(true);
    expect(forcedPasswordAllowedPath("/api/auth/change-password")).toBe(true);
    expect(forcedPasswordAllowedPath("/api/auth/logout")).toBe(true);
    expect(forcedPasswordAllowedPath("/api/projects")).toBe(false);
    expect(forcedPasswordAllowedPath("/api/admin/users")).toBe(false);
  });

  it("normalizes usernames without accepting unsafe values", () => {
    expect(normalizeUsername("  Admin.Avyron  ")).toBe("admin.avyron");
    expect(normalizeUsername("x".repeat(41))).toBeNull();
  });
});

describe("central Workers AI enforcement", () => {
  it("contains every direct Workers AI invocation in AI Core", () => {
    const root = resolve(process.cwd(), "cloudflare/workers/api/src");
    const files = readdirSync(root).filter((file) => file.endsWith(".ts"));
    const direct = files.filter((file) => readFileSync(resolve(root, file), "utf8").includes(".AI.run("));
    expect(direct).toEqual(["aiCore.ts"]);
  });

  it("keeps paid AI and automatic upgrades explicitly disabled", () => {
    const config = readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8");
    expect(config).toContain('"PAID_AI_ENABLED": "false"');
    expect(config).toContain('"ALLOW_AI_OVERAGE": "false"');
    expect(config).toContain('"AUTO_AI_UPGRADE": "false"');
  });
});
