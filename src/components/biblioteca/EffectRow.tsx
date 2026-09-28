import { Check, Plus } from "lucide-react";
import type { LibraryEffect } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";
import { cn } from "@/lib/utils";

type Props = {
  effect: LibraryEffect;
  lang: Lang;
  selected: boolean;
  onToggle: (code: string) => void;
};

const COST_LABEL: Record<string, { ro: string; en: string }> = {
  S: { ro: "sub o zi", en: "under a day" },
  M: { ro: "1–2 zile", en: "1–2 days" },
  L: { ro: "3–5 zile", en: "3–5 days" },
};

/**
 * O intrare de catalog.
 *
 * Textul e real și indexabil — pentru un crawler, secțiunea asta e conținut,
 * nu un canvas gol. Butonul adaugă efectul în brief cu codul lui.
 */
export default function EffectRow({ effect, lang, selected, onToggle }: Props) {
  return (
    <li className="group flex items-start gap-4 border-b border-white/[0.07] py-3 last:border-b-0">
      <span
        className={cn(
          "mt-0.5 shrink-0 font-mono text-[11px]",
          effect.tier === "signature" ? "text-amber-300/90" : "text-white/40",
        )}
      >
        {effect.code}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white/90">{effect.name[lang]}</span>
        <span className="block text-xs leading-relaxed text-white/45">{effect.desc[lang]}</span>
      </span>

      <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-white/35 sm:block">
        {COST_LABEL[effect.cost][lang]}
      </span>

      <button
        type="button"
        onClick={() => onToggle(effect.code)}
        aria-pressed={selected}
        aria-label={
          selected
            ? `${effect.code} — ${lang === "ro" ? "scoate din brief" : "remove from brief"}`
            : `${effect.code} — ${lang === "ro" ? "adaugă în brief" : "add to brief"}`
        }
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-300"
            : "border-white/15 text-white/40 hover:border-white/45 hover:text-white",
        )}
      >
        {selected ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
      </button>
    </li>
  );
}
