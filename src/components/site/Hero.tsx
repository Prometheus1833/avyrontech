import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero.jpg";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section id="top" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-hero">
      <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-2 gap-10 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-soft">
            <Sparkles className="size-3.5 text-brand" /> Site-uri care aduc clienți, nu doar vizite
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight">
            Vizibilitate. <span className="text-gradient">Încredere.</span> Clienți.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-md">
            În online, vizibilitatea înseamnă încredere. Fără ea, clienții aleg altă variantă. Construim site-uri rapide, frumoase și optimizate — în 2-5 zile.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-12 px-6">
              <a href="#cta">Vreau demo gratuit <ArrowRight className="ml-1 size-4" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-6 border-foreground/20 hover:bg-foreground/5">
              <a href="#exemple">Vezi exemple</a>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <div><span className="font-display font-bold text-foreground text-2xl">2-5</span> zile livrare</div>
            <div className="h-8 w-px bg-border" />
            <div><span className="font-display font-bold text-foreground text-2xl">100%</span> mobile-ready</div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="hidden sm:block"><span className="font-display font-bold text-foreground text-2xl">QA</span> testat</div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-elev float">
            <img src={heroImg} alt="Webcore — site-uri moderne" className="w-full h-full object-cover" width={1536} height={1024} />
          </div>
          <div className="absolute -bottom-4 -left-4 glass shadow-soft rounded-2xl px-4 py-3 text-sm font-medium hidden sm:block">
            ⚡ PageSpeed 98/100
          </div>
          <div className="absolute -top-4 -right-4 glass shadow-soft rounded-2xl px-4 py-3 text-sm font-medium hidden sm:block">
            📱 100% Responsive
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
