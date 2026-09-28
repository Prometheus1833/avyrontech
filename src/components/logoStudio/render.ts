/**
 * Logo Studio renderer: LogoConcept + brief → vector logo.
 *
 * Lettering is converted to real outlines from open-source fonts (opentype.js),
 * so the SVG looks identical everywhere and can go straight to print.
 * One composition feeds three outputs: SVG markup, a 2D canvas, and the
 * white mask the 3D engine turns into the dynamic version.
 */
import type { Font } from "opentype.js";
import type { FontKey, LogoBrief, LogoConcept, Shape } from "@/data/logoStudio";

// ------------------------------------------------------------------ fonts

export const FONT_FILES: Record<FontKey, { label: string; files: [string, string] }> = {
  geometric: { label: "Outfit", files: ["outfit-latin-700-normal.woff", "outfit-latin-ext-700-normal.woff"] },
  grotesk: { label: "Space Grotesk", files: ["space-grotesk-latin-700-normal.woff", "space-grotesk-latin-ext-700-normal.woff"] },
  rounded: { label: "Nunito", files: ["nunito-latin-800-normal.woff", "nunito-latin-ext-800-normal.woff"] },
  serif: { label: "DM Serif Display", files: ["dm-serif-display-latin-400-normal.woff", "dm-serif-display-latin-ext-400-normal.woff"] },
  slab: { label: "Roboto Slab", files: ["roboto-slab-latin-700-normal.woff", "roboto-slab-latin-ext-700-normal.woff"] },
  mono: { label: "JetBrains Mono", files: ["jetbrains-mono-latin-700-normal.woff", "jetbrains-mono-latin-ext-700-normal.woff"] },
  condensed: { label: "Bebas Neue", files: ["bebas-neue-latin-400-normal.woff", "bebas-neue-latin-ext-400-normal.woff"] },
};

const FONT_BASE = "/fonts/logo-studio/";
const fontCache = new Map<FontKey, Promise<Font[]>>();

export function loadFont(key: FontKey): Promise<Font[]> {
  const hit = fontCache.get(key);
  if (hit) return hit;
  const p = (async () => {
    const { default: opentype } = await import("opentype.js");
    const buffers = await Promise.all(
      FONT_FILES[key].files.map((f) => fetch(FONT_BASE + f).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(f))))),
    );
    return buffers.map((b) => opentype.parse(b));
  })();
  fontCache.set(key, p);
  p.catch(() => fontCache.delete(key));
  return p;
}

type TextShape = { d: string; width: number; ascent: number; descent: number };

/** Outline a string, falling back per character to the font that contains it (latin / latin-ext). */
export function outlineText(fonts: Font[], str: string, size: number, tracking: number, x = 0, baseline = 0): TextShape {
  let cursor = x;
  const parts: string[] = [];
  let prev: { font: Font; glyph: ReturnType<Font["charToGlyph"]> } | null = null;
  const main = fonts[0];
  for (const ch of [...str]) {
    // Subset files map missing characters to .notdef (index 0): look for a real glyph.
    const font = fonts.find((f) => f.charToGlyphIndex(ch) > 0) ?? main;
    const glyph = font.charToGlyph(ch);
    const scale = size / font.unitsPerEm;
    if (prev && prev.font === font) cursor += font.getKerningValue(prev.glyph, glyph) * scale;
    const path = glyph.getPath(cursor, baseline, size);
    const d = path.toPathData(2);
    if (d) parts.push(d);
    cursor += (glyph.advanceWidth ?? font.unitsPerEm * 0.5) * scale + tracking * size;
    prev = { font, glyph };
  }
  const width = Math.max(0, cursor - x - tracking * size);
  return {
    d: parts.join(" "),
    width,
    ascent: (main.ascender / main.unitsPerEm) * size,
    descent: (-main.descender / main.unitsPerEm) * size,
  };
}

/** Cap height, measured from an H — layouts are aligned on it, not on the em box. */
function capHeight(fonts: Font[], size: number) {
  const g = fonts[0].charToGlyph("H");
  const bb = g.getPath(0, 0, size).getBoundingBox();
  return Math.max(1, -bb.y1);
}

// ------------------------------------------------------------------ geometry helpers (100 × 100 box)

const f = (n: number) => Math.round(n * 100) / 100;
const circle = (cx: number, cy: number, r: number) =>
  `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
const rrect = (x: number, y: number, w: number, h: number, r: number) => {
  const q = Math.min(r, w / 2, h / 2);
  return `M${f(x + q)} ${f(y)}H${f(x + w - q)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + q)}V${f(y + h - q)}Q${f(x + w)} ${f(y + h)} ${f(x + w - q)} ${f(y + h)}H${f(x + q)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - q)}V${f(y + q)}Q${f(x)} ${f(y)} ${f(x + q)} ${f(y)}Z`;
};
/** Polygon with every corner softened by radius r. */
const roundPoly = (pts: Array<[number, number]>, r: number) => {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[(i - 1 + n) % n];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[(i + 1) % n];
    const l1 = Math.hypot(cx - px, cy - py);
    const l2 = Math.hypot(nx - cx, ny - cy);
    const t1 = Math.min(r, l1 / 2) / l1;
    const t2 = Math.min(r, l2 / 2) / l2;
    const ax = cx + (px - cx) * t1;
    const ay = cy + (py - cy) * t1;
    const bx = cx + (nx - cx) * t2;
    const by = cy + (ny - cy) * t2;
    d += `${i === 0 ? "M" : "L"}${f(ax)} ${f(ay)}Q${f(cx)} ${f(cy)} ${f(bx)} ${f(by)}`;
  }
  return `${d}Z`;
};
const polygon = (sides: number, r: number, rot = 0): Array<[number, number]> =>
  Array.from({ length: sides }, (_, i) => {
    const a = rot + (i / sides) * Math.PI * 2;
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r] as [number, number];
  });

export type Op = { d: string; role: "fill" | "cut" | "accent"; rule?: "evenodd" };

/** Shapes solid enough to carry a knocked-out monogram. */
const SOLID: Shape[] = ["circle", "square", "hexagon", "diamond", "shield", "leaf", "drop", "heart", "house", "cross"];

function symbolOps(shape: Shape): Op[] {
  switch (shape) {
    case "circle": return [{ d: circle(50, 50, 45), role: "fill" }];
    case "square": return [{ d: rrect(6, 6, 88, 88, 20), role: "fill" }];
    case "hexagon": return [{ d: roundPoly(polygon(6, 47, Math.PI / 6), 7), role: "fill" }];
    case "diamond": return [{ d: roundPoly([[50, 3], [97, 50], [50, 97], [3, 50]], 9), role: "fill" }];
    case "shield": return [{ d: "M50 4L90 16V46C90 72 72 88 50 96C28 88 10 72 10 46V16Z", role: "fill" }];
    case "peak": return [{ d: roundPoly([[4, 90], [38, 20], [54, 50], [68, 32], [96, 90]], 5), role: "fill" }];
    case "leaf": return [{ d: "M50 4C84 22 94 62 50 96C6 62 16 22 50 4Z", role: "fill" }];
    case "drop": return [{ d: "M50 3C50 3 86 44 86 63A36 36 0 0 1 14 63C14 44 50 3 50 3Z", role: "fill" }];
    case "spark": return [{ d: "M50 2C54 34 66 46 98 50C66 54 54 66 50 98C46 66 34 54 2 50C34 46 46 34 50 2Z", role: "fill" }];
    case "orbit":
      return [
        { d: circle(50, 50, 44), role: "fill" },
        { d: circle(50, 50, 31), role: "cut" },
        { d: circle(82, 24, 16), role: "cut" },
        { d: circle(82, 24, 10), role: "accent" },
      ];
    case "wave":
      return [
        { d: "M4 34C22 18 38 18 50 34S78 50 96 34V52C78 68 62 68 50 52S22 36 4 52Z", role: "fill" },
        { d: "M4 62C22 46 38 46 50 62S78 78 96 62V78C78 94 62 94 50 78S22 62 4 78Z", role: "accent" },
      ];
    case "bars":
      return [
        { d: rrect(6, 54, 24, 40, 12), role: "fill" },
        { d: rrect(38, 32, 24, 62, 12), role: "fill" },
        { d: rrect(70, 8, 24, 86, 12), role: "accent" },
      ];
    case "stack":
      return [
        { d: rrect(20, 8, 60, 22, 11), role: "accent" },
        { d: rrect(12, 39, 76, 22, 11), role: "fill" },
        { d: rrect(4, 70, 92, 22, 11), role: "fill" },
      ];
    case "arc": return [{ d: "M6 88A44 44 0 0 1 94 88H70A20 20 0 0 0 30 88Z", role: "fill" }, { d: circle(50, 88, 9), role: "accent" }];
    case "grid":
      return [
        { d: rrect(6, 6, 40, 40, 11), role: "fill" },
        { d: rrect(54, 6, 40, 40, 11), role: "fill" },
        { d: rrect(6, 54, 40, 40, 11), role: "fill" },
        { d: circle(74, 74, 20), role: "accent" },
      ];
    case "chevron": return [{ d: roundPoly([[12, 8], [56, 8], [94, 50], [56, 92], [12, 92], [50, 50]], 6), role: "fill" }];
    case "bolt": return [{ d: roundPoly([[60, 2], [14, 58], [46, 58], [38, 98], [86, 40], [54, 40]], 4), role: "fill" }];
    case "house":
      return [{ d: roundPoly([[50, 5], [95, 44], [84, 44], [84, 93], [16, 93], [16, 44], [5, 44]], 6), role: "fill" }];
    case "cross": return [{ d: `${rrect(34, 5, 32, 90, 13)}${rrect(5, 34, 90, 32, 13)}`, role: "fill" }];
    case "heart":
      return [{ d: "M50 92C20 72 4 54 4 33C4 17 16 6 30 6C40 6 46 12 50 20C54 12 60 6 70 6C84 6 96 17 96 33C96 54 80 72 50 92Z", role: "fill" }];
  }
}

function cutOps(cut: LogoConcept["cut"]): Op[] {
  switch (cut) {
    case "slash": return [{ d: "M70 -10L80 -4L30 110L20 104Z", role: "cut" }];
    case "ring": return [{ d: `${circle(50, 50, 24)}${circle(50, 50, 18)}`, role: "cut", rule: "evenodd" }];
    case "stripe": return [{ d: "M-10 46H110V54H-10Z", role: "cut" }];
    case "notch": return [{ d: circle(88, 12, 20), role: "cut" }];
    case "dot": return [{ d: circle(50, 50, 11), role: "cut" }];
    default: return [];
  }
}

type Group = { ops: Op[]; x: number; y: number; s: number };

export type Composition = {
  width: number;
  height: number;
  symbol: Group | null;
  /** Filled lettering (absolute coordinates). */
  name: string;
  tagline: string;
  palette: LogoConcept["palette"];
};

function applyCase(s: string, c: LogoConcept["caseStyle"]) {
  if (c === "upper") return s.toLocaleUpperCase("ro-RO");
  if (c === "lower") return s.toLocaleLowerCase("ro-RO");
  return s;
}

/** Lay out symbol, name and tagline. Units: name cap height = 100. */
export function compose(concept: LogoConcept, brief: LogoBrief, fonts: Font[], taglineFonts: Font[]): Composition {
  const size = 100 / (capHeight(fonts, 100) / 100);
  const cap = 100;
  const name = applyCase(brief.name, concept.caseStyle);
  const tagText = brief.tagline ? applyCase(brief.tagline, concept.caseStyle === "upper" ? "upper" : "title") : "";
  const tagSize = size * 0.34;
  const gap = cap * 0.55;

  let symbolOpsList = symbolOps(concept.symbol);
  const canMono = SOLID.includes(concept.symbol);
  const mono = concept.monogram && canMono ? concept.monogram : "";
  if (concept.layout === "badge") {
    const container: Op = concept.symbol === "square" || concept.symbol === "hexagon" || concept.symbol === "shield"
      ? symbolOps(concept.symbol)[0]
      : { d: circle(50, 50, 46), role: "fill" };
    symbolOpsList = [container];
  } else if (!mono) {
    symbolOpsList = [...symbolOpsList, ...cutOps(concept.cut)];
  }
  const monoLetters = concept.layout === "badge" ? concept.monogram || [...brief.name][0].toUpperCase() : mono;
  if (monoLetters) {
    // Letters sized to about half the symbol, centred optically on the cap height.
    const probe = outlineText(fonts, monoLetters, 50, 0);
    const mCap = capHeight(fonts, 50);
    const k = Math.min(1.05, 46 / Math.max(probe.width, mCap));
    const t = outlineText(fonts, monoLetters, 50 * k, 0, 50 - (probe.width * k) / 2, 50 + (mCap * k) / 2);
    symbolOpsList = [...symbolOpsList, { d: t.d, role: "cut" }];
  }

  const hasSymbol = concept.layout !== "wordmark";
  const showText = concept.layout !== "icon-only";
  const nameShape = showText ? outlineText(fonts, name, size, concept.tracking) : null;
  const tagShape = showText && tagText ? outlineText(taglineFonts, tagText, tagSize, 0.08) : null;
  const tagCap = tagShape ? capHeight(taglineFonts, tagSize) : 0;

  let width = 0;
  let height = 0;
  let symbol: Group | null = null;
  let nameD = "";
  let tagD = "";

  if (!showText) {
    symbol = { ops: symbolOpsList, x: 0, y: 0, s: 3.2 };
    width = 320;
    height = 320;
  } else if (concept.layout === "icon-top") {
    const S = cap * 2.3;
    const blockW = Math.max(nameShape!.width, tagShape?.width ?? 0, S);
    symbol = { ops: symbolOpsList, x: (blockW - S) / 2, y: 0, s: S / 100 };
    const nameY = S + gap + cap;
    nameD = outlineText(fonts, name, size, concept.tracking, (blockW - nameShape!.width) / 2, nameY).d;
    if (tagShape) tagD = outlineText(taglineFonts, tagText, tagSize, 0.08, (blockW - tagShape.width) / 2, nameY + gap * 0.9 + tagCap).d;
    width = blockW;
    height = nameY + (tagShape ? gap * 0.9 + tagCap : 0) + cap * 0.12;
  } else {
    const S = hasSymbol ? cap * (tagShape ? 2.15 : 1.8) : 0;
    const textX = hasSymbol ? S + gap * 0.8 : 0;
    const textBlockH = cap + (tagShape ? gap * 0.7 + tagCap : 0);
    const top = Math.max(0, (S - textBlockH) / 2);
    if (hasSymbol) symbol = { ops: symbolOpsList, x: 0, y: Math.max(0, (textBlockH - S) / 2), s: S / 100 };
    const nameY = top + cap;
    nameD = outlineText(fonts, name, size, concept.tracking, textX, nameY).d;
    let right = textX + nameShape!.width;
    if (!hasSymbol) {
      // Wordmark: a small accent square after the name gives it a signature.
      const dot = cap * 0.22;
      nameD += ` ${rrect(right + cap * 0.1, nameY - dot, dot, dot, dot * 0.2)}`;
      right += cap * 0.1 + dot;
    }
    if (tagShape) {
      tagD = outlineText(taglineFonts, tagText, tagSize, 0.08, textX, nameY + gap * 0.7 + tagCap).d;
      right = Math.max(right, textX + tagShape.width);
    }
    width = right;
    height = Math.max(S, textBlockH) + cap * 0.12;
  }

  return { width, height, symbol, name: nameD, tagline: tagD, palette: concept.palette };
}

// ------------------------------------------------------------------ outputs

export type RenderOptions = {
  /** Background: none (transparent), paper colour, or a dark stage. */
  background?: "none" | "paper" | "dark";
  mono?: "black" | "white" | null;
  watermark?: string | null;
  padding?: number;
};

let uid = 0;

export function toSvg(comp: Composition, opts: RenderOptions = {}): string {
  const pad = opts.padding ?? Math.max(comp.width, comp.height) * 0.08;
  const W = comp.width + pad * 2;
  const H = comp.height + pad * 2;
  const p = comp.palette;
  const color = (c: string) => (opts.mono === "black" ? "#111111" : opts.mono === "white" ? "#ffffff" : c);
  const bg = opts.background === "paper" ? p.paper : opts.background === "dark" ? "#0b0a12" : null;
  const onDark = opts.background === "dark";
  const ink = onDark && !opts.mono ? p.paper : color(p.ink);
  const id = `ls${++uid}`;
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" width="${f(W)}" height="${f(H)}">`);
  if (bg) parts.push(`<rect width="100%" height="100%" fill="${bg}"/>`);
  parts.push(`<g transform="translate(${f(pad)} ${f(pad)})">`);
  if (comp.symbol) {
    const g = comp.symbol;
    const fills = g.ops.filter((o) => o.role === "fill");
    const cuts = g.ops.filter((o) => o.role === "cut");
    const accents = g.ops.filter((o) => o.role === "accent");
    parts.push(`<g transform="translate(${f(g.x)} ${f(g.y)}) scale(${f(g.s)})">`);
    if (cuts.length) {
      parts.push(`<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="140"><rect x="-20" y="-20" width="140" height="140" fill="#fff"/>`);
      for (const c of cuts) parts.push(`<path d="${c.d}" fill="#000"${c.rule ? ` fill-rule="${c.rule}"` : ""}/>`);
      parts.push(`</mask></defs>`);
    }
    parts.push(`<g${cuts.length ? ` mask="url(#${id})"` : ""}>`);
    for (const o of fills) parts.push(`<path d="${o.d}" fill="${color(p.primary)}"/>`);
    for (const o of accents) parts.push(`<path d="${o.d}" fill="${color(p.accent)}"/>`);
    parts.push(`</g></g>`);
  }
  if (comp.name) parts.push(`<path d="${comp.name}" fill="${ink}"/>`);
  if (comp.tagline) parts.push(`<path d="${comp.tagline}" fill="${opts.mono ? ink : color(p.accent)}"/>`);
  parts.push(`</g>`);
  if (opts.watermark) {
    parts.push(
      `<defs><pattern id="${id}w" width="${f(W / 2.2)}" height="${f(H / 1.6)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><text x="0" y="${f(H / 3)}" font-family="system-ui,sans-serif" font-size="${f(Math.max(10, H / 14))}" font-weight="700" fill="${onDark ? "#ffffff" : "#000000"}" fill-opacity="0.09">${opts.watermark}</text></pattern></defs><rect width="100%" height="100%" fill="url(#${id}w)"/>`,
    );
  }
  parts.push(`</svg>`);
  return parts.join("");
}

/** Paint every element as white on transparent, fitted in the canvas (for the 3D distance field). */
export function drawMask(comp: Composition, ctx: CanvasRenderingContext2D) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const k = Math.min((W * 0.86) / comp.width, (H * 0.8) / comp.height);
  ctx.save();
  ctx.translate((W - comp.width * k) / 2, (H - comp.height * k) / 2);
  ctx.scale(k, k);
  ctx.fillStyle = "#fff";
  if (comp.symbol) {
    const g = comp.symbol;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.scale(g.s, g.s);
    for (const o of g.ops.filter((o) => o.role !== "cut")) ctx.fill(new Path2D(o.d));
    ctx.globalCompositeOperation = "destination-out";
    for (const o of g.ops.filter((o) => o.role === "cut")) ctx.fill(new Path2D(o.d), o.rule === "evenodd" ? "evenodd" : "nonzero");
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
  if (comp.name) ctx.fill(new Path2D(comp.name));
  if (comp.tagline) ctx.fill(new Path2D(comp.tagline));
  ctx.restore();
}

/** Rasterise the SVG (for PNG exports). */
export async function svgToPng(svg: string, width: number): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("svg load"));
      img.src = url;
    });
    const ratio = img.naturalHeight / img.naturalWidth || 1;
    const c = document.createElement("canvas");
    c.width = width;
    c.height = Math.round(width * ratio);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function composeWithFonts(concept: LogoConcept, brief: LogoBrief): Promise<Composition> {
  const [fonts, tagFonts] = await Promise.all([loadFont(concept.font), loadFont(concept.font === "condensed" ? "grotesk" : concept.font === "serif" ? "geometric" : concept.font)]);
  return compose(concept, brief, fonts, tagFonts);
}
