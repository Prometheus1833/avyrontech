import flawlesstudioSmall from "@/assets/portfolio-showcase/flawlesstudio-640.webp";
import flawlesstudioLarge from "@/assets/portfolio-showcase/flawlesstudio-1280.webp";
import rullerSmall from "@/assets/portfolio-showcase/ruller-640.webp";
import rullerLarge from "@/assets/portfolio-showcase/ruller-1280.webp";
import cutiutamagicaSmall from "@/assets/portfolio-showcase/cutiutamagica-640.webp";
import cutiutamagicaLarge from "@/assets/portfolio-showcase/cutiutamagica-1280.webp";
import clarlumanariSmall from "@/assets/portfolio-showcase/clarlumanari-640.webp";
import clarlumanariLarge from "@/assets/portfolio-showcase/clarlumanari-1280.webp";
import retuvoSmall from "@/assets/portfolio-showcase/retuvo-640.webp";
import retuvoLarge from "@/assets/portfolio-showcase/retuvo-1280.webp";
import detectiv_icmSmall from "@/assets/portfolio-showcase/detectiv-icm-640.webp";
import detectiv_icmLarge from "@/assets/portfolio-showcase/detectiv-icm-1280.webp";

/** Public website captures, checked 2026-11-09. */
export const SHOWCASE_IMAGES: Record<string, { small: string; large: string }> =
  {
    flawlesstudio: { small: flawlesstudioSmall, large: flawlesstudioLarge },
    ruller: { small: rullerSmall, large: rullerLarge },
    cutiutamagica: { small: cutiutamagicaSmall, large: cutiutamagicaLarge },
    clarlumanari: { small: clarlumanariSmall, large: clarlumanariLarge },
    retuvo: { small: retuvoSmall, large: retuvoLarge },
    "detectiv-icm": { small: detectiv_icmSmall, large: detectiv_icmLarge },
  };
