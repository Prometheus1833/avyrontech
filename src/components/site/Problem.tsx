import { motion } from "framer-motion";
import { Search, MapPinOff, Instagram, Bot, ShieldCheck, TrendingUp } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const icons = [Search, MapPinOff, Instagram, Bot, ShieldCheck, TrendingUp];

const Problem = () => {
  const { t } = useLang();
  return (
    <section id="de-ce" className="relative py-10 md:py-16 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(600px 400px at 20% 10%, hsl(var(--brand)/0.15), transparent 60%), radial-gradient(500px 350px at 80% 90%, hsl(var(--brand-2)/0.15), transparent 60%)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background" aria-hidden />


      <div className="relative mx-auto max-w-6xl px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
            <span className="text-gradient">{t.problem.title1}</span>{" "}
            {t.problem.title2.split(/(WEBSITE|website)/).map((part, i) =>
              /WEBSITE|website/.test(part) ? (
                <span
                  key={i}
                  className="font-extrabold uppercase tracking-wide"
                  style={{ color: "hsl(265 45% 48%)" }}
                >
                  {part}
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </h2>
          <p className="mt-4 font-display text-base md:text-lg font-medium leading-snug text-foreground/90">
            {t.problem.desc.replace("{pct}", "80%")}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3">
          {t.problem.items.map((it, i) => {
            const Icon = icons[i];
            return (
              <motion.div
                key={it.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl bg-cardgrad shadow-soft p-3 md:p-5 border border-border/60 flex flex-col items-center text-center"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                <div className="size-8 md:size-10 rounded-xl md:rounded-2xl bg-foreground text-background grid place-items-center mb-2 md:mb-3">
                  <Icon className="size-4 md:size-5" />
                </div>
                <h3 className="font-semibold text-sm md:text-base leading-tight">{it.t}</h3>
                <p className="mt-1 md:mt-1.5 text-xs md:text-sm text-muted-foreground leading-snug">{it.d}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Problem;
