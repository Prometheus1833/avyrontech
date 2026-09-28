import type { L } from "./types";

/**
 * Selectorul universal: tot ce oferă Avyron — servicii, produse și integrări —
 * cu specificațiile minime, fără prețuri. Vizitatorul bifează ce vrea și
 * trimite un singur brief. Legăturile spre paginile de servicii rămân cele
 * actuale până la redenumirea Servicii/Produse (etapă ulterioară).
 */

export type OfferGroup = "services" | "integrations" | "products";

export type OfferOption = {
  id: string;
  group: OfferGroup;
  name: L;
  spec: L;
  path?: { ro: string; en: string };
};

export const OFFER_GROUPS: Record<OfferGroup, L> = {
  services: { ro: "Servicii Avyron", en: "Avyron services" },
  integrations: { ro: "Integrări și funcții", en: "Integrations and features" },
  products: { ro: "Produse digitale", en: "Digital products" },
};

export const OFFER: OfferOption[] = [
  { id: "svc-site", group: "services", name: { ro: "Site de prezentare", en: "Business website" }, spec: { ro: "Livrare 2–5 zile, Lighthouse 90+, SEO de bază inclus", en: "2–5 day delivery, Lighthouse 90+, core SEO included" }, path: { ro: "/servicii/website-prezentare-profesional", en: "/en/services/professional-presentation-website" } },
  { id: "svc-shop", group: "services", name: { ro: "Magazin online", en: "Online store" }, spec: { ro: "Plăți, stocuri, facturare, feed Google Shopping", en: "Payments, stock, invoicing, Google Shopping feed" }, path: { ro: "/servicii/magazin-online", en: "/en/services/online-store" } },
  { id: "svc-blog", group: "services", name: { ro: "Blog profesional", en: "Professional blog" }, spec: { ro: "Hub de conținut rapid, optimizat pentru trafic organic", en: "Fast content hub optimised for organic traffic" }, path: { ro: "/servicii/blog-profesional", en: "/en/services/professional-blog" } },
  { id: "svc-app", group: "services", name: { ro: "Aplicație web / mobile", en: "Web / mobile app" }, spec: { ro: "Conturi, date, fluxuri interne, PWA sau nativ", en: "Accounts, data, internal flows, PWA or native" }, path: { ro: "/servicii/aplicatii-si-platforme", en: "/en/services/apps-and-platforms" } },
  { id: "svc-ai", group: "services", name: { ro: "Agent AI personalizat", en: "Custom AI agent" }, spec: { ro: "Antrenat pe datele tale, pe site și WhatsApp", en: "Trained on your data, on site and WhatsApp" }, path: { ro: "/servicii/automatizari-si-ai", en: "/en/services/automation-and-ai" } },
  { id: "svc-social", group: "services", name: { ro: "Identitate social media", en: "Social media identity" }, spec: { ro: "Profiluri, șabloane și ghid vizual unitar", en: "Profiles, templates and a unified visual guide" }, path: { ro: "/servicii/identitate-social-media", en: "/en/services/social-media-identity" } },
  { id: "svc-qa", group: "services", name: { ro: "Testare QA web / mobile", en: "Web / mobile QA testing" }, spec: { ro: "Dispozitive reale, raport clar de defecte", en: "Real devices, clear defect report" }, path: { ro: "/servicii/qa-testing-web-mobile", en: "/en/services/web-mobile-qa-testing" } },
  { id: "svc-logo", group: "services", name: { ro: "Creare logo", en: "Logo design" }, spec: { ro: "Desenat de echipă, 3 direcții, fișiere complete", en: "Drawn by the team, 3 directions, full file set" } },
  { id: "svc-care", group: "services", name: { ro: "Mentenanță și colaborare", en: "Care and partnership" }, spec: { ro: "Actualizări, backup, monitorizare, modificări lunare", en: "Updates, backups, monitoring, monthly changes" } },

  { id: "int-pay", group: "integrations", name: { ro: "Plăți online", en: "Online payments" }, spec: { ro: "Card, Apple/Google Pay, transfer, abonamente", en: "Card, Apple/Google Pay, transfer, subscriptions" } },
  { id: "int-invoice", group: "integrations", name: { ro: "Facturare + e-Factura", en: "Invoicing + e-Invoice" }, spec: { ro: "Facturi automate, transmitere ANAF", en: "Automatic invoices, ANAF submission" } },
  { id: "int-booking", group: "integrations", name: { ro: "Programări online", en: "Online booking" }, spec: { ro: "Calendar sincronizat, remindere", en: "Synced calendar, reminders" } },
  { id: "int-crm", group: "integrations", name: { ro: "CRM și leaduri", en: "CRM and leads" }, spec: { ro: "Formulare legate de pipeline și e-mail", en: "Forms linked to pipeline and email" } },
  { id: "int-news", group: "integrations", name: { ro: "Newsletter", en: "Newsletter" }, spec: { ro: "Abonare cu dublu opt-in, GDPR", en: "Double opt-in signup, GDPR" } },
  { id: "int-i18n", group: "integrations", name: { ro: "Site multilingv", en: "Multilingual site" }, spec: { ro: "hreflang corect, traduceri profesionale", en: "Correct hreflang, professional translations" } },
  { id: "int-email", group: "integrations", name: { ro: "E-mail pe domeniu", en: "Custom-domain email" }, spec: { ro: "Email Routing, SPF, DKIM, DMARC", en: "Email Routing, SPF, DKIM, DMARC" } },
  { id: "int-analytics", group: "integrations", name: { ro: "Analytics și consimțământ", en: "Analytics and consent" }, spec: { ro: "GA4, Consent Mode v2, evenimente de conversie", en: "GA4, Consent Mode v2, conversion events" } },
  { id: "int-3d", group: "integrations", name: { ro: "Experiență 3D / cinematică", en: "3D / cinematic experience" }, spec: { ro: "Three.js, shadere, scroll cinematic", en: "Three.js, shaders, cinematic scroll" } },

  { id: "prd-components", group: "products", name: { ro: "Componente și secțiuni", en: "Components and sections" }, spec: { ro: "Gata de copiat, React + TypeScript", en: "Ready to copy, React + TypeScript" } },
  { id: "prd-templates", group: "products", name: { ro: "Template-uri complete", en: "Complete templates" }, spec: { ro: "Landing, portofoliu, link in bio", en: "Landing, portfolio, link in bio" } },
  { id: "prd-logo", group: "products", name: { ro: "Logo Studio 3D", en: "Logo Studio 3D" }, spec: { ro: "Generator de logo, pachet descărcabil", en: "Logo generator, downloadable pack" } },
  { id: "prd-partner", group: "products", name: { ro: "Parteneriat AVY", en: "AVY partnership" }, spec: { ro: "Acces la bibliotecă, limite zilnice", en: "Library access, daily limits" } },
];
