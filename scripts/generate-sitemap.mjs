import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = existsSync(join(root, "dist/client/index.html")) ? join(root, "dist/client") : join(root, "dist");
const base = "https://avyron.ro";

function routeFor(file) {
  const rel = relative(dist, file).replaceAll("\\", "/");
  if (rel === "index.html") return "/";
  return `/${rel.replace(/\/index\.html$/, "")}`;
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name === "index.html" ? [path] : [];
  });
}

function sourceFiles(route) {
  if (route === "/" || route === "/en") return ["src/pages/Index.tsx", "src/i18n/translations.ts"];
  if (route.includes("/blog")) return ["src/pages/Blog.tsx", "src/data/blogIndex.ts"];
  if (route.includes("/products/") || route.startsWith("/produse/")) return ["src/pages/products/ProductPage.tsx", "src/data/products.ts"];
  if (route.includes("pricing") || route === "/costurisiproduse") return ["src/pages/Pricing.tsx"];
  if (route.includes("about") || route === "/despre-si-portofoliu") return ["src/pages/About.tsx"];
  if (route === "/gdpr" || route === "/en/privacy") return ["src/pages/Gdpr.tsx", "src/config/company.ts"];
  if (route.includes("care-plans") || route === "/pachete-mentenanta") return ["src/pages/products/CarePlansPage.tsx"];
  return ["src/App.tsx"];
}

function lastModified(route) {
  const files = sourceFiles(route);
  try {
    const value = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...files], { cwd: root, encoding: "utf8" }).trim();
    if (value) return new Date(value);
  } catch {
    // Source archives without Git metadata use source mtimes.
  }
  const times = files.map((file) => join(root, file)).filter(existsSync).map((file) => statSync(file).mtimeMs);
  return new Date(Math.max(...times, 0));
}

const indexSource = readFileSync(join(root, "src/data/blogIndex.ts"), "utf8");
const articleDates = new Map();
for (const match of indexSource.matchAll(/slug:\s*"([^"]+)"[\s\S]*?updated_at:\s*"([^"]+)"/g)) {
  articleDates.set(match[1], new Date(match[2]));
}

const routes = htmlFiles(dist)
  .map(routeFor)
  .sort((a, b) => a.localeCompare(b));

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const body = routes.map((route) => {
  const slug = route.startsWith("/blog/")
    ? route.slice("/blog/".length)
    : route.startsWith("/en/blog/")
      ? route.slice("/en/blog/".length)
      : "";
  const date = articleDates.get(slug) || lastModified(route);
  return `  <url>\n    <loc>${esc(`${base}${route === "/" ? "" : route}`)}</loc>\n    <lastmod>${date.toISOString()}</lastmod>\n  </url>`;
}).join("\n");

writeFileSync(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
console.log(`sitemap: ${routes.length} indexable URLs written with route-specific lastmod values`);
