import { useEffect } from "react";
import { Link } from "react-router-dom";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { useLang } from "@/i18n/LanguageContext";
import { ArrowUpRight, Sparkles, Recycle, ShoppingCart, UtensilsCrossed, Scale, Hotel } from "lucide-react";
import workFlawlesstudio from "@/assets/work-beauty-flawless.jpg";
import workRetuvo from "@/assets/work-miago-truck.jpg";
import workMiago from "@/assets/work-public-miago.jpg";
import workRestaurant from "@/assets/work-restaurant-new.jpg";
import workLawyer from "@/assets/work-lawyer-new.jpg";
import workHotel from "@/assets/work-hotel-new.jpg";

const projects = [
  {
    id: "flawlesstudio",
    title: "Flawlesstudio",
    category: "Beauty & Wellness",
    desc: "Salon premium cu programări online, galerie servicii și design feminin elegant.",
    image: workFlawlesstudio,
    icon: Sparkles,
    accent: "#c97b8a",
    demo: "/exemple/flawlesstudio",
  },
  {
    id: "retuvo",
    title: "Retuvo",
    category: "Sustenabilitate / App",
    desc: "Aplicație națională de reciclare cu scanare coduri, wallet digital și hartă puncte de colectare.",
    image: workRetuvo,
    icon: Recycle,
    accent: "#10b981",
    demo: "/exemple/retuvo",
  },
  {
    id: "miago",
    title: "Miago.ro",
    category: "eCommerce / Marketplace",
    desc: "Platformă auto/moto/utilaje cu filtre avansate, verificare VIN și dashboard vendori.",
    image: workMiago,
    icon: ShoppingCart,
    accent: "#3b82f6",
    demo: null,
  },
  {
    id: "restaurant",
    title: "Bistro Local",
    category: "Restaurante & Cafenele",
    desc: "Meniu interactiv, rezervări online și comenzi integrate cu delivery parteneri.",
    image: workRestaurant,
    icon: UtensilsCrossed,
    accent: "#f59e0b",
    demo: null,
  },
  {
    id: "lawyer",
    title: "Cabinet Profesional",
    category: "Profesii Liberale",
    desc: "Site de încredere pentru avocați și notari: servicii, programări, documente și GDPR.",
    image: workLawyer,
    icon: Scale,
    accent: "#6366f1",
    demo: null,
  },
  {
    id: "hotel",
    title: "Pensiunea Muntele Verde",
    category: "Turism & Cazare",
    desc: "Booking direct, galerie, pachete sezoniere și experiențe pentru oaspeți.",
    image: workHotel,
    icon: Hotel,
    accent: "#14b8a6",
    demo: null,
  },
];

const Portfolio = () => {
  const { t } = useLang();

  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta, setJsonLd }) => {
      setPageMeta({
        title: "Portofoliu & Colaborări — Proiecte realizate de Avyron",
        description:
          "Descoperă proiectele Avyron: site-uri, aplicații și platforme digitale pentru beauty, auto, restaurante, turism și profesii liberale.",
        path: "/portofoliu",
      });
      setJsonLd("ld-portfolio", {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Portofoliu Avyron",
        description: "Proiecte și colaborări realizate de echipa Avyron.",
        url: "https://avyron.ro/portofoliu",
        mainEntity: projects.map((p) => ({
          "@type": "CreativeWork",
          name: p.title,
          description: p.desc,
          genre: p.category,
        })),
      });
    });
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <section className="pt-32 pb-16 px-4 bg-hero">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-brand font-bold mb-4">
            <span className="size-1.5 rounded-full bg-brand animate-pulse" /> Portofoliu & Colaborări
          </span>
          <h1 className="font-display font-bold text-4xl md:text-6xl leading-[0.95] tracking-tight">
            Proiecte care <span className="text-gradient">vorbesc</span> de la sine
          </h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-base md:text-lg leading-relaxed">
            Site-uri, aplicații și platforme digitale construite pentru afaceri reale — cu focus pe design, performanță și conversie.
          </p>
        </div>
      </section>

      {/* PROJECTS GRID */}
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className="group relative rounded-3xl overflow-hidden border border-border bg-cardgrad shadow-soft hover:shadow-elev transition-all duration-500"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div
                    className="absolute top-3 left-3 size-10 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow-sm"
                    style={{ color: p.accent }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="text-[10px] uppercase tracking-wider text-white/80 font-semibold">{p.category}</div>
                    <h3 className="font-display font-bold text-xl text-white mt-0.5">{p.title}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  {p.demo ? (
                    <Link
                      to={p.demo}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity"
                      style={{ color: p.accent }}
                    >
                      Vezi demo <ArrowUpRight className="size-4" />
                    </Link>
                  ) : (
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground/60">
                      În curând <ArrowUpRight className="size-4" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-muted/40">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-bold text-3xl md:text-4xl">
            Ai un proiect în minte?
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Hai să-l transformăm împreună într-o experiență digitală memorabilă.
          </p>
          <Link
            to="/?tab=demo"
            onClick={() => {
              setTimeout(() => {
                const el = document.getElementById("cta");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-white bg-foreground hover:bg-foreground/90 transition-colors"
          >
            {t.nav.cta} <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Portfolio;
