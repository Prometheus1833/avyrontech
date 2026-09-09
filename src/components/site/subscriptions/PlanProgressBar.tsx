import { useEffect, useRef, useState } from "react";

export type ProgressSection = { id: string; hue: string };

type Props = {
  sections: ProgressSection[];
  /** Nuanțele folosite în afara secțiunilor de abonamente. */
  fallback?: { from: string; to: string };
};

/** „190 92% 55%" → „212 92% 55%", ca bara să aibă un gradient propriu. */
const shiftHue = (hsl: string, by: number) => {
  const [h, ...rest] = hsl.trim().split(/\s+/);
  const hue = Number.parseFloat(h);
  if (!Number.isFinite(hue) || rest.length < 2) return hsl;
  return `${(hue + by + 360) % 360} ${rest.join(" ")}`;
};

/**
 * Bara de progres a paginii. Preia culoarea categoriei de abonamente în care a
 * ajuns vizitatorul și trece fluid de la o culoare la alta, iar reperele arată
 * unde începe fiecare categorie.
 */
const PlanProgressBar = ({ sections, fallback }: Props) => {
  const [progress, setProgress] = useState(0);
  const [activeHue, setActiveHue] = useState<string | null>(null);
  const [marks, setMarks] = useState<Array<{ id: string; at: number; hue: string }>>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const update = () => {
      frameRef.current = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0);
    };
    const onScroll = () => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Reperele arată, pe bară, unde începe fiecare categorie.
  useEffect(() => {
    const measure = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (max <= 0) return;
      setMarks(sections.flatMap((section) => {
        const element = document.getElementById(section.id);
        if (!element) return [];
        const top = element.getBoundingClientRect().top + window.scrollY;
        return [{ id: section.id, at: Math.min(1, Math.max(0, top / max)), hue: section.hue }];
      }));
    };
    measure();
    const timer = window.setTimeout(measure, 800);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [sections]);

  useEffect(() => {
    const byId = new Map(sections.map((section) => [section.id, section.hue]));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveHue(byId.get(entry.target.id) ?? null);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const observed = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    observed.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  // Straturile sunt suprapuse și doar opacitatea se schimbă: gradienții nu se
  // interpolează în CSS, dar o estompare între ele arată ca o trecere fluidă.
  const layers = [
    {
      key: "base",
      gradient: `linear-gradient(90deg, ${fallback?.from ?? "hsl(var(--brand))"}, ${fallback?.to ?? "hsl(var(--brand-2))"})`,
    },
    ...sections.map((section) => ({
      key: section.id,
      gradient: `linear-gradient(90deg, hsl(${section.hue}), hsl(${shiftHue(section.hue, 22)}))`,
    })),
  ];
  const activeKey = sections.find((section) => section.hue === activeHue)?.id ?? "base";

  return (
    <div aria-hidden data-testid="plan-progress" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div className="absolute inset-0 bg-foreground/[0.06]" />
      {marks.map((mark) => (
        <span
          key={mark.id}
          className="absolute top-0 h-full w-px opacity-70"
          style={{ left: `${mark.at * 100}%`, background: `hsl(${mark.hue} / 0.5)` }}
        />
      ))}
      <div
        className="relative h-full origin-left overflow-hidden"
        style={{ transform: `scaleX(${progress})`, transition: "transform 140ms ease-out" }}
      >
        {layers.map((layer) => (
          <span
            key={layer.key}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ backgroundImage: layer.gradient, opacity: activeKey === layer.key ? 1 : 0 }}
          />
        ))}
      </div>
      <span
        className="absolute top-0 h-full w-16 -translate-x-full transition-opacity duration-700"
        style={{
          left: `${progress * 100}%`,
          background: `linear-gradient(90deg, transparent, hsl(${activeHue ?? "264 90% 62%"} / 0.55))`,
          opacity: progress > 0.01 ? 1 : 0,
          filter: "blur(2px)",
        }}
      />
    </div>
  );
};

export default PlanProgressBar;
