import { afterEach, describe, expect, it, vi } from "vitest";
import { pbkdf2Sync, scryptSync } from "node:crypto";
import { verifyPassword } from "../../cloudflare/workers/api/src/security";

const salt = Buffer.alloc(16, 7);
const stored = (digest: string, saltValue = salt.toString("base64")) =>
  `scrypt$16384$8$1$${saltValue}$${digest}`;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("audit: bounded password hash verification", () => {
  it.each([" ", "    ", "AA==", Buffer.alloc(33).toString("base64")])(
    "rejects invalid digest sizes before running a KDF (%s)",
    async (digest) => {
      expect(await verifyPassword("any password", stored(digest))).toBe(false);
      expect(
        await verifyPassword(
          "any password",
          `100000$${salt.toString("base64")}$${digest}`,
        ),
      ).toBe(false);
    },
  );
  it("rejects extra fields and malformed salts without accepting a shortened digest", async () => {
    const digest = scryptSync("legitimate password", salt, 32, {
      N: 16384,
      r: 8,
      p: 1,
    }).toString("base64");
    expect(
      await verifyPassword("legitimate password", stored(digest) + "$extra"),
    ).toBe(false);
    expect(
      await verifyPassword("legitimate password", stored(digest, "IA==")),
    ).toBe(false);
    expect(await verifyPassword("legitimate password", stored(digest))).toBe(
      true,
    );
  });
  it("retains valid legacy PBKDF2 credentials", async () => {
    const digest = pbkdf2Sync(
      "legacy credential",
      salt,
      100000,
      32,
      "sha256",
    ).toString("base64");
    expect(
      await verifyPassword(
        "legacy credential",
        `100000$${salt.toString("base64")}$${digest}`,
      ),
    ).toBe(true);
    expect(
      await verifyPassword(
        "wrong credential",
        `100000$${salt.toString("base64")}$${digest}`,
      ),
    ).toBe(false);
  });
});

describe("audit: first-party authenticated transport", () => {
  it.each([
    "https://www.oblio.eu/facturi/file.pdf",
    "https://evil.test/api/profile",
    "//evil.test/api/profile",
    "https://api.avyron.ro.evil.test/api/profile",
    "https://user:password@api.avyron.ro/api/profile",
    "https://api.avyron.ro:444/api/profile",
    "https://api.avyron.ro/api/profile#fragment",
    "https://api.avyron.ro/other",
  ])(
    "rejects foreign or ambiguous targets before token refresh: %s",
    async (path) => {
      vi.resetModules();
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      const { cfAuth } = await import("@/lib/cfAuth");
      await expect(cfAuth.raw(path)).rejects.toThrow(
        "untrusted_api_destination",
      );
      await expect(cfAuth.request(path)).rejects.toThrow(
        "untrusted_api_destination",
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("retains native API headers and rejects redirects even if a caller requests follow", async () => {
    vi.resetModules();
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) =>
      String(_url).endsWith("/auth/refresh")
        ? new Response(
            JSON.stringify({
              access_token: "synthetic-private-token",
              expires_in: 900,
            }),
          )
        : new Response(JSON.stringify({ ok: true })),
    );
    vi.stubGlobal("fetch", fetcher);
    const { cfAuth } = await import("@/lib/cfAuth");
    await cfAuth.raw("/api/profile", { redirect: "follow" });
    await cfAuth.request("/api/profile");
    for (const [url, init] of fetcher.mock.calls.filter(
      ([url]) => !String(url).endsWith("/auth/refresh"),
    )) {
      expect(new URL(String(url)).origin).toBe("https://api.avyron.ro");
      expect(init?.redirect).toBe("error");
      expect(init?.credentials).toBe("include");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer synthetic-private-token",
      );
    }
  });
  it("supports an explicitly configured local API without broadening the destination list", async () => {
    vi.stubEnv("VITE_CF_API_BASE", "http://localhost:8787");
    vi.resetModules();
    const { authenticatedApiUrl } = await import("@/lib/apiBase");
    expect(authenticatedApiUrl("/api/profile")).toBe(
      "http://localhost:8787/api/profile",
    );
    expect(() =>
      authenticatedApiUrl("http://localhost:8888/api/profile"),
    ).toThrow("untrusted_api_destination");
  });
});
