import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section id="top" className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-hero">
      <div className="mx-auto max-w-5xl px-4 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-soft">
            <Sparkles className="size-3.5 text-brand" /> Site-uri care aduc clienți, nu doar vizite
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight max-w-4xl">
            Vizibilitate. <span className="text-gradient">Încredere.</span> Clienți.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            Proiectăm experiențe digitale rafinate, performante și optimizate pentru conversie — gândite să transforme fiecare vizită într-o oportunitate reală.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-12 px-6">
              <a href="#cta">Vreau demo gratuit <ArrowRight className="ml-1 size-4" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-6 border-foreground/20 hover:bg-foreground/5">
              <a href="#exemple">Vezi exemple</a>
            </Button>
          </div>
        </motion.div>
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground justify-center">
          <div><span className="font-display font-bold text-foreground text-2xl">100%</span> mobile-ready</div>
          <div className="h-8 w-px bg-border hidden sm:block" />
          <div><span className="font-display font-bold text-foreground text-2xl">SEO</span> optimizat</div>
          <div className="h-8 w-px bg-border hidden sm:block" />
          <div><span className="font-display font-bold text-foreground text-2xl">A+</span> securitate</div>
          <div className="h-8 w-px bg-border hidden sm:block" />
          <div><span className="font-display font-bold text-foreground text-2xl">QA</span> testat</div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
