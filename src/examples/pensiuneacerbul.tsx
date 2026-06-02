import { useEffect } from "react";
import { Mountain, Wifi, Coffee, TreePine, Bath, ParkingCircle, Phone, MapPin, Instagram } from "lucide-react";
import avyronLogo from "@/assets/avyron-logo.jpg";

const rooms = [
  { name: "Camera Brad", price: "280 RON / noapte", desc: "Pat matrimonial king-size, baie privată cu duș de ploaie, balcon cu vedere spre Vârful Bihariei. Pentru 2 persoane." },
  { name: "Apartament Familie", price: "420 RON / noapte", desc: "Două camere conectate, living cu șemineu pe lemn, baie cu cadă, bucătărie utilată. Până la 4 persoane." },
  { name: "Cabană individuală", price: "550 RON / noapte", desc: "Cabană de lemn de 60 mp cu terasă proprie, ciubăr exterior încălzit pe lemn, intimitate totală în pădure." },
];

const amenities = [
  { icon: Wifi, label: "Wi-Fi fibră 300 Mbps" },
  { icon: Coffee, label: "Mic dejun cu produse locale" },
  { icon: TreePine, label: "12 trasee marcate" },
  { icon: Bath, label: "Ciubăr exterior cu lemne" },
  { icon: ParkingCircle, label: "Parcare privată gratuită" },
  { icon: Mountain, label: "300m de pârtia Vârtop" },
];

export default function PensiuneaCerbul() {
  useEffect(() => {
    document.title = "Pensiunea Cerbul Apuseni — Cazare montană în Vârtop, jud. Bihor";
    const meta = document.querySelector('meta[name="description"]');
    const content = "Pensiune montană în Munții Apuseni, la 300m de pârtia Vârtop. Camere, apartamente și cabane individuale cu ciubăr, mic dejun inclus și 12 trasee marcate.";
    if (meta) meta.setAttribute("content", content);
  }, []);

  return (
    <main className="min-h-screen bg-[#0f1410] text-[#e8e4dd]">
      <header className="border-b border-white/10 backdrop-blur sticky top-0 bg-[#0f1410]/85 z-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><Mountain className="size-5 text-[#a8c49d]" /><span className="font-serif text-xl">Pensiunea Cerbul</span></div>
          <nav className="hidden md:flex gap-8 text-sm">
            <a href="#camere" className="hover:text-[#a8c49d] transition-colors">Camere</a>
            <a href="#facilitati" className="hover:text-[#a8c49d] transition-colors">Facilități</a>
            <a href="#contact" className="hover:text-[#a8c49d] transition-colors">Contact</a>
          </nav>
          <a href="#contact" className="text-sm bg-[#a8c49d] text-[#0f1410] px-4 py-2 rounded-full font-medium hover:bg-[#bdd6b2] transition-colors">Rezervă</a>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3c2a] via-[#0f1410] to-[#1a3c2a]" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, #a8c49d 0%, transparent 50%), radial-gradient(circle at 70% 70%, #5a8a5c 0%, transparent 50%)" }} />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 py-24 sm:py-32 md:py-40 text-center">
          <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.3em] text-[#a8c49d]">Munții Apuseni · Vârtop · 1.140m altitudine</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl md:text-7xl leading-[1.05]">Liniștea muntelui,<br/><span className="text-[#a8c49d]">la 3 ore de Cluj.</span></h1>
          <p className="mt-6 max-w-xl mx-auto text-[#bdb4a4] leading-relaxed">Cabane de lemn cu ciubăr, mic dejun cu produse din gospodăriile locale și 12 trasee care încep chiar de la poarta noastră — vara pe potecă, iarna pe schiuri.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#camere" className="bg-[#a8c49d] text-[#0f1410] px-6 py-3 rounded-full font-medium hover:bg-[#bdd6b2] transition-colors">Vezi camerele</a>
            <a href="https://wa.me/40744567812" className="border border-[#a8c49d] text-[#a8c49d] px-6 py-3 rounded-full hover:bg-[#a8c49d] hover:text-[#0f1410] transition-colors">WhatsApp</a>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-[#bdb4a4]">
            <span>★ 4.8 pe Booking · 240+ recenzii</span>
            <span>Pet-friendly</span>
            <span>Tichete de vacanță acceptate</span>
          </div>
        </div>
      </section>

      <section id="camere" className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl">Camere & cabane</h2>
          <p className="mt-3 text-sm text-[#bdb4a4] max-w-md mx-auto">Tarifele includ mic dejun, parcare și acces nelimitat la ciubăr. Copiii sub 6 ani — gratuit.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {rooms.map((r) => (
            <article key={r.name} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:-translate-y-0.5 transition-all">
              <h3 className="font-serif text-2xl">{r.name}</h3>
              <p className="mt-2 text-[#a8c49d] font-medium">{r.price}</p>
              <p className="mt-3 text-sm text-[#bdb4a4] leading-relaxed">{r.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="facilitati" className="bg-white/[0.03] py-16 sm:py-20 border-y border-white/10">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <h2 className="font-serif text-3xl sm:text-4xl mb-10 sm:mb-12 text-center">Facilități incluse</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 max-w-3xl mx-auto">
            {amenities.map((a) => (
              <div key={a.label} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"><a.icon className="size-5 text-[#a8c49d] shrink-0" /><span className="text-sm">{a.label}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-20 text-center">
        <h2 className="font-serif text-3xl sm:text-4xl">Rezervă-ți weekendul</h2>
        <p className="mt-4 text-[#bdb4a4]">Sună-ne sau scrie pe WhatsApp — răspundem în maxim o oră, de luni până duminică.</p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <a href="tel:+40744567812" className="bg-[#a8c49d] text-[#0f1410] px-6 py-3 rounded-full font-medium inline-flex items-center gap-2"><Phone className="size-4" /> +40 744 567 812</a>
          <a href="https://wa.me/40744567812" className="border border-[#a8c49d] text-[#a8c49d] px-6 py-3 rounded-full hover:bg-[#a8c49d] hover:text-[#0f1410] transition-colors">WhatsApp</a>
        </div>
        <div className="mt-8 inline-flex items-center gap-2 text-sm text-[#bdb4a4]"><MapPin className="size-4 text-[#a8c49d]" /> Sat Vârtop, com. Arieșeni, jud. Bihor</div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7a8478]">
          <span>© 2026 Pensiunea Cerbul SRL · CUI RO42198765</span>
          <a href="https://avyron.ro" target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-[#a8c49d] transition-colors">
            <span>Website by</span>
            <img src={avyronLogo} alt="Avyron Tech" width={18} height={18} className="size-[18px] rounded object-cover" />
            <span className="font-medium">Avyron Tech</span>
          </a>
          <a href="https://instagram.com/pensiunea.cerbul" className="inline-flex items-center gap-1.5 hover:text-[#a8c49d]"><Instagram className="size-3.5" /> @pensiunea.cerbul</a>
        </div>
      </footer>
    </main>
  );
}
