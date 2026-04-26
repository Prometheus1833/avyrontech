import { motion } from "framer-motion";
import { useLang } from "@/i18n/LanguageContext";

const Benefits = () => {
  const { t } = useLang();
  return (
    <section id="avantaje" className="py-8 md:py-12 scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-4xl font-bold tracking-tight">
            {t.benefits.title}
          </h2>
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
          {t.benefits.items.map((b, i) => {
            const n = String(i + 1).padStart(2, "0");
            return (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="rounded-xl md:rounded-2xl p-3 md:p-5 bg-cardgrad border border-border/60 hover:border-brand/40 transition-colors"
              >
                <div className="flex items-baseline gap-2 md:gap-3">
                  <div className="font-display text-xl md:text-3xl font-bold text-gradient">{n}</div>
                  <h3 className="font-display font-semibold text-sm md:text-base leading-tight">{b.t}</h3>
                </div>
                <p className="mt-1 md:mt-1.5 text-xs md:text-sm text-muted-foreground leading-snug">{b.d}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
