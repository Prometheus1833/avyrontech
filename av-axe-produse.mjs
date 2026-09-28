/**
 * Audit de accesibilitate + capturi pentru pagina Produse Avyron.
 * Rulare: node <cale>/axe-produse.mjs  (din rădăcina repo-ului, după build)
 */
import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const DIST = resolve("dist");
const AXE = resolve("node_modules/axe-core/axe.min.js");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://x");
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
  response.writeHead(404).end("x");
});

await new Promise((done) => server.listen(4191, done));
const axeSource = await readFile(AXE, "utf8");
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });

const shots = [
  ["produse-home", "/produse-avyron", { width: 1440, height: 900 }, 0],
  ["produse-catalog", "/produse-avyron", { width: 1440, height: 900 }, 2600],
  ["produse-colectii", "/produse-avyron/colectii", { width: 1440, height: 900 }, 0],
  ["produse-colectie", "/produse-avyron/colectii/unelte-de-livrare", { width: 1440, height: 900 }, 0],
  ["produse-lab", "/produse-avyron#particle-lab", { width: 1440, height: 900 }, 0],
  ["produse-parteneriate", "/produse-avyron#parteneriate", { width: 1440, height: 900 }, 0],
  ["produs-detaliu", "/produse-avyron/componente/stepper-proces", { width: 1440, height: 900 }, 0],
  ["produse-logo", "/produse-avyron/logo", { width: 1440, height: 900 }, 0],
  ["produse-mobil", "/produse-avyron", { width: 390, height: 844 }, 0],
  ["produse-magazin-ro", "/produse-avyron/colectii/magazin-romanesc", { width: 1440, height: 900 }, 0],
];

for (const [name, path, viewport, scrollTo] of shots) {
  const page = await browser.newPage({ viewport });
  await page.goto(`http://localhost:4191${path}`);
  await page.waitForTimeout(3400);
  if (scrollTo) {
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    for (let step = 0; step < Math.ceil(scrollTo / 400); step++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(140);
    }
    await page.waitForTimeout(1200);
  } else if (path.includes("#")) {
    await page.waitForTimeout(1600);
  }
  await page.screenshot({ path: `/mnt/user-data/outputs/${name}.png` });
  await page.close();
}

const audits = [
  "/produse-avyron",
  "/en/avyron-products",
  "/produse-avyron/colectii",
  "/produse-avyron/colectii/formulare-care-se-completeaza",
  "/produse-avyron/componente/tabel-date-sortabil",
  "/produse-avyron/logo",
  "/produse-avyron/intrebari-frecvente",
  "/produse-avyron/colectii/magazin-romanesc",
  "/produse-avyron/componente/program-cu-sarbatori",
  "/produse-avyron/sectiuni/formular-date-facturare",
  "/produse-avyron/unelte/calculator-tva",
];

let total = 0;
for (const path of audits) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://localhost:4191${path}`);
  await page.waitForTimeout(3400);
  await page.mouse.move(640, 450);
  for (let step = 0; step < 40; step++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const report = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    });
    return report.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      sample: violation.nodes[0]?.html?.slice(0, 140),
      help: violation.help,
    }));
  });
  total += result.length;
  console.log(`\n== ${path} — ${result.length} încălcări`);
  for (const violation of result) console.log(`  [${violation.impact}] ${violation.id} × ${violation.nodes} — ${violation.help}\n     ${violation.sample}`);
  await page.close();
}

console.log(`\nTOTAL axe: ${total}`);
await browser.close();
server.close();
