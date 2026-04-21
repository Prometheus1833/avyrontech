import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero.jpg";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section id="top" className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden bg-hero">
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
          <p className="mt-5 text-lg text-muted-foreground max-w-xl">
            În online, vizibilitatea înseamnă încredere. Fără ea, clienții aleg altă variantă. Construim site-uri rapide, frumoase și optimizate — în 2-5 zile.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-12 px-6">
              <a href="#cta">Vreau demo gratuit <ArrowRight className="ml-1 size-4" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-6 border-foreground/20 hover:bg-foreground/5">
              <a href="#exemple">Vezi exemple</a>
            </Button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-12 w-full max-w-3xl"
        >
          <div className="relative aspect-[4/3] md:aspect-[16/10] rounded-[2rem] overflow-hidden shadow-elev float">
            <img src={heroImg} alt="Webcore — site-uri moderne care aduc clienți" className="w-full h-full object-cover" width={1280} height={1280} />
          </div>
          <div className="absolute -bottom-4 -left-4 glass shadow-soft rounded-2xl px-4 py-3 text-sm font-medium hidden sm:block">
            ⚡ PageSpeed 98/100
          </div>
          <div className="absolute -top-4 -right-4 glass shadow-soft rounded-2xl px-4 py-3 text-sm font-medium hidden sm:block">
            📱 100% Responsive
          </div>
        </motion.div>
        <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground justify-center">
          <div><span className="font-display font-bold text-foreground text-2xl">2-5</span> zile livrare</div>
          <div className="h-8 w-px bg-border" />
          <div><span className="font-display font-bold text-foreground text-2xl">100%</span> mobile-ready</div>
          <div className="h-8 w-px bg-border hidden sm:block" />
          <div className="hidden sm:block"><span className="font-display font-bold text-foreground text-2xl">QA</span> testat</div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
