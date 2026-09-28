import type { Lang } from "@/i18n/translations";
import { EUR_FOR_RON } from "../data/taxonomy";
import { PROGRESSION } from "../data/plans";
import type { CatalogItem, PropValues } from "../data/types";

/** Valorile implicite ale Editor Mode pentru un produs. */
export function defaultValues(item: CatalogItem): PropValues {
  const out: PropValues = {};
  for (const prop of item.props ?? []) out[prop.key] = prop.default;
  return out;
}

/** „30 lei · 6 €” — prețul unei cumpărări separate. */
export function priceLabel(item: CatalogItem, lang: Lang): string | null {
  if (!item.priceRon) return null;
  const eur = EUR_FOR_RON[item.priceRon];
  return lang === "ro" ? `${item.priceRon} lei · ${eur} €` : `${item.priceRon} lei · €${eur}`;
}

/** Ce plan deblochează produsul azi, ținând cont de progresia automată. */
export function accessNow(item: CatalogItem, today = new Date()): "free" | "pro" | "studio" {
  const days = (today.getTime() - new Date(item.released).getTime()) / 86400000;
  if (item.access === "free") return "free";
  if (item.access === "studio") return days >= PROGRESSION.proAfterDays ? "pro" : "studio";
  return days >= PROGRESSION.freeAfterDays ? "free" : "pro";
}

/** Textul care explică, pe pagina produsului, când coboară în planul următor. */
export function progressionNote(item: CatalogItem, lang: Lang, today = new Date()): string | null {
  if (item.access === "free") return null;
  const days = Math.max(0, Math.round(PROGRESSION.proAfterDays - (today.getTime() - new Date(item.released).getTime()) / 86400000));
  if (item.access === "studio" && days > 0) {
    return lang === "ro"
      ? `Intră automat în Pro în ${days} de zile. Partenerii Studio îl au de azi.`
      : `Moves into Pro automatically in ${days} days. Studio partners have it today.`;
  }
  return lang === "ro"
    ? "Inclus în Pro și Studio. Produsele de bază coboară în Free după un an."
    : "Included in Pro and Studio. Foundation products move to Free after a year.";
}

/** Sortările disponibile în grilă. */
export type Sort = "relevance" | "new" | "popular" | "light" | "price";

export function sortItems(items: CatalogItem[], sort: Sort): CatalogItem[] {
  const copy = [...items];
  switch (sort) {
    case "new":
      return copy.sort((a, b) => b.released.localeCompare(a.released));
    case "popular":
      return copy.sort((a, b) => Number(b.status === "popular") - Number(a.status === "popular") || a.name.ro.localeCompare(b.name.ro));
    case "light":
      return copy.sort((a, b) => a.weightKb - b.weightKb);
    case "price":
      return copy.sort((a, b) => (a.priceRon ?? 0) - (b.priceRon ?? 0));
    default:
      return copy;
  }
}
