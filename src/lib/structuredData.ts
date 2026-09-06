/**
 * Reusable JSON-LD generators for Avyron.
 * Used across home + main marketing pages to help Google understand the site.
 */

import { COMPANY } from "@/config/company";
import { SOCIAL_PROFILE_URLS } from "@/config/socialProfiles";

const BASE_URL = "https://avyron.ro";
const LOGO_URL = `${BASE_URL}/avyron-logo.jpg`;
const PHONE = COMPANY.phone;
const EMAIL = COMPANY.email;
const PRIMARY_ENTITY = COMPANY.primaryLegalEntity;

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Avyron",
  legalName: PRIMARY_ENTITY.legalName,
  identifier: {
    "@type": "PropertyValue",
    propertyID: "CUI",
    value: PRIMARY_ENTITY.taxId,
  },
  description:
    "Avyron este brandul digital al DIGITAL ECOTECH SOLUTIONS S.R.L., specializat în website-uri, aplicații și produse digitale scalabile.",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: LOGO_URL,
    width: 512,
    height: 512,
  },
  image: LOGO_URL,
  email: EMAIL,
  telephone: PHONE,
  address: {
    "@type": "PostalAddress",
    ...(PRIMARY_ENTITY.streetAddress ? { streetAddress: PRIMARY_ENTITY.streetAddress } : {}),
    addressLocality: PRIMARY_ENTITY.addressLocality,
    addressRegion: PRIMARY_ENTITY.addressRegion,
    addressCountry: "RO",
  },
  sameAs: SOCIAL_PROFILE_URLS,
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: PHONE,
      email: EMAIL,
      contactType: "customer support",
      areaServed: "RO",
      availableLanguage: ["Romanian", "English"],
    },
  ],
};

export const webSiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  url: BASE_URL,
  name: "Avyron",
  description:
    "Agenție web România — creare site-uri, aplicații mobile și produse digitale optimizate SEO.",
  inLanguage: ["ro-RO", "en"],
  publisher: { "@id": `${BASE_URL}/#organization` },
};

export const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${BASE_URL}/#localbusiness`,
  name: "Avyron",
  legalName: PRIMARY_ENTITY.legalName,
  identifier: {
    "@type": "PropertyValue",
    propertyID: "CUI",
    value: PRIMARY_ENTITY.taxId,
  },
  image: LOGO_URL,
  logo: LOGO_URL,
  url: BASE_URL,
  telephone: PHONE,
  email: EMAIL,
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    ...(PRIMARY_ENTITY.streetAddress ? { streetAddress: PRIMARY_ENTITY.streetAddress } : {}),
    addressLocality: PRIMARY_ENTITY.addressLocality,
    addressRegion: PRIMARY_ENTITY.addressRegion,
    addressCountry: "RO",
  },
  areaServed: [
    { "@type": "Country", name: "Romania" },
    { "@type": "AdministrativeArea", name: "European Union" },
  ],
  serviceType: [
    "Professional presentation website design",
    "Business website development",
    "Web development",
    "Mobile app development",
    "Ecommerce development",
    "UI/UX design",
    "Technical SEO",
    "Website audit",
    "Cybersecurity",
    "DevOps & Hosting",
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
  sameAs: organizationLd.sameAs,
};

/** Build a BreadcrumbList JSON-LD from ordered items. */
export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${BASE_URL}${it.path}`,
    })),
  };
}

/** Build a Service JSON-LD for a product/offering page. */
export function serviceLd({
  name,
  description,
  path,
  priceEur,
  areaServed = "RO",
}: {
  name: string;
  description: string;
  path: string;
  priceEur?: number;
  areaServed?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${BASE_URL}${path}#service`,
    name,
    description,
    url: `${BASE_URL}${path}`,
    serviceType: name,
    provider: { "@id": `${BASE_URL}/#organization` },
    areaServed,
    ...(priceEur
      ? {
          offers: {
            "@type": "Offer",
            price: priceEur,
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}${path}`,
          },
        }
      : {}),
  };
}

/** Build an FAQPage JSON-LD from question/answer pairs. */
export function faqPageLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

/** Build a Product JSON-LD with a single offer (for product/service pages). */
export function productLd({
  name,
  description,
  path,
  priceEur,
  brand = "Avyron",
}: {
  name: string;
  description: string;
  path: string;
  priceEur?: number;
  brand?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${BASE_URL}${path}#product`,
    name,
    description,
    url: `${BASE_URL}${path}`,
    brand: { "@type": "Brand", name: brand },
    image: LOGO_URL,
    ...(priceEur
      ? {
          offers: {
            "@type": "Offer",
            price: priceEur,
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}${path}`,
            seller: { "@id": `${BASE_URL}/#organization` },
          },
        }
      : {}),
  };
}

/** Build an OfferCatalog JSON-LD for subscription tiers (care plans). */
export function offerCatalogLd({
  name,
  path,
  items,
}: {
  name: string;
  path: string;
  items: Array<{ name: string; description: string; priceEur: number }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${BASE_URL}${path}#catalog`,
    name,
    url: `${BASE_URL}${path}`,
    provider: { "@id": `${BASE_URL}/#organization` },
    itemListElement: items.map((it, i) => ({
      "@type": "Offer",
      position: i + 1,
      name: it.name,
      description: it.description,
      price: it.priceEur,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}${path}`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: it.priceEur,
        priceCurrency: "EUR",
        billingIncrement: 1,
        unitCode: "MON",
      },
      itemOffered: {
        "@type": "Service",
        name: it.name,
        description: it.description,
        provider: { "@id": `${BASE_URL}/#organization` },
      },
      acceptedPaymentMethod: [
        { "@type": "PaymentMethod", name: "Bank transfer (IBAN)" },
        { "@type": "PaymentMethod", name: "Credit or debit card" },
        { "@type": "PaymentMethod", name: "Online payment link" },
      ],
    })),
  };
}

/**
 * HowTo schema for the process page. Google renders these as step-by-step
 * rich results, which is the right shape for a "how we work" page.
 */
export function howToLd({
  name,
  description,
  path,
  totalTime,
  steps,
}: {
  name: string;
  description: string;
  path: string;
  /** ISO 8601 duration, e.g. "P15D". */
  totalTime?: string;
  steps: Array<{ name: string; text: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    ...(totalTime ? { totalTime } : {}),
    url: `${BASE_URL}${path}`,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${BASE_URL}${path}#etapa-${i + 1}`,
    })),
  };
}
