import { describe, expect, it } from "vitest";
import { systemDiagnosticsRouter } from "../../cloudflare/workers/api/src/systemDiagnostics";
import type { AppBindings } from "../../cloudflare/workers/api/src/types";

describe("AVYRON OS SEO diagnostics", () => {
  it("compares packaged SEO files and recommends a concrete repair for a mismatch", async () => {
    const files: Record<string, string> = {
      "/seo-audit.json": JSON.stringify({
        version: 1,
        generatedAt: "2026-10-26T08:00:00Z",
        summary: { indexablePages: 2, noindexPages: 1, strategicProductPages: 1, llmsPages: 2 },
        recommendations: [],
      }),
      "/sitemap.xml": "<urlset><url><loc>https://avyron.ro/</loc></url></urlset>",
      "/robots.txt": "User-agent: *\nAllow: /\nSitemap: https://avyron.ro/sitemap.xml\n",
      "/llms.txt": "# AVYRON\n- [Home](https://avyron.ro/): Public page.\n",
    };
    const env = {
      ASSETS: { fetch: async (request: Request) => {
        const body = files[new URL(request.url).pathname];
        return new Response(body ?? "Not found", { status: body ? 200 : 404 });
      } },
    } as AppBindings["Bindings"];
    const response = await systemDiagnosticsRouter.request("http://localhost/api/admin/system/seo", {}, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const payload = await response.json() as { data: { recommendations: Array<{ code: string }> } };
    expect(payload.data.recommendations.map((item) => item.code)).toEqual(["llms_mismatch", "sitemap_mismatch"]);
  });
});
