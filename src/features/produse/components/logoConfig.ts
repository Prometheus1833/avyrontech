/** Forma configurației de logo și valorile din care pornește studioul. */

export type LogoMaterial = "glass" | "metal" | "neon" | "matte" | "particles";
export type LogoSymbol = "none" | "dot" | "ring" | "triangle" | "monogram";

export type LogoConfig = {
  text: string;
  symbol: LogoSymbol;
  material: LogoMaterial;
  colorA: string;
  colorB: string;
  depth: number;
  spin: boolean;
  letterSpacing: number;
};

export const DEFAULT_LOGO: LogoConfig = {
  text: "AVYRON",
  symbol: "dot",
  material: "glass",
  colorA: "#a78bfa",
  colorB: "#22d3ee",
  depth: 22,
  spin: true,
  letterSpacing: 6,
};
