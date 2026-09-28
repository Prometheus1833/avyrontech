import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const PATH =
  "M60 160 L120 40 L180 160 M88 118 L152 118 M225 100 m -55 0 a 55 55 0 1 0 110 0 a 55 55 0 1 0 -110 0 M225 45 L225 100 L268 128";

const COPY = {
  ro: { replay: "rulează din nou", alt: "Marcă desenată cu traseu luminos" },
  en: { replay: "play again", alt: "Mark drawn by a travelling light" },
};

/**
 * LGO-S3 — gravură cu traseu luminos.
 *
 * Conturul se desenează prin `stroke-dashoffset`, iar un punct de lumină
 * parcurge exact aceeași curbă, calculată cu `getPointAtLength`. Efectul e
 * ieftin, merge pe orice SVG și funcționează la fel de bine ca semnătură de
 * final într-un video.
 */
export default function SvgDraw() {
  const { lang } = useLang();
  const t = COPY[lang];
  const pathRef = useRef<SVGPathElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!path || !dot) return;

    if (typeof path.getTotalLength !== "function") return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      path.style.strokeDashoffset = "0";
      dot.style.opacity = "0";
      return;
    }

    const duration = 2200;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      path.style.strokeDashoffset = `${length * (1 - eased)}`;

      const point = path.getPointAtLength(length * eased);
      dot.setAttribute("cx", String(point.x));
      dot.setAttribute("cy", String(point.y));
      dot.style.opacity = progress >= 1 ? "0" : "1";

      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key]);

  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-6">
      <svg viewBox="0 0 300 190" className="w-full max-w-md" role="img" aria-label={t.alt}>
        <path
          ref={pathRef}
          d={PATH}
          fill="none"
          stroke="hsl(34 95% 62%)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle ref={dotRef} r="5" fill="#fff" style={{ filter: "drop-shadow(0 0 8px hsl(34 95% 70%))" }} />
      </svg>
      <button
        type="button"
        onClick={() => setKey((k) => k + 1)}
        className="rounded-full border border-white/20 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white/60 transition-colors hover:text-white"
      >
        {t.replay}
      </button>
    </div>
  );
}
