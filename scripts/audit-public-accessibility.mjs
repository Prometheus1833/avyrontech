/** Local, synthetic public-surface audit. Outbound APIs are stubbed: never tests
 * live customer data, sends forms, or invokes AI/payment providers. */
import { build } from "vite";
import { chromium, webkit } from "@playwright/test";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
};
const base = option("--base", "http://127.0.0.1:4187"),
  output = resolve(option("--output", "/tmp/avyron-public-accessibility.json"));
const url = new URL(base);
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
  url.protocol !== "http:"
)
  throw Error("Audit only permits an isolated localhost preview");
const engine = option("--engine", "chromium");
if (!["chromium", "webkit"].includes(engine)) throw Error("Invalid engine");
const width = Number(option("--width", "390"));
if (!Number.isInteger(width) || width < 320 || width > 1920)
  throw Error("Invalid viewport width");
const bundle = await build({
  configFile: false,
  logLevel: "silent",
  build: {
    ssr: "src/seo/publicRoutes.ts",
    write: false,
    rollupOptions: { output: { format: "es" } },
  },
});
const outputBundle = Array.isArray(bundle) ? bundle[0] : bundle;
const entry = outputBundle.output.find(
  (item) => item.type === "chunk" && item.isEntry,
);
const registry = await import(
  "data:text/javascript;base64," + Buffer.from(entry.code).toString("base64")
);
const requested = option("--paths", "").split(",").filter(Boolean);
const allRoutes = [...new Set(registry.PRERENDER_ROUTES)].filter(
  (p) => !registry.DELEGATED_PUBLIC_ROUTES[p],
);
if (requested.some((p) => !allRoutes.includes(p)))
  throw Error("Unknown public route");
const routes = requested.length
  ? allRoutes.filter((p) => requested.includes(p))
  : allRoutes;
const browser = await { chromium, webkit }[engine].launch();
const context = await browser.newContext({
  viewport: { width, height: 844 },
  reducedMotion: "reduce",
});
await context.addInitScript(() =>
  localStorage.setItem(
    "avyron-cookie-consent-v2",
    JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      savedAt: new Date().toISOString(),
      policyVersion: "2026-09-12",
    }),
  ),
);
await context.route("**/api/**", (route) => {
  const p = new URL(route.request().url()).pathname;
  return route.fulfill(
    p === "/api/auth/refresh"
      ? { status: 204 }
      : p === "/api/auth/me"
        ? { status: 401, json: { error: { code: "unauthenticated" } } }
        : {
            json: {
              data: [],
              services: [],
              products: [],
              subscriptions: [],
              total: 0,
            },
          },
  );
});
const require = createRequire(import.meta.url),
  rows = [];
let cursor = 0;
try {
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (cursor < routes.length) {
        const path = routes[cursor++],
          page = await context.newPage();
        try {
          const response = await page.goto(base + path, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await page.locator("h1").first().waitFor({ timeout: 12000 });
          await page.addScriptTag({
            path: require.resolve("axe-core/axe.min.js"),
          });
          const result = await page.evaluate(async () => {
            const a = await window.axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
              },
            });
            return {
              violations: a.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                tags: v.tags,
                nodes: v.nodes.map((n) => ({
                  target: n.target,
                  reason: n.failureSummary,
                })),
              })),
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
              h1: document.querySelectorAll("h1").length,
            };
          });
          rows.push({
            path,
            status:
              !response?.ok() || result.violations.length || result.overflow ? "FAIL" : "PASS",
            httpStatus: response?.status(),
            ...result,
          });
        } catch (e) {
          rows.push({ path, status: "NOT_VERIFIED", reason: e.name });
        } finally {
          await page.close();
        }
      }
    }),
  );
} finally {
  await browser.close();
}
rows.sort((a, b) => a.path.localeCompare(b.path));
const report = {
  format: "avyron-public-accessibility/v1",
  createdAt: new Date().toISOString(),
  engine,
  viewport: width,
  apiMode: "synthetic; no live CMS assurance",
  limitations: [
    "Automated checks only; manual screen reader and physical iOS/Android NOT_VERIFIED",
    "No claim of complete WCAG AA conformity",
    "Delegated-host routes excluded; verify separately",
  ],
  pages: rows,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(
  JSON.stringify({
    pages: rows.length,
    statuses: Object.fromEntries(
      ["PASS", "FAIL", "NOT_VERIFIED"].map((s) => [
        s,
        rows.filter((r) => r.status === s).length,
      ]),
    ),
    output,
  }),
);
if (rows.some((row) => row.status !== "PASS")) process.exitCode = 1;
