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
    ro: ["Componente React animate, gata de copiat", "Butoane, carduri, text animat, notificări și cursoare — piese mici care schimbă felul în care se simte un site."],
    en: ["Animated React components, ready to copy", "Buttons, cards, animated text, toasts and cursors — small pieces that change how a site feels."],
  },
  section: {
    ro: ["Secțiuni întregi, puse la punct", "Hero-uri, pagini de login, prețuri, FAQ, subsoluri și loading screens, construite să se lege între ele."],
    en: ["Whole sections, already figured out", "Heroes, login pages, pricing, FAQ, footers and loading screens, built to fit together."],
  },
  template: {
    ro: ["Template-uri complete, cu SEO inclus", "Structuri care convertesc, cu meta tag-uri, date structurate și un buget de performanță respectat."],
    en: ["Complete templates, SEO included", "Structures that convert, with meta tags, structured data and a performance budget that holds."],
  },
  effect: {
    ro: ["Efecte 3D și shadere pentru web", "Particule, aurora, globuri și displacement — cu trepte de calitate și fallback static, nu doar capturi frumoase."],
    en: ["3D effects and shaders for the web", "Particles, aurora, globes and displacement — with quality tiers and a static fallback, not just pretty captures."],
  },
  tool: {
    ro: ["Unelte care scurtează livrarea", "Import CSV, generatoare de schema și meta, verificator de contrast, cod QR — toate rulează local, în browser."],
    en: ["Tools that shorten delivery", "CSV import, schema and meta generators, contrast checker, QR codes — all running locally in the browser."],
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
