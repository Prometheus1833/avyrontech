import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { PORTFOLIO, type PortfolioItem } from "@/data/portfolio";
import { trackEvent } from "@/lib/analytics";

/** Carusel continuu dreapta → stânga; se oprește la hover/atingere/focus, cu săgeți și swipe nativ. */
export default function PortfolioCarousel({ lang }: { lang: "ro" | "en" }) {
  const ro = lang === "ro";
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const items = [...PORTFOLIO, ...PORTFOLIO];

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    let pos = el.scrollLeft;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      if (!paused.current) {
        const half = el.scrollWidth / 2;
        pos += dt * 0.04;
        if (pos >= half) pos -= half;
        el.scrollLeft = pos;
      } else {
        pos = el.scrollLeft;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    paused.current = true;
    el.scrollBy({ left: dir * 300, behavior: "smooth" });
    window.setTimeout(() => (paused.current = false), 2500);
  };

  const pause = () => (paused.current = true);
  const resume = () => (paused.current = false);

  const card = (p: PortfolioItem, i: number) => {
    const inner = (
      <>
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          <img src={p.image} alt={ro ? `Captură ${p.name}` : `${p.name} screenshot`} width={800} height={500} loading="lazy"
            className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
        <div className="flex items-start gap-3 p-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-bold">{p.name}</h3>
            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-brand">{p.tag[lang]}</span>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{p.desc[lang]}</p>
          </div>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>
      </>
    );
    const cls = "group w-[17rem] shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-colors hover:border-brand/50 sm:w-[19rem]";
    const dup = i >= PORTFOLIO.length;
    const k = `${p.key}-${i}`;
    const common = { className: cls, "aria-hidden": dup || undefined, tabIndex: dup ? -1 : undefined,
      onClick: () => trackEvent("cta_click", { location: "portfolio_carousel", target: p.key }) };
    return p.external
      ? <a key={k} {...common} href={p.href} target="_blank" rel="noopener noreferrer">{inner}</a>
      : <Link key={k} {...common} to={p.href}>{inner}</Link>;
  };

  return (
    <div className="relative">
      <div ref={ref} data-testid="portfolio-carousel"
        onMouseEnter={pause} onMouseLeave={resume} onTouchStart={pause} onTouchEnd={() => window.setTimeout(resume, 2500)}
        onFocus={pause} onBlur={resume}
        className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        {items.map(card)}
      </div>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={() => nudge(-1)} aria-label={ro ? "Proiectul anterior" : "Previous project"}
          className="grid size-9 place-items-center rounded-full border border-border bg-card transition active:scale-95 hover:border-brand/50"><ChevronLeft className="size-4" /></button>
        <button type="button" onClick={() => nudge(1)} aria-label={ro ? "Proiectul următor" : "Next project"}
          className="grid size-9 place-items-center rounded-full border border-border bg-card transition active:scale-95 hover:border-brand/50"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  );
}
