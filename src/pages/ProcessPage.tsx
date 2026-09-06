import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MessageSquare, FileText, Handshake, Rocket, ArrowRight, Clock } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import PageBackLink from "@/components/site/PageBackLink";
import AvyronLogo from "@/components/site/AvyronLogo";

/** WebGL backdrop is the heaviest thing here, so it never blocks first paint. */
const ProcessBackdrop = lazy(() => import("@/components/site/ProcessBackdrop"));

gsap.registerPlugin(ScrollTrigger);

const STEP_ICONS = [MessageSquare, FileText, Handshake, Rocket];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ProcessPage() {
  const { t, lang } = useLang();
  const ro = lang === "ro";
  const root = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  const p = t.processPage;
  const steps = t.process.steps;
  const path = ro ? "/proces" : "/en/process";

  useEffect(() => {
    window.scrollTo(0, 0);
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, howToLd }]) => {
        setPageMeta({
          title: p.metaTitle,
          description: p.metaDescription,
          path,
          alternates: { ro: "/proces", en: "/en/process" },
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: p.eyebrow, path },
          ]),
        );
        setJsonLd(
          "ld-howto",
          howToLd({
            name: t.process.title,
            description: p.metaDescription,
            path,
            totalTime: "P15D",
            steps: steps.map((s, i) => ({
              name: s.t,
              text: `${s.d} ${p.detail[i].output}`,
            })),
          }),
        );
      },
    );
  }, [p, path, ro, steps, t.process.title]);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      // The beam that fills as the stages scroll past.
      gsap.to(".proc-beam__fill", {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: rail.current,
          start: "top 62%",
          end: "bottom 72%",
          scrub: 0.6,
        },
      });

      // Each stage rises out of depth and settles.
      gsap.utils.toArray<HTMLElement>(".proc-stage").forEach((el) => {
        gsap.from(el, {
          y: 64,
          opacity: 0,
          rotateX: -14,
          transformPerspective: 900,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        });
        // GSAP cannot interpolate `hsl(var(--token))`, so the brand colour
        // lives on an overlay and only its opacity animates.
        const node = el.querySelector(".proc-stage__node");
        const fill = el.querySelector(".proc-stage__node-fill");
        if (node && fill) {
          gsap.to([node, fill], {
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 70%", end: "top 45%", scrub: true },
          });
        }
      });

      // Advantage cards stagger in.
      gsap.from(".proc-adv", {
        y: 28,
        opacity: 0,
        duration: 0.6,
        stagger: 0.06,
        ease: "power2.out",
        scrollTrigger: { trigger: ".proc-adv-grid", start: "top 82%", once: true },
      });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <div ref={root} className="relative min-h-screen bg-background text-foreground">
      <Nav />

      <Suspense fallback={null}>
        <ProcessBackdrop />
      </Suspense>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 pt-28 pb-14 text-center sm:pt-32 sm:pb-20">
          <div className="mb-6 flex justify-center">
            <PageBackLink to={ro ? "/" : "/en"} label={p.backLabel} />
          </div>

          <div className="mb-7 flex justify-center">
            <AvyronLogo size={72} markOnly ring />
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand">
            {p.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
            {t.process.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {p.lead}
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <a
              href={ro ? "/#cta" : "/en#cta"}
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-elev transition-transform duration-200 hover:-translate-y-0.5"
            >
              {p.ctaButton}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
              {p.scrollHint}
            </span>
          </div>
        </section>

        {/* Stages */}
        <section ref={rail} className="relative mx-auto max-w-3xl px-4 pb-20">
          {/* Progress beam */}
          <div
            aria-hidden
            className="proc-beam pointer-events-none absolute left-[27px] top-2 bottom-2 w-px bg-border sm:left-[35px]"
          >
            <div className="proc-beam__fill h-full w-full origin-top scale-y-0 bg-gradient-to-b from-brand via-brand-2 to-brand-3" />
          </div>

          <ol className="space-y-5">
            {steps.map((s, i) => {
              const Icon = STEP_ICONS[i];
              const d = p.detail[i];
              return (
                <li
                  key={s.t}
                  id={`etapa-${i + 1}`}
                  className="proc-stage relative pl-14 sm:pl-20"
                >
                  {/* Node on the beam */}
                  <span
                    aria-hidden
                    className="proc-stage__node absolute left-[19px] top-6 size-4 scale-75 rounded-full bg-border ring-4 ring-background sm:left-[27px]"
                  >
                    <span className="proc-stage__node-fill absolute inset-0 rounded-full bg-brand opacity-0" />
                  </span>

                  <article className="group rounded-2xl border border-border/60 bg-card/80 p-5 backdrop-blur transition-colors hover:border-brand/40 sm:p-6">
                    <header className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand">
                          {p.stepLabel} {String(i + 1).padStart(2, "0")}
                        </p>
                        <h2 className="mt-1 font-display text-lg font-semibold leading-tight">
                          {s.t}
                        </h2>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                        <Clock className="size-3" aria-hidden />
                        {d.duration}
                      </span>
                    </header>

                    <p className="mt-4 text-sm text-muted-foreground">{s.d}</p>

                    <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        { k: p.youLabel, v: d.you },
                        { k: p.usLabel, v: d.us },
                        { k: p.outputLabel, v: d.output },
                      ].map((row) => (
                        <div key={row.k} className="rounded-xl bg-muted/50 p-3">
                          <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/50">
                            {row.k}
                          </dt>
                          <dd className="mt-1.5 text-xs leading-relaxed text-foreground/80">
                            {row.v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Advantages */}
        <section className="mx-auto max-w-5xl px-4 pb-20">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {p.advantagesTitle}
          </h2>
          <div className="proc-adv-grid mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.advantages.map((a) => (
              <div
                key={a.t}
                className="proc-adv rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur transition-colors hover:border-brand/40"
              >
                <h3 className="font-display text-sm font-semibold">{a.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{a.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-3xl px-4 pb-24 text-center">
          <div className="rounded-3xl border border-brand/25 bg-gradient-to-br from-brand/[0.08] via-card to-brand-2/[0.06] p-8 sm:p-10">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {p.ctaTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              {p.ctaBody}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a
                href={ro ? "/#cta" : "/en#cta"}
                className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-elev transition-transform duration-200 hover:-translate-y-0.5"
              >
                {p.ctaButton}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </a>
              <Link
                to={ro ? "/costurisiproduse" : "/en/pricing"}
                className="inline-flex items-center rounded-full border border-input px-6 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {ro ? "Vezi produsele" : "See the products"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
