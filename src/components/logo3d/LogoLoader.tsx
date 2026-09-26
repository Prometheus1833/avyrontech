import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const SESSION_KEY = "avyron:logo3d:intro";
const DURATION = 2000;

/**
 * Two-second intro that tells the page's story in miniature:
 * construction grid → vector → volume → light. Pure CSS/SVG, no GL.
 *
 * The same markup is in the prerendered HTML, so it starts before any
 * script runs. When React mounts, the loader resumes at the elapsed time
 * (negative animation delay) instead of restarting, and is removed at 2 s.
 * A second visit in the same session, or reduced motion, skips it.
 */
export function useLoaderState() {
  const [state] = useState(() => {
    if (typeof window === "undefined" || /jsdom/i.test(navigator.userAgent)) return { show: true, elapsed: 0 };
    const elapsed = performance.now();
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* private mode: show it */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const show = !seen && !reduced && elapsed < DURATION - 150;
    return { show, elapsed: show ? elapsed : DURATION };
  });
  return state;
}

export default function LogoLoader({ elapsed }: { elapsed: number }) {
  const { lang } = useLang();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setGone(true), Math.max(0, DURATION - elapsed) + 50);
    return () => window.clearTimeout(t);
  }, [elapsed]);

  if (gone) return null;
  const steps = lang === "ro" ? ["schiță", "vector", "volum", "mișcare"] : ["sketch", "vector", "volume", "motion"];
  const depth = Array.from({ length: 9 }, (_, i) => i + 1);

  return (
    <div
      className="l3d-loader"
      style={{ ["--lo-delay" as string]: `${-Math.round(elapsed)}ms` }}
      role="status"
      aria-label={lang === "ro" ? "Se încarcă pagina Logo Dinamic 3D" : "Loading the Dynamic 3D Logo page"}
    >
      <div>
        <svg viewBox="0 0 200 200" aria-hidden>
          <defs>
            <mask id="l3d-lo-cut">
              <circle cx="100" cy="100" r="56" fill="#fff" />
              <path d="M78 128 L100 70 L122 128 M88 110 L112 110" stroke="#000" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </mask>
            <linearGradient id="l3d-lo-face" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ede9fe" />
              <stop offset="0.55" stopColor="#a78bfa" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="l3d-lo-light" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g>
            <circle className="l3d-lo-guide" cx="100" cy="100" r="76" />
            <circle className="l3d-lo-guide" cx="100" cy="100" r="56" />
            <circle className="l3d-lo-guide" cx="100" cy="100" r="30" />
            <line className="l3d-lo-guide" x1="10" y1="100" x2="190" y2="100" />
            <line className="l3d-lo-guide" x1="100" y1="10" x2="100" y2="190" />
            <line className="l3d-lo-guide" x1="36" y1="36" x2="164" y2="164" />
            <line className="l3d-lo-guide" x1="164" y1="36" x2="36" y2="164" />
            <path className="l3d-lo-guide" d="M60 150 L100 40 L140 150 Z" />
          </g>
          {depth.map((i) => (
            <g
              key={i}
              className="l3d-lo-depth"
              style={{ ["--dx" as string]: `${i * 1.1}px`, ["--dy" as string]: `${i * 1.3}px` }}
            >
              <rect x="40" y="40" width="120" height="120" mask="url(#l3d-lo-cut)" fill={`hsl(262 60% ${34 - i * 2.4}%)`} />
            </g>
          ))}
          <g className="l3d-lo-mark">
            <rect x="40" y="40" width="120" height="120" mask="url(#l3d-lo-cut)" fill="url(#l3d-lo-face)" />
            <g mask="url(#l3d-lo-cut)">
              <g transform="skewX(-18)">
                <rect className="l3d-lo-sweep" x="40" y="30" width="44" height="140" fill="url(#l3d-lo-light)" />
              </g>
            </g>
          </g>
        </svg>
        <div className="l3d-lo-steps" aria-hidden>
          {steps.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="l3d-lo-bar" aria-hidden>
          <i />
        </div>
      </div>
    </div>
  );
}
