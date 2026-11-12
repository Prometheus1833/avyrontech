import { useEffect, useRef } from "react";
import { CalendarDays, Link2, MessageSquareText, MousePointer2, Search, ShieldCheck } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { isRealBrowser } from "@/lib/stage/capability";
import "./benefits.css";

const icons = [MousePointer2, ShieldCheck, Search, CalendarDays, MessageSquareText, Link2];

const Benefits = () => {
  const { t } = useLang();
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = grid.current;
    if (!element || !isRealBrowser()) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cards = Array.from(element.querySelectorAll<HTMLElement>(".website-benefit"));
    let near = false;
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      for (const card of cards) card.style.removeProperty("--benefit-arrival");
    };
    const render = () => {
      frame = 0;
      const height = window.innerHeight;
      const width = window.innerWidth;
      const columns = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
      const distance = Math.min(height * .38, 290);
      // Measure stable layout boxes, then update the inner planes in one pass.
      const arrivals = cards.map((card, index) => {
        const stagger = (index % columns) * 26;
        const progress = Math.min(1, Math.max(0,
          (height * .98 - card.getBoundingClientRect().top - stagger) / distance,
        ));
        return (1 - progress * progress * (3 - 2 * progress)).toFixed(3);
      });
      cards.forEach((card, index) => {
        if (card.style.getPropertyValue("--benefit-arrival") !== arrivals[index])
          card.style.setProperty("--benefit-arrival", arrivals[index]);
      });
    };
    const schedule = () => {
      if (near && !document.hidden && !motion.matches && !frame)
        frame = requestAnimationFrame(render);
    };
    const observer = new IntersectionObserver((entries) => {
      near = entries[entries.length - 1]?.isIntersecting ?? false;
      if (near) schedule();
      else reset();
    }, { rootMargin: "120px 0px" });
    const motionChanged = () => motion.matches ? reset() : schedule();
    const visibilityChanged = () => document.hidden ? reset() : schedule();
    observer.observe(element);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", motionChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      observer.disconnect();
      reset();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [t.benefits.items]);

  return (
    <section id="avantaje" aria-labelledby="website-benefits-title" className="website-benefits py-8 md:py-12 scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 id="website-benefits-title" className="font-display text-2xl md:text-4xl font-bold tracking-tight">
            {t.benefits.title}
          </h2>
        </div>
        <div ref={grid} className="website-benefits-grid mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">
          {t.benefits.items.map((b, i) => {
            const Icon = icons[i];
            return (
              <article key={b.t} className="website-benefit">
                <div className="website-benefit-panel grid h-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border p-3.5 sm:p-4">
                  <span className="website-benefit-icon grid size-10 place-items-center rounded-xl border">
                    <Icon className="size-[19px]" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display font-semibold text-sm md:text-base leading-snug">{b.t}</h3>
                    <p className="mt-1 text-xs md:text-sm text-muted-foreground leading-relaxed">{b.d}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
