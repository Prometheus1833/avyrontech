import { motion } from "framer-motion";
import { Smartphone, MessageCircle, Search, ShieldCheck, Zap, Users } from "lucide-react";

const features = [
  { icon: Smartphone, title: "Perfect pe orice device", desc: "Funcționează impecabil pe telefon, tabletă, desktop — Android, iOS, oricare." },
  { icon: MessageCircle, title: "Contact rapid", desc: "Butoane WhatsApp, email, apel — la un click distanță, plasate inteligent." },
  { icon: Search, title: "Vizibil pe Google", desc: "SEO tehnic + Maps + structură optimizată pentru căutările locale." },
  { icon: ShieldCheck, title: "Securizat & testat", desc: "Echipa QA verifică totul — de la cod la design. Zero surprize." },
  { icon: Zap, title: "Livrare 2-5 zile", desc: "De la prima discuție la site live, în câteva zile lucrătoare." },
  { icon: Users, title: "Transformă vizitatorii", desc: "Structură gândită pentru conversie, nu doar pentru aspect." },
];

const Solution = () => {
  return (
    <section id="solutie" className="py-20 md:py-28 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid md:grid-cols-2 gap-8 items-end mb-12">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand">Soluția</span>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
              Site-uri care lucrează<br/>pentru tine.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground">
            Construim pachete complete: design, cod, optimizare, SEO și conturi sociale. Tot ce ai nevoie ca să fii vizibil și ales.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="rounded-3xl bg-card border border-border/60 p-6 hover:shadow-elev hover:-translate-y-1 transition-all duration-500"
            >
              <div className="size-12 rounded-2xl bg-brand/10 text-brand grid place-items-center mb-4">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Solution;
