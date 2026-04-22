import { motion } from "framer-motion";
import { MessageSquare, FileText, Handshake, Rocket } from "lucide-react";

const steps = [
  {
    k: "01",
    icon: MessageSquare,
    t: "Comunicare inițială",
    d: "Ne transmiți date minime despre societate, activitate, dorințe și descrieri. Discutăm direct pentru a înțelege viziunea ta.",
  },
  {
    k: "02",
    icon: FileText,
    t: "Ofertă personalizată",
    d: "Primești o ofertă completă cu propunere site/aplicație, conturi demonstrative, analize, sugestii și informații relevante.",
  },
  {
    k: "03",
    icon: Handshake,
    t: "Pre-acord & dezvoltare",
    d: "Stabilim ultimele detalii și costurile proiectului, cu notificări și actualizări constante pe parcursul dezvoltării.",
  },
  {
    k: "04",
    icon: Rocket,
    t: "Predare & mentenanță",
    d: "Produsul final este prezentat. Primești credențialele de acces sau, la cerere, echipa Webcore îl administrează în continuare.",
  },
];

const Process = () => {
  return (
    <section id="proces" className="py-14 md:py-20 bg-secondary/40">
      <div className="mx-auto max-w-5xl px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Site-ul afacerii tale, în câteva zile.
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground">
            În doar câteva zile și cu un buget de la câteva sute de euro, poți avea un site care reprezintă cu adevărat societatea ta — modern, rapid și optimizat pentru clienți reali.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.k}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-3xl bg-card border border-border/60 p-5 hover:border-brand/40 transition-colors shadow-soft"
            >
              <div className="flex items-center justify-between">
                <div className="size-10 rounded-2xl bg-foreground text-background grid place-items-center">
                  <s.icon className="size-5" />
                </div>
                <span className="text-xs font-mono text-brand font-semibold">{s.k}</span>
              </div>
              <h3 className="mt-4 font-display font-semibold text-base leading-tight">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 max-w-3xl mx-auto text-center text-sm text-muted-foreground">
          Costurile variază în funcție de complexitate: de la <span className="text-foreground font-medium">câteva sute de lei/euro</span> pentru site-uri de prezentare și proiecte mici, până la <span className="text-foreground font-medium">câteva mii</span> pentru platforme complexe, cu servicii și colaborări extinse.
        </p>
      </div>
    </section>
  );
};

export default Process;
