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
  if (route === "/servicii/creare-logo-3d-dinamic-cinematic/creeaza" || route === "/en/services/cinematic-dynamic-3d-logo-design/create") return ["src/pages/services/LogoStudioPage.tsx", "src/data/logoStudioCopy.ts", "src/data/logoStudio.ts"];
  if (route === "/servicii/creare-logo-3d-dinamic-cinematic" || route === "/en/services/cinematic-dynamic-3d-logo-design") return ["src/pages/services/LogoDinamic3DPage.tsx", "src/data/logo3d.ts"];
  if (route === "/servicii/qa-testing-web-mobile" || route === "/en/services/web-mobile-qa-testing") return ["src/pages/services/QaTestingPage.tsx"];
  if (route === "/biblioteca" || route === "/en/library") return ["src/pages/Biblioteca.tsx", "src/data/bibliotecaCatalog.ts"];
  if (route.startsWith("/produse") || route.startsWith("/en/products"))
    return ["src/features/produse/data/items.ts", "src/features/produse/ProduseApp.tsx"];
  if (/^\/(it\/prodotti|hu\/termekek|de\/produkte|fr\/produits|pl\/produkty)$/.test(route))
    return ["src/features/produse/data/internationalCopy.ts", "src/features/produse/pages/InternationalHome.tsx"];
  if (route.startsWith("/servicii/") || route.startsWith("/en/services/")) return ["src/pages/services/ServicePage.tsx", "src/data/services.ts"];
  if (route === "/servicii" || route === "/en/services") return ["src/pages/Services.tsx"];
  if (route === "/despre-noi" || route === "/en/about") return ["src/pages/AboutUs.tsx"];
  if (route === "/gdpr" || route === "/en/privacy") return ["src/pages/Gdpr.tsx", "src/config/company.ts"];
  if (route === "/termeni" || route === "/en/terms") return ["src/pages/Terms.tsx", "src/config/company.ts"];
  if (route === "/politica-cookies" || route === "/en/cookie-policy") return ["src/pages/CookiePolicy.tsx", "src/lib/cookieConsent.ts", "src/config/company.ts"];
  if (route.includes("maintenance-and-partnerships") || route === "/mentenanta-si-colaborari") return ["src/pages/MaintenancePartnerships.tsx", "src/data/subscriptionPlans.ts"];
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

function pageMetadata(route) {
  const file = route === "/" ? join(dist, "index.html") : join(dist, route.slice(1), "index.html");
  const html = readFileSync(file, "utf8");
  const alternates = [...html.matchAll(/<link\b[^>]*\brel="alternate"[^>]*\bhreflang="([^"]+)"[^>]*\bhref="([^"]+)"[^>]*>/g)]
    .map((match) => ({ language: match[1], href: match[2] }))
    .filter(({ href }) => href.startsWith(`${base}/`) || href === `${base}/`);
  const image = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"[^>]*>/)?.[1] || null;
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"[^>]*>/i)?.[1] || "";
  const canonical = html.match(/<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"[^>]*>/i)?.[1] || null;
  return { alternates, image, noindex: /(?:^|[\s,])noindex(?:$|[\s,])/i.test(robots), canonical };
}

const indexableRoutes = routes.filter((route) => {
  const metadata = pageMetadata(route);
  if (metadata.noindex) return false;
  const expectedCanonical = `${base}${route === "/" ? "/" : route}`;
  if (metadata.canonical !== expectedCanonical) {
    throw new Error(`sitemap: canonical mismatch for ${route}: ${metadata.canonical || "missing"}`);
  }
  return true;
});

const body = indexableRoutes.map((route) => {
  const slug = route.startsWith("/blog/")
    ? route.slice("/blog/".length)
    : route.startsWith("/en/blog/")
      ? route.slice("/en/blog/".length)
      : "";
  const date = articleDates.get(slug) || lastModified(route);
  const { alternates, image } = pageMetadata(route);
  const alternateXml = alternates
    .map(({ language, href }) => `    <xhtml:link rel="alternate" hreflang="${esc(language)}" href="${esc(href)}" />`)
    .join("\n");
  const imageXml = image && image !== `${base}/og/home.jpg`
    ? `    <image:image>\n      <image:loc>${esc(image)}</image:loc>\n    </image:image>`
    : "";
  return [
    "  <url>",
    `    <loc>${esc(`${base}${route === "/" ? "/" : route}`)}</loc>`,
    `    <lastmod>${date.toISOString()}</lastmod>`,
    alternateXml,
    imageXml,
    "  </url>",
  ].filter(Boolean).join("\n");
}).join("\n");

writeFileSync(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`);
console.log(`sitemap: ${indexableRoutes.length} indexable URLs written with route-specific lastmod values`);
