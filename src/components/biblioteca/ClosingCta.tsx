import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";

import { RequestExampleModal } from "@/components/site/RequestExampleModal";
import { briefSource } from "@/components/biblioteca/briefSource";
import { LIBRARY_SECTIONS, type LibrarySection } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";

const WHATSAPP = "https://wa.me/40734605055?text=";

type Props = {
  codes: string[];
  lang: Lang;
  origin: LibrarySection | null;
};

/**
 * Închiderea paginii.
 *
 * O bibliotecă fără ieșire e o galerie. Aici se termină drumul: fie trimiți
 * efectele alese, fie te întorci în pagina produsului care te interesează.
 * Legăturile către produse sunt și cel mai bun lucru pe care îl putem face
 * pentru autoritatea internă a acelor pagini.
 */
export default function ClosingCta({ codes, lang, origin }: Props) {
  const [modal, setModal] = useState(false);
  const ro = lang === "ro";

  const message = ro
    ? `Bună! Am parcurs biblioteca de efecte${codes.length ? ` și am ales ${codes.length} efecte` : ""}.`
    : `Hi! I went through the effects library${codes.length ? ` and picked ${codes.length} effects` : ""}.`;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-7 backdrop-blur-md sm:p-10">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {ro
            ? "Ai văzut ce se poate. Hai să vedem ce ți se potrivește."
            : "You have seen what is possible. Let us see what fits you."}
        </h2>
        <p className="mt-4 max-w-[62ch] text-white/60">
          {codes.length > 0
            ? ro
              ? `Ai ${codes.length} efecte în brief. Le trimitem împreună cu produsul de la care ai pornit, iar tu primești o estimare cu termen și cost, nu o listă de prețuri generale.`
              : `You have ${codes.length} effects in your brief. We send them together with the product you started from, and you get an estimate with timing and cost, not a generic price list.`
            : ro
              ? "Alege efectele care ți-au plăcut cu butonul de lângă fiecare, apoi trimite-ne lista. Sau scrie-ne direct — începem de la ce vrei să obții, nu de la ce putem noi."
              : "Pick the effects you liked with the button next to each one, then send us the list. Or write to us directly — we start from what you want to achieve, not from what we can do."}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0b0d14] transition-transform hover:scale-[1.03]"
          >
            {ro ? "Cere ofertă" : "Get a quote"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <a
            href={`${WHATSAPP}${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/85 transition-colors hover:border-white/50 hover:text-white"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            WhatsApp
          </a>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            {ro ? "Mergi direct la produs" : "Go straight to the product"}
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {LIBRARY_SECTIONS.filter((section) => section.product && section.entry).map((section) => (
              <li key={section.id}>
                <Link
                  to={section.product![lang]}
                  className="text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {section.name[lang]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <RequestExampleModal
        open={modal}
        onClose={() => setModal(false)}
        source={briefSource(codes, lang, origin)}
      />
    </section>
  );
}
