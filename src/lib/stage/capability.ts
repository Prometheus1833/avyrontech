/**
 * Detectarea treptei de calitate pentru efectele 3D ale Bibliotecii.
 *
 * Rulează o singură dată per sesiune de pagină și decide cât de scump avem voie
 * să randăm. Rezultatul „none" înseamnă că nu pornim deloc WebGL: rămâne
 * posterul static, care e oricum ceea ce vede un crawler sau un utilizator care
 * a cerut mai puțină mișcare.
 */

export type QualityTier = "ultra" | "standard" | "usor" | "none";

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

let cached: QualityTier | null = null;

/**
 * Adevărat doar într-un browser real.
 *
 * Pagina e prerenderată la build într-un DOM simulat, care nu are WebGL,
 * `getTotalLength` sau `requestAnimationFrame` cu timp real. Demo-urile nu au
 * ce căuta acolo: prerenderul are nevoie de textul catalogului, nu de animații.
 */
export function isRealBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (/jsdom|node\.js/i.test(navigator.userAgent)) return false;
  return typeof IntersectionObserver !== "undefined" && typeof requestAnimationFrame === "function";
}

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function supportsWebgl2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    // Contextele WebGL sunt o resursă limitată. Îl eliberăm imediat după probă.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Treapta de calitate a dispozitivului curent. Memorată după prima evaluare. */
export function detectTier(): QualityTier {
  if (cached) return cached;
  if (!isRealBrowser()) return "none";

  const nav = navigator as NavigatorWithHints;

  if (prefersReducedMotion()) return (cached = "none");
  if (nav.connection?.saveData) return (cached = "none");
  if (!supportsWebgl2()) return (cached = "none");

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const connection = nav.connection?.effectiveType ?? "";
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  if (cores <= 4 || memory <= 4 || /(^|-)2g$/.test(connection)) return (cached = "usor");
  if (cores >= 8 && memory >= 8 && !coarse) return (cached = "ultra");
  return (cached = "standard");
}

/** Interval de device pixel ratio permis pe treapta dată. */
export function dprFor(tier: QualityTier): [number, number] {
  if (tier === "ultra") return [1, 2];
  if (tier === "standard") return [1, 1.5];
  return [1, 1];
}

/** Cât de puternic are voie să fie un efect pe treapta dată. */
export function intensityFor(tier: QualityTier): number {
  if (tier === "ultra") return 1;
  if (tier === "standard") return 0.8;
  return 0.55;
}

export type MotionProfile = {
  tier: QualityTier;
  maxDpr: number;
  targetFps: 0 | 30 | 45 | 60;
  particleScale: number;
  postProcessing: boolean;
  enhancedMotion: boolean;
};

/**
 * Buget unic pentru toate efectele publice. Calitatea maximă rămâne prioritară
 * pe hardware capabil, iar telefoanele lente reduc rezoluția, particulele și
 * frecvența cadrelor înainte să ajungă să sacadeze interfața.
 */
export function motionProfile(tier = detectTier()): MotionProfile {
  if (tier === "ultra") return { tier, maxDpr: 2, targetFps: 60, particleScale: 1, postProcessing: true, enhancedMotion: true };
  if (tier === "standard") return { tier, maxDpr: 1.5, targetFps: 45, particleScale: 0.72, postProcessing: false, enhancedMotion: true };
  if (tier === "usor") return { tier, maxDpr: 1.15, targetFps: 30, particleScale: 0.42, postProcessing: false, enhancedMotion: false };
  return { tier, maxDpr: 1, targetFps: 0, particleScale: 0, postProcessing: false, enhancedMotion: false };
}

/** Doar pentru teste — golește memorarea. */
export function resetTierCache(): void {
  cached = null;
}
