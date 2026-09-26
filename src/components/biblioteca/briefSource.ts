import { EFFECTS_BY_CODE, type LibrarySection } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";

/**
 * Traduce coșul de efecte în sursa pe care o primește formularul de contact.
 *
 * Codurile ajung nealterate în lead, ca discuția să înceapă de la ce a ales
 * clientul, nu de la „vreau ceva modern".
 */
export function briefSource(codes: string[], lang: Lang, origin: LibrarySection | null) {
  const names = codes
    .map((code) => {
      const entry = EFFECTS_BY_CODE.get(code);
      return entry ? `${code} ${entry.effect.name[lang]}` : code;
    })
    .join(" · ");

  return {
    slug: origin ? `biblioteca/${origin.id}` : "biblioteca",
    name: codes.length > 0 ? `Brief efecte (${codes.length}): ${names}` : "Bibliotecă — cerere fără efecte alese",
    category: origin ? `Bibliotecă Avyron · ${origin.name.ro}` : "Bibliotecă Avyron",
  };
}
