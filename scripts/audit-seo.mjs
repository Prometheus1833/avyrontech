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
const warnings = [];
const pages = htmlFiles(dist).map((file) => {
  const route = routeFor(file);
  const html = readFileSync(file, "utf8");
  const document = new JSDOM(html).window.document;
  const title = document.querySelector("title")?.textContent?.trim() || "";
  const description = document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
  const noindex = /(?:^|[\s,])noindex(?:$|[\s,])/i.test(robots);
  const h1 = document.querySelectorAll("h1").length;
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')];

  if (!title) failures.push(`${route}: missing title`);
  if (!description) failures.push(`${route}: missing meta description`);
  if (canonical !== `${origin}${route}`) failures.push(`${route}: canonical is ${canonical || "missing"}`);
  if (h1 !== 1) failures.push(`${route}: expected exactly one H1, found ${h1}`);
  for (const script of jsonLd) {
    try {
      JSON.parse(script.textContent || "");
    } catch {
      failures.push(`${route}: invalid JSON-LD`);
    }
  }
  if (!noindex && title.length > 65) warnings.push(`${route}: title has ${title.length} characters`);
  if (!noindex && (description.length < 70 || description.length > 170)) {
    warnings.push(`${route}: description has ${description.length} characters`);
  }

  return { route, title, description, canonical, robots, noindex };
});

const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
const sitemapRoutes = [...sitemap.matchAll(/<url>[\s\S]*?<loc>https:\/\/avyron\.ro([^<]*)<\/loc>/g)].map(
  (match) => match[1] || "/",
);
const sitemapSet = new Set(sitemapRoutes);
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
if (readFileSync(join(root, "index.html"), "utf8").includes('name="keywords"')) {
  failures.push("obsolete meta keywords tag is still present");
}

if (warnings.length) {
  console.warn(`SEO audit warnings (${warnings.length}):\n${warnings.map((item) => `- ${item}`).join("\n")}`);
}
if (failures.length) {
  throw new Error(`SEO audit failed (${failures.length}):\n${failures.map((item) => `- ${item}`).join("\n")}`);
}

console.log(
  `SEO audit passed: ${indexable.length} indexable pages, ${noindex.length} public noindex pages, ${indexedProductRoutes.length} strategic product URLs.`,
);
