import { ArrowRight, BookOpen, Bookmark, Gauge, Search, Share2, Sparkle } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { Chip, GridBackdrop } from "./ui";

/* SCENE 01 — HERO. Future: 3D article depth + pointer parallax (Three.js). */

const copy = {
  ro: {
    eyebrow: "Blog profesional & Content hub",
    h1: "Creare Blog Profesional & Content Hub",
    line1: "Transformă expertiza în trafic.",
    line2: "Traficul în autoritate.",
    line3: "Autoritatea în clienți.",
    lead: "Construim platforme editoriale rapide, inteligente și optimizate pentru SEO, create pentru publicare, descoperire, autoritate și conversie.",
    cta1: "Configurează blogul",
    cta2: "Descoperă cum funcționează",
    caps: ["CMS", "SEO tehnic", "Analytics", "AI", "Automatizări", "Content strategy"],
    card: {
      category: "Strategie digitală",
      title: "Cum devine un articol o sursă constantă de clienți",
      author: "Redacția Avyron",
      read: "6 min de citit",
      progress: "Progres lectură",
    },
    badges: { seo: "SEO ready", perf: "Performance optimized" },
    nodes: ["Google", "SEO", "Social", "Newsletter", "Analytics", "AI"],
  },
  en: {
    eyebrow: "Professional blog & Content hub",
    h1: "Professional blog & content hub development",
    line1: "Turn expertise into traffic.",
    line2: "Traffic into authority.",
    line3: "Authority into clients.",
    lead: "We build fast, intelligent, SEO-ready editorial platforms designed for publishing, discovery, authority and conversion.",
    cta1: "Configure your blog",
    cta2: "See how it works",
    caps: ["CMS", "Technical SEO", "Analytics", "AI", "Automation", "Content strategy"],
    card: {
      category: "Digital strategy",
      title: "How one article becomes a steady source of clients",
      author: "Avyron editorial",
      read: "6 min read",
      progress: "Reading progress",
    },
    badges: { seo: "SEO ready", perf: "Performance optimized" },
    nodes: ["Google", "SEO", "Social", "Newsletter", "Analytics", "AI"],
  },
} as const;

const scrollTo = (id: string) => () =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const BlogProHero = () => {
  const { lang } = useLang();
  const c = copy[lang];

  return (
    <section
      id="prezentare"
      data-scroll-scene="hero"
      className="relative scroll-mt-24 overflow-hidden border-b border-border/60 bg-background pb-14 pt-10 sm:pb-20 sm:pt-16"
    >
      <GridBackdrop />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-[26rem] rounded-full bg-brand/10 blur-3xl"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:items-center lg:gap-14">
        <div data-reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand">{c.eyebrow}</p>
          <h1 className="mt-3">
            <span className="sr-only">{c.h1}. </span>
            <span className="block font-display text-[1.9rem] font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              <span className="block">{c.line1}</span>
              <span className="block text-muted-foreground/80">{c.line2}</span>
              <span className="block bg-gradient-to-r from-brand via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                {c.line3}
              </span>
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[0.98rem]">
            {c.lead}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={scrollTo("configurator-blog")}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {c.cta1}
              <ArrowRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={scrollTo("content-journey")}
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-5 py-3 text-sm font-semibold transition-colors duration-200 hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {c.cta2}
            </button>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {c.caps.map((cap) => (
              <li key={cap} className="flex items-center gap-1.5">
                <Sparkle className="size-3 text-brand" aria-hidden />
                {cap}
              </li>
            ))}
          </ul>
        </div>

        {/* Central editorial object — reused conceptually across the page. */}
        <div className="relative" data-depth="1">
          <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block" aria-hidden>
            {c.nodes.map((node, i) => {
              const positions = [
                "left-[-6%] top-[6%]",
                "right-[-4%] top-[2%]",
                "right-[-8%] top-[42%]",
                "right-[2%] bottom-[2%]",
                "left-[-9%] bottom-[16%]",
                "left-[2%] bottom-[-4%]",
              ];
              return (
                <span
                  key={node}
                  className={`absolute ${positions[i]} rounded-full border border-border/70 bg-card/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-soft backdrop-blur`}
                >
                  {node}
                </span>
              );
            })}
          </div>

          <article className="relative rounded-[1.4rem] border border-border/70 bg-card/85 p-4 shadow-soft backdrop-blur sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                {c.card.category}
              </span>
              <span className="text-[11px] text-muted-foreground">{c.card.read}</span>
            </div>

            <div
              aria-hidden
              className="mt-3.5 h-32 rounded-xl bg-[linear-gradient(120deg,hsl(var(--brand)/0.22),transparent_55%),radial-gradient(circle_at_80%_20%,hsl(var(--brand)/0.28),transparent_60%)] ring-1 ring-inset ring-border/60 sm:h-40"
            />

            <h2 className="mt-4 font-display text-lg font-bold leading-snug tracking-tight sm:text-xl">
              {c.card.title}
            </h2>

            <div className="mt-3 flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-brand/30 to-violet-500/20 text-[11px] font-bold text-brand"
              >
                AV
              </span>
              <span className="text-xs text-muted-foreground">{c.card.author}</span>
              <span className="ml-auto flex items-center gap-2 text-muted-foreground">
                <Bookmark className="size-4" aria-hidden />
                <Share2 className="size-4" aria-hidden />
                <Search className="size-4" aria-hidden />
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <span>{c.card.progress}</span>
                <span>62%</span>
              </div>
              <div aria-hidden className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-brand to-violet-500" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-background/60 p-2.5">
                  <div aria-hidden className="h-1.5 w-10 rounded-full bg-brand/40" />
                  <div aria-hidden className="mt-2 h-1.5 w-full rounded-full bg-muted" />
                  <div aria-hidden className="mt-1.5 h-1.5 w-2/3 rounded-full bg-muted" />
                </div>
              ))}
            </div>
          </article>

          <Chip className="absolute -bottom-3 left-3 shadow-soft backdrop-blur">
            <Gauge className="size-3.5 text-brand" aria-hidden />
            {c.badges.perf}
          </Chip>
          <Chip className="absolute -top-3 right-4 shadow-soft backdrop-blur">
            <BookOpen className="size-3.5 text-brand" aria-hidden />
            {c.badges.seo}
          </Chip>
        </div>
      </div>
    </section>
  );
};

export default BlogProHero;
