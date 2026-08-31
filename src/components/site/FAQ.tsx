import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, Wallet, ArrowUpRight, Briefcase, UsersRound } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLang } from "@/i18n/LanguageContext";

const FAQ = () => {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <section id="faq" className="py-10 md:py-14 bg-secondary/40">
      <div className="mx-auto max-w-5xl px-4">
        {/* Costuri & Mentenanță quick link */}
        <Link
          to="/costurisiproduse"
          className="group mb-4 w-full rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent hover:from-brand/15 hover:to-brand/5 px-4 sm:px-6 py-4 md:py-5 shadow-soft hover:shadow-elev transition-all flex items-center gap-3 sm:gap-4 text-left"
        >
          <span className="size-11 md:size-12 rounded-xl bg-brand text-brand-foreground grid place-items-center shrink-0">
            <Wallet className="size-5 md:size-6" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
              {lang === "ro" ? "Transparență totală" : "Full transparency"}
            </span>
            <span className="block font-display font-bold text-base md:text-lg leading-tight">
              {lang === "ro" ? "Costuri & Mentenanță" : "Pricing & Care"}
            </span>
          </span>
          <span className="size-9 md:size-10 rounded-full bg-foreground text-background grid place-items-center shrink-0 group-hover:translate-x-0.5 transition-transform">
            <ArrowUpRight className="size-4 md:size-5" />
          </span>
        </Link>

        {/* Portofoliu & Colaborări CTA */}
        <Link
          to={lang === "ro" ? "/portofoliu" : "/en/portfolio"}
          data-testid="portfolio-card"
          className="group mb-4 w-full rounded-2xl border border-border bg-card hover:border-brand/40 hover:shadow-soft px-4 sm:px-6 py-4 md:py-5 transition-all flex items-center gap-3 sm:gap-4 text-left"
        >
          <span className="size-11 md:size-12 rounded-xl bg-foreground text-background grid place-items-center shrink-0">
            <Briefcase className="size-5 md:size-6" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
              {lang === "ro" ? "Proiecte, exemple și parteneri" : "Projects, examples & partners"}
            </span>
            <span className="block font-display font-bold text-base md:text-lg leading-tight">
              {lang === "ro" ? "Portofoliu și colaborări" : "Portfolio & collaborations"}
            </span>
          </span>
          <span className="size-9 md:size-10 rounded-full bg-brand text-brand-foreground grid place-items-center shrink-0 group-hover:translate-x-0.5 transition-transform">
            <ArrowUpRight className="size-4 md:size-5" />
          </span>
        </Link>

        {/* Despre noi CTA */}
        <Link
          to={lang === "ro" ? "/despre-noi" : "/en/about"}
          data-testid="about-card"
          aria-label={lang === "ro" ? "Despre noi — cunoaște echipa Avyron" : "About us — meet the Avyron team"}
          className="group relative mb-4 flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/[0.10] via-card to-violet-500/[0.10] px-4 py-4 text-left shadow-soft transition-all hover:border-cyan-400/50 hover:shadow-elev sm:gap-4 sm:px-6 md:py-5"
        >
          <span className="pointer-events-none absolute -right-8 -top-12 size-32 rounded-full bg-violet-400/10 blur-2xl" aria-hidden />
          <span className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-[0_8px_24px_-12px_rgba(34,211,238,0.8)] md:size-12">
            <UsersRound className="size-5 md:size-6" aria-hidden />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-[10px] uppercase tracking-widest text-cyan-700 dark:text-cyan-200 md:text-xs">
              {lang === "ro" ? "Echipa din spatele produselor" : "The team behind the products"}
            </span>
            <span className="block font-display text-base font-bold leading-tight md:text-lg">
              {lang === "ro" ? "Despre noi" : "About us"}
            </span>
            <span className="mt-1 hidden text-xs leading-relaxed text-muted-foreground sm:block">
              {lang === "ro"
                ? "Web design, development, cybersecurity și QA, reunite într-un proces clar și atent la fiecare detaliu."
                : "Web design, development, cybersecurity and QA brought together in a clear, detail-focused process."}
            </span>
          </span>
          <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white transition-transform group-hover:translate-x-0.5 md:size-10">
            <ArrowUpRight className="size-4 md:size-5" aria-hidden />
          </span>
        </Link>

        {/* FAQ Banner — softened background */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full group rounded-2xl border border-border bg-gradient-to-r from-card via-secondary/60 to-card hover:from-secondary/80 hover:to-secondary/80 px-4 sm:px-6 py-4 sm:py-5 md:py-6 shadow-soft hover:shadow-elev transition-all flex items-center gap-3 sm:gap-4 text-left"
        >
          <span className="size-11 sm:size-12 md:size-14 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0 ring-1 ring-brand/20">
            <HelpCircle className="size-5 sm:size-6 md:size-7" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
              {t.faq.kicker}
            </span>
            <span className="block font-display font-bold text-base sm:text-xl md:text-2xl leading-tight text-foreground">
              {t.faq.title}
            </span>
          </span>
          <span
            className={`size-9 sm:size-10 md:size-12 rounded-full bg-foreground text-background grid place-items-center shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            <ChevronDown className="size-4 sm:size-5 md:size-6" />
          </span>
        </button>

        {/* Collapsible questions */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="faq-content"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <Accordion type="single" collapsible className="mt-4 space-y-2">
                {t.faq.items.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border border-border/60 rounded-xl bg-card px-4 data-[state=open]:shadow-soft"
                  >
                    <AccordionTrigger className="py-3 text-left font-display font-semibold text-sm hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 pt-0 text-sm text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default FAQ;
