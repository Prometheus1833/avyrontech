import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "Cât durează un site?", a: "Între 2 și 5 zile lucrătoare, în funcție de complexitate. Pentru proiecte mai mari, te informăm clar din start." },
  { q: "Am nevoie de conținut pregătit?", a: "Nu. Te putem ajuta cu textele, imaginile și descrierile. Tu validezi totul înainte de lansare." },
  { q: "Pot face modificări?", a: "Da. După demo și detalii, în 24-48h primești un alt draft unde poți propune orice modificare. Iterăm până ești mulțumit." },
  { q: "Trebuie să plătesc lunar?", a: "Nu obligatoriu. Hosting-ul și mentenanța le poți face și singur. Dar dacă vrei, colaborăm pe termen lung cu sugestii și asistență specializată." },
  { q: "Funcționează pe telefon?", a: "Absolut. Toate site-urile noastre sunt 100% responsive și testate pe Android, iOS, tabletă și desktop." },
  { q: "Pot avea și aplicație mobilă?", a: "Da. Oferim opțional dezvoltare de aplicații pentru Android și iOS, integrate cu site-ul." },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-20 md:py-28 bg-secondary/40">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">FAQ</span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            Întrebări frecvente
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10 space-y-3">
          {faqs.map((f, i) => (
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
