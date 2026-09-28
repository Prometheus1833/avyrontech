import { useEffect, useState } from "react";
import type { DemoProps } from "./registry";

type State = "idle" | "notification" | "call" | "progress";

/** Pastila care se transformă între patru stări, cu arcuri pe dimensiuni. */
export default function DynamicIslandDemo({ lang, active }: DemoProps) {
  const ro = lang === "ro";
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;
    const order: State[] = ["idle", "notification", "progress", "call"];
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % order.length;
      setState(order[index]);
      setProgress(0);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (state !== "progress") return;
    const timer = window.setInterval(() => setProgress((p) => Math.min(1, p + 0.08)), 200);
    return () => window.clearInterval(timer);
  }, [state]);

  const size: Record<State, { w: number; h: number; r: number }> = {
    idle: { w: 112, h: 30, r: 15 },
    notification: { w: 250, h: 52, r: 26 },
    call: { w: 230, h: 64, r: 30 },
    progress: { w: 210, h: 48, r: 24 },
  };
  const s = size[state];

  return (
    <div className="grid h-full w-full place-items-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex items-center gap-2.5 overflow-hidden bg-black px-3 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,.9)]"
          style={{
            width: s.w,
            height: s.h,
            borderRadius: s.r,
            transition: "width .55s cubic-bezier(.34,1.56,.64,1), height .55s cubic-bezier(.34,1.56,.64,1), border-radius .5s ease",
          }}
        >
          {state === "idle" && <span aria-hidden className="mx-auto size-2 rounded-full bg-white/25" />}
          {state === "notification" && (
            <>
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold">A</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">{ro ? "Comandă nouă" : "New order"}</span>
                <span className="block truncate text-[10.5px] text-white/55">{ro ? "Pachet Premium · 1.500 lei" : "Premium pack · 1,500 lei"}</span>
              </span>
            </>
          )}
          {state === "call" && (
            <>
              <span aria-hidden className="size-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">Avyron</span>
                <span className="block text-[10.5px] text-white/55">{ro ? "apel în curs 00:12" : "on call 00:12"}</span>
              </span>
              <span aria-hidden className="grid size-7 place-items-center rounded-full bg-red-500 text-xs">✕</span>
            </>
          )}
          {state === "progress" && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-semibold">{ro ? "Se încarcă" : "Uploading"}</span>
                <span className="mt-1 block h-1 overflow-hidden rounded bg-white/15">
                  <span className="block h-full rounded bg-gradient-to-r from-brand to-brand-2 transition-all duration-200" style={{ width: `${progress * 100}%` }} />
                </span>
              </span>
              <span className="pa-mono shrink-0 text-[11px] tabular-nums text-white/70">{Math.round(progress * 100)}%</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {(["idle", "notification", "call", "progress"] as State[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setState(option);
                setProgress(0);
              }}
              aria-pressed={state === option}
              className={`rounded-full px-2.5 py-1 text-[11px] transition ${state === option ? "bg-white/20 text-white" : "bg-white/[0.06] text-white/60"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
