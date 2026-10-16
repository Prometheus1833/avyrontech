/**
 * Read-only production crawlability check for every URL in the public sitemaps.
 * This validates served HTTP/HTML, not Google indexing or traffic.
 */
import { JSDOM } from "jsdom";

const sites = [
  { origin: "https://avyron.ro", sitemap: "/sitemap.xml" },
  { origin: "https://surveys.avyron.ro", sitemap: "/sitemap.xml" },
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
  } catch (error) {
    errors.push(`${location}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const urls = [];
for (const site of sites) {
  const sitemapUrl = `${site.origin}${site.sitemap}`;
  try {
    const { response, body } = await get(sitemapUrl);
    if (response.status !== 200) errors.push(`${sitemapUrl}: HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.includes("xml")) errors.push(`${sitemapUrl}: not served as XML`);
    urls.push(...parseSitemap(body, sitemapUrl, site.origin));
    const robotsUrl = `${site.origin}/robots.txt`;
    const robots = await get(robotsUrl);
    if (robots.response.status !== 200) errors.push(`${robotsUrl}: HTTP ${robots.response.status}`);
    if (!robots.body.includes(`Sitemap: ${sitemapUrl}`)) errors.push(`${robotsUrl}: missing sitemap declaration`);
  } catch (error) {
    errors.push(`${sitemapUrl}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
  console.log(`Live SEO audit passed: ${urls.length} public sitemap URLs, 2 robots.txt files.`);
}
