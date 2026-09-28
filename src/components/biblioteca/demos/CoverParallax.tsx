import { useEffect, useRef } from "react";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: "Coperta se așază singură în antet",
  en: "The cover settles into the header on its own",
};

/**
 * PRZ-F2 / BLG-S2 — parallax pe trei straturi.
 *
 * Fundal, mijloc și prim-plan se mișcă cu viteze diferite pe măsură ce
 * secțiunea traversează ecranul. Trucul stă în restrângere: diferențe mici,
 * altfel devine amețitor și pare ieftin.
 */
export default function CoverParallax() {
  const { lang } = useLang();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const midRef = useRef<HTMLDivElement | null>(null);
  const frontRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      const rect = host.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const p = Math.max(0, Math.min(1, progress)) - 0.5;

      if (backRef.current) backRef.current.style.transform = `translate3d(0, ${p * -34}px, 0) scale(1.1)`;
      if (midRef.current) midRef.current.style.transform = `translate3d(0, ${p * -70}px, 0)`;
      if (frontRef.current) frontRef.current.style.transform = `translate3d(0, ${p * -120}px, 0)`;

      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="p-6">
      <div ref={hostRef} className="relative h-[240px] overflow-hidden rounded-lg border border-white/12">
        <div
          ref={backRef}
          className="absolute inset-0 will-change-transform"
          style={{
            background:
              "radial-gradient(120% 90% at 30% 20%, hsla(285,80%,45%,0.5), transparent 60%), radial-gradient(90% 80% at 80% 70%, hsla(200,90%,45%,0.4), transparent 65%), #0a0c13",
          }}
        />
        <div ref={midRef} className="absolute inset-x-0 bottom-0 h-32 will-change-transform">
          <div className="mx-auto h-full w-3/4 rounded-t-[40%] bg-black/50 blur-[2px]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <h4
            ref={frontRef}
            className="px-6 text-center text-2xl font-semibold tracking-tight text-white will-change-transform sm:text-3xl"
          >
            {COPY[lang]}
          </h4>
        </div>
      </div>
    </div>
  );
}
