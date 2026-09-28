/**
 * Probă de browser real pentru pagina Produse Avyron.
 *
 * Servește build-ul static (cu ruta activată) și verifică, pentru fiecare
 * combinație din matrice: erori de consolă, cereri eșuate, depășire pe
 * orizontală, prezența titlului și a conținutului, demo-urile care pornesc,
 * fundalul fără WebGL și comportamentul pe „mișcare redusă".
 *
 * Rulare: node av-probe-produse.mjs  (necesită un build cu VITE_PRODUSE_LIVE=1)
 */

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const DIST = resolve("dist");
const PORT = 4183;

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
  const candidates = [join(DIST, url.pathname), join(DIST, url.pathname, "index.html"), join(DIST, "index.html")];
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (!info.isFile()) continue;
      const body = await readFile(candidate);
      response.writeHead(200, { "content-type": TYPES[extname(candidate)] ?? "application/octet-stream" });
      response.end(body);
      return;
    } catch {
      /* încercăm următorul candidat */
    }
  }
  response.writeHead(404).end("not found");
});

await new Promise((done) => server.listen(PORT, done));
const base = `http://localhost:${PORT}`;

const MATRIX = [
  { name: "desktop RO", path: "/produse-avyron", viewport: { width: 1440, height: 900 } },
  { name: "desktop EN", path: "/en/avyron-products", viewport: { width: 1440, height: 900 } },
  { name: "produs RO", path: "/produse-avyron/componente/buton-unda-refractie", viewport: { width: 1440, height: 900 } },
  { name: "produs EN", path: "/en/avyron-products/components/notificari-6-tipuri", viewport: { width: 1280, height: 800 } },
  { name: "efecte 3D", path: "/produse-avyron/efecte-3d", viewport: { width: 1440, height: 900 } },
  { name: "logo", path: "/produse-avyron/logo", viewport: { width: 1440, height: 900 } },
  { name: "colectii", path: "/produse-avyron/colectii", viewport: { width: 1440, height: 900 } },
  { name: "colectie RO", path: "/produse-avyron/colectii/kit-landing-page", viewport: { width: 1440, height: 900 } },
  { name: "colectie EN", path: "/en/avyron-products/collections/delivery-tools", viewport: { width: 1280, height: 800 } },
  { name: "ghid", path: "/produse-avyron/ghid", viewport: { width: 1024, height: 768 } },
  { name: "faq", path: "/produse-avyron/intrebari-frecvente", viewport: { width: 1024, height: 768 } },
  { name: "mobil Android 360", path: "/produse-avyron", viewport: { width: 360, height: 780 }, mobile: true },
  { name: "mobil iPhone", path: "/produse-avyron/componente/panou-liquid-glass", viewport: { width: 390, height: 844 }, mobile: true },
  { name: "mișcare redusă", path: "/produse-avyron", viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" },
  { name: "fără WebGL", path: "/produse-avyron", viewport: { width: 1280, height: 800 }, noWebgl: true },
  { name: "404 produs", path: "/produse-avyron/componente/nu-exista", viewport: { width: 1280, height: 800 } },
];

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const results = [];

for (const entry of MATRIX) {
  const context = await browser.newContext({
    viewport: entry.viewport,
    deviceScaleFactor: 1,
    isMobile: Boolean(entry.mobile),
    hasTouch: Boolean(entry.mobile),
    reducedMotion: entry.reducedMotion ?? "no-preference",
  });
  const page = await context.newPage();
  if (entry.noWebgl) {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patched(kind, ...rest) {
        if (String(kind).startsWith("webgl")) return null;
        return original.call(this, kind, ...rest);
      };
    });
  }

  const errors = [];
  const failed = [];
  const external = (text) => /api\.avyron\.ro|restcountries|open-meteo|frankfurter|challenges\.cloudflare|turnstile/i.test(text);
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Apelurile spre servicii externe sunt blocate de proxy-ul sandboxului.
    if (external(text) || /ERR_TUNNEL_CONNECTION_FAILED|Failed to load resource/.test(text)) return;
    errors.push(text.slice(0, 200));
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${String(error.message).slice(0, 200)}`));
  page.on("requestfailed", (request) => {
    if (external(request.url())) return;
    failed.push(`${request.method()} ${request.url().slice(0, 120)}`);
  });

  await page.goto(`${base}${entry.path}`, { waitUntil: "domcontentloaded" });
  // Preloaderul are maximum ~2,4 s; îi lăsăm timp, apoi derulăm toată pagina.
  // Înălțimea crește pe măsură ce secțiunile se montează, deci o recitim.
  await page.waitForTimeout(3000);
  // Derulăm cu rotița reală: Lenis interceptează scrollTo, dar nu evenimentele
  // de input, deci așa reproducem ce face un utilizator.
  await page.mouse.move(entry.viewport.width / 2, entry.viewport.height / 2);
  for (let step = 0; step < 120; step++) {
    await page.mouse.wheel(0, Math.round(entry.viewport.height * 0.6));
    await page.waitForTimeout(160);
    const atBottom = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4);
    if (atBottom) break;
  }
  await page.waitForTimeout(1200);

  const facts = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const h1 = document.querySelector("h1");
    const smallTargets = Array.from(document.querySelectorAll("a[href], button")).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.height < 24 || rect.width < 24);
    }).length;
    return {
      overflow,
      h1: h1 ? h1.textContent.trim().slice(0, 60) : null,
      title: document.title,
      robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
      canvases: document.querySelectorAll("canvas").length,
      cards: document.querySelectorAll('[class*="pa-edge"], article').length,
      revealed: document.querySelectorAll('.pa-reveal[data-in="1"]').length,
      hidden: document.querySelectorAll('.pa-reveal:not([data-in="1"])').length,
      textLength: document.body.innerText.length,
      smallTargets,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });

  results.push({ name: entry.name, path: entry.path, errors, failed, ...facts });
  await context.close();
}

await browser.close();
server.close();

let bad = 0;
for (const row of results) {
  const problems = [];
  if (row.errors.length) problems.push(`consolă: ${row.errors.length} (${row.errors[0]})`);
  if (row.failed.length) problems.push(`cereri eșuate: ${row.failed.length} (${row.failed[0]})`);
  if (row.overflow > 2) problems.push(`depășire orizontală ${row.overflow}px`);
  if (!row.h1) problems.push("fără h1");
  const minText = row.path.includes("nu-exista") ? 300 : 900;
  if (row.textLength < minText) problems.push(`prea puțin text (${row.textLength})`);
  if (row.hidden > 0 && !row.path.includes("nu-exista")) problems.push(`elemente rămase ascunse: ${row.hidden}`);
  if (problems.length) bad++;
  console.log(
    `${problems.length ? "✗" : "✓"} ${row.name.padEnd(20)} h1=${String(row.h1).slice(0, 26).padEnd(28)} canvas=${String(row.canvases).padEnd(3)} text=${String(row.textLength).padEnd(6)} reveal=${row.revealed}/${row.revealed + row.hidden} ${problems.join(" · ")}`,
  );
}
console.log(bad === 0 ? "\nTOATE OK" : `\n${bad} combinații cu probleme`);
process.exit(bad === 0 ? 0 : 1);
