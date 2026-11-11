import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import sharp from "sharp";
import { discoveryReport } from "./lib/seo-discovery.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = existsSync(join(root, "dist/client/index.html")) ? join(root, "dist/client") : join(root, "dist");
const origin = "https://avyron.ro";
const delegatedCanonicals = new Map([
  ["/surveys", { canonical: "https://surveys.avyron.ro/", sitemap: "surveys-sitemap.xml" }],
]);

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
const recommendations = [];
const imageMetadata = new Map();
for (const [file, size] of [["favicon.png", 96], ["favicon-32.png", 32], ["favicon-16.png", 16], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  const metadata = await sharp(join(dist, file)).metadata();
  if (metadata.width !== size || metadata.height !== size) failures.push(`${file}: incorrect icon dimensions`);
}
const iconHeader = readFileSync(join(dist, "favicon.ico"));
if (iconHeader.readUInt16LE(0) !== 0 || iconHeader.readUInt16LE(2) !== 1 || !iconHeader.readUInt16LE(4)) failures.push("favicon.ico: invalid icon header");
const manifest = JSON.parse(readFileSync(join(dist, "site.webmanifest"), "utf8"));
for (const icon of manifest.icons || []) {
  const metadata = await sharp(join(dist, icon.src)).metadata();
  if (icon.sizes !== `${metadata.width}x${metadata.height}`) failures.push(`${icon.src}: incorrect manifest dimensions`);
}
const pages = [];
// Release each DOM before parsing the next page; large catalogs must not retain
// hundreds of JSDOM windows while image metadata is being read.
for (const file of htmlFiles(dist)) {
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
  const articleDates = Object.fromEntries(["published", "modified"].map((key) => [key,
    Date.parse(document.querySelector(`meta[property="article:${key}_time"]`)?.getAttribute("content") || ""),
  ]));
  const h1 = document.querySelectorAll("h1").length;
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')];
  const schemaTypes = new Set();
  for (const image of document.querySelectorAll("img")) {
    const src = image.getAttribute("src") || "";
    if (src.startsWith("/") && !src.startsWith("/api/")) {
      const imagePath = new URL(src, origin).pathname;
      if (!existsSync(join(dist, decodeURIComponent(imagePath)))) failures.push(`${route}: image does not exist (${imagePath})`);
    }
  }

  if (!title) failures.push(`${route}: missing title`);
  if (!description) failures.push(`${route}: missing meta description`);
  const expectedCanonical = delegatedCanonicals.get(route)?.canonical || `${origin}${route}`;
  if (canonical !== expectedCanonical) failures.push(`${route}: canonical is ${canonical || "missing"}`);
  if (h1 !== 1) failures.push(`${route}: expected exactly one H1, found ${h1}`);
  if (!noindex && !/(?:^|[\s,])index(?:$|[\s,])/i.test(robots)) failures.push(`${route}: indexable page lacks explicit index directive`);
  if (!noindex && !/(?:^|[\s,])follow(?:$|[\s,])/i.test(robots)) failures.push(`${route}: indexable page lacks explicit follow directive`);
  if (!noindex && !robots.includes("max-image-preview:large")) failures.push(`${route}: indexable page lacks large image preview directive`);
  if (!noindex && !robots.includes("max-snippet:-1")) failures.push(`${route}: indexable page lacks unlimited snippet directive`);
  if (!noindex && !robots.includes("max-video-preview:-1")) failures.push(`${route}: indexable page lacks unlimited video preview directive`);
  if (!noindex && !/^https:\/\//.test(ogImage)) failures.push(`${route}: indexable page lacks an absolute HTTPS og:image`);
  if (!noindex) {
    for (const key of ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
      if (!document.querySelector(`meta[name="${key}"]`)?.getAttribute("content")) failures.push(`${route}: missing ${key}`);
    }
    for (const image of document.querySelectorAll("img")) {
      if (!image.hasAttribute("alt")) failures.push(`${route}: image is missing an alt attribute`);
      if (!(Number(image.getAttribute("width")) > 0 && Number(image.getAttribute("height")) > 0)) failures.push(`${route}: image lacks intrinsic dimensions`);
    }
    try {
      const imageUrl = new URL(ogImage);
      if (imageUrl.origin === origin) {
        const imageFile = join(dist, decodeURIComponent(imageUrl.pathname));
        if (!existsSync(imageFile)) failures.push(`${route}: social image does not exist (${imageUrl.pathname})`);
        else {
          if (!imageMetadata.has(imageFile)) imageMetadata.set(imageFile, sharp(imageFile).metadata());
          const metadata = await imageMetadata.get(imageFile);
          for (const key of ["width", "height"]) {
            const declared = document.querySelector(`meta[property="og:image:${key}"]`)?.getAttribute("content");
            if (declared && Number(declared) !== metadata[key]) failures.push(`${route}: og:image:${key} differs from the image`);
          }
          const type = document.querySelector('meta[property="og:image:type"]')?.getAttribute("content");
          if (type && type !== `image/${metadata.format}`) failures.push(`${route}: social image MIME type differs from the image`);
        }
      }
    } catch { failures.push(`${route}: social image cannot be verified`); }
  }
  if (noindex && alternates.length) failures.push(`${route}: noindex page must not publish hreflang alternatives`);
  if (noindex && /^(?:\/produse|\/en\/products)\//.test(route) && !/(?:^|[\s,])follow(?:$|[\s,])/i.test(robots)) {
    failures.push(`${route}: public product utility page must remain noindex, follow`);
  }
  for (const script of jsonLd) {
    try {
      const data = JSON.parse(script.textContent || "");
      for (const node of data["@graph"] || [data]) {
        const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
        types.filter(Boolean).forEach((type) => schemaTypes.add(type));
      }
    } catch {
      failures.push(`${route}: invalid JSON-LD`);
    }
  }
  const isServicePage = /^\/(?:servicii|en\/services)\//.test(route);
  const isStudioApp = /\/(?:creeaza|create)$/.test(route);
  if (!noindex && isServicePage && !schemaTypes.has("Service") && !(isStudioApp && schemaTypes.has("WebApplication"))) {
    recommendations.push({ route, code: "service_schema", recommendation: "Adaugă date Service conforme cu oferta vizibilă pe pagină." });
  }
  if (!noindex && /^\/(?:en\/)?blog\//.test(route) && !schemaTypes.has("Article") && !schemaTypes.has("BlogPosting")) {
    recommendations.push({ route, code: "article_schema", recommendation: "Adaugă date Article sau BlogPosting conforme cu articolul afișat." });
  }
  if (!noindex && ["/", "/en"].includes(route) && !schemaTypes.has("Organization")) {
    recommendations.push({ route, code: "organization_schema", recommendation: "Adaugă identitatea Organization pe pagina principală." });
  }
  const isProductDetail = /^\/produse\/(?!colectii\/)[^/]+\/[^/]+$/.test(route)
    || /^\/en\/products\/(?!collections\/)[^/]+\/[^/]+$/.test(route);
  if (isProductDetail && !schemaTypes.has("Product")) {
    recommendations.push({ route, code: "product_schema", recommendation: "Descrie produsul prin Product și adaugă Offer numai pentru prețul afișat." });
  }
  const links = [...document.querySelectorAll("a[href]")].map(link => link.getAttribute("href"));
  pages.push({ articleDates, route, title, description, canonical, robots, noindex, ids, schemaTypes: [...schemaTypes], links });
  document.defaultView.close();
}

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
  if (child(node, "lastmod") && (!Number.isFinite(modified) || modified > Date.now())) failures.push(`${loc}: invalid or future lastmod`);
  return { loc, route, lastmod, links, images };
});
const sitemapRoutes = sitemapEntries.map((entry) => entry.route).filter(Boolean);
const sitemapSet = new Set(sitemapRoutes);
const sitemapByUrl = new Map(sitemapEntries.map((entry) => [entry.loc, entry]));
const delegatedSitemapUrls = new Map();

for (const [route, delegated] of delegatedCanonicals) {
  const delegatedPath = join(dist, delegated.sitemap);
  if (!existsSync(delegatedPath)) {
    failures.push(`${route}: delegated sitemap ${delegated.sitemap} is missing`);
    continue;
  }
  const delegatedDocument = new JSDOM(readFileSync(delegatedPath, "utf8"), { contentType: "application/xml" }).window.document;
  if (delegatedDocument.querySelector("parsererror")) {
    failures.push(`${delegated.sitemap} is not valid XML`);
    continue;
  }
  const urls = [...delegatedDocument.querySelectorAll("url")];
  if (urls.length !== 1) failures.push(`${delegated.sitemap} must contain exactly one public URL`);
  for (const node of urls) {
    const loc = child(node, "loc")?.textContent?.trim() || "";
    if (loc !== delegated.canonical) failures.push(`${delegated.sitemap}: unexpected URL ${loc || "missing"}`);
    if (child(node, "lastmod")) failures.push(`${delegated.sitemap}: lastmod has no editorial source`);
    delegatedSitemapUrls.set(route, loc);
  }
}
const indexable = pages.filter((page) => !page.noindex);
const noindex = pages.filter((page) => page.noindex);

for (const page of indexable) {
  const entry = sitemapByUrl.get(page.canonical);
  if (entry) {
    const { published, modified } = page.articleDates;
    const expectedLastmod = /^\/(?:en\/)?blog\/[^/]+$/.test(page.route) && published > 0 && modified >= published && modified <= Date.now()
      ? new Date(modified).toISOString() : "";
    if (entry.lastmod !== expectedLastmod) failures.push(`${page.route}: sitemap lastmod must match the rendered editorial date`);
  }
  const delegated = delegatedCanonicals.get(page.route);
  if (delegated) {
    if (delegatedSitemapUrls.get(page.route) !== delegated.canonical) {
      failures.push(`${page.route}: indexable delegated page missing from ${delegated.sitemap}`);
    }
  } else if (!sitemapSet.has(page.route)) {
    failures.push(`${page.route}: indexable page missing from sitemap`);
  }
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
for (const page of pages) {
  for (const href of new Set(page.links)) {
    try {
      const target = new URL(href, `${origin}${page.route}`);
      const destination = pageByRoute.get(target.pathname);
      if (target.origin === origin && target.hash && destination && !destination.ids.has(decodeURIComponent(target.hash.slice(1)))) {
        failures.push(`${page.route}: link points to a missing fragment (${target.pathname}${target.hash})`);
      }
    } catch { failures.push(`${page.route}: invalid internal link`); }
  }
}
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
const llmsRoutes = llmsLinks.filter((href) => {
  try {
    const target = new URL(href, origin);
    return target.origin === origin && !target.hash;
  } catch { return false; }
}).map((href) => new URL(href, origin).pathname);
if (llmsRoutes.length !== sitemapSet.size || new Set(llmsRoutes).size !== sitemapSet.size) {
  failures.push(`llms.txt must list exactly the ${sitemapSet.size} canonical sitemap pages`);
}
for (const route of sitemapSet) {
  if (!llmsRoutes.includes(route)) failures.push(`llms.txt is missing sitemap page ${route}`);
}
const discovery = discoveryReport(pages, [...sitemapSet]);
for (const route of discovery.orphanPages) failures.push(`${route}: sitemap page has no HTML link path from the homepage`);
if (failures.length) {
  throw new Error(`SEO audit failed (${failures.length}):\n${failures.map((item) => `- ${item}`).join("\n")}`);
}

writeFileSync(join(dist, "seo-audit.json"), JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  summary: {
    indexablePages: sitemapSet.size,
    noindexPages: noindex.length,
    strategicProductPages: indexedProductRoutes.length,
    llmsPages: llmsRoutes.length,
  },
  recommendations,
  discovery,
}, null, 2));

console.log(
  `SEO audit passed: ${indexable.length} indexable pages, ${noindex.length} public noindex pages, ${indexedProductRoutes.length} strategic product URLs.`,
);
