import { FEATURES } from "@/config/features";
import type { Lang } from "@/i18n/translations";
import { ITEMS } from "../data/items";
import { EUR_FOR_RON, TYPE_BY_ID } from "../data/taxonomy";
import type { CatalogItem } from "../data/types";
import { alternatePath, homePath, itemPath } from "./paths";

/**
 * SEO-ul paginii. Un singur loc care scrie titlul, descrierea, canonical,
 * hreflang și datele structurate. Catalogul este public implicit; variabila
 * `VITE_PRODUSE_LIVE=0` rămâne doar un kill switch operațional.
 */

const BASE = "https://avyron.ro";

type LdValue = Record<string, unknown>;

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  lang: Lang;
  image?: string;
  imageAlt?: string;
  jsonLd?: Array<[string, LdValue]>;
};

export async function applySeo({ title, description, path, lang, image = "/og/home.jpg", imageAlt, jsonLd = [] }: PageSeo) {
  const [{ setPageMeta, setJsonLd }] = await Promise.all([import("@/lib/seo")]);
  const alt = alternatePath(path, lang === "ro" ? "en" : "ro");
  setPageMeta({
    title,
    description,
    path,
    alternates: lang === "ro" ? { ro: path, en: alt ?? path } : { ro: alt ?? path, en: path },
    image,
    imageAlt,
    ...(FEATURES.produseLive ? {} : { robots: "noindex, nofollow" }),
  });
  for (const [id, value] of jsonLd) setJsonLd(`produse-${id}`, value as never);
}

export const productOgImage = (lang: Lang, item: CatalogItem) =>
  `/og/produse/${item.slug}${lang === "en" ? "-en" : ""}.jpg`;

/**
 * Meta description-ul unei colecții: fraze întregi din introducere, cât încap
 * în ~165 de caractere. Dacă prima frază e prea scurtă ca să spună ceva, se
 * taie din introducere la ultimul spațiu — niciodată în mijlocul unui cuvânt.
 */
export function metaFrom(intro: string, min = 90, max = 165): string {
  const sentences = intro.split(/(?<=\.)\s+/);
  let out = "";
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > max) break;
    out = next;
    if (out.length >= min) break;
  }
  if (out.length >= min) return out;
  const cut = intro.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > min ? cut.slice(0, lastSpace) : cut).replace(/[\s—,;:]+$/, "")}…`;
}

export function breadcrumb(lang: Lang, trail: Array<{ name: string; path: string }>): LdValue {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: lang === "ro" ? "Acasă" : "Home", path: lang === "ro" ? "/" : "/en" }, ...trail].map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: `${BASE}${entry.path}`,
    })),
  };
}

/** Lista de produse ca ItemList — ce citește Google pentru o pagină de catalog. */
export function itemListLd(lang: Lang, items: CatalogItem[], name: string, path: string): LdValue {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: `${BASE}${path}`,
    inLanguage: lang === "ro" ? "ro-RO" : "en-US",
    isPartOf: { "@id": `${BASE}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.slice(0, 60).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${BASE}${itemPath(lang, item)}`,
        name: item.name[lang],
      })),
    },
  };
}

/** Produsul individual: SoftwareSourceCode + Offer când e plătit. */
export function productLd(lang: Lang, item: CatalogItem): LdValue {
  const price = item.priceRon ? EUR_FOR_RON[item.priceRon] : null;
  return {
    "@context": "https://schema.org",
    "@type": item.type === "doc" ? "CreativeWork" : "SoftwareSourceCode",
    "@id": `${BASE}${itemPath(lang, item)}#product`,
    name: item.name[lang],
    description: item.short[lang],
    url: `${BASE}${itemPath(lang, item)}`,
    image: `${BASE}${productOgImage(lang, item)}`,
    inLanguage: lang === "ro" ? "ro-RO" : "en-US",
    programmingLanguage: item.tech.includes("react") ? "TypeScript" : undefined,
    codeSampleType: item.type === "template" ? "full solution" : "code snippet",
    applicationCategory: TYPE_BY_ID.get(item.type)!.name.en,
    keywords: item.keywords[lang].join(", "),
    author: { "@id": `${BASE}/#organization` },
    provider: { "@id": `${BASE}/#organization` },
    isAccessibleForFree: item.access === "free",
    ...(price
      ? {
          offers: {
            "@type": "Offer",
            price,
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url: `${BASE}${itemPath(lang, item)}`,
            seller: { "@id": `${BASE}/#organization` },
          },
        }
      : {}),
  };
}

export function faqLd(items: Array<{ q: string; a: string }>): LdValue {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a },
    })),
  };
}

/** Cifrele afișate în hero — și în meta description. */
export const STATS = {
  total: ITEMS.length,
  free: ITEMS.filter((item) => item.access === "free").length,
  effects: ITEMS.filter((item) => item.type === "effect").length,
  apis: ITEMS.filter((item) => item.type === "api").length,
};

export const homeTitle = (lang: Lang) =>
  lang === "ro"
    ? `Produse Avyron — ${STATS.total} componente, secțiuni și efecte 3D pentru site-uri`
    : `Avyron Products — ${STATS.total} components, sections and 3D effects for websites`;

export const homeDescription = (lang: Lang) =>
  lang === "ro"
    ? `Componente React animate, secțiuni gata de lansat, efecte 3D cu Three.js, unelte și integrări API — ${STATS.free} gratuite. Copiezi codul, îl instalezi din CLI sau îl ceri asistentului tău AI.`
    : `Animated React components, launch-ready sections, Three.js 3D effects, tools and API integrations — ${STATS.free} free. Copy the code, install from the CLI or ask your AI assistant.`;

export const homeUrl = (lang: Lang) => homePath(lang);
