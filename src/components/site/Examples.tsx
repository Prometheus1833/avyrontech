import { useState, useMemo, useEffect, type ComponentType } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Check, ChevronDown, ExternalLink, Globe, MessageSquarePlus } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { useExamples, publicImageUrl, type ExampleRow } from "@/hooks/useExamples";
import { RequestExampleModal } from "./RequestExampleModal";
import { Link } from "react-router-dom";
import examplesBg from "@/assets/examples-section-bg.jpg";

type Cat = "beauty" | "resto" | "public" | "turism" | "pro" | "local" | "auto" | "ecommerce" | "national" | "other";

const order: Cat[] = ["beauty", "resto", "public", "turism", "pro", "local", "auto", "ecommerce", "national", "other"];

const Examples = () => {
  const { t } = useLang();
  const [active, setActive] = useState<Cat | null>(null);
  // 'closed' = only "Vezi domenii" button | 'open' = full list | 'selected' = collapsed pill
  const [view, setView] = useState<"closed" | "open" | "selected">("closed");
  const [requestSource, setRequestSource] = useState<ExampleRow | null>(null);
  const [Mockup, setMockup] = useState<ComponentType | null>(null);

  const { data: dbExamples } = useExamples();
  const fallbackCat: Cat = "ecommerce";
  const displayCat: Cat = active ?? fallbackCat;
  const current = t.examples.data[displayCat];
  const currentCat = t.examples.cats[displayCat];
  useEffect(() => {
    if (!active) return;
    let alive = true;
    import("./mockups").then(({ mockups }) => alive && setMockup(() => mockups[active]));
    return () => { alive = false; };
  }, [active]);

  // Find a DB example matching the active category — shows as the "live" example for this domain
  const liveExample = useMemo(
    () => (active ? dbExamples.find((e) => e.category === active) ?? null : null),
    [dbExamples, active]
  );

  const handleSelectCat = (id: Cat) => {
    setActive(id);
    setView("selected");
  };

  const showCard = active !== null;

  return (
    <section id="exemple" className="relative py-14 md:py-24 overflow-hidden">
      {/* Background image (enlarged) */}
      <img
        aria-hidden
        alt=""
        src={examplesBg}
        loading="lazy"
        decoding="async"
        width={1920}
        height={1280}
        className="absolute inset-0 -z-10 h-full w-full object-cover object-center scale-110"
      />
      {/* Readability overlay — soft fade so content stays crisp */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/85 via-background/70 to-background/90"
      />

      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            {t.examples.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-foreground/80">
            {t.examples.subtitle}
          </p>
        </div>

        {/* ===== "Vezi domenii" trigger — always visible ===== */}
        <div className="mt-8 flex justify-center">
          <motion.button
            layout
            onClick={() => setView(view === "open" ? (active ? "selected" : "closed") : "open")}
            aria-expanded={view === "open"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold shadow-elev hover:opacity-90 transition-opacity"
          >
            <Globe className="size-4" />
            Vezi domenii
            <motion.span animate={{ rotate: view === "open" ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown className="size-4" />
            </motion.span>
          </motion.button>
        </div>

        {/* ===== SELECTOR (collapsible) ===== */}
        <AnimatePresence initial={false}>
          {(view === "open" || view === "selected") && (
            <motion.div
              key="selector-wrap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-5 flex justify-center">
                <LayoutGroup>
                  <motion.div
                    layout
                    transition={{ type: "spring", damping: 26, stiffness: 220 }}
                    className={`flex flex-wrap gap-2 justify-center px-1 ${view === "selected" ? "" : "max-w-3xl"}`}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {order.map((id) => {
                        const isActive = active === id;
                        if (view === "selected" && !isActive) return null;
                        return (
                          <motion.button
                            key={id}
                            layout="position"
                            layoutId={`cat-${id}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", damping: 22, stiffness: 280 }}
                            onClick={() => {
                              if (isActive && view === "selected") {
                                setView("open");
                              } else {
                                handleSelectCat(id);
                              }
                            }}
                            aria-pressed={isActive}
                            className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                              isActive
                                ? "bg-foreground text-background shadow-elev"
                                : "bg-secondary text-foreground/80 hover:bg-foreground/10"
                            }`}
                          >
                            {isActive && view === "selected" && (
                              <Check className="size-3.5" />
                            )}
                            {t.examples.cats[id].label}
                            {isActive && view === "selected" && (
                              <span className="ml-1 text-[10px] opacity-70 hidden sm:inline">· schimbă</span>
                            )}
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                </LayoutGroup>
              </div>

              {view === "open" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-center text-xs text-muted-foreground"
                >
                  Apasă pe un domeniu pentru a-l selecta
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== CARD EXEMPLU + FEATURES — only after a category is selected ===== */}
        <AnimatePresence mode="wait">
          {showCard && (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="mt-8 grid md:grid-cols-2 gap-6 items-stretch"
          >
            <article className="group rounded-3xl overflow-hidden bg-card border border-border/60 shadow-soft hover:shadow-elev transition-all duration-500 flex flex-col">
              {/* Image / mockup with overlay buttons */}
              <div className="relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden bg-muted">
                {liveExample?.image_path ? (
                  <img
                    src={publicImageUrl(liveExample.image_path)!}
                    alt={liveExample.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : Mockup ? (
                  <Mockup />
                ) : (
                  <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
                )}

                {/* Action buttons overlay (only when we have a real example in DB) */}
                {liveExample && (
                  <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col sm:flex-row gap-2 bg-gradient-to-t from-black/85 via-black/55 to-transparent">
                    {liveExample.external_url ? (
                      <a
                        href={liveExample.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-brand text-background font-semibold text-xs sm:text-sm shadow-elev hover:bg-brand/90 transition-all"
                      >
                        <ExternalLink className="size-3.5" />
                        Vezi exemplul
                      </a>
                    ) : liveExample.has_internal_demo && liveExample.internal_demo_path ? (
                      <Link
                        to={liveExample.internal_demo_path}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-brand text-background font-semibold text-xs sm:text-sm shadow-elev hover:bg-brand/90 transition-all"
                      >
                        <ExternalLink className="size-3.5" />
                        Vezi exemplul
                      </Link>
                    ) : null}

                    <button
                      onClick={() => setRequestSource(liveExample)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-background/95 text-foreground font-semibold text-xs sm:text-sm hover:bg-background transition-all"
                    >
                      <MessageSquarePlus className="size-3.5" />
                      Solicită asemănător
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                <span className="inline-block text-[10px] uppercase tracking-widest font-bold text-brand mb-2">
                  {currentCat.label}
                </span>
                <h3 className="font-display font-semibold text-xl leading-tight">
                  {liveExample?.title ?? current.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {liveExample?.description ?? current.benefit}
                </p>

                {liveExample?.display_url && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs font-mono text-foreground/70">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {liveExample.display_url}
                  </div>
                )}

                <p className="mt-3 text-xs text-muted-foreground/80 italic">
                  {currentCat.examples}
                </p>

                {/* Fallback for categories without a DB example yet — single CTA */}
                {!liveExample && (
                  <button
                    onClick={() =>
                      setRequestSource({
                        id: "",
                        slug: displayCat,
                        name: currentCat.label,
                        category: displayCat,
                        title: current.title,
                        description: current.benefit,
                        image_path: null,
                        external_url: null,
                        has_internal_demo: false,
                        internal_demo_path: null,
                        display_url: null,
                        sort_order: 0,
                      })
                    }
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <MessageSquarePlus className="size-3.5" />
                    Solicită un exemplu
                  </button>
                )}
              </div>
            </article>

            <div className="rounded-3xl bg-cardgrad border border-border/60 p-6 md:p-7 shadow-soft">
              <div className="text-[10px] uppercase tracking-widest font-bold text-brand mb-3">
                {t.examples.featuresLabel}
              </div>
              <h4 className="font-display font-semibold text-lg leading-tight mb-5">
                {t.examples.featuresTitle.replace("{cat}", currentCat.label.toLowerCase())}
              </h4>
              <ul className="space-y-3">
                {current.features.map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="mt-0.5 size-5 rounded-full bg-brand/10 text-brand grid place-items-center shrink-0">
                      <Check className="size-3" />
                    </span>
                    <span className="text-foreground/85">{f}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RequestExampleModal
        open={!!requestSource}
        onClose={() => setRequestSource(null)}
        source={
          requestSource
            ? {
                slug: requestSource.slug,
                name: requestSource.name,
                category: requestSource.category,
              }
            : null
        }
      />
    </section>
  );
};

export default Examples;
