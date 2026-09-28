/** Forma configurației laboratorului de particule și presetul de start. */

export type Formation = "sphere" | "cube" | "helix" | "torus" | "text" | "image";

export type LabConfig = {
  formation: Formation;
  count: number;
  speed: number;
  glow: number;
  size: number;
  turbulence: number;
  attraction: number;
  autoRotate: boolean;
  colorA: string;
  colorB: string;
  text: string;
  style: "points" | "sparks" | "soft";
};

export const DEFAULT_CONFIG: LabConfig = {
  formation: "sphere",
  count: 24000,
  speed: 1,
  glow: 0.75,
  size: 1.6,
  turbulence: 0.35,
  attraction: 0.5,
  autoRotate: true,
  colorA: "#8b5cf6",
  colorB: "#22d3ee",
  text: "AVYRON",
  style: "soft",
};
