import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const Hero = () => {
  const { t } = useLang();
  return (
    <section id="top" className="relative pt-24 pb-12 md:pt-36 md:pb-24 overflow-hidden bg-hero">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-soft">
            <Sparkles className="size-3.5 text-brand" /> {t.hero.badge}
          </div>
          <h1 className="mt-5 font-display text-[2.5rem] sm:text-5xl md:text-7xl lg:text-8xl font-bold leading-[1] md:leading-[0.95] tracking-tight max-w-4xl break-words">
            {t.hero.title1} <span className="text-gradient">{t.hero.title2}</span> {t.hero.title3}
          </h1>
          <p className="mt-5 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl px-2">
            {t.hero.subtitle}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row flex-wrap gap-3 justify-center w-full sm:w-auto px-2">
            <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-12 px-6 w-full sm:w-auto">
              <a href="#cta">{t.hero.ctaPrimary} <ArrowRight className="ml-1 size-4" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-6 border-foreground/20 hover:bg-foreground/5 w-full sm:w-auto">
              <a href="#exemple">{t.hero.ctaSecondary}</a>
            </Button>
          </div>
        </motion.div>
        <div className="mt-10 md:mt-12 flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-3 text-xs sm:text-sm text-muted-foreground justify-center px-2">
          {t.hero.stats.map((s, i) => (
            <div key={i} className="flex items-center gap-x-4 sm:gap-x-6">
              <div className="text-center sm:text-left"><span className="font-display font-bold text-foreground text-lg sm:text-2xl">{s.v}</span> <span className="block sm:inline">{s.l}</span></div>
              {i < t.hero.stats.length - 1 && <div className="h-8 w-px bg-border hidden sm:block" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
