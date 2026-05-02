import { motion } from "framer-motion";
import { Search, MapPinOff, Instagram, Bot, ShieldCheck, TrendingUp } from "lucide-react";
import bg from "@/assets/problem-search-bg.jpg";
import { useLang } from "@/i18n/LanguageContext";

const icons = [Search, MapPinOff, Instagram, Bot, ShieldCheck, TrendingUp];

const Problem = () => {
  const { t } = useLang();
  return (
    <section id="de-ce" className="relative py-10 md:py-16 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
        style={{ backgroundImage: `url(${bg})` }}
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
                  className="font-extrabold uppercase bg-gradient-to-r from-brand via-accent to-brand-2 bg-clip-text text-transparent tracking-wide"
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

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {t.problem.items.map((it, i) => {
            const Icon = icons[i];
            const idLabel = String(i + 1).padStart(2, "0");
            return (
              <motion.div
                key={it.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="group relative rounded-2xl p-[1px] bg-gradient-to-br from-brand/40 via-brand-2/20 to-accent/30 hover:from-brand/70 hover:via-brand-2/50 hover:to-accent/60 transition-all duration-500"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                <div className="relative h-full rounded-2xl bg-[hsl(222_30%_8%)] text-[hsl(30_25%_95%)] p-4 md:p-6 flex flex-col items-center text-center overflow-hidden">
                  {/* subtle grid texture */}
                  <div
                    className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(hsl(var(--brand-glow)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--brand-glow)) 1px, transparent 1px)",
                      backgroundSize: "22px 22px",
                    }}
                    aria-hidden
                  />
                  {/* corner ID chip */}
                  <span className="absolute top-2.5 left-3 text-[9px] md:text-[10px] tracking-[0.2em] text-[hsl(var(--brand-glow))]/70 font-medium">
                    /{idLabel}
                  </span>
                  <span className="absolute top-2.5 right-3 size-1.5 rounded-full bg-[hsl(var(--brand-glow))] shadow-[0_0_8px_hsl(var(--brand-glow))]" />

                  {/* glowing icon */}
                  <div className="relative mt-2 mb-3 md:mb-4">
                    <div className="absolute inset-0 rounded-xl md:rounded-2xl blur-xl bg-gradient-to-br from-brand to-brand-2 opacity-50 group-hover:opacity-80 transition-opacity" aria-hidden />
                    <div className="relative size-10 md:size-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-brand via-brand-2 to-accent grid place-items-center ring-1 ring-white/10">
                      <Icon className="size-5 md:size-6 text-white" />
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm md:text-base leading-tight tracking-tight">
                    {it.t}
                  </h3>
                  <p className="mt-1.5 md:mt-2 text-[11px] md:text-xs text-[hsl(30_15%_75%)] leading-relaxed">
                    {it.d}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Problem;
