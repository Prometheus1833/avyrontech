import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import salon from "@/assets/work-beauty-flawless.jpg";
import resto from "@/assets/work-restaurant-new.jpg";
import lawyer from "@/assets/work-lawyer-new.jpg";
import hotel from "@/assets/work-hotel-new.jpg";
import local from "@/assets/work-local-new.jpg";
import publicImg from "@/assets/work-public-miago.jpg";

type Cat = "local" | "resto" | "beauty" | "pro" | "turism" | "public";

const cats: { id: Cat; label: string; examples: string }[] = [
  { id: "resto", label: "Restaurante & cafenele", examples: "Restaurante, cafenele, pub-uri, bistro, food trucks" },
  { id: "public", label: "Instituții publice", examples: "Primării, spitale, școli, centre culturale, instituții oficiale" },
  { id: "turism", label: "Turism & cazare", examples: "Pensiuni, hoteluri, vile, agroturism" },
  { id: "pro", label: "Profesii liberale", examples: "Avocați, notari, contabili, consultanți, designeri, arhitecți" },
  { id: "beauty", label: "Beauty & wellness", examples: "Saloane, frizerii, SPA, stomatologi, terapeuți, fitness, veterinari" },
  { id: "local", label: "Servicii locale & tehnice", examples: "Instalatori, electricieni, HVAC, construcții, finisaje, acoperișuri, auto, cleaning, magazine locale" },
];

const data: Record<Cat, { img: string; title: string; benefit: string; features: string[] }> = {
  local: {
    img: local,
    title: "Site clar pentru servicii rapide",
    benefit: "Buton de apel mereu vizibil, zonă de acoperire și solicitare ofertă în 30 secunde.",
    features: [
      "Buton apel & WhatsApp permanent",
      "Formulare inteligente pentru cerere ofertă",
      "Calculator de preț estimativ",
      "Galerie lucrări realizate",
      "Recenzii clienți + Google Reviews",
      "Hartă cu zona de acoperire",
    ],
  },
  resto: {
    img: resto,
    title: "Meniu, rezervări și comenzi într-un singur loc",
    benefit: "Clienții văd meniul, rezervă masa și comandă fără să te sune.",
    features: [
      "Meniu online interactiv (nu PDF)",
      "Meniul zilei + oferte / promoții",
      "Rezervări online directe",
      "Link comenzi: Glovo, Tazz, Bolt Food",
      "Galerie + story brand",
      "Locație + hartă + program",
      "Buton WhatsApp pentru întrebări rapide",
    ],
  },
  beauty: {
    img: salon,
    title: "Programări online fără sunat",
    benefit: "Clientele se programează în câteva secunde, tu îți vezi calendarul plin.",
    features: [
      "Programări online integrate",
      "Listă servicii + prețuri clare",
      "Galerie portofoliu (înainte/după)",
      "Vouchere cadou & pachete",
      "Recenzii pe site + Google",
      "Buton WhatsApp / chat rapid",
      "Quiz: ce tratament ți se potrivește",
    ],
  },
  pro: {
    img: lawyer,
    title: "Site profesionist care inspiră încredere",
    benefit: "Programări consultații, arii de practică și ghiduri — totul clar și sobru.",
    features: [
      "Despre + experiență & calificări",
      "Servicii oferite & arii de practică",
      "CTA „Programează o consultație”",
      "Secțiune cazuri frecvente / FAQ",
      "Parteneri & colaborări",
      "GDPR, Termeni & Confidențialitate",
      "Formulare inteligente cu pre-screening",
    ],
  },
  turism: {
    img: hotel,
    title: "Booking direct, fără comision",
    benefit: "Vizitatorii văd, simt și rezervă într-un singur flux. Tu păstrezi 100% din încasări.",
    features: [
      "Rezervări directe pe site",
      "Galerie + experiențe + check-in",
      "Buton EN/RO pentru turiști străini",
      "Integrare Google Maps",
      "Recenzii + rating vizibil",
      "Programe sezoniere & pachete",
      "Tracking & Google Analytics",
    ],
  },
  public: {
    img: publicImg,
    title: "Site oficial, accesibil pentru toți cetățenii",
    benefit: "Structură europeană, ghid digital pentru cetățean, accesibilitate completă.",
    features: [
      "Structură oficială: despre, servicii, documente, anunțuri, investiții, licitații",
      "Documente necesare + descărcare directă",
      "Programări online (eliberat / primit documente)",
      "Hartă sedii + instituțiile localității",
      "Distanțe către orașe mari și aeroporturi",
      "Accesibilitate: text lizibil, contrast bun, navigare ușoară",
      "Securitate avansată & protecție maximă",
    ],
  },
  _placeholder: {
    img: publicImg,
    title: "Site oficial, accesibil pentru toți cetățenii",
    benefit: "Structură europeană, ghid digital pentru cetățean, accesibilitate completă.",
    features: [
      "Structură oficială: despre, servicii, documente, anunțuri, investiții, licitații",
      "Documente necesare + descărcare directă",
      "Programări online (eliberat / primit documente)",
      "Hartă sedii + instituțiile localității",
      "Distanțe către orașe mari și aeroporturi",
      "Accesibilitate: text lizibil, contrast bun, navigare ușoară",
      "Securitate avansată & protecție maximă",
      "Buton RO/EN pentru schimbarea limbii",
    ],
  },
};

const Examples = () => {
  const [active, setActive] = useState<Cat>("resto");
  const current = data[active];
  const currentCat = cats.find((c) => c.id === active)!;

  return (
    <section id="exemple" className="py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Alege domeniul tău și vezi cum ar arăta.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Construim pachete complete: <span className="text-foreground font-medium">design, cod, optimizare, SEO</span> și conturi sociale. Tot ce ai nevoie ca să fii vizibil și ales.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 justify-center">
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
            className="mt-8 grid md:grid-cols-2 gap-6 items-stretch"
          >
            <article className="group rounded-3xl overflow-hidden bg-card border border-border/60 shadow-soft hover:shadow-elev transition-all duration-500">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img src={current.img} alt={current.title} loading="lazy" width={1024} height={768} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-6">
                <span className="inline-block text-[10px] uppercase tracking-widest font-bold text-brand mb-2">{currentCat.label}</span>
                <h3 className="font-display font-semibold text-xl leading-tight">{current.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{current.benefit}</p>
                <p className="mt-3 text-xs text-muted-foreground/80 italic">{currentCat.examples}</p>
              </div>
            </article>

            <div className="rounded-3xl bg-cardgrad border border-border/60 p-6 md:p-7 shadow-soft">
              <div className="text-[10px] uppercase tracking-widest font-bold text-brand mb-3">Ce putem include pe lângă nevoile/dorințele tale</div>
              <h4 className="font-display font-semibold text-lg leading-tight mb-5">
                Funcții gândite special pentru {currentCat.label.toLowerCase()}
              </h4>
              <ul className="space-y-3">
                {current.features.map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="mt-0.5 size-5 rounded-full bg-brand/10 text-brand grid place-items-center shrink-0">
                      <Check className="size-3" />
                    </span>
                    <span className="text-foreground/85">{f}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Examples;
