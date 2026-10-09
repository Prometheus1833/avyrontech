import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import DemoFrame from "@/components/biblioteca/DemoFrame";
import EffectRow from "@/components/biblioteca/EffectRow";
import type { LibrarySection } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";

type Props = {
  section: LibrarySection;
  index: number;
  lang: Lang;
  selected: string[];
  onToggle: (code: string) => void;
  onDemoFocus: (code: string | null) => void;
};

/**
 * O secțiune de serviciu.
 *
 * Ritmul e identic peste tot: titlu și poziționare, demo-urile care se pot
 * atinge, catalogul complet ca text indexabil, apoi drumul înapoi spre
 * produs. Repetiția e intenționată — clientul învață structura o dată și o
 * folosește pe toate cele opt.
 */
export default function ServiceSection({
  section,
  index,
  lang,
  selected,
  onToggle,
  onDemoFocus,
}: Props) {
  const demos = section.effects.filter((effect) => effect.demo);
  const signature = section.effects.filter((effect) => effect.tier === "signature");
  const foundation = section.effects.filter((effect) => effect.tier === "foundation");

  return (
    <section id={section.id} className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-3xl">
          <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/55">
            <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
            <span className="h-px w-8 bg-white/25" />
            <span className="text-amber-300/90">{lang === "ro" ? "Serviciu digital" : "Digital service"}</span>
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {section.name[lang]}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/60">{section.claim[lang]}</p>

        </header>

        {demos.length > 0 && (
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {demos.map((effect) => (
              <DemoFrame key={effect.code} effect={effect} lang={lang} onFocusChange={onDemoFocus} />
            ))}
          </div>
        )}

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300/90">
              {lang === "ro" ? "Experiențe distinctive" : "Distinctive experiences"}
            </h3>
            <ul className="mt-3">
              {signature.map((effect) => (
                <EffectRow
                  key={effect.code}
                  effect={effect}
                  lang={lang}
                  selected={selected.includes(effect.code)}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
              {lang === "ro" ? "Elemente esențiale" : "Essential elements"}
            </h3>
            <ul className="mt-3">
              {foundation.map((effect) => (
                <EffectRow
                  key={effect.code}
                  effect={effect}
                  lang={lang}
                  selected={selected.includes(effect.code)}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          </div>
        </div>

        {section.service && (
          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
            <Link
              to={`${section.service[lang]}#pachet`}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/85 transition-colors hover:border-white/60 hover:text-white"
            >
              {lang === "ro" ? `Vezi pachetul ${section.name.ro}` : `See the ${section.name.en} package`}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a href="#brief" className="text-sm text-white/45 underline-offset-4 hover:text-white/80 hover:underline">
              {lang === "ro" ? "sau trimite efectele alese" : "or send the effects you picked"}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
