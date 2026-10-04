export type ProductHubLocale = "ro" | "en" | "it" | "hu" | "de" | "fr" | "pl";

export type ProductHubLocaleDefinition = {
  code: ProductHubLocale;
  path: string;
  nativeName: string;
  htmlLang: string;
  ogLocale: string;
};

/**
 * The seven indexable entry points for Avyron Products.
 *
 * Only the hub is international for now. Product detail pages remain RO/EN
 * until their main content is professionally localized; this avoids thin,
 * mixed-language pages being published only to inflate the sitemap.
 */
export const PRODUCT_HUB_LOCALES: readonly ProductHubLocaleDefinition[] = [
  { code: "ro", path: "/produse", nativeName: "Română", htmlLang: "ro", ogLocale: "ro_RO" },
  { code: "en", path: "/en/products", nativeName: "English", htmlLang: "en", ogLocale: "en_US" },
  { code: "it", path: "/it/prodotti", nativeName: "Italiano", htmlLang: "it", ogLocale: "it_IT" },
  { code: "hu", path: "/hu/termekek", nativeName: "Magyar", htmlLang: "hu", ogLocale: "hu_HU" },
  { code: "de", path: "/de/produkte", nativeName: "Deutsch", htmlLang: "de", ogLocale: "de_DE" },
  { code: "fr", path: "/fr/produits", nativeName: "Français", htmlLang: "fr", ogLocale: "fr_FR" },
  { code: "pl", path: "/pl/produkty", nativeName: "Polski", htmlLang: "pl", ogLocale: "pl_PL" },
] as const;

export const PRODUCT_HUB_PATHS = Object.fromEntries(
  PRODUCT_HUB_LOCALES.map(({ code, path }) => [code, path]),
) as Record<ProductHubLocale, string>;

export const INTERNATIONAL_PRODUCT_HUB_ROUTES = PRODUCT_HUB_LOCALES
  .filter(({ code }) => code !== "ro" && code !== "en")
  .map(({ path }) => path);

export function productHubLocale(pathname: string): ProductHubLocale | null {
  const normalized = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return PRODUCT_HUB_LOCALES.find(({ path }) => path === normalized)?.code ?? null;
}

export function productHubAlternates(): Record<ProductHubLocale | "x-default", string> {
  return {
    ...PRODUCT_HUB_PATHS,
    "x-default": PRODUCT_HUB_PATHS.en,
  };
}
