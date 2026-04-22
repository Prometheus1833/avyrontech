import { motion } from "framer-motion";
import { Search, MapPinOff, Instagram, FileQuestion, ShieldCheck, TrendingUp } from "lucide-react";
import bg from "@/assets/problem-search-bg.jpg";
import { useLang } from "@/i18n/LanguageContext";

const icons = [Search, MapPinOff, Instagram, FileQuestion, ShieldCheck, TrendingUp];

const Problem = () => {
  const { t } = useLang();
  return (
    <section id="de-ce" className="relative py-14 md:py-20 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
        style={{ backgroundImage: `url(${bg})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
            <span className="text-gradient">{t.problem.title1}</span> {t.problem.title2}
          </h2>
          <p className="mt-4 font-display text-base md:text-lg font-medium leading-snug text-foreground/90">
            {t.problem.desc.replace("{pct}", "80%")}
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {t.problem.items.map((it, i) => {
            const Icon = icons[i];
            return (
              <motion.div
                key={it.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl bg-cardgrad shadow-soft p-5 border border-border/60"
              >
                <div className="size-10 rounded-2xl bg-foreground text-background grid place-items-center mb-3">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-display font-semibold text-base">{it.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{it.d}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Problem;
