import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Hand, Pause } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import type { SubscriptionCategory, SubscriptionPlan } from "@/data/subscriptionPlans";
import { useDualPrice } from "@/hooks/useDualPrice";
import PlanCard from "./PlanCard";
import PlanMiniDash from "./PlanMiniDash";

/** Viteza benzii, în pixeli pe secundă — lentă cât să se poată citi. */
const SPEED = 40;
/** Peste atâția pixeli mișcarea e considerată tragere, nu apăsare. */
const DRAG_THRESHOLD = 8;

type Props = {
  category: SubscriptionCategory;
  onSelect: (plan: SubscriptionPlan, category: SubscriptionCategory) => void;
};

const PlanCarousel = ({ category, onSelect }: Props) => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { primary, secondary, converted } = useDualPrice(ro ? "ro-RO" : "en-IE");
  const theme = category.theme;

  const wrapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const setWidthRef = useRef(0);
  const pausedRef = useRef(false);
  const draggedRef = useRef(false);
  const pressRef = useRef<{ x: number; offset: number; moved: number } | null>(null);

  const [enhanced, setEnhanced] = useState(false);
  const [repeats, setRepeats] = useState(3);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [caretX, setCaretX] = useState<number | undefined>(undefined);
  const [held, setHeld] = useState(false);

  const applyOffset = useCallback(() => {
    const track = trackRef.current;
    const width = setWidthRef.current;
    if (!track || width <= 0) return;
    let offset = offsetRef.current % width;
    if (offset < 0) offset += width;
    offsetRef.current = offset;
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
  }, []);

  // Banda pornește doar în browser: HTML-ul preluat de crawleri rămâne o listă
  // simplă, cu toate cele trei abonamente vizibile.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEnhanced(true);
  }, []);

  useEffect(() => {
    if (!enhanced) return;
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;

    const measure = () => {
      const width = track.scrollWidth / repeats;
      if (!width) return;
      setWidthRef.current = width;
      const needed = Math.max(3, Math.ceil((viewport.clientWidth * 2) / width) + 1);
      if (needed !== repeats) setRepeats(needed);
      applyOffset();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [enhanced, repeats, applyOffset, lang]);

  useEffect(() => {
    if (!enhanced) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const delta = Math.min(64, now - last);
      last = now;
      if (!pausedRef.current && !document.hidden) {
        offsetRef.current += (SPEED * delta) / 1000;
        applyOffset();
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [enhanced, applyOffset]);

  useEffect(() => {
    pausedRef.current = held || openKey !== null;
  }, [held, openKey]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enhanced || event.button !== 0) return;
    pressRef.current = { x: event.clientX, offset: offsetRef.current, moved: 0 };
    draggedRef.current = false;
    setHeld(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    if (!press) return;
    const dx = event.clientX - press.x;
    press.moved = Math.max(press.moved, Math.abs(dx));
    if (press.moved > DRAG_THRESHOLD) {
      draggedRef.current = true;
      offsetRef.current = press.offset - dx;
      applyOffset();
    }
  };

  const endPress = () => {
    pressRef.current = null;
    setHeld(false);
  };

  const openPlan = (plan: SubscriptionPlan, element: HTMLElement | null) => {
    if (openKey === plan.key) {
      setOpenKey(null);
      return;
    }
    const wrap = wrapRef.current;
    if (element && wrap) {
      const card = element.getBoundingClientRect();
      const box = wrap.getBoundingClientRect();
      setCaretX(card.left + card.width / 2 - box.left);
    }
    setOpenKey(plan.key);
  };

  const openPlanData = category.plans.find((plan) => plan.key === openKey) ?? null;
  const copies = enhanced ? repeats : 1;

  return (
    <div ref={wrapRef} className="relative">
      <div
        ref={viewportRef}
        data-testid={`plan-carousel-${category.key}`}
        className={`relative ${enhanced ? "overflow-hidden" : "overflow-x-auto"} py-3`}
        style={{
          maskImage: "linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%)",
          touchAction: "pan-y",
          cursor: enhanced ? (held ? "grabbing" : "grab") : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onPointerLeave={endPress}
        onClickCapture={(event) => {
          if (!draggedRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          draggedRef.current = false;
        }}
      >
        <div ref={trackRef} className="flex w-max gap-4 will-change-transform" style={{ transform: "translate3d(0,0,0)" }}>
          {Array.from({ length: copies }).flatMap((_, copy) =>
            category.plans.map((plan) => (
              <article
                key={`${plan.key}-${copy}`}
                data-plan-key={plan.key}
                aria-hidden={copy > 0 ? true : undefined}
                className="w-[19rem] shrink-0 sm:w-[21rem]"
              >
                <PlanCard
                  plan={plan}
                  category={category}
                  active={openKey === plan.key}
                  duplicate={copy > 0}
                  price={primary(plan.priceCents)}
                  secondaryPrice={secondary(plan.priceCents)}
                  converted={converted}
                  onOpen={openPlan}
                />
              </article>
            )),
          )}
        </div>
      </div>

      <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
        <span className="inline-flex items-center gap-1.5">
          <Pause className="size-3" aria-hidden />
          {ro ? "ține apăsat ca să oprești" : "hold to pause"}
        </span>
        <span aria-hidden className="hidden size-1 rounded-full bg-foreground/25 sm:block" />
        <span className="inline-flex items-center gap-1.5">
          <Hand className="size-3" aria-hidden />
          {ro ? "apasă pentru detalii" : "tap for details"}
        </span>
      </p>

      {openPlanData && (
        <PlanMiniDash
          plan={openPlanData}
          category={category}
          caretX={caretX}
          onClose={() => setOpenKey(null)}
          onSelect={onSelect}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {category.plans.map((plan) => (
          <button
            key={`jump-${plan.key}`}
            type="button"
            onClick={() => setOpenKey(openKey === plan.key ? null : plan.key)}
            aria-pressed={openKey === plan.key}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-300 ${
              openKey === plan.key
                ? `${theme.border} bg-foreground/[0.08] ${theme.text}`
                : "border-foreground/12 text-foreground/60 hover:-translate-y-0.5 hover:bg-foreground/[0.06] hover:text-foreground"
            }`}
          >
            {plan.name}
            <span className="font-mono text-[10px] tabular-nums text-foreground/45">{primary(plan.priceCents)}</span>
          </button>
        ))}
        {category.productPath && (
          <Link
            to={category.productPath[lang]}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 px-3 py-1.5 text-[11px] font-semibold text-foreground/60 transition-all duration-300 hover:-translate-y-0.5 hover:bg-foreground/[0.06] hover:text-foreground"
          >
            {ro ? "Vezi produsul" : "See the product"}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
};

export default PlanCarousel;
