import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import salon from "@/assets/work-beauty-flawless.jpg";
import resto from "@/assets/work-restaurant-new.jpg";
import lawyer from "@/assets/work-lawyer-new.jpg";
import hotel from "@/assets/work-hotel-new.jpg";
import local from "@/assets/work-local-new.jpg";
import publicImg from "@/assets/work-public-miago.jpg";
import { useLang } from "@/i18n/LanguageContext";

type Cat = "resto" | "public" | "turism" | "pro" | "beauty" | "local";

const order: Cat[] = ["resto", "public", "turism", "pro", "beauty", "local"];
const images: Record<Cat, string> = {
  local, resto, beauty: salon, pro: lawyer, turism: hotel, public: publicImg,
};

const Examples = () => {
  const { t } = useLang();
  const [active, setActive] = useState<Cat>("resto");
  const current = t.examples.data[active];
  const currentCat = t.examples.cats[active];

  return (
    <section id="exemple" className="py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            {t.examples.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t.examples.subtitle}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {order.map((id) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active === id
                  ? "bg-foreground text-background shadow-elev"
                  : "bg-secondary text-foreground/70 hover:bg-secondary/70"
              }`}
            >
              {t.examples.cats[id].label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="mt-8 grid md:grid-cols-2 gap-6 items-stretch"
          >
            <article className="group rounded-3xl overflow-hidden bg-card border border-border/60 shadow-soft hover:shadow-elev transition-all duration-500">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img src={images[active]} alt={current.title} loading="lazy" width={1024} height={768} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
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
