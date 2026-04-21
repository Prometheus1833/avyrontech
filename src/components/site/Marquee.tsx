const items = [
  "Restaurante", "Saloane beauty", "Avocați & notari", "Sali fitness",
  "Clinici", "Startup-uri", "Primării", "Hoteluri & pensiuni",
  "Instalatori", "Cafenele", "Spitale", "Școli",
];

const Marquee = () => {
  return (
    <section className="py-10 border-y border-border/60 bg-secondary/40 overflow-hidden">
      <div className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-5">
        Construim pentru
      </div>
      <div className="relative">
        <div className="flex gap-10 marquee whitespace-nowrap">
          {[...items, ...items].map((it, i) => (
            <span key={i} className="font-display text-2xl md:text-3xl font-semibold text-foreground/40 hover:text-foreground transition-colors">
              {it} <span className="text-brand mx-2">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Marquee;
