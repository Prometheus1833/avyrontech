/**
 * Validates the RAW prerendered HTML (no JavaScript execution).
 * Run `npm run build` first; the suite skips itself when dist/ is absent.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isNoindexPath, PRERENDER_ROUTES } from "@/seo/publicRoutes";
import { BLOG_INDEX } from "@/data/blogIndex";
import { BLOG_SLUGS } from "@/data/blogSlugs";

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
  it("keeps the dependency-light Worker slug registry aligned with source articles", () => {
    expect([...BLOG_SLUGS]).toEqual(BLOG_INDEX.map((post) => post.slug));
  });

  const cases: Array<[string, string, string]> = [
    ["/", "ro", "https://avyron.ro/"],
    ["/costurisiproduse", "ro", "https://avyron.ro/costurisiproduse"],
    ["/produse/website-prezentare-premium", "ro", "https://avyron.ro/produse/website-prezentare-premium"],
    ["/en/products/premium-presentation-website", "en", "https://avyron.ro/en/products/premium-presentation-website"],
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

  it("ships complete, indexable English privacy content", () => {
    const html = read("/en/privacy");
    const h = head(html);
    expect(h).toContain('content="index, follow');
    expect(h).toContain('hreflang="ro" href="https://avyron.ro/gdpr"');
    expect(h).toContain('hreflang="en" href="https://avyron.ro/en/privacy"');
    expect(html).toContain("Legal identity and collaboration structure");
    expect(html).toContain("Your GDPR rights");
    expect(html).not.toContain("translation is being prepared");
  });

  it("prerenders complete RO/EN article bodies with reciprocal hreflang", () => {
    const slug = "importanta-website-afacere-2026";
    const ro = read(`/blog/${slug}`);
    const en = read(`/en/blog/${slug}`);
    for (const html of [ro, en]) {
      const h = head(html);
      expect(h).toContain('content="index, follow');
      expect(h).toContain(`hreflang="ro" href="https://avyron.ro/blog/${slug}"`);
      expect(h).toContain(`hreflang="en" href="https://avyron.ro/en/blog/${slug}"`);
      expect(h).toContain('"@type":"BlogPosting"');
      expect(html.length).toBeGreaterThan(30000);
    }
    expect(ro).toContain("Ce face un website util");
    expect(en).toContain("What makes a website useful");
  });

  it("ships exactly one JSON-LD graph with no duplicated global nodes", () => {
    for (const route of ["/", "/costurisiproduse", "/produse/website-prezentare-premium", "/pachete-mentenanta"]) {
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
      expect(org.legalName).toBe("DIGITAL ECOTECH SOLUTIONS S.R.L.");
      expect(org.identifier.value).toBe("55055976");
      expect(JSON.stringify(org)).not.toContain("FV Tech Solutions SRL");
      expect(org.sameAs).toContain("https://www.instagram.com/avyrontech/");
      expect(org.sameAs).toContain("https://www.tiktok.com/@avyron4");
      expect(org.sameAs).not.toContain("avyron.tech");
    }
  });

  it("keeps the full legal context on the GDPR page and leads with the primary entity", () => {
    const html = read("/gdpr");
    expect(html).toContain("FV Tech Solutions SRL");
    expect(html).toContain("Municipiul Pașcani, județul Iași");
    expect(html).toContain("DIGITAL ECOTECH SOLUTIONS S.R.L.");
    expect(html).toContain("55055976");
    expect(html).toContain("Bd. Independenței nr. 20");
    expect(html.indexOf("DIGITAL ECOTECH SOLUTIONS S.R.L.")).toBeLessThan(
      html.indexOf("FV Tech Solutions SRL"),
    );
  });

  it("keeps the collaboration disclosure out of the public homepage footer", () => {
    const html = read("/");
    expect(html).not.toContain("Avyron este dezvoltat și operat prin colaborarea dintre");
    expect(html).not.toContain("FV Tech Solutions SRL");
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
