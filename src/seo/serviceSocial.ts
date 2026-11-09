import { SERVICE_ROUTES } from "../data/serviceRoutes";
import images from "./serviceSocialImages.json";

/** Art direction only. Page titles/descriptions still come from the editable service copy. */
export const SERVICE_SOCIAL = [
  {id:"subscription",path:SERVICE_ROUTES.websiteSubscription,hue:145,art:"website",ro:["Website prin","abonament"],en:["Website","subscription"],caption:{ro:"Dezvoltare inclusă. Abonament lunar. Creat pentru tine.",en:"Development included. Paid monthly. Built for you."},tags:{ro:"DESIGN · HOSTING · MENTENANȚĂ",en:"DESIGN · HOSTING · MAINTENANCE"}},
  { id: "website", path: SERVICE_ROUTES.website, hue: 215, art: "website", ro: ["Site Prezentare", "Profesional"], en: ["Professional", "Business Website"], caption: { ro: "Design, conținut și performanță pentru afacerea ta.", en: "Design, content and performance for your business." }, tags: { ro: "DESIGN · SEO · PERFORMANȚĂ", en: "DESIGN · SEO · PERFORMANCE" } },
  { id: "social", path: SERVICE_ROUTES.socialIdentity, hue: 322, art: "social", ro: ["Identitate", "Social Media"], en: ["Social Media", "Identity"], caption: { ro: "O prezență coerentă. Un brand ușor de recunoscut.", en: "A coherent presence. A brand people recognise." }, tags: { ro: "IDENTITATE · CONȚINUT · COERENȚĂ", en: "IDENTITY · CONTENT · CONSISTENCY" } },
  { id: "logo", path: SERVICE_ROUTES.logo3d, hue: 274, art: "logo", ro: ["Logo Dinamic", "3D & Cinematic"], en: ["Dynamic Logo", "3D & Cinematic"], caption: { ro: "Identitate vizuală cu formă, profunzime și mișcare.", en: "Visual identity with form, depth and motion." }, tags: { ro: "IDENTITATE · DESIGN · ANIMAȚIE", en: "IDENTITY · DESIGN · ANIMATION" } },
  { id: "store", path: SERVICE_ROUTES.onlineStore, hue: 160, art: "store", ro: ["Magazin Online"], en: ["Online Store"], caption: { ro: "Produse, comenzi și o experiență clară de cumpărare.", en: "Products, orders and a clear shopping experience." }, tags: { ro: "ECOMMERCE · CATALOG · COMENZI", en: "ECOMMERCE · CATALOG · ORDERS" } },
  { id: "apps", path: SERVICE_ROUTES.apps, hue: 238, art: "apps", ro: ["Aplicații Web", "și Mobile"], en: ["Web & Mobile", "Applications"], caption: { ro: "Platforme digitale construite în jurul activității tale.", en: "Digital platforms built around your operations." }, tags: { ro: "WEB · MOBILE · PLATFORME", en: "WEB · MOBILE · PLATFORMS" } },
  { id: "ai", path: SERVICE_ROUTES.automationAi, hue: 185, art: "ai", ro: ["Agenți AI", "și Automatizări"], en: ["AI Agents", "& Automation"], caption: { ro: "Fluxuri conectate, integrări și control uman.", en: "Connected workflows, integrations and human control." }, tags: { ro: "INTEGRĂRI · DATE · FLUXURI", en: "INTEGRATIONS · DATA · WORKFLOWS" } },
  { id: "qa", path: SERVICE_ROUTES.qa, hue: 145, art: "qa", ro: ["Testare QA", "Web & Mobile"], en: ["QA Testing", "Web & Mobile"], caption: { ro: "Verificări clare pentru produse digitale fiabile.", en: "Clear checks for reliable digital products." }, tags: { ro: "TESTARE · CALITATE · RAPORTARE", en: "TESTING · QUALITY · REPORTING" } },
  { id: "blog", path: SERVICE_ROUTES.professionalBlog, hue: 34, art: "blog", ro: ["Blog Profesional", "& Content Hub"], en: ["Professional Blog", "& Content Hub"], caption: { ro: "O platformă editorială pentru ideile și expertiza ta.", en: "An editorial platform for your ideas and expertise." }, tags: { ro: "CONȚINUT · CMS · SEO", en: "CONTENT · CMS · SEO" } },
  { id: "seo", path: SERVICE_ROUTES.seoAi, hue: 205, art: "seo", ro: ["SEO & AI", "Visibility"], en: ["SEO & AI", "Visibility"], caption: { ro: "Conținut, indexare și performanță măsurabilă.", en: "Content, indexing and measurable performance." }, tags: { ro: "SEO TEHNIC · VIZIBILITATE · VITEZĂ", en: "TECHNICAL SEO · VISIBILITY · SPEED" } },
  { id: "ads", path: SERVICE_ROUTES.digitalMarketing, hue: 18, art: "ads", ro: ["Digital Marketing", "& Ads"], en: ["Digital Marketing", "& Ads"], caption: { ro: "Campanii, conținut și obiective comerciale clare.", en: "Campaigns, content and clear business objectives." }, tags: { ro: "STRATEGIE · CAMPANII · MĂSURARE", en: "STRATEGY · CAMPAIGNS · MEASUREMENT" } },
  { id: "studio", path: SERVICE_ROUTES.logoStudio, hue: 292, art: "studio", ro: ["Logo Studio 3D"], en: ["Logo Studio 3D"], caption: { ro: "Explorează, personalizează și previzualizează identitatea.", en: "Explore, customise and preview your identity." }, tags: { ro: "CREAȚIE · PERSONALIZARE · PREVIEW", en: "CREATE · CUSTOMISE · PREVIEW" } },
  { id: "services", path: SERVICE_ROUTES.home, hue: 264, art: "services", ro: ["Servicii Digitale", "AVYRON"], en: ["AVYRON", "Digital Services"], caption: { ro: "De la prezență online la produse și fluxuri inteligente.", en: "From your online presence to digital products and workflows." }, tags: { ro: "WEB · BRAND · AI · GROWTH", en: "WEB · BRAND · AI · GROWTH" } },
  { id: "maintenance", path: { ro: "/mentenanta-si-colaborari", en: "/en/maintenance-and-partnerships" }, hue: 172, art: "maintenance", ro: ["Mentenanță", "și Colaborări"], en: ["Maintenance", "& Partnerships"], caption: { ro: "Continuitate, suport și îmbunătățiri pentru proiectul tău.", en: "Continuity, support and improvements for your project." }, tags: { ro: "SUPORT · ACTUALIZĂRI · CONTINUITATE", en: "SUPPORT · UPDATES · CONTINUITY" } },
] as const;

export function serviceSocialForPath(path: string) {
  const clean = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  for (const entry of SERVICE_SOCIAL) {
    const lang = clean === entry.path.ro ? "ro" : clean === entry.path.en ? "en" : null;
    if (!lang) continue;
    const image = (images as Record<string, string>)[`${entry.id}:${lang}`];
    return image ? { image, imageAlt: `AVYRON — ${entry[lang].join(" ")}. ${entry.caption[lang]}` } : null;
  }
  return null;
}
