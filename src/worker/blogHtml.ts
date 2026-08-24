const SITE_URL = "https://avyron.ro";

export type EdgeBlogPost = {
  language: "ro" | "en";
  slug: string;
  alternate_slug?: string | null;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  category: string;
  tags: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  social_title?: string | null;
  social_description?: string | null;
  published_at: string | number | null;
  updated_at: string | number;
  author_name?: string | null;
};

export type EdgeSitemapEntry = {
  language: "ro" | "en";
  slug: string;
  alternate_slug?: string | null;
  updated_at: string | number;
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const absoluteMedia = (value?: string | null) => {
  if (!value) return `${SITE_URL}/og/home.jpg`;
  if (/^https:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const isoDate = (value: string | number | null | undefined) => {
  const date = new Date(typeof value === "number" ? value : value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const inlineMarkdown = (value: string) => escapeHtml(value)
  .replace(/\[([^\]]+)]\(((?:https?:\/\/|\/)[^)]+)\)/gi, '<a href="$2" rel="noopener noreferrer">$1</a>')
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\*(.+?)\*/g, "<em>$1</em>");

function markdownToHtml(content: string) {
  const html: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    const bulleted = line.match(/^[-*]\s+(.+)$/);
    if (numbered || bulleted) {
      const next = numbered ? "ol" : "ul";
      if (list !== next) {
        closeList();
        list = next;
        html.push(`<${next}>`);
      }
      html.push(`<li>${inlineMarkdown((numbered || bulleted)![1])}</li>`);
      continue;
    }
    closeList();
    if (line.startsWith("### ")) html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    else if (line.startsWith("## ")) html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    else if (line.startsWith("# ")) html.push(`<h2>${inlineMarkdown(line.slice(2))}</h2>`);
    else if (line.startsWith("> ")) html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    else html.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeList();
  return html.join("\n");
}

const removeMeta = (html: string, key: string) => html.replace(
  new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${escapeRegExp(key)}["'][^>]*>\\s*`, "gi"),
  "",
);

const removeLink = (html: string, rel: string) => html.replace(
  new RegExp(`<link\\s+[^>]*rel=["']${escapeRegExp(rel)}["'][^>]*>\\s*`, "gi"),
  "",
);

const insertHead = (html: string, tags: string) => html.replace(/<\/head>/i, `${tags}\n</head>`);

/**
 * Turns the SPA shell into a complete article document at the edge. Social
 * crawlers receive unique Open Graph data, while search crawlers receive the
 * actual visible article and structured data even before JavaScript runs.
 */
export function injectBlogHtml(shell: string, post: EdgeBlogPost) {
  const language = post.language;
  const path = `${language === "en" ? "/en/blog" : "/blog"}/${post.slug}`;
  const canonical = `${SITE_URL}${path}`;
  const title = `${post.seo_title || post.title} | Avyron`;
  const description = post.seo_description || post.excerpt;
  const socialTitle = post.social_title || post.title;
  const socialDescription = post.social_description || post.excerpt;
  const image = absoluteMedia(post.cover_image_url);
  const published = isoDate(post.published_at);
  const modified = isoDate(post.updated_at);
  const alternatePath = post.alternate_slug
    ? `${language === "en" ? "/blog" : "/en/blog"}/${post.alternate_slug}`
    : null;

  const metaKeys = [
    "description", "robots", "og:title", "og:description", "og:url", "og:type", "og:locale",
    "og:locale:alternate", "og:image", "og:image:secure_url", "og:image:alt", "og:image:width",
    "og:image:height", "twitter:card", "twitter:title", "twitter:description", "twitter:image",
    "twitter:image:alt", "article:published_time", "article:modified_time", "article:section", "article:tag",
  ];
  let html = metaKeys.reduce(removeMeta, shell);
  html = removeLink(removeLink(html, "canonical"), "alternate");
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<html([^>]*)\slang=["'][^"']*["']/i, `<html$1 lang="${language}">`);
  html = html.replace(/<script[^>]*id=["']ld-graph["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

  const tagMeta = post.tags.slice(0, 12)
    .map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}" />`)
    .join("\n");
  const alternateLinks = alternatePath ? [
    `<link rel="alternate" hreflang="${language}" href="${canonical}" />`,
    `<link rel="alternate" hreflang="${language === "en" ? "ro" : "en"}" href="${SITE_URL}${alternatePath}" />`,
    `<link rel="alternate" hreflang="x-default" href="${language === "ro" ? canonical : `${SITE_URL}${alternatePath}`}" />`,
    `<meta property="og:locale:alternate" content="${language === "en" ? "ro_RO" : "en_US"}" />`,
  ].join("\n") : "";

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Avyron", url: SITE_URL,
        legalName: "DIGITAL ECOTECH SOLUTIONS S.R.L.",
        identifier: { "@type": "PropertyValue", propertyID: "CUI", value: "55055976" },
        logo: `${SITE_URL}/avyron-logo.jpg`,
      },
      {
        "@type": "BlogPosting",
        "@id": `${canonical}#article`,
        headline: post.title,
        description: post.excerpt,
        image: [image],
        datePublished: published,
        dateModified: modified,
        inLanguage: language === "en" ? "en" : "ro-RO",
        articleSection: post.category,
        keywords: post.tags.join(", "),
        author: { "@type": "Person", name: post.author_name || "Echipa Avyron" },
        publisher: { "@id": `${SITE_URL}/#organization` },
        mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: language === "en" ? "Home" : "Acasă", item: `${SITE_URL}${language === "en" ? "/en" : "/"}` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}${language === "en" ? "/en/blog" : "/blog"}` },
          { "@type": "ListItem", position: 3, name: post.title, item: canonical },
        ],
      },
    ],
  };
  const safeGraph = JSON.stringify(graph).replace(/</g, "\\u003c");

  html = insertHead(html, `
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${canonical}" />
    ${alternateLinks}
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Avyron" />
    <meta property="og:locale" content="${language === "en" ? "en_US" : "ro_RO"}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(socialTitle)}" />
    <meta property="og:description" content="${escapeHtml(socialDescription)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(post.cover_image_alt || post.title)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="article:published_time" content="${published}" />
    <meta property="article:modified_time" content="${modified}" />
    <meta property="article:section" content="${escapeHtml(post.category)}" />
    ${tagMeta}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(socialTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(socialDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(post.cover_image_alt || post.title)}" />
    <script id="ld-graph" type="application/ld+json">${safeGraph}</script>`);

  const dateLabel = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "ro-RO", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest",
  }).format(new Date(published));
  const article = `<main id="edge-blog-article" style="max-width:960px;margin:0 auto;padding:7rem 1.25rem 4rem;font:18px/1.7 system-ui,sans-serif">
    <nav aria-label="Breadcrumb"><a href="${language === "en" ? "/en/blog" : "/blog"}">${language === "en" ? "All insights" : "Toate articolele"}</a></nav>
    <article>
      <header><p>${escapeHtml(post.category)}</p><h1>${escapeHtml(post.title)}</h1><p>${escapeHtml(post.excerpt)}</p><p>${escapeHtml(post.author_name || "Echipa Avyron")} · <time datetime="${published}">${escapeHtml(dateLabel)}</time></p></header>
      <figure><img src="${escapeHtml(image)}" alt="${escapeHtml(post.cover_image_alt || post.title)}" width="1200" height="630" style="max-width:100%;height:auto" /></figure>
      <div>${markdownToHtml(post.content)}</div>
    </article>
  </main>`;
  return html.replace(/<div\s+id=["']root["']\s*><\/div>/i, `<div id="root">${article}</div>`);
}

/** Adds database-backed canonical articles to the generated static sitemap. */
export function mergeBlogSitemap(xml: string, entries: EdgeSitemapEntry[]) {
  const additions: string[] = [];
  for (const entry of entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) continue;
    const path = `${entry.language === "en" ? "/en/blog" : "/blog"}/${entry.slug}`;
    const loc = `${SITE_URL}${path}`;
    if (xml.includes(`<loc>${loc}</loc>`)) continue;
    const alternate = entry.alternate_slug
      ? `${SITE_URL}${entry.language === "en" ? "/blog" : "/en/blog"}/${entry.alternate_slug}`
      : null;
    additions.push(`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${isoDate(entry.updated_at)}</lastmod>${alternate ? `\n    <xhtml:link rel="alternate" hreflang="${entry.language}" href="${loc}"/>\n    <xhtml:link rel="alternate" hreflang="${entry.language === "en" ? "ro" : "en"}" href="${alternate}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${entry.language === "ro" ? loc : alternate}"/>` : ""}\n  </url>`);
  }
  return additions.length ? xml.replace(/<\/urlset>\s*$/i, `${additions.join("\n")}\n</urlset>`) : xml;
}
