import type { BlogLanguage } from "./blogApi";

export const BLOG_CATEGORIES: Record<string, Record<BlogLanguage, string>> = {
  business: { ro: "Afaceri", en: "Business" },
  "web-design": { ro: "Web design", en: "Web design" },
  seo: { ro: "SEO și vizibilitate", en: "SEO & visibility" },
  security: { ro: "Securitate", en: "Security" },
  securitate: { ro: "Securitate", en: "Security" },
  cloudflare: { ro: "Cloudflare", en: "Cloudflare" },
  technology: { ro: "Tehnologie", en: "Technology" },
  tech: { ro: "Tehnologie", en: "Technology" },
  avyron: { ro: "Din agenție", en: "Inside Avyron" },
  digital: { ro: "Strategie digitală", en: "Digital strategy" },
};

export const blogSlug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
