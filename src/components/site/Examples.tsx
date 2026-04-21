import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import salon from "@/assets/work-salon.jpg";
import resto from "@/assets/work-restaurant.jpg";
import lawyer from "@/assets/work-lawyer.jpg";
import hotel from "@/assets/work-hotel.jpg";
import local from "@/assets/cat-local.jpg";

type Cat = "local" | "resto" | "beauty" | "pro" | "turism";

const cats: { id: Cat; label: string }[] = [
  { id: "local", label: "Servicii locale" },
  { id: "resto", label: "Restaurante & cafenele" },
  { id: "beauty", label: "Beauty & saloane" },
  { id: "pro", label: "Profesii liberale" },
  { id: "turism", label: "Turism & cazare" },
];

const data: Record<Cat, { img: string; title: string; benefit: string; tag: string }[]> = {
  local: [
    { img: local, tag: "Instalator", title: "Site pentru servicii locale — focus pe apel rapid", benefit: "Buton de apel mereu vizibil + zonă de acoperire clară." },
    { img: local, tag: "Curățenie", title: "Solicitare ofertă în 30 secunde", benefit: "Formular scurt + WhatsApp pentru lead-uri imediate." },
  ],
  resto: [
    { img: resto, tag: "Restaurant", title: "Site cu rezervări online integrate", benefit: "Clienții rezervă masă fără să te sune — direct din meniu." },
    { img: resto, tag: "Cafenea", title: "Meniu digital cu QR code", benefit: "Actualizezi meniul oricând, fără să tipărești nimic." },
  ],
  beauty: [
    { img: salon, tag: "Salon", title: "Site pentru salon beauty — focus pe programări rapide", benefit: "Structură simplă care permite clientelor să se programeze în câteva secunde." },
    { img: salon, tag: "SPA", title: "Vouchere cadou & pachete", benefit: "Vinzi vouchere direct online, perfect pentru sezonul cadourilor." },
  ],
  pro: [
    { img: lawyer, tag: "Avocat", title: "Site profesionist pentru cabinet", benefit: "Programări, arii de practică și încredere — totul clar și sobru." },
    { img: lawyer, tag: "Notar", title: "Pagină de contact + documente necesare", benefit: "Clienții vin pregătiți, tu economisești timp." },
  ],
  turism: [
    { img: hotel, tag: "Pensiune", title: "Booking direct, fără comision", benefit: "Rezervări direct pe site — păstrezi 100% din încasări." },
    { img: hotel, tag: "Hotel", title: "Galerie + experiențe + check-in", benefit: "Vizitatorii văd, simt și rezervă într-un singur flux." },
  ],
};

const Examples = () => {
  const [active, setActive] = useState<Cat>("beauty");
  return (
    <section id="exemple" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">Exemple</span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            Alege domeniul tău și vezi cum ar arăta.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Fiecare industrie are nevoile ei. Iată câteva exemple cu funcții specifice fiecărui domeniu.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active === c.id
                  ? "bg-foreground text-background shadow-elev"
                  : "bg-secondary text-foreground/70 hover:bg-secondary/70"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="mt-8 grid md:grid-cols-2 gap-6"
          >
            {data[active].map((ex, i) => (
              <article key={i} className="group rounded-3xl overflow-hidden bg-card border border-border/60 shadow-soft hover:shadow-elev transition-all duration-500">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={ex.img} alt={ex.title} loading="lazy" width={1024} height={768} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-6">
                  <span className="inline-block text-[10px] uppercase tracking-widest font-bold text-brand mb-2">{ex.tag}</span>
                  <h3 className="font-display font-semibold text-lg leading-tight">{ex.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{ex.benefit}</p>
                </div>
              </article>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Examples;
