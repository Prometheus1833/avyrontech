/**
 * Cât de scump avem voie să randăm. Evaluat o dată pe sesiune.
 * "none" = fără WebGL: rămân posterele și fundalul CSS (crawler, mișcare
 * redusă, economie de date, dispozitive fără WebGL2).
 */
export type Tier = "high" | "mid" | "low" | "none";

let cached: Tier | null = null;

export function isRealBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (/jsdom|node\.js|HeadlessChrome.*Prerender/i.test(navigator.userAgent)) return false;
  return typeof IntersectionObserver !== "undefined" && typeof requestAnimationFrame === "function";
}

export const reducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const finePointer = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;

function hasWebgl2(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function detectTier(): Tier {
  if (cached) return cached;
  if (!isRealBrowser()) return "none";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (reducedMotion() || nav.connection?.saveData || !hasWebgl2()) return (cached = "none");
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if (cores <= 4 || memory <= 4) return (cached = "low");
  if (cores >= 8 && memory >= 8 && finePointer()) return (cached = "high");
  return (cached = "mid");
}

export const particleBudget = (tier: Tier) => (tier === "high" ? 60000 : tier === "mid" ? 30000 : tier === "low" ? 12000 : 0);
