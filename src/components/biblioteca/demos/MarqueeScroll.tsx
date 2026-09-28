import { useEffect, useRef } from "react";
import { stageScroll } from "@/lib/stage/scrollState";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: {
    words: ["reels", "carusele", "story", "cover", "identitate", "template", "grid", "ritm"],
    note: "Derulează pagina: banda accelerează cu tine și își schimbă sensul.",
  },
  en: {
    words: ["reels", "carousels", "story", "cover", "identity", "template", "grid", "rhythm"],
    note: "Scroll the page: the strip speeds up with you and flips direction.",
  },
};

/**
 * SOC-F5 — marquee cu viteză variabilă.
 *
 * Banda merge constant, dar accelerează cu ritmul scroll-ului și își schimbă
 * sensul odată cu el. Se oprește la hover, ca să poți citi.
 */
export default function MarqueeScroll() {
  const { lang } = useLang();
  const t = COPY[lang];
  const rowA = useRef<HTMLDivElement | null>(null);
  const rowB = useRef<HTMLDivElement | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let offsetA = 0;
    let offsetB = -40;
    let frame = 0;
    let previous = performance.now();

    const loop = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;

      if (!paused.current) {
        const boost = 1 + Math.min(Math.abs(stageScroll.velocity) * 12, 6);
        const direction = stageScroll.velocity < -0.001 ? -1 : 1;
        offsetA -= delta * 5.5 * boost * direction;
        offsetB += delta * 3.8 * boost * direction;
        if (rowA.current) rowA.current.style.transform = `translate3d(${offsetA % 50}%,0,0)`;
        if (rowB.current) rowB.current.style.transform = `translate3d(${offsetB % 50}%,0,0)`;
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const strip = (ref: React.RefObject<HTMLDivElement>, muted: boolean) => (
    <div className="overflow-hidden py-1">
      <div ref={ref} className="flex w-[200%] gap-8 will-change-transform">
        {[...t.words, ...t.words, ...t.words, ...t.words].map((word, index) => (
          <span
            key={`${word}-${index}`}
            className={`whitespace-nowrap text-3xl font-semibold tracking-tight sm:text-5xl ${
              muted ? "text-white/15" : "text-white/70"
            }`}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="flex min-h-[240px] flex-col justify-center gap-2 overflow-hidden py-6"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
    >
      {strip(rowA, false)}
      {strip(rowB, true)}
      <p className="px-6 pt-4 text-xs text-white/40">{t.note}</p>
    </div>
  );
}
