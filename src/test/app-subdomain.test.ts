import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { apiBaseForHost } from "@/lib/apiBase";
import { isPlatformHostname, publicSiteHref } from "@/lib/appHost";

describe("app.avyron.ro platform boundary", () => {
  it("uses the same-origin API route on the platform hostname", () => {
    expect(apiBaseForHost("app.avyron.ro")).toBe("");
    expect(apiBaseForHost("avyrontech.lovable.app")).toBe("https://api.avyron.ro");
  });

  it("keeps platform and public-site links explicit", () => {
    expect(isPlatformHostname("APP.AVYRON.RO")).toBe(true);
    expect(isPlatformHostname("avyron.ro")).toBe(false);
    expect(publicSiteHref()).toBe("https://avyron.ro");
    expect(publicSiteHref("gdpr")).toBe("https://avyron.ro/gdpr");
  });

  it("declares an exact API route without taking over the Lovable frontend", () => {
    const config = readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8");
    expect(config).toContain('"pattern": "app.avyron.ro/api/*"');
    expect(config).toContain('"pattern": "api.avyron.ro", "custom_domain": true');
    expect(config).toContain('"zone_name": "avyron.ro"');
    expect(config).not.toContain('"pattern": "app.avyron.ro", "custom_domain": true');
    expect(config).toContain("https://app.avyron.ro");
  });
});
