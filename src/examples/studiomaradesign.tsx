import { ArrowUpRight, Mail } from "lucide-react";

const projects = [
  { title: "Apartament Floreasca", year: "2024", tag: "Rezidențial · 92 mp" },
  { title: "Cabinet stomatologic Aura", year: "2024", tag: "Comercial · 140 mp" },
  { title: "Penthouse Băneasa", year: "2023", tag: "Rezidențial · 180 mp" },
  { title: "Showroom Lumen", year: "2023", tag: "Retail · 220 mp" },
];

export default function StudioMaraDesign() {
  return (
    <main className="min-h-screen bg-[#f4f1ec] text-[#1a1a1a]">
      <header className="border-b border-black/10">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="font-serif italic text-2xl">Mara <span className="font-sans not-italic uppercase tracking-[0.3em] text-xs ml-1">design</span></div>
          <nav className="hidden md:flex gap-10 uppercase text-xs tracking-[0.2em]">
            <a href="#proiecte">Proiecte</a>
            <a href="#proces">Proces</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-8 py-24 md:py-40 grid md:grid-cols-12 gap-8">
        <div className="md:col-span-7">
          <p className="uppercase text-xs tracking-[0.3em] text-[#7a7a7a]">Studio de design interior — București</p>
          <h1 className="mt-6 font-serif text-5xl md:text-7xl leading-[1.05]">Spații care respiră.<br/><em className="italic text-[#7a5a3a]">Detalii care durează.</em></h1>
        </div>
        <div className="md:col-span-5 md:pt-8">
          <p className="text-[#3a3a3a] leading-relaxed">Concepem interioare rezidențiale și comerciale care îmbină materiale autentice cu o estetică liniștită. Fiecare proiect începe de la oamenii care îl vor locui.</p>
          <a href="#contact" className="mt-8 inline-flex items-center gap-2 border-b border-[#1a1a1a] pb-1 text-sm uppercase tracking-[0.2em]">Programează o întâlnire <ArrowUpRight className="size-4" /></a>
        </div>
      </section>

      <section id="proiecte" className="border-t border-black/10">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-end justify-between mb-12">
            <h2 className="font-serif text-4xl">Proiecte selectate</h2>
            <span className="uppercase text-xs tracking-[0.3em] text-[#7a7a7a]">2023 — 2024</span>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {projects.map((p) => (
              <article key={p.title} className="group cursor-pointer">
                <div className="aspect-[4/3] bg-gradient-to-br from-[#d8cdbd] via-[#c4b39c] to-[#a08770] mb-4 overflow-hidden">
                  <div className="size-full opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1a1a]/10" />
                </div>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-2xl">{p.title}</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-[#7a7a7a]">{p.year}</span>
                </div>
                <p className="text-sm text-[#5a5a5a] mt-1">{p.tag}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="proces" className="bg-[#1a1a1a] text-[#f4f1ec] py-24">
        <div className="max-w-5xl mx-auto px-8">
          <h2 className="font-serif text-4xl mb-12">Cum lucrăm</h2>
          <ol className="space-y-8">
            {[
              ["01", "Întâlnire & brief", "Înțelegem ritmul tău și cum folosești spațiul."],
              ["02", "Concept & moodboard", "Direcție vizuală, materiale, paletă."],
              ["03", "Proiect tehnic 3D", "Randări fotorealiste înainte de execuție."],
              ["04", "Coordonare execuție", "Lucrăm cu meșteri verificați și ținem termenele."],
            ].map(([n, t, d]) => (
              <li key={n} className="grid grid-cols-[60px_1fr] gap-6 border-t border-white/10 pt-6">
                <span className="font-mono text-[#7a5a3a]">{n}</span>
                <div>
                  <h3 className="font-serif text-xl">{t}</h3>
                  <p className="text-[#bdb4a4] mt-1 text-sm">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="contact" className="max-w-3xl mx-auto px-8 py-24 text-center">
        <h2 className="font-serif text-5xl">Hai să vorbim despre <em>spațiul tău</em>.</h2>
        <a href="mailto:hello@studiomaradesign.ro" className="mt-8 inline-flex items-center gap-2 text-lg border-b border-[#1a1a1a] pb-1"><Mail className="size-4" /> hello@studiomaradesign.ro</a>
      </section>

      <footer className="border-t border-black/10 py-8 text-center text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">
        © Mara Design Studio · Exemplu by Avyron Tech
      </footer>
    </main>
  );
}
