import { useEffect, useState } from "react";
import CounterLoader from "../source/CounterLoader";
import type { DemoProps } from "./registry";

export default function LoaderCounterDemo({ lang, active }: DemoProps) {
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (active) {
      setDone(false);
      setRun((r) => r + 1);
    }
  }, [active]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#0b0d16]">
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="text-sm text-white/70">{lang === "ro" ? "Pagina de sub cortină" : "The page under the curtain"}</p>
          {done && (
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setRun((r) => r + 1);
              }}
              className="mt-3 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80"
            >
              {lang === "ro" ? "Rulează din nou" : "Play again"}
            </button>
          )}
        </div>
      </div>
      {!done && <CounterLoader key={run} duration={1500} label="AVYRON" onDone={() => setDone(true)} />}
    </div>
  );
}
