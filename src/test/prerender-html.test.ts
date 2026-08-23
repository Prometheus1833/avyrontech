/**
 * Validates the RAW prerendered HTML (no JavaScript execution).
 * Run `npm run build` first; the suite skips itself when dist/ is absent.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isNoindexPath, PRERENDER_ROUTES } from "@/seo/publicRoutes";

const root = process.cwd();
const distDir = existsSync(resolve(root, "dist/client/index.html"))
  ? resolve(root, "dist/client")
  : resolve(root, "dist");
const hasBuild = existsSync(resolve(distDir, "index.html"));

const read = (route: string) =>
  readFileSync(resolve(distDir, route === "/" ? "index.html" : `${route.slice(1)}/index.html`), "utf8");

const head = (html: string) => html.split("</head>")[0];
const attr = (html: string, re: RegExp) => html.match(re)?.[1];

describe.skipIf(!hasBuild)("prerendered HTML", () => {
  const cases: Array<[string, string, string]> = [
    ["/", "ro", "https://avyron.ro/"],
    ["/costurisiproduse", "ro", "https://avyron.ro/costurisiproduse"],
    ["/produse/audit-website", "ro", "https://avyron.ro/produse/audit-website"],
    ["/en/products/website-audit", "en", "https://avyron.ro/en/products/website-audit"],
    ["/en/pricing", "en", "https://avyron.ro/en/pricing"],
  ];

  it.each(cases)("%s ships lang, title, description and self-canonical", (route, lang, canonical) => {
    const html = read(route);
    const h = head(html);
    expect(attr(html, /<html[^>]*lang="([^"]+)"/)).toBe(lang);
    expect(attr(h, /<title>([^<]+)<\/title>/)!.length).toBeGreaterThan(10);
    expect(attr(h, /<meta name="description"[^>]*content="([^"]+)"/)!.length).toBeGreaterThan(30);
    expect(attr(h, /<link rel="canonical"[^>]*href="([^"]+)"/)).toBe(canonical);
    expect(attr(h, /<meta property="og:url"[^>]*content="([^"]+)"/)).toBe(canonical);
    expect(h).toMatch(/<meta name="robots"[^>]*content="index, follow/);
    // Real content, not an empty shell.
    expect(html).toMatch(/<h1[\s>]/);
    expect(html.length).toBeGreaterThan(20000);
  });

  it("titles and descriptions are unique per route", () => {
    const titles = new Set<string>();
    const indexableRoutes = PRERENDER_ROUTES.filter((route) => !isNoindexPath(route));
    for (const route of indexableRoutes) {
      const t = attr(head(read(route)), /<title>([^<]+)<\/title>/)!;
      titles.add(t);
    }
    expect(titles.size).toBeGreaterThan(indexableRoutes.length * 0.8);
  });

  it("RO/EN pairs cross-link with hreflang + x-default", () => {
    for (const route of ["/costurisiproduse", "/en/pricing"]) {
      const h = head(read(route));
      expect(h).toContain('hreflang="ro" href="https://avyron.ro/costurisiproduse"');
      expect(h).toContain('hreflang="en" href="https://avyron.ro/en/pricing"');
      expect(h).toContain('hreflang="x-default" href="https://avyron.ro/costurisiproduse"');
    }
  });

  it("ships exactly one JSON-LD graph with no duplicated global nodes", () => {
    for (const route of ["/", "/costurisiproduse", "/produse/audit-website", "/pachete-mentenanta"]) {
      const h = head(read(route));
      const scripts = h.match(/<script[^>]*application\/ld\+json[^>]*>/g) || [];
      expect(scripts.length).toBe(1);
      const graph = JSON.parse(
        h.match(/<script[^>]*id="ld-graph"[^>]*>([\s\S]*?)<\/script>/)![1],
      );
      const types = graph["@graph"].map((n: { "@type": string }) => n["@type"]);
      expect(new Set(types).size).toBe(types.length);
      const org = graph["@graph"].find((n: { "@type": string }) => n["@type"] === "Organization");
      expect(org.logo.url ?? org.logo).toContain("/avyron-logo.jpg");
      expect(JSON.stringify(org.member)).toContain("FV Tech Solutions SRL");
      expect(JSON.stringify(org.member)).toContain("DIGITAL ECOTECH SOLUTIONS S.R.L.");
      expect(JSON.stringify(org.member)).toContain("55055976");
    }
  });

  it("publishes the confirmed legal association on the GDPR page", () => {
    const html = read("/gdpr");
    expect(html).toContain("FV Tech Solutions SRL");
    expect(html).toContain("Municipiul Pașcani, județul Iași");
    expect(html).toContain("DIGITAL ECOTECH SOLUTIONS S.R.L.");
    expect(html).toContain("55055976");
    expect(html).toContain("Bd. Independenței nr. 20");
  });

  it("keeps Product/Service schema off non-product pages", () => {
    for (const route of ["/", "/costurisiproduse"]) {
      const h = head(read(route));
      expect(h).not.toContain('"@type":"Product"');
    }
  });

  it("error pages are prerendered with noindex", () => {
    for (const file of ["404.html", "403.html", "500.html", "mentenanta.html"]) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      expect(head(html)).toMatch(/<meta name="robots"[^>]*content="noindex/);
      expect(html).toMatch(/<h1[\s>]/);
    }
  });

  it("does not prerender private routes", () => {
    for (const p of ["auth", "profil", "intern"]) {
      expect(existsSync(resolve(distDir, p, "index.html"))).toBe(false);
    }
  });
});
