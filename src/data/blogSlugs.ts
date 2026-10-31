/**
 * Dependency-light registry for source-controlled articles. Keep this list in
 * sync with blogIndex.ts; the Cloudflare API Worker uses it without bundling
 * the complete article library.
 */
export const BLOG_SLUGS = [
  "php2shell-vulnerabilitati-php-octombrie-2026",
  "site-pensiune-rezervari-directe-2026",
  "meta-conturi-platite-facebook-instagram-2026",
  "importanta-website-afacere-2026",
  "de-ce-alegi-avyron-studio-prezenta-digitala",
  "website-profesionist-identitate-digitala-2026",
  "seo-2026-google-ai-search",
  "securitate-internet-greseli-afaceri-mici",
  "ai-act-reguli-transparenta-2-august-2026",
] as const;

/** Source-controlled articles that currently have a complete English counterpart. */
export const BLOG_SLUGS_EN = BLOG_SLUGS.filter(
  (slug) => ![
    "php2shell-vulnerabilitati-php-octombrie-2026",
    "site-pensiune-rezervari-directe-2026",
  ].includes(slug),
);
