import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Copy, Gauge, Heart, Info, Lock, MessageCircle, Pause, Play, RotateCcw, Settings2, ShoppingCart, Sparkles } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { ITEMS } from "../data/items";
import { COLLECTIONS } from "../data/collections";
import { ACCESS_LABEL, CATEGORIES, TECH_LABEL, TYPE_BY_ID } from "../data/taxonomy";
import type { CatalogItem, PropValues } from "../data/types";
import DemoStage from "../components/DemoStage";
import EditorPanel from "../components/EditorPanel";
import GetModal from "../components/GetModal";
import { Pill, Reveal, Seam, Section, SectionHead } from "../components/Primitives";
import { defaultValues, priceLabel, progressionNote } from "../lib/item";
import { collectionPath, guidePath, homePath, itemPath, typePath } from "../lib/paths";
import { applySeo, breadcrumb, productLd, productOgImage } from "../lib/seo";
import { hasSource } from "../lib/source";
import { store, useProduseStore } from "../lib/store";

/**
 * Pagina unui produs: preview mare cu Editor Mode, ce primești, referința de
 * props, compatibilitate și produse înrudite. Butonul principal deschide
 * modalul de instalare; pentru produsele plătite, tot drumul spre coș.
 */
export default function ItemPage({ item, lang }: { item: CatalogItem; lang: Lang }) {
  const ro = lang === "ro";
  const [values, setValues] = useState<PropValues>(() => defaultValues(item));
  const [showEditor, setShowEditor] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [getOpen, setGetOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const favorites = useProduseStore((s) => s.favorites);
  const isFav = favorites.includes(item.slug);
  const type = TYPE_BY_ID.get(item.type)!;
  const price = priceLabel(item, lang);
  const note = progressionNote(item, lang);

  useEffect(() => {
    setValues(defaultValues(item));
    setResetKey((k) => k + 1);
  }, [item]);

  useEffect(() => {
    const title = ro
      ? `${item.name.ro} — ${type.name.ro} React pentru site-uri | Avyron`
      : `${item.name.en} — React ${type.name.en.toLowerCase()} for websites | Avyron`;
    void applySeo({
      title,
      description: item.short[lang],
      path: itemPath(lang, item),
      lang,
      image: productOgImage(lang, item),
      imageAlt: `${item.name[lang]} — Produse Avyron`,
      jsonLd: [
        ["product", productLd(lang, item)],
        [
          "breadcrumb",
          breadcrumb(lang, [
            { name: ro ? "Produse Avyron" : "Avyron Products", path: homePath(lang) },
            { name: type.plural[lang], path: typePath(lang, item.type) },
            { name: item.name[lang], path: itemPath(lang, item) },
          ]),
        ],
      ],
    });
  }, [item, lang, ro, type]);

  // Colecțiile care conțin produsul: legături interne reale, nu „produse
  // similare” generate din categorie.
  const inCollections = useMemo(() => COLLECTIONS.filter((collection) => collection.slugs.includes(item.slug)), [item.slug]);

  const related = useMemo(
    () => ITEMS.filter((other) => other.slug !== item.slug && (other.category === item.category || other.type === item.type)).slice(0, 3),
    [item],
  );

  return (
    <div className="pb-16" style={{ "--pa-hue": item.hue } as never}>
      <Section id="produs" hue={item.hue}>
        <Reveal>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link to={typePath(lang, item.type)} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
              <ArrowLeft className="size-3.5" aria-hidden /> {type.plural[lang]}
            </Link>
            <span aria-hidden>·</span>
            <span>{CATEGORIES[item.category]?.[lang] ?? item.category}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">{item.name[lang]}</h1>
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{item.short[lang]}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.access === "free" ? <Pill tone="free">{ACCESS_LABEL.free[lang]}</Pill> : <Pill tone={item.access === "studio" ? "studio" : "pro"}>{ACCESS_LABEL[item.access][lang]}</Pill>}
                {price && <Pill tone="price">{price}</Pill>}
                {item.status === "new" && <Pill tone="new">{ro ? "Nou" : "New"}</Pill>}
                {item.tech.map((tech) => (
                  <Pill key={tech}>{TECH_LABEL[tech]}</Pill>
                ))}
                {item.weightKb > 0 && (
                  <Pill title={ro ? "Greutate estimată în bundle" : "Estimated bundle weight"}>
                    <Gauge className="size-3" aria-hidden /> {item.weightKb} kB
                  </Pill>
                )}
                {item.gpu && (
                  <Pill title={ro ? "Are nevoie de WebGL2; cade pe poster static fără el" : "Needs WebGL2; falls back to a static poster"}>
                    <Sparkles className="size-3" aria-hidden /> GPU
                  </Pill>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setGetOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-brand-2 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_40px_-20px_hsl(var(--pa-hue)_90%_55%)]"
                data-ripple
              >
                {item.access === "free" ? <Copy className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                {ro ? "Obține produsul" : "Get the product"}
              </button>
              {item.priceRon && (
                <button
                  type="button"
                  onClick={() => store.addToCart({ kind: "item", slug: item.slug })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-4 py-2.5 text-sm font-semibold text-foreground"
                  data-ripple
                >
                  <ShoppingCart className="size-4" aria-hidden /> {ro ? "Adaugă în coș" : "Add to cart"}
                </button>
              )}
              <button
                type="button"
                onClick={() => store.toggleFavorite(item.slug)}
                aria-pressed={isFav}
                className="grid size-10 place-items-center rounded-full border border-foreground/15 text-muted-foreground transition hover:text-foreground"
                aria-label={ro ? "Salvează în colecție" : "Save to collection"}
              >
                <Heart className={`size-4 ${isFav ? "fill-current text-pink-300" : ""}`} aria-hidden />
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal index={1} className="mt-5">
          <div className="pa-edge overflow-hidden rounded-3xl border border-foreground/10 bg-black/20">
            <DemoStage
              key={resetKey}
              item={item}
              values={values}
              lang={lang}
              eager
              paused={!playing}
              className="h-[300px] sm:h-[420px]"
              posterNote={ro ? "Previzualizarea pornește pe dispozitive care acceptă animații." : "The preview starts on devices that allow animation."}
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-foreground/10 bg-foreground/[0.03] px-3 py-2.5">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] text-muted-foreground transition hover:text-foreground"
              >
                {playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                {playing ? (ro ? "Pauză" : "Pause") : ro ? "Redă" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setValues(defaultValues(item));
                  setResetKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] text-muted-foreground transition hover:text-foreground"
              >
                <RotateCcw className="size-3.5" aria-hidden /> {ro ? "Resetează" : "Reset"}
              </button>
              {item.props?.length ? (
                <button
                  type="button"
                  onClick={() => setShowEditor((v) => !v)}
                  aria-expanded={showEditor}
                  className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold transition ${showEditor ? "bg-brand/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Settings2 className="size-3.5" aria-hidden /> Editor Mode
                </button>
              ) : null}
            </div>
            {showEditor && item.props?.length ? (
              <div className="border-t border-foreground/10 p-4">
                <EditorPanel item={item} values={values} onChange={setValues} lang={lang} />
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {ro ? "Setările se duc în codul copiat și în promptul pentru asistentul AI." : "These settings travel into the copied code and the AI prompt."}
                </p>
              </div>
            ) : null}
          </div>
        </Reveal>

        {note && (
          <Reveal index={2} className="mt-3">
            <p className="inline-flex items-start gap-2 rounded-2xl border border-brand/20 bg-brand/[0.06] px-3.5 py-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
              {note}
            </p>
          </Reveal>
        )}
      </Section>

      <Seam />

      <Section id="detalii" hue={item.hue}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Reveal>
            <h2 className="font-display text-xl font-bold text-foreground">{ro ? "Ce este și pentru ce îl folosești" : "What it is and what you use it for"}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc[lang]}</p>

            <h3 className="mt-6 font-display text-base font-bold text-foreground">{ro ? "Caracteristici" : "Key features"}</h3>
            <ul className="mt-2 grid list-none gap-1.5 p-0 text-sm text-muted-foreground">
              {item.features[lang].map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                  {feature}
                </li>
              ))}
            </ul>

            {item.props?.length ? (
              <>
                <h3 className="mt-6 font-display text-base font-bold text-foreground">{ro ? "Referință de props" : "Props reference"}</h3>
                <div className="mt-2 overflow-x-auto rounded-2xl border border-foreground/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-foreground/[0.04] text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-semibold">{ro ? "Prop" : "Prop"}</th>
                        <th className="px-3 py-2 font-semibold">{ro ? "Tip" : "Type"}</th>
                        <th className="px-3 py-2 font-semibold">{ro ? "Implicit" : "Default"}</th>
                        <th className="px-3 py-2 font-semibold">{ro ? "Ce face" : "What it does"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.props.map((prop) => (
                        <tr key={prop.key} className="border-t border-foreground/8">
                          <td className="pa-mono px-3 py-2 text-foreground">{prop.key}</td>
                          <td className="px-3 py-2 text-muted-foreground">{prop.type}</td>
                          <td className="pa-mono px-3 py-2 text-muted-foreground">{String(prop.default)}</td>
                          <td className="px-3 py-2 text-muted-foreground">{prop.label[lang]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </Reveal>

          <Reveal index={1}>
            <div className="pa-glass rounded-2xl p-4">
              <p className="pa-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{ro ? "Ce primești" : "What you get"}</p>
              <ul className="mt-2 grid list-none gap-1.5 p-0 text-[13px] text-muted-foreground">
                <li>• {ro ? "Fișier TypeScript comentat, fără cod obfuscat" : "A commented TypeScript file, no obfuscated code"}</li>
                <li>• {hasSource(item.slug) ? (ro ? "Sursa vizibilă direct în pagină" : "Source visible right on the page") : ro ? "Sursa, după deblocare" : "The source, once unlocked"}</li>
                <li>• {ro ? "Comandă CLI, prompt AI și configurare MCP" : "CLI command, AI prompt and MCP setup"}</li>
                <li>• {ro ? "Licență pentru proiecte proprii și de client" : "Licence for your own and client projects"}</li>
                <li>• {ro ? "Actualizări incluse" : "Updates included"}</li>
              </ul>
              <dl className="mt-4 grid gap-1.5 border-t border-foreground/10 pt-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{ro ? "Dependențe" : "Dependencies"}</dt>
                  <dd className="pa-mono text-right text-foreground">{(item.deps ?? ["react"]).join(", ")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{ro ? "Mișcare redusă" : "Reduced motion"}</dt>
                  <dd className="text-right text-foreground">{ro ? "respectată" : "respected"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{ro ? "Mobil" : "Mobile"}</dt>
                  <dd className="text-right text-foreground">{item.gpu ? (ro ? "cu fallback" : "with fallback") : "OK"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{ro ? "În catalog din" : "In the catalogue since"}</dt>
                  <dd className="pa-mono text-right text-foreground">{item.released}</dd>
                </div>
              </dl>
              <a
                href={`https://wa.me/40734605055?text=${encodeURIComponent(ro ? `Salut! Vreau ajutor cu „${item.name.ro}”.` : `Hi! I'd like help with “${item.name.en}”.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground"
                data-ripple
              >
                <MessageCircle className="size-3.5" aria-hidden /> {ro ? "Vrei să-l integrăm noi?" : "Want us to integrate it?"}
              </a>
              <Link to={guidePath(lang, "licente")} className="mt-2 block text-center text-[11px] text-muted-foreground underline underline-offset-4">
                {ro ? "Licențe și utilizare" : "Licence and use"}
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>

      {inCollections.length > 0 && (
        <>
          <Seam />
          <Section id="colectii" hue={item.hue}>
            <SectionHead
              eyebrow={ro ? "Face parte din" : "Part of"}
              title={ro ? "Colecțiile în care apare" : "The collections it appears in"}
              lead={
                ro
                  ? "Fiecare colecție e un traseu gata gândit: piesele din ea se montează în ordine și se potrivesc între ele."
                  : "Each collection is a ready-made path: its pieces assemble in order and fit one another."
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {inCollections.map((collection, index) => (
                <Reveal key={collection.id} index={index}>
                  <Link to={collectionPath(lang, collection)} className="pa-edge flex h-full flex-col rounded-2xl p-4 transition hover:-translate-y-0.5">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 rounded-full" style={{ background: `hsl(${collection.hue} 85% 62%)` }} />
                      <p className="font-display text-sm font-bold text-foreground">{collection.name[lang]}</p>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{collection.hint[lang]}</p>
                    <span className="pa-mono mt-3 text-[11px] text-muted-foreground/75">
                      {collection.slugs.length} {ro ? "produse" : "products"}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Section>
        </>
      )}

      {related.length > 0 && (
        <>
          <Seam />
          <Section id="inrudite" hue={item.hue}>
            <SectionHead eyebrow={ro ? "Merg bine împreună" : "They work well together"} title={ro ? "Produse înrudite" : "Related products"} />
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-3">
              {related.map((other, index) => (
                <Reveal as="li" key={other.slug} index={index}>
                  <Link to={itemPath(lang, other)} className="pa-glass flex h-full flex-col rounded-2xl p-4 transition hover:-translate-y-0.5">
                    <p className="font-display text-sm font-bold text-foreground">{other.name[lang]}</p>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{other.short[lang]}</p>
                    <ArrowRight className="mt-3 size-4 text-muted-foreground/60" aria-hidden />
                  </Link>
                </Reveal>
              ))}
            </ul>
          </Section>
        </>
      )}

      <GetModal item={item} values={values} lang={lang} open={getOpen} onClose={() => setGetOpen(false)} />
    </div>
  );
}
