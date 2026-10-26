import { describe, expect, it } from "vitest";
import { headersForTransformedBody, mergeBlogLlms, mergeBlogSitemap } from "@/worker/blogHtml";

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>https://avyron.ro/</loc><lastmod>2026-10-01</lastmod></url>
</urlset>`;

describe("dynamic blog sitemap", () => {
  it("adds published articles to llms.txt once, without copying Markdown markup", () => {
    const base = "# AVYRON\n\n- [Existing](https://avyron.ro/blog/existing): Existing article.\n";
    const result = mergeBlogLlms(base, [
      { language: "ro", slug: "existing", title: "Existing", excerpt: "Same", updated_at: "2026-10-08" },
      { language: "en", slug: "new-guide", title: "[New] # guide", excerpt: "Useful (tested) guide", updated_at: "2026-10-08" },
      { language: "ro", slug: "Invalid Slug", title: "Invalid", excerpt: "Ignore", updated_at: "2026-10-08" },
    ]);
    expect(result.match(/https:\/\/avyron.ro\/blog\/existing/g)).toHaveLength(1);
    expect(result).toContain("[New guide](https://avyron.ro/en/blog/new-guide): Useful tested guide");
    expect(result).not.toContain("Invalid Slug");
  });

  it("adds only valid canonical articles and reciprocal language alternatives", () => {
    const xml = mergeBlogSitemap(sitemap, [
      {
        language: "ro",
        slug: "ghid-seo",
        alternate_slug: "seo-guide",
        cover_image_url: "/media/seo?a=1&b=2",
        updated_at: "2026-10-08T10:00:00.000Z",
      },
      {
        language: "en",
        slug: "seo-guide",
        alternate_slug: "ghid-seo",
        cover_image_url: "https://cdn.example.com/seo.jpg",
        updated_at: "2026-10-08T11:00:00.000Z",
      },
      { language: "ro", slug: "fara-pereche", alternate_slug: "missing", updated_at: "2026-10-08" },
      { language: "ro", slug: "data-invalida", updated_at: "not-a-date" },
      { language: "ro", slug: "Slug Invalid", updated_at: "2026-10-08" },
      { language: "ro", slug: "ghid-seo", updated_at: "2026-10-08T10:00:00.000Z" },
    ]);

    expect(xml.match(/<loc>https:\/\/avyron\.ro\/blog\/ghid-seo<\/loc>/g)).toHaveLength(1);
    expect(xml).toContain("<loc>https://avyron.ro/en/blog/seo-guide</loc>");
    expect(xml).toContain("<loc>https://avyron.ro/blog/fara-pereche</loc>");
    expect(xml).not.toContain("data-invalida");
    expect(xml).not.toContain("Slug Invalid");
    expect(xml).not.toMatch(/fara-pereche[\s\S]*?hreflang=/);
    expect(xml).toContain('hreflang="en" href="https://avyron.ro/en/blog/seo-guide"');
    expect(xml).toContain("https://avyron.ro/media/seo?a=1&amp;b=2");
  });

  it("does not preserve validators for a static body after transformation", () => {
    const headers = headersForTransformedBody(new Headers({
      etag: '"static"',
      "content-length": "123",
      "content-encoding": "br",
      "last-modified": "Wed, 08 Oct 2026 10:00:00 GMT",
      "accept-ranges": "bytes",
      "cache-control": "public",
    }));

    expect(headers.get("etag")).toBeNull();
    expect(headers.get("content-length")).toBeNull();
    expect(headers.get("content-encoding")).toBeNull();
    expect(headers.get("last-modified")).toBeNull();
    expect(headers.get("accept-ranges")).toBeNull();
    expect(headers.get("cache-control")).toBe("public");
  });
});
