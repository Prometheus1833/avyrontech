import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Code2,
  Smartphone,
  ShieldCheck,
  Palette,
  Bug,
  Server,
  Sparkles,
  UserPlus,
  MessageSquare,
  Wrench,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageContext";
import logo from "@/assets/avyron-logo.jpg";
import Footer from "@/components/site/Footer";
import ContactBar from "@/components/site/ContactBar";

const About = () => {
  const { lang } = useLang();
  const ro = lang === "ro";

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = ro
      ? "Despre Noi & Portofoliu — Avyron Tech Products"
      : "About & Portfolio — Avyron Tech Products";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      ro
        ? "Echipa Avyron — specialiști în web, mobile, cybersecurity, design și QA. Portofoliu: Miago, Flawless Studio, Retuvo."
        : "The Avyron team — specialists in web, mobile, cybersecurity, design and QA. Portfolio: Miago, Flawless Studio, Retuvo.",
    );
  }, [ro]);

  const specialties = [
    { icon: Code2, t: ro ? "Web Development" : "Web Development", d: ro ? "Stack modern, performant, scalabil." : "Modern, performant, scalable stack." },
    { icon: Smartphone, t: ro ? "Mobile Development" : "Mobile Development", d: ro ? "Aplicații iOS & Android nativ-ready." : "iOS & Android native-ready apps." },
    { icon: ShieldCheck, t: "Cybersecurity", d: ro ? "Audit, hardening, protecție continuă." : "Audits, hardening, continuous protection." },
    { icon: Palette, t: "Design", d: ro ? "UI/UX rafinat, identitate vizuală." : "Refined UI/UX and visual identity." },
    { icon: Bug, t: "QA & Testing", d: ro ? "Testare automată și manuală riguroasă." : "Rigorous automated and manual testing." },
    { icon: Server, t: ro ? "DevOps & Hosting" : "DevOps & Hosting", d: ro ? "Infrastructură fiabilă, SLA realist." : "Reliable infrastructure, realistic SLA." },
  ];

  const flow = [
    { icon: MessageSquare, t: ro ? "Comunicare clară" : "Clear communication", d: ro ? "Discuții directe, fără jargon. Înțelegem viziunea ta înainte de orice linie de cod." : "Direct conversations, no jargon. We understand your vision before any line of code." },
    { icon: Wrench, t: ro ? "Dezvoltare end-to-end" : "End-to-end development", d: ro ? "De la wireframe la lansare: design, cod, testare, optimizare." : "From wireframe to launch: design, code, testing, optimization." },
    { icon: Rocket, t: ro ? "Publicare & lansare" : "Publishing & launch", d: ro ? "Hosting setup, domenii, SSL, indexare Google. Totul pregătit la cheie." : "Hosting setup, domains, SSL, Google indexing. All turnkey." },
    { icon: ShieldCheck, t: ro ? "Mentenanță continuă" : "Ongoing maintenance", d: ro ? "Securitate, performanță, backup-uri și actualizări — fără bătăi de cap." : "Security, performance, backups and updates — hassle-free." },
  ];

  const projects = [
    {
      name: "Miago.ro",
      url: "https://miago.ro",
      tag: ro ? "E-commerce auto + aplicație" : "Auto e-commerce + app",
      desc: ro
        ? "Platformă web și aplicație mobilă pentru piese și accesorii auto, cu catalog complex, checkout optimizat și gestiune de stoc."
        : "Web platform and mobile app for auto parts and accessories, with a complex catalog, optimized checkout and stock management.",
    },
    {
      name: "Flawlesstudio.ro",
      url: "https://flawlesstudio.ro",
      tag: ro ? "Brand local Iași — multi-sediu" : "Local Iași brand — multi-location",
      desc: ro
        ? "Website de prezentare pentru un brand local din Iași, cu mai multe sedii, programări și identitate vizuală premium."
        : "Showcase website for a local Iași brand, with multiple locations, bookings and premium visual identity.",
    },
    {
      name: "Retuvo.ro",
      url: "https://retuvo.ro",
      tag: ro ? "SGR digitalizat — site + aplicație" : "Digital DRS — site + app",
      desc: ro
        ? "Produs care digitalizează procesul SGR din România: decontare prin aplicație și serviciu de colectori la domiciliu pentru recipiente reciclabile."
        : "Product digitalizing Romania's DRS process: in-app refunds and a home pickup collector service for recyclable containers.",
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            {ro ? "Înapoi acasă" : "Back home"}
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Avyron" width={28} height={28} className="size-7 rounded-md object-cover" />
            <span className="font-display font-bold tracking-wide text-sm">Avyron Tech Products</span>
          </div>
        </div>
      </div>

      {/* Hero — Cursor-inspired */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
          aria-hidden
        />
        {/* glow halo */}
        <div className="pointer-events-none absolute left-1/2 top-[-20%] -translate-x-1/2 size-[640px] rounded-full bg-brand/20 blur-[120px]" aria-hidden />
        <div className="pointer-events-none absolute right-[-10%] bottom-[-30%] size-[420px] rounded-full bg-foreground/10 blur-[120px]" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-20 md:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground"
          >
            <Sparkles className="size-3.5 text-brand" />
            {ro ? "Despre noi & Portofoliu" : "About & Portfolio"}
          </motion.div>
          <h1 className="mt-5 font-display font-extrabold text-4xl md:text-6xl leading-tight tracking-tight">
            {ro ? "Construim digital, " : "We build digital, "}
            <span className="bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">
              {ro ? "cu grijă pentru detalii." : "with care for the details."}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed">
            {ro
              ? "Avyron Tech Products este o echipă de specialiști care transformă idei în produse digitale rafinate. Lucrăm direct, transparent și concentrat pe rezultate reale — de la prima conversație, până la mentenanța de lungă durată."
              : "Avyron Tech Products is a team of specialists turning ideas into refined digital products. We work directly, transparently and focused on real results — from the first conversation to long-term maintenance."}
          </p>
        </div>
      </section>

      {/* Process / collaboration */}
      <section className="py-16 md:py-24 relative">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-brand">
              {ro ? "// cum colaborăm" : "// how we collaborate"}
            </span>
            <h2 className="mt-3 font-display font-bold text-3xl md:text-5xl tracking-tight">
              {ro ? "Un proces simplu, de la idee la lansare." : "A simple process, from idea to launch."}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {ro
                ? "Comunicarea cu clientul stă la baza fiecărui proiect. După lansare, echipa Avyron poate prelua mentenanța, hostingul, securitatea, performanța și publicarea — astfel încât tu să te concentrezi doar pe activitatea ta."
                : "Client communication is at the heart of every project. After launch, the Avyron team can take over maintenance, hosting, security, performance and publishing — so you can focus only on your business."}
            </p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {flow.map((s) => (
              <div key={s.t} className="group relative rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-5 hover:border-brand/50 transition-colors overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-brand/10 via-transparent to-transparent" aria-hidden />
                <span className="relative size-10 rounded-xl bg-brand/10 text-brand grid place-items-center ring-1 ring-brand/20">
                  <s.icon className="size-5" />
                </span>
                <h3 className="relative mt-4 font-display font-semibold text-base">{s.t}</h3>
                <p className="relative mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team / specialties */}
      <section className="py-16 md:py-24 bg-secondary/40 border-y border-border/60">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-brand">
              {ro ? "// echipa" : "// the team"}
            </span>
            <h2 className="mt-3 font-display font-bold text-3xl md:text-5xl tracking-tight">
              {ro ? "Specialiști dedicați, pe fiecare strat al produsului." : "Dedicated specialists across every layer of the product."}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {ro
                ? "Lucrăm împreună ca un singur organism: dezvoltare web și mobile, cybersecurity, design, QA și operațiuni — fiecare cu expertiza lui, toți cu același standard de calitate."
                : "We work as one organism: web & mobile development, cybersecurity, design, QA and operations — each with their own expertise, all sharing the same quality standard."}
            </p>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {specialties.map((s) => (
              <div key={s.t} className="rounded-2xl border border-border bg-card p-5 hover:border-brand/40 transition-colors">
                <span className="size-10 rounded-xl bg-foreground text-background grid place-items-center">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display font-semibold text-base">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Account CTA */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/10 via-card to-card p-8 md:p-12 shadow-soft">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <span className="size-14 rounded-2xl bg-brand text-brand-foreground grid place-items-center shrink-0">
                <UserPlus className="size-7" />
              </span>
              <div className="flex-1">
                <h2 className="font-display font-bold text-2xl md:text-3xl">
                  {ro ? "Vrei să afli mai multe despre noi?" : "Want to learn more about us?"}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {ro
                    ? "Creează-ți un cont pe platforma noastră — fără obligații. Primești acces la resurse, noutăți și o privire din interior asupra modului în care lucrăm. Nu trebuie să cumperi nimic și nu trebuie să ne lași produsul în administrare."
                    : "Create an account on our platform — no strings attached. Get access to resources, news and an inside look at how we work. No purchase required, no need to hand over your product."}
                </p>
              </div>
              <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0">
                <a href="#cta">
                  {ro ? "Conectează-te / Înregistrează-te" : "Sign in / Sign up"}
                  <ArrowUpRight className="size-4 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="py-12 md:py-16 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-brand font-semibold">
              {ro ? "Portofoliu & Colaborări" : "Portfolio & Collaborations"}
            </span>
            <h2 className="mt-2 font-display font-bold text-3xl md:text-4xl">
              {ro ? "Printre ultimele noastre creații." : "Among our latest creations."}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {ro
                ? "Afișăm doar proiectele cu acordul explicit al clienților. Fiecare colaborare rămâne confidențială până când partenerul nostru decide altfel."
                : "We only display projects with explicit client consent. Every collaboration remains confidential until our partner decides otherwise."}
            </p>
          </div>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {projects.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-border bg-card p-6 hover:border-brand/40 hover:shadow-elev transition-all flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-xl">{p.name}</h3>
                    <span className="mt-1 inline-block text-[11px] uppercase tracking-widest text-brand">{p.tag}</span>
                  </div>
                  <span className="size-9 rounded-full bg-foreground text-background grid place-items-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <ContactBar />
    </main>
  );
};

export default About;
