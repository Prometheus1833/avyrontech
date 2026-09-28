import { useState } from "react";
import { ChevronUp, X } from "lucide-react";
import { RequestExampleModal } from "@/components/site/RequestExampleModal";
import { briefSource } from "@/components/biblioteca/briefSource";
import { EFFECTS_BY_CODE, type LibrarySection } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";
import { cn } from "@/lib/utils";

type Props = {
  codes: string[];
  lang: Lang;
  origin: LibrarySection | null;
  onRemove: (code: string) => void;
};

/**
 * Coșul de efecte, ca bară de jos.
 *
 * Partea care transformă vitrina în cerere de ofertă: efectele alese pleacă
 * spre formular cu codurile lor și cu produsul de proveniență, deci discuția
 * începe de la ce a vrut clientul, nu de la zero.
 */
export default function BriefBar({ codes, lang, origin, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);

  if (codes.length === 0) return null;

  return (
    <>
      <div id="brief" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-white/15 bg-[#0b0d14]/95 shadow-2xl backdrop-blur">
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300",
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <ul className="flex flex-col gap-1 border-b border-white/10 p-3">
                {codes.map((code) => {
                  const entry = EFFECTS_BY_CODE.get(code);
                  return (
                    <li key={code} className="flex items-center gap-3 text-sm text-white/80">
                      <span className="font-mono text-[11px] text-white/45">{code}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {entry ? entry.effect.name[lang] : code}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(code)}
                        aria-label={lang === "ro" ? `Scoate ${code}` : `Remove ${code}`}
                        className="rounded p-1 text-white/40 transition-colors hover:text-white"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-white/85"
            >
              <ChevronUp
                className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
              <span className="truncate">
                <strong className="font-semibold">{codes.length}</strong>{" "}
                {lang === "ro"
                  ? codes.length === 1
                    ? "efect ales"
                    : "efecte alese"
                  : codes.length === 1
                    ? "effect selected"
                    : "effects selected"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setModal(true)}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0b0d14] transition-transform hover:scale-[1.03]"
            >
              {lang === "ro" ? "Cere ofertă" : "Get a quote"}
            </button>
          </div>
        </div>
      </div>

      <RequestExampleModal
        open={modal}
        onClose={() => setModal(false)}
        source={briefSource(codes, lang, origin)}
      />
    </>
  );
}
