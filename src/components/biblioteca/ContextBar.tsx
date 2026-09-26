import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { LibrarySection } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";

type Props = {
  origin: LibrarySection | null;
  lang: Lang;
};

/**
 * Bara de proveniență.
 *
 * Apare doar când utilizatorul a intrat din pagina unui produs. Îi spune de
 * unde vine, îi ține drumul de întoarcere la un click distanță și duce mai
 * departe spre ofertă — biblioteca nu e o fundătură.
 */
export default function ContextBar({ origin, lang }: Props) {
  if (!origin) return null;

  const productPath = origin.product ? origin.product[lang] : null;
  const label = origin.name[lang];

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[#07080d]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 text-xs sm:px-6">
        <span className="flex min-w-0 items-center gap-2 text-white/60">
          {productPath ? (
            <Link
              to={productPath}
              className="flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {lang === "ro" ? "Înapoi la" : "Back to"} {label}
              </span>
            </Link>
          ) : (
            <span className="truncate">{label}</span>
          )}
        </span>

        <span className="hidden text-white/40 sm:inline">
          {lang === "ro"
            ? "Te-am lăsat exact la secțiunea potrivită."
            : "We dropped you at the right section."}
        </span>

        <a
          href="#brief"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
        >
          {lang === "ro" ? "Cere ofertă" : "Get a quote"}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
