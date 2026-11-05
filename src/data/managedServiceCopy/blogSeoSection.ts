import { Gauge, Link2, ListTree, Rss, ScanSearch, Network as SitemapIcon, Share2, Sparkles } from "lucide-react";
export const seo = {
  ro: {
    eyebrow: "Motorul SEO",
    title: "SEO tehnic construit în platformă, nu adăugat după",
    lead: "Fiecare articol se naște cu structura, metadatele și semnalele de care au nevoie motoarele de căutare și sistemele moderne de răspuns.",
    items: [
      { icon: ListTree, t: "Structură semantică", d: "H1–H3 coerente, secțiuni logice, conținut ușor de parcurs." },
      { icon: ScanSearch, t: "Date structurate", d: "Schema pentru articole, autori și breadcrumbs." },
      { icon: SitemapIcon, t: "Sitemap automat", d: "Se actualizează la fiecare publicare." },
      { icon: Link2, t: "Canonical & indexare", d: "Reguli clare, fără conținut duplicat." },
      { icon: Rss, t: "Feed RSS", d: "Distribuție și sindicalizare fără efort." },
      { icon: Share2, t: "Open Graph & social", d: "Previzualizări corecte pe fiecare rețea." },
      { icon: Gauge, t: "Core Web Vitals", d: "Viteză, stabilitate vizuală și interacțiune rapidă." },
      { icon: Sparkles, t: "Pregătit pentru AI", d: "Conținut clar, ușor de extras și de citat." },
    ],
    preview: {
      label: "Previzualizare rezultat",
      url: "avyron.ro › blog › strategie-continut",
      title: "Strategie de conținut pentru companii B2B | AVYRON",
      desc: "Cum construiești un blog care aduce cereri de ofertă: structură, distribuție și măsurare.",
    },
  },
  en: {
    eyebrow: "SEO engine",
    title: "Technical SEO built into the platform, not bolted on",
    lead: "Every article is born with the structure, metadata and signals that search engines and modern answer systems need.",
    items: [
      { icon: ListTree, t: "Semantic structure", d: "Coherent H1–H3, logical sections, content that scans well." },
      { icon: ScanSearch, t: "Structured data", d: "Schema for articles, authors and breadcrumbs." },
      { icon: SitemapIcon, t: "Automatic sitemap", d: "Updated on every publish." },
      { icon: Link2, t: "Canonical & indexing", d: "Clear rules, no duplicate content." },
      { icon: Rss, t: "RSS feed", d: "Effortless distribution and syndication." },
      { icon: Share2, t: "Open Graph & social", d: "Correct previews on every network." },
      { icon: Gauge, t: "Core Web Vitals", d: "Speed, visual stability and fast interaction." },
      { icon: Sparkles, t: "AI ready", d: "Clear content, easy to extract and to cite." },
    ],
    preview: {
      label: "Result preview",
      url: "avyron.ro › blog › content-strategy",
      title: "Content strategy for B2B companies | AVYRON",
      desc: "How to build a blog that generates enquiries: structure, distribution and measurement.",
    },
  },
} as const;
export const arch = {
  ro: {
    eyebrow: "Arhitectura conținutului",
    title: "Articolele lucrează împreună, nu separat",
    lead: "Categorii, taguri, articole pilon și linking intern formează o structură pe care motoarele o înțeleg și cititorii o parcurg natural.",
    center: "Articol pilon",
    nodes: ["Categorie", "Ghid", "Studiu de caz", "Tag", "Articol conex", "Resursă"],
    notes: [
      "Linking intern automatizat între subiecte înrudite",
      "Clustere tematice care consolidează autoritatea",
      "Structură scalabilă de la 10 la 10.000 de articole",
    ],
  },
  en: {
    eyebrow: "Content architecture",
    title: "Articles work together, not in isolation",
    lead: "Categories, tags, pillar articles and internal linking form a structure engines understand and readers follow naturally.",
    center: "Pillar article",
    nodes: ["Category", "Guide", "Case study", "Tag", "Related post", "Resource"],
    notes: [
      "Automated internal linking between related topics",
      "Topic clusters that compound authority",
      "A structure that scales from 10 to 10,000 articles",
    ],
  },
} as const;