import { EFFECTS_BY_CODE, type LibrarySection } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";

/**
 * Traduce coșul de efecte în sursa pe care o primește formularul de contact.
 *
 * Leadul primește denumirile publice ale opțiunilor, fără identificatorii
 * interni ai catalogului.
 */
export function briefSource(codes: string[], lang: Lang, origin: LibrarySection | null) {
  const names = codes
    .map((code) => {
      const entry = EFFECTS_BY_CODE.get(code);
      return entry ? entry.effect.name[lang] : null;
    })
    .filter(Boolean)
    .join(" · ");

  return {
    slug: origin ? `biblioteca/${origin.id}` : "biblioteca",
    name: codes.length > 0 ? `Selecții Bibliotecă (${codes.length}): ${names}` : "Bibliotecă — cerere de consultanță",
    category: origin ? `Bibliotecă Avyron · ${origin.name.ro}` : "Bibliotecă Avyron",
  };
}
