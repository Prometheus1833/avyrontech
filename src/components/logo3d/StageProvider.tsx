import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Stage, ViewHandle, ViewParams } from "./engine/engine";
import type { MarkDraw } from "./engine/sdf";
import { CONCEPTS, STUDIO_MARK } from "./marks";
import { isRealBrowser } from "./utils";

type StageState = {
  stage: Stage | null;
  /** "pending" until the engine chunk has loaded; "off" when WebGL2 is missing or motion is reduced. */
  status: "pending" | "on" | "off";
  paused: boolean;
  setPaused: (paused: boolean) => void;
};

const StageContext = createContext<StageState>({
  stage: null,
  status: "off",
  paused: false,
  setPaused: () => undefined,
});

export const useStage = () => useContext(StageContext);

const PAUSE_KEY = "avyron:logo3d:paused";
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;


function readPaused() {
  try {
    return window.localStorage.getItem(PAUSE_KEY) === "1";
  } catch {
    return false;
  }
}

type Props = {
  children: ReactNode;
  /** Called with each new section palette; pass through for the background tint. */
  onReady?: (stage: Stage) => void;
};

export function StageProvider({ children, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [status, setStatus] = useState<StageState["status"]>("pending");
  const [paused, setPausedState] = useState(false);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    if (!isRealBrowser()) {
      setStatus("off");
      return;
    }
    const initialPaused = readPaused();
    setPausedState(initialPaused);
    document.documentElement.toggleAttribute("data-logo3d-paused", initialPaused);
    let alive = true;
    let created: Stage | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

    const boot = () => {
      import("./engine/engine")
        .then(({ Stage }) => {
          if (!alive || !canvasRef.current) return;
          // ?l3d=low|std|ultra forces a tier (QA on specific devices); save-data always means low.
          const forced = new URLSearchParams(window.location.search).get("l3d");
          const tier = saveData ? "low" : forced === "low" || forced === "std" || forced === "ultra" ? forced : undefined;
          created = Stage.create(canvasRef.current, { reducedMotion: reduced, tier, watch: forced === null });
          if (!created) {
            setStatus("off");
            document.documentElement.setAttribute("data-logo3d", "off");
            return;
          }
          created.defineMark("studio", STUDIO_MARK as MarkDraw);
          for (const c of CONCEPTS) created.defineMark(c.key, c.draw);
          created.setPaused(initialPaused);
          setStage(created);
          setStatus("on");
          (window as Window & { __avLogo3d?: () => unknown }).__avLogo3d = () => created?.info;
          document.documentElement.setAttribute("data-logo3d", "on");
          readyRef.current?.(created);
        })
        .catch(() => {
          if (!alive) return;
          setStatus("off");
          document.documentElement.setAttribute("data-logo3d", "off");
        });
    };

    // After the first paint and the loader, when the main thread is free.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const t = window.setTimeout(() => {
      if (w.requestIdleCallback) w.requestIdleCallback(boot, { timeout: 900 });
      else boot();
    }, 120);

    return () => {
      alive = false;
      window.clearTimeout(t);
      created?.destroy();
      document.documentElement.removeAttribute("data-logo3d");
      document.documentElement.removeAttribute("data-logo3d-paused");
    };
  }, []);

  const setPaused = useCallback(
    (next: boolean) => {
      setPausedState(next);
      stage?.setPaused(next);
      document.documentElement.toggleAttribute("data-logo3d-paused", next);
      try {
        window.localStorage.setItem(PAUSE_KEY, next ? "1" : "0");
      } catch {
        /* the toggle still works for this visit */
      }
    },
    [stage],
  );

  const value = useMemo(() => ({ stage, status, paused, setPaused }), [stage, status, paused, setPaused]);

  return (
    <StageContext.Provider value={value}>
      <canvas ref={canvasRef} aria-hidden className="l3d-canvas" />
      {children}
    </StageContext.Provider>
  );
}

type ViewProps = Partial<ViewParams> & {
  className?: string;
  label: string;
  /** Pointer inside the element tilts the logo (cards). */
  interactive?: boolean;
  /** Receives the handle for imperative updates (scroll-driven sections). */
  onHandle?: (h: ViewHandle | null) => void;
  /** Flat fallback shown until the engine is on (and instead of it when WebGL is off). */
  fallback?: ReactNode;
  children?: ReactNode;
};

/**
 * A rectangle of the page where the stage draws a logo.
 * The DOM element is only a placeholder: the pixels come from the shared canvas.
 */
export function LogoView({ className, label, interactive, onHandle, fallback, children, ...params }: ViewProps) {
  const { stage, status } = useStage();
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<ViewHandle | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const key = JSON.stringify(params);

  useIso(() => {
    if (!stage || !ref.current) return;
    const h = stage.addView(ref.current, paramsRef.current);
    handle.current = h;
    onHandle?.(h);
    return () => {
      h.destroy();
      handle.current = null;
      onHandle?.(null);
    };
  }, [stage]);

  useEffect(() => {
    handle.current?.set(paramsRef.current);
  }, [key]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !handle.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    handle.current.pointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1), true);
  };
  const onLeave = () => handle.current?.pointer(0, 0, false);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={`l3d-view ${className ?? ""}`}
      data-engine={status}
      onPointerMove={interactive ? onMove : undefined}
      onPointerLeave={interactive ? onLeave : undefined}
    >
      {fallback ? <div className="l3d-fallback">{fallback}</div> : null}
      {children}
    </div>
  );
}
