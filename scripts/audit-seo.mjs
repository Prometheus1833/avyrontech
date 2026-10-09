import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = existsSync(join(root, "dist/client/index.html")) ? join(root, "dist/client") : join(root, "dist");
const origin = "https://avyron.ro";

if (!existsSync(join(dist, "index.html"))) {
  throw new Error("SEO audit: dist/index.html is missing; run the production build first");
}

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name === "index.html" ? [path] : [];
  });
}

function routeFor(file) {
  const path = relative(dist, file).replaceAll("\\", "/");
  return path === "index.html" ? "/" : `/${path.replace(/\/index\.html$/, "")}`;
}

const failures = [];
const pages = htmlFiles(dist).map((file) => {
  const route = routeFor(file);
  const html = readFileSync(file, "utf8");
  const document = new JSDOM(html).window.document;
  const title = document.querySelector("title")?.textContent?.trim() || "";
  const description = document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
  const noindex = /(?:^|[\s,])noindex(?:$|[\s,])/i.test(robots);
  const alternates = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => ({
    language: link.getAttribute("hreflang") || "",
    href: link.getAttribute("href") || "",
  }));
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
  const ids = new Set([...document.querySelectorAll("[id]")].map((element) => element.id));
  const h1 = document.querySelectorAll("h1").length;
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')];

  if (!title) failures.push(`${route}: missing title`);
  if (!description) failures.push(`${route}: missing meta description`);
  if (canonical !== `${origin}${route}`) failures.push(`${route}: canonical is ${canonical || "missing"}`);
  if (h1 !== 1) failures.push(`${route}: expected exactly one H1, found ${h1}`);
  if (!noindex && !/(?:^|[\s,])index(?:$|[\s,])/i.test(robots)) failures.push(`${route}: indexable page lacks explicit index directive`);
  if (!noindex && !/(?:^|[\s,])follow(?:$|[\s,])/i.test(robots)) failures.push(`${route}: indexable page lacks explicit follow directive`);
  if (!noindex && !robots.includes("max-image-preview:large")) failures.push(`${route}: indexable page lacks large image preview directive`);
  if (!noindex && !robots.includes("max-snippet:-1")) failures.push(`${route}: indexable page lacks unlimited snippet directive`);
  if (!noindex && !robots.includes("max-video-preview:-1")) failures.push(`${route}: indexable page lacks unlimited video preview directive`);
  if (!noindex && !/^https:\/\//.test(ogImage)) failures.push(`${route}: indexable page lacks an absolute HTTPS og:image`);
  if (noindex && alternates.length) failures.push(`${route}: noindex page must not publish hreflang alternatives`);
  if (noindex && /^(?:\/produse|\/en\/products)\//.test(route) && !/(?:^|[\s,])follow(?:$|[\s,])/i.test(robots)) {
    failures.push(`${route}: public product utility page must remain noindex, follow`);
  }
  for (const script of jsonLd) {
    try {
      JSON.parse(script.textContent || "");
    } catch {
      failures.push(`${route}: invalid JSON-LD`);
    }
  }
  return { route, title, description, canonical, robots, noindex, ids };
});

const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
const sitemapDocument = new JSDOM(sitemap, { contentType: "application/xml" }).window.document;
if (sitemapDocument.querySelector("parsererror")) failures.push("sitemap.xml is not valid XML");
const child = (node, localName) => [...node.children].find((element) => element.localName === localName);
const sitemapEntries = [...sitemapDocument.querySelectorAll("url")].map((node) => {
  const loc = child(node, "loc")?.textContent?.trim() || "";
  const lastmod = child(node, "lastmod")?.textContent?.trim() || "";
  const links = [...node.children]
    .filter((element) => element.localName === "link" && element.getAttribute("rel") === "alternate")
    .map((element) => ({ language: element.getAttribute("hreflang") || "", href: element.getAttribute("href") || "" }));
  const images = [...node.children]
    .filter((element) => element.localName === "image")
    .map((element) => child(element, "loc")?.textContent?.trim() || "")
    .filter(Boolean);
  let route = "";
  try {
    const url = new URL(loc);
    route = url.pathname || "/";
    if (url.protocol !== "https:" || url.origin !== origin) failures.push(`${loc || "missing URL"}: sitemap URL must use the canonical HTTPS origin`);
    if (url.search || url.hash) failures.push(`${loc}: sitemap URL contains a query string or fragment`);
  } catch {
    failures.push(`${loc || "missing URL"}: invalid sitemap URL`);
  }
  const modified = Date.parse(lastmod);
  if (!lastmod || Number.isNaN(modified)) failures.push(`${loc || "unknown URL"}: invalid or missing lastmod`);
  else if (modified > Date.now() + 300_000) failures.push(`${loc}: lastmod is in the future`);
  return { loc, route, lastmod, links, images };
});
const sitemapRoutes = sitemapEntries.map((entry) => entry.route).filter(Boolean);
const sitemapSet = new Set(sitemapRoutes);
const sitemapByUrl = new Map(sitemapEntries.map((entry) => [entry.loc, entry]));
const indexable = pages.filter((page) => !page.noindex);
const noindex = pages.filter((page) => page.noindex);

for (const page of indexable) {
  if (!sitemapSet.has(page.route)) failures.push(`${page.route}: indexable page missing from sitemap`);
}
for (const page of noindex) {
  if (sitemapSet.has(page.route)) failures.push(`${page.route}: noindex page present in sitemap`);
}
for (const route of sitemapRoutes) {
  if (!pages.some((page) => page.route === route)) failures.push(`${route}: sitemap URL has no prerendered page`);
}
if (sitemapRoutes.length !== sitemapSet.size) failures.push("sitemap contains duplicate URLs");

for (const entry of sitemapEntries) {
  for (const link of entry.links) {
    const target = sitemapByUrl.get(link.href);
    if (!target) {
      failures.push(`${entry.route}: hreflang ${link.language || "missing"} points outside the sitemap (${link.href || "missing href"})`);
      continue;
    }
    if (link.language !== "x-default" && !target.links.some((candidate) => candidate.href === entry.loc)) {
      failures.push(`${entry.route}: hreflang relationship with ${target.route} is not reciprocal`);
    }
  }
  for (const image of entry.images) {
    try {
      const imageUrl = new URL(image);
      if (imageUrl.protocol !== "https:") failures.push(`${entry.route}: sitemap image is not HTTPS (${image})`);
      if (imageUrl.origin === origin) {
        const localPath = join(dist, decodeURIComponent(imageUrl.pathname).replace(/^\//, ""));
        if (!existsSync(localPath)) failures.push(`${entry.route}: sitemap image does not exist in the build (${imageUrl.pathname})`);
      }
    } catch {
      failures.push(`${entry.route}: invalid sitemap image URL (${image})`);
    }
  }
}

for (const field of ["title", "description"]) {
  const seen = new Map();
  for (const page of indexable) {
    const duplicate = seen.get(page[field]);
    if (duplicate) failures.push(`${page.route}: duplicate ${field} shared with ${duplicate}`);
    else seen.set(page[field], page.route);
  }
}

const indexedProductRoutes = indexable.filter((page) =>
  page.route.startsWith("/produse") ||
  page.route.startsWith("/en/products") ||
  /^\/(it\/prodotti|hu\/termekek|de\/produkte|fr\/produits|pl\/produkty)$/.test(page.route),
);
if (indexedProductRoutes.length !== 11) {
  failures.push(`expected 11 strategic product URLs, found ${indexedProductRoutes.length}`);
}

const robotsTxt = readFileSync(join(dist, "robots.txt"), "utf8");
if (/Disallow:\s*\/\*\?q=/i.test(robotsTxt)) failures.push("robots.txt still blocks the obsolete q parameter");
if (/^\s*noindex\s*:/im.test(robotsTxt)) failures.push("robots.txt contains the unsupported noindex directive");
const sitemapDirectives = [...robotsTxt.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)].map((match) => match[1]);
if (sitemapDirectives.length !== 1 || sitemapDirectives[0] !== `${origin}/sitemap.xml`) {
  failures.push("robots.txt must contain exactly one canonical sitemap directive");
}
if (readFileSync(join(root, "index.html"), "utf8").includes('name="keywords"')) {
  failures.push("obsolete meta keywords tag is still present");
}

const llms = readFileSync(join(dist, "llms.txt"), "utf8");
const llmsLinks = [...llms.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
const pageByRoute = new Map(pages.map((page) => [page.route, page]));
for (const href of llmsLinks) {
  const target = new URL(href, origin);
  if (target.origin !== origin) continue;
  if (target.search) failures.push(`llms.txt contains a non-canonical query URL (${href})`);
  const route = target.pathname || "/";
  if (!sitemapSet.has(route)) failures.push(`llms.txt points to a URL outside the indexable sitemap (${href})`);
  if (target.hash) {
    const id = decodeURIComponent(target.hash.slice(1));
    if (!pageByRoute.get(route)?.ids.has(id)) failures.push(`llms.txt points to a missing page fragment (${href})`);
  }
}
if (failures.length) {
  throw new Error(`SEO audit failed (${failures.length}):\n${failures.map((item) => `- ${item}`).join("\n")}`);
}

console.log(
  `SEO audit passed: ${indexable.length} indexable pages, ${noindex.length} public noindex pages, ${indexedProductRoutes.length} strategic product URLs.`,
);
