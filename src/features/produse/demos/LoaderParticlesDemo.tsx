import { useEffect, useState } from "react";
import Preloader from "../components/Preloader";
import type { DemoProps } from "./registry";

/** Chiar preloaderul paginii, rulat în cadru, cu buton de reluare. */
export default function LoaderParticlesDemo({ lang, active }: DemoProps) {
  const ro = lang === "ro";
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    setDone(false);
    setRun((r) => r + 1);
  }, [active]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[hsl(228_16%_6%)]">
      {!done && (
        <div className="absolute inset-0 [&>div]:absolute [&>div]:inset-0">
          <Preloader key={run} lang={ro ? "ro" : "en"} onDone={() => setDone(true)} />
        </div>
      )}
      {done && (
        <div className="grid h-full place-items-center">
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem("avyron-produse-seen");
              } catch {
                /* fără storage: rulează oricum varianta scurtă */
              }
              setDone(false);
              setRun((r) => r + 1);
            }}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80"
          >
            {ro ? "Rulează din nou" : "Play again"}
          </button>
        </div>
      )}
    </div>
  );
}
