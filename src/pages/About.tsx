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
import { examples } from "@/examples/registry";

const About = () => {
  const { lang } = useLang();
  const ro = lang === "ro";

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
    const title = ro
      ? "Despre Noi & Portofoliu — Avyron Tech Products"
      : "About & Portfolio — Avyron Tech Products";
    const description = ro
      ? "Echipa Avyron — specialiști în web, mobile, cybersecurity, design și QA. Portofoliu: Miago, Flawless Studio, Retuvo."
      : "The Avyron team — specialists in web, mobile, cybersecurity, design and QA. Portfolio: Miago, Flawless Studio, Retuvo.";
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({ title, description, path: "/despre-si-portofoliu" }),
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
      name: "Flawlesstudio.ro",
      url: "https://flawlesstudio.ro",
      tag: ro ? "Brand local Iași — multi-sediu" : "Local Iași brand — multi-location",
      desc: ro
        ? "Website de prezentare pentru un brand local din Iași, cu mai multe sedii, programări și identitate vizuală premium."
        : "Showcase website for a local Iași brand, with multiple locations, bookings and premium visual identity.",
    },
    {
      name: "Clarlumanari.ro",
      url: "https://clarlumanari.ro",
      tag: ro ? "Brand artizanal — Site + comenzi" : "Artisan brand — Site + orders",
      desc: ro
        ? "Website de prezentare pentru CLAR — lumânări parfumate turnate manual din ceară naturală, cu fitil din lemn. Catalog de produse, poveste de brand și comenzi rapide prin WhatsApp și telefon."
        : "Showcase website for CLAR — scented candles hand-poured from natural wax with wooden wicks. Product catalog, brand story and quick orders via WhatsApp and phone.",
    },
    {
      name: "Miago.ro",
      url: "https://miago.ro",
      tag: ro ? "Platformă Auto — Site + Aplicație" : "Auto Platform — Site + App",
      desc: ro
        ? "Platformă Web și aplicație Mobile pentru anunțuri de vânzări autoturisme, autocamioane și alte tipuri de auto într-un concept nou și intuitiv."
        : "Web platform and Mobile app for sales listings of cars, trucks and other vehicles in a new, intuitive concept.",
    },
    {
      name: "Ruller.eu",
      url: "https://ruller.eu",
      tag: ro ? "Barber shop premium — Site + programări" : "Premium barber shop — Site + bookings",
      desc: ro
        ? "Website de prezentare pentru un barber shop premium: meniu complet de servicii (tuns clasic, skin fade, barbă, tratamente), galerie salon și programări instant prin integrare Mero și WhatsApp."
        : "Showcase website for a premium barber shop: full service menu (classic cut, skin fade, beard, treatments), salon gallery and instant bookings via Mero and WhatsApp integration.",
    },
    {
      name: "Plaseieftineiasi.ro",
      url: "https://plaseieftineiasi.ro",
      tag: ro ? "E-commerce sezonier — Site" : "Seasonal e-commerce — Site",
      desc: ro
        ? "Site integrat și sincronizat pentru vânzarea de plase de țânțari — o necesitate reală în sezonul de vară: comenzi rapide, stoc în timp real și livrare locală în Iași."
        : "Integrated and synchronized site selling mosquito nets — a real summer-season essential: fast orders, real-time stock and local delivery in Iași.",
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

  // Parteneri tehnici afișați în marquee (doar vizual, fără linkuri).
  // `icon` = slug simpleicons.org; lasă null și se afișează ca text-pill.
  const partners: Array<{ label: string; icon: string | null }> = [
    { label: "Cloudflare", icon: "cloudflare" },
    { label: "Supabase", icon: "supabase" },
    { label: "WordPress", icon: "wordpress" },
    { label: "Next.js", icon: "nextdotjs" },
    { label: "GitHub", icon: "github" },
    { label: "Hostico.ro", icon: null },
    { label: "Vercel", icon: "vercel" },
    { label: "React", icon: "react" },
    { label: "TypeScript", icon: "typescript" },
    { label: "Tailwind CSS", icon: "tailwindcss" },
    { label: "Stripe", icon: "stripe" },
    { label: "Figma", icon: "figma" },
    { label: "Node.js", icon: "nodedotjs" },
  ];


  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="group relative inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 backdrop-blur pl-2 pr-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-brand/60 transition-all duration-300 overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/10 to-brand/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />
            <span className="relative grid place-items-center size-5 rounded-full bg-foreground text-background transition-transform duration-300 group-hover:-translate-x-0.5">
              <ArrowLeft className="size-3" />
            </span>
            <span className="relative font-mono uppercase tracking-[0.18em] text-[10px]">
              {ro ? "Acasă" : "Home"}
            </span>
            <span className="relative size-1 rounded-full bg-brand animate-pulse" aria-hidden />
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Avyron" width={28} height={28} className="size-7 rounded-md object-cover" />
            <span className="font-display font-bold tracking-wide text-sm">Avyron Tech</span>
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
          <h1 className="mt-5 font-display font-extrabold text-3xl sm:text-4xl md:text-6xl leading-tight tracking-tight">
            {ro ? "Construim digital, " : "We build digital, "}
            <span className="bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">
              {ro ? "cu grijă pentru detalii." : "with care for the details."}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed">
            {ro
              ? "Avyron Tech este o echipă de specialiști care transformă idei în produse digitale rafinate. Lucrăm direct, transparent și concentrat pe rezultate reale — de la prima conversație, până la mentenanța de lungă durată."
              : "Avyron Tech is a team of specialists turning ideas into refined digital products. We work directly, transparently and focused on real results — from the first conversation to long-term maintenance."}
          </p>
        </div>
      </section>

      {/* Process / collaboration */}
      <section className="py-16 md:py-24 relative">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">
              {ro ? "Un proces simplu, de la idee la lansare." : "A simple process, from idea to launch."}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {ro
                ? "Comunicarea cu clientul stă la baza fiecărui proiect. După lansare, echipa Avyron poate prelua mentenanța, hostingul, securitatea, performanța și publicarea — astfel încât tu să te concentrezi doar pe activitatea ta."
                : "Client communication is at the heart of every project. After launch, the Avyron team can take over maintenance, hosting, security, performance and publishing — so you can focus only on your business."}
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {flow.map((s) => (
              <div key={s.t} className="group relative rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-3 sm:p-5 hover:border-brand/50 transition-colors overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-brand/10 via-transparent to-transparent" aria-hidden />
                <span className="relative size-8 sm:size-10 rounded-xl bg-brand/10 text-brand grid place-items-center ring-1 ring-brand/20">
                  <s.icon className="size-4 sm:size-5" />
                </span>
                <h3 className="relative mt-3 sm:mt-4 font-display font-semibold text-sm sm:text-base leading-tight">{s.t}</h3>
                <p className="relative mt-1 sm:mt-1.5 text-xs sm:text-sm text-muted-foreground leading-snug">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team / specialties */}
      <section className="py-16 md:py-24 bg-secondary/40 border-y border-border/60">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">
              {ro ? "Specialiști dedicați, pe fiecare strat al produsului." : "Dedicated specialists across every layer of the product."}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {ro
                ? "Lucrăm împreună ca un singur organism: dezvoltare web și mobile, cybersecurity, design, QA și operațiuni — fiecare cu expertiza lui, toți cu același standard de calitate."
                : "We work as one organism: web & mobile development, cybersecurity, design, QA and operations — each with their own expertise, all sharing the same quality standard."}
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-3">
            {specialties.map((s) => (
              <div key={s.t} className="group relative rounded-xl border border-border/80 bg-background/60 backdrop-blur p-3 sm:p-4 hover:border-brand/50 transition-colors overflow-hidden flex flex-col items-center text-center">
                <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                <span className="size-8 sm:size-9 rounded-lg bg-foreground text-background grid place-items-center">
                  <s.icon className="size-4" />
                </span>
                <h3 className="mt-2.5 font-display font-semibold text-sm sm:text-base leading-tight">{s.t}</h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section id="portofoliu" className="py-16 md:py-24 relative overflow-hidden scroll-mt-24">
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-10 size-[520px] rounded-full bg-brand/10 blur-[120px]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">
              {ro ? "Printre ultimele noastre creații." : "Among our latest creations."}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {ro
                ? "Afișăm doar proiectele cu acordul explicit al clienților. Fiecare colaborare rămâne confidențială până când partenerul nostru decide altfel."
                : "We only display projects with explicit client consent. Every collaboration remains confidential until our partner decides otherwise."}
            </p>
          </div>
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="relative rounded-2xl border border-border/80 bg-card/40 backdrop-blur overflow-hidden">
              <div className="max-h-[28rem] overflow-y-auto divide-y divide-border/70 scrollbar-subtle">
                {[
                  ...projects.map((p) => ({
                    key: p.name,
                    name: p.name,
                    tag: p.tag,
                    desc: p.desc,
                    href: p.url,
                    internal: false,
                  })),
                  ...examples.map((e) => ({
                    key: e.slug,
                    name: e.domain,
                    tag: ro
                      ? `${e.category.ro} — Exemplu Avyron`
                      : `${e.category.en} — Avyron example`,
                    desc: ro ? e.description.ro : e.description.en,
                    href: `/examples/${e.slug}`,
                    internal: true,
                  })),
                ].map((p) => {
                  const content = (
                    <>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-lg md:text-xl">{p.name}</h3>
                        <span className="mt-0.5 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{p.tag}</span>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                      </div>
                      <span className="shrink-0 size-9 rounded-full bg-foreground text-background grid place-items-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                        <ArrowUpRight className="size-4" />
                      </span>
                    </>
                  );
                  const cls = "group relative flex items-start gap-4 p-5 hover:bg-brand/5 transition-colors";
                  return p.internal ? (
                    <Link key={p.key} to={p.href} className={cls}>{content}</Link>
                  ) : (
                    <a key={p.key} href={p.href} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" aria-hidden />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {ro ? "Derulează lista pentru a vedea mai multe proiecte." : "Scroll the list to see more projects."}
            </p>
          </div>
        </div>
      </section>


      {/* Parteneri — marquee subtil */}
      <section aria-labelledby="parteneri-title" className="py-10 md:py-12 border-t border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="parteneri-title" className="text-center font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            {ro ? "Partenerii și tehnologii de încredere" : "Trusted partners & technologies"}
          </h2>
          <div className="mt-6 relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex gap-12 md:gap-16 w-max animate-[partners-scroll_38s_linear_infinite] hover:[animation-play-state:paused]">
              {[...partners, ...partners].map((p, i) => (
                <div
                  key={`${p.label}-${i}`}
                  className="flex items-center gap-2.5 text-muted-foreground/80 hover:text-foreground transition-colors shrink-0"
                  title={p.label}
                >
                  {p.icon ? (
                    <img
                      src={`https://cdn.simpleicons.org/${p.icon}/9ca3af`}
                      alt=""
                      aria-hidden
                      width={20}
                      height={20}
                      className="size-5 opacity-80"
                      loading="lazy"
                    />
                  ) : (
                    <span className="size-5 rounded bg-muted-foreground/20 grid place-items-center text-[9px] font-bold">
                      {p.label.charAt(0)}
                    </span>
                  )}
                  <span className="text-sm font-medium whitespace-nowrap">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Account CTA — Cursor style */}
      <section className="py-16 md:py-24 border-t border-border/60">
        <div className="mx-auto max-w-5xl px-4">
          <div className="relative rounded-3xl border border-border/80 bg-gradient-to-b from-card to-background p-8 md:p-14 overflow-hidden text-center">
            <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto size-[420px] rounded-full bg-brand/20 blur-[120px]" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
              aria-hidden
            />
            <div className="relative">
              <span className="mx-auto inline-flex size-14 rounded-2xl bg-foreground text-background items-center justify-center">
                <UserPlus className="size-7" />
              </span>
              <h2 className="mt-6 font-display font-bold text-3xl md:text-5xl tracking-tight">
                {ro ? "Vrei să afli mai multe despre noi?" : "Want to learn more about us?"}
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                {ro
                  ? "Creează-ți un cont pe platforma noastră — fără obligații. Primești acces la resurse, noutăți și o privire din interior asupra modului în care lucrăm. Nu trebuie să cumperi nimic și nu trebuie să ne lași produsul în administrare."
                  : "Create an account on our platform — no strings attached. Get access to resources, news and an inside look at how we work. No purchase required, no need to hand over your product."}
              </p>
              <Button asChild size="lg" className="mt-8 rounded-full bg-foreground text-background hover:bg-foreground/90">
                <Link to="/auth">
                  {ro ? "Conectează-te / Înregistrează-te" : "Sign in / Sign up"}
                  <ArrowUpRight className="size-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <ContactBar />
    </main>
  );
};

export default About;
