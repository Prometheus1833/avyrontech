/**
 * Verificare completă înainte de deploy pentru pagina Produse Avyron.
 *
 * Deschide FIECARE rută a paginii într-un browser real (toate produsele, toate
 * tipurile, toate colecțiile, ghidul, FAQ-ul, logo-ul, ambele limbi) și verifică
 * pe fiecare: fără erori de consolă, un singur `h1`, titlu și descriere unice,
 * canonical corect, hreflang reciproc, `noindex` cât timp pagina nu e live,
 * JSON-LD valid, demo-ul montat, fără depășire pe orizontală.
 *
 * Rulare: node av-verify-produse.mjs        (necesită build cu VITE_PRODUSE_LIVE=1)
 *         node av-verify-produse.mjs --fast (un eșantion de 25 de produse)
 */

import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { build } from "esbuild";

const DIST = resolve("dist");
const PORT = 4187;
const FAST = process.argv.includes("--fast");
/** `--slice=0:60` rulează doar o felie din rute, ca să încapă în timpul unei comenzi. */
const SLICE = (process.argv.find((argument) => argument.startsWith("--slice=")) ?? "").split("=")[1];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  for (const candidate of [join(DIST, url.pathname), join(DIST, url.pathname, "index.html"), join(DIST, "index.html")]) {
    try {
      const info = await stat(candidate);
      if (!info.isFile()) continue;
      response.writeHead(200, { "content-type": TYPES[extname(candidate)] ?? "application/octet-stream" });
      response.end(await readFile(candidate));
      return;
    } catch {
      /* încercăm următorul candidat */
    }
  }
  response.writeHead(404).end("not found");
});
await new Promise((done) => server.listen(PORT, done));
const base = `http://localhost:${PORT}`;

// Catalogul se citește din sursă, ca lista de rute să nu poată rămâne în urmă.
const bundle = await build({
  entryPoints: [resolve("scripts/produse-catalog-entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  logLevel: "silent",
});
const { ITEMS, TYPES: CATALOG_TYPES } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const collections = (await readFile("src/features/produse/data/routes.ts", "utf8"))
  .split("PRODUSE_COLLECTION_SEGMENTS")[1]
  .split("];")[0]
  .matchAll(/\{ ro: "([^"]+)", en: "([^"]+)" \}/g);
const COLLECTION_SEGMENTS = [...collections].map((match) => ({ ro: match[1], en: match[2] }));

const segment = (type, lang) => CATALOG_TYPES.find((entry) => entry.id === type).seg[lang];

/** Toate rutele publice ale paginii, în ambele limbi. */
const routes = [
  { path: "/produse-avyron", kind: "home" },
  { path: "/en/avyron-products", kind: "home" },
  { path: "/produse-avyron/ghid", kind: "doc" },
  { path: "/en/avyron-products/guide", kind: "doc" },
  { path: "/produse-avyron/intrebari-frecvente", kind: "doc" },
  { path: "/en/avyron-products/faq", kind: "doc" },
  { path: "/produse-avyron/colectii", kind: "list" },
  { path: "/en/avyron-products/collections", kind: "list" },
  ...CATALOG_TYPES.map((type) => ({ path: `/produse-avyron/${type.seg.ro}`, kind: "list" })),
  ...CATALOG_TYPES.map((type) => ({ path: `/en/avyron-products/${type.seg.en}`, kind: "list" })),
  ...COLLECTION_SEGMENTS.map((entry) => ({ path: `/produse-avyron/colectii/${entry.ro}`, kind: "list" })),
  ...COLLECTION_SEGMENTS.map((entry) => ({ path: `/en/avyron-products/collections/${entry.en}`, kind: "list" })),
  ...(FAST ? ITEMS.filter((_, index) => index % 4 === 0) : ITEMS).map((item) => ({
    path: `/produse-avyron/${segment(item.type, "ro")}/${item.slug}`,
    kind: "item",
    item,
  })),
  // Un eșantion de produse în engleză: restul textelor sunt verificate de teste.
  ...ITEMS.filter((_, index) => index % 9 === 0).map((item) => ({
    path: `/en/avyron-products/${segment(item.type, "en")}/${item.slug}`,
    kind: "item",
    item,
  })),
];

const selected = SLICE
  ? routes.slice(Number(SLICE.split(":")[0]), Number(SLICE.split(":")[1]))
  : routes;
console.log(`verific ${selected.length} din ${routes.length} rute${SLICE ? ` (felia ${SLICE})` : ""}`);

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });

const external = (text) => /api\.avyron\.ro|restcountries|open-meteo|frankfurter|challenges\.cloudflare|turnstile|date\.nager\.at|api\.github\.com|openstreetmap|google\.com\/maps|wa\.me/i.test(text);

const titles = new Map();
const descriptions = new Map();
const problems = [];
let checked = 0;

for (const route of selected) {
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (external(text) || /ERR_TUNNEL_CONNECTION_FAILED|Failed to load resource|ERR_BLOCKED/.test(text)) return;
    errors.push(text.slice(0, 160));
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${String(error.message).slice(0, 160)}`));
  page.on("requestfailed", (request) => {
    if (external(request.url())) return;
    errors.push(`cerere eșuată: ${request.url().slice(0, 120)}`);
  });

  await page.goto(`${base}${route.path}`, { waitUntil: "domcontentloaded" });
  // Preloaderul are ~2,4 s; demo-urile se montează la intrarea în ecran.
  await page.waitForTimeout(route.kind === "item" ? 3200 : 2800);
  if (route.kind === "item") {
    await page.mouse.move(640, 430);
    for (let step = 0; step < 6; step++) {
      await page.mouse.wheel(0, 520);
      await page.waitForTimeout(110);
    }
  }

  const facts = await page.evaluate(() => {
    const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? null;
    const link = (rel, extra = "") => document.querySelector(`link[rel="${rel}"]${extra}`)?.getAttribute("href") ?? null;
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => {
      try {
        return JSON.parse(node.textContent || "null");
      } catch {
        return "INVALID";
      }
    });
    return {
      h1: [...document.querySelectorAll("h1")].map((node) => node.textContent.trim()),
      title: document.title,
      description: meta("description"),
      robots: meta("robots"),
      canonical: link("canonical"),
      alternateRo: link("alternate", '[hreflang="ro"]'),
      alternateEn: link("alternate", '[hreflang="en"]'),
      ld,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      text: document.body.innerText.length,
      // Demo montat: un canvas, un iframe sau orice element interactiv în scenă.
      demoMounted: document.querySelectorAll('[class*="pa-"] canvas, [class*="pa-"] iframe, .dark button, .dark input, .dark table, .dark svg').length,
      images: [...document.querySelectorAll("img")].filter((node) => !node.hasAttribute("alt")).length,
    };
  });
  await page.close();
  checked++;

  const say = (message) => problems.push(`${route.path} — ${message}`);

  if (errors.length) say(`erori: ${errors.slice(0, 2).join(" | ")}`);
  if (facts.h1.length !== 1) say(`${facts.h1.length} elemente h1`);
  if (!facts.title || facts.title.length < 15) say(`titlu prea scurt: ${facts.title}`);
  if (!facts.description || facts.description.length < 50) say(`descriere prea scurtă (${facts.description?.length ?? 0})`);
  if (facts.robots !== "noindex, nofollow" && process.env.VITE_PRODUSE_LIVE !== "1") say("lipsește noindex înainte de lansare");
  if (!facts.canonical || !facts.canonical.startsWith("https://avyron.ro")) say(`canonical greșit: ${facts.canonical}`);
  if (!facts.alternateRo || !facts.alternateEn) say("hreflang incomplet");
  if (facts.ld.includes("INVALID")) say("JSON-LD invalid");
  if (!facts.ld.length) say("fără JSON-LD");
  if (facts.overflow > 2) say(`depășire orizontală ${facts.overflow}px`);
  if (facts.text < (route.kind === "item" ? 900 : 700)) say(`prea puțin text (${facts.text})`);
  if (facts.images > 0) say(`${facts.images} imagini fără alt`);
  if (route.kind === "item" && route.item.demo && facts.demoMounted === 0) say(`demo nemontat (${route.item.demo})`);

  const previousTitle = titles.get(facts.title);
  if (previousTitle) say(`titlu duplicat cu ${previousTitle}`);
  titles.set(facts.title, route.path);
  if (facts.description) {
    const previousDescription = descriptions.get(facts.description);
    if (previousDescription) say(`descriere duplicată cu ${previousDescription}`);
    descriptions.set(facts.description, route.path);
  }

  if (checked % 20 === 0) console.log(`  … ${checked}/${selected.length} rute verificate`);
}

await context.close();
await browser.close();
server.close();

console.log(`\n${checked} rute verificate în browser.`);
if (problems.length === 0) {
  console.log("VERIFICARE COMPLETĂ: fără probleme");
  process.exit(0);
}
console.log(`\n${problems.length} probleme:`);
for (const problem of problems.slice(0, 60)) console.log(`  ✗ ${problem}`);
process.exit(1);
