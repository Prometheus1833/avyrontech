import { useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: {
    title: "Cum arată un blog care aduce cereri",
    left: "min rămase",
    note: "Derulează în casetă: bara și minutele rămase reacționează.",
    paragraphs: [
      "Un blog de firmă nu concurează cu presa. Concurează cu tăcerea: cu variantele în care clientul caută un răspuns și nu găsește nimic scris de tine.",
      "De aceea primul articol nu trebuie să fie manifest. Trebuie să fie răspunsul la întrebarea pe care o primești cel mai des la telefon, scris o dată, bine.",
      "Ritmul contează mai mult decât volumul. Două articole pe lună, publicate constant timp de un an, bat douăzeci publicate într-o săptămână și apoi nimic.",
      "Măsoară ce trebuie: nu vizitele, ci întrebările care nu se mai repetă și cererile care vin deja informate.",
      "Iar la final, fiecare articol are o singură treabă: să lase cititorul cu un pas următor clar, nu cu un sentiment vag de admirație.",
    ],
  },
  en: {
    title: "What a blog that brings enquiries looks like",
    left: "min left",
    note: "Scroll inside the box: the bar and the minutes left react.",
    paragraphs: [
      "A company blog does not compete with the press. It competes with silence: with the cases where a customer looks for an answer and finds nothing written by you.",
      "So the first article should not be a manifesto. It should answer the question you get most often on the phone, written once, properly.",
      "Rhythm matters more than volume. Two articles a month, published steadily for a year, beat twenty published in one week and then nothing.",
      "Measure the right thing: not visits, but the questions that stop repeating and the enquiries that arrive already informed.",
      "And in the end every article has one job: to leave the reader with a clear next step, not with vague admiration.",
    ],
  },
};

/**
 * BLG-F1 — progres de citire și timp rămas.
 *
 * Bara nu e decor: reduce abandonul, pentru că spune cât a mai rămas. Aici
 * progresul e calculat pe scroll-ul propriu al articolului, nu al paginii.
 */
export default function ReadingProgress() {
  const { lang } = useLang();
  const t = COPY[lang];
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  const words = t.paragraphs.join(" ").split(/\s+/).length;
  const totalMinutes = Math.max(1, Math.round(words / 200));
  const left = Math.max(0, Math.ceil(totalMinutes * (1 - progress)));

  const onScroll = () => {
    const box = boxRef.current;
    if (!box) return;
    const max = box.scrollHeight - box.clientHeight;
    setProgress(max > 0 ? box.scrollTop / max : 1);
  };

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-lg border border-white/12">
        <div className="relative h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <p className="text-xs font-medium text-white/80">{t.title}</p>
          <p className="font-mono text-[11px] tabular-nums text-white/45">
            {left} {t.left}
          </p>
        </div>
        <div
          ref={boxRef}
          onScroll={onScroll}
          className="h-[200px] space-y-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-white/65"
        >
          {t.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-white/45">{t.note}</p>
    </div>
  );
}
