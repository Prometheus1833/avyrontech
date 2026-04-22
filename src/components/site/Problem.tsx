import { motion } from "framer-motion";
import { Search, MapPinOff, Instagram, FileQuestion } from "lucide-react";

const items = [
  { icon: Search, title: "Nu apari pe Google", desc: "Clienții caută înainte să aleagă. Fără site, ești invizibil." },
  { icon: MapPinOff, title: "Lipsești pe Maps", desc: "Fără prezență digitală clară, pierzi vizite locale zilnice." },
  { icon: Instagram, title: "Doar social media nu ajunge", desc: "Facebook, Instagram, TikTok sunt începutul. Nu finalul." },
  { icon: FileQuestion, title: "Pare complicat", desc: "Crezi că un site e greu de administrat. Noi ne ocupăm de tot." },
];

const Problem = () => {
  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-display text-base md:text-lg font-medium tracking-tight leading-snug text-muted-foreground">
            Peste <span className="text-foreground font-semibold">80%</span> dintre oameni caută online înainte să cumpere sau să rezerve. Fără un site profesionist, clienții merg în altă parte.
          </p>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-3xl bg-cardgrad shadow-soft p-6 border border-border/60"
            >
              <div className="size-11 rounded-2xl bg-foreground text-background grid place-items-center mb-4">
                <it.icon className="size-5" />
              </div>
              <h3 className="font-display font-semibold text-lg">{it.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Problem;
