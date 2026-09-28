import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Download, PenTool, Sparkles } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { ITEM_BY_SLUG } from "../data/items";
import DemoStage from "../components/DemoStage";
import { FeatureRequest } from "../components/Forms";
import LogoStudio from "../components/LogoStudio";
import { Pill, Reveal, Seam, Section, SectionHead } from "../components/Primitives";
import { defaultValues } from "../lib/item";
import { homePath, itemPath, typePath } from "../lib/paths";
import { applySeo, breadcrumb, productLd } from "../lib/seo";
import { store } from "../lib/store";

/**
 * Pagina Logo — două fețe ale aceluiași subiect:
 *  1. Logo Studio, produsul digital: generezi logo-ul 3D în browser, gratuit,
 *     și plătești doar pachetul de descărcare;
 *  2. serviciul Avyron, în care logo-ul e desenat de echipă.
 * Prima e autoservire, a doua e conversie spre agenție — de aceea stau împreună.
 */
export default function LogoPage({ lang }: { lang: Lang }) {
  const ro = lang === "ro";
  const studio = ITEM_BY_SLUG.get("logo-studio-3d")!;
  const kit = ITEM_BY_SLUG.get("kit-monograme")!;
  const path = typePath(lang, "logo");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const title = ro ? "Logo Studio 3D și creare logo profesional — Avyron" : "Logo Studio 3D and professional logo design — Avyron";
    void applySeo({
      title,
      description: ro
        ? "Generează un logo 3D în browser, gratuit: text, simbol, material, lumină și rotire. Descarci pachetul PNG, SVG, GLB și animație, sau ceri un logo desenat de echipa Avyron."
        : "Generate a 3D logo in the browser for free: text, symbol, material, light and rotation. Download the PNG, SVG, GLB and animation pack, or ask the Avyron team to draw one.",
      path,
      lang,
      jsonLd: [
        ["logo-product", productLd(lang, studio)],
        [
          "breadcrumb",
          breadcrumb(lang, [
            { name: ro ? "Produse Avyron" : "Avyron Products", path: homePath(lang) },
            { name: ro ? "Logo" : "Logo", path },
          ]),
        ],
      ],
    });
  }, [lang, ro, path, studio]);

  const steps = ro
    ? [
        ["Brief în 10 minute", "Ne spui numele, domeniul, ce îți place și ce eviți."],
        ["3 direcții vizuale", "Primești trei propuneri diferite, nu variații ale aceleiași idei."],
        ["Două runde de ajustări", "Rafinăm direcția aleasă: proporții, culoare, variante."],
        ["Pachet complet", "SVG, PNG, favicon, variante pe fundal închis/deschis și ghid scurt de utilizare."],
      ]
    : [
        ["A 10-minute brief", "You tell us the name, the field, what you like and what to avoid."],
        ["3 visual directions", "You get three genuinely different proposals, not variations of one idea."],
        ["Two rounds of changes", "We refine the chosen direction: proportions, colour, variants."],
        ["Complete pack", "SVG, PNG, favicon, light/dark variants and a short usage guide."],
      ];

  return (
    <div className="pb-16">
      <Section id="logo-studio" hue={330}>
        <Reveal className="text-center">
          <Pill tone="new">{ro ? "Produs principal" : "Flagship product"}</Pill>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            {ro ? "Logo-ul tău, " : "Your logo, "}
            <span className="pa-text-grad">{ro ? "construit în spațiu" : "built in space"}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {ro
              ? "Scrii numele, alegi simbolul, materialul și lumina, îl rotești cu mouse-ul și vezi exact cum arată. Previzualizarea e gratuită și nelimitată — plătești doar când vrei pachetul de fișiere."
              : "Type the name, pick the symbol, material and light, spin it with the mouse and see exactly how it looks. The preview is free and unlimited — you only pay when you want the file pack."}
          </p>
        </Reveal>

        <Reveal index={1} className="mt-6">
          <LogoStudio
            lang={ro ? "ro" : "en"}
            onBuy={() => {
              store.addToCart({ kind: "item", slug: studio.slug });
              setAdded(true);
            }}
          />
          {added && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 text-xs text-lime-200">
              <Check className="size-3.5" aria-hidden />
              {ro ? "Pachetul e în coș. Plata cu cardul se activează la lansare; până atunci trimitem link de plată." : "The pack is in your cart. Card payment goes live at launch; until then we send a payment link."}
            </p>
          )}
        </Reveal>

        <Reveal index={2} className="mt-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Sparkles, ro: ["Previzualizare gratuită", "Câte variante vrei, fără cont și fără limită."], en: ["Free preview", "As many variants as you like, no account, no limit."] },
              { icon: Download, ro: ["Pachet de descărcare — 75 lei", "PNG 4K și SVG transparente, GLB, animație MP4/WebM, favicon, ghid."], en: ["Download pack — 75 lei", "4K PNG and transparent SVG, GLB, MP4/WebM animation, favicon, guide."] },
              { icon: PenTool, ro: ["Sau desenat de echipă", "Dacă vrei ceva cu adevărat propriu, serviciul e mai jos."], en: ["Or drawn by the team", "If you want something truly your own, the service is below."] },
            ].map((card, index) => (
              <div key={card.ro[0]} className="pa-glass rounded-2xl p-4">
                <card.icon className="size-5 text-pink-300" aria-hidden />
                <p className="mt-3 font-display text-sm font-bold text-foreground">{ro ? card.ro[0] : card.en[0]}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{ro ? card.ro[1] : card.en[1]}</p>
                <span className="sr-only">{index}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Seam />

      <Section id="kituri" hue={320}>
        <SectionHead
          eyebrow={ro ? "Kituri gratuite" : "Free kits"}
          title={ro ? "Simboluri, fonturi și machete, de unde să pornești" : "Symbols, fonts and mockups to start from"}
          lead={ro ? "48 de simboluri SVG editabile, perechi de fonturi cu licență OFL și machete de prezentare — gratuite pentru conturile înregistrate." : "48 editable SVG symbols, OFL-licensed font pairings and presentation mockups — free for registered accounts."}
          right={
            <Link to={itemPath(lang, kit)} className="pa-glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-foreground">
              {ro ? "Vezi kitul" : "See the kit"} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        />
        <Reveal>
          <div className="pa-edge overflow-hidden rounded-3xl border border-foreground/10" style={{ "--pa-hue": 320 } as never}>
            <DemoStage item={kit} values={defaultValues(kit)} lang={lang} eager className="h-[260px]" />
          </div>
        </Reveal>
      </Section>

      <Seam />

      <Section id="serviciu" hue={264}>
        <SectionHead
          eyebrow={ro ? "Serviciu Avyron" : "Avyron service"}
          title={ro ? "Logo desenat de echipă, nu generat" : "A logo drawn by the team, not generated"}
          lead={ro ? "Când brandul merită mai mult decât un generator: cercetăm domeniul, propunem trei direcții și livrăm pachetul complet, cu drepturi de utilizare." : "When the brand deserves more than a generator: we research the field, propose three directions and deliver the complete pack, with usage rights."}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text], index) => (
            <Reveal key={title} index={index}>
              <div className="pa-glass h-full rounded-2xl p-4">
                <span className="pa-mono text-[10px] uppercase tracking-[0.18em] text-brand">{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-2 font-display text-sm font-bold text-foreground">{title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal index={4} className="mt-4">
          <div className="pa-glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <p className="mr-auto max-w-lg text-xs leading-relaxed text-muted-foreground">
              {ro
                ? "Pagina serviciului se rafinează în etapa următoare, cu exemple și preț. Până atunci, scrie-ne și primești o estimare într-o zi lucrătoare."
                : "The service page will be refined in the next stage, with examples and pricing. Until then, write to us and get an estimate within one business day."}
            </p>
            <a
              href={`https://wa.me/40734605055?text=${encodeURIComponent(ro ? "Salut! Vreau un logo desenat de echipa Avyron." : "Hi! I'd like a logo drawn by the Avyron team.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white"
              data-ripple
            >
              {ro ? "Cere o estimare" : "Ask for an estimate"} <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </Reveal>
      </Section>

      <Seam />

      <Section id="cerere" hue={195}>
        <Reveal>
          <FeatureRequest lang={lang} />
        </Reveal>
      </Section>
    </div>
  );
}
