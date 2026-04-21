import { motion } from "framer-motion";

const benefits = [
  { n: "01", t: "Mai mulți clienți", d: "Vizitatori care se transformă în programări și comenzi." },
  { n: "02", t: "Încredere instant", d: "Un site profesionist spune: suntem serioși." },
  { n: "03", t: "Apari pe Google", d: "Inclusiv în căutările locale și pe Maps." },
  { n: "04", t: "Programări 24/7", d: "Clienții rezervă singuri, oricând, fără telefoane." },
  { n: "05", t: "Comunicare clară", d: "Canale sigure pentru informații și ofertare." },
  { n: "06", t: "Distribuire ușoară", d: "Un singur link partajabil oriunde online." },
];

const Benefits = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">Beneficii</span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            Ce câștigi<br />cu un site bine făcut.
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b, i) => (
            <motion.div
              key={b.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="rounded-3xl p-6 bg-cardgrad border border-border/60 hover:border-brand/40 transition-colors"
            >
              <div className="font-display text-5xl font-bold text-gradient">{b.n}</div>
              <h3 className="mt-3 font-display font-semibold text-xl">{b.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
