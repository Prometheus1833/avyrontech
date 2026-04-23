import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLang } from "@/i18n/LanguageContext";

const FAQ = () => {
  const { t } = useLang();
  return (
    <section id="faq" className="py-20 md:py-28 bg-secondary/40">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">{t.faq.kicker}</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            {t.faq.title}
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10 space-y-3">
          {t.faq.items.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border border-border/60 rounded-2xl bg-card px-5 data-[state=open]:shadow-soft">
              <AccordionTrigger className="text-left font-display font-semibold text-base hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
