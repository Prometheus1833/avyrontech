import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import StageSlot from "@/components/biblioteca/StageSlot";
import { DEMO_LOADERS, WEBGL_LOADERS } from "@/components/biblioteca/demos/registry";
import { isRealBrowser } from "@/lib/stage/capability";
import type { LibraryEffect } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";

type Props = {
  effect: LibraryEffect;
  lang: Lang;
  /** Raportează ce demo e sub ochii utilizatorului, pentru notificări. */
  onFocusChange?: (code: string | null) => void;
};

/**
 * Rama unui demo live.
 *
 * Ține prezentarea comună (nume, explicație) și alege calea de montare:
 * WebGL prin StageSlot, restul direct. Până când demo-ul se încarcă, locul e
 * ocupat de un panou cu aceeași înălțime, deci nu sare layout-ul.
 */
export default function DemoFrame({ effect, lang, onFocusChange }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [Demo, setDemo] = useState<ComponentType | null>(null);
  const [near, setNear] = useState(false);

  const webglLoader = effect.demo ? WEBGL_LOADERS[effect.demo] : undefined;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !isRealBrowser()) return;

    const prepare = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNear(true),
      { rootMargin: "400px" },
    );
    const focus = new IntersectionObserver(
      ([entry]) => onFocusChange?.(entry.isIntersecting ? effect.code : null),
      { threshold: 0.6 },
    );
    prepare.observe(host);
    focus.observe(host);
    return () => {
      prepare.disconnect();
      focus.disconnect();
    };
  }, [effect.code, onFocusChange]);

  useEffect(() => {
    if (!near || Demo || webglLoader || !effect.demo) return;
    const loader = DEMO_LOADERS[effect.demo];
    if (!loader) return;
    setDemo(() => lazyWithRetry(loader));
  }, [near, Demo, effect.demo, webglLoader]);

  return (
    <figure
      ref={hostRef}
      className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0c12]/80 backdrop-blur-md"
    >
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/10 px-5 py-3">
        <h4 className="text-sm font-semibold text-white">{effect.name[lang]}</h4>
        <p className="w-full text-xs text-white/50">{effect.desc[lang]}</p>
      </figcaption>

      <div className="relative">
        {webglLoader ? (
          <StageSlot
            className="h-[360px] w-full"
            load={webglLoader}
            poster={
              <div
                className="flex h-full w-full items-end p-5"
                style={{
                  background:
                    "radial-gradient(120% 90% at 20% 10%, hsla(265,60%,28%,0.55), transparent 60%), radial-gradient(90% 80% at 85% 60%, hsla(200,70%,26%,0.45), transparent 65%), #090b11",
                }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                  {lang === "ro" ? "se pregătește scena…" : "preparing the scene…"}
                </span>
              </div>
            }
          />
        ) : Demo ? (
          <Suspense fallback={<div className="min-h-[240px]" />}>
            <Demo />
          </Suspense>
        ) : (
          <div className="min-h-[240px]" aria-hidden="true" />
        )}
      </div>
    </figure>
  );
}
