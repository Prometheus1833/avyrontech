import { usePricedLogoItem } from "../lib/useLogoPrice";
import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ShoppingCart, Sparkles } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { ACCESS_LABEL, CATEGORIES, TECH_LABEL, TYPE_BY_ID } from "../data/taxonomy";
import type { CatalogItem } from "../data/types";
import { priceLabel } from "../lib/item";
import { itemPath } from "../lib/paths";
import { store } from "../lib/store";
import ProductPoster from "./ProductPoster";
import { Pill } from "./Primitives";

/**
 * Cardul de produs: ilustrație statică,
 * acțiune rapidă pentru coș și un titlu care duce în pagina produsului.
 * Grila e construită pentru conversie: accesul și prețul se văd din primul rând.
 */
const ItemCard = memo(function ItemCard({
  item:sourceItem,
  lang,
  index = 0,
  /**
   * Nivelul titlului din card. Implicit h3, pentru că grila stă de obicei sub
   * un h2 de secțiune; pe paginile unde grila urmează direct titlul h1
   * (colecțiile), se trece pe h2 ca nivelurile să nu sară.
   */
  headingAs: Heading = "h3",
}: {
  item: CatalogItem;
  lang: Lang;
  index?: number;
  headingAs?: "h2" | "h3";
}) {
  const item=usePricedLogoItem(sourceItem);
  const ro = lang === "ro";
  const type = TYPE_BY_ID.get(item.type)!;
  const price = priceLabel(item, lang);
  return (
    <article
      className="pa-edge group relative flex flex-col overflow-hidden rounded-2xl border border-foreground/8 bg-card/50 transition-all duration-500 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_24px_60px_-40px_hsl(var(--pa-hue)_90%_50%)]"
      style={{ "--pa-hue": item.hue } as never}
    >
      <div className="pa-card-media relative border-b border-foreground/8">
        <ProductPoster item={item} eager={index < 3} />
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-wrap gap-1">
          {item.status === "new" && <Pill tone="new">{ro ? "Nou" : "New"}</Pill>}
          {item.status === "popular" && <Pill tone="new">{ro ? "Popular" : "Popular"}</Pill>}
          {item.access === "free" ? (
            <Pill tone="free">{ACCESS_LABEL.free[lang]}</Pill>
          ) : (
            <Pill tone={item.access === "studio" ? "studio" : "pro"}>{ACCESS_LABEL[item.access][lang]}</Pill>
          )}
          {price && <Pill tone="price">{price}</Pill>}
        </div>
        <div className="absolute right-2.5 top-2.5 z-10 flex gap-1.5">

          {item.priceRon && (
            <button
              type="button"
              onClick={() => store.addToCart({ kind: "item", slug: item.slug }, item.name[lang])}
              aria-label={ro ? "Adaugă în coș" : "Add to cart"}
              className="grid size-8 place-items-center rounded-full border border-white/15 bg-black/45 text-white/80 backdrop-blur transition hover:text-white"
            >
              <ShoppingCart className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="pa-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {type.name[lang]} · {CATEGORIES[item.category]?.[lang] ?? item.category}
        </p>
        <Heading className="mt-1.5 font-display text-[15px] font-bold leading-snug text-foreground">
          <Link to={itemPath(lang, item)} className="outline-none transition-colors hover:text-brand focus-visible:text-brand">
            <span className="absolute inset-0" aria-hidden />
            {item.name[lang]}
          </Link>
        </Heading>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.short[lang]}</p>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <span className="pa-mono text-[10px] text-muted-foreground/70">{item.tech.slice(0, 2).map((t) => TECH_LABEL[t]).join(" · ")}</span>
          <span className="pa-mono ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground/60" title={ro ? "Greutate estimată" : "Estimated weight"}>
            {item.gpu && <Sparkles className="size-3 text-brand/70" aria-hidden />}
            {item.weightKb > 0 ? `${item.weightKb} kB` : "—"}
          </span>
          <ArrowUpRight className="size-3.5 text-muted-foreground/50 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
        </div>
      </div>
    </article>
  );
});

export default ItemCard;
