import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const ITEMS = [
  { name: "Cloudflare", role: { ro: "Livrare globală și protecție", en: "Global delivery and protection" } },
  { name: "GitHub", role: { ro: "Versiuni, verificări și livrare", en: "Versioning, checks and delivery" } },
  { name: "Hostico", role: { ro: "Domenii și infrastructură locală", en: "Domains and local infrastructure" } },
  { name: "Three.js", role: { ro: "Experiențe 3D interactive", en: "Interactive 3D experiences" } },
  { name: "GSAP", role: { ro: "Mișcare fluidă și controlată", en: "Fluid, controlled motion" } },
  { name: "Post-processing", role: { ro: "Finisaje vizuale cinematice", en: "Cinematic visual finishing" } },
  { name: "CSS", role: { ro: "Interfețe rapide și adaptive", en: "Fast, adaptive interfaces" } },
  { name: "React", role: { ro: "Componente stabile și scalabile", en: "Stable, scalable components" } },
  { name: "TypeScript", role: { ro: "Cod predictibil și sigur", en: "Predictable, safer code" } },
  { name: "Vite", role: { ro: "Încărcare și livrare rapidă", en: "Fast loading and delivery" } },
] as const;

export default function TechnologyPartnersCarousel({ lang }: { lang: "ro" | "en" }) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = performance.now();
    let position = el.scrollWidth / 2;
    el.scrollLeft = position;
    const tick = (now: number) => {
      const delta = Math.min(now - last, 64);
      last = now;
      if (!paused.current) {
        const half = el.scrollWidth / 2;
        position -= delta * 0.035;
        if (position <= 0) position += half;
        el.scrollLeft = position;
      } else position = el.scrollLeft;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const nudge = (direction: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    paused.current = true;
    el.scrollBy({ left: direction * 260, behavior: "smooth" });
    window.setTimeout(() => (paused.current = false), 2200);
  };

  const items = [...ITEMS, ...ITEMS];
  return (
    <section aria-labelledby="technology-partners-title" className="mt-10">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{lang === "ro" ? "Tehnologii și parteneri" : "Technology and partners"}</p>
        <h2 id="technology-partners-title" className="mt-2 font-display text-2xl font-bold sm:text-3xl">{lang === "ro" ? "Un ecosistem ales pentru performanță" : "An ecosystem chosen for performance"}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{lang === "ro" ? "Instrumente mature, combinate după nevoia proiectului — fără dependențe inutile." : "Mature tools combined around the project — without unnecessary dependencies."}</p>
      </div>
      <div
        ref={ref}
        data-testid="technology-partners-carousel"
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        onTouchStart={() => (paused.current = true)}
        onTouchEnd={() => window.setTimeout(() => (paused.current = false), 2200)}
        onFocus={() => (paused.current = true)}
        onBlur={() => (paused.current = false)}
        className="mt-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      >
        {items.map((item, index) => (
          <article key={`${item.name}-${index}`} aria-hidden={index >= ITEMS.length || undefined} className="w-52 shrink-0 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 font-display text-sm font-black text-primary">{item.name.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0">
                <h3 className="truncate font-display text-sm font-bold">{item.name}</h3>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.role[lang]}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => nudge(-1)} aria-label={lang === "ro" ? "Înapoi" : "Previous"}><ChevronLeft aria-hidden /></Button>
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => nudge(1)} aria-label={lang === "ro" ? "Înainte" : "Next"}><ChevronRight aria-hidden /></Button>
      </div>
    </section>
  );
}