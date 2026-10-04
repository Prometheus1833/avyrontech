import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Blocks,
  Boxes,
  Code2,
  Gauge,
  Layers3,
  ShieldCheck,
  Sparkles,
  Wrench,
  Workflow,
} from "lucide-react";
import logo from "@/assets/avyron-logo.webp";
import { setJsonLd, setPageMeta } from "@/lib/seo";
import ProductLocaleSwitcher from "../components/ProductLocaleSwitcher";
import DemoStage from "../components/DemoStage";
import { INTERNATIONAL_HUB_COPY, type InternationalProductLocale } from "../data/internationalCopy";
import { ITEM_BY_SLUG, ITEMS } from "../data/items";
import {
  PRODUCT_HUB_LOCALES,
  PRODUCT_HUB_PATHS,
  productHubAlternates,
} from "../data/productLocales";
import type { CatalogItem } from "../data/types";
import { defaultValues } from "../lib/item";
import { itemPath } from "../lib/paths";
import { STATS } from "../lib/seo";
import { detectTier } from "../lib/capability";
import "../produse.css";

const Backdrop = lazy(() => import("../components/Backdrop"));

const FEATURED_SLUGS = [
  "logo-studio-3d",
  "hero-spatial-particule",
  "template-landing-saas",
  "calculator-cost-proiect",
  "generator-json-ld",
  "api-open-meteo",
] as const;

const FEATURED_ITEMS = FEATURED_SLUGS
  .map((slug) => ITEM_BY_SLUG.get(slug))
  .filter((item): item is CatalogItem => Boolean(item));

const CATEGORY_ICONS = [Blocks, Layers3, Boxes, Sparkles, Wrench, Workflow] as const;
const PRINCIPLE_ICONS = [Gauge, ShieldCheck, Code2] as const;

export default function InternationalHome({ lang }: { lang: InternationalProductLocale }) {
  const copy = INTERNATIONAL_HUB_COPY[lang];
  const locale = PRODUCT_HUB_LOCALES.find((entry) => entry.code === lang)!;
  const [tier] = useState(() => detectTier());
  const structuredItems = useMemo(
    () => FEATURED_ITEMS.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: copy.cards[item.slug].name,
      url: `https://avyron.ro${itemPath("en", item)}`,
    })),
    [copy],
  );

  useEffect(() => {
    setPageMeta({
      title: copy.metaTitle,
      description: copy.metaDescription,
      path: PRODUCT_HUB_PATHS[lang],
      alternates: productHubAlternates(),
      locale: locale.ogLocale,
      image: "/og/produse/logo-studio-3d-en.jpg",
      imageAlt: copy.title,
    });
    setJsonLd("produse-international-hub", {
      "@type": "CollectionPage",
      "@id": `https://avyron.ro${PRODUCT_HUB_PATHS[lang]}#collection`,
      name: copy.metaTitle,
      description: copy.metaDescription,
      url: `https://avyron.ro${PRODUCT_HUB_PATHS[lang]}`,
      inLanguage: locale.htmlLang,
      isPartOf: { "@id": "https://avyron.ro/#website" },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: ITEMS.length,
        itemListElement: structuredItems,
      },
    });
    // LanguageProvider intentionally remains RO/EN for the rest of the site.
    // Re-assert this route's real language after its global effect has flushed.
    const htmlLanguageTimer = window.setTimeout(() => {
      document.documentElement.lang = locale.htmlLang;
    }, 0);
    return () => window.clearTimeout(htmlLanguageTimer);
  }, [copy, lang, locale, structuredItems]);

  return (
    <div className="dark pa-root pa-international min-h-screen overflow-x-clip bg-background text-foreground">
      {tier !== "none" ? (
        <Suspense fallback={null}>
          <Backdrop tier={tier} />
        </Suspense>
      ) : (
        <div className="pa-international-fallback" aria-hidden />
      )}

      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-3 flex max-w-7xl items-center gap-2 px-3 sm:px-5">
          <div className="pa-glass flex min-w-0 flex-1 items-center gap-2 rounded-full p-2 pl-3 shadow-2xl">
            <Link to="/" className="flex shrink-0 items-center gap-2" aria-label={copy.backHome}>
              <img src={logo} alt="" width={24} height={24} className="size-6 rounded-md object-cover" />
              <span className="hidden text-sm font-extrabold tracking-[0.18em] sm:inline">AVYRON</span>
            </Link>
            <span className="hidden h-5 w-px bg-foreground/10 sm:block" aria-hidden />
            <span className="pa-mono hidden text-[9px] uppercase tracking-[0.18em] text-muted-foreground md:inline">Products Europe</span>
            <div className="ml-auto min-w-0">
              <ProductLocaleSwitcher active={lang} label={copy.languageLabel} compact />
            </div>
            <Link
              to="/en/products"
              className="hidden shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:-translate-y-0.5 lg:inline-flex"
            >
              {copy.openCatalog}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <section className="grid min-h-[min(760px,86vh)] items-center gap-10 py-12 lg:grid-cols-[1.1fr_.9fr] lg:py-16" aria-labelledby="international-products-title">
          <div className="relative z-10">
            <p className="pa-mono text-[10px] font-bold uppercase tracking-[0.28em] text-brand sm:text-xs">{copy.eyebrow}</p>
            <h1 id="international-products-title" className="mt-5 max-w-4xl font-display text-4xl font-black leading-[.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              {copy.title}{" "}
              <span className="pa-text-grad">{copy.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">{copy.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#selection" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-brand to-brand-2 px-5 py-3 text-sm font-bold text-white shadow-[0_18px_60px_-24px_hsl(var(--brand)/.9)] transition hover:-translate-y-0.5" data-ripple>
                {copy.primaryCta}<ArrowRight className="size-4" aria-hidden />
              </a>
              <Link to="/en/products" className="pa-glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5">
                {copy.secondaryCta}
              </Link>
            </div>

            <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 sm:grid-cols-4">
              {[
                [STATS.total, copy.stats[0]],
                [STATS.free, copy.stats[1]],
                [STATS.effects, copy.stats[2]],
                [STATS.apis, copy.stats[3]],
              ].map(([value, label]) => (
                <div key={label} className="bg-background/75 px-4 py-4 backdrop-blur-xl">
                  <dd className="font-display text-2xl font-black tabular-nums">{value}</dd>
                  <dt className="mt-1 text-[10px] uppercase tracking-[0.13em] text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden>
            <div className="pa-europe-orbit absolute inset-[8%]">
              <div className="pa-europe-core">
                <span>AVY</span>
                <small>PRODUCTS</small>
              </div>
              <span className="pa-europe-ring pa-europe-ring-a" />
              <span className="pa-europe-ring pa-europe-ring-b" />
              {PRODUCT_HUB_LOCALES.map((entry, index) => (
                <span
                  key={entry.code}
                  className={`pa-europe-node ${entry.code === lang ? "is-active" : ""}`}
                  style={{ "--node-index": index } as CSSProperties}
                >
                  {entry.code.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="pa-seam" data-in="1" aria-hidden />

        <section className="py-20 sm:py-28" aria-labelledby="product-directions-title">
          <div className="max-w-3xl">
            <p className="pa-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brand">{copy.catalogueEyebrow}</p>
            <h2 id="product-directions-title" className="mt-4 font-display text-3xl font-black leading-tight tracking-tight sm:text-5xl">{copy.catalogueTitle}</h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">{copy.catalogueBody}</p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {copy.categories.map((category, index) => {
              const Icon = CATEGORY_ICONS[index];
              return (
                <article key={category.label} className="pa-glass pa-edge group rounded-3xl p-5 transition duration-500 hover:-translate-y-1 hover:border-brand/30">
                  <div className="grid size-10 place-items-center rounded-2xl bg-brand/12 text-brand transition group-hover:scale-110 group-hover:bg-brand/18">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold">{category.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="selection" className="scroll-mt-24 py-20 sm:py-28" aria-labelledby="curated-products-title">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="pa-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brand">{copy.showcaseEyebrow}</p>
              <h2 id="curated-products-title" className="mt-4 font-display text-3xl font-black leading-tight tracking-tight sm:text-5xl">{copy.showcaseTitle}</h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">{copy.showcaseBody}</p>
            </div>
            <Link to="/en/products" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-brand hover:text-foreground">
              {copy.openCatalog}<ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {FEATURED_ITEMS.map((item) => {
              const card = copy.cards[item.slug];
              return (
                <article key={item.slug} className="pa-edge group overflow-hidden rounded-[1.75rem] border border-foreground/10 bg-card/60 shadow-[0_30px_80px_-55px_#000] transition duration-500 hover:-translate-y-1 hover:border-brand/30">
                  <DemoStage item={item} values={defaultValues(item)} lang="en" className="aspect-[16/10] w-full border-b border-foreground/10" />
                  <div className="p-5">
                    <p className="pa-mono text-[10px] uppercase tracking-[0.18em] text-brand">{card.category}</p>
                    <h3 className="mt-2 font-display text-xl font-bold">{card.name}</h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{card.summary}</p>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-foreground/8 pt-4">
                      <span className="text-[10px] leading-4 text-muted-foreground">{copy.englishDetails}</span>
                      <Link to={itemPath("en", item)} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-foreground transition group-hover:text-brand">
                        {copy.viewProduct}<ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="py-20 sm:py-28" aria-labelledby="product-principles-title">
          <div className="pa-glass pa-edge overflow-hidden rounded-[2rem] p-6 sm:p-10 lg:p-14">
            <div className="max-w-3xl">
              <p className="pa-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brand">{copy.principlesEyebrow}</p>
              <h2 id="product-principles-title" className="mt-4 font-display text-3xl font-black leading-tight tracking-tight sm:text-5xl">{copy.principlesTitle}</h2>
            </div>
            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              {copy.principles.map((principle, index) => {
                const Icon = PRINCIPLE_ICONS[index];
                return (
                  <article key={principle.title} className="border-l border-foreground/10 pl-5">
                    <Icon className="size-5 text-brand" aria-hidden />
                    <h3 className="mt-4 font-display text-lg font-bold">{principle.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{principle.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 text-center sm:py-28" aria-labelledby="international-products-cta">
          <p className="pa-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brand">AVYRON · EUROPE</p>
          <h2 id="international-products-cta" className="mx-auto mt-4 max-w-3xl font-display text-3xl font-black leading-tight tracking-tight sm:text-5xl">{copy.finalTitle}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{copy.finalBody}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/en?request=products#cta" className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background transition hover:-translate-y-0.5">
              {copy.finalCta}<ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link to="/en/products" className="pa-glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold">
              {copy.openCatalog}
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-foreground/8 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-center text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} AVYRON · {copy.footerNote}</p>
          <div className="flex flex-wrap justify-center gap-4 sm:justify-end">
            <Link to="/en/products">{copy.openCatalog}</Link>
            <Link to="/en#cta">{copy.partnerships}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
