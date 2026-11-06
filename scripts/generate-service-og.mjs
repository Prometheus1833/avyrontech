/** Deterministic public artwork; no private data, network, AI or paid render service. */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import opentype from "opentype.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public/og/servicii");
// Reuse licensed, bundled fonts and convert glyphs to paths: CI and local builds
// must not depend on an operating system's Arial/DejaVu installation.
const fonts = await Promise.all(["outfit-latin-700-normal", "outfit-latin-ext-700-normal"].map(async name => {
  const b = await readFile(join(root, `public/fonts/logo-studio/${name}.woff`));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}));
function outlineText(svg) {
  return svg.replace(/<text([^>]*)>([^<]*)<\/text>/g, (_, attributes, content) => {
    const attr = key => attributes.match(new RegExp(`(?:^|\\s)${key}="([^"]*)"`))?.[1];
    const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"' };
    const text = content.replace(/&(?:amp|lt|gt|quot);/g, entity => entities[entity]);
    const size = Number(attr("font-size"));
    const tracking = Number(attr("letter-spacing") || 0);
    const glyphs = [...text].map(character => {
      const font = fonts.find(candidate => candidate.charToGlyphIndex(character));
      if (!font) throw Error(`Missing bundled glyph: ${character}`);
      const glyph = font.charToGlyph(character);
      return { glyph, advance: glyph.advanceWidth / font.unitsPerEm * size + tracking };
    });
    const width = glyphs.reduce((sum,item) => sum + item.advance, 0) - tracking;
    if (!Number.isFinite(width)) throw Error("Invalid font advance width");
    let x = Number(attr("x")) - (attr("text-anchor") === "end" ? width : 0);
    const y = Number(attr("y"));
    const paths = glyphs.map(({ glyph, advance }) => {
      const path = glyph.getPath(x, y, size).toPathData(2);
      x += advance;
      return `<path d="${path}"/>`;
    }).join("");
    return `<g fill="${attr("fill") || "#fff"}">${paths}</g>`;
  });
}
const bundled = await build({ entryPoints: [join(root, "src/seo/serviceSocial.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
const { SERVICE_SOCIAL } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const xml = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const box = (x, y, w, h, body = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#111827" stroke="#ffffff" stroke-opacity=".18"/>${body}`;
const bar = (x, y, w, color = "#ffffff", opacity = .3) => `<rect x="${x}" y="${y}" width="${w}" height="9" rx="4.5" fill="${color}" opacity="${opacity}"/>`;
const dot = (x, y, r = 6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#accent)"/>`;
const line = (x, y, x2, y2) => `<path d="M${x} ${y}L${x2} ${y2}" fill="none" stroke="url(#accent)" stroke-width="3"/>`;
const check = (x, y) => `<path d="M${x} ${y + 8}l8 8 18-20" fill="none" stroke="url(#accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;

function art(kind) {
  switch (kind) {
    case "website": return box(0, 35, 340, 250, `${dot(20,55,4)}${dot(36,55,4)}${dot(52,55,4)}${bar(20,92,92)}${bar(20,114,170)}<rect x="20" y="149" width="155" height="88" rx="12" fill="url(#accent)" opacity=".22"/>${box(195,92,125,145, `${bar(210,116,66)}${bar(210,140,90)}${bar(210,164,60)}<rect x="210" y="193" width="80" height="23" rx="8" fill="url(#accent)"/>`)}${bar(20,255,130)}`);
    case "social": return `${box(0,30,150,210, `${dot(28,59,11)}${bar(50,55,75)}<rect x="15" y="89" width="120" height="95" rx="10" fill="url(#accent)" opacity=".4"/>${bar(15,203,86)}`)}${box(178,80,150,210, `${dot(205,109,11)}${bar(227,105,75)}<circle cx="253" cy="181" r="40" fill="url(#accent)" opacity=".5"/>${bar(193,253,86)}`)}${line(155,145,171,165)}`;
    case "logo": return `<g transform="translate(55,24)"><ellipse cx="116" cy="282" rx="119" ry="18" fill="#000" opacity=".4"/><path d="M26 237L113 34h41l87 203h-53l-55-139-54 139Z" fill="#58497e"/><path d="M10 220L97 17h41l87 203h-53l-55-139-54 139Z" fill="url(#accent)"/><path d="M80 169h75l20 45H60Z" fill="#ece7ff"/><ellipse cx="119" cy="142" rx="143" ry="112" fill="none" stroke="#fff" stroke-opacity=".2" transform="rotate(-24 119 142)"/></g>`;
    case "store": return box(0,24,340,270, `${bar(20,47,120)}<path d="M25 92h290l-16-30H41Z" fill="url(#accent)" opacity=".7"/>${[0,1,2].map(i => box(20+i*105,110,90,139, `<rect x="${32+i*105}" y="123" width="66" height="67" rx="8" fill="url(#accent)" opacity="${.25+i*.15}"/>${bar(32+i*105,209,58)}${bar(32+i*105,229,35)}`)).join("")}`);
    case "apps": return `${box(0,38,260,213, `${bar(18,61,80)}${box(18,90,100,132, `${bar(31,114,65)}${bar(31,142,52)}${bar(31,174,68,"#7c9cff",.8)}`)}${bar(140,100,95)}${bar(140,127,78)}${bar(140,156,95)}${bar(140,184,50)}`)}${box(228,88,108,210, `<rect x="240" y="111" width="84" height="142" rx="9" fill="url(#accent)" opacity=".25"/>${bar(253,131,56)}${bar(253,158,38)}${dot(282,276,6)}`)}`;
    case "ai": return `${[[37,53],[286,38],[35,261],[299,261],[170,7]].map(([x,y]) => `${line(170,151,x,y)}${box(x-22,y-22,44,44,dot(x,y,7))}`).join("")}${box(111,92,118,118, `<path d="M144 151h52M170 125v52" stroke="url(#accent)" stroke-width="8" stroke-linecap="round"/>`)}${dot(170,151,19)}`;
    case "qa": return box(25,6,288,298, `${bar(48,30,142)}${[0,1,2].map(i => `${box(48,67+i*73,43,43,check(57,81+i*73))}${bar(111,76+i*73,146)}${bar(111,96+i*73,100)}`).join("")}`);
    case "blog": return `${box(0,20,340,275, `${bar(20,43,100)}<rect x="20" y="77" width="185" height="82" rx="10" fill="url(#accent)" opacity=".28"/>${bar(20,181,185)}${bar(20,208,167)}${bar(20,235,182)}${bar(20,262,116)}${box(226,77,94,183, `${bar(239,96,63)}${bar(239,126,54)}${bar(239,156,66)}${bar(239,186,49)}${bar(239,216,64)}`)}`)}`;
    case "seo": return `${box(0,8,340,73, `<circle cx="34" cy="40" r="13" fill="none" stroke="url(#accent)" stroke-width="4"/><path d="m44 51 13 13" stroke="url(#accent)" stroke-width="4"/>${bar(77,34,209)}`)}${box(0,103,340,198, `${bar(22,126,165)}${bar(22,150,241)}${bar(22,174,201)}<path d="M28 272l68-25 59 9 60-38 57 1 40-37" fill="none" stroke="url(#accent)" stroke-width="5"/>${dot(96,247)}${dot(215,218)}${dot(312,182)}`)}`;
    case "ads": return `${box(0,20,340,275, `${bar(20,42,130)}${[.48,.72,.57,.9].map((h,i) => `<rect x="${30+i*75}" y="${258-h*170}" width="42" height="${h*170}" rx="9" fill="url(#accent)" opacity="${.25+i*.2}"/>`).join("")}<path d="M18 264h300" stroke="#fff" stroke-opacity=".2"/>`)}<circle cx="275" cy="88" r="40" fill="#151727" stroke="url(#accent)" stroke-width="3"/><circle cx="275" cy="88" r="22" fill="none" stroke="url(#accent)" stroke-width="3"/>${dot(275,88,7)}`;
    case "studio": return `${box(0,20,340,275, `${bar(20,43,98)}<path d="M142 105l49 90H93Z" fill="url(#accent)"/><circle cx="143" cy="161" r="67" fill="none" stroke="url(#accent)" stroke-opacity=".5"/>${bar(23,258,96)}${[0,1,2,3].map(i=>`<circle cx="${236+i*24}" cy="259" r="7" fill="hsl(${260+i*30} 80% 70%)"/>`).join("")}${box(247,79,73,142,`${bar(258,99,48)}${bar(258,129,35)}${bar(258,159,48)}${bar(258,189,39)}`)}`)}`;
    case "maintenance": return `${box(0,20,340,275, `${bar(20,42,130)}<path d="M20 170h58l23-48 31 86 28-128 33 145 22-55h103" fill="none" stroke="url(#accent)" stroke-width="4" stroke-linecap="round"/>${bar(20,262,91)}${bar(220,262,98)}`)}<circle cx="285" cy="51" r="8" fill="url(#accent)"/>`;
    default: return `${line(80,72,255,72)}${line(80,72,80,244)}${line(255,72,255,244)}${line(80,244,255,244)}${line(80,72,255,244)}${line(255,72,80,244)}${[[80,72],[255,72],[80,244],[255,244],[168,158]].map(([x,y],i)=>box(x-33,y-33,66,66,`<path d="M${x-11} ${y}h22M${x} ${y-11}v22" stroke="url(#accent)" stroke-width="${i===4?5:3}"/>`)).join("")}`;
  }
}

function render(entry, lang) {
  const title = entry[lang];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#080b13"/><stop offset="1" stop-color="hsl(${entry.hue} 35% 14%)"/></linearGradient><linearGradient id="accent" x2="1" y2="1"><stop stop-color="hsl(${entry.hue} 90% 78%)"/><stop offset="1" stop-color="hsl(${(entry.hue+35)%360} 83% 55%)"/></linearGradient><radialGradient id="halo"><stop stop-color="hsl(${entry.hue} 75% 55%)" stop-opacity=".2"/><stop offset="1" stop-color="hsl(${entry.hue} 75% 55%)" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="630" fill="url(#bg)"/><ellipse cx="956" cy="303" rx="360" ry="340" fill="url(#halo)"/>
    <path d="M66 140H1134M66 548H1134" stroke="#ffffff" stroke-opacity=".12"/>
    <text x="66" y="92" font-family="DejaVu Sans,Arial,sans-serif" font-size="30" font-weight="700" letter-spacing="7" fill="#ffffff">AVYRON</text><path d="M264 96l9-28" stroke="url(#accent)" stroke-width="4"/>
    <text x="1134" y="89" text-anchor="end" font-family="DejaVu Sans,Arial,sans-serif" font-size="14" letter-spacing="3" fill="#a6afc6">${lang === "ro" ? "SERVICII DIGITALE" : "DIGITAL SERVICES"}</text>
    <text x="68" y="194" font-family="DejaVu Sans,Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="1.5" fill="url(#accent)">${xml(entry.tags[lang])}</text>
    ${title.map((text,i)=>`<text x="62" y="${284+i*76}" font-family="DejaVu Sans,Arial,sans-serif" font-size="59" font-weight="700" letter-spacing="-2" fill="#f4f6ff">${xml(text)}</text>`).join("")}
    ${wrap(entry.caption[lang],48).map((text,i)=>`<text x="68" y="${440+i*31}" font-family="DejaVu Sans,Arial,sans-serif" font-size="21" fill="#b5bed3">${xml(text)}</text>`).join("")}
    <g transform="translate(760 187)">${art(entry.art)}</g>
    <rect x="66" y="581" width="64" height="4" rx="2" fill="url(#accent)"/><text x="150" y="589" font-family="DejaVu Sans,Arial,sans-serif" font-size="15" letter-spacing="1" fill="#b5bed3">${lang === "ro" ? "DE LA IDEE LA IMPLEMENTARE" : "FROM IDEA TO IMPLEMENTATION"}</text><text x="1134" y="589" text-anchor="end" font-family="DejaVu Sans,Arial,sans-serif" font-size="18" fill="#b5bed3">avyron.ro</text>
  </svg>`;
}
function wrap(text, limit) {
  const lines = [""];
  for (const word of text.split(" ")) {
    const i = lines.length-1;
    if (lines[i] && `${lines[i]} ${word}`.length > limit) lines.push(word);
    else lines[i] += `${lines[i] ? " " : ""}${word}`;
  }
  if (lines.length > 2) throw Error(`Caption needs art review: ${text}`);
  return lines;
}
await mkdir(output, { recursive: true });
const manifest = {};
let total = 0;
for (const entry of SERVICE_SOCIAL) for (const lang of ["ro", "en"]) {
  const image = await sharp(Buffer.from(outlineText(render(entry, lang)))).jpeg({ quality: 85, progressive: true, chromaSubsampling: "4:4:4" }).toBuffer();
  const hash = createHash("sha256").update(image).digest("hex").slice(0,12);
  const filename = `${entry.id}-${lang}-${hash}.jpg`;
  const target = join(output, filename);
  if (!(await readFile(target).catch(() => null))?.equals(image)) await writeFile(target, image);
  manifest[`${entry.id}:${lang}`] = `/og/servicii/${filename}`;
  total += image.length;
}
await writeFile(join(root,"src/seo/serviceSocialImages.json"), JSON.stringify(manifest,null,2)+"\n");
const active = new Set(Object.values(manifest).map(path => path.split("/").at(-1)));
// Only remove obsolete generator-owned files; never touch other public artwork.
for (const filename of await readdir(output)) if (/^[a-z]+-(ro|en)-[a-f0-9]{12}\.jpg$/.test(filename) && !active.has(filename)) await unlink(join(output,filename));
console.log(`Service previews: ${active.size} JPEG covers, ${(total/1024).toFixed(0)} KiB total; content-addressed URLs.`);
