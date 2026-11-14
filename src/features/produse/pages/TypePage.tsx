import { useEffect, useMemo } from "react";
import type { Lang } from "@/i18n/translations";
import { ITEMS } from "../data/items";
import { TYPE_BY_ID } from "../data/taxonomy";
import type { ItemType } from "../data/types";
import Catalog from "../components/Catalog";
import { Reveal, Section, SectionHead } from "../components/Primitives";
import { homePath, typePath } from "../lib/paths";
import { applySeo, breadcrumb, itemListLd } from "../lib/seo";

/**
 * Pagina unui tip de produs. Are URL propriu și titlu unic pentru fiecare tip,
 * ca fiecare categorie să poată fi găsită separat în Google.
 */

const COPY: Record<ItemType, { ro: [string, string]; en: [string, string] }> = {
  component: {
    ro: ["Componente UI React pentru site-uri", "Încearcă butoane, carduri interactive, text animat și notificări. Consultă dependențele, opțiunile și dacă ai nevoie de WebGL înainte de integrare."],
    en: ["React UI components for websites", "Try buttons, interactive cards, animated text and notifications. Check dependencies, options and WebGL requirements before integrating a component."],
  },
  section: {
    ro: ["Secțiuni întregi, puse la punct", "Hero-uri, pagini de login, prețuri, FAQ, subsoluri și loading screens, construite să se lege între ele."],
    en: ["Whole sections, already figured out", "Heroes, login pages, pricing, FAQ, footers and loading screens, built to fit together."],
  },
  template: {
    ro: ["Template-uri web React pentru SaaS, agenții și portofolii", "Compară șabloane pentru pagini de lansare, portofolii 3D și magazine mici. Verifică structura și tehnologiile înainte să alegi ce adaptezi."],
    en: ["React website templates for SaaS, agencies and portfolios", "Compare templates for launch pages, 3D portfolios and small shops. Check the page structure and technologies before choosing what to adapt."],
  },
  effect: {
    ro: ["Efecte 3D și shadere Three.js pentru web", "Explorează particule 3D, globuri interactive și efecte de deformare a imaginilor. Compară cerințele WebGL și variantele de afișare pe mobil."],
    en: ["Three.js 3D effects and shaders for the web", "Explore 3D particles, interactive globes and image displacement. Compare WebGL requirements and mobile display options."],
  },
  tool: {
    ro: ["Instrumente online pentru dezvoltare web", "Creează un favicon, convertește imagini în WebP, generează date structurate JSON-LD sau verifică contrastul direct în browser."],
    en: ["Online web development tools", "Create a favicon, convert images to WebP, generate JSON-LD structured data or check contrast directly in your browser."],
  },
  api: {
    ro: ["Integrări API gratuite și sigure", "ANAF pentru firme, curs BNR, Open-Meteo, OpenStreetMap și conversii valutare, cu worker, cache și limitare."],
    en: ["Free, safe API integrations", "Romanian company lookup, national bank rates, Open-Meteo, OpenStreetMap and currency conversion, with worker, cache and throttling."],
  },
  doc: {
    ro: ["Documente și checklisturi de lucru", "Listele pe care le folosim înainte de fiecare lansare, plus ghidurile tehnice scrise din proiecte reale."],
    en: ["Working documents and checklists", "The lists we use before every launch, plus technical guides written from real projects."],
  },
  logo: {
    ro: ["Logo: generator 3D și kituri", "Generatorul de logo 3D, kiturile gratuite de simboluri și serviciul de logo desenat de echipa Avyron."],
    en: ["Logo: 3D generator and kits", "The 3D logo generator, the free symbol kits and the logo service drawn by the Avyron team."],
  },
};

export default function TypePage({ type, lang }: { type: ItemType; lang: Lang }) {
  const ro = lang === "ro";
  const meta = TYPE_BY_ID.get(type)!;
  const copy = COPY[type];
  const items = useMemo(() => ITEMS.filter((item) => item.type === type), [type]);
  const path = typePath(lang, type);

  useEffect(() => {
    const title = ro ? `${copy.ro[0]} — Produse Avyron` : `${copy.en[0]} — Avyron Products`;
    void applySeo({
      title,
      description: ro ? `${items.length} ${meta.plural.ro.toLowerCase()}: ${copy.ro[1]}` : `${items.length} ${meta.plural.en.toLowerCase()}: ${copy.en[1]}`,
      path,
      lang,
      jsonLd: [
        ["collection", itemListLd(lang, items, title, path)],
        [
          "breadcrumb",
          breadcrumb(lang, [
            { name: ro ? "Produse Avyron" : "Avyron Products", path: homePath(lang) },
            { name: meta.plural[lang], path },
          ]),
        ],
      ],
    });
  }, [type, lang, ro, items, meta, copy, path]);

  return (
    <div className="pb-16">
      <Section id="lista" hue={meta.hue}>
        <SectionHead
          titleAs="h1"
          eyebrow={meta.plural[lang]}
          title={ro ? copy.ro[0] : copy.en[0]}
          lead={ro ? copy.ro[1] : copy.en[1]}
          right={<span className="pa-mono text-xs text-muted-foreground">{ro ? `${items.length} produse` : `${items.length} products`}</span>}
        />
        <Reveal>
          <Catalog lang={lang} activeType={type} />
        </Reveal>
      </Section>
    </div>
  );
}
