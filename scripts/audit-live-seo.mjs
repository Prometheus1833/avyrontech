/**
 * Read-only production crawlability check for every URL in the public sitemaps.
 * This validates served HTTP/HTML, not Google indexing or traffic.
 */
import { JSDOM } from "jsdom";
import { produseIndexableRoutePairs } from "../src/features/produse/data/routes.ts";

const sites = [
  { origin: "https://avyron.ro", sitemap: "/sitemap.xml" },
  { origin: "https://surveys.avyron.ro", sitemap: "/sitemap.xml" },
];
const growthRoutes = [
  "/servicii/seo-ai-visibility-performance",
  "/en/services/seo-ai-visibility-performance",
  "/servicii/digital-marketing-ads",
  "/en/services/digital-marketing-ads",
];
const growthPairs = [
  [growthRoutes[0], growthRoutes[1]],
  [growthRoutes[2], growthRoutes[3]],
];
const requireGrowthRoutes = process.argv.includes("--require-growth-routes");
const requireProductRoutes = process.argv.includes("--require-product-routes");
const pairsToVerify = [
  ...(requireGrowthRoutes ? growthPairs : []),
  ...(requireProductRoutes ? produseIndexableRoutePairs().slice(1).map(({ ro, en }) => [ro, en]) : []),
];
const errors = [];

async function get(url) {
  const response = await fetch(url, {
    headers: { accept: "text/html, application/xml, text/plain" },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  return { response, body: await response.text() };
}

function parseSitemap(xml, sitemapUrl, origin) {
  const document = new JSDOM(xml, { contentType: "application/xml" }).window.document;
  if (document.querySelector("parsererror")) {
    errors.push(`${sitemapUrl}: invalid XML`);
    return [];
  }
  const locations = [...document.querySelectorAll("url > loc")].map((node) => node.textContent?.trim() || "");
  if (!locations.length) errors.push(`${sitemapUrl}: no URL entries`);
  if (new Set(locations).size !== locations.length) errors.push(`${sitemapUrl}: duplicate URL entries`);
  return locations.filter((location) => {
    try {
      const url = new URL(location);
      if (url.origin !== origin || url.search || url.hash) {
        errors.push(`${sitemapUrl}: non-canonical or cross-host URL ${location}`);
        return false;
      }
      return true;
    } catch {
      errors.push(`${sitemapUrl}: invalid URL ${location}`);
      return false;
    }
  });
}

async function checkPage(location) {
  try {
    const { response, body } = await get(location);
    if (response.status !== 200) errors.push(`${location}: HTTP ${response.status}`);
    if (response.url !== location) errors.push(`${location}: redirects to ${response.url}`);
    if (!response.headers.get("content-type")?.includes("text/html")) {
      errors.push(`${location}: response is not HTML`);
      return;
    }
    if (/\bnoindex\b/i.test(response.headers.get("x-robots-tag") || "")) {
      errors.push(`${location}: HTTP X-Robots-Tag blocks indexing`);
    }
    const document = new JSDOM(body).window.document;
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
    const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
    if (canonical !== location) errors.push(`${location}: canonical is ${canonical || "missing"}`);
    if (/\bnoindex\b/i.test(robots)) errors.push(`${location}: HTML robots blocks indexing`);
    if (!document.title.trim()) errors.push(`${location}: missing title`);
    if (!document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim()) {
      errors.push(`${location}: missing description`);
    }
    if (document.querySelectorAll("h1").length !== 1) {
      errors.push(`${location}: expected one H1`);
    }
    if (pairsToVerify.length) {
      const pair = pairsToVerify.find(([ro, en]) => location === `https://avyron.ro${ro}` || location === `https://avyron.ro${en}`);
      if (pair) {
        const [ro, en] = pair;
        const expectedLang = location.endsWith(en) ? "en" : "ro";
        if (document.documentElement.lang !== expectedLang) errors.push(`${location}: HTML lang is ${document.documentElement.lang || "missing"}`);
        const alternates = new Map([...document.querySelectorAll('link[rel="alternate"][hreflang]')]
          .map((link) => [link.getAttribute("hreflang"), link.getAttribute("href")]));
        for (const [lang, href] of [["ro", ro], ["en", en], ["x-default", ro]]) {
          if (alternates.get(lang) !== `https://avyron.ro${href}`) errors.push(`${location}: incorrect ${lang} hreflang`);
        }
      }
    }
  } catch (error) {
    errors.push(`${location}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const urls = [];
const avyronSitemapUrls = new Set();
for (const site of sites) {
  const sitemapUrl = `${site.origin}${site.sitemap}`;
  try {
    const { response, body } = await get(sitemapUrl);
    if (response.status !== 200) errors.push(`${sitemapUrl}: HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.includes("xml")) errors.push(`${sitemapUrl}: not served as XML`);
    const sitemapUrls = parseSitemap(body, sitemapUrl, site.origin);
    urls.push(...sitemapUrls);
    if (site.origin === "https://avyron.ro") sitemapUrls.forEach((url) => avyronSitemapUrls.add(url));
    const robotsUrl = `${site.origin}/robots.txt`;
    const robots = await get(robotsUrl);
    if (robots.response.status !== 200) errors.push(`${robotsUrl}: HTTP ${robots.response.status}`);
    if (!robots.body.includes(`Sitemap: ${sitemapUrl}`)) errors.push(`${robotsUrl}: missing sitemap declaration`);
  } catch (error) {
    errors.push(`${sitemapUrl}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
for (const route of pairsToVerify.flat()) {
  const url = `https://avyron.ro${route}`;
  if (!avyronSitemapUrls.has(url)) errors.push(`${url}: required URL missing from live sitemap`);
}

// A public route reused on the application hostname must never become a
// competing indexable copy. Check the served HTTP policy, not client JS.
const appPaths = ["/en/library", "/auth", "/profil", "/produse"];
for (const path of appPaths) {
  const location = `https://app.avyron.ro${path}`;
  try {
    const { response } = await get(location);
    if (response.status !== 200) errors.push(`${location}: HTTP ${response.status}`);
    if (!/\bnoindex\b/i.test(response.headers.get("x-robots-tag") || "")) errors.push(`${location}: application hostname is missing HTTP noindex`);
    const cache = response.headers.get("cache-control") || "";
    if (!/\bprivate\b/.test(cache) || !/\bno-store\b/.test(cache)) errors.push(`${location}: application HTML must be private, no-store`);
  } catch (error) { errors.push(`${location}: ${error instanceof Error ? error.message : String(error)}`); }
}
try {
  const { response } = await get("https://api.avyron.ro/api/documents/context");
  if (response.status !== 401) errors.push("Private document context must reject anonymous access with HTTP 401");
  if (!/\bno-store\b/.test(response.headers.get("cache-control") || "")) errors.push("Private document context must not be cached");
} catch (error) { errors.push(`Private document access check: ${error instanceof Error ? error.message : String(error)}`); }

// Keep the live check polite and bounded; the same sitemap URL is never fetched twice.
const queue = [...new Set(urls)];
await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
  while (queue.length) {
    const location = queue.shift();
    if (location) await checkPage(location);
  }
}));

if (errors.length) {
  console.error(`Live SEO audit failed (${errors.length}):\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Live SEO audit passed: ${urls.length} public sitemap URLs, 2 robots.txt files, ${appPaths.length} application-host exclusions and anonymous document isolation.`);
}
