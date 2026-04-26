import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLang } from "@/i18n/LanguageContext";

const FAQ = () => {
  const { t } = useLang();
  return (
    <section id="faq" className="py-8 md:py-12 bg-secondary/40">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">{t.faq.kicker}</span>
          <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.faq.title}
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-5 space-y-1.5">
          {t.faq.items.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-border/60 rounded-xl bg-card px-4 data-[state=open]:shadow-soft"
            >
              <AccordionTrigger className="py-3 text-left font-display font-semibold text-sm hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-0 text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
