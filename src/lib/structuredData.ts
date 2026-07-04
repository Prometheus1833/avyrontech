/**
 * Reusable JSON-LD generators for Avyron.
 * Used across home + main marketing pages to help Google understand the site.
 */

const BASE_URL = "https://avyron.ro";
const LOGO_URL = `${BASE_URL}/avyron-logo.jpg`;
const PHONE = "+40734605055";
const EMAIL = "contact@avyron.ro";

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Avyron",
  legalName: "S.C. Eco Tech Digital Solution S.R.L.",
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
    addressLocality: "Iași",
    addressRegion: "IS",
    addressCountry: "RO",
  },
  sameAs: [
    "https://www.facebook.com/avyron.tech",
    "https://www.instagram.com/avyron.tech",
    "https://www.linkedin.com/company/avyron",
  ],
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
  image: LOGO_URL,
  logo: LOGO_URL,
  url: BASE_URL,
  telephone: PHONE,
  email: EMAIL,
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Iași",
    addressRegion: "IS",
    addressCountry: "RO",
  },
  areaServed: [
    { "@type": "Country", name: "Romania" },
    { "@type": "AdministrativeArea", name: "European Union" },
  ],
  serviceType: [
    "Web development",
    "Mobile app development",
    "UI/UX design",
    "SEO",
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
