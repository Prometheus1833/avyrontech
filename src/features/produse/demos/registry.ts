import { lazy, type ComponentType, type LazyExoticComponent } from "react";
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
  "ripple-button": lazy(() => import("./RippleButtonDemo")),
  "magnetic-button": lazy(() => import("./MagneticButtonDemo")),
  "glow-card": lazy(() => import("./GlowCardDemo")),
  "tilt-card": lazy(() => import("./TiltCardDemo")),
  "holo-card": lazy(() => import("./HoloCardDemo")),
  "liquid-glass": lazy(() => import("./LiquidGlassDemo")),
  "split-reveal": lazy(() => import("./SplitRevealDemo")),
  "scramble-text": lazy(() => import("./ScrambleTextDemo")),
  marquee: lazy(() => import("./MarqueeDemo")),
  toasts: lazy(() => import("./ToastsDemo")),
  ticker: lazy(() => import("./TickerDemo")),
  "mesh-gradient": lazy(() => import("./MeshGradientDemo")),
  aurora: lazy(() => import("./AuroraDemo")),
  "spotlight-grid": lazy(() => import("./SpotlightGridDemo")),
  "fluid-tabs": lazy(() => import("./FluidTabsDemo")),
  "type-hero": lazy(() => import("./TypeHeroDemo")),
  "login-glass": lazy(() => import("./LoginGlassDemo")),
  "pricing-toggle": lazy(() => import("./PricingToggleDemo")),
  faq: lazy(() => import("./FaqDemo")),
  "loader-counter": lazy(() => import("./LoaderCounterDemo")),
  "email-routing": lazy(() => import("./EmailRoutingDemo")),
  "csv-json": lazy(() => import("./CsvJsonDemo")),
  "meta-tags": lazy(() => import("./MetaTagsDemo")),
  contrast: lazy(() => import("./ContrastDemo")),
  jsonld: lazy(() => import("./JsonLdDemo")),
  "api-weather": lazy(() => import("./WeatherDemo")),
  "api-fx": lazy(() => import("./FxDemo")),
  "api-anaf": lazy(() => import("./AnafDemo")),
  "particle-lab": lazy(() => import("./ParticleLabDemo")),
  "particle-hero": lazy(() => import("./ParticleLabDemo")),
  "logo-studio": lazy(() => import("./LogoStudioDemo")),
  "launch-checklist": lazy(() => import("./ChecklistDemo")),
  "cursor-trail": lazy(() => import("./CursorTrailDemo")),
  "dynamic-island": lazy(() => import("./DynamicIslandDemo")),
  "command-palette": lazy(() => import("./CommandPaletteDemo")),
  "parallax-hero": lazy(() => import("./ParallaxHeroDemo")),
  "login-3d": lazy(() => import("./Login3dDemo")),
  "footer-mega": lazy(() => import("./FooterMegaDemo")),
  "footer-reveal": lazy(() => import("./FooterRevealDemo")),
  "loader-particles": lazy(() => import("./LoaderParticlesDemo")),
  "tpl-saas": lazy(() => import("./TplSaasDemo")),
  "tpl-portfolio": lazy(() => import("./TplPortfolioDemo")),
  "tpl-linkbio": lazy(() => import("./TplLinkbioDemo")),
  "light-strands": lazy(() => import("./LightStrandsDemo")),
  globe: lazy(() => import("./GlobeDemo")),
  displacement: lazy(() => import("./DisplacementDemo")),
  qr: lazy(() => import("./QrDemo")),
  "api-bnr": lazy(() => import("./BnrDemo")),
  "api-countries": lazy(() => import("./CountriesDemo")),
  "api-geo": lazy(() => import("./GeoDemo")),
  "doc-seo": lazy(() => import("./DocSeoDemo")),
  "monogram-kit": lazy(() => import("./MonogramKitDemo")),

  // —— valul 2 (24 septembrie) ——
  "stepper": lazy(() => import("./StepperDemo")),
  "theme-switch": lazy(() => import("./ThemeSwitchDemo")),
  "floating-input": lazy(() => import("./FloatingInputDemo")),
  "data-table": lazy(() => import("./DataTableDemo")),
  "file-dropzone": lazy(() => import("./FileDropzoneDemo")),
  "smart-tooltip": lazy(() => import("./SmartTooltipDemo")),
  "scroll-progress": lazy(() => import("./ScrollProgressDemo")),
  "inertia-carousel": lazy(() => import("./InertiaCarouselDemo")),
  "logo-wall": lazy(() => import("./LogoWallDemo")),
  "process-timeline": lazy(() => import("./ProcessTimelineDemo")),
  "before-after": lazy(() => import("./BeforeAfterDemo")),
  "testimonials-3d": lazy(() => import("./Testimonials3dDemo")),
  "cta-gradient": lazy(() => import("./CtaGradientDemo")),
  "noise-field": lazy(() => import("./NoiseFieldDemo")),
  "tunnel-gallery": lazy(() => import("./TunnelGalleryDemo")),
  "curtain-transition": lazy(() => import("./CurtainTransitionDemo")),
  "favicon-studio": lazy(() => import("./FaviconStudioDemo")),
  "image-optimizer": lazy(() => import("./ImageOptimizerDemo")),
  "palette-studio": lazy(() => import("./PaletteStudioDemo")),
  "holidays": lazy(() => import("./HolidaysDemo")),
  "github-card": lazy(() => import("./GithubCardDemo")),

  // —— valul 3: piața românească (26 septembrie) ——
  "cookie-consent": lazy(() => import("./CookieConsentDemo")),
  "anpc-bar": lazy(() => import("./AnpcBarDemo")),
  "iban-validator": lazy(() => import("./IbanValidatorDemo")),
  "vat-calculator": lazy(() => import("./VatCalculatorDemo")),
  "opening-hours": lazy(() => import("./OpeningHoursDemo")),
  "billing-form": lazy(() => import("./BillingFormDemo")),
  "osm-map": lazy(() => import("./OsmMapDemo")),
  "whatsapp-order": lazy(() => import("./WhatsappOrderDemo")),
  "plan-compare": lazy(() => import("./PlanCompareDemo")),
  "project-estimator": lazy(() => import("./ProjectEstimatorDemo")),
};
