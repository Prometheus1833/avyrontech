import { useEffect } from "react";
import { detectTier, motionProfile, resetTierCache } from "@/lib/stage/capability";

/** Expune bugetul vizual în DOM, inclusiv pentru CSS și testele pe device. */
export default function PerformanceGovernor() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      resetTierCache();
      const profile = motionProfile(detectTier());
      root.dataset.motionTier = profile.tier;
      root.dataset.motionFps = String(profile.targetFps);
      root.dataset.postProcessing = profile.postProcessing ? "on" : "off";
    };

    apply();
    reduced.addEventListener("change", apply);
    return () => reduced.removeEventListener("change", apply);
  }, []);

  return null;
}
