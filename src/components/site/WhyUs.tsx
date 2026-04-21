import { Rocket, MessagesSquare, Target, Layers, Wand2, BadgePercent } from "lucide-react";

const items = [
  { icon: Rocket, t: "Livrare rapidă", d: "2-5 zile lucrătoare de la prima discuție." },
  { icon: MessagesSquare, t: "Comunicare simplă", d: "Fără jargon tehnic. Doar răspunsuri clare." },
  { icon: Target, t: "Focus pe rezultate", d: "Design care convertește, nu doar arată bine." },
  { icon: Layers, t: "Soluții adaptate", d: "Fiecare business are arhitectura lui proprie." },
  { icon: Wand2, t: "Compatibilitate maximă", d: "Orice device, orice OS, orice browser." },
  { icon: BadgePercent, t: "Costuri minime", d: "Prețuri corecte pentru calitate premium." },
];

const WhyUs = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">De ce Webcore</span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            Echipa care livrează,<br />nu doar promite.
          </h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.t} className="rounded-3xl p-6 bg-card border border-border/60 hover:shadow-soft transition-all">
              <div className="size-11 rounded-2xl bg-lime grid place-items-center">
                <it.icon className="size-5 text-foreground" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-lg">{it.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
