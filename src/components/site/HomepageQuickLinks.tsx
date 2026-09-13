import { ArrowUpRight, Briefcase, UsersRound, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";

export default function HomepageQuickLinks() {
  const { lang } = useLang();
  const ro = lang === "ro";
  const cards = [
    {
      to: ro ? "/costurisiproduse" : "/en/pricing",
      eyebrow: ro ? "Transparență totală" : "Full transparency",
      title: ro ? "Costuri și produse" : "Pricing and products",
      detail: ro ? "Produse, configurații și repere de buget prezentate clar." : "Products, configurations and clear budget guidance.",
      icon: Wallet,
      testId: "pricing-card",
      tone: "from-violet-500/15 to-cyan-500/[0.05] text-violet-600 dark:text-violet-300",
    },
    {
      to: ro ? "/portofoliu" : "/en/portfolio",
      eyebrow: ro ? "Proiecte, exemple și parteneri" : "Projects, examples and partners",
      title: ro ? "Portofoliu și colaborări" : "Portfolio and collaborations",
      detail: ro ? "Vezi proiecte și direcții potrivite pentru o colaborare." : "Explore projects and directions suited to a collaboration.",
      icon: Briefcase,
      testId: "portfolio-card",
      tone: "from-cyan-500/15 to-blue-500/[0.05] text-cyan-600 dark:text-cyan-300",
    },
    {
      to: ro ? "/despre-noi" : "/en/about",
      eyebrow: ro ? "Echipa din spatele produselor" : "The team behind the products",
      title: ro ? "Despre noi" : "About us",
      detail: ro ? "Web design, development, cybersecurity și QA, reunite într-un proces clar." : "Web design, development, cybersecurity and QA in one clear process.",
      icon: UsersRound,
      testId: "about-card",
      tone: "from-fuchsia-500/15 to-violet-500/[0.05] text-fuchsia-600 dark:text-fuchsia-300",
    },
  ];

  return <section aria-label={ro ? "Descoperă Avyron" : "Discover Avyron"} className="py-8 md:py-12">
    <div className="mx-auto grid max-w-6xl gap-3 px-4 md:grid-cols-3">
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
