import { useEffect } from "react";
import { ArrowUpRight, Mail, Instagram } from "lucide-react";
import avyronLogo from "@/assets/avyron-logo.jpg";

const projects = [
  { title: "Apartament Floreasca", year: "2024", tag: "Rezidențial · 92 mp · Stil japandi" },
  { title: "Cabinet stomatologic Aura", year: "2024", tag: "Comercial · 140 mp · Sector 1" },
  { title: "Penthouse Băneasa", year: "2023", tag: "Rezidențial · 180 mp · Două nivele" },
  { title: "Showroom Lumen", year: "2023", tag: "Retail · 220 mp · Iluminat decorativ" },
];

export default function StudioMaraDesign() {
  useEffect(() => {
    document.title = "Studio Mara Design București — Design interior rezidențial & comercial";
    const meta = document.querySelector('meta[name="description"]');
    const content = "Studio de design interior în București. Proiectare 3D, materiale autentice și coordonare execuție pentru spații rezidențiale și comerciale.";
    if (meta) meta.setAttribute("content", content);
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f1ec] text-[#1a1a1a]">
      <header className="border-b border-black/10 bg-[#f4f1ec]/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          <div className="font-serif italic text-2xl">Mara <span className="font-sans not-italic uppercase tracking-[0.3em] text-xs ml-1">design</span></div>
          <nav className="hidden md:flex gap-10 uppercase text-xs tracking-[0.2em]">
            <a href="#proiecte" className="hover:text-[#7a5a3a]">Proiecte</a>
            <a href="#proces" className="hover:text-[#7a5a3a]">Proces</a>
            <a href="#contact" className="hover:text-[#7a5a3a]">Contact</a>
          </nav>
          <a href="#contact" className="text-xs uppercase tracking-[0.2em] border border-[#1a1a1a] px-4 py-2 rounded-full hover:bg-[#1a1a1a] hover:text-[#f4f1ec] transition-colors">Programează</a>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 sm:px-8 py-20 sm:py-28 md:py-36 text-center">
        <p className="uppercase text-[11px] sm:text-xs tracking-[0.3em] text-[#7a7a7a]">Studio de design interior · București · Din 2017</p>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl md:text-7xl leading-[1.05]">Spații care respiră.<br/><em className="italic text-[#7a5a3a]">Detalii care durează.</em></h1>
        <p className="mt-8 max-w-xl mx-auto text-[#3a3a3a] leading-relaxed">Concepem interioare rezidențiale și comerciale care îmbină materiale autentice cu o estetică liniștită. Fiecare proiect începe cu o întâlnire la fața locului și se termină cu cheile predate la termen.</p>
        <a href="#contact" className="mt-10 inline-flex items-center gap-2 border-b border-[#1a1a1a] pb-1 text-sm uppercase tracking-[0.2em] hover:text-[#7a5a3a] hover:border-[#7a5a3a] transition-colors">Programează o întâlnire <ArrowUpRight className="size-4" /></a>
      </section>

      <section id="proiecte" className="border-t border-black/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16 sm:py-20">
          <div className="text-center mb-12">
            <span className="uppercase text-[11px] sm:text-xs tracking-[0.3em] text-[#7a7a7a]">Selecție 2023 — 2024</span>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Proiecte recente</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
            {projects.map((p) => (
              <article key={p.title} className="group cursor-pointer">
                <div className="aspect-[4/3] bg-gradient-to-br from-[#d8cdbd] via-[#c4b39c] to-[#a08770] mb-4 overflow-hidden rounded-sm">
                  <div className="size-full opacity-0 group-hover:opacity-20 transition-opacity bg-[#1a1a1a]" />
                </div>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-xl sm:text-2xl">{p.title}</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-[#7a7a7a]">{p.year}</span>
                </div>
                <p className="text-sm text-[#5a5a5a] mt-1">{p.tag}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="proces" className="bg-[#1a1a1a] text-[#f4f1ec] py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <span className="uppercase text-[11px] sm:text-xs tracking-[0.3em] text-[#7a5a3a]">Cum lucrăm</span>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Patru pași, fără surprize</h2>
          </div>
          <ol className="space-y-6 max-w-2xl mx-auto">
            {[
              ["01", "Întâlnire & brief", "Vizităm spațiul, înțelegem ritmul tău și cum îl folosești zilnic."],
              ["02", "Concept & moodboard", "Direcție vizuală, paletă de materiale, referințe foto."],
              ["03", "Proiect tehnic 3D", "Randări fotorealiste și planșe de execuție înainte de orice lucrare."],
              ["04", "Coordonare execuție", "Lucrăm cu meșteri verificați, supervizăm șantierul, predăm la termen."],
            ].map(([n, t, d]) => (
              <li key={n} className="grid grid-cols-[60px_1fr] gap-6 border-t border-white/10 pt-6">
                <span className="font-mono text-[#7a5a3a]">{n}</span>
                <div>
                  <h3 className="font-serif text-xl">{t}</h3>
                  <p className="text-[#bdb4a4] mt-1 text-sm leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="contact" className="max-w-3xl mx-auto px-6 sm:px-8 py-20 sm:py-24 text-center">
        <h2 className="font-serif text-4xl sm:text-5xl">Hai să vorbim despre <em>spațiul tău</em>.</h2>
        <p className="mt-4 text-[#5a5a5a] max-w-md mx-auto">Răspundem în maxim 24h. Primele 30 de minute de consultanță sunt gratuite.</p>
        <a href="mailto:hello@studiomaradesign.ro" className="mt-8 inline-flex items-center gap-2 text-base sm:text-lg border-b border-[#1a1a1a] pb-1 hover:text-[#7a5a3a] hover:border-[#7a5a3a] transition-colors"><Mail className="size-4" /> hello@studiomaradesign.ro</a>
        <div className="mt-4 text-sm text-[#5a5a5a]">
          <a href="tel:+40723456789" className="hover:text-[#7a5a3a]">+40 723 456 789</a> · București, Sector 1
        </div>
      </section>

      <footer className="border-t border-black/10 py-8">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] uppercase tracking-[0.2em] text-[#7a7a7a]">
          <span>© 2026 Mara Design Studio SRL</span>
          <a href="https://avyron.ro" target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-[#1a1a1a] transition-colors normal-case tracking-normal text-xs">
            <span>Website by</span>
            <img src={avyronLogo} alt="Avyron Tech" width={18} height={18} className="size-[18px] rounded object-cover" />
            <span className="font-medium">Avyron Tech</span>
          </a>
          <a href="https://instagram.com/studiomaradesign" className="inline-flex items-center gap-1.5 hover:text-[#1a1a1a] normal-case tracking-normal text-xs"><Instagram className="size-3.5" /> @studiomaradesign</a>
        </div>
      </footer>
    </main>
  );
}
