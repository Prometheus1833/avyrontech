import { ArrowUpRight, BookOpen, Layers, ShoppingBag, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";

export default function HomepageQuickLinks() {
  const { lang } = useLang();
  const ro = lang === "ro";
  const cards = [
    {
      to: ro ? "/servicii" : "/en/services",
      eyebrow: ro ? "Descoperă ce construim" : "Explore what we build",
      title: ro ? "Servicii și câteva exemple" : "Services and examples",
      detail: ro ? "Vezi serviciile Avyron și exemple relevante pentru fiecare direcție." : "Explore Avyron services and relevant examples for every direction.",
      icon: Layers,
      testId: "services-examples-card",
      tone: "from-cyan-500/15 to-blue-500/[0.05] text-cyan-600 dark:text-cyan-300",
    },
    {
      to: ro ? "/produse" : "/en/products",
      eyebrow: ro ? "Soluții gata de explorat" : "Solutions ready to explore",
      title: ro ? "Produse" : "Products",
      detail: ro ? "Descoperă produsele digitale și alege varianta potrivită proiectului tău." : "Discover digital products and choose the right fit for your project.",
      icon: ShoppingBag,
      testId: "products-card",
      tone: "from-emerald-500/15 to-cyan-500/[0.05] text-emerald-600 dark:text-emerald-300",
    },
    {
      to: ro ? "/blog" : "/en/blog",
      eyebrow: ro ? "Idei și resurse digitale" : "Digital ideas and resources",
      title: "Blog Avyron",
      detail: ro ? "Citește ghiduri practice despre web, tehnologie, securitate și creștere online." : "Read practical guides about web, technology, security and online growth.",
      icon: BookOpen,
      testId: "blog-card",
      tone: "from-rose-500/15 to-fuchsia-500/[0.05] text-rose-600 dark:text-rose-300",
    },
    {
      to: ro ? "/despre-noi" : "/en/about",
      eyebrow: ro ? "Cunoaște echipa" : "Meet the team",
      title: ro ? "Despre Noi" : "About us",
      detail: ro ? "Web design, development, cybersecurity și QA, reunite într-un proces clar." : "Web design, development, cybersecurity and QA in one clear process.",
      icon: UsersRound,
      testId: "about-card",
      tone: "from-fuchsia-500/15 to-violet-500/[0.05] text-fuchsia-600 dark:text-fuchsia-300",
    },
  ];

  return <section aria-label={ro ? "Descoperă Avyron" : "Discover Avyron"} className="pt-8 pb-3 md:pt-12 md:pb-4">
    <div className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ to, eyebrow, title, detail, icon: Icon, testId, tone }) => <Link key={to} to={to} data-testid={testId} className={`group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br ${tone} p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-elev sm:p-5`}>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-current/15 bg-background/70"><Icon className="size-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</span>
            <span className="mt-1 block font-display text-base font-bold text-foreground">{title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{detail}</span>
          </span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
        </div>
      </Link>)}
    </div>
  </section>;
}
