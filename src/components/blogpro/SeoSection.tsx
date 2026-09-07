import { Gauge, Link2, ListTree, Rss, ScanSearch, Network as SitemapIcon, Share2, Sparkles } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { Panel, Section, SectionHead } from "./ui";

/* SCENE 06 — SEO engine. SCENE 07 — content architecture. */

const seo = {
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
      { icon: Network as SitemapIcon, Share2, t: "Open Graph & social", d: "Previzualizări corecte pe fiecare rețea." },
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
      { icon: Network as SitemapIcon, Share2, t: "Open Graph & social", d: "Correct previews on every network." },
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

export const SeoEngine = () => {
  const { lang } = useLang();
  const c = seo[lang];
  return (
    <Section id="seo" scene="seo" tone="graphite" labelledBy="seo-title">
      <SectionHead id="seo-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} invert />
      <div className="mt-9 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]">
        <ul className="grid gap-3 sm:grid-cols-2">
          {c.items.map((item) => (
            <li
              key={item.t}
              data-reveal
              className="rounded-2xl border border-background/15 bg-background/[0.06] p-4 transition-colors duration-300 hover:border-background/35"
            >
              <item.icon className="size-5 text-brand-glow" aria-hidden />
              <h3 className="mt-3 font-display text-[0.95rem] font-bold tracking-tight text-background">{item.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-background/65">{item.d}</p>
            </li>
          ))}
        </ul>

        <Panel invert className="h-fit p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-background/55">{c.preview.label}</p>
          <div className="mt-3 rounded-xl bg-background/95 p-3.5 text-foreground">
            <p className="text-[11px] text-muted-foreground">{c.preview.url}</p>
            <p className="mt-1 text-sm font-semibold text-brand">{c.preview.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.preview.desc}</p>
          </div>
          <div className="mt-3 rounded-xl border border-background/15 p-3.5">
            <div aria-hidden className="h-16 rounded-lg bg-gradient-to-br from-brand/40 to-brand-2/30" />
            <p className="mt-2 text-xs font-semibold text-background">{c.preview.title}</p>
            <p className="mt-1 text-[11px] text-background/60">avyron.ro</p>
          </div>
        </Panel>
      </div>
    </Section>
  );
};

const arch = {
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

export const ContentArchitecture = () => {
  const { lang } = useLang();
  const c = arch[lang];
  const radius = 122;
  const center = { x: 170, y: 150 };

  return (
    <Section id="arhitectura" scene="architecture" labelledBy="arch-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div>
          <SectionHead id="arch-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
          <ul className="mt-5 space-y-2.5">
            {c.notes.map((n) => (
              <li key={n} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                {n}
              </li>
            ))}
          </ul>
        </div>

        <div data-reveal className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-soft">
          <svg viewBox="0 0 340 300" role="img" aria-label={c.title} className="h-auto w-full">
            <g stroke="hsl(var(--border))" strokeWidth="1.2">
              {c.nodes.map((_, i) => {
                const a = (i / c.nodes.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <line
                    key={i}
                    x1={center.x}
                    y1={center.y}
                    x2={center.x + Math.cos(a) * radius}
                    y2={center.y + Math.sin(a) * radius}
                  />
                );
              })}
            </g>
            {c.nodes.map((node, i) => {
              const a = (i / c.nodes.length) * Math.PI * 2 - Math.PI / 2;
              const x = center.x + Math.cos(a) * radius;
              const y = center.y + Math.sin(a) * radius;
              return (
                <g key={node}>
                  <circle cx={x} cy={y} r="26" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
                  <text
                    x={x}
                    y={y + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {node}
                  </text>
                </g>
              );
            })}
            <circle cx={center.x} cy={center.y} r="44" fill="hsl(var(--brand))" opacity="0.12" />
            <circle cx={center.x} cy={center.y} r="34" fill="hsl(var(--brand))" />
            <text
              x={center.x}
              y={center.y + 3}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="700"
              fill="hsl(var(--brand-foreground))"
            >
              {c.center}
            </text>
          </svg>
        </div>
      </div>
    </Section>
  );
};
