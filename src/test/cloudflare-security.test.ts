import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../cloudflare/workers/api/src/security";

describe("Cloudflare password hashing", () => {
  it("keeps the versioned PBKDF2 wire format and verifies round trips", async () => {
    const hash = await hashPassword("parolă de test 123");

    expect(hash.split("$")).toHaveLength(3);
    expect(hash).toMatch(/^210000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    await expect(verifyPassword("parolă de test 123", hash)).resolves.toBe(true);
    await expect(verifyPassword("altă parolă", hash)).resolves.toBe(false);
  });

  it("rejects malformed or intentionally weak stored hashes", async () => {
    await expect(verifyPassword("test", "invalid")).resolves.toBe(false);
    await expect(verifyPassword("test", "99999$c2FsdA==$aGFzaA==")).resolves.toBe(false);
  });
});
