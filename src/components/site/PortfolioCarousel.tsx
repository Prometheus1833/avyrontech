import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { PORTFOLIO_IMAGES } from "@/data/portfolio";
import { useExampleCarousel } from "@/hooks/useExampleCarousel";
import {
  carouselHeading,
  defaultCarouselHeading,
  exampleImage,
  carouselCardClass,
  type CarouselHeading,
} from "@/shared/exampleCarouselRendering";
import { type CarouselConfig } from "@/shared/exampleCarousels";
import { trackEvent } from "@/lib/analytics";

export function ExampleCarouselView({
  config,
  lang,
  carouselKey,
  heading,
  preview = false,
}: {
  config: CarouselConfig | null;
  lang: "ro" | "en";
  carouselKey: string;
  heading?: CarouselHeading;
  preview?: boolean;
}) {
  const ro = lang === "ro",
    ref = useRef<HTMLDivElement>(null),
    paused = useRef(false),
    timer = useRef(0);
  const visible = config?.enabled
    ? config.items.filter((i) => i.visibility === "visible")
    : [];
  const speed = config?.speed ?? 40,
    gap = config?.gap ?? 16;
  const loop = !!config?.autoplay && visible.length > 1 && !preview;
  useEffect(() => {
    const el = ref.current;
    if (!el || !loop) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0,
      last = 0,
      pos = el.scrollLeft,
      inView = false;
    const tick = (now: number) => {
      raf = 0;
      if (!inView || document.hidden || media.matches) return;
      const dt = Math.min(now - (last || now), 64);
      last = now;
      if (!paused.current) {
        const half = (el.scrollWidth + gap) / 2;
        pos += dt * (speed / 1000);
        if (half > 0 && pos >= half) pos -= half;
        el.scrollLeft = pos;
      } else pos = el.scrollLeft;
      raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      if (inView && !document.hidden && !media.matches)
        raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", schedule);
    media.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      media.removeEventListener("change", schedule);
    };
  }, [loop, speed, gap, config?.cardWidth, visible.length]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const resumeLater = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      paused.current = false;
    }, 2500);
  };
  const nudge = (direction: number) => {
    paused.current = true;
    ref.current?.scrollBy({
      left: direction * (config!.cardWidth + config!.gap),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    resumeLater();
  };
  if (!config?.enabled || !visible.length) return null;
  const h = carouselHeading(
      config,
      lang,
      heading || defaultCarouselHeading(lang),
    ),
    items = loop ? [...visible, ...visible] : visible;
  return (
    <section
      className="mt-14 scroll-mt-28"
      style={
        {
          "--example-card-width": `${config.cardWidth}px`,
          "--example-card-mobile": `${Math.min(config.cardWidth, 272)}px`,
        } as CSSProperties
      }
    >
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">
          {h.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {h.title}
        </h2>
        {h.description && (
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {h.description}
          </p>
        )}
      </div>
      <div className="relative mt-6">
        <div
          ref={ref}
          data-testid="portfolio-carousel"
          aria-label={h.title}
          onMouseEnter={() => {
            paused.current = true;
          }}
          onMouseLeave={() => {
            if (!ref.current?.contains(document.activeElement))
              paused.current = false;
          }}
          onTouchStart={() => {
            paused.current = true;
          }}
          onTouchEnd={resumeLater}
          onFocus={() => {
            paused.current = true;
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget))
              paused.current = false;
          }}
          style={{ gap: config.gap }}
          className="flex overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
        >
          {items.map((item, i) => {
            const duplicate = i >= visible.length,
              image = exampleImage(item.image, PORTFOLIO_IMAGES);
            const inner = (
              <>
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={image}
                    alt={item.alt[lang]}
                    width={800}
                    height={500}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className={`size-full object-top transition-transform duration-500 group-hover:scale-[1.04] ${config.imageFit === "cover" ? "object-cover" : "object-contain"}`}
                  />
                </div>
                <div className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-bold">
                      {item.name}
                    </h3>
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-brand">
                      {item.tag[lang]}
                    </span>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {item.desc[lang]}
                    </p>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background">
                    <ArrowUpRight className="size-4" aria-hidden />
                  </span>
                </div>
              </>
            );
            const props = {
              className: carouselCardClass,
              "aria-hidden": duplicate || undefined,
              tabIndex: duplicate ? -1 : undefined,
              onClick: () => {
                if (!preview)
                  trackEvent("cta_click", {
                    location: "portfolio_carousel",
                    carousel: carouselKey,
                    target: item.key,
                  });
              },
            };
            return item.href.startsWith("https://") ? (
              <a
                key={`${item.key}:${i}`}
                {...props}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {inner}
              </a>
            ) : (
              <Link key={`${item.key}:${i}`} {...props} to={item.href}>
                {inner}
              </Link>
            );
          })}
        </div>
        {config.arrows && visible.length > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {([-1, 1] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => nudge(dir)}
                aria-label={
                  dir < 0
                    ? ro
                      ? "Proiectul anterior"
                      : "Previous project"
                    : ro
                      ? "Proiectul următor"
                      : "Next project"
                }
                className="grid size-9 place-items-center rounded-full border border-border bg-card transition active:scale-95 hover:border-brand/50"
              >
                {dir < 0 ? (
                  <ChevronLeft className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
export default function PortfolioCarousel({
  lang,
  carouselKey = "premium-website",
  heading,
}: {
  lang: "ro" | "en";
  carouselKey?: string;
  heading?: CarouselHeading;
}) {
  const config = useExampleCarousel(carouselKey),
    fallback = heading || defaultCarouselHeading(lang);
  return (
    <div
      id="portofoliu"
      data-testid="portfolio-section"
      data-example-carousel={carouselKey}
      data-example-images={encodeURIComponent(JSON.stringify(PORTFOLIO_IMAGES))}
      data-example-heading={encodeURIComponent(JSON.stringify(fallback))}
    >
      <ExampleCarouselView
        config={config}
        lang={lang}
        carouselKey={carouselKey}
        heading={fallback}
      />
    </div>
  );
}
