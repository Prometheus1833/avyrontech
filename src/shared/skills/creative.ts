import type { SkillBrief } from "./model";
export const CREATIVE_VERSION = "2026-11-08.1";
export const LOGO_PALETTES = {
  violet: { label: "Tech · violet", ink: "#d9c7ff", background: "#141023" },
  sage: { label: "Natural · salvie", ink: "#d6e4c1", background: "#172b27" },
  amber: { label: "Editorial · auriu", ink: "#efd2a0", background: "#261d17" },
  mono: { label: "Monocrom", ink: "#f5f5f0", background: "#17181b" },
  cobalt: { label: "Business · cobalt", ink: "#afceff", background: "#101e38" },
} as const;
export const LOGO_STYLES = {
  combination: "Simbol + nume",
  wordmark: "Logotip",
  monogram: "Monogramă",
} as const;
export const MEDIA_PURPOSES = {
  hero: "Hero website",
  social: "Campanie social media",
  product: "Prezentare produs",
  editorial: "Editorial / prezentare",
} as const;
export const MEDIA_LIGHTS = {
  natural: "Lumină laterală naturală, umbre plauzibile, detalii reale",
  studio:
    "Lumină de studio difuză, reflexii controlate, separare clară a subiectului",
  cinematic:
    "Lumină cinematică direcțională, profunzime și tranziții tonale naturale",
} as const;
export const MEDIA_COMPOSITIONS = {
  left: "Subiect în dreapta, spațiu calm în stânga pentru text HTML",
  center: "Subiect centrat, crop sigur pe desktop și mobil",
  detail: "Detaliu de material, context suficient și focalizare selectivă",
} as const;
export const CREATIVE_CHECKS = {
  "logo-engine": [
    "Lizibilitate la 24 px și avatar",
    "Versiune monocrom / inversată",
    "Proporții, spațiu de siguranță, contrast",
    "Fonturi și drepturi confirmate; contururi finale verificate",
    "Cercetare de marcă separată; aprobare umană înainte de livrare",
  ],
  "media-generate": [
    "Subiect, lumină și materiale coerente",
    "Fără artefacte, text fals sau anatomie defectă",
    "Crop desktop / mobil și contrast pentru text",
    "Rezoluția reală și proveniența consemnate",
    "Master păstrat; variante web derivate separat",
  ],
} as const;
export function creativeQualityContext(slug: string) {
  if (slug !== "logo-engine" && slug !== "media-generate") return "";
  return `## Standard creativ AVYRON · ${CREATIVE_VERSION}\n${slug === "logo-engine" ? "Concepte originale de compoziție, nu identități finale sau mărci verificate. Nu copia mărci. Separă 2D, Logo Studio 3D și livrarea asistată AI; tarifele și licențele existente rămân în vigoare." : "Master la calitatea maximă aprobată, prompt adaptat nișei, lumină fizică, materiale realiste, fără date private neautorizate. Nu confunda promptul cu imaginea generată sau rezoluția interpolată cu detaliul nativ. Nu activa servicii plătite."}\n${CREATIVE_CHECKS[slug].map((c) => "- " + c).join("\n")}\nBrief minim, referințe relevante, istoric imuabil, fără publicare sau livrare automată.`;
}
export function mediaPrompt(b: SkillBrief) {
  return [
    `Create a premium photorealistic ${MEDIA_PURPOSES[b.media.purpose]} for ${b.activity}.`,
    `Subject: ${b.media.subject || b.activity}. Goal: ${b.objective}.`,
    `Lighting: ${MEDIA_LIGHTS[b.media.lighting]}. Composition: ${MEDIA_COMPOSITIONS[b.media.composition]}.`,
    b.preferences
      ? `Art direction: ${b.preferences}.`
      : "Art direction: refined cinematic editorial photography, niche-specific styling.",
    "Plausible perspective and physical materials, authentic fine texture, controlled highlights, natural color grading. Preserve detail at the approved native resolution. No lettering, logos, watermarks or interface elements. Never depict fictional people as actual clients or employees.",
    b.media.avoid
      ? `Avoid: ${b.media.avoid}.`
      : "Avoid: plastic CGI surfaces, oversharpening, oversaturation, stock-photo clichés.",
  ].join("\n");
}
export const LOGO_DIRECTIONS = ["Structură", "Semnătură", "Ritm"] as const;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
/** Deterministic composition studies. No scripts, URLs, embedded files or final trademark claims. */
export function logoConceptSvg(b: SkillBrief, direction: number) {
  const color = LOGO_PALETTES[b.logo.palette],
    i = Math.max(0, Math.min(2, direction)),
    name = esc(b.business),
    initials = esc(
      b.business
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => Array.from(s)[0] || "")
        .join("")
        .toLocaleUpperCase("ro"),
    );
  const mark = [
    `<rect x="40" y="64" width="90" height="90" rx="22" fill="none" stroke="${color.ink}" stroke-width="3"/><text x="85" y="124" text-anchor="middle" font-size="42" font-family="system-ui,sans-serif" font-weight="600" fill="${color.ink}">${esc(Array.from(b.business.trim())[0]||"").toLocaleUpperCase("ro")}</text>`,
    `<circle cx="85" cy="109" r="43" fill="none" stroke="${color.ink}" stroke-width="2"/><text x="85" y="122" text-anchor="middle" font-size="34" font-family="Georgia,serif" fill="${color.ink}">${initials}</text>`,
    `<path d="M42 136 65 82l22 54 22-54 23 54" fill="none" stroke="${color.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ][i];
  const type = b.logo.kind === "wordmark" ? "" : mark;
  const word =
    b.logo.kind === "monogram"
      ? `<${i === 1 ? "circle" : "rect"} ${i === 1 ? 'cx="280" cy="106" r="67"' : 'x="202" y="39" width="156" height="134" rx="' + (i === 2 ? 60 : 14) + '"'} fill="none" stroke="${color.ink}" stroke-width="${i === 2 ? 4 : 2}"/><text x="280" y="127" text-anchor="middle" font-size="60" font-family="${i === 1 ? "Georgia,serif" : "system-ui,sans-serif"}" font-weight="${i === 2 ? 700 : 500}" fill="${color.ink}">${initials}</text>`
      : `${type}<text x="${type ? 158 : 40}" y="117" font-size="${b.business.length > 24 ? 22 : 32}" ${b.business.length>24?`textLength="${type ? 350 : 470}" lengthAdjust="spacingAndGlyphs"`:""} font-family="${i === 1 ? "Georgia,serif" : "system-ui,sans-serif"}" font-weight="${i === 2 ? 700 : 500}" fill="${color.ink}">${name}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 220" role="img" aria-label="${esc("Concept " + LOGO_DIRECTIONS[i] + " pentru " + b.business)}"><title>${name} · ${LOGO_DIRECTIONS[i]} · studiu de compoziție</title><desc>Concept AVYRON, necesită proiectare originală, verificarea fonturilor și validare de marcă.</desc><rect width="560" height="220" rx="20" fill="${color.background}"/>${word}<text x="40" y="190" font-family="system-ui,sans-serif" font-size="10" letter-spacing="2" fill="${color.ink}">${esc(b.logo.tagline || "STUDIU DE COMPOZIȚIE · AVYRON")}</text></svg>`;
}
export function creativePreview(
  slug: "logo-engine" | "media-generate",
  b: SkillBrief,
) {
  const palette = LOGO_PALETTES[b.logo.palette];
  const body =
    slug === "logo-engine"
      ? `<div class="grid">${LOGO_DIRECTIONS.map((name, i) => `<article>${logoConceptSvg(b, i)}<h2>0${i + 1} · ${name}</h2><p>${["Geometrie clară și proporții stabile.", "Ritm editorial și atenție pentru tipografie.", "Energie și contrast, cu formă compactă."][i]}</p></article>`).join("")}</div><section><h2>Sistem de identitate</h2><p>${esc(b.logo.symbols || "Simbolurile și relația lor cu activitatea se confirmă cu beneficiarul.")}</p><p>De evitat: ${esc(b.logo.avoid || "asemănări cu mărci existente și detalii ilizibile")}</p><div class="swatches"><span style="background:${palette.ink};color:${palette.background}">${palette.ink}</span><span style="background:${palette.background}">${palette.background}</span><span style="background:#fff;color:#111">Monocrom</span></div></section>`
      : `<section><p class="eyebrow">${MEDIA_PURPOSES[b.media.purpose]}</p><h2>${esc(b.media.subject || b.activity)}</h2><div class="composition ${b.media.composition}"><span>Reper de compoziție · fără fotografie generată</span></div><p>${esc(MEDIA_LIGHTS[b.media.lighting])}</p><pre>${esc(mediaPrompt(b))}</pre></section>`;
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(b.business)} · atelier creativ AVYRON</title><style>*{box-sizing:border-box}body{margin:0;padding:clamp(18px,4vw,40px);background:#0d1120;color:#f5f3ef;font:15px/1.6 system-ui,sans-serif;overflow-wrap:anywhere}h1{font-size:clamp(27px,5vw,44px);line-height:1.15;margin:8px 0}h2{font-size:18px;line-height:1.3}p{color:#b4bed1}.eyebrow{font:11px/1.5 monospace;letter-spacing:.16em;color:#d2bdff}.grid{display:grid;gap:14px}.grid article,section{min-width:0;border:1px solid #ffffff20;border-radius:18px;padding:16px;background:#ffffff03;margin-top:16px}svg{display:block;width:100%;height:auto}.swatches{display:flex;flex-wrap:wrap;gap:8px}.swatches span{padding:12px;border-radius:10px;border:1px solid #ffffff20;font-size:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 monospace;color:#d0d9e9}.composition{height:260px;border-radius:14px;display:flex;align-items:end;padding:18px;background:radial-gradient(ellipse at 72% 38%,#a78bfa50,transparent 38%),linear-gradient(135deg,#24362d,#151323)}.composition span{font-size:12px;background:#000a;padding:8px;border-radius:8px}.center{background:radial-gradient(ellipse at 50% 40%,#b5c8a56a,transparent 45%),#161f22}.detail{background:linear-gradient(120deg,#323f45,#171522)}@media(min-width:600px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}.grid article{padding:10px}.grid h2{font-size:15px}.grid p{font-size:12px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}</style></head><body><header><p class="eyebrow">AVYRON · ${slug === "logo-engine" ? "LOGO ENGINE" : "MEDIA GENERATE"} · ${CREATIVE_VERSION}</p><h1>${esc(b.business)}</h1><p>${esc(b.activity)} · ${esc(b.objective)}</p></header>${body}<section><h2>Verificare înainte de livrare</h2><ul>${CREATIVE_CHECKS[slug].map((c) => `<li>${c}</li>`).join("")}</ul><p>${slug === "logo-engine" ? "Aceste SVG-uri sunt repere editabile de compoziție. Textul nu este convertit în contururi. Nu reprezintă un logo final sau o marcă verificată." : "Prompt pregătit; numai un rezultat verificat al modelului poate fi numit imagine generată. Rezoluția reală se raportează separat de o eventuală interpolare."}</p><p>Concept privat, fără publicare, trimitere, tarifare sau drepturi suplimentare automate.</p></section></body></html>`;
}
