import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, decryptTotpSecret, encryptTotpSecret, totpAt, verifyTotp } from "../../cloudflare/workers/api/src/totp";

describe("TOTP security primitives", () => {
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("matches the RFC 6238 SHA-1 vector", async () => {
    const secret = base32Decode(rfcSecret);
    expect(base32Encode(secret)).toBe(rfcSecret);
    expect(await totpAt(secret, 59_000, 8)).toBe("94287082");
    expect(await totpAt(secret, 59_000, 6)).toBe("287082");
  });

  it("accepts only the narrow clock-skew window", async () => {
    const secret = base32Decode(rfcSecret);
    const code = await totpAt(secret, 90_000);
    expect(await verifyTotp(secret, code, 90_000)).toBe(true);
    expect(await verifyTotp(secret, code, 151_000)).toBe(false);
    expect(await verifyTotp(secret, "12345x", 90_000)).toBe(false);
  });

  it("encrypts secrets with authenticated encryption", async () => {
    const secret = base32Decode(rfcSecret);
    const key = "unit-test-encryption-secret-at-least-32-characters";
    const encrypted = await encryptTotpSecret(secret, key);
    expect(encrypted).not.toContain(rfcSecret);
    expect(Array.from(await decryptTotpSecret(encrypted, key))).toEqual(Array.from(secret));
    await expect(decryptTotpSecret(`${encrypted.slice(0, -1)}x`, key)).rejects.toThrow();
  });
});
