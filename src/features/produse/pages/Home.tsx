import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Blocks, Boxes, Code2, Gauge, Layers, Palette, ScrollText, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { FAQ } from "../data/faq";
import { COLLECTIONS } from "../data/collections";
import { FEATURED_SLUG, ITEMS, ITEM_BY_SLUG } from "../data/items";
import { TYPES } from "../data/taxonomy";
import Catalog from "../components/Catalog";
import DemoStage from "../components/DemoStage";
import { FeatureRequest, OfferSelector } from "../components/Forms";
import ParticleLabStudio from "../components/ParticleLabStudio";
import Plans from "../components/Plans";
import { PageFaq, Pill, Reveal, Seam, Section, SectionHead } from "../components/Primitives";
import { defaultValues, sortItems } from "../lib/item";
import { collectionPath, collectionsPath, faqPath, guidePath, itemPath, typePath } from "../lib/paths";
import { applySeo, breadcrumb, faqLd, homeDescription, homeTitle, homeUrl, itemListLd, STATS } from "../lib/seo";

/**
 * Pagina principală Produse Avyron.
 *
 * Ordinea secțiunilor urmează drumul unei conversii: impresie → găsesc →
 * încerc → înțeleg ce primesc → aleg planul → cer ce lipsește → întrebări →
 * documentație. Fiecare secțiune își anunță nuanța, iar trecerile sunt linii
 * de lumină și reveal-uri de 16px — nimic care să întrerupă citirea.
 */


const WHY: Array<{ icon: typeof ShieldCheck; ro: [string, string]; en: [string, string] }> = [
  {
    icon: ShieldCheck,
    ro: ["Construite pe proiecte reale", "Fiecare produs a trecut printr-un site de client, nu printr-un demo de portofoliu."],
    en: ["Built on real projects", "Every product shipped on a client site, not in a portfolio demo."],
  },
  {
    icon: Gauge,
    ro: ["Performanța e specificată", "Greutatea în kB, cerințele GPU și comportamentul pe mobil sunt scrise pe fiecare produs."],
    en: ["Performance is specified", "Weight in kB, GPU needs and mobile behaviour are written on every product."],
  },
  {
    icon: Code2,
    ro: ["Cod curat, fără lock-in", "TypeScript, fără dependențe ascunse; îl copiezi în proiectul tău și rămâne al tău."],
    en: ["Clean code, no lock-in", "TypeScript, no hidden dependencies; copy it into your project and it stays yours."],
  },
  {
    icon: Palette,
    ro: ["Accesibil din prima", "Contrast verificat, focus vizibil, mișcare redusă respectată — nu adăugate la final."],
    en: ["Accessible from the start", "Checked contrast, visible focus, reduced motion respected — not bolted on at the end."],
  },
];
const HOME_CATALOG_ITEMS = sortItems(ITEMS, "popular").slice(0, 18);

export default function Home({ lang }: { lang: Lang }) {
  const ro = lang === "ro";
  const [query, setQuery] = useState("");
  const featured = ITEM_BY_SLUG.get(FEATURED_SLUG)!;
  const apis = useMemo(() => ITEMS.filter((item) => item.type === "api"), []);
  const faqTop = useMemo(() => FAQ.slice(0, 8), []);

  useEffect(() => {
    void applySeo({
      title: homeTitle(lang),
      description: homeDescription(lang),
      path: homeUrl(lang),
      lang,
      image: lang === "ro" ? "/og/produse/logo-studio-3d.jpg" : "/og/produse/logo-studio-3d-en.jpg",
      imageAlt: ro
        ? "Catalogul Avyron de componente React și produse digitale pentru site-uri"
        : "Avyron catalogue of React components and digital products for websites",
      jsonLd: [
        ["collection", itemListLd(lang, HOME_CATALOG_ITEMS, homeTitle(lang), homeUrl(lang))],
        ["breadcrumb", breadcrumb(lang, [{ name: ro ? "Produse Avyron" : "Avyron Products", path: homeUrl(lang) }])],
        ["faq", faqLd(faqTop.map((entry) => ({ q: entry.q[lang], a: entry.a[lang] })))],
      ],
    });
  }, [lang, ro, faqTop]);

  return (
    <div className="pb-16">
      {/* 1 — Hero */}
      <Section id="hero" hue={265} label={ro ? "Produse Avyron" : "Avyron Products"}>
        <Reveal immediate className="text-center">
          <p className="pa-mono text-[11px] uppercase tracking-[0.28em] text-brand">{ro ? "Artefacte Avyron · produse digitale" : "Avyron Artefacts · digital products"}</p>
          <h1 className="mx-auto mt-4 max-w-4xl font-display text-[2.1rem] font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-[3.6rem]">
            {ro ? "Componente, secțiuni și efecte 3D " : "Components, sections and 3D effects "}
            <span className="pa-text-grad">{ro ? "gata de lansat" : "ready to ship"}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {ro
              ? "Biblioteca pe care o folosim în proiectele clienților noștri, deschisă agențiilor, freelancerilor și celor care își construiesc singuri site-ul. Copiezi codul, îl instalezi din CLI sau îi ceri asistentului tău AI să-l pună în proiect."
              : "The library we use in our own client projects, opened up to agencies, freelancers and people building their own site. Copy the code, install from the CLI, or ask your AI assistant to drop it in."}
          </p>
        </Reveal>

        <Reveal index={1} className="mx-auto mt-7 max-w-2xl">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="pa-glass pa-edge flex items-center gap-2 rounded-2xl px-4 py-3"
          >
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ro ? "Caută: hero 3D, loading screen, notificări, CSV, login…" : "Search: 3D hero, loading screen, toasts, CSV, login…"}
              aria-label={ro ? "Caută în catalogul de produse" : "Search the product catalogue"}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            />
            <button type="submit" className="rounded-xl bg-gradient-to-br from-brand to-brand-2 px-3.5 py-1.5 text-xs font-semibold text-white" data-ripple>
              {ro ? "Caută" : "Search"}
            </button>
          </form>
        </Reveal>

        <Reveal index={2} className="mt-6">
          <dl className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-8 gap-y-3 border-y border-foreground/8 py-4 text-center">
            {[
              [STATS.total, ro ? "produse" : "products"],
              [STATS.free, ro ? "gratuite" : "free"],
              [STATS.effects, ro ? "efecte 3D" : "3D effects"],
              [STATS.apis, ro ? "integrări API" : "API integrations"],
            ].map(([value, label]) => (
              <div key={String(label)}>
                <dt className="pa-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal index={3} className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <a href="#catalog" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-brand-2 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_40px_-20px_hsl(264_90%_60%)]" data-ripple>
            {ro ? "Vezi produsele" : "Browse the products"} <ArrowRight className="size-4" aria-hidden />
          </a>
          <a href="#parteneriate" className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground" data-ripple>
            {ro ? "Parteneriate de la 0 lei" : "Partnerships from 0 lei"}
          </a>
        </Reveal>
      </Section>

      <Seam />

      {/* 2 — Produsul principal: Logo Studio */}
      <Section id="logo" hue={330}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
          <Reveal immediate>
            <Pill tone="new">{ro ? "Produs principal" : "Flagship product"}</Pill>
            <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-[2.4rem]">{featured.name[lang]}</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{featured.short[lang]}</p>
            <ul className="mt-4 grid list-none gap-1.5 p-0 text-[13px] text-muted-foreground">
              {featured.features[lang].map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-pink-300" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={itemPath(lang, featured)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-pink-400 to-brand px-4 py-2.5 text-sm font-semibold text-white" data-ripple>
                {ro ? "Deschide Logo Studio" : "Open Logo Studio"} <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link to={typePath(lang, "logo")} className="inline-flex items-center rounded-full border border-foreground/15 px-4 py-2.5 text-sm font-semibold text-foreground" data-ripple>
                {ro ? "Vreau logo desenat de echipă" : "I want a logo drawn by the team"}
              </Link>
            </div>
          </Reveal>
          <Reveal index={1}>
            <div className="pa-edge overflow-hidden rounded-3xl border border-foreground/10" style={{ "--pa-hue": 330 } as never}>
              <DemoStage item={featured} values={defaultValues(featured)} lang={lang} className="h-[300px] sm:h-[380px]" />
            </div>
          </Reveal>
        </div>
      </Section>

      <Seam />

      {/* 3 — De ce Avyron */}
      <Section id="de-ce" hue={200}>
        <SectionHead
          eyebrow={ro ? "De ce Produsele Avyron" : "Why Avyron Products"}
          title={ro ? "Piese testate în producție, nu demo-uri frumoase" : "Pieces tested in production, not pretty demos"}
          lead={ro ? "Le folosim noi, în proiecte pe care le predăm clienților. De aceea au buget de performanță, accesibilitate și documentație." : "We use them ourselves, in projects we hand over to clients. That's why they come with a performance budget, accessibility and documentation."}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((entry, index) => (
            <Reveal key={entry.ro[0]} index={index}>
              <div className="pa-glass h-full rounded-2xl p-4">
                <entry.icon className="size-5 text-brand" aria-hidden />
                <p className="mt-3 font-display text-sm font-bold text-foreground">{ro ? entry.ro[0] : entry.en[0]}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{ro ? entry.ro[1] : entry.en[1]}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Seam />

      {/* 4 — Catalogul */}
      <Section id="catalog" hue={265}>
        <SectionHead
          eyebrow={ro ? "Catalog" : "Catalogue"}
          title={ro ? "Caută, filtrează, încearcă pe loc" : "Search, filter, try it on the spot"}
          lead={ro ? "Treci cursorul peste un card și demo-ul pornește. Deschide produsul și îi schimbi setările din Editor Mode, iar codul copiat păstrează exact ce ai ales." : "Hover a card and the demo starts. Open a product and change its settings in Editor Mode — the copied code keeps exactly what you chose."}
          right={
            <Link to={guidePath(lang, "instalare")} className="pa-glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-foreground">
              <ScrollText className="size-3.5" aria-hidden /> {ro ? "Cum se instalează" : "How to install"}
            </Link>
          }
        />
        <Catalog lang={lang} initialQuery={query} />
      </Section>

      <Seam />

      {/* 5 — Colecții curatoriate */}
      <Section id="colectii" hue={300}>
        <SectionHead
          eyebrow={ro ? "Colecții" : "Collections"}
          title={ro ? "Trasee scurte, dacă nu știi de unde să începi" : "Short paths, if you don't know where to start"}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {COLLECTIONS.map((collection, index) => (
            <Reveal key={collection.id} index={index}>
              <div className="pa-glass h-full rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: `hsl(${collection.hue} 85% 62%)` }} />
                  <Link to={collectionPath(lang, collection)} className="font-display text-sm font-bold text-foreground hover:underline">
                    {collection.name[lang]}
                  </Link>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{collection.hint[lang]}</p>
                <ul className="mt-3 grid list-none gap-1 p-0">
                  {collection.slugs.slice(0, 4).map((slug) => {
                    const item = ITEM_BY_SLUG.get(slug);
                    if (!item) return null;
                    return (
                      <li key={slug}>
                        <Link
                          to={itemPath(lang, item)}
                          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13px] text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground"
                        >
                          <span aria-hidden className="size-2 rounded-full" style={{ background: `hsl(${item.hue} 85% 60%)` }} />
                          {item.name[lang]}
                          <ArrowRight className="ml-auto size-3 opacity-50" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <Link
                  to={collectionPath(lang, collection)}
                  className="pa-mono mt-3 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-brand hover:underline"
                >
                  {ro ? "Vezi colecția" : "See the collection"}
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-4">
          <Link
            to={collectionsPath(lang)}
            className="pa-edge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-foreground"
            data-ripple
          >
            {ro ? `Toate cele ${COLLECTIONS.length} colecții` : `All ${COLLECTIONS.length} collections`}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Reveal>
      </Section>

      <Seam />

      {/* 6 — Particle Lab */}
      <Section id="particle-lab" hue={265}>
        <SectionHead
          eyebrow={ro ? "Avyron Particle Lab" : "Avyron Particle Lab"}
          title={ro ? "Construiește-ți efectul și ia configurația cu tine" : "Build your effect and take the configuration with you"}
          lead={ro ? "Sferă, cub, helix, tor sau forma ta — din text ori din imaginea pe care o încarci. Rotești scena cu mouse-ul, reglezi tot din panoul din stânga și exporți configurația, codul sau un PNG." : "Sphere, cube, helix, torus or your own shape — from text or from an image you upload. Rotate the scene with the mouse, tune everything from the left panel and export the configuration, the code or a PNG."}
        />
        <Reveal>
          <ParticleLabStudio lang={ro ? "ro" : "en"} />
        </Reveal>
      </Section>

      <Seam />

      {/* 7 — API-uri gratuite */}
      <Section id="api-uri" hue={45}>
        <SectionHead
          eyebrow={ro ? "Integrări API" : "API integrations"}
          title={ro ? "Servicii gratuite și sigure, gata de legat" : "Free, safe services ready to wire in"}
          lead={ro ? "Fără chei ascunse și fără servicii care mor peste un an: ANAF pentru firme, BNR pentru curs, Open-Meteo pentru vreme, OpenStreetMap pentru adrese." : "No hidden keys and no services that die in a year: ANAF for companies, the national bank for rates, Open-Meteo for weather, OpenStreetMap for addresses."}
          right={
            <Link to={typePath(lang, "api")} className="pa-glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-foreground">
              {ro ? "Toate integrările" : "All integrations"} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        />
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {apis.slice(0, 6).map((item, index) => (
            <Reveal as="li" key={item.slug} index={index}>
              <Link
                to={itemPath(lang, item)}
                className="pa-glass flex h-full flex-col rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-brand/30"
              >
                <p className="font-display text-sm font-bold text-foreground">{item.name[lang]}</p>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.short[lang]}</p>
                <span className="pa-mono mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-lime-300">{ro ? "gratuit · fără cheie" : "free · no key"}</span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Seam />

      {/* 8 — Parteneriate */}
      <Section id="parteneriate" hue={150}>
        <SectionHead
          eyebrow={ro ? "Parteneriate AVY" : "AVY partnerships"}
          title={ro ? "Plătești o dată pe an, biblioteca crește singură" : "Pay once a year, the library grows on its own"}
          lead={ro ? "Sau cumperi doar produsul de care ai nevoie, între 30 și 150 de lei, cu licență pe viață. Ce plătești separat se scade din primul an de parteneriat, dacă treci în 30 de zile." : "Or buy just the product you need, between 30 and 150 lei, with a lifetime licence. What you pay separately is deducted from your first partnership year if you upgrade within 30 days."}
        />
        <Plans lang={lang} />
      </Section>

      <Seam />

      {/* 9 — Selectorul universal */}
      <Section id="selector" hue={200}>
        <SectionHead
          eyebrow={ro ? "Tot ce putem face" : "Everything we can do"}
          title={ro ? "Bifează ce te interesează, fără cont și fără costuri" : "Tick what interests you — no account, no cost"}
          lead={ro ? "Serviciile agenției, integrările și produsele digitale, cu specificațiile minime. Primești un singur răspuns, cu ce recomandăm pentru cazul tău." : "The agency's services, the integrations and the digital products, with their minimum specs. You get one reply with what we recommend for your case."}
        />
        <OfferSelector lang={lang} />
      </Section>

      <Seam />

      {/* 10 — Solicită o funcție */}
      <Section id="cerere" hue={195}>
        <Reveal>
          <FeatureRequest lang={lang} />
        </Reveal>
      </Section>

      <Seam />

      {/* 11 — Întrebări frecvente */}
      <Section id="intrebari" hue={220}>
        <SectionHead
          eyebrow={ro ? "Întrebări frecvente" : "Frequently asked"}
          title={ro ? "Limite, licență, facturi — pe scurt" : "Limits, licence, invoices — in short"}
          right={
            <Link to={faqPath(lang)} className="pa-glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-foreground">
              {ro ? `Toate cele ${FAQ.length} întrebări` : `All ${FAQ.length} questions`} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        />
        <Reveal>
          <PageFaq items={faqTop.map((entry) => ({ id: `q-${entry.id}`, q: entry.q[lang], a: entry.a[lang] }))} />
        </Reveal>
      </Section>

      <Seam />

      {/* 12 — Plăci finale */}
      <Section id="documentatie" hue={265}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Blocks, to: guidePath(lang, "introducere"), ro: ["Introducere", "Ce sunt produsele și cum se folosesc"], en: ["Introduction", "What the products are and how to use them"] },
            { icon: Sparkles, to: guidePath(lang, "de-ce"), ro: ["De ce Avyron Products", "Standardele pe care le ținem"], en: ["Why Avyron Products", "The standards we hold"] },
            { icon: Layers, to: guidePath(lang, "licente"), ro: ["Licențe și utilizare", "Ce poți face cu ce descarci"], en: ["Licence and use", "What you may do with what you download"] },
            { icon: Boxes, to: guidePath(lang, "instalare"), ro: ["Ghid de instalare", "CLI, cod, MCP și prompt AI"], en: ["Installation guide", "CLI, code, MCP and AI prompt"] },
          ].map((tile, index) => (
            <Reveal key={tile.ro[0]} index={index}>
              <Link to={tile.to} className="pa-glass flex h-full flex-col rounded-2xl p-4 transition hover:-translate-y-0.5">
                <tile.icon className="size-5 text-brand" aria-hidden />
                <p className="mt-3 font-display text-sm font-bold text-foreground">{ro ? tile.ro[0] : tile.en[0]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ro ? tile.ro[1] : tile.en[1]}</p>
                <ArrowRight className="mt-3 size-4 text-muted-foreground/60" aria-hidden />
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}
