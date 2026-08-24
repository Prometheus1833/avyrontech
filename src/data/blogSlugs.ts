/**
 * Dependency-light registry for source-controlled articles. Keep this list in
 * sync with blogIndex.ts; the Cloudflare API Worker uses it without bundling
 * the complete article library.
 */
export const BLOG_SLUGS = [
  "meta-conturi-platite-facebook-instagram-2026",
  "importanta-website-afacere-2026",
  "de-ce-alegi-avyron-studio-prezenta-digitala",
  "website-profesionist-identitate-digitala-2026",
  "seo-2026-google-ai-search",
  "securitate-internet-greseli-afaceri-mici",
] as const;
