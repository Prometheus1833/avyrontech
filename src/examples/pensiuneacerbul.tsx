import { Mountain, Wifi, Coffee, TreePine, Bath, ParkingCircle } from "lucide-react";

const rooms = [
  { name: "Camera Brad", price: "280 RON / noapte", desc: "Pat matrimonial, baie privată, balcon cu vedere la munte." },
  { name: "Apartament Familie", price: "420 RON / noapte", desc: "Două camere, living cu șemineu, baie cu cadă, până la 4 persoane." },
  { name: "Cabană individuală", price: "550 RON / noapte", desc: "Cabană de lemn cu terasă proprie, ciubăr exterior, intimitate totală." },
];

const amenities = [
  { icon: Wifi, label: "Wi-Fi fibră" },
  { icon: Coffee, label: "Mic dejun inclus" },
  { icon: TreePine, label: "Trasee marcate" },
  { icon: Bath, label: "Ciubăr exterior" },
  { icon: ParkingCircle, label: "Parcare privată" },
  { icon: Mountain, label: "300m de pârtie" },
];

export default function PensiuneaCerbul() {
  return (
    <main className="min-h-screen bg-[#0f1410] text-[#e8e4dd]">
      <header className="border-b border-white/10 backdrop-blur sticky top-0 bg-[#0f1410]/80 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><Mountain className="size-5 text-[#a8c49d]" /><span className="font-serif text-xl">Pensiunea Cerbul</span></div>
          <nav className="hidden md:flex gap-8 text-sm">
            <a href="#camere" className="hover:text-[#a8c49d]">Camere</a>
            <a href="#facilitati" className="hover:text-[#a8c49d]">Facilități</a>
            <a href="#contact" className="hover:text-[#a8c49d]">Contact</a>
          </nav>
          <a href="#contact" className="text-sm bg-[#a8c49d] text-[#0f1410] px-4 py-2 rounded-full font-medium">Rezervă</a>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3c2a] via-[#0f1410] to-[#1a3c2a]" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, #a8c49d 0%, transparent 50%), radial-gradient(circle at 70% 70%, #5a8a5c 0%, transparent 50%)" }} />
        <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-36 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#a8c49d]">Apuseni · 1.140m altitudine</p>
          <h1 className="mt-4 font-serif text-5xl md:text-7xl">Liniștea muntelui,<br/><span className="text-[#a8c49d]">la doar 3 ore de oraș.</span></h1>
          <p className="mt-6 max-w-xl mx-auto text-[#bdb4a4]">Cabane de lemn, mic dejun cu produse locale și trasee care încep chiar de la poarta noastră.</p>
          <a href="#camere" className="mt-8 inline-block bg-[#a8c49d] text-[#0f1410] px-8 py-3 rounded-full font-medium">Vezi camerele</a>
        </div>
      </section>

      <section id="camere" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-serif text-4xl mb-10 text-center">Camere & cabane</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {rooms.map((r) => (
            <article key={r.name} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="font-serif text-2xl">{r.name}</h3>
              <p className="mt-2 text-[#a8c49d]">{r.price}</p>
              <p className="mt-3 text-sm text-[#bdb4a4]">{r.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="facilitati" className="bg-white/[0.03] py-20 border-y border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-serif text-4xl mb-10 text-center">Facilități incluse</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {amenities.map((a) => (
              <div key={a.label} className="flex items-center gap-3"><a.icon className="size-5 text-[#a8c49d]" /><span>{a.label}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-serif text-4xl">Rezervă-ți weekendul</h2>
        <p className="mt-4 text-[#bdb4a4]">Sună-ne sau scrie pe WhatsApp — răspundem în maxim o oră.</p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <a href="tel:+40700000000" className="bg-[#a8c49d] text-[#0f1410] px-6 py-3 rounded-full font-medium">+40 700 000 000</a>
          <a href="https://wa.me/40700000000" className="border border-[#a8c49d] px-6 py-3 rounded-full">WhatsApp</a>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-[#7a8478]">
        © Pensiunea Cerbul · Site exemplu realizat de Avyron Tech
      </footer>
    </main>
  );
}
