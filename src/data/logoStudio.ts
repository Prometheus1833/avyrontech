/**
 * Avyron Logo Studio — shared model (browser + Worker).
 *
 * The AI never draws pixels. It acts as an art director: from a short brief it
 * picks a composition from a closed vocabulary (symbol, cut, monogram, layout,
 * typeface, palette, material, motion). Our renderer turns that into a clean
 * vector logo, and our 3D engine turns the same vector into the dynamic version.
 * The result is always a crisp, editable SVG with correct lettering — which
 * raster image models cannot guarantee.
 *
 * Everything here is pure data and functions: no DOM, no React.
 */

export const SHAPES = [
  "circle", "square", "hexagon", "diamond", "shield", "peak", "leaf", "drop",
  "spark", "orbit", "wave", "bars", "stack", "arc", "grid", "chevron", "bolt", "house", "cross", "heart",
] as const;
export const CUTS = ["none", "slash", "ring", "stripe", "notch", "dot"] as const;
export const LAYOUTS = ["icon-left", "icon-top", "wordmark", "icon-only", "badge"] as const;
export const FONTS = ["geometric", "grotesk", "rounded", "serif", "slab", "mono", "condensed"] as const;
export const CASES = ["upper", "title", "lower"] as const;
export const MATERIALS = ["metal", "glass", "neon", "matte"] as const;
export const MOTIONS = ["spin", "rise", "draw", "pulse", "assemble"] as const;
export const STYLES = ["modern", "elegant", "playful", "bold", "minimal", "luxury", "tech", "natural"] as const;
export const INDUSTRIES = [
  "food", "beauty", "health", "tech", "finance", "law", "construction", "realestate",
  "education", "auto", "fashion", "creative", "sport", "travel", "retail", "other",
] as const;
export const STUDIO_KINDS = ["static", "dynamic"] as const;

export type Shape = (typeof SHAPES)[number];
export type Cut = (typeof CUTS)[number];
export type Layout = (typeof LAYOUTS)[number];
export type FontKey = (typeof FONTS)[number];
export type CaseStyle = (typeof CASES)[number];
export type Material = (typeof MATERIALS)[number];
export type Motion = (typeof MOTIONS)[number];
export type Style = (typeof STYLES)[number];
export type Industry = (typeof INDUSTRIES)[number];
export type StudioKind = (typeof STUDIO_KINDS)[number];

export type Palette = { primary: string; accent: string; ink: string; paper: string };

export type LogoBrief = {
  name: string;
  tagline: string;
  industry: Industry;
  style: Style;
  /** Optional free description ("cafenea mică, prietenoasă, lângă universitate"). */
  notes: string;
  /** Optional preferred colour, hex. */
  color: string;
  kind: StudioKind;
  lang: "ro" | "en";
};

export type LogoConcept = {
  idea: string;
  symbol: Shape;
  monogram: string;
  cut: Cut;
  layout: Layout;
  font: FontKey;
  caseStyle: CaseStyle;
  tracking: number;
  palette: Palette;
  material: Material;
  motion: Motion;
};

/** Prices in lei for the paid delivery of a self-made logo. Proposed — confirm before launch. */
export const STUDIO_PRICES: Record<StudioKind, number> = { static: 75, dynamic: 150 };

// ------------------------------------------------------------------ sanitising

const HEX = /^#[0-9a-f]{6}$/i;
const pick = <T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : fallback;
const hex = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback);

/** Strip control characters and angle brackets, collapse whitespace, cap length. */
const text = (v: unknown, max: number) =>
  typeof v === "string"
    ? [...v]
        .filter((ch) => ch.charCodeAt(0) >= 32 && ch !== "<" && ch !== ">")
        .join("")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";

export function cleanBrief(raw: Partial<Record<keyof LogoBrief, unknown>>): LogoBrief | null {
  const name = text(raw.name, 28);
  if (name.length < 1) return null;
  return {
    name,
    tagline: text(raw.tagline, 40),
    industry: pick(INDUSTRIES, raw.industry, "other"),
    style: pick(STYLES, raw.style, "modern"),
    notes: text(raw.notes, 240),
    color: hex(raw.color, ""),
    kind: pick(STUDIO_KINDS, raw.kind, "static"),
    lang: raw.lang === "en" ? "en" : "ro",
  };
}

/** Initials from the brand name: "Brava Coffee" → "BC", "Nordis" → "N". */
export function initials(name: string, max = 2): string {
  const words = name
    .normalize("NFC")
    .split(/[\s\-_&.]+/)
    .filter((w) => /\p{L}|\p{N}/u.test(w));
  const letters = words.map((w) => [...w].find((c) => /\p{L}|\p{N}/u.test(c)) ?? "").join("");
  return [...letters].slice(0, max).join("").toUpperCase();
}

/** Validate one AI-proposed concept against the closed vocabulary; fill gaps safely. */
export function cleanConcept(raw: unknown, brief: LogoBrief, fallback: LogoConcept): LogoConcept {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const p = (r.palette && typeof r.palette === "object" ? r.palette : {}) as Record<string, unknown>;
  let monogram = text(r.monogram, 2).toUpperCase();
  // The monogram must come from the name, never invented letters.
  const allowed = new Set([...brief.name.toUpperCase()]);
  monogram = [...monogram].filter((c) => allowed.has(c)).join("");
  const tracking = Number(r.tracking);
  return {
    idea: text(r.idea, 180) || fallback.idea,
    symbol: pick(SHAPES, r.symbol, fallback.symbol),
    monogram,
    cut: pick(CUTS, r.cut, fallback.cut),
    layout: pick(LAYOUTS, r.layout, fallback.layout),
    font: pick(FONTS, r.font, fallback.font),
    caseStyle: pick(CASES, r.caseStyle, fallback.caseStyle),
    tracking: Number.isFinite(tracking) ? Math.max(-0.04, Math.min(0.3, tracking)) : fallback.tracking,
    palette: {
      primary: hex(p.primary, fallback.palette.primary),
      accent: hex(p.accent, fallback.palette.accent),
      ink: hex(p.ink, fallback.palette.ink),
      paper: hex(p.paper, fallback.palette.paper),
    },
    material: pick(MATERIALS, r.material, fallback.material),
    motion: pick(MOTIONS, r.motion, fallback.motion),
  };
}

// ------------------------------------------------------------------ local generator

/** Deterministic PRNG (mulberry32) seeded from a string. */
export function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INDUSTRY_SHAPES: Record<Industry, Shape[]> = {
  food: ["drop", "leaf", "circle", "arc", "heart"],
  beauty: ["leaf", "drop", "circle", "spark", "heart"],
  health: ["cross", "shield", "leaf", "heart", "circle"],
  tech: ["bars", "grid", "orbit", "spark", "hexagon", "chevron"],
  finance: ["bars", "diamond", "shield", "chevron", "square"],
  law: ["shield", "diamond", "square", "arc", "peak"],
  construction: ["house", "peak", "stack", "hexagon", "square"],
  realestate: ["house", "peak", "arc", "square", "stack"],
  education: ["stack", "spark", "arc", "peak", "orbit"],
  auto: ["chevron", "bolt", "circle", "wave", "diamond"],
  fashion: ["diamond", "circle", "leaf", "arc", "spark"],
  creative: ["spark", "orbit", "wave", "drop", "grid"],
  sport: ["bolt", "chevron", "peak", "shield", "wave"],
  travel: ["orbit", "wave", "peak", "arc", "drop"],
  retail: ["circle", "square", "heart", "spark", "stack"],
  other: ["circle", "hexagon", "spark", "orbit", "diamond"],
};

const STYLE_FONTS: Record<Style, FontKey[]> = {
  modern: ["geometric", "grotesk"],
  elegant: ["serif", "geometric"],
  playful: ["rounded", "geometric"],
  bold: ["condensed", "slab", "grotesk"],
  minimal: ["geometric", "grotesk", "mono"],
  luxury: ["serif", "condensed"],
  tech: ["mono", "grotesk", "geometric"],
  natural: ["rounded", "serif", "slab"],
};

const STYLE_PALETTES: Record<Style, Palette[]> = {
  modern: [
    { primary: "#6d5dfc", accent: "#22d3ee", ink: "#111827", paper: "#ffffff" },
    { primary: "#0ea5e9", accent: "#f97316", ink: "#0f172a", paper: "#ffffff" },
  ],
  elegant: [
    { primary: "#1f2937", accent: "#c9a96e", ink: "#1f2937", paper: "#faf7f2" },
    { primary: "#7c2d12", accent: "#e7c27d", ink: "#292524", paper: "#fffbf5" },
  ],
  playful: [
    { primary: "#f43f5e", accent: "#facc15", ink: "#1e1b4b", paper: "#ffffff" },
    { primary: "#8b5cf6", accent: "#34d399", ink: "#1e1b4b", paper: "#ffffff" },
  ],
  bold: [
    { primary: "#dc2626", accent: "#111827", ink: "#111827", paper: "#ffffff" },
    { primary: "#111827", accent: "#facc15", ink: "#111827", paper: "#ffffff" },
  ],
  minimal: [
    { primary: "#111111", accent: "#9ca3af", ink: "#111111", paper: "#ffffff" },
    { primary: "#334155", accent: "#94a3b8", ink: "#0f172a", paper: "#ffffff" },
  ],
  luxury: [
    { primary: "#b08d57", accent: "#1c1917", ink: "#1c1917", paper: "#fbf8f1" },
    { primary: "#0f172a", accent: "#d4af37", ink: "#0f172a", paper: "#fdfcf8" },
  ],
  tech: [
    { primary: "#2563eb", accent: "#22d3ee", ink: "#0b1220", paper: "#ffffff" },
    { primary: "#7c3aed", accent: "#06b6d4", ink: "#0b1020", paper: "#ffffff" },
  ],
  natural: [
    { primary: "#3f6212", accent: "#ca8a04", ink: "#1c1917", paper: "#fbfaf5" },
    { primary: "#0f766e", accent: "#84cc16", ink: "#134e4a", paper: "#ffffff" },
  ],
};

const STYLE_MATERIAL: Record<Style, Material[]> = {
  modern: ["glass", "metal"],
  elegant: ["metal", "matte"],
  playful: ["matte", "glass"],
  bold: ["metal", "matte"],
  minimal: ["matte", "glass"],
  luxury: ["metal"],
  tech: ["neon", "glass", "metal"],
  natural: ["matte", "glass"],
};

const IDEAS: Record<Shape, { ro: string; en: string }> = {
  circle: { ro: "Un cerc: completitudine și încredere, ușor de recunoscut la orice mărime.", en: "A circle: completeness and trust, recognisable at any size." },
  square: { ro: "Un pătrat cu colțuri blânde: stabilitate fără răceală.", en: "A soft-cornered square: stability without coldness." },
  hexagon: { ro: "Un hexagon: structură, precizie, lucruri construite să țină.", en: "A hexagon: structure, precision, things built to last." },
  diamond: { ro: "Un romb: valoare și claritate, cu o direcție fermă.", en: "A diamond: value and clarity, with a firm direction." },
  shield: { ro: "Un scut: protecție și seriozitate, fără să pară rigid.", en: "A shield: protection and seriousness, without stiffness." },
  peak: { ro: "Un vârf: ambiție și creștere, citit dintr-o privire.", en: "A peak: ambition and growth, read at a glance." },
  leaf: { ro: "O frunză: natural, proaspăt, grijă pentru detalii.", en: "A leaf: natural, fresh, care for detail." },
  drop: { ro: "O picătură: puritate, gust, ceva ce se simte.", en: "A drop: purity, taste, something you can feel." },
  spark: { ro: "O scânteie: ideea bună care pornește totul.", en: "A spark: the good idea that starts it all." },
  orbit: { ro: "O orbită: mișcare continuă și un centru clar.", en: "An orbit: continuous motion around a clear centre." },
  wave: { ro: "Un val: ritm, flux, energie care nu se oprește.", en: "A wave: rhythm, flow, energy that keeps going." },
  bars: { ro: "Bare care urcă: progres măsurabil, rezultate care se văd.", en: "Rising bars: measurable progress, visible results." },
  stack: { ro: "Straturi suprapuse: cunoaștere sau construcție, pas cu pas.", en: "Stacked layers: knowledge or building, step by step." },
  arc: { ro: "Un arc: deschidere, un început de drum.", en: "An arch: openness, the start of a journey." },
  grid: { ro: "O grilă de module: sistem, ordine, tehnologie.", en: "A modular grid: system, order, technology." },
  chevron: { ro: "O săgeată: direcție, viteză, înainte.", en: "A chevron: direction, speed, forward." },
  bolt: { ro: "Un fulger: energie și reacție rapidă.", en: "A bolt: energy and quick reaction." },
  house: { ro: "O casă stilizată: siguranță, loc, apartenență.", en: "A stylised house: safety, place, belonging." },
  cross: { ro: "O cruce rotunjită: grijă și sănătate, fără a fi clinică.", en: "A rounded cross: care and health, without feeling clinical." },
  heart: { ro: "O inimă geometrică: căldură și atenție la oameni.", en: "A geometric heart: warmth and attention to people." },
};

/** Six varied, sensible concepts without any AI call — instant, free and offline. */
export function localConcepts(brief: LogoBrief, count = 6, salt = ""): LogoConcept[] {
  const rand = rng(`${brief.name}|${brief.industry}|${brief.style}|${brief.color}|${salt}`);
  const choose = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const shapes = [...INDUSTRY_SHAPES[brief.industry]];
  const layouts: Layout[] = ["icon-left", "icon-top", "icon-left", "badge", "wordmark", "icon-only"];
  const out: LogoConcept[] = [];
  for (let i = 0; i < count; i++) {
    const symbol = shapes[(i + Math.floor(rand() * shapes.length)) % shapes.length];
    const base = choose(STYLE_PALETTES[brief.style]);
    const palette = brief.color ? { ...base, primary: brief.color } : base;
    const layout = layouts[i % layouts.length];
    const useMono = layout === "badge" || layout === "icon-only" || rand() < 0.45;
    out.push({
      idea: IDEAS[symbol][brief.lang],
      symbol,
      monogram: useMono ? initials(brief.name, rand() < 0.6 ? 1 : 2) : "",
      cut: useMono ? "none" : choose(CUTS),
      layout,
      font: choose(STYLE_FONTS[brief.style]),
      caseStyle: brief.style === "luxury" || brief.style === "bold" ? "upper" : choose(CASES),
      tracking: brief.style === "luxury" ? 0.18 : brief.style === "bold" ? 0.02 : Math.round(rand() * 8) / 100,
      palette,
      material: choose(STYLE_MATERIAL[brief.style]),
      motion: choose(MOTIONS),
    });
  }
  return out;
}

// ------------------------------------------------------------------ AI (Worker side)

export const CONCEPT_JSON_SCHEMA = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          idea: { type: "string", description: "One sentence explaining the concept, in the brief's language" },
          symbol: { type: "string", enum: [...SHAPES] },
          monogram: { type: "string", description: "0, 1 or 2 letters taken from the brand name; empty for no monogram" },
          cut: { type: "string", enum: [...CUTS] },
          layout: { type: "string", enum: [...LAYOUTS] },
          font: { type: "string", enum: [...FONTS] },
          caseStyle: { type: "string", enum: [...CASES] },
          tracking: { type: "number", minimum: -0.04, maximum: 0.3 },
          palette: {
            type: "object",
            properties: {
              primary: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              accent: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              ink: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              paper: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            },
            required: ["primary", "accent", "ink", "paper"],
          },
          material: { type: "string", enum: [...MATERIALS] },
          motion: { type: "string", enum: [...MOTIONS] },
        },
        required: ["idea", "symbol", "monogram", "cut", "layout", "font", "caseStyle", "tracking", "palette", "material", "motion"],
      },
    },
  },
  required: ["concepts"],
} as const;

export function buildPrompt(brief: LogoBrief): { system: string; user: string } {
  const lang = brief.lang === "ro" ? "Romanian" : "English";
  const system = [
    "You are a senior brand identity designer at a design studio.",
    "You design logos by choosing from a closed vocabulary; a renderer draws the result as vectors.",
    "Rules: 4 clearly different concepts; each symbol must relate to the business, not be random;",
    "prefer simple, memorable, scalable marks; ensure strong contrast between ink and paper and between primary and paper;",
    "use at most 2 letters for a monogram and only letters from the brand name; avoid cliché combinations when a better idea exists;",
    "palettes must be professional (no neon rainbow unless the style asks for it);",
    `write every "idea" as one short sentence in ${lang}, explaining why the concept fits this business.`,
    "Answer only with JSON matching the schema.",
  ].join(" ");
  const user = JSON.stringify({
    brand_name: brief.name,
    tagline: brief.tagline || null,
    industry: brief.industry,
    style: brief.style,
    preferred_color: brief.color || null,
    description: brief.notes || null,
    output: brief.kind === "dynamic" ? "logo that will also be extruded in 3D and animated" : "static logo",
  });
  return { system, user };
}

// ------------------------------------------------------------------ sharing a concept by URL

export function encodeDesign(brief: LogoBrief, concept: LogoConcept): string {
  const json = JSON.stringify({ b: brief, c: concept });
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDesign(token: string): { brief: LogoBrief; concept: LogoConcept } | null {
  try {
    const bin = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes)) as { b: unknown; c: unknown };
    const brief = cleanBrief((data.b ?? {}) as Record<string, unknown>);
    if (!brief) return null;
    const fallback = localConcepts(brief, 1)[0];
    return { brief, concept: cleanConcept(data.c, brief, fallback) };
  } catch {
    return null;
  }
}
