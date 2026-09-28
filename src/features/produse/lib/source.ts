/**
 * Sursele publice ale produselor gratuite.
 *
 * Fiecare fișier din `source/` e încărcat ca text (`?raw`), într-un chunk
 * separat, cerut doar când cineva deschide tabul „Cod”. Așa codul afișat e
 * exact codul care rulează în demo — nu o copie care poate rămâne în urmă.
 * Produsele plătite nu au fișier aici: codul lor se livrează după verificarea
 * dreptului de acces (F2, din R2 privat).
 */

const RAW = import.meta.glob("../source/*.{tsx,ts}", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;

/** slug de produs → fișierul lui din `source/`. */
export const SOURCE_FILE: Record<string, string> = {
  "buton-unda-refractie": "RippleButton.tsx",
  "buton-magnetic": "MagneticButton.tsx",
  "card-contur-luminos": "GlowCardGrid.tsx",
  "panou-liquid-glass": "LiquidGlass.tsx",
  "text-dezvaluit-litere": "SplitReveal.tsx",
  "text-decodat": "ScrambleText.tsx",
  "marquee-reactiv-scroll": "ScrollMarquee.tsx",
  "notificari-6-tipuri": "ToastStack.tsx",
  "contor-animat": "NumberTicker.tsx",
  "fundal-gradient-mesh": "MeshGradient.tsx",
  "grila-reflector": "SpotlightGrid.tsx",
  "taburi-indicator-fluid": "FluidTabs.tsx",
  "hero-tipografic-gradient": "TypeHero.tsx",
  "login-sticla-aurora": "GlassLogin.tsx",
  "preturi-lunar-anual": "PricingToggle.tsx",
  "faq-accordion-seo": "FaqAccordion.tsx",
  "loading-contor-cortina": "CounterLoader.tsx",
  "convertor-csv-json": "CsvJsonStudio.tsx",
  "generator-meta-tag": "MetaTagsStudio.tsx",
  "verificator-contrast": "ContrastChecker.tsx",
  "generator-json-ld": "JsonLdStudio.tsx",
  "api-open-meteo": "WeatherWidget.tsx",
  "api-frankfurter": "CurrencyConverter.tsx",
  "api-anaf-cui": "anafWorker.ts",
  "api-curs-bnr": "bnrRates.ts",
  "api-rest-countries": "CountrySelect.tsx",
  "api-geocodare-osm": "geocodeWorker.ts",
  "subsol-mega-newsletter": "MegaFooter.tsx",
  "template-link-in-bio": "LinkInBio.tsx",
  "imagine-displacement": "DisplacementImage.tsx",
  "generator-cod-qr": "QrStudio.tsx",
  "checklist-lansare-site": "LaunchChecklist.tsx",
  // —— valul 2 (24 septembrie) ——
  "stepper-proces": "Stepper.tsx",
  "comutator-tema-zi-noapte": "ThemeSwitch.tsx",
  "input-eticheta-flotanta": "FloatingInput.tsx",
  "tabel-date-sortabil": "DataTable.tsx",
  "zona-incarcare-fisiere": "FileDropzone.tsx",
  "tooltip-inteligent": "SmartTooltip.tsx",
  "bara-progres-citire": "ScrollProgress.tsx",
  "sectiune-zid-logouri": "LogoWall.tsx",
  "sectiune-timeline-proces": "ProcessTimeline.tsx",
  "sectiune-inainte-dupa": "BeforeAfter.tsx",
  "fundal-zgomot-organic": "NoiseField.tsx",
  "generator-favicon": "FaviconStudio.tsx",
  "optimizator-imagini-webp": "ImageOptimizer.tsx",
  "generator-palete-contrast": "PaletteStudio.tsx",
  "api-zile-libere": "HolidaysWidget.tsx",
  "api-github-depozit": "GithubCard.tsx",
  // —— valul 3 (26 septembrie) ——
  "banner-cookie-gdpr": "CookieConsent.tsx",
  "bara-anpc-sol": "AnpcBar.tsx",
  "validator-iban": "IbanValidator.tsx",
  "calculator-tva": "VatCalculator.tsx",
  "program-cu-sarbatori": "OpeningHours.tsx",
  "formular-date-facturare": "BillingForm.tsx",
  "harta-locatie-osm": "OsmMap.tsx",
  "buton-comanda-whatsapp": "WhatsappOrder.tsx",
  "tabel-comparatie-pachete": "PlanCompare.tsx",
};

export const hasSource = (slug: string) => Boolean(SOURCE_FILE[slug]);

export async function sourceFor(slug: string): Promise<string | null> {
  const file = SOURCE_FILE[slug];
  if (!file) return null;
  const loader = RAW[`../source/${file}`];
  if (!loader) return null;
  try {
    return await loader();
  } catch {
    return null;
  }
}
