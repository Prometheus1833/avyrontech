/**
 * Publică registrul public al produselor gratuite și `llms.txt`.
 *
 * Registrul e în formatul shadcn, deci comanda din pagină funcționează
 * întocmai:  npx shadcn@latest add https://avyron.ro/r/<slug>.json
 *
 * Reguli:
 *  - intră DOAR produsele gratuite care au fișier sursă public; codul plătit
 *    nu ajunge niciodată aici (se servește din R2, după verificarea dreptului);
 *  - se scrie numai când pagina e publicată (VITE_PRODUSE_LIVE=1), ca până la
 *    lansare producția să rămână neatinsă;
 *  - fișierele se scriu în `dist/r/`, lângă restul site-ului.
 *
 * Rulare: node scripts/produse-registry.mjs  (după `vite build`)
 */

import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = existsSync(join(root, "dist/client/index.html")) ? join(root, "dist/client") : join(root, "dist");
const BASE = "https://avyron.ro";

if (process.env.VITE_PRODUSE_LIVE !== "1") {
  console.log("registru Produse: sărit (pagina nu e publicată)");
  process.exit(0);
}

const bundle = await build({
  entryPoints: [join(root, "scripts/produse-catalog-entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  logLevel: "silent",
});
const { ITEMS, TYPES } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

/** slug → fișierul sursă, citit din `lib/source.ts` ca să existe o singură listă. */
const sourceMap = (() => {
  const file = readFileSync(join(root, "src/features/produse/lib/source.ts"), "utf8");
  const block = file.slice(file.indexOf("SOURCE_FILE: Record<string, string> = {"), file.indexOf("\n};"));
  return Object.fromEntries([...block.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((match) => [match[1], match[2]]));
})();

const REGISTRY_TYPE = { component: "registry:component", section: "registry:block", template: "registry:block", effect: "registry:component", tool: "registry:component", api: "registry:lib", doc: "registry:file", logo: "registry:component" };

const segmentFor = (type) => TYPES.find((entry) => entry.id === type)?.seg.ro ?? "componente";

mkdirSync(join(dist, "r"), { recursive: true });

const published = [];
for (const item of ITEMS) {
  const file = sourceMap[item.slug];
  if (!file || item.access !== "free") continue;
  const content = readFileSync(join(root, "src/features/produse/source", file), "utf8");
  const entry = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: item.slug,
    type: REGISTRY_TYPE[item.type] ?? "registry:component",
    title: item.name.en,
    description: item.short.en,
    author: "Avyron (https://avyron.ro)",
    dependencies: item.deps ?? [],
    files: [{ path: `components/avyron/${file}`, type: REGISTRY_TYPE[item.type] ?? "registry:component", content }],
    meta: {
      docs: `${BASE}/produse-avyron/${segmentFor(item.type)}/${item.slug}`,
      licence: "Utilizare nelimitată în proiecte proprii și ale clienților.",
      weightKb: item.weightKb,
    },
  };
  writeFileSync(join(dist, "r", `${item.slug}.json`), `${JSON.stringify(entry, null, 2)}\n`);
  published.push(item);
}

writeFileSync(
  join(dist, "r", "index.json"),
  `${JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "avyron",
      homepage: `${BASE}/produse-avyron`,
      items: published.map((item) => ({ name: item.slug, type: REGISTRY_TYPE[item.type] ?? "registry:component", title: item.name.en, description: item.short.en })),
    },
    null,
    2,
  )}\n`,
);

// llms.txt — cum descoperă asistenții AI catalogul, fără să ghicească din HTML.
const byType = new Map();
for (const item of ITEMS) {
  if (!byType.has(item.type)) byType.set(item.type, []);
  byType.get(item.type).push(item);
}
const lines = [
  "# Produse Avyron (Avyron Products)",
  "",
  "> Componente, secțiuni, template-uri, efecte 3D, unelte și integrări API pentru site-uri, de la agenția Avyron (avyron.ro). Produsele gratuite au cod public; cele din parteneriate se obțin cu un cont AVY.",
  "",
  `Catalog: ${ITEMS.length} produse, dintre care ${ITEMS.filter((item) => item.access === "free").length} gratuite.`,
  `Registru pentru CLI: ${BASE}/r/index.json — instalare: npx shadcn@latest add ${BASE}/r/<slug>.json`,
  "",
];
for (const type of TYPES) {
  const items = byType.get(type.id);
  if (!items?.length) continue;
  lines.push(`## ${type.plural.ro} (${type.plural.en})`, "");
  for (const item of items) {
    lines.push(`- [${item.name.ro}](${BASE}/produse-avyron/${type.seg.ro}/${item.slug}): ${item.short.ro}`);
  }
  lines.push("");
}
lines.push("## Documentație", "", `- [Ghid de instalare](${BASE}/produse-avyron/ghid)`, `- [Întrebări frecvente](${BASE}/produse-avyron/intrebari-frecvente)`, `- [Parteneriate AVY](${BASE}/produse-avyron#parteneriate)`, "");
writeFileSync(join(dist, "llms.txt"), lines.join("\n"));

console.log(`registru Produse: ${published.length} produse publicate în /r, plus llms.txt`);
