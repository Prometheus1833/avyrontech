import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { LIBRARY_SECTIONS } from "@/data/bibliotecaCatalog";
import { FEATURES } from "@/config/features";
import { useLang } from "@/i18n/LanguageContext";

const LIBRARY_PATH = { ro: "/biblioteca", en: "/en/library" };

/**
 * Intrarea în Bibliotecă de pe pagina unui produs.
 *
 * Singurul drum spre bibliotecă trece pe aici (decizia D1): link doar din
 * paginile de produs, cu proveniența în URL, ca utilizatorul să aterizeze
 * direct în secțiunea serviciului pe care tocmai îl citea.
 */
export default function LibraryLink() {
  const { pathname } = useLocation();
  const { lang } = useLang();

  if (!FEATURES.biblioteca) return null;

  const section = LIBRARY_SECTIONS.find(
    (item) => item.product && (item.product.ro === pathname || item.product.en === pathname),
  );
  // `entry: false` înseamnă că pagina acelui produs rămâne exact cum e:
  // componenta nu randează nimic acolo.
  if (!section || !section.entry) return null;

  const demos = section.effects.filter((effect) => effect.demo).length;
  const href = `${LIBRARY_PATH[lang]}?de-la=${section.id}#${section.id}`;

  return (
    <section className="mt-14">
      <Link
        to={href}
        className="group relative block overflow-hidden rounded-2xl border border-foreground/12 bg-foreground/[0.03] p-6 transition-colors hover:border-foreground/30 md:p-8 md:backdrop-blur"
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/45">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {lang === "ro" ? "Bibliotecă de efecte" : "Effects library"}
            </p>
            <h2 className="mt-3 font-display text-2xl font-extrabold md:text-3xl">
              {lang === "ro"
                ? `Vezi efectele pe care le putem adăuga la ${section.name.ro.toLowerCase()}`
                : `See the effects we can add to ${section.name.en.toLowerCase()}`}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">
              {lang === "ro"
                ? `${section.effects.length} efecte documentate, din care ${demos} le poți încerca direct în pagină. Alegi ce vrei, noi primim lista.`
                : `${section.effects.length} documented effects, ${demos} of which you can try right in the page. Pick what you want and we get the list.`}
            </p>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-4 py-2 text-sm font-medium transition-transform group-hover:translate-x-0.5">
            {lang === "ro" ? "Deschide biblioteca" : "Open the library"}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </section>
  );
}
