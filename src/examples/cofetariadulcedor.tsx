import { useEffect } from "react";
import { Cake, Phone, MapPin, Clock, Instagram, Heart, Sparkles } from "lucide-react";
import avyronLogo from "@/assets/avyron-logo.jpg";

const products = [
  { name: "Tort Pădurea Neagră", price: "180 RON", desc: "Blat de cacao belgiană, frișcă naturală bătută la rece, vișine confiate în casă cu vanilie de Madagascar." },
  { name: "Cheesecake clasic NY", price: "150 RON", desc: "Crustă de biscuiți Digestive, cremă fină de Philadelphia, coulis de zmeură proaspăt din Cucuteni." },
  { name: "Macarons asortați (12 buc)", price: "85 RON", desc: "Vanilie Bourbon, fistic Bronte, ciocolată Valrhona, zmeură, lămâie Amalfi, caramel cu sare Maldon." },
  { name: "Profiterol cu ciocolată", price: "45 RON / porție", desc: "Choux franțuzesc umplut cu cremă de vanilie și ganache cald de ciocolată 70% cacao." },
  { name: "Tartă cu fructe de pădure", price: "120 RON", desc: "Aluat fraged cu unt francez, cremă patissière cu vanilie, fructe de sezon din livezile bucovinene." },
  { name: "Eclere artizanale (6 buc)", price: "60 RON", desc: "Choux clasic, cremă de vanilie Madagascar, glazură de ciocolată belgiană Callebaut." },
];

export default function CofetariaDulceDor() {
  useEffect(() => {
    document.title = "Cofetăria Dulce Dor Iași — Torturi și deserturi artizanale";
    const meta = document.querySelector('meta[name="description"]');
    const content = "Cofetărie artizanală în centrul Iașiului. Torturi pe comandă, macarons, cheesecake și deserturi franțuzești preparate zilnic din ingrediente reale.";
    if (meta) meta.setAttribute("content", content);
  }, []);

  return (
    <main className="min-h-screen bg-[#fdf6f0] text-[#3a1f1a]">
      <header className="border-b border-[#e8d5c4] bg-[#fdf6f0]/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif text-xl">
            <Cake className="size-5 text-[#b8512a]" />
            <span>Dulce Dor</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#meniu" className="hover:text-[#b8512a] transition-colors">Meniu</a>
            <a href="#despre" className="hover:text-[#b8512a] transition-colors">Povestea</a>
            <a href="#contact" className="hover:text-[#b8512a] transition-colors">Contact</a>
          </nav>
          <a href="tel:+40745218903" className="text-sm bg-[#b8512a] text-white px-4 py-2 rounded-full hover:bg-[#9c4422] transition-colors">Comandă</a>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-5 sm:px-6 py-16 sm:py-24 md:py-28 text-center">
        <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.3em] text-[#b8512a]">Cofetărie artizanală · Iași · Din 2012</p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl md:text-7xl leading-[1.05]">Dulciuri făcute cu răbdare,<br/><em className="text-[#b8512a]">din ingrediente reale.</em></h1>
        <p className="mt-6 max-w-xl mx-auto text-[#6a4a40] leading-relaxed">Torturi pe comandă, prăjituri artizanale și deserturi franțuzești — toate preparate zilnic în atelierul nostru de pe Lăpușneanu. Fără conservanți, fără arome artificiale, fără compromis.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#meniu" className="bg-[#3a1f1a] text-white px-6 py-3 rounded-full hover:bg-[#5a2f28] transition-colors">Vezi meniul săptămânii</a>
          <a href="https://wa.me/40745218903" className="border border-[#3a1f1a] px-6 py-3 rounded-full hover:bg-[#3a1f1a] hover:text-white transition-colors">Comandă pe WhatsApp</a>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-[#6a4a40]">
          <span className="inline-flex items-center gap-1.5"><Heart className="size-3.5 text-[#b8512a]" /> 4.9 ★ pe Google (320+ recenzii)</span>
          <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5 text-[#b8512a]" /> Livrare în tot Iașiul</span>
        </div>
      </section>

      <section id="meniu" className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl">Din meniul săptămânii</h2>
          <p className="mt-3 text-sm text-[#6a4a40] max-w-md mx-auto">Meniul se schimbă în funcție de sezon. Pentru comenzi personalizate — torturi de nuntă, botez sau aniversare — sună-ne cu minim 5 zile înainte.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {products.map((p) => (
            <article key={p.name} className="bg-white/70 border border-[#e8d5c4] rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-xl">{p.name}</h3>
                <span className="text-[#b8512a] font-medium whitespace-nowrap text-sm">{p.price}</span>
              </div>
              <p className="mt-2 text-sm text-[#6a4a40] leading-relaxed">{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="despre" className="bg-[#3a1f1a] text-[#fdf6f0] py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#c9a084]">Povestea noastră</p>
          <h2 className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl">De 12 ani, o singură rețetă:<br/><em className="text-[#e8c5a0]">răbdarea.</em></h2>
          <p className="mt-6 text-[#e8d5c4] leading-relaxed">Am pornit în 2012 dintr-o bucătărie mică din Tătărași, cu un cuptor capricios și o idee simplă: deserturile bune se fac fără grabă. Astăzi avem un atelier în centrul Iașiului și livrăm în tot orașul, dar fiecare tort trece tot prin mâinile noastre — ale Mariei și ale Anei.</p>
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-lg mx-auto text-center">
            <div><div className="font-serif text-3xl text-[#e8c5a0]">12</div><div className="text-xs mt-1 text-[#c9a084]">ani de experiență</div></div>
            <div><div className="font-serif text-3xl text-[#e8c5a0]">4.000+</div><div className="text-xs mt-1 text-[#c9a084]">torturi livrate</div></div>
            <div><div className="font-serif text-3xl text-[#e8c5a0]">100%</div><div className="text-xs mt-1 text-[#c9a084]">ingrediente reale</div></div>
          </div>
        </div>
      </section>

      <section id="contact" className="max-w-5xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <h2 className="font-serif text-3xl sm:text-4xl text-center mb-10">Vino în atelier sau sună-ne</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <div className="flex flex-col items-center text-center gap-2 p-5 rounded-2xl bg-white/60 border border-[#e8d5c4]">
            <MapPin className="size-5 text-[#b8512a]" />
            <div className="font-medium">Atelier</div>
            <div className="text-[#6a4a40]">Str. Lăpușneanu 14<br/>Iași, 700057</div>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-5 rounded-2xl bg-white/60 border border-[#e8d5c4]">
            <Clock className="size-5 text-[#b8512a]" />
            <div className="font-medium">Program</div>
            <div className="text-[#6a4a40]">Mar–Vin: 09:00–20:00<br/>Sâm–Dum: 10:00–18:00</div>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-5 rounded-2xl bg-white/60 border border-[#e8d5c4]">
            <Phone className="size-5 text-[#b8512a]" />
            <div className="font-medium">Telefon</div>
            <a href="tel:+40745218903" className="text-[#6a4a40] hover:text-[#b8512a]">+40 745 218 903</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e8d5c4] py-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6a4a40]">
          <div className="flex items-center gap-3">
            <span>© 2026 Cofetăria Dulce Dor SRL · CUI RO38291045</span>
          </div>
          <a href="https://avyron.ro" target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-[#b8512a] transition-colors">
            <span>Website by</span>
            <img src={avyronLogo} alt="Avyron Tech" width={18} height={18} className="size-[18px] rounded object-cover" />
            <span className="font-medium">Avyron Tech</span>
          </a>
          <a href="https://instagram.com/dulce.dor.iasi" className="inline-flex items-center gap-1.5 hover:text-[#b8512a]"><Instagram className="size-3.5" /> @dulce.dor.iasi</a>
        </div>
      </footer>
    </main>
  );
}
