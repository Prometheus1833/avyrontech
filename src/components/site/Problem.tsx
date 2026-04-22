import { motion } from "framer-motion";
import { Search, MapPinOff, Instagram, FileQuestion, ShieldCheck, TrendingUp } from "lucide-react";
import bg from "@/assets/problem-search-bg.jpg";

const items = [
  { icon: Search, title: "Nu apari pe Google", desc: "Clienții caută înainte să aleagă. Fără site, ești invizibil." },
  { icon: MapPinOff, title: "Lipsești pe Maps", desc: "Fără prezență digitală clară, pierzi vizite locale zilnice." },
  { icon: Instagram, title: "Doar social media nu ajunge", desc: "Facebook, Instagram, TikTok sunt începutul. Nu finalul." },
  {
    icon: FileQuestion,
    title: "Pare complicat",
    desc: "Crezi că un site e greu de administrat. Noi ne ocupăm de tot, sau te ghidăm pas cu pas cum să îl administrezi ulterior singur.",
  },
  { icon: ShieldCheck, title: "Credibilitate fragilă", desc: "Fără un site oficial, clienții se îndoiesc dacă ești o afacere reală și serioasă." },
  { icon: TrendingUp, title: "Concurența ți-o ia înainte", desc: "Cei care au site primesc clienții care te-ar fi ales pe tine." },
];

const Problem = () => {
  return (
    <section id="de-ce" className="relative py-14 md:py-20 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
        style={{ backgroundImage: `url(${bg})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
            <span className="text-gradient">De ce ai nevoie</span> de un site?
          </h2>
          <p className="mt-4 font-display text-base md:text-lg font-medium leading-snug text-foreground/90">
            Peste <span className="font-bold">80%</span> dintre oameni caută online înainte să cumpere sau să rezerve. Fără un site profesionist, clienții merg în altă parte.
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl bg-cardgrad shadow-soft p-5 border border-border/60"
            >
              <div className="size-10 rounded-2xl bg-foreground text-background grid place-items-center mb-3">
                <it.icon className="size-5" />
              </div>
              <h3 className="font-display font-semibold text-base">{it.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Problem;
