import { motion } from "framer-motion";

const steps = [
  { k: "01", t: "Analiză & obiective", d: "Discutăm despre afacerea ta, publicul țintă și obiective." },
  { k: "02", t: "Prototip & design", d: "Creăm un demo personalizat. După 24-48h primești draft-ul și propui modificări." },
  { k: "03", t: "Dezvoltare & SEO", d: "Implementăm cu tehnologii moderne (ex. Retuvo), focus pe viteză și conversie." },
  { k: "04", t: "Testare & securitate", d: "QA pe toate device-urile + măsuri de securitate de bază." },
  { k: "05", t: "Lansare & suport", d: "Publicăm site-ul și oferim asistență pentru ajustări inițiale." },
];

const Process = () => {
  return (
    <section id="proces" className="py-20 md:py-28 bg-foreground text-background relative overflow-hidden">
      <div className="absolute top-0 right-0 size-96 rounded-full bg-brand/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 size-96 rounded-full bg-brand-2/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Procesul</span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            Cum lucrăm — simplu și rapid.
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.k}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-3xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors"
            >
              <div className="text-xs font-mono text-accent">{s.k}</div>
              <h3 className="mt-3 font-display font-semibold text-lg leading-tight">{s.t}</h3>
              <p className="mt-2 text-sm text-background/60">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Process;
