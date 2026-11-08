import { describe, expect, it } from "vitest";
import { applicationHostResponse } from "@/worker/applicationHost";
import site from "@/worker/index";

describe("application hostname SEO boundary", () => {
  it("excludes public-page replicas on app and preserves the streamed content", async () => {
    const response = applicationHostResponse(new Request("https://app.avyron.ro/en/library"), new Response("Public library", { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } }));
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await response.text()).toBe("Public library");
  });
  it("keeps immutable static bundles cached and canonical public pages indexable", async () => {
    const bundle = applicationHostResponse(new Request("https://app.avyron.ro/assets/app-a1234.js"), new Response("js", { headers: { "Content-Type": "application/javascript", "Cache-Control": "public, max-age=31536000, immutable" } }));
    expect(bundle.headers.get("Cache-Control")).toContain("immutable");
    const original = new Response("Public", { headers: { "Content-Type": "text/html" } });
    const secured = applicationHostResponse(new Request("https://avyron.ro/en/library"), original);
    expect(secured.headers.get("X-Robots-Tag")).toBeNull();
    expect(secured.headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(await secured.text()).toBe("Public");
  });
  it("applies the boundary through the native Pages/site Worker", async () => {
    const env = { ASSETS: { fetch: async () => new Response("<html><h1>Library</h1></html>", { headers: { "Content-Type": "text/html" } }) } };
    const app = await site.fetch(new Request("https://app.avyron.ro/en/library"), env);
    const publicPage = await site.fetch(new Request("https://avyron.ro/en/library"), env);
    expect(app.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(publicPage.headers.get("X-Robots-Tag")).toBeNull();
  });
});
