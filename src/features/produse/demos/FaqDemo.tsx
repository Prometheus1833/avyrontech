import FaqAccordion from "../source/FaqAccordion";
import type { DemoProps } from "./registry";

export default function FaqDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="h-full w-full overflow-auto p-4">
      <FaqAccordion
        jsonLdId="avy-faq-demo-ld"
        items={
          ro
            ? [
                { id: "d1", q: "Cât durează un site de prezentare?", a: "Între 2 și 5 zile lucrătoare de la primirea textelor și a imaginilor." },
                { id: "d2", q: "Pot edita singur textele?", a: "Da, primești panou de administrare și instruire live, fără cod." },
                { id: "d3", q: "Ce se întâmplă cu SEO-ul?", a: "Fiecare pagină primește titlu, descriere și date structurate, plus sitemap trimis la Google." },
              ]
            : [
                { id: "d1", q: "How long does a business website take?", a: "Between 2 and 5 working days from receiving your copy and images." },
                { id: "d2", q: "Can I edit the text myself?", a: "Yes — you get an admin panel and live training, no code required." },
                { id: "d3", q: "What about SEO?", a: "Every page gets a title, description and structured data, plus a sitemap submitted to Google." },
              ]
        }
      />
    </div>
  );
}
