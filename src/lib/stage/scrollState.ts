/**
 * Starea de scroll partajată între DOM și WebGL.
 *
 * Un obiect mutabil, nu state React: fundalul 3D îl citește în bucla de
 * randare, la 60 de cadre pe secundă, iar pagina îl scrie o dată per eveniment
 * de scroll. Dacă am trece prin props, am forța un render React pe cadru.
 */
export type StageScrollState = {
  /** Progresul total pe pagină, 0 la început, 1 la final. */
  progress: number;
  /** Nuanța secțiunii active, în grade. */
  hue: number;
  /** Nuanța spre care interpolăm — schimbarea de secțiune e progresivă. */
  targetHue: number;
  /** Impuls de tranziție, 0..1, crescut la trecerea dintre secțiuni. */
  warp: number;
  /** Viteza de scroll normalizată, pentru efecte care reacționează la ritm. */
  velocity: number;
};

export const stageScroll: StageScrollState = {
  progress: 0,
  hue: 265,
  targetHue: 265,
  warp: 0,
  velocity: 0,
};

export function pulseWarp(amount = 1) {
  stageScroll.warp = Math.min(1, stageScroll.warp + amount);
}
