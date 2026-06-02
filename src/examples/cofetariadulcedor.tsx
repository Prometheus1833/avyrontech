import { Cake, Phone, MapPin, Clock, Instagram } from "lucide-react";

const products = [
  { name: "Tort Pădurea Neagră", price: "180 RON", desc: "Blat de cacao, frișcă naturală, vișine confiate." },
  { name: "Cheesecake clasic", price: "150 RON", desc: "Crustă de biscuiți, cremă fină de brânză, coulis de fructe." },
  { name: "Macarons asortați (12 buc)", price: "85 RON", desc: "Vanilie, fistic, ciocolată, zmeură, lămâie, caramel." },
  { name: "Profiterol cu ciocolată", price: "45 RON / porție", desc: "Choux umplut cu cremă de vanilie și ganache cald." },
  { name: "Tartă cu fructe de pădure", price: "120 RON", desc: "Aluat fraged, cremă patissière, fructe de sezon." },
  { name: "Eclere artizanale (6 buc)", price: "60 RON", desc: "Cremă de vanilie Madagascar, glazură de ciocolată belgiană." },
];

export default function CofetariaDulceDor() {
  return (
    <main className="min-h-screen bg-[#fdf6f0] text-[#3a1f1a]">
      {/* Nav */}
      <header className="border-b border-[#e8d5c4] bg-[#fdf6f0]/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif text-xl">
            <Cake className="size-5 text-[#b8512a]" />
            <span>Dulce Dor</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#meniu" className="hover:text-[#b8512a]">Meniu</a>
            <a href="#despre" className="hover:text-[#b8512a]">Despre</a>
            <a href="#contact" className="hover:text-[#b8512a]">Contact</a>
          </nav>
          <a href="tel:+40700000000" className="text-sm bg-[#b8512a] text-white px-4 py-2 rounded-full">Comandă</a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#b8512a]">Cofetărie artizanală — Iași</p>
        <h1 className="mt-4 font-serif text-5xl md:text-7xl leading-tight">Dulciuri făcute cu răbdare,<br/>din ingrediente reale.</h1>
        <p className="mt-6 max-w-xl mx-auto text-[#6a4a40]">Torturi pe comandă, prăjituri artizanale și deserturi franțuzești — toate preparate zilnic în atelierul nostru din centrul Iașiului.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#meniu" className="bg-[#3a1f1a] text-white px-6 py-3 rounded-full">Vezi meniul</a>
          <a href="https://wa.me/40700000000" className="border border-[#3a1f1a] px-6 py-3 rounded-full">Comandă pe WhatsApp</a>
        </div>
      </section>

      {/* Meniu */}
      <section id="meniu" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-serif text-4xl mb-10 text-center">Din meniul săptămânii</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <article key={p.name} className="bg-white/60 border border-[#e8d5c4] rounded-2xl p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-xl">{p.name}</h3>
                <span className="text-[#b8512a] font-medium whitespace-nowrap">{p.price}</span>
              </div>
              <p className="mt-2 text-sm text-[#6a4a40]">{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Despre */}
      <section id="despre" className="bg-[#3a1f1a] text-[#fdf6f0] py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl">De 12 ani, o singură rețetă: răbdarea.</h2>
          <p className="mt-6 text-[#e8d5c4] leading-relaxed">Am pornit dintr-o bucătărie mică, cu un cuptor capricios și o idee simplă: deserturile bune se fac fără grabă. Astăzi livrăm în tot Iașiul, dar fiecare tort trece tot prin mâinile noastre.</p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div className="flex items-start gap-3"><MapPin className="size-5 text-[#b8512a] shrink-0" /><div><div className="font-medium">Atelier</div><div className="text-[#6a4a40]">Str. Lăpușneanu 14, Iași</div></div></div>
          <div className="flex items-start gap-3"><Clock className="size-5 text-[#b8512a] shrink-0" /><div><div className="font-medium">Program</div><div className="text-[#6a4a40]">Mar–Dum: 09:00 — 20:00</div></div></div>
          <div className="flex items-start gap-3"><Phone className="size-5 text-[#b8512a] shrink-0" /><div><div className="font-medium">Telefon</div><div className="text-[#6a4a40]">+40 700 000 000</div></div></div>
        </div>
      </section>

      <footer className="border-t border-[#e8d5c4] py-8 text-center text-xs text-[#6a4a40]">
        © Dulce Dor · Site exemplu realizat de Avyron Tech · <a href="https://instagram.com" className="inline-flex items-center gap-1"><Instagram className="size-3" /> @dulce.dor</a>
      </footer>
    </main>
  );
}
