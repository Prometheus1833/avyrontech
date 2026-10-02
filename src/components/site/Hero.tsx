import { ArrowRight, BookOpen, ChevronDown, Layers, ShoppingBag, TrendingUp } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const Hero = () => {
  const { t, lang } = useLang();
  const ro = lang === "ro";

  const quickLinks = [
    {
      key: "services",
      to: ro ? "/servicii" : "/en/services",
      label: t.hero.ctaServices,
      short: ro ? "Servicii" : "Services",
      icon: Layers,
      tone:
        "border-cyan-300/50 bg-cyan-300/10 text-cyan-900 hover:border-cyan-300/80 hover:bg-cyan-300/20 dark:border-cyan-300/25 dark:text-cyan-100",
    },
    {
      key: "blog",
      to: ro ? "/blog" : "/en/blog",
      label: t.hero.ctaBlog,
      short: "Blog",
      icon: BookOpen,
      tone:
        "border-rose-300/50 bg-rose-300/10 text-rose-900 hover:border-rose-300/80 hover:bg-rose-300/20 dark:border-rose-300/25 dark:text-rose-100",
    },
    {
      key: "products",
      to: ro ? "/produse" : "/en/products",
      label: t.hero.ctaProducts,
      short: ro ? "Produse" : "Products",
      icon: ShoppingBag,
      tone:
        "border-emerald-300/50 bg-emerald-300/10 text-emerald-900 hover:border-emerald-300/80 hover:bg-emerald-300/20 dark:border-emerald-300/25 dark:text-emerald-100",
    },
  ];

  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] md:min-h-0 flex flex-col items-center justify-center md:justify-start pt-24 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-hero"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center flex flex-col items-center justify-center md:justify-start w-full">
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-soft">
            <TrendingUp className="size-3.5 text-brand" aria-hidden="true" focusable="false" /> {t.hero.badge}
          </div>
          <h1 className="mt-5 font-display text-[1.80625rem] sm:text-[2.1675rem] md:text-[3.25125rem] lg:text-[4.335rem] font-bold leading-[1] md:leading-[0.95] tracking-tight max-w-4xl break-words">
            {t.hero.title1} <span className="text-gradient">{t.hero.title2}</span> {t.hero.title3}
          </h1>
          <p className="mt-5 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl px-2">
            {t.hero.subtitle}
          </p>

          <div className="mt-7 flex w-full flex-col items-center px-2">
            <a
              href="#cta"
              className="group inline-flex min-h-12 max-w-full flex-col items-center justify-center rounded-full bg-foreground px-5 py-2 text-center text-sm leading-tight text-background shadow-soft transition-all hover:bg-foreground/90 hover:shadow-elev active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex items-center font-semibold">
                {t.hero.ctaPrimary}
                <ArrowRight
                  className="ml-1 size-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5"
                  aria-hidden="true"
                  focusable="false"
                />
              </span>
              <span className="text-[11px] font-normal opacity-80">{t.hero.personalized}</span>
            </a>

            <div
              data-testid="hero-quick-links"
              className="mt-2.5 grid grid-cols-3 gap-2"
            >
              {quickLinks.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  aria-label={item.label}
                  className={cn(
                    "inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 text-[13px] font-semibold leading-none transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    item.tone
                  )}
                >
                  <item.icon className="size-4 shrink-0 opacity-90" aria-hidden="true" focusable="false" />
                  <span className="truncate">
                    <span className="sm:hidden">{item.short}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-10 md:mt-12 flex flex-nowrap items-center gap-x-3 sm:gap-x-6 text-sm sm:text-base text-muted-foreground justify-center px-2 overflow-x-auto">
          {t.hero.stats.map((s, i) => (
            <div key={i} className="flex items-center gap-x-3 sm:gap-x-6 shrink-0">
              <div className="text-center sm:text-left whitespace-nowrap"><span className="font-display font-bold text-foreground text-lg sm:text-2xl">{s.v}</span> <span className="block sm:inline">{s.l}</span></div>
              {i < t.hero.stats.length - 1 && <div className="h-8 w-px bg-border hidden sm:block" />}
            </div>
          ))}
        </div>
      </div>

      {/* Soft transition to the next section */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 md:h-32 bg-gradient-to-b from-transparent to-background pointer-events-none z-10"
        aria-hidden
      />

      {/* Scroll hint — mobile only */}
      <a
        href="#de-ce"
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-muted-foreground/60 md:hidden"
        aria-label="Mergi la secțiunea următoare"
      >
        <span className="motion-safe:animate-bounce">
          <ChevronDown className="size-6" />
        </span>
      </a>
    </section>
  );
};

export default Hero;
