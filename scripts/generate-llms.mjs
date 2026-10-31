import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = existsSync(join(root, "dist/client/index.html")) ? join(root, "dist/client") : join(root, "dist");
const origin = "https://avyron.ro";
const sitemapFile = join(dist, "sitemap.xml");
if (!existsSync(sitemapFile)) throw new Error("llms.txt: generate sitemap.xml first");

const sitemap = new JSDOM(readFileSync(sitemapFile, "utf8"), { contentType: "application/xml" }).window.document;
if (sitemap.querySelector("parsererror")) throw new Error("llms.txt: invalid sitemap.xml");

const sections = new Map([
  ["Pagini principale / Main pages", []],
  ["Servicii / Services", []],
  ["Produse / Products", []],
  ["Articole / Articles", []],
  ["Alte pagini publice / Other public pages", []],
]);

function sectionFor(path) {
  if (/^\/(?:servicii|en\/services)(?:\/|$)/.test(path)) return "Servicii / Services";
  if (/^\/(?:en\/)?products(?:\/|$)/.test(path) || /^\/produse(?:\/|$)/.test(path) || /^\/(?:it\/prodotti|hu\/termekek|de\/produkte|fr\/produits|pl\/produkty)$/.test(path)) return "Produse / Products";
  if (/^\/(?:en\/)?blog\//.test(path)) return "Articole / Articles";
  if (["/", "/en", "/despre-noi", "/en/about", "/blog", "/en/blog", "/biblioteca", "/en/library"].includes(path)) return "Pagini principale / Main pages";
  return "Alte pagini publice / Other public pages";
}

function clean(value) {
  return value.replace(/\s+/g, " ").replace(/[\[\]]/g, "").trim();
}

for (const node of sitemap.querySelectorAll("url")) {
  const loc = [...node.children].find((child) => child.localName === "loc")?.textContent?.trim();
  if (!loc) continue;
  const url = new URL(loc);
  if (url.origin !== origin || url.search || url.hash) throw new Error(`llms.txt: non-canonical URL ${loc}`);
  const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  const file = path === "/" ? join(dist, "index.html") : join(dist, path.slice(1), "index.html");
  if (!existsSync(file)) throw new Error(`llms.txt: missing prerendered page ${path}`);
  const page = new JSDOM(readFileSync(file, "utf8")).window.document;
  const canonical = page.querySelector('link[rel="canonical"]')?.getAttribute("href");
  const robots = page.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
  if (canonical !== loc || /\bnoindex\b/i.test(robots)) throw new Error(`llms.txt: ${path} is not canonical and indexable`);
  // Prerendered H1s often split a headline across spans without text nodes
  // between them; the document title is the stable, readable page label.
  const title = clean(page.title || "");
  const description = clean(page.querySelector('meta[name="description"]')?.getAttribute("content") || "");
  if (!title || !description) throw new Error(`llms.txt: missing title or description at ${path}`);
  sections.get(sectionFor(path)).push(`- [${title}](${loc}): ${description}`);
}

const home = new JSDOM(readFileSync(join(dist, "index.html"), "utf8")).window.document;
const summary = clean(home.querySelector('meta[name="description"]')?.getAttribute("content") || "");
const output = [
  "# AVYRON",
  "",
  `> ${summary}`,
  "",
  "Pagini canonice publice, generate din sitemap și HTML-ul prerandat la fiecare build. Prețurile, disponibilitatea și condițiile sunt cele afișate pe paginile de destinație.",
  "",
  ...[...sections].flatMap(([heading, entries]) => entries.length ? [`## ${heading}`, "", ...entries, ""] : []),
  "## Instrumente publice / Public tools",
  "",
  "- [Verificare disponibilitate domeniu](https://avyron.ro/#verificare-domeniu): Instrument public de verificare a numelor de domeniu.",
  "- [AVYRON Smart Surveys](https://surveys.avyron.ro/): Briefuri publice pentru proiecte digitale; răspunsurile individuale sunt private.",
  "",
].join("\n");
writeFileSync(join(dist, "llms.txt"), output);
console.log(`llms.txt: ${[...sections.values()].reduce((count, entries) => count + entries.length, 0)} canonical pages generated`);
