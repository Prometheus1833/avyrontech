import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, Wallet, ArrowUpRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLang } from "@/i18n/LanguageContext";

const FAQ = () => {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <section id="faq" className="py-10 md:py-14 bg-secondary/40">
      <div className="mx-auto max-w-5xl px-4">
        {/* Costuri & Mentenanță quick link (above FAQ) */}
        <Link
          to="/costuri"
          className="group mb-4 w-full rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent hover:from-brand/15 hover:to-brand/5 px-6 py-4 md:py-5 shadow-soft hover:shadow-elev transition-all flex items-center gap-4 text-left"
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

        {/* FAQ Banner */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full group rounded-2xl bg-gradient-to-r from-foreground to-foreground/90 text-background px-6 py-5 md:py-6 shadow-elev hover:shadow-soft transition-all flex items-center gap-4 text-left"
        >
          <span className="size-12 md:size-14 rounded-xl bg-brand/20 text-brand grid place-items-center shrink-0">
            <HelpCircle className="size-6 md:size-7" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] md:text-xs uppercase tracking-widest text-background/60">
              {t.faq.kicker}
            </span>
            <span className="block font-display font-bold text-xl md:text-2xl leading-tight">
              {t.faq.title}
            </span>
          </span>
          <span
            className={`size-10 md:size-12 rounded-full bg-brand text-brand-foreground grid place-items-center shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            <ChevronDown className="size-5 md:size-6" />
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
