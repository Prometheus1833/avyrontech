import type { MarkDraw } from "./engine/sdf";

/**
 * Original concept marks for fictional brands, drawn procedurally.
 * They exist only to show the craft: no real company, no real trademark.
 * Each draw function paints white on a transparent size² canvas, centred,
 * inside roughly 80% of the square so the distance field has room to breathe.
 */

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function cut(ctx: CanvasRenderingContext2D, paint: () => void) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  paint();
  ctx.restore();
}

/** Brava — specialty coffee: a single bean whose seam is an S that reads as steam. */
const brava: MarkDraw = (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.rotate(-0.52);
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.245, s * 0.355, 0, 0, Math.PI * 2);
  ctx.fill();
  cut(ctx, () => {
    ctx.lineWidth = s * 0.058;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 0.01, -s * 0.3);
    ctx.bezierCurveTo(s * 0.15, -s * 0.12, -s * 0.15, s * 0.12, s * 0.01, s * 0.3);
    ctx.stroke();
  });
};

/** Nordis — clinic: a rounded cross split by a quiet circular channel. */
const nordis: MarkDraw = (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  const arm = s * 0.2;
  const len = s * 0.74;
  roundedRect(ctx, -len / 2, -arm / 2, len, arm, arm * 0.42);
  ctx.fill();
  roundedRect(ctx, -arm / 2, -len / 2, arm, len, arm * 0.42);
  ctx.fill();
  cut(ctx, () => {
    ctx.lineWidth = s * 0.034;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.175, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.058, 0, Math.PI * 2);
  cut(ctx, () => ctx.fill());
};

/** Fluxa — fintech: three slanted bars that climb, reading as an F and as growth. */
const fluxa: MarkDraw = (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.transform(1, 0, -0.28, 1, 0, 0);
  const w = s * 0.155;
  const base = s * 0.34;
  const bars: Array<[number, number]> = [
    [-s * 0.25, s * 0.3],
    [-s * 0.025, s * 0.49],
    [s * 0.2, s * 0.68],
  ];
  for (const [x, h] of bars) {
    roundedRect(ctx, x, base - h, w, h, w * 0.5);
    ctx.fill();
  }
  // A notch in the tallest bar: the upper arm of the F.
  cut(ctx, () => {
    roundedRect(ctx, s * 0.2 + w * 0.42, -s * 0.12, w, s * 0.06, s * 0.03);
    ctx.fill();
  });
};

/** Lex & Varga — law firm: a portico, pediment over three columns and a plinth. */
const lex: MarkDraw = (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.beginPath();
  ctx.moveTo(-s * 0.37, -s * 0.18);
  ctx.lineTo(0, -s * 0.38);
  ctx.lineTo(s * 0.37, -s * 0.18);
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineWidth = s * 0.03;
  ctx.fill();
  ctx.stroke();
  const colW = s * 0.092;
  for (const x of [-s * 0.225, 0, s * 0.225]) {
    roundedRect(ctx, x - colW / 2, -s * 0.12, colW, s * 0.36, s * 0.02);
    ctx.fill();
  }
  roundedRect(ctx, -s * 0.37, s * 0.27, s * 0.74, s * 0.075, s * 0.025);
  ctx.fill();
  // An inset in the pediment gives the solid a carved face.
  cut(ctx, () => {
    ctx.beginPath();
    ctx.arc(0, -s * 0.245, s * 0.038, 0, Math.PI * 2);
    ctx.fill();
  });
};

function leaf(ctx: CanvasRenderingContext2D, len: number, width: number) {
  ctx.beginPath();
  ctx.moveTo(0, -len / 2);
  ctx.quadraticCurveTo(width, 0, 0, len / 2);
  ctx.quadraticCurveTo(-width, 0, 0, -len / 2);
  ctx.closePath();
}

/** Maison Olea — fashion: an O ring crossed by an olive leaf, separated by a hairline. */
const olea: MarkDraw = (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.lineWidth = s * 0.075;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(s * 0.15, -s * 0.16);
  ctx.rotate(0.72);
  leaf(ctx, s * 0.44, s * 0.2);
  cut(ctx, () => {
    ctx.lineWidth = s * 0.05;
    ctx.stroke();
  });
  ctx.fill();
  ctx.restore();
};

/** Irisa Studio — photographer: a six-blade aperture. */
const irisa: MarkDraw = (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  const R = s * 0.36;
  const r = s * 0.115;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  cut(ctx, () => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = s * 0.022;
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      // Each seam leaves the hexagon along the next edge's direction, then runs to the rim.
      const dir = a + Math.PI / 2 + 0.18;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(dir) * R * 1.2, y + Math.sin(dir) * R * 1.2);
      ctx.stroke();
    }
  });
};

/** Loader / closing mark: a construction-grid monogram (circle with an A cut from it). */
const studio: MarkDraw = (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2);
  ctx.fill();
  cut(ctx, () => {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, s * 0.2);
    ctx.lineTo(0, -s * 0.2);
    ctx.lineTo(s * 0.16, s * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.085, s * 0.07);
    ctx.lineTo(s * 0.085, s * 0.07);
    ctx.stroke();
  });
};

export type MaterialKey = "metal" | "glass" | "neon" | "matte";
export type SegmentKey = "personal" | "small" | "medium" | "brand" | "startup";

export type Concept = {
  key: string;
  name: string;
  draw: MarkDraw;
  material: MaterialKey;
  /** Weights for metal, glass, neon, matte — a concept can blend two looks (e.g. satin). */
  mix?: [number, number, number, number];
  face: string;
  side: string;
  glow: string;
  segment: SegmentKey;
  industry: { ro: string; en: string };
  idea: { ro: string; en: string };
};

export const CONCEPTS: Concept[] = [
  {
    key: "fluxa",
    name: "Fluxa",
    draw: fluxa,
    material: "metal",
    face: "#c4b5fd",
    side: "#4c1d95",
    glow: "#a78bfa",
    segment: "startup",
    industry: { ro: "Fintech · startup", en: "Fintech · startup" },
    idea: {
      ro: "Trei bare care urcă formează un F. Crom violet, pentru o aplicație care arată creșterea.",
      en: "Three rising bars form an F. Violet chrome for an app that shows growth.",
    },
  },
  {
    key: "nordis",
    name: "Nordis Clinic",
    draw: nordis,
    material: "glass",
    face: "#99f6e4",
    side: "#0f766e",
    glow: "#5eead4",
    segment: "medium",
    industry: { ro: "Clinică medicală", en: "Medical clinic" },
    idea: {
      ro: "O cruce rotunjită, tăiată de un canal circular. Sticlă verde-apă: curat, calm, de încredere.",
      en: "A rounded cross split by a circular channel. Aqua glass: clean, calm, trustworthy.",
    },
  },
  {
    key: "olea",
    name: "Maison Olea",
    draw: olea,
    material: "matte",
    mix: [0.35, 0, 0, 0.65],
    face: "#f1ede4",
    side: "#8a8570",
    glow: "#d9d2bf",
    segment: "brand",
    industry: { ro: "Modă · brand", en: "Fashion · brand" },
    idea: {
      ro: "Un O traversat de o frunză de măslin. Satin perlat, pentru etichete, ambalaje și vitrine.",
      en: "An O crossed by an olive leaf. Pearl satin for labels, packaging and shop windows.",
    },
  },
  {
    key: "irisa",
    name: "Irisa Studio",
    draw: irisa,
    material: "neon",
    face: "#0b1220",
    side: "#0b1220",
    glow: "#38bdf8",
    segment: "personal",
    industry: { ro: "Fotograf · persoană fizică", en: "Photographer · individual" },
    idea: {
      ro: "O diafragmă cu șase lamele, aprinsă ca un neon. Pentru watermark, profil și intro de reel.",
      en: "A six-blade aperture lit like neon. For watermarks, profile pictures and reel intros.",
    },
  },
  {
    key: "lex",
    name: "Lex & Varga",
    draw: lex,
    material: "metal",
    face: "#f3d9a4",
    side: "#7a5a22",
    glow: "#e7c27d",
    segment: "small",
    industry: { ro: "Cabinet de avocatură", en: "Law firm" },
    idea: {
      ro: "Un portic clasic, redus la esențial. Aur periat, pentru antet, plăcuță și site.",
      en: "A classical portico reduced to essentials. Brushed gold for letterheads, plaques and web.",
    },
  },
  {
    key: "brava",
    name: "Brava Coffee",
    draw: brava,
    material: "matte",
    face: "#ead8c3",
    side: "#6b4431",
    glow: "#d6a77a",
    segment: "small",
    industry: { ro: "Cafenea de specialitate", en: "Specialty coffee" },
    idea: {
      ro: "Un bob de cafea al cărui șanț e și abur. Ceramică mată, pentru pahare, meniu și vitrină.",
      en: "A coffee bean whose seam doubles as steam. Matte ceramic for cups, menus and windows.",
    },
  },
];

export const STUDIO_MARK: MarkDraw = studio;

export const MATERIAL_WEIGHTS: Record<MaterialKey, [number, number, number, number]> = {
  metal: [1, 0, 0, 0],
  glass: [0, 1, 0, 0],
  neon: [0, 0, 1, 0],
  matte: [0, 0, 0, 1],
};

export function conceptByKey(key: string): Concept {
  return CONCEPTS.find((c) => c.key === key) ?? CONCEPTS[0];
}
