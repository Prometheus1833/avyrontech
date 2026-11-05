import { blogLink,FAQ_ITEMS,faqCopy,finalCta,services } from '@/data/managedServiceCopy/blogClosing';
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { ArrowRight,ArrowUpRight,ChevronLeft,ChevronRight,Minus,Plus } from "lucide-react";
import { useEffect,useRef,useState } from "react";
import { Link } from "react-router-dom";

import { BLOG_INDEX,BLOG_INDEX_EN } from "@/data/blogIndex";
import { useLang } from "@/i18n/LanguageContext";
import { Panel,Section,SectionHead } from "./ui";

/* SCENE 16 — content services. SCENE 17 — AVYRON blog. SCENE 18 — FAQ. SCENE 19 — final CTA. */



export const ContentServices = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogClosing.services',services)[lang];
  return (
    <Section id="servicii-continut" scene="services" tone="soft" labelledBy="services-title">
      <SectionHead id="services-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {c.items.map((s) => (
          <Panel key={s.t} className="p-4">
            <s.icon className="size-5 text-brand" aria-hidden />
            <h3 className="mt-3 font-display text-[0.95rem] font-bold tracking-tight">{s.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
          </Panel>
        ))}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">{c.note}</p>
    </Section>
  );
};



export const AvyronBlogPreview = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogClosing.blogLink',blogLink)[lang];
  const posts = (lang === "ro" ? BLOG_INDEX : BLOG_INDEX_EN).slice(0, 8);
  const base = lang === "ro" ? "/blog" : "/en/blog";
  const trackRef = useRef<HTMLUListElement>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  const pause = (value: boolean) => {
    pausedRef.current = value;
    setPaused(value);
  };

  const halfWidth = () => {
    const el = trackRef.current;
    return el ? el.scrollWidth / 2 : 0;
  };

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 12 : el.clientWidth * 0.8;
    const half = halfWidth();
    let next = el.scrollLeft + dir * step;
    if (next >= half) next -= half;
    if (next < 0) next += half;
    el.scrollTo({ left: next, behavior: "smooth" });
  };

  /* Fluid continuous autoplay (right-to-left). Pauses while the pointer hovers or
     presses the track and resumes the moment it is released. Disabled for reduced motion. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    let last = performance.now();
    const SPEED = 42; // px per second — slow, editorial drift
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!pausedRef.current && el.scrollWidth > el.clientWidth) {
        const half = el.scrollWidth / 2;
        let next = el.scrollLeft + (SPEED * dt) / 1000;
        if (next >= half) next -= half;
        el.scrollLeft = next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lang]);

  return (
    <Section id="blog-avyron" scene="blog" labelledBy="blog-avyron-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHead id="blog-avyron-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label={c.prev}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border/70 bg-card/70 backdrop-blur transition-colors hover:border-brand/50 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label={c.next}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border/70 bg-card/70 backdrop-blur transition-colors hover:border-brand/50 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        className="relative mt-7 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
        onMouseEnter={() => pause(true)}
        onMouseLeave={() => pause(false)}
        onFocusCapture={() => pause(true)}
        onBlurCapture={() => pause(false)}
        onPointerDown={() => pause(true)}
        onPointerUp={() => pause(false)}
        onPointerCancel={() => pause(false)}
      >
        <ul
          ref={trackRef}
          aria-label={c.eyebrow}
          data-playing={!paused || undefined}
          className="scrollbar-subtle flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {[...posts, ...posts].map((post, i) => (
            <li
              key={`${post.id}-${i}`}
              data-card
              aria-hidden={i >= posts.length || undefined}
              className="w-[78%] shrink-0 sm:w-[46%] lg:w-[31.5%]"
            >
              <article className="group h-full">
                <Link
                  to={`${base}/${post.slug}`}
                  tabIndex={i >= posts.length ? -1 : undefined}
                  className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/70 p-4 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">{post.category}</span>
                  <h3 className="mt-2.5 font-display text-base font-bold leading-snug tracking-tight">{post.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-3.5 text-xs font-semibold text-brand">
                    {c.read}
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </div>

      <Link
        to={base}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/80 px-4 py-2.5 text-sm font-semibold transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {c.all}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Section>
  );
};






export const BlogFaq = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogClosing.faqCopy',faqCopy)[lang];
  const items = useServicePageContent('blog-profesional','blogClosing.FAQ_ITEMS',FAQ_ITEMS)[lang];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" scene="faq" tone="soft" labelledBy="faq-title">
      <SectionHead id="faq-title" eyebrow={c.eyebrow} title={c.title} />
      <ul className="mt-8 space-y-2.5">
        {items.map((item, i) => {
          const expanded = open === i;
          return (
            <li key={item.q} className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`faq-panel-${i}`}
                  onClick={() => setOpen(expanded ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {item.q}
                  {expanded ? (
                    <Minus className="size-4 shrink-0 text-brand" aria-hidden />
                  ) : (
                    <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                </button>
              </h3>
              <div id={`faq-panel-${i}`} hidden={!expanded} className="px-4 pb-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
};



export const FinalCta = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogClosing.finalCta',finalCta)[lang];
  return (
    <Section id="cta-final" scene="final" tone="graphite" labelledBy="final-title">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-background/60">{c.eyebrow}</p>
        <h2 id="final-title" className="mt-2.5 font-display text-2xl font-bold leading-tight tracking-tight text-background sm:text-4xl">
          {c.title}
        </h2>
        <p className="mt-3 text-sm text-background/70">{c.lead}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="#configurator-blog"
            className="inline-flex items-center gap-2 rounded-full bg-background px-5 py-3 text-sm font-semibold text-foreground transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow"
          >
            {c.primary}
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <Link
            to={c.to}
            className="inline-flex items-center gap-2 rounded-full border border-background/30 px-5 py-3 text-sm font-semibold text-background transition-colors hover:border-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow"
          >
            {c.secondary}
          </Link>
        </div>
      </div>
    </Section>
  );
};
