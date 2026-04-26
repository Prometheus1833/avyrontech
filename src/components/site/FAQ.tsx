import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLang } from "@/i18n/LanguageContext";

const FAQ = () => {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <section id="faq" className="py-10 md:py-14 bg-secondary/40">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid md:grid-cols-5 gap-3 md:gap-4 items-stretch">
          {/* FAQ Banner */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="md:col-span-3 group rounded-2xl bg-gradient-to-r from-foreground to-foreground/90 text-background px-6 py-5 md:py-6 shadow-elev hover:shadow-soft transition-all flex items-center gap-4 text-left"
          >
            <span className="size-12 md:size-14 rounded-xl bg-brand/20 text-brand grid place-items-center shrink-0">
              <HelpCircle className="size-6 md:size-7" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] md:text-xs uppercase tracking-widest text-background/60">
                {t.faq.kicker}
              </span>
              <span className="block font-display font-bold text-2xl md:text-4xl leading-tight">
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

          {/* GDPR Card */}
          <Link
            to="/gdpr"
            className="md:col-span-2 group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-brand/40 px-5 py-5 md:py-6 shadow-elev hover:shadow-soft transition-all flex items-center gap-4"
          >
            <span className="size-12 md:size-14 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="size-6 md:size-7" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
                {t.gdpr.kicker}
              </span>
              <span className="block font-display font-bold text-xl md:text-2xl leading-tight text-foreground">
                GDPR
              </span>
            </span>
            <ArrowUpRight className="size-5 text-muted-foreground group-hover:text-brand group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

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
