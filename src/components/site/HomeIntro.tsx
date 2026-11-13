import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight } from "lucide-react";
import mark from "@/assets/avyron-mark-ai.png";
import { detectTier, isRealBrowser, motionProfile, type QualityTier } from "@/lib/stage/capability";
import { runHomeIntroScene } from "./homeIntroScene";
import "./home-intro.css";

type IntroTheme = "home" | "maintenance";
const played = new Set<IntroTheme>();
const motionQuery = "(prefers-reduced-motion: reduce)";

export default function HomeIntro({ ro, hash, theme = "home", skipOnEntry = false }: {
  ro: boolean;
  hash: string;
  theme?: IntroTheme;
  skipOnEntry?: boolean;
}) {
  const [scene, setScene] = useState<{ duration: number; tier: QualityTier } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  const skipInitially = useRef(Boolean(hash) || skipOnEntry);
  useEffect(() => {
    if ((played.has(theme) && !started.current) || skipInitially.current || !isRealBrowser() || document.hidden || window.scrollY > 24) return;
    const reduced = matchMedia(motionQuery);
    const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (
      reduced.matches ||
      connection?.saveData ||
      document.activeElement !== document.body
    ) return;

    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation) {
      // Never cover a page people have already started reading on a slow load.
      const documentPath = new URL(navigation.name).pathname;
      if (
        documentPath === location.pathname &&
        (navigation.type !== "navigate" || performance.now() > 950)
      ) return;
    }

    const tier = detectTier();
    const time = tier === "ultra" || tier === "standard" ? 1650 : 1250;
    started.current = true;
    played.add(theme);
    setScene({ duration: time, tier });
  }, [theme]);

  useEffect(() => {
    if (!scene) return;
    const dismiss = () => setScene(null);
    if (hash) {
      dismiss();
      return;
    }
    const reduced = matchMedia(motionQuery);
    const stopScene = canvas.current && runHomeIntroScene(canvas.current, motionProfile(scene.tier), scene.duration, theme);
    const timeout = window.setTimeout(dismiss, scene.duration);
    const visibility = () => { if (document.hidden) dismiss(); };
    const preference = () => { if (reduced.matches) dismiss(); };
    const onSkip = (event: Event) => event.target instanceof Node && skip.current?.contains(event.target);
    const interact = (event: Event) => {
      if (!onSkip(event)) dismiss();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || !onSkip(event)) dismiss();
    };
    const gestures = ["pointerdown", "touchstart", "wheel", "scroll"] as const;
    for (const event of gestures)
      window.addEventListener(event, interact, { passive: true, capture: true });
    window.addEventListener("keydown", keydown, true);
    window.addEventListener("pagehide", dismiss);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", preference);
    return () => {
      if (stopScene) stopScene();
      clearTimeout(timeout);
      for (const event of gestures) window.removeEventListener(event, interact, true);
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("pagehide", dismiss);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", preference);
    };
  }, [scene, hash, theme]);

  if (!scene || hash) return null;
  return createPortal(
    <div
      className="avy-home-intro"
      data-testid={theme === "home" ? "home-intro" : "maintenance-intro"}
      data-intro-theme={theme}
      data-intro-tier={scene.tier}
      style={{ "--avy-home-intro-time": `${scene.duration}ms` } as CSSProperties}
    >
      <div className="avy-home-intro__scene" aria-hidden="true">
        <div className="avy-home-intro__light" />
        <canvas ref={canvas} className="avy-home-intro__canvas" />
      </div>
      <div className="avy-home-intro__identity" aria-hidden="true">
        <img src={mark} alt="" width={256} height={256} decoding="async" />
        <span>{theme === "home" ? "AVYRON" : ro ? "Abonamente AVYRON" : "AVYRON Plans"}</span>
        <div className="avy-home-intro__track" />
      </div>
      <button ref={skip} type="button" onClick={() => setScene(null)} className="avy-home-intro__skip">
        {ro ? "Omite introducerea" : "Skip introduction"}
        <ArrowUpRight size={15} aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}
