import type { ComponentType } from "react";
import type { DemoKey } from "@/data/bibliotecaCatalog";
import type { StageEffectProps } from "@/components/biblioteca/StageSlot";

/**
 * Registrul demo-urilor.
 *
 * Două familii, pentru că se comportă diferit: cele pe DOM sau canvas 2D se
 * montează direct, iar cele pe WebGL trec prin StageSlot, care le dă treapta
 * de calitate, posterul static și, mai ales, le eliberează contextul când
 * secțiunea iese din ecran. Ambele sunt importuri dinamice: nimic din ele nu
 * ajunge în browser înainte ca secțiunea să se apropie.
 */
export const DEMO_LOADERS: Partial<Record<DemoKey, () => Promise<{ default: ComponentType }>>> = {
  "tilt-card": () => import("./TiltCard"),
  "holo-card": () => import("./HoloCard"),
  "marquee-scroll": () => import("./MarqueeScroll"),
  "cart-particles": () => import("./CartParticles"),
  "flip-filters": () => import("./FlipFilters"),
  "device-scroll": () => import("./DeviceScroll"),
  "theme-wave": () => import("./ThemeWave"),
  "ai-orb": () => import("./AiOrb"),
  "chat-stream": () => import("./ChatStream"),
  "visual-diff": () => import("./VisualDiff"),
  "cwv-gauge": () => import("./CwvGauge"),
  "reading-progress": () => import("./ReadingProgress"),
  "cover-parallax": () => import("./CoverParallax"),
  "logo-particles": () => import("./LogoParticles"),
  "svg-draw": () => import("./SvgDraw"),
  "curtain-transition": () => import("./CurtainTransition"),
  "post-generator": () => import("./PostGenerator"),
};

export const WEBGL_LOADERS: Partial<
  Record<DemoKey, () => Promise<{ default: ComponentType<StageEffectProps> }>>
> = {
  "hero-displacement": () => import("../effects/HeroDisplacement"),
  "cinematic-descent": () => import("../effects/CinematicDescent"),
  "product-configurator": () => import("../effects/ProductConfigurator"),
  "curved-gallery": () => import("../effects/CurvedGallery"),
  "logo-extrude": () => import("../effects/LogoExtrude"),
};
