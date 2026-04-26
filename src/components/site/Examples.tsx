import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, LayoutGrid } from "lucide-react";
import { mockups } from "./mockups";
import { useLang } from "@/i18n/LanguageContext";

type Cat = "beauty" | "resto" | "public" | "turism" | "pro" | "local" | "auto" | "national" | "other";

const order: Cat[] = ["beauty", "resto", "public", "turism", "pro", "local", "auto", "national", "other"];

const Examples = () => {
  const { t } = useLang();
  const [active, setActive] = useState<Cat>("beauty");
  const [catsOpen, setCatsOpen] = useState(false);
  const current = t.examples.data[active];
  const currentCat = t.examples.cats[active];
  const Mockup = mockups[active];

  return (
    <section id="exemple" className="py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            {t.examples.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            {t.examples.subtitle}
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setCatsOpen((v) => !v)}
            aria-expanded={catsOpen}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-semibold text-sm shadow-elev hover:opacity-90 transition-all"
          >
            <LayoutGrid className="size-4" />
            {catsOpen ? t.examples.hideCats : t.examples.showCats}
            <ChevronDown className={`size-4 transition-transform ${catsOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {catsOpen && (
            <motion.div
              key="cats"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex flex-wrap gap-2 justify-center px-1">
                {order.map((id) => (
                  <button
                    key={id}
                    onClick={() => setActive(id)}
                    className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                      active === id
                        ? "bg-foreground text-background shadow-elev"
                        : "bg-secondary text-foreground/70 hover:bg-secondary/70"
                    }`}
                  >
                    {t.examples.cats[id].label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="mt-8 grid md:grid-cols-2 gap-6 items-stretch"
          >
            <article className="group rounded-3xl overflow-hidden bg-card border border-border/60 shadow-soft hover:shadow-elev transition-all duration-500 flex flex-col">
              <div className="aspect-[3/4] sm:aspect-[4/5] overflow-hidden bg-muted">
                <Mockup />
              </div>
              <div className="p-6">
                <span className="inline-block text-[10px] uppercase tracking-widest font-bold text-brand mb-2">{currentCat.label}</span>
                <h3 className="font-display font-semibold text-xl leading-tight">{current.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{current.benefit}</p>
                <p className="mt-3 text-xs text-muted-foreground/80 italic">{currentCat.examples}</p>
              </div>
            </article>

            <div className="rounded-3xl bg-cardgrad border border-border/60 p-6 md:p-7 shadow-soft">
              <div className="text-[10px] uppercase tracking-widest font-bold text-brand mb-3">{t.examples.featuresLabel}</div>
              <h4 className="font-display font-semibold text-lg leading-tight mb-5">
                {t.examples.featuresTitle.replace("{cat}", currentCat.label.toLowerCase())}
              </h4>
              <ul className="space-y-3">
                {current.features.map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="mt-0.5 size-5 rounded-full bg-brand/10 text-brand grid place-items-center shrink-0">
                      <Check className="size-3" />
                    </span>
                    <span className="text-foreground/85">{f}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Examples;
