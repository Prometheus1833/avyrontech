import { motion } from "framer-motion";
import { MessageSquare, FileText, Handshake, Rocket } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const icons = [MessageSquare, FileText, Handshake, Rocket];

const Process = () => {
  const { t } = useLang();
  return (
    <section id="proces" className="py-14 md:py-20 bg-secondary/40">
      <div className="mx-auto max-w-5xl px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            {t.process.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg text-muted-foreground">
            {t.process.subtitle}
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {t.process.steps.map((s, i) => {
            const Icon = icons[i];
            const k = String(i + 1).padStart(2, "0");
            return (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-3xl bg-card border border-border/60 p-5 hover:border-brand/40 transition-colors shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-2xl bg-foreground text-background grid place-items-center">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-xs font-mono text-brand font-semibold">{k}</span>
                </div>
                <h3 className="mt-4 font-display font-semibold text-base leading-tight">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-8 max-w-3xl mx-auto text-center text-sm text-muted-foreground">
          {t.process.footer
            .split("{a}")
            .flatMap((part, i, arr) =>
              i < arr.length - 1
                ? [part, <span key={`a${i}`} className="text-foreground font-medium">{t.process.footerA}</span>]
                : [part]
            )
            .flatMap((part, i) =>
              typeof part === "string" && part.includes("{b}")
                ? part
                    .split("{b}")
                    .flatMap((p, j, ar) =>
                      j < ar.length - 1
                        ? [p, <span key={`b${i}${j}`} className="text-foreground font-medium">{t.process.footerB}</span>]
                        : [p]
                    )
                : [part]
            )}
        </p>
      </div>
    </section>
  );
};

export default Process;
