// Sets/updates a meta tag by attribute (property or name).
function upsertMeta(attr: "property" | "name", key: string, value: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

const BASE = "https://avyron.ro";

export function setPageMeta({
  title,
  description,
  path,
  alternates,
  image,
  imageAlt,
  type = "website",
  locale,
}: {
  title: string;
  description: string;
  /** Current page path (should match the URL the user is on). */
  path: string;
  /** Optional RO/EN alternate paths for hreflang. When omitted, only the canonical is set. */
  alternates?: { ro: string; en: string };
  /** Absolute or root-relative image URL (1200x630 recommended) for og:image / twitter:image. */
  image?: string;
  /** Alt text for the social image. */
  imageAlt?: string;
  /** Open Graph type — defaults to "website". Use "article" for blog posts. */
  type?: string;
  /** OG locale, e.g. "ro_RO" or "en_US". Inferred from alternates when omitted. */
  locale?: string;
}) {
  const url = `${BASE}${path}`;
  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:site_name", "Avyron");
  const inferredLocale =
    locale ?? (alternates && path.startsWith("/en") ? "en_US" : "ro_RO");
  upsertMeta("property", "og:locale", inferredLocale);
  if (alternates) {
    const alt = inferredLocale === "ro_RO" ? "en_US" : "ro_RO";
    // Remove any existing alternate locale tags before writing a fresh one.
    document.head
      .querySelectorAll('meta[property="og:locale:alternate"]')
      .forEach((el) => el.remove());
    const el = document.createElement("meta");
    el.setAttribute("property", "og:locale:alternate");
    el.setAttribute("content", alt);
    document.head.appendChild(el);
  }
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);

  if (image) {
    const absImage = image.startsWith("http") ? image : `${BASE}${image}`;
    upsertMeta("property", "og:image", absImage);
    upsertMeta("property", "og:image:secure_url", absImage);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta("name", "twitter:image", absImage);
    if (imageAlt) {
      upsertMeta("property", "og:image:alt", imageAlt);
      upsertMeta("name", "twitter:image:alt", imageAlt);
    }
  }

  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);


  // Clear existing hreflang alternates before writing new ones.
  document.head
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((el) => el.remove());

  if (alternates) {
    const map: Array<[string, string]> = [
      ["ro", `${BASE}${alternates.ro}`],
      ["en", `${BASE}${alternates.en}`],
      ["x-default", `${BASE}${alternates.ro}`],
    ];
    for (const [code, href] of map) {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", code);
      link.setAttribute("href", href);
      document.head.appendChild(link);
    }
  }
}

export function setJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}
