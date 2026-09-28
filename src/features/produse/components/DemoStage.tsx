import { Suspense, useEffect, useRef, useState } from "react";
import { DEMOS } from "../demos/registry";
import type { CatalogItem, PropValues } from "../data/types";
import { isRealBrowser, reducedMotion } from "../lib/capability";

/**
 * Scena unui produs.
 *
 * Trei reguli: demo-ul se încarcă abia când intră în ecran (import dinamic),
 * se oprește când iese, iar până atunci se vede un poster procedural generat
 * din nuanța produsului — deci grila nu are nici goluri, nici imagini de
 * descărcat. În prerender și pe „mișcare redusă” rămâne doar posterul.
 */

export function Poster({ item, label }: { item: CatalogItem; label?: string }) {
  const hue = item.hue;
  return (
    <div
      aria-hidden={!label}
      className="relative grid h-full w-full place-items-center overflow-hidden"
      style={{
        background: `radial-gradient(120% 90% at 22% 12%, hsl(${hue} 85% 42% / .55), transparent 60%),
                     radial-gradient(90% 80% at 85% 85%, hsl(${(hue + 45) % 360} 90% 45% / .4), transparent 62%),
                     linear-gradient(140deg, #0a0b12, #0f1120)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `linear-gradient(hsl(${hue} 90% 80% / .5) 1px, transparent 1px), linear-gradient(90deg, hsl(${hue} 90% 80% / .5) 1px, transparent 1px)`,
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(70% 60% at 50% 45%, #000, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 45%, #000, transparent 75%)",
        }}
      />
      {label && <p className="relative px-4 text-center text-[11px] text-white/50">{label}</p>}
    </div>
  );
}

export default function DemoStage({
  item,
  values,
  lang,
  /** Grila montează demo-ul doar la hover/focus; pagina de produs îl ține activ. */
  eager = false,
  className = "",
  posterNote,
  paused = false,
}: {
  item: CatalogItem;
  values: PropValues;
  lang: "ro" | "en";
  eager?: boolean;
  className?: string;
  posterNote?: string;
  /** Pagina de produs poate pune demo-ul pe pauză din bara de sub scenă. */
  paused?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(eager);
  const Demo = item.demo ? DEMOS[item.demo] : undefined;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting && eager) setMounted(true);
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);

  const canRun = Boolean(Demo) && isRealBrowser() && !reducedMotion();

  return (
    <div
      ref={ref}
      // `dark` pe scenă: demo-urile sunt scrise pentru fundal întunecat, iar
      // pagina poate fi în temă deschisă. Așa arată identic în ambele teme.
      className={`dark relative overflow-hidden bg-[#07080d] ${className}`}
      onPointerEnter={() => canRun && setMounted(true)}
      onFocus={() => canRun && setMounted(true)}
    >
      {(!mounted || !canRun) && <Poster item={item} label={!canRun && posterNote ? posterNote : undefined} />}
      {mounted && canRun && Demo && (
        <div className="absolute inset-0">
          <Suspense fallback={<Poster item={item} />}>
            <Demo values={values} lang={lang} active={visible && !paused} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
