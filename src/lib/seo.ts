// Route-scoped head management.
//
// Every tag written here is tagged with data-seo="1" so it can be removed
// completely when the SPA navigates to another route. JSON-LD is merged into a
// SINGLE <script id="ld-graph"> with an @graph array, so a page never ships
// duplicated Organization / WebSite / Product nodes.

const SEO_ATTR = "data-seo";
const DEFAULT_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1";

export const BASE_URL = "https://avyron.ro";
const BASE = BASE_URL;

/** Nodes for the current route's JSON-LD @graph, keyed by a stable id. */
const graphNodes = new Map<string, Record<string, unknown>>();

// Sets/updates a meta tag by attribute (property or name).
function upsertMeta(attr: "property" | "name", key: string, value: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(SEO_ATTR, "1");
  el.setAttribute("content", value);
}

/**
 * Removes every route-scoped artefact of the previous page:
 * hreflang alternates, og:locale:alternate and the JSON-LD graph.
 * Called on each SPA navigation before the new page writes its head.
 */
export function resetManagedHead() {
  graphNodes.clear();
  if (typeof document === "undefined") return;
  document.head
    .querySelectorAll(
      'link[rel="alternate"][hreflang], meta[property="og:locale:alternate"], script[type="application/ld+json"][data-seo="1"]',
    )
    .forEach((el) => el.remove());
}

export function setPageMeta({
  title,
  description,
  path,
  alternates,
  image,
  imageAlt,
  type = "website",
  locale,
  robots = DEFAULT_ROBOTS,
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
  /** Robots directive for this route. */
  robots?: string;
}) {
  const url = `${BASE}${path}`;
  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", robots);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:site_name", "Avyron");
  const inferredLocale =
    locale ?? (path === "/en" || path.startsWith("/en/") ? "en_US" : "ro_RO");
  upsertMeta("property", "og:locale", inferredLocale);
  document.documentElement.lang = inferredLocale === "en_US" ? "en" : "ro";
  if (alternates) {
    const alt = inferredLocale === "ro_RO" ? "en_US" : "ro_RO";
    document.head
      .querySelectorAll('meta[property="og:locale:alternate"]')
      .forEach((el) => el.remove());
    const el = document.createElement("meta");
    el.setAttribute("property", "og:locale:alternate");
    el.setAttribute(SEO_ATTR, "1");
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
  canonical.setAttribute(SEO_ATTR, "1");
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
      link.setAttribute(SEO_ATTR, "1");
      document.head.appendChild(link);
    }
  }
}

function renderGraph() {
  let el = document.getElementById("ld-graph") as HTMLScriptElement | null;
  if (graphNodes.size === 0) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "ld-graph";
    el.setAttribute(SEO_ATTR, "1");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": Array.from(graphNodes.values()),
  });
}

/**
 * Adds/replaces one node of the current route's JSON-LD graph.
 * All nodes are serialised into a single <script id="ld-graph">.
 */
export function setJsonLd(id: string, data: unknown) {
  const node = { ...(data as Record<string, unknown>) };
  delete node["@context"];
  graphNodes.set(id, node);
  renderGraph();
}
