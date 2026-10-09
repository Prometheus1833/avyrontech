import { lazyWithRetry } from "@/lib/lazyWithRetry";
import {
  Suspense,

  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { detectTier, type QualityTier } from "@/lib/stage/capability";

/** Contractul pe care îl respectă orice efect din bibliotecă. */
export type StageEffectProps = {
  /** Treapta de calitate decisă pentru dispozitivul curent. */
  tier: QualityTier;
  /** Fals când secțiunea a ieșit din ecran: efectul își oprește bucla. */
  active: boolean;
  /** Apelat când efectul chiar a desenat primul cadru. */
  onReady?: () => void;
};

type StageSlotProps = {
  /** Ce se vede întotdeauna, inclusiv fără WebGL sau în HTML-ul prerenderat. */
  poster: ReactNode;
  /** Efectul, ca import dinamic — ajunge în chunk-ul 3D, nu în bundle-ul inițial. */
  load: () => Promise<{ default: ComponentType<StageEffectProps> }>;
  className?: string;
  /** Cât de devreme înainte de viewport pregătim efectul. */
  rootMargin?: string;
};

/**
 * Locul în care un efect 3D înlocuiește un poster static.
 *
 * Regulile pe care le impune, ca pagina să rămână în bugetul de performanță:
 * posterul e mereu în DOM, efectul se încarcă doar când secțiunea se apropie,
 * bucla de randare se oprește când secțiunea iese din ecran, iar pe dispozitive
 * fără WebGL2 sau cu mișcare redusă efectul nu se cere niciodată.
 */
export default function StageSlot({
  poster,
  load,
  className,
  rootMargin = "300px",
}: StageSlotProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [tier] = useState<QualityTier>(() => detectTier());
  const [near, setNear] = useState(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [Effect, setEffect] = useState<ComponentType<StageEffectProps> | null>(null);

  const handleReady = useCallback(() => setReady(true), []);

  // Apropierea de viewport pregătește efectul; intrarea efectivă îl pornește.
  //
  // Depărtarea îl demontează: un context WebGL e o resursă limitată de browser,
  // iar pagina are opt secțiuni. Ținem cel mult efectul curent și vecinii lui,
  // cu o întârziere ca scroll-ul rapid înainte și înapoi să nu recreeze scena.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || tier === "none" || typeof IntersectionObserver === "undefined") return;

    let release: number | undefined;
    const prepare = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(release);
        if (entry.isIntersecting) {
          setNear(true);
          return;
        }
        release = window.setTimeout(() => {
          setNear(false);
          setReady(false);
        }, 2500);
      },
      { rootMargin },
    );
    const run = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.01 },
    );
    prepare.observe(host);
    run.observe(host);
    return () => {
      window.clearTimeout(release);
      prepare.disconnect();
      run.disconnect();
    };
  }, [tier, rootMargin]);

  useEffect(() => {
    if (!near) return;
    if (Effect) return;
    // lazyWithRetry() memorează promisiunea, deci chunk-ul se cere o singură dată,
    // chiar dacă efectul e montat și demontat de mai multe ori.
    const Loaded = lazyWithRetry(load);
    setEffect(() => Loaded);
  }, [near, Effect, load]);

  return (
    <div
      ref={hostRef}
      data-tier={tier}
      className={cn("relative isolate overflow-hidden", className)}
    >
      <div
        aria-hidden={ready}
        className={cn(
          "h-full w-full transition-opacity duration-700 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      >
        {poster}
      </div>

      {Effect && near && (
        <Suspense fallback={null}>
          <div className="pointer-events-auto absolute inset-0">
            <Effect tier={tier} active={active} onReady={handleReady} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
