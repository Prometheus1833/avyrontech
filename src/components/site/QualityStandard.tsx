import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";
import "./quality-standard.css";
/** A brand-standard presentation, never a fabricated Lighthouse/audit result. */
export default function QualityStandard() {
  const { t } = useLang(),
    ref = useRef<HTMLElement>(null),
    [progress, setProgress] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      started = false,
      finished = false;
    const finish = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      finished = true;
      setProgress(100);
    };
    const start = () => {
      if (started || finished) return;
      started = true;
      if (media.matches) {
        finish();
        return;
      }
      let initial: number | undefined;
      const tick = (time: number) => {
        initial ??= time;
        const ratio = Math.min(1, (time - initial) / 1450);
        setProgress(Math.round((1 - Math.pow(1 - ratio, 3)) * 100));
        if (ratio < 1) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) {
      finish();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) start();
        else if (started && !finished) finish();
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    const change = () => {
      if (media.matches) finish();
    };
    media.addEventListener("change", change);
    const visibility = () => {
      if (document.hidden && started && !finished) finish();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      media.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <section
      ref={ref}
      id="avyron-quality-standard"
      className="avy-quality"
      aria-labelledby="avy-quality-title"
      data-quality-progress={progress}
    >
      <div className="avy-quality-shell">
        <header className="avy-quality-intro">
          <p className="avy-quality-eyebrow">Avyron Quality Standard</p>
          <h2 id="avy-quality-title">{t.qualityStandard.title}</h2>
          <p className="avy-quality-description">
            {t.qualityStandard.description}
          </p>
          <span className="avy-quality-target">{t.qualityStandard.target}</span>
        </header>
        <div
          className="avy-quality-indicators"
          aria-label={t.qualityStandard.criteria}
        >
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
    </section>
  );
}
