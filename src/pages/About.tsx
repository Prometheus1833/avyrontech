import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageContext";
import logo from "@/assets/avyron-logo.jpg";
import Footer from "@/components/site/Footer";
import ContactBar from "@/components/site/ContactBar";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageBackLink from "@/components/site/PageBackLink";
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
      ? "Portofoliu web și produse digitale | Avyron Iași"
      : "Web Design & Digital Product Portfolio | Avyron Iași";
    const description = ro
      ? "Explorează portofoliul Avyron: site-uri de prezentare, magazine online, aplicații și produse digitale dezvoltate pentru afaceri din România."
      : "Explore Avyron's portfolio of business websites, online stores, applications and digital products built for organizations in Romania.";
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd }]) => {
        setPageMeta({
          title,
          description,
          path: ro ? "/portofoliu" : "/en/portfolio",
          alternates: { ro: "/portofoliu", en: "/en/portfolio" },
          image: "/og/about.jpg",
          imageAlt: ro
            ? "Portofoliul Avyron de website-uri și produse digitale"
            : "Avyron portfolio of websites and digital products",
        });

        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Portofoliu" : "Portfolio",
              path: ro ? "/portofoliu" : "/en/portfolio",
            },
          ]),
        );
      },
    );
  }, [ro]);

  const projects = [
    {
      name: "Cutiutamagica.eu",
      url: "https://cutiutamagica.eu",
      tag: ro ? "Cutiuțe muzicale artizanale — Site + comenzi" : "Artisan music boxes — Site + orders",
      desc: ro
        ? "Magazin online dedicat cutiuțelor muzicale autentice din lemn, inspirate din universuri îndrăgite (Stăpânul Inelelor, Harry Potter și altele). Catalog de produse, poveste de brand, comenzi rapide cu livrare prin curier sau Easybox."
        : "Online shop for authentic wooden music boxes inspired by beloved universes (Lord of the Rings, Harry Potter and more). Product catalog, brand story, quick orders with courier or Easybox delivery.",
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
      name: "Clarlumanari.ro",
      url: "https://clarlumanari.ro",
      tag: ro ? "Brand artizanal — Site + comenzi" : "Artisan brand — Site + orders",
      desc: ro
        ? "Website de prezentare pentru CLAR — lumânări parfumate turnate manual din ceară naturală, cu fitil din lemn. Catalog de produse, poveste de brand și comenzi rapide prin WhatsApp și telefon."
        : "Showcase website for CLAR — scented candles hand-poured from natural wax with wooden wicks. Product catalog, brand story and quick orders via WhatsApp and phone.",
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
      name: "Flawlesstudio.ro",
      url: "https://flawlesstudio.ro",
      tag: ro
        ? "Website & Integrare sistem programări multi sediu"
        : "Website & multi-location bookings system integration",
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

  // Text marks avoid a third-party icon CDN request on this page.
  const partners = [
    "Cloudflare", "Supabase", "WordPress", "Next.js", "GitHub", "Hostico.ro",
    "Vercel", "React", "TypeScript", "Tailwind CSS", "Stripe", "Figma", "Node.js",
  ];


  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PageBackLink to={ro ? "/" : "/en"} label={ro ? "Înapoi" : "Back"} />
            <a
              href={ro ? "/#hero" : "/en#hero"}
              className="group hidden items-center gap-2 rounded-full px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              aria-label={ro ? "Avyron — mergi la începutul paginii principale" : "Avyron — go to homepage hero"}
            >
              <img src={logo} alt="" width={22} height={22} className="size-5 rounded-md object-cover" />
              <span className="font-display text-[11px] font-extrabold tracking-[0.18em]">AVYRON</span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-2 py-1 backdrop-blur">
              <LangSwitch />
              <span aria-hidden className="w-px h-3 bg-border" />
              <ThemeToggle />
            </div>
            <span className="hidden font-display text-sm font-bold tracking-wide sm:inline">{ro ? "Portofoliu" : "Portfolio"}</span>
          </div>
        </div>

        <Breadcrumbs
          className="mt-6"
          items={[
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Portofoliu" : "Portfolio",
              path: ro ? "/portofoliu" : "/en/portfolio",
            },
          ]}
        />
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
        <div className="relative mx-auto max-w-5xl px-4 pt-16 md:pt-20 pb-10 md:pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground"
          >
            <Building2 className="size-3.5 text-brand" />
            {ro ? "Portofoliu selectat" : "Selected portfolio"}
          </motion.div>
          <h1 className="mt-5 font-display font-extrabold text-3xl sm:text-4xl md:text-6xl leading-tight tracking-tight">
            {ro ? "Proiecte digitale pentru " : "Digital projects for "}
            <span className="bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">
              {ro ? "afaceri care evoluează." : "businesses moving forward."}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed">
            {ro
              ? "Website-uri de prezentare, magazine online și aplicații construite pentru contexte reale. Fiecare proiect pornește de la obiectivul clientului și continuă cu design, dezvoltare, testare și lansare controlată."
              : "Business websites, online stores and applications built for real contexts. Each project starts with the client's objective and continues through design, development, testing and a controlled launch."}
          </p>
          <p className="mt-4 max-w-xl mx-auto font-display text-base md:text-lg leading-relaxed">
            <span className="bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent font-semibold">
              {ro
                ? "Selecție relevantă, fără proiecte demonstrative prezentate ca rezultate comerciale."
                : "A relevant selection, without presenting demo concepts as commercial results."}
            </span>
            <span className="block mt-1 text-sm text-muted-foreground">
              {ro
                ? "Publicăm lucrările reale numai cu acordul clientului."
                : "We publish real work only with client approval."}
            </span>
          </p>
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
                      ? `${e.category.ro} — Site`
                      : `${e.category.en} — Site`,
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
              {[...partners, ...partners].map((partner, i) => (
                <div
                  key={`${partner}-${i}`}
                  className="flex items-center gap-2.5 text-muted-foreground/80 hover:text-foreground transition-colors shrink-0"
                  title={partner}
                >
                  <span className="grid size-5 place-items-center rounded bg-muted-foreground/20 text-[8px] font-bold uppercase" aria-hidden>
                    {partner.slice(0, 2)}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap">{partner}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team / products CTA — compact */}
      <section className="py-6 md:py-8 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4">
          <div className="relative rounded-2xl border border-border/80 bg-card/50 backdrop-blur p-5 md:p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
              <span className="shrink-0 inline-flex size-10 rounded-xl bg-foreground text-background items-center justify-center">
                <UserPlus className="size-5" />
              </span>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display font-bold text-lg md:text-xl tracking-tight">
                  {ro ? "Cunoaște echipa din spatele proiectelor." : "Meet the team behind the projects."}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground leading-snug">
                  {ro
                    ? "Descoperă modul nostru de lucru sau explorează produsele pe care le putem adapta afacerii tale."
                    : "Discover how we work or explore the products we can adapt to your business."}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="rounded-full border-border/80 hover:border-brand/60 hover:text-brand">
                  <Link to={ro ? "/despre-noi" : "/en/about"}>{ro ? "Despre noi" : "About us"}</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                  <Link to={ro ? "/costurisiproduse" : "/en/pricing"}>{ro ? "Vezi produsele" : "View products"}</Link>
                </Button>
              </div>
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
