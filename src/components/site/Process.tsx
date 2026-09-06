import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MessageSquare, FileText, Handshake, Rocket, ArrowRight } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

gsap.registerPlugin(ScrollTrigger);

const icons = [MessageSquare, FileText, Handshake, Rocket];

/**
 * The four stages, compacted into a rail.
 *
 * A beam runs behind the cards and fills with scroll; each card lifts out of
 * depth as its node lights up, so progress through the stages is legible
 * without reading a word. Motion is GSAP driving transform/opacity only, and
 * the whole timeline is skipped under prefers-reduced-motion — the cards then
 * render in their final state, which is the same layout.
 */
const Process = () => {
  const { t, lang } = useLang();
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.to(".pr-beam__fill", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: ".pr-rail", start: "top 78%", end: "bottom 62%", scrub: 0.6 },
      });

      const nodes = gsap.utils.toArray<HTMLElement>(".pr-node");

      gsap.utils.toArray<HTMLElement>(".pr-card").forEach((el, i) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          rotateX: -16,
          transformPerspective: 800,
          duration: 0.7,
          delay: i * 0.05,
          ease: "power3.out",
          scrollTrigger: { trigger: ".pr-rail", start: "top 80%", once: true },
        });

        // GSAP cannot interpolate `hsl(var(--token))`, so the brand colour
        // lives on an overlay and only its opacity animates.
        const node = nodes[i];
        const fill = node?.querySelector(".pr-node-fill");
        if (node && fill) {
          gsap.to([node, fill], {
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 76%", end: "top 52%", scrub: true },
          });
        }
      });

    }, root);
    return () => ctx.revert();
  }, [lang]);

  const ro = lang === "ro";

  return (
    <section id="proces" ref={root} className="bg-secondary/40 py-10 md:py-14">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            {t.process.title}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.process.subtitle}</p>
        </div>

        <div className="pr-rail relative mt-8">
          {/* Progress track above the cards, so the beam is never covered by
              them. Hidden when the grid stacks — a horizontal rail would be
              meaningless there. */}
          <div aria-hidden className="relative mb-4 hidden h-3 lg:block">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border">
              <div className="pr-beam__fill h-full w-full origin-left scale-x-0 bg-gradient-to-r from-brand via-brand-2 to-brand-3" />
            </div>
            <div className="relative grid h-full grid-cols-4">
              {t.process.steps.map((s2, i) => (
                <span key={s2.t} className="flex items-center justify-center">
                  <span
                    className="pr-node relative size-3 scale-75 rounded-full bg-border ring-4 ring-secondary/40"
                    data-i={i}
                  >
                    <span className="pr-node-fill absolute inset-0 rounded-full bg-brand opacity-0" />
                  </span>
                </span>
              ))}
            </div>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.process.steps.map((s2, i) => {
              const Icon = icons[i];
              const k = String(i + 1).padStart(2, "0");
              return (
                <li key={k} className="pr-card group relative [perspective:800px]">
                  <article className="h-full rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-[transform,border-color,box-shadow] duration-300 will-change-transform group-hover:-translate-y-1 group-hover:border-brand/40 group-hover:shadow-elev group-hover:[transform:rotateX(4deg)_rotateY(-4deg)_translateY(-4px)]">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-brand">
                        {k}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-sm font-semibold leading-tight">{s2.t}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s2.d}</p>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-7 flex justify-center">
          <Link
            to={ro ? "/proces" : "/en/process"}
            className="group inline-flex items-center gap-2 rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-accent"
          >
            {ro ? "Vezi procesul complet" : "See the full process"}
            <ArrowRight
              className="size-4 text-brand transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Process;
