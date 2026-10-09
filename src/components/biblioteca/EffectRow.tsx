import { Check, Plus } from "lucide-react";
import type { LibraryEffect } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";

type Props = {
  effect: LibraryEffect;
  lang: Lang;
  selected: boolean;
  onToggle: (code: string) => void;
};

/**
 * O intrare de catalog.
 *
 * Textul e real și indexabil — pentru un crawler, secțiunea asta e conținut,
 * nu un canvas gol. Identificatorul tehnic rămâne intern.
 */
export default function EffectRow({ effect, lang, selected, onToggle }: Props) {
  return (
    <li className="group flex items-start gap-4 border-b border-white/[0.07] py-3 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white/90">{effect.name[lang]}</span>
        <span className="block text-xs leading-relaxed text-white/45">{effect.desc[lang]}</span>
      </span>

      <button
        type="button"
        onClick={() => onToggle(effect.code)}
        aria-pressed={selected}
        aria-label={
          selected
            ? `${lang === "ro" ? "Scoate din selecție" : "Remove from selection"}: ${effect.name[lang]}`
            : `${lang === "ro" ? "Adaugă în selecție" : "Add to selection"}: ${effect.name[lang]}`
        }
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected
            ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-300"
            : "border-white/15 text-white/40 hover:border-white/45 hover:text-white"
        }`}
      >
        {selected ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
      </button>
    </li>
  );
}
