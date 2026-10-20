import type { MaterialKey } from "./marks";

export type StudioFont = "display" | "editorial" | "mono";
export type StudioSettings = {
  font: StudioFont;
  material: MaterialKey;
  depth: number;
  bevel: number;
  roughness: number;
  exposure: number;
  emission: number;
  lighting: number;
  yaw: number;
  pitch: number;
  scale: number;
  motion: "pointer" | "idle" | "spin" | "manual";
};

export const STUDIO_PRESETS: Array<{ key: string; label: { ro: string; en: string }; swatch: number; settings: StudioSettings }> = [
  { key: "chrome", label: { ro: "Crom de studio", en: "Studio chrome" }, swatch: 0, settings: { font: "display", material: "metal", depth: .2, bevel: .045, roughness: .22, exposure: 1, emission: 1, lighting: 0, yaw: -.22, pitch: .08, scale: 1, motion: "pointer" } },
  { key: "editorial", label: { ro: "Aur editorial", en: "Editorial gold" }, swatch: 2, settings: { font: "editorial", material: "metal", depth: .12, bevel: .025, roughness: .48, exposure: 1.05, emission: .7, lighting: 1, yaw: -.16, pitch: .06, scale: 1, motion: "idle" } },
  { key: "crystal", label: { ro: "Cristal arctic", en: "Arctic crystal" }, swatch: 1, settings: { font: "display", material: "glass", depth: .28, bevel: .065, roughness: .12, exposure: 1.1, emission: .8, lighting: 0, yaw: -.32, pitch: .12, scale: .96, motion: "pointer" } },
  { key: "neon", label: { ro: "Neon nocturn", en: "Night neon" }, swatch: 4, settings: { font: "mono", material: "neon", depth: .14, bevel: .035, roughness: .25, exposure: .95, emission: 1.3, lighting: 2, yaw: -.2, pitch: .04, scale: 1, motion: "idle" } },
];

/** Max edge, never an upscale of the screen buffer. */
export function exportDimensions(aspect: number, edge: 1920 | 3840) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  return safeAspect >= 1
    ? { width: edge, height: Math.max(1, Math.round(edge / safeAspect)) }
    : { width: Math.max(1, Math.round(edge * safeAspect)), height: edge };
}
