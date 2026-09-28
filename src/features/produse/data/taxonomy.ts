import type { Access, ItemType, L, Tech } from "./types";

/** Tipurile de produs, în ordinea tab-urilor. `seg` = segmentul de URL. */
export const TYPES: Array<{ id: ItemType; seg: { ro: string; en: string }; name: L; plural: L; hue: number }> = [
  { id: "component", seg: { ro: "componente", en: "components" }, name: { ro: "Componentă", en: "Component" }, plural: { ro: "Componente", en: "Components" }, hue: 265 },
  { id: "section", seg: { ro: "sectiuni", en: "sections" }, name: { ro: "Secțiune", en: "Section" }, plural: { ro: "Secțiuni", en: "Sections" }, hue: 220 },
  { id: "template", seg: { ro: "template-uri", en: "templates" }, name: { ro: "Template", en: "Template" }, plural: { ro: "Template-uri", en: "Templates" }, hue: 300 },
  { id: "effect", seg: { ro: "efecte-3d", en: "3d-effects" }, name: { ro: "Efect 3D", en: "3D effect" }, plural: { ro: "Efecte 3D", en: "3D effects" }, hue: 195 },
  { id: "tool", seg: { ro: "unelte", en: "tools" }, name: { ro: "Unealtă", en: "Tool" }, plural: { ro: "Unelte", en: "Tools" }, hue: 150 },
  { id: "api", seg: { ro: "api-uri", en: "apis" }, name: { ro: "Integrare API", en: "API integration" }, plural: { ro: "API-uri", en: "APIs" }, hue: 45 },
  { id: "doc", seg: { ro: "documente", en: "documents" }, name: { ro: "Document", en: "Document" }, plural: { ro: "Documente", en: "Documents" }, hue: 30 },
  { id: "logo", seg: { ro: "logo", en: "logo" }, name: { ro: "Logo", en: "Logo" }, plural: { ro: "Logo", en: "Logo" }, hue: 330 },
];

export const TYPE_BY_ID = new Map(TYPES.map((t) => [t.id, t]));

export const CATEGORIES: Record<string, L> = {
  buttons: { ro: "Butoane", en: "Buttons" },
  cards: { ro: "Carduri", en: "Cards" },
  cursor: { ro: "Cursoare", en: "Cursors" },
  text: { ro: "Text animat", en: "Animated text" },
  notifications: { ro: "Notificări", en: "Notifications" },
  backgrounds: { ro: "Fundaluri", en: "Backgrounds" },
  navigation: { ro: "Navigare", en: "Navigation" },
  forms: { ro: "Formulare", en: "Forms" },
  data: { ro: "Date și cifre", en: "Data and numbers" },
  hero: { ro: "Hero", en: "Hero" },
  auth: { ro: "Login și conturi", en: "Login and accounts" },
  pricing: { ro: "Prețuri", en: "Pricing" },
  faq: { ro: "FAQ", en: "FAQ" },
  footer: { ro: "Subsoluri", en: "Footers" },
  loading: { ro: "Loading screens", en: "Loading screens" },
  email: { ro: "E-mail", en: "Email" },
  landing: { ro: "Landing pages", en: "Landing pages" },
  portfolio: { ro: "Portofolii", en: "Portfolios" },
  spatial: { ro: "3D și spațial", en: "3D and spatial" },
  import: { ro: "Import și export", en: "Import and export" },
  seo: { ro: "SEO", en: "SEO" },
  a11y: { ro: "Accesibilitate", en: "Accessibility" },
  company: { ro: "Firme și facturare", en: "Companies and invoicing" },
  legal: { ro: "Legal și conformitate", en: "Legal and compliance" },
  finance: { ro: "Valute și cursuri", en: "Currencies and rates" },
  weather: { ro: "Vreme", en: "Weather" },
  geo: { ro: "Hărți și locații", en: "Maps and places" },
  guides: { ro: "Ghiduri", en: "Guides" },
  brand: { ro: "Identitate vizuală", en: "Brand identity" },
};

export const TECH_LABEL: Record<Tech, string> = {
  react: "React",
  next: "Next.js",
  html: "HTML",
  tailwind: "Tailwind",
  gsap: "GSAP",
  three: "Three.js",
  glsl: "GLSL / WebGL2",
  canvas: "Canvas 2D",
  css: "CSS",
  ts: "TypeScript",
  worker: "Worker / Edge",
};

export const ACCESS_LABEL: Record<Access, L> = {
  free: { ro: "Gratuit", en: "Free" },
  pro: { ro: "Pro", en: "Pro" },
  studio: { ro: "Studio", en: "Studio" },
};

/** Echivalentul în euro al treptelor de preț. Fix, ca să nu „sară” cu cursul. */
export const EUR_FOR_RON: Record<number, number> = { 30: 6, 50: 10, 75: 15, 100: 20, 150: 30 };
