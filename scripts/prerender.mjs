/**
 * Build-time prerendering for AVYRON.
 *
 * Method: the real React app is executed once per public route inside a JSDOM
 * document seeded with the built `dist/index.html` template. Because the app's
 * own `setPageMeta` / `setJsonLd` effects run, the emitted HTML head is exactly
 * the head the SPA produces at runtime (no duplicated metadata source).
 * The resulting document (head + real DOM of the page, including the H1 and the
 * main content) is written as a static HTML file per route.
 *
 * The client bundle is untouched: on load React re-renders #root, so the app
 * stays fully interactive and every route/dashboard/auth flow keeps working.
 */

import { build } from "vite";
import react from "@vitejs/plugin-react-swc";
import { JSDOM } from "jsdom";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Static build -> dist/, Worker build (AVYRON_WORKER=1) -> dist/client/.
const distDir = existsSync(resolve(root, "dist/client/index.html"))
  ? resolve(root, "dist/client")
  : resolve(root, "dist");
const template = readFileSync(resolve(distDir, "index.html"), "utf8");

const outDir = resolve(root, "node_modules/.avyron-prerender");

// 1. Bundle the app for Node (single React instance, CJS deps interop handled
//    by rollup). Browser conditions so we get the same code the client runs.
await build({
  configFile: false,
  root,
  mode: "production",
  logLevel: "warn",
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(root, "src") },
    conditions: ["browser", "module", "import", "default"],
  },
  ssr: { noExternal: true, target: "webworker" },
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    ssr: resolve(root, "scripts/prerender-entry.tsx"),
    outDir,
    emptyOutDir: true,
    minify: false,
    target: "node20",
    rollupOptions: { output: { format: "es", entryFileNames: "entry.mjs" } },
  },
});

// ---------------------------------------------------------------- DOM setup
const dom = new JSDOM(template, {
  url: "https://avyron.ro/",
  pretendToBeVisual: true,
  runScripts: "outside-only",
});
const { window } = dom;

class ImmediateIntersectionObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe(el) {
    this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el }], this);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

window.IntersectionObserver = ImmediateIntersectionObserver;
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.matchMedia = (query) => ({
  // reduced motion -> reveal animations render in their final, visible state
  matches: /prefers-reduced-motion/.test(query),
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return false;
  },
});
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
// No network during prerender: auth/pricing calls resolve to an empty answer.
window.fetch = async () => new window.Response("{}", { status: 200 });

const globals = [
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "localStorage",
  "sessionStorage",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "CustomEvent",
  "MutationObserver",
  "IntersectionObserver",
  "ResizeObserver",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "matchMedia",
  "fetch",
  "DOMParser",
  "Image",
];
for (const key of globals) {
  try {
    Object.defineProperty(globalThis, key, {
      value: window[key],
      configurable: true,
      writable: true,
    });
  } catch {
    /* read-only global (e.g. navigator on newer Node) */
  }
}
globalThis.self = window;

const templateHead = window.document.head.innerHTML;
const templateBody = window.document.body.innerHTML;

// ------------------------------------------------------------- render loop
const { mount, PRERENDER_ROUTES, STATUS_PAGES } = await import(
  pathToFileURL(resolve(outDir, "entry.mjs")).href
);

const tick = (ms) => new Promise((r) => setTimeout(r, ms));

async function renderRoute(route) {
  const doc = window.document;
  doc.head.innerHTML = templateHead;
  doc.body.innerHTML = templateBody;
  window.history.pushState({}, "", route);

  const container = doc.getElementById("root");
  const rootInstance = mount(container);

  // Wait for lazy chunks + head effects to settle.
  for (let i = 0; i < 60; i++) {
    await tick(25);
    const hasH1 = !!container.querySelector("h1");
    const hasLd = !!doc.getElementById("ld-graph");
    const hasCanonical = !!doc.querySelector('link[rel="canonical"]');
    if (hasH1 && hasCanonical && (hasLd || i > 20)) break;
  }
  await tick(120);

  const html = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}\n`;
  rootInstance.unmount();
  return html;
}

function outFile(route) {
  if (route === "/") return resolve(distDir, "index.html");
  return resolve(distDir, `.${route}/index.html`);
}

function write(file, html) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html, "utf8");
}

// The untouched SPA shell, served by the Worker for private/auth routes.
write(resolve(distDir, "_shell.html"), template);

const report = [];
for (const route of PRERENDER_ROUTES) {
  const html = await renderRoute(route);
  if (!/<h1/i.test(html)) {
    throw new Error(`Prerender failed for ${route}: no <h1> in output`);
  }
  write(outFile(route), html);
  report.push(route);
}

for (const page of STATUS_PAGES) {
  const html = await renderRoute(page.route);
  write(resolve(distDir, page.file), html);
  report.push(`${page.route} -> ${page.file} (${page.status})`);
}

console.log(`prerender: ${report.length} documents written`);
for (const r of report) console.log(`  ${r}`);
process.exit(0);
