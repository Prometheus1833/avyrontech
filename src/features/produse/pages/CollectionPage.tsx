import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";

import type { Lang } from "@/i18n/translations";
import { COLLECTIONS } from "../data/collections";
import { ITEM_BY_SLUG } from "../data/items";
import { ACCESS_LABEL, TYPE_BY_ID } from "../data/taxonomy";
import ItemCard from "../components/ItemCard";
import { Pill, Reveal, Section, SectionHead, Seam } from "../components/Primitives";
import { collectionPath, collectionsPath, homePath, itemPath } from "../lib/paths";
import { applySeo, breadcrumb, itemListLd, metaFrom } from "../lib/seo";

/**
 * Colecțiile: pagini proprii, indexabile, pentru felul în care oamenii caută
 * de fapt — „kit landing page”, „formulare care se completează” — nu pe numele
 * componentelor. Fiecare are un paragraf care răspunde la căutare, produsele
 * în ordinea în care se montează și trimiteri către celelalte colecții.
 */

export function CollectionsIndex({ lang }: { lang: Lang }) {
  const ro = lang === "ro";
  const path = collectionsPath(lang);

  useEffect(() => {
    const title = ro ? "Colecții de componente și secțiuni — Produse Avyron" : "Component and section collections — Avyron Products";
    void applySeo({
      title,
      description: ro
        ? "Trasee scurte prin catalogul Avyron: kit de landing page, primul ecran, formulare, dovezi și încredere, unelte de livrare, integrări gratuite."
        : "Short paths through the Avyron catalogue: landing page kit, first screen, forms, proof and trust, delivery tools, free integrations.",
      path,
      lang,
      jsonLd: [
        [
          "breadcrumb",
          breadcrumb(lang, [
            { name: ro ? "Produse Avyron" : "Avyron Products", path: homePath(lang) },
            { name: ro ? "Colecții" : "Collections", path },
          ]),
        ],
      ],
    });
  }, [lang, ro, path]);

  return (
    <div className="pb-16">
      <Section id="colectii" hue={300}>
        <SectionHead
          titleAs="h1"
          eyebrow={ro ? "Colecții" : "Collections"}
          title={ro ? `${COLLECTIONS.length} trasee scurte prin catalog` : `${COLLECTIONS.length} short paths through the catalogue`}
          lead={
            ro
              ? "Fiecare colecție strânge piesele care lucrează împreună, în ordinea în care le pui în pagină. Dacă nu știi de unde să începi, începe de aici."
              : "Each collection gathers the pieces that work together, in the order you put them on the page. If you do not know where to start, start here."
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {COLLECTIONS.map((collection, index) => (
            <Reveal key={collection.id} index={index}>
              <Link to={collectionPath(lang, collection)} className="pa-edge block h-full rounded-2xl p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: `hsl(${collection.hue} 85% 62%)` }} />
                  <p className="font-display text-sm font-bold text-foreground">{collection.name[lang]}</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{collection.hint[lang]}</p>
                <p className="pa-mono mt-3 text-[11px] text-muted-foreground/80">
                  {collection.slugs.length} {ro ? "produse" : "products"}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}

export default function CollectionPage({ seg, lang }: { seg: string; lang: Lang }) {
  const ro = lang === "ro";
  const collection = useMemo(() => COLLECTIONS.find((entry) => entry.seg[lang] === seg), [seg, lang]);
  const items = useMemo(() => (collection?.slugs ?? []).map((slug) => ITEM_BY_SLUG.get(slug)).filter((item) => item !== undefined), [collection]);
  const path = collection ? collectionPath(lang, collection) : collectionsPath(lang);
  const others = useMemo(() => COLLECTIONS.filter((entry) => entry.id !== collection?.id).slice(0, 4), [collection]);

  useEffect(() => {
    if (!collection) return;
    const title = `${collection.name[lang]} — ${ro ? "Produse Avyron" : "Avyron Products"}`;
    void applySeo({
      title,
      description: metaFrom(collection.intro[lang]),
      path,
      lang,
      jsonLd: [
        ["collection", itemListLd(lang, items, title, path)],
        [
          "breadcrumb",
          breadcrumb(lang, [
            { name: ro ? "Produse Avyron" : "Avyron Products", path: homePath(lang) },
            { name: ro ? "Colecții" : "Collections", path: collectionsPath(lang) },
            { name: collection.name[lang], path },
          ]),
        ],
      ],
    });
  }, [collection, items, lang, ro, path]);

  if (!collection) {
    return (
      <div className="grid min-h-[45vh] place-items-center py-12 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{ro ? "Colecția nu există" : "That collection doesn't exist"}</h1>
          <Link to={collectionsPath(lang)} className="mt-4 inline-flex rounded-full bg-gradient-to-br from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white" data-ripple>
            {ro ? "Vezi toate colecțiile" : "See all collections"}
          </Link>
        </div>
      </div>
    );
  }

  const free = items.filter((item) => item!.access === "free").length;

  return (
    <div className="pb-16">
      <Section id="colectie" hue={collection.hue}>
        <SectionHead
          titleAs="h1"
          eyebrow={
            <Link to={collectionsPath(lang)} className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Layers className="size-3.5" aria-hidden />
              {ro ? "Colecții" : "Collections"}
            </Link>
          }
          title={collection.name[lang]}
          lead={collection.intro[lang]}
          right={
            <span className="pa-mono text-xs text-muted-foreground">
              {items.length} {ro ? "produse" : "products"} · {free} {ro ? "gratuite" : "free"}
            </span>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <Reveal key={item!.slug} index={index}>
              <ItemCard item={item!} lang={lang} headingAs="h2" />
            </Reveal>
          ))}
        </div>
      </Section>

      <Seam />

      <Section id="ordine" hue={collection.hue}>
        <SectionHead
          eyebrow={ro ? "Ordinea de montare" : "Assembly order"}
          title={ro ? "În ce ordine le pui în pagină" : "The order to put them on the page"}
        />
        <ol className="grid list-none gap-2 p-0">
          {items.map((item, index) => {
            const type = TYPE_BY_ID.get(item!.type)!;
            return (
              <li key={item!.slug}>
                <Link to={itemPath(lang, item!)} className="pa-edge flex items-center gap-3 rounded-2xl px-3.5 py-3 transition hover:-translate-y-0.5">
                  <span className="pa-mono w-5 text-center text-[11px] text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item!.name[lang]}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">{item!.short[lang]}</span>
                  </span>
                  <Pill tone={item!.access === "free" ? "free" : item!.access === "pro" ? "pro" : "studio"}>{ACCESS_LABEL[item!.access][lang]}</Pill>
                  <span className="pa-mono hidden text-[11px] text-muted-foreground sm:inline">{type.name[lang]}</span>
                  <ArrowRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ol>
      </Section>

      <Seam />

      <Section id="alte-colectii" hue={collection.hue}>
        <SectionHead eyebrow={ro ? "Mai departe" : "Next"} title={ro ? "Alte trasee" : "Other paths"} />
        <div className="grid gap-3 sm:grid-cols-2">
          {others.map((entry, index) => (
            <Reveal key={entry.id} index={index}>
              <Link to={collectionPath(lang, entry)} className="pa-glass block rounded-2xl p-4 transition hover:-translate-y-0.5">
                <p className="font-display text-sm font-bold text-foreground">{entry.name[lang]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{entry.hint[lang]}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}
