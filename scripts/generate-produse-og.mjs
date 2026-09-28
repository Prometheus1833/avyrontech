/** Generează imaginile sociale 1200×630 pentru fiecare produs, RO și EN. */
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public/og/produse");

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
const types = new Map(TYPES.map((type) => [type.id, type]));

const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const wrap = (value, limit, maxLines) => {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= limit || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const used = lines.join(" ").length;
  if (used < String(value).length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:!?]?$/, "")}…`;
  return lines;
};

const render = (item, lang) => {
  const title = wrap(item.name[lang], 32, 3);
  const description = wrap(item.short[lang], 70, 2);
  const type = types.get(item.type)?.plural?.[lang] ?? item.type;
  const access = item.access === "free" ? (lang === "ro" ? "GRATUIT" : "FREE") : item.access.toUpperCase();
  const titleY = title.length === 1 ? 284 : title.length === 2 ? 246 : 214;
  const descY = titleY + title.length * 72 + 32;
  const hue = Number(item.hue) || 264;

  return `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#07080d"/>
        <stop offset="0.58" stop-color="#11101c"/>
        <stop offset="1" stop-color="hsl(${hue} 42% 13%)"/>
      </linearGradient>
      <radialGradient id="glow" cx="78%" cy="18%" r="68%">
        <stop offset="0" stop-color="hsl(${hue} 92% 62%)" stop-opacity="0.46"/>
        <stop offset="0.5" stop-color="hsl(${(hue + 42) % 360} 88% 58%)" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#07080d" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="hsl(${hue} 95% 70%)"/>
        <stop offset="1" stop-color="hsl(${(hue + 48) % 360} 92% 68%)"/>
      </linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="55"/></filter>
    </defs>
    <rect width="1200" height="630" rx="34" fill="url(#bg)"/>
    <rect width="1200" height="630" rx="34" fill="url(#glow)"/>
    <circle cx="1040" cy="115" r="135" fill="hsl(${hue} 92% 60%)" fill-opacity="0.14" filter="url(#blur)"/>
    <path d="M70 558H1130" stroke="white" stroke-opacity="0.12"/>
    <path d="M70 72H1130" stroke="white" stroke-opacity="0.08"/>
    <circle cx="1070" cy="492" r="82" fill="none" stroke="url(#accent)" stroke-opacity="0.48" stroke-width="2"/>
    <circle cx="1070" cy="492" r="52" fill="none" stroke="white" stroke-opacity="0.13"/>
    <circle cx="1070" cy="492" r="8" fill="url(#accent)"/>

    <text x="72" y="126" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="8">AVYRON</text>
    <text x="72" y="164" fill="white" fill-opacity="0.54" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="600" letter-spacing="3">PRODUSE AVYRON · ${lang === "ro" ? "COD PENTRU PROIECTE REALE" : "CODE FOR REAL PROJECTS"}</text>

    <rect x="72" y="188" width="${Math.max(118, type.length * 11 + 38)}" height="42" rx="21" fill="white" fill-opacity="0.07" stroke="white" stroke-opacity="0.16"/>
    <text x="91" y="216" fill="white" fill-opacity="0.82" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700">${xml(type)}</text>
    <rect x="${Math.max(206, type.length * 11 + 82)}" y="188" width="112" height="42" rx="21" fill="hsl(${hue} 92% 60%)" fill-opacity="0.18" stroke="hsl(${hue} 92% 72%)" stroke-opacity="0.52"/>
    <text x="${Math.max(225, type.length * 11 + 101)}" y="216" fill="hsl(${hue} 96% 78%)" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="800" letter-spacing="1">${access}</text>

    ${title.map((line, index) => `<text x="72" y="${titleY + index * 72}" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="800" letter-spacing="-1.5">${xml(line)}</text>`).join("\n")}
    ${description.map((line, index) => `<text x="74" y="${descY + index * 31}" fill="white" fill-opacity="0.64" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="400">${xml(line)}</text>`).join("\n")}

    <rect x="72" y="584" width="210" height="4" rx="2" fill="url(#accent)"/>
    <text x="1130" y="594" text-anchor="end" fill="white" fill-opacity="0.52" font-family="Arial, Helvetica, sans-serif" font-size="17">avyron.ro</text>
  </svg>`;
};

await mkdir(output, { recursive: true });
let changed = 0;
for (const item of ITEMS) {
  for (const lang of ["ro", "en"]) {
    const suffix = lang === "en" ? "-en" : "";
    const target = join(output, `${item.slug}${suffix}.jpg`);
    const image = await sharp(Buffer.from(render(item, lang))).jpeg({ quality: 82, progressive: true, chromaSubsampling: "4:2:0" }).toBuffer();
    const current = await readFile(target).catch(() => null);
    if (current?.equals(image)) continue;
    await writeFile(target, image);
    changed += 1;
  }
}

console.log(`og Produse: ${ITEMS.length * 2} imagini verificate, ${changed} actualizate`);
