import { describe, expect, it } from "vitest";
import { discoveryReport } from "../../scripts/lib/seo-discovery.mjs";

describe("HTML crawl discovery", () => {
  it("detects sitemap-only pages and ignores links to other hosts", () => {
    const report = discoveryReport([
      { route: "/", links: ["/servicii#web", "https://app.avyron.ro/orphan"] },
      { route: "/servicii", links: ["/servicii/web/"] },
      { route: "/servicii/web", links: [] },
      { route: "/orphan", links: [] },
    ], ["/", "/servicii", "/servicii/web", "/orphan"]);
    expect(report.reachablePages).toBe(3);
    expect(report.orphanPages).toEqual(["/orphan"]);
  });
  it("follows public utility hubs and survives loops and invalid hrefs", () => {
    expect(discoveryReport([
      { route: "/", links: ["/catalog", "http://["] },
      { route: "/catalog", links: ["/", "/produs"] },
      { route: "/produs", links: [] },
    ], ["/", "/produs"]).orphanPages).toEqual([]);
  });
});
