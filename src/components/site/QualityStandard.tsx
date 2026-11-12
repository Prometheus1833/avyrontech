import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { isRealBrowser } from "@/lib/stage/capability";
import "./quality-standard.css";
/** A brand-standard presentation, never a fabricated Lighthouse/audit result. */
export default function QualityStandard() {
  const { t, lang } = useLang();
  const ro = lang === "ro";
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [viewport, api] = useEmblaCarousel({
    align: "start",
    loop: true,
    duration: reduced ? 0 : 44,
  });
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
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) start();
        else if (started && !finished) finish();
      },
      { threshold: 0.3 },
    );
    observer?.observe(node);
    if (!observer) finish();
    const change = () => {
      setReduced(media.matches);
      if (media.matches) finish();
    };
    media.addEventListener("change", change);
    const visibility = () => {
      setHidden(document.hidden);
      if (document.hidden && started && !finished) finish();
    };
    setReduced(media.matches);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      media.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const playing = !!api && visible && !hidden && !reduced && !paused && !hovered && !focused;
  useEffect(() => {
    if (!api) return;
    const stop = () => setPaused(true);
    api.on("pointerDown", stop);
    return () => { api.off("pointerDown", stop); };
  }, [api]);
  useEffect(() => {
    if (!api || !playing) return;
    const timer = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [api, playing]);
  const move = (direction: "previous" | "next") => {
    if (!api) return;
    setPaused(true);
    if (direction === "previous") api.scrollPrev(reduced);
    else api.scrollNext(reduced);
  };
  const previous = ro ? "Criteriul anterior" : "Previous criterion";
  const next = ro ? "Criteriul următor" : "Next criterion";
  const playback = paused
    ? ro ? "Pornește derularea" : "Start scrolling"
    : ro ? "Oprește derularea" : "Pause scrolling";
  return (
    <section
      ref={ref}
      id="avyron-quality-standard"
      className="avy-quality"
      aria-labelledby="avy-quality-title"
      data-quality-progress={progress}
      data-quality-autoplay={playing ? "playing" : "paused"}
    >
      <div className="avy-quality-shell">
        <header className="avy-quality-intro">
          <p className="avy-quality-eyebrow">Avyron Quality Standard</p>
          <h2 id="avy-quality-title">{t.qualityStandard.title}</h2>
          <p className="avy-quality-description">
            {t.qualityStandard.description}
          </p>
          <div className="avy-quality-toolbar">
            <span className="avy-quality-target">{t.qualityStandard.target}</span>
            <div className="avy-quality-controls">
              <button type="button" aria-controls="avy-quality-slides" aria-label={previous} title={previous} disabled={!api} onClick={() => move("previous")}>
                <ChevronLeft aria-hidden="true" />
              </button>
              {!reduced && (
                <button type="button" aria-controls="avy-quality-slides" aria-label={playback} title={playback} disabled={!api} onClick={() => setPaused((value) => !value)}>
                  {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                </button>
              )}
              <button type="button" aria-controls="avy-quality-slides" aria-label={next} title={next} disabled={!api} onClick={() => move("next")}>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>
        <div
          className="avy-quality-viewport"
          id="avy-quality-slides"
          ref={isRealBrowser() && typeof ResizeObserver !== "undefined" ? viewport : undefined}
          role="group"
          aria-label={t.qualityStandard.criteria}
          tabIndex={0}
          data-carousel-ready={api ? "true" : undefined}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHovered(true);
          }}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (!api || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
            event.preventDefault();
            move(event.key === "ArrowLeft" ? "previous" : "next");
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
                <div className="avy-quality-copy">
                  <h3>{item.label}</h3>
                  <ul className="avy-quality-features" role="list">
                    {item.features.map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
