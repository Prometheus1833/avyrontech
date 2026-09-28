import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const SCREENS = [
  {
    tint: "from-fuchsia-500/25",
    title: { ro: "Descoperă", en: "Discover" },
    body: { ro: "Feed curat, fără zgomot.", en: "A clean feed, no noise." },
  },
  {
    tint: "from-sky-500/25",
    title: { ro: "Alege", en: "Choose" },
    body: { ro: "Filtre care rețin ce ai bifat.", en: "Filters that remember what you ticked." },
  },
  {
    tint: "from-emerald-500/25",
    title: { ro: "Comandă", en: "Order" },
    body: { ro: "Trei câmpuri, nu treisprezece.", en: "Three fields, not thirteen." },
  },
  {
    tint: "from-amber-500/25",
    title: { ro: "Urmărește", en: "Track" },
    body: { ro: "Status live, fără email de căutat.", en: "Live status, no email to dig up." },
  },
];

/**
 * SOC-S1 / APP-S1 — device 3D care schimbă ecranul la scroll.
 *
 * Telefonul se înclină ușor pe măsură ce secțiunea traversează ecranul, iar
 * interfața din el parcurge fluxul real al aplicației. Clientul vede produsul
 * în uz, nu un slide cu capturi.
 */
export default function DeviceScroll() {
  const { lang } = useLang();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    const update = () => {
      const rect = host.getBoundingClientRect();
      const total = window.innerHeight + rect.height;
      const seen = window.innerHeight - rect.top;
      const progress = Math.max(0, Math.min(1, seen / total));

      setIndex(Math.min(SCREENS.length - 1, Math.floor(progress * SCREENS.length * 1.2)));
      if (phoneRef.current && !reduced) {
        const tilt = (progress - 0.5) * 26;
        phoneRef.current.style.transform = `perspective(1100px) rotateY(${tilt}deg) rotateX(${(0.5 - progress) * 8}deg)`;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={hostRef} className="flex min-h-[300px] items-center justify-center gap-8 p-6">
      <div
        ref={phoneRef}
        className="relative h-[260px] w-[132px] shrink-0 rounded-[22px] border border-white/20 bg-[#0a0c12] p-2 shadow-2xl will-change-transform"
      >
        <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25" />
        <div className="relative mt-4 h-[230px] overflow-hidden rounded-[16px] bg-black">
          {SCREENS.map((screen, i) => (
            <div
              key={screen.title.ro}
              className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t ${screen.tint} to-transparent p-3 transition-all duration-500 ${
                i === index ? "translate-y-0 opacity-100" : i < index ? "-translate-y-4 opacity-0" : "translate-y-4 opacity-0"
              }`}
            >
              <div className="mb-auto mt-2 space-y-1.5 pt-2">
                <div className="h-1.5 w-10 rounded bg-white/30" />
                <div className="h-12 rounded bg-white/10" />
                <div className="h-12 rounded bg-white/[0.07]" />
              </div>
              <p className="text-[13px] font-semibold text-white">{screen.title[lang]}</p>
              <p className="text-[10px] leading-tight text-white/60">{screen.body[lang]}</p>
            </div>
          ))}
        </div>
      </div>

      <ol className="hidden max-w-[220px] flex-col gap-2 text-sm sm:flex">
        {SCREENS.map((screen, i) => (
          <li
            key={screen.title.ro}
            className={`flex items-center gap-2 transition-colors ${i === index ? "text-white" : "text-white/35"}`}
          >
            <span className={`h-px transition-all ${i === index ? "w-6 bg-white" : "w-3 bg-white/30"}`} />
            {screen.title[lang]}
          </li>
        ))}
      </ol>
    </div>
  );
}
