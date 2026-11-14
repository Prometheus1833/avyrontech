import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useLang } from "@/i18n/LanguageContext";
import { isRealBrowser } from "@/lib/stage/capability";
import "./quality-standard.css";

/** A brand-standard presentation, never a fabricated Lighthouse/audit result. */
export default function QualityStandard() {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(100);
  const [viewport, api] = useEmblaCarousel({
    align: "start",
    loop: true,
    duration: 28,
    breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
  });

  useEffect(() => {
    const node = ref.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!node || media.matches || typeof IntersectionObserver === "undefined") return;
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      setProgress(100);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let initial: number | undefined;
      const tick = (time: number) => {
        initial ??= time;
        const ratio = Math.min(1, (time - initial) / 1450);
        setProgress(Math.round((1 - Math.pow(1 - ratio, 3)) * 100));
        frame = ratio < 1 ? requestAnimationFrame(tick) : 0;
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    observer.observe(node);
    const stop = () => {
      if (media.matches || document.hidden) {
        observer.disconnect();
        finish();
      }
    };
    media.addEventListener("change", stop);
    document.addEventListener("visibilitychange", stop);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      media.removeEventListener("change", stop);
      document.removeEventListener("visibilitychange", stop);
    };
  }, []);

  return (
    <section id="avyron-quality-standard" className="avy-quality" aria-labelledby="avy-quality-title" data-quality-progress={progress}>
      <div className="avy-quality-shell">
        <header className="avy-quality-intro">
          <p className="avy-quality-eyebrow">Avyron Quality Standard</p>
          <h2 id="avy-quality-title">{t.qualityStandard.title}</h2>
          <p className="avy-quality-description">{t.qualityStandard.description}</p>
          <p className="avy-quality-target">{t.qualityStandard.target}</p>
        </header>
        <div ref={ref}>
          <div
            className="avy-quality-viewport"
            ref={isRealBrowser() && typeof ResizeObserver !== "undefined" ? viewport : undefined}
            role="group"
            aria-label={t.qualityStandard.criteria}
            tabIndex={0}
            data-carousel-ready={api ? "true" : undefined}
            onKeyDown={(event) => {
              if (!api || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
              event.preventDefault();
              if (event.key === "ArrowLeft") api.scrollPrev();
              else api.scrollNext();
            }}
          >
            <div className="avy-quality-indicators">
              {t.qualityStandard.items.map((item) => (
                <article key={item.label} className="avy-quality-indicator">
                  <div className="avy-quality-ring" aria-hidden="true">
                    <svg viewBox="0 0 100 100" focusable="false">
                      <circle className="avy-quality-ring-track" cx="50" cy="50" r="43" />
                      <circle className="avy-quality-ring-fill" cx="50" cy="50" r="43" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress} transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="avy-quality-number"><strong>{progress}</strong><span>/100</span></div>
                  </div>
                  <h3>{item.label}</h3>
                  <ul className="avy-quality-features" role="list">
                    {item.features.map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
