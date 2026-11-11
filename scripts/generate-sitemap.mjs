import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = existsSync(join(root, "dist/client/index.html")) ? join(root, "dist/client") : join(root, "dist");
const base = "https://avyron.ro";
const delegatedCanonicals = new Map([
  ["/surveys", "https://surveys.avyron.ro/"],
]);

function routeFor(file) {
  const rel = relative(dist, file).replaceAll("\\", "/");
  if (rel === "index.html") return "/";
  return `/${rel.replace(/\/index\.html$/, "")}`;
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name === "index.html" ? [path] : [];
  });
}

const routes = htmlFiles(dist)
  .map(routeFor)
  .sort((a, b) => a.localeCompare(b));

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function pageMetadata(route) {
  const file = route === "/" ? join(dist, "index.html") : join(dist, route.slice(1), "index.html");
  const html = readFileSync(file, "utf8");
  const alternates = [...html.matchAll(/<link\b[^>]*\brel="alternate"[^>]*\bhreflang="([^"]+)"[^>]*\bhref="([^"]+)"[^>]*>/g)]
    .map((match) => ({ language: match[1], href: match[2] }))
    .filter(({ href }) => href.startsWith(`${base}/`) || href === `${base}/`);
  const image = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"[^>]*>/)?.[1] || null;
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"[^>]*>/i)?.[1] || "";
  const canonical = html.match(/<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"[^>]*>/i)?.[1] || null;
  // Only use the page's own editorial date. Git metadata is incomplete in
  // shallow CI checkouts and can assign the same release date to every URL.
  const published = Date.parse(html.match(/<meta\b(?=[^>]*\sproperty="article:published_time")[^>]*\scontent="([^"]+)"/)?.[1] || "");
  const modified = Date.parse(html.match(/<meta\b(?=[^>]*\sproperty="article:modified_time")[^>]*\scontent="([^"]+)"/)?.[1] || "");
  const lastmod = /^\/(?:en\/)?blog\/[^/]+$/.test(route) && published > 0 && modified >= published && modified <= Date.now()
    ? new Date(modified).toISOString()
    : null;
  return { alternates, image, lastmod, noindex: /(?:^|[\s,])noindex(?:$|[\s,])/i.test(robots), canonical };
}

const metadataByRoute = new Map(routes.map(route => [route, pageMetadata(route)]));
const indexableRoutes = routes.filter((route) => {
  const metadata = metadataByRoute.get(route);
  if (metadata.noindex) return false;
  const expectedCanonical = `${base}${route === "/" ? "/" : route}`;
  const delegatedCanonical = delegatedCanonicals.get(route);
  if (delegatedCanonical) {
    if (metadata.canonical !== delegatedCanonical) {
      throw new Error(`sitemap: delegated canonical mismatch for ${route}: ${metadata.canonical || "missing"}`);
    }
    return false;
  }
  if (metadata.canonical !== expectedCanonical) {
    throw new Error(`sitemap: canonical mismatch for ${route}: ${metadata.canonical || "missing"}`);
  }
  return true;
});

const body = indexableRoutes.map((route) => {
  const { alternates, image, lastmod } = metadataByRoute.get(route);
  const alternateXml = alternates
    .map(({ language, href }) => `    <xhtml:link rel="alternate" hreflang="${esc(language)}" href="${esc(href)}" />`)
    .join("\n");
  const imageXml = image && image !== `${base}/og/home.jpg`
    ? `    <image:image>\n      <image:loc>${esc(image)}</image:loc>\n    </image:image>`
    : "";
  return [
    "  <url>",
    `    <loc>${esc(`${base}${route === "/" ? "/" : route}`)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    alternateXml,
    imageXml,
    "  </url>",
  ].filter(Boolean).join("\n");
}).join("\n");

writeFileSync(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`);
writeFileSync(join(dist, "surveys-sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://surveys.avyron.ro/</loc>\n  </url>\n</urlset>\n`);
console.log(`sitemap: ${indexableRoutes.length} avyron.ro URLs and ${delegatedCanonicals.size} delegated URLs written with editorial lastmod where verified`);
