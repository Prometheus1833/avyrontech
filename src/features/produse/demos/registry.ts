import { type ComponentType, type LazyExoticComponent } from "react";
import type { PropValues } from "../data/types";

export type DemoProps = {
  /** Valorile din Editor Mode (sau valorile implicite ale produsului). */
  values: PropValues;
  lang: "ro" | "en";
  /** Fals când demo-ul e în afara ecranului: animațiile grele se opresc. */
  active: boolean;
};

export type DemoComponent = LazyExoticComponent<ComponentType<DemoProps>>;

/**
 * Registrul demo-urilor live. Fiecare intrare e un chunk separat, cerut abia
 * când demo-ul intră în ecran — grila rămâne ușoară chiar cu 50 de produse.
 * Produsele fără demo primesc posterul procedural (`DemoStage`).
 */
export const DEMOS: Record<string, DemoComponent> = {
  "ripple-button": lazyWithRetry(() => import("./RippleButtonDemo")),
  "magnetic-button": lazyWithRetry(() => import("./MagneticButtonDemo")),
  "glow-card": lazyWithRetry(() => import("./GlowCardDemo")),
  "tilt-card": lazyWithRetry(() => import("./TiltCardDemo")),
  "holo-card": lazyWithRetry(() => import("./HoloCardDemo")),
  "liquid-glass": lazyWithRetry(() => import("./LiquidGlassDemo")),
  "split-reveal": lazyWithRetry(() => import("./SplitRevealDemo")),
  "scramble-text": lazyWithRetry(() => import("./ScrambleTextDemo")),
  marquee: lazyWithRetry(() => import("./MarqueeDemo")),
  toasts: lazyWithRetry(() => import("./ToastsDemo")),
  ticker: lazyWithRetry(() => import("./TickerDemo")),
  "mesh-gradient": lazyWithRetry(() => import("./MeshGradientDemo")),
  aurora: lazyWithRetry(() => import("./AuroraDemo")),
  "spotlight-grid": lazyWithRetry(() => import("./SpotlightGridDemo")),
  "fluid-tabs": lazyWithRetry(() => import("./FluidTabsDemo")),
  "type-hero": lazyWithRetry(() => import("./TypeHeroDemo")),
  "login-glass": lazyWithRetry(() => import("./LoginGlassDemo")),
  "pricing-toggle": lazyWithRetry(() => import("./PricingToggleDemo")),
  faq: lazyWithRetry(() => import("./FaqDemo")),
  "loader-counter": lazyWithRetry(() => import("./LoaderCounterDemo")),
  "email-routing": lazyWithRetry(() => import("./EmailRoutingDemo")),
  "csv-json": lazyWithRetry(() => import("./CsvJsonDemo")),
  "meta-tags": lazyWithRetry(() => import("./MetaTagsDemo")),
  contrast: lazyWithRetry(() => import("./ContrastDemo")),
  jsonld: lazyWithRetry(() => import("./JsonLdDemo")),
  "api-weather": lazyWithRetry(() => import("./WeatherDemo")),
  "api-fx": lazyWithRetry(() => import("./FxDemo")),
  "api-anaf": lazyWithRetry(() => import("./AnafDemo")),
  "particle-lab": lazyWithRetry(() => import("./ParticleLabDemo")),
  "particle-hero": lazyWithRetry(() => import("./ParticleLabDemo")),
  "logo-studio": lazyWithRetry(() => import("./LogoStudioDemo")),
  "launch-checklist": lazyWithRetry(() => import("./ChecklistDemo")),
  "cursor-trail": lazyWithRetry(() => import("./CursorTrailDemo")),
  "dynamic-island": lazyWithRetry(() => import("./DynamicIslandDemo")),
  "command-palette": lazyWithRetry(() => import("./CommandPaletteDemo")),
  "parallax-hero": lazyWithRetry(() => import("./ParallaxHeroDemo")),
  "login-3d": lazyWithRetry(() => import("./Login3dDemo")),
  "footer-mega": lazyWithRetry(() => import("./FooterMegaDemo")),
  "footer-reveal": lazyWithRetry(() => import("./FooterRevealDemo")),
  "loader-particles": lazyWithRetry(() => import("./LoaderParticlesDemo")),
  "tpl-saas": lazyWithRetry(() => import("./TplSaasDemo")),
  "tpl-portfolio": lazyWithRetry(() => import("./TplPortfolioDemo")),
  "tpl-linkbio": lazyWithRetry(() => import("./TplLinkbioDemo")),
  "light-strands": lazyWithRetry(() => import("./LightStrandsDemo")),
  globe: lazyWithRetry(() => import("./GlobeDemo")),
  displacement: lazyWithRetry(() => import("./DisplacementDemo")),
  qr: lazyWithRetry(() => import("./QrDemo")),
  "api-bnr": lazyWithRetry(() => import("./BnrDemo")),
  "api-countries": lazyWithRetry(() => import("./CountriesDemo")),
  "api-geo": lazyWithRetry(() => import("./GeoDemo")),
  "doc-seo": lazyWithRetry(() => import("./DocSeoDemo")),
  "monogram-kit": lazyWithRetry(() => import("./MonogramKitDemo")),

  // —— valul 2 (24 septembrie) ——
  "stepper": lazyWithRetry(() => import("./StepperDemo")),
  "theme-switch": lazyWithRetry(() => import("./ThemeSwitchDemo")),
  "floating-input": lazyWithRetry(() => import("./FloatingInputDemo")),
  "data-table": lazyWithRetry(() => import("./DataTableDemo")),
  "file-dropzone": lazyWithRetry(() => import("./FileDropzoneDemo")),
  "smart-tooltip": lazyWithRetry(() => import("./SmartTooltipDemo")),
  "scroll-progress": lazyWithRetry(() => import("./ScrollProgressDemo")),
  "inertia-carousel": lazyWithRetry(() => import("./InertiaCarouselDemo")),
  "logo-wall": lazyWithRetry(() => import("./LogoWallDemo")),
  "process-timeline": lazyWithRetry(() => import("./ProcessTimelineDemo")),
  "before-after": lazyWithRetry(() => import("./BeforeAfterDemo")),
  "testimonials-3d": lazyWithRetry(() => import("./Testimonials3dDemo")),
  "cta-gradient": lazyWithRetry(() => import("./CtaGradientDemo")),
  "noise-field": lazyWithRetry(() => import("./NoiseFieldDemo")),
  "tunnel-gallery": lazyWithRetry(() => import("./TunnelGalleryDemo")),
  "curtain-transition": lazyWithRetry(() => import("./CurtainTransitionDemo")),
  "favicon-studio": lazyWithRetry(() => import("./FaviconStudioDemo")),
  "image-optimizer": lazyWithRetry(() => import("./ImageOptimizerDemo")),
  "palette-studio": lazyWithRetry(() => import("./PaletteStudioDemo")),
  "holidays": lazyWithRetry(() => import("./HolidaysDemo")),
  "github-card": lazyWithRetry(() => import("./GithubCardDemo")),

  // —— valul 3: piața românească (26 septembrie) ——
  "cookie-consent": lazyWithRetry(() => import("./CookieConsentDemo")),
  "anpc-bar": lazyWithRetry(() => import("./AnpcBarDemo")),
  "iban-validator": lazyWithRetry(() => import("./IbanValidatorDemo")),
  "vat-calculator": lazyWithRetry(() => import("./VatCalculatorDemo")),
  "opening-hours": lazyWithRetry(() => import("./OpeningHoursDemo")),
  "billing-form": lazyWithRetry(() => import("./BillingFormDemo")),
  "osm-map": lazyWithRetry(() => import("./OsmMapDemo")),
  "whatsapp-order": lazyWithRetry(() => import("./WhatsappOrderDemo")),
  "plan-compare": lazyWithRetry(() => import("./PlanCompareDemo")),
  "project-estimator": lazyWithRetry(() => import("./ProjectEstimatorDemo")),
};
