import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../cloudflare/workers/api/src/security";

describe("Cloudflare password hashing", () => {
  it("uses a versioned memory-hard format and verifies round trips", async () => {
    const hash = await hashPassword("parolă de test 123");

    expect(hash.split("$")).toHaveLength(6);
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    await expect(verifyPassword("parolă de test 123", hash)).resolves.toBe(true);
    await expect(verifyPassword("altă parolă", hash)).resolves.toBe(false);
  });

  it("rejects malformed or intentionally weak stored hashes", async () => {
    await expect(verifyPassword("test", "invalid")).resolves.toBe(false);
    await expect(verifyPassword("test", "99999$c2FsdA==$aGFzaA==")).resolves.toBe(false);
    await expect(verifyPassword("test", "210000$c2FsdA==$aGFzaA==")).resolves.toBe(false);
  });
});

describe("Profile privilege escalation guard", () => {
  const source = readFileSync(new URL("../../cloudflare/workers/api/src/index.ts", import.meta.url), "utf8");

  it("keeps staff_role out of the patchable profile allowlist", () => {
    const allowlist = source.match(/const PROFILE_FIELDS = \[(.*?)\] as const;/s)?.[1] ?? "";
    expect(allowlist).not.toContain("staff_role");
    expect(allowlist).toContain("display_name");
  });

  it("rejects privileged fields on PUT /api/profile", () => {
    expect(source).toContain("PRIVILEGED_PROFILE_FIELDS");
    expect(source).toMatch(/PRIVILEGED_PROFILE_FIELDS\.some\(\(field\) => field in body\)/);
    expect(source).toContain("forbidden_field");
  });

  it("never lets the client send staff_role from the profile form", () => {
    const form = readFileSync(new URL("../components/dashboard/ProfileTab.tsx", import.meta.url), "utf8");
    expect(form).toMatch(/const \{ staff_role: _ignoredRole, \.\.\.safeForm \} = form;/);
    expect(form).not.toMatch(/updateProfile\(\s*form\s*\)/);
  });
});
