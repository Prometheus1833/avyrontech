import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Minus, PenLine, Plus, Repeat2, ShieldCheck, Wrench } from "lucide-react";

import { useLang } from "@/i18n/LanguageContext";
import { BLOG_INDEX, BLOG_INDEX_EN } from "@/data/blogIndex";
import { Panel, Section, SectionHead } from "./ui";

/* SCENE 16 — content services. SCENE 17 — AVYRON blog. SCENE 18 — FAQ. SCENE 19 — final CTA. */

const services = {
  ro: {
    eyebrow: "Servicii opționale",
    title: "Dacă vrei, ne ocupăm și de conținut",
    lead: "Platforma funcționează perfect și dacă publici singur. Când ai nevoie de sprijin, îl oferim în pachete clare, cotate separat.",
    items: [
      { icon: PenLine, t: "Strategie de conținut", d: "Subiecte, cuvinte-cheie, calendar editorial și priorități." },
      { icon: Repeat2, t: "Redactare articole", d: "Articole scrise pentru publicul tău și optimizate SEO." },
      { icon: Wrench, t: "Mentenanță & publicare", d: "Actualizări tehnice, publicare recurentă, monitorizare." },
      { icon: ShieldCheck, t: "Optimizare continuă", d: "Actualizarea articolelor existente și raportare lunară." },
    ],
    note: "Serviciile recurente se cotează separat, în funcție de volum și ritm de publicare.",
  },
  en: {
    eyebrow: "Optional services",
    title: "If you want, we handle the content too",
    lead: "The platform works perfectly if you publish on your own. When you need support, we offer it in clear packages, quoted separately.",
    items: [
      { icon: PenLine, t: "Content strategy", d: "Topics, keywords, editorial calendar and priorities." },
      { icon: Repeat2, t: "Article writing", d: "Articles written for your audience and optimised for SEO." },
      { icon: Wrench, t: "Maintenance & publishing", d: "Technical updates, recurring publishing, monitoring." },
      { icon: ShieldCheck, t: "Continuous optimisation", d: "Refreshing existing articles and monthly reporting." },
    ],
    note: "Recurring services are quoted separately, based on volume and publishing rhythm.",
  },
} as const;

export const ContentServices = () => {
  const { lang } = useLang();
  const c = services[lang];
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

const blogLink = {
  ro: {
    eyebrow: "Blogul AVYRON",
    title: "Vezi standardul nostru editorial în practică",
    lead: "Publicăm despre web, SEO, automatizări și strategie digitală. Aceleași principii stau la baza blogurilor pe care le construim.",
    all: "Citește blogul AVYRON",
    read: "Citește articolul",
    prev: "Articolul anterior",
    next: "Articolul următor",
  },
  en: {
    eyebrow: "AVYRON blog",
    title: "See our editorial standard in practice",
    lead: "We publish about web, SEO, automation and digital strategy. The same principles power the blogs we build.",
    all: "Read the AVYRON blog",
    read: "Read the article",
    prev: "Previous article",
    next: "Next article",

  },
} as const;

export const AvyronBlogPreview = () => {
  const { lang } = useLang();
  const c = blogLink[lang];
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


export const FAQ_ITEMS = {
  ro: [
    {
      q: "Pot publica singur, fără ajutor tehnic?",
      a: "Da. Panoul de administrare este gândit pentru publicare fără cunoștințe tehnice, iar la final facem o sesiune de instruire.",
    },
    {
      q: "Îmi puteți muta blogul existent?",
      a: "Da. Migrarea se configurează în calculator, în funcție de numărul de articole, și poate include maparea URL-urilor, redirecturi 301, imagini, metadata, categorii și autori.",
    },
    {
      q: "Blogul este optimizat SEO din start?",
      a: "Da. Structura semantică, datele structurate, sitemap-ul, feed-ul RSS, canonical-urile și optimizarea de performanță fac parte din pachetul de bază.",
    },
    {
      q: "Pot avea blog în mai multe limbi?",
      a: "Da. Poți alege 2, 3 sau mai multe limbi în configurator. Prețul acoperă infrastructura multilingvă; traducerea integrală a conținutului se cotează separat.",
    },
    {
      q: "Câte articole pot publica?",
      a: "Nelimitat. Nu taxăm numărul de articole publicate, iar structura rămâne scalabilă pe măsură ce conținutul crește.",
    },
    {
      q: "Cât durează implementarea?",
      a: "Durata depinde de complexitatea aleasă în configurator și de ritmul în care primim conținutul și feedback-ul. O estimare de timp o primești odată cu oferta.",
    },
    {
      q: "Funcțiile AI sunt obligatorii?",
      a: "Nu. Toate modulele AI sunt opționale. Le activăm doar dacă îți aduc un beneficiu clar, iar publicarea rămâne o decizie umană.",
    },
    {
      q: "Ce se întâmplă după lansare?",
      a: "Poți continua singur sau poți alege servicii recurente de conținut, mentenanță și optimizare, cotate separat.",
    },
  ],
  en: [
    {
      q: "Can I publish on my own, without technical help?",
      a: "Yes. The admin panel is designed for publishing without technical knowledge, and we run a training session at handover.",
    },
    {
      q: "Can you move my existing blog?",
      a: "Yes. Migration is configured in the calculator based on article count and can include URL mapping, 301 redirects, images, metadata, categories and authors.",
    },
    {
      q: "Is the blog SEO optimised from the start?",
      a: "Yes. Semantic structure, structured data, sitemap, RSS feed, canonicals and performance optimisation are part of the base package.",
    },
    {
      q: "Can I have the blog in several languages?",
      a: "Yes. You can select 2, 3 or more languages in the configurator. The price covers multilingual infrastructure; full content translation is quoted separately.",
    },
    {
      q: "How many articles can I publish?",
      a: "Unlimited. We never charge per published article, and the structure stays scalable as your content grows.",
    },
    {
      q: "How long does implementation take?",
      a: "It depends on the complexity chosen in the configurator and on how quickly we receive content and feedback. A timeline comes with the offer.",
    },
    {
      q: "Are the AI features mandatory?",
      a: "No. Every AI module is optional. We enable them only when they bring a clear benefit, and publishing stays a human decision.",
    },
    {
      q: "What happens after launch?",
      a: "You can continue on your own or choose recurring content, maintenance and optimisation services, quoted separately.",
    },
  ],
} as const;

const faqCopy = {
  ro: { eyebrow: "Întrebări frecvente", title: "Ce ne întreabă clienții înainte de start" },
  en: { eyebrow: "FAQ", title: "What clients ask before we start" },
} as const;

export const BlogFaq = () => {
  const { lang } = useLang();
  const c = faqCopy[lang];
  const items = FAQ_ITEMS[lang];
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

const finalCta = {
  ro: {
    eyebrow: "Următorul pas",
    title: "Expertiza ta merită un loc unde să lucreze pentru tine",
    lead: "Configurează blogul în câteva minute și primești o ofertă clară, cu pași concreți.",
    primary: "Configurează blogul",
    secondary: "Vezi toate produsele",
    to: "/costurisiproduse",
  },
  en: {
    eyebrow: "Next step",
    title: "Your expertise deserves a place where it works for you",
    lead: "Configure your blog in a few minutes and receive a clear offer with concrete next steps.",
    primary: "Configure your blog",
    secondary: "See all products",
    to: "/en/pricing",
  },
} as const;

export const FinalCta = () => {
  const { lang } = useLang();
  const c = finalCta[lang];
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
