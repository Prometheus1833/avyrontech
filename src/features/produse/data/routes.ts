/**
 * Rutele publice ale paginii Produse, pentru prerender, sitemap și hreflang.
 *
 * Fișierul e intenționat „prost": doar liste de segmente, fără catalogul
 * complet. Motivul e că Worker-ul Cloudflare împachetează `publicRoutes.ts`,
 * iar acolo nu vrem zeci de kB de descrieri bilingve. Testul
 * `src/test/produse.test.ts` verifică ca listele să fie identice cu catalogul.
 */

export const PRODUSE_BASE = { ro: "/produse-avyron", en: "/en/avyron-products" } as const;

/** Segmentele de tip, în ordinea din taxonomie. */
export const PRODUSE_TYPE_SEGMENTS: Array<{ ro: string; en: string }> = [
  { ro: "componente", en: "components" },
  { ro: "sectiuni", en: "sections" },
  { ro: "template-uri", en: "templates" },
  { ro: "efecte-3d", en: "3d-effects" },
  { ro: "unelte", en: "tools" },
  { ro: "api-uri", en: "apis" },
  { ro: "documente", en: "documents" },
  { ro: "logo", en: "logo" },
];

/**
 * Colecțiile. Lista e duplicată aici (segmente, fără texte) ca fișierul să
 * rămână ușor pentru Worker; testul verifică să corespundă cu `collections.ts`.
 */
export const PRODUSE_COLLECTION_SEGMENTS: Array<{ ro: string; en: string }> = [
  { ro: "kit-landing-page", en: "landing-page-kit" },
  { ro: "primul-ecran", en: "first-screen" },
  { ro: "detalii-de-conversie", en: "conversion-details" },
  { ro: "formulare-care-se-completeaza", en: "forms-people-finish" },
  { ro: "dovezi-si-incredere", en: "proof-and-trust" },
  { ro: "unelte-de-livrare", en: "delivery-tools" },
  { ro: "integrari-gratuite", en: "free-integrations" },
  { ro: "tranzitii-si-loading", en: "transitions-and-loading" },
  { ro: "magazin-romanesc", en: "romanian-shop" },
  { ro: "conformitate-si-legal", en: "compliance-and-legal" },
];

/** Paginile fără listă: ghidul și întrebările frecvente. */
export const PRODUSE_STATIC_SEGMENTS: Array<{ ro: string; en: string }> = [
  { ro: "ghid", en: "guide" },
  { ro: "intrebari-frecvente", en: "faq" },
  { ro: "colectii", en: "collections" },
];

/** Fiecare produs, ca pereche segment-de-tip + slug. */
export const PRODUSE_ITEM_ROUTES: Array<{ type: string; slug: string }> = [
  { type: "logo", slug: "logo-studio-3d" },
  { type: "logo", slug: "kit-monograme" },
  { type: "componente", slug: "buton-unda-refractie" },
  { type: "componente", slug: "buton-magnetic" },
  { type: "componente", slug: "card-contur-luminos" },
  { type: "componente", slug: "card-3d-tilt-lumina" },
  { type: "componente", slug: "card-holografic" },
  { type: "componente", slug: "panou-liquid-glass" },
  { type: "componente", slug: "cursor-magnetic-urma" },
  { type: "componente", slug: "text-dezvaluit-litere" },
  { type: "componente", slug: "text-decodat" },
  { type: "componente", slug: "marquee-reactiv-scroll" },
  { type: "componente", slug: "notificari-6-tipuri" },
  { type: "componente", slug: "notificare-insula-dinamica" },
  { type: "componente", slug: "contor-animat" },
  { type: "componente", slug: "fundal-gradient-mesh" },
  { type: "componente", slug: "fundal-aurora-shader" },
  { type: "componente", slug: "grila-reflector" },
  { type: "componente", slug: "taburi-indicator-fluid" },
  { type: "componente", slug: "paleta-comenzi" },
  { type: "sectiuni", slug: "hero-spatial-particule" },
  { type: "sectiuni", slug: "hero-parallax-3-straturi" },
  { type: "sectiuni", slug: "hero-tipografic-gradient" },
  { type: "sectiuni", slug: "login-3d-card" },
  { type: "sectiuni", slug: "login-sticla-aurora" },
  { type: "sectiuni", slug: "preturi-lunar-anual" },
  { type: "sectiuni", slug: "faq-accordion-seo" },
  { type: "sectiuni", slug: "subsol-mega-newsletter" },
  { type: "sectiuni", slug: "subsol-dezvaluit-scroll" },
  { type: "sectiuni", slug: "loading-particule" },
  { type: "sectiuni", slug: "loading-contor-cortina" },
  { type: "sectiuni", slug: "email-routing-animat" },
  { type: "template-uri", slug: "template-landing-saas" },
  { type: "template-uri", slug: "template-portofoliu-3d" },
  { type: "template-uri", slug: "template-link-in-bio" },
  { type: "efecte-3d", slug: "particle-lab" },
  { type: "efecte-3d", slug: "fire-lumina" },
  { type: "efecte-3d", slug: "glob-puncte-arce" },
  { type: "efecte-3d", slug: "imagine-displacement" },
  { type: "unelte", slug: "convertor-csv-json" },
  { type: "unelte", slug: "generator-json-ld" },
  { type: "unelte", slug: "generator-meta-tag" },
  { type: "unelte", slug: "verificator-contrast" },
  { type: "unelte", slug: "generator-cod-qr" },
  { type: "api-uri", slug: "api-anaf-cui" },
  { type: "api-uri", slug: "api-curs-bnr" },
  { type: "api-uri", slug: "api-open-meteo" },
  { type: "api-uri", slug: "api-rest-countries" },
  { type: "api-uri", slug: "api-frankfurter" },
  { type: "api-uri", slug: "api-geocodare-osm" },
  { type: "documente", slug: "checklist-lansare-site" },
  { type: "documente", slug: "ghid-seo-tehnic" },
  { type: "componente", slug: "stepper-proces" },
  { type: "componente", slug: "comutator-tema-zi-noapte" },
  { type: "componente", slug: "input-eticheta-flotanta" },
  { type: "componente", slug: "tabel-date-sortabil" },
  { type: "componente", slug: "zona-incarcare-fisiere" },
  { type: "componente", slug: "tooltip-inteligent" },
  { type: "componente", slug: "bara-progres-citire" },
  { type: "componente", slug: "carusel-inertie" },
  { type: "sectiuni", slug: "sectiune-zid-logouri" },
  { type: "sectiuni", slug: "sectiune-timeline-proces" },
  { type: "sectiuni", slug: "sectiune-inainte-dupa" },
  { type: "sectiuni", slug: "sectiune-testimoniale-3d" },
  { type: "sectiuni", slug: "sectiune-cta-gradient" },
  { type: "template-uri", slug: "template-magazin-mic" },
  { type: "template-uri", slug: "template-agentie-one-page" },
  { type: "efecte-3d", slug: "fundal-zgomot-organic" },
  { type: "efecte-3d", slug: "tunel-galerie-3d" },
  { type: "efecte-3d", slug: "tranzitie-cortina-pagini" },
  { type: "unelte", slug: "generator-favicon" },
  { type: "unelte", slug: "optimizator-imagini-webp" },
  { type: "unelte", slug: "generator-palete-contrast" },
  { type: "api-uri", slug: "api-zile-libere" },
  { type: "api-uri", slug: "api-github-depozit" },
  { type: "documente", slug: "ghid-performanta-web" },
  { type: "sectiuni", slug: "banner-cookie-gdpr" },
  { type: "componente", slug: "bara-anpc-sol" },
  { type: "unelte", slug: "validator-iban" },
  { type: "unelte", slug: "calculator-tva" },
  { type: "componente", slug: "program-cu-sarbatori" },
  { type: "sectiuni", slug: "formular-date-facturare" },
  { type: "api-uri", slug: "harta-locatie-osm" },
  { type: "componente", slug: "buton-comanda-whatsapp" },
  { type: "sectiuni", slug: "tabel-comparatie-pachete" },
  { type: "unelte", slug: "calculator-cost-proiect" },
  { type: "documente", slug: "declaratie-accesibilitate" },
];

const segmentFor = (roSegment: string) => PRODUSE_TYPE_SEGMENTS.find((entry) => entry.ro === roSegment)!;

/** Toate perechile RO/EN ale paginii, în ordinea în care intră în sitemap. */
export function produseRoutePairs(): Array<{ ro: string; en: string }> {
  return [
    { ro: PRODUSE_BASE.ro, en: PRODUSE_BASE.en },
    ...PRODUSE_STATIC_SEGMENTS.map((entry) => ({ ro: `${PRODUSE_BASE.ro}/${entry.ro}`, en: `${PRODUSE_BASE.en}/${entry.en}` })),
    ...PRODUSE_TYPE_SEGMENTS.map((entry) => ({ ro: `${PRODUSE_BASE.ro}/${entry.ro}`, en: `${PRODUSE_BASE.en}/${entry.en}` })),
    ...PRODUSE_COLLECTION_SEGMENTS.map((entry) => ({
      ro: `${PRODUSE_BASE.ro}/colectii/${entry.ro}`,
      en: `${PRODUSE_BASE.en}/collections/${entry.en}`,
    })),
    ...PRODUSE_ITEM_ROUTES.map((entry) => {
      const type = segmentFor(entry.type);
      return { ro: `${PRODUSE_BASE.ro}/${type.ro}/${entry.slug}`, en: `${PRODUSE_BASE.en}/${type.en}/${entry.slug}` };
    }),
  ];
}
