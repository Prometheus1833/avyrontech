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
}: {
  title: string;
  description: string;
  /** Current page path (should match the URL the user is on). */
  path: string;
  /** Optional RO/EN alternate paths for hreflang. When omitted, only the canonical is set. */
  alternates?: { ro: string; en: string };
}) {
  const url = `${BASE}${path}`;
  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);

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
