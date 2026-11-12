import { Suspense, useEffect, useRef, useState } from "react";
import { DEMOS } from "../demos/registry";
import type { CatalogItem, PropValues } from "../data/types";
import { isRealBrowser, reducedMotion } from "../lib/capability";

import ProductPoster from "./ProductPoster";

/** Keep the static preview visible until a live demo is ready. */
export default function DemoStage({
  item,
  values,
  lang,
  /** Pagina produsului poate încărca demo-ul la intrarea în ecran. */
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
  const [mounted, setMounted] = useState(false);
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
      {(!mounted || !canRun) && <ProductPoster item={item} eager={eager} note={!canRun ? posterNote : undefined} />}
      {mounted && canRun && Demo && (
        <div className="absolute inset-0">
          <Suspense fallback={<ProductPoster item={item} eager={eager} />}>
            <Demo values={values} lang={lang} active={visible && !paused} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
