import { useEffect, useRef } from "react";
import { CalendarDays, Link2, MessageSquareText, MousePointer2, Search, ShieldCheck } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import "./benefits.css";

const icons = [MousePointer2, ShieldCheck, Search, CalendarDays, MessageSquareText, Link2];

const Benefits = () => {
  const { t } = useLang();
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!grid.current || !("IntersectionObserver" in window) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = Array.from(grid.current.children);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-reveal", "entered");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.1 });

    for (const card of cards) {
      // Leave server-rendered content and cards already on screen readable.
      if (card.getBoundingClientRect().top < window.innerHeight) continue;
      card.setAttribute("data-reveal", "pending");
      observer.observe(card);
    }
    return () => {
      observer.disconnect();
      for (const card of cards) card.removeAttribute("data-reveal");
    };
  }, []);

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
              <article key={b.t} className="website-benefit grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-border/70 p-3.5 sm:p-4">
                <span className="grid size-9 place-items-center rounded-xl border border-brand/15 bg-brand/10 text-brand">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display font-semibold text-sm md:text-base leading-snug">{b.t}</h3>
                  <p className="mt-1 text-xs md:text-sm text-muted-foreground leading-relaxed">{b.d}</p>
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
