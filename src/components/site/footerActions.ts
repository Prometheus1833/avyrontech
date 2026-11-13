import { SERVICE_ROUTES } from "@/data/serviceRoutes";
import type { Lang } from "@/i18n/translations";
import { productHubLocale } from "@/features/produse/data/productLocales";

export type FooterAction = { page: string; label: string; sub: string; to: string };

/** Use exact route families, never article/product slug substrings. A page
 * without a useful next step keeps the three direct contact actions only. */
export function footerAction(pathname: string, lang: Lang): FooterAction | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const en = lang === "en";
  const action = (page: string, ro: string, english: string, subRo: string, subEn: string, to: string): FooterAction =>
    ({ page, label: en ? english : ro, sub: en ? subEn : subRo, to });
  const is = (pair: { ro: string; en: string }) => path === pair.ro || path === pair.en;

  if (is(SERVICE_ROUTES.websiteSubscription)) return action("website-subscription", "Vreau site la 0 lei", "I want a website with no development fee", "Spune-ne despre afacerea ta", "Tell us about your business", "#website-brief");
  if (is(SERVICE_ROUTES.home)) return action("services", "Cere ofertă personalizată", "Get a custom quote", "Discută cu echipa", "Talk to the team", "#cta");
  if (is(SERVICE_ROUTES.logoStudio)) return action("logo-studio", "Completează brieful", "Complete the brief", "Preferințele pentru logo", "Your logo preferences", "#brief");
  if (is(SERVICE_ROUTES.professionalBlog)) return action("professional-blog", "Configurează blogul", "Configure your blog", "Alege ce ai nevoie", "Choose what you need", "#configurator-blog");
  if (is(SERVICE_ROUTES.qa)) return action("qa", "Discutăm despre testare", "Discuss your testing needs", "Scop și pașii următori", "Scope and next steps", "#cta");
  if (is(SERVICE_ROUTES.seoAi) || is(SERVICE_ROUTES.digitalMarketing)) return action("growth", "Discutăm despre obiective", "Discuss your goals", "O propunere pentru afacerea ta", "A proposal for your business", "#growth-cta-title");
  if ([SERVICE_ROUTES.website, SERVICE_ROUTES.logo3d, SERVICE_ROUTES.socialIdentity, SERVICE_ROUTES.onlineStore, SERVICE_ROUTES.apps, SERVICE_ROUTES.automationAi].some(is)) return action("service", "Discutăm despre proiectul tău", "Let's discuss your project", "Detalii și contact", "Details and contact", "#contact");
  const products = en ? "/en/products" : "/produse";
  if (productHubLocale(path)) return action("products", "Ghidul produselor", "Product guide", "Utilizare și licențe", "Usage and licences", `${products}/${en ? "guide" : "ghid"}`);
  if (path.startsWith("/produse/") || path.startsWith("/en/products/")) return action("products", "Toate produsele", "All products", "Explorează catalogul", "Explore the catalogue", products);
  if (path.startsWith("/blog/") || path.startsWith("/en/blog/")) return action("blog", "Alte articole", "More articles", "Blogul AVYRON", "AVYRON blog", en ? "/en/blog" : "/blog");
  if (path === "/despre-noi" || path === "/en/about") return action("about", "Vezi portofoliul", "View our portfolio", "Proiecte realizate de AVYRON", "Projects built by AVYRON", en ? "/en/portfolio" : "/portofoliu");
  if (path === "/portofoliu" || path === "/en/portfolio") return action("portfolio", "Discutăm proiectul tău", "Discuss your project", "Pornim de la afacerea ta", "Start with your business", "#contact-title");
  if (path === "/mentenanta-si-colaborari" || path === "/en/maintenance-and-partnerships") return action("maintenance", "Compară abonamentele", "Compare plans", "Alege opțiunea potrivită", "Choose the right option", "#comparatie");
  if (path === "/cariere" || path === "/en/careers") return action("careers", "Trimite candidatura", "Send your application", "Colaborări cu AVYRON", "Work with AVYRON", "#candidatura");
  if (path === "/configurator" || path === "/en/configurator") return action("configurator", "Vezi serviciul website", "See the website service", "Detalii și pașii următori", "Scope and next steps", SERVICE_ROUTES.website[lang]);
  return null;
}
