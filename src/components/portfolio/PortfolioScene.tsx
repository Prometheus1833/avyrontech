import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import { SHOWCASE_IMAGES } from "@/data/portfolioShowcaseImages";

/** Real project captures in a CSS 3D composition; no iframe, WebGL or remote script. */
export default function PortfolioScene({ ro }: { ro: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // The prerendered/no-JS experience is static; animation starts only once observed.
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || /jsdom/i.test(navigator.userAgent)) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(false);
      return;
    }
    setHydrated(true);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };
    const update = () =>
      setReduced(motion.matches || Boolean(nav.connection?.saveData));
    update();
    motion.addEventListener("change", update);
    let inView = true;
    const visibility = () => setActive(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      visibility();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      reduced ||
      paused ||
      !active ||
      !matchMedia("(pointer: fine)").matches
    )
      return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        el.style.setProperty(
          "--pointer-x",
          `${((event.clientX - box.left) / box.width - 0.5) * 7}deg`,
        );
        el.style.setProperty(
          "--pointer-y",
          `${-((event.clientY - box.top) / box.height - 0.5) * 5}deg`,
        );
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--pointer-x", "0deg");
      el.style.setProperty("--pointer-y", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", reset);
    return () => {
      reset();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", reset);
    };
  }, [paused, reduced, active]);
  const motionLabel =
    reduced || !hydrated
      ? ro
        ? "Mișcare redusă"
        : "Reduced motion"
      : paused
        ? ro
          ? "Pornește animația"
          : "Play animation"
        : ro
          ? "Oprește animația"
          : "Pause animation";
  return (
    <div
      ref={ref}
      className="pf-scene"
      data-motion={paused || reduced || !active ? "paused" : "running"}
    >
      <div className="pf-scene-floor" aria-hidden="true" />
      <div className="pf-orbit pf-orbit-a" aria-hidden="true" />
      <div className="pf-orbit pf-orbit-b" aria-hidden="true" />
      <div className="pf-scene-rig" aria-hidden="true">
        {(["clarlumanari", "ruller", "flawlesstudio"] as const).map(
          (key, i) => (
            <div
              key={key}
              className={`pf-screen pf-screen-${i}`}
              style={{ "--screen-index": i } as CSSProperties}
            >
              <div className="pf-browser-bar">
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  {key === "flawlesstudio"
                    ? "flawlesstudio.ro"
                    : key === "clarlumanari"
                      ? "clarlumanari.ro"
                      : "ruller.eu"}
                </span>
                <span>↗</span>
              </div>
              <img
                src={SHOWCASE_IMAGES[key].large}
                srcSet={`${SHOWCASE_IMAGES[key].small} 640w, ${SHOWCASE_IMAGES[key].large} 1280w`}
                sizes="(max-width: 600px) 74vw, 540px"
                width="1280"
                height="800"
                alt=""
                loading="eager"
                fetchPriority={i === 2 ? "high" : "low"}
                decoding="async"
              />
            </div>
          ),
        )}
      </div>
      <div className="pf-scene-caption">
        <span className="pf-live-dot" />
        {ro
          ? "Proiecte reale. Perspective diferite."
          : "Real projects. Different perspectives."}
      </div>
      <button
        className="pf-motion"
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
        disabled={reduced || !hydrated}
        aria-label={`${motionLabel} ${ro ? "portofoliului" : "for portfolio"}`}
      >
        {paused || reduced || !hydrated ? (
          <Play size={13} />
        ) : (
          <Pause size={13} />
        )}
        <span>{motionLabel}</span>
      </button>
    </div>
  );
}
