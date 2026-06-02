import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { Calendar, Sparkles, Star, Heart, ArrowRight, MapPin, Phone, Instagram, Award, Clock, Gift } from "lucide-react";

const FlawlesstudioDemo = () => {
  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: "Flawlesstudio — Demo site salon premium realizat de Avyron",
        description:
          "Exemplu de website pentru salon de înfrumusețare: programări online, echipă, galerie servicii și design premium realizat de Avyron.",
        path: "/exemple/flawlesstudio",
      })
    );
  }, []);

  return (
    <DemoFrame displayUrl="flawlesstudio.avyron.ro" brandName="Flawlesstudio" accent="#c97b8a">
      <div className="bg-[#fdf6f3] text-[#2a1a1f]">
        {/* NAV */}
        <header className="border-b border-[#e8d5d0] bg-[#fdf6f3]/95 backdrop-blur sticky top-[52px] z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-gradient-to-br from-[#e8a5a8] to-[#c97b8a] grid place-items-center">
                <Sparkles className="size-4 text-white" />
              </div>
              <span className="font-display font-bold text-lg tracking-wide">
                Flawles<span className="italic font-light">studio</span>
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-[#6b4a52]">
              <a href="#servicii" className="hover:text-[#c97b8a]">Servicii</a>
              <a href="#echipa" className="hover:text-[#c97b8a]">Echipă</a>
              <a href="#galerie" className="hover:text-[#c97b8a]">Galerie</a>
              <a href="#contact" className="hover:text-[#c97b8a]">Contact</a>
            </nav>
            <a href="#programari" className="inline-flex items-center gap-1.5 bg-[#2a1a1f] text-white rounded-full px-4 py-2 text-sm font-bold hover:opacity-90">
              <Calendar className="size-4" /> Programează
            </a>
          </div>
        </header>

        {/* HERO */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-[#c97b8a] font-bold">
              <span className="size-1.5 rounded-full bg-[#c97b8a] animate-pulse" /> Salon premium · București
            </span>
            <h1 className="font-display font-bold text-5xl md:text-7xl leading-[0.95] mt-3">
              Pielea ta,<br />
              <span className="italic font-light text-[#c97b8a]">la fel de</span><br />
              perfectă ca tine.
            </h1>
            <p className="text-base text-[#6b4a52] mt-4 max-w-md leading-relaxed">
              Epilare definitivă MedValley, tratamente faciale și ritualuri de îngrijire cu rezultate vizibile încă de la prima ședință.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <a href="#programari" className="inline-flex items-center gap-2 bg-[#2a1a1f] text-white rounded-full px-6 py-3 text-sm font-bold hover:opacity-90">
                Rezervă o ședință <ArrowRight className="size-4" />
              </a>
              <a href="#galerie" className="inline-flex items-center gap-2 rounded-full border-2 border-[#2a1a1f]/30 px-5 py-3 text-sm font-semibold hover:bg-[#2a1a1f]/5">
                Vezi galeria
              </a>
            </div>
            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-[#e8d5d0]">
              {[["19+", "ani exp."], ["4.9★", "312 review"], ["5K+", "cliente"]].map(([v, l]) => (
                <div key={l}>
                  <div className="font-display font-bold text-3xl leading-none">{v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#6b4a52] mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[#f5d5d8] via-[#e8a5a8] to-[#c97b8a]" />
            <div className="absolute inset-0 grid place-items-center">
              <Sparkles className="size-32 text-white/40" />
            </div>
            <div className="absolute top-3 right-3 left-3 rounded-2xl bg-white/95 backdrop-blur p-3 shadow-lg">
              <div className="text-[10px] font-bold text-[#c97b8a] uppercase tracking-wider">Următorul slot</div>
              <div className="text-sm font-bold mt-0.5">Joi · 10:30</div>
              <div className="text-xs text-[#6b4a52]">cu Andreea M.</div>
            </div>
            <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-[#2a1a1f]/95 text-white p-3 backdrop-blur">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Ofertă luna asta</div>
              <div className="text-sm font-bold mt-0.5">6 ședințe full-body –30%</div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="servicii" className="bg-white border-y border-[#e8d5d0] py-14">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-xs uppercase tracking-[0.25em] text-[#c97b8a] font-bold">Servicii</span>
              <h2 className="font-display font-bold text-3xl md:text-4xl mt-2">Ritualuri pentru o piele radiantă</h2>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                ["Laser MedValley", "Epilare definitivă", "de la 250 lei", "from-[#f5d5d8]"],
                ["Tratamente faciale", "Anti-age & hidratare", "de la 180 lei", "from-[#f0e0d5]"],
                ["Manichiură", "Premium semipermanent", "de la 120 lei", "from-[#fae5e0]"],
                ["Pachete cadou", "Vouchere personalizate", "de la 200 lei", "from-[#ecd5e0]"],
              ].map(([t, s, p, c]) => (
                <div key={t} className={`rounded-2xl bg-gradient-to-br ${c} to-white border border-[#e8d5d0] p-5 hover:shadow-lg transition-shadow`}>
                  <div className="size-10 rounded-full bg-white grid place-items-center mb-3">
                    <Heart className="size-5 text-[#c97b8a]" />
                  </div>
                  <div className="font-display font-bold text-base">{t}</div>
                  <div className="text-xs text-[#6b4a52] mt-1">{s}</div>
                  <div className="text-sm font-bold text-[#c97b8a] mt-2">{p}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section id="echipa" className="py-14">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-xs uppercase tracking-[0.25em] text-[#c97b8a] font-bold">Echipa</span>
              <h2 className="font-display font-bold text-3xl md:text-4xl mt-2">Profesioniste cu peste 19 ani de experiență</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                ["Andreea M.", "Estetician senior", "12 ani"],
                ["Mihaela P.", "Specialist laser", "8 ani"],
                ["Iulia S.", "Make-up artist", "6 ani"],
              ].map(([n, r, e]) => (
                <div key={n} className="bg-white rounded-2xl border border-[#e8d5d0] p-6 text-center">
                  <div className="size-20 rounded-full bg-gradient-to-br from-[#f5d5d8] to-[#c97b8a] mx-auto mb-3 grid place-items-center">
                    <Award className="size-8 text-white" />
                  </div>
                  <div className="font-display font-bold text-lg">{n}</div>
                  <div className="text-sm text-[#6b4a52]">{r}</div>
                  <div className="text-xs text-[#c97b8a] font-bold mt-1">{e} experiență</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="bg-[#2a1a1f] text-white py-14">
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
            <div>
              <div className="size-10 rounded-full bg-[#c97b8a] grid place-items-center mb-3">
                <MapPin className="size-5" />
              </div>
              <div className="font-bold mb-1">Locație</div>
              <div className="text-sm opacity-70">Strada Eleganței 12<br />București, Sector 1</div>
            </div>
            <div>
              <div className="size-10 rounded-full bg-[#c97b8a] grid place-items-center mb-3">
                <Clock className="size-5" />
              </div>
              <div className="font-bold mb-1">Program</div>
              <div className="text-sm opacity-70">Luni - Sâmbătă: 09:00 - 20:00<br />Duminică: închis</div>
            </div>
            <div>
              <div className="size-10 rounded-full bg-[#c97b8a] grid place-items-center mb-3">
                <Phone className="size-5" />
              </div>
              <div className="font-bold mb-1">Contact</div>
              <div className="text-sm opacity-70">+40 7XX XXX XXX<br />contact@flawlesstudio.ro</div>
            </div>
          </div>
        </section>
      </div>
    </DemoFrame>
  );
};

export default FlawlesstudioDemo;
