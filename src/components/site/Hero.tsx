import { ArrowRight, ChevronDown, TrendingUp } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";

const Hero = () => {
  const { t, lang } = useLang();
  const ro = lang === "ro";
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
          <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-2.5 px-2">
            <Link
              to={ro ? "/despre-noi" : "/en/about"}
              className="inline-flex h-12 min-w-0 items-center justify-center rounded-full bg-foreground px-3 text-center text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {ro ? "Despre noi" : "About us"}
            </Link>
            <Link
              to={ro ? "/costurisiproduse" : "/en/pricing"}
              className="inline-flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-full border border-foreground/20 bg-background px-3 text-center text-sm font-semibold transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {ro ? "Vezi Produse" : "View Products"}
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" focusable="false" />
            </Link>
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
