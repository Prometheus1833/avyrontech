import { useEffect, useRef } from "react";

type ProgressSection = { id: string; hue: string };

/** Only the progress strip is updated during scroll. Section geometry is
 * cached until the page or the viewport changes size. */
export default function PlanProgressBar({ sections }: { sections: ProgressSection[] }) {
  const fill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = fill.current;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const doc = document.documentElement;
    const targets = sections.flatMap(section => {
      const element = document.getElementById(section.id);
      return element ? [{ element, hue: section.hue }] : [];
    });
    let frame = 0;
    let limit = 0;
    let ranges: { start: number; end: number; hue: string }[] = [];
    let activeHue = "";
    let needsMeasure = true;
    const render = () => {
      frame = 0;
      const top = window.scrollY;
      if (needsMeasure) {
        limit = doc.scrollHeight - doc.clientHeight;
        ranges = targets.map(({ element, hue }) => {
          const box = element.getBoundingClientRect();
          return { start: top + box.top, end: top + box.bottom, hue };
        });
        needsMeasure = false;
      }
      const progress = limit > 0 ? Math.min(1, Math.max(0, top / limit)) : 0;
      const cursor = top + window.innerHeight * .45;
      const hue = ranges.find(range => cursor >= range.start && cursor < range.end)?.hue || "264 85% 60%";
      if (hue !== activeHue) {
        bar.style.setProperty("--plan-progress-hue", hue);
        activeHue = hue;
      }
      bar.style.transform = `scaleX(${progress})`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
    const measure = () => { needsMeasure = true; schedule(); };
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
    };
  }, [sections]);

  return (
    <div aria-hidden data-testid="plan-progress" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] bg-foreground/[0.06]">
      <div ref={fill} className="h-full origin-left motion-safe:transition-transform motion-safe:duration-150" style={{
        transform: "scaleX(0)",
        background: "linear-gradient(90deg,hsl(var(--brand-2)),hsl(var(--plan-progress-hue, 264 85% 60%)))",
      }} />
    </div>
  );
}
