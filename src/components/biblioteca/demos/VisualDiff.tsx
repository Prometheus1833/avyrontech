import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: {
    compare: "Compară versiunile",
    diff: "diferențe",
    note: "Stânga: versiunea acceptată. Dreapta: build-ul următor. Roșu: ce s-a schimbat fără să ceară nimeni.",
  },
  en: {
    compare: "Compare the versions",
    diff: "differences",
    note: "Left: the approved version. Right: the next build. Red: what changed without anyone asking.",
  },
};

/**
 * QAT-S1 — diff vizual cu hartă de căldură.
 *
 * Desenăm două versiuni ale aceluiași ecran, una cu regresia strecurată, apoi
 * comparăm pixel cu pixel și marcăm diferențele. Asta e QA făcut vizibil:
 * clientul vede exact ce ar fi ajuns în producție.
 */
export default function VisualDiff() {
  const { lang } = useLang();
  const t = COPY[lang];
  const beforeRef = useRef<HTMLCanvasElement | null>(null);
  const afterRef = useRef<HTMLCanvasElement | null>(null);
  const heatRef = useRef<HTMLCanvasElement | null>(null);
  const [split, setSplit] = useState(50);
  const [heat, setHeat] = useState(true);

  useEffect(() => {
    const W = 520;
    const H = 260;

    const paint = (ctx: CanvasRenderingContext2D, broken: boolean) => {
      ctx.fillStyle = "#0d1017";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#161b26";
      ctx.fillRect(0, 0, W, 34);
      ctx.fillStyle = "#5b6478";
      ctx.fillRect(16, 13, 52, 8);
      ctx.fillRect(W - 120, 13, 34, 8);
      ctx.fillRect(W - 76, 13, 34, 8);

      ctx.fillStyle = "#1b2230";
      ctx.fillRect(16, 52, 300, 14);
      ctx.fillRect(16, 74, 220, 10);

      // Butonul principal: în versiunea cu regresie își pierde culoarea și se mută.
      ctx.fillStyle = broken ? "#2a3040" : "#e0a24a";
      ctx.fillRect(16, broken ? 108 : 100, broken ? 96 : 128, 30);

      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#141a24";
        ctx.fillRect(16 + i * 168, 160, 152, 76);
        ctx.fillStyle = "#222b3a";
        ctx.fillRect(28 + i * 168, 172, 96, 9);
        // În versiunea stricată, al treilea card pierde prețul.
        if (!(broken && i === 2)) {
          ctx.fillStyle = "#39465c";
          ctx.fillRect(28 + i * 168, 210, 54, 9);
        }
      }
    };

    const before = beforeRef.current?.getContext("2d");
    const after = afterRef.current?.getContext("2d");
    const heatCtx = heatRef.current?.getContext("2d");
    if (!before || !after || !heatCtx) return;

    paint(before, false);
    paint(after, true);

    const a = before.getImageData(0, 0, W, H);
    const b = after.getImageData(0, 0, W, H);
    const out = heatCtx.createImageData(W, H);

    for (let i = 0; i < a.data.length; i += 4) {
      const delta =
        Math.abs(a.data[i] - b.data[i]) +
        Math.abs(a.data[i + 1] - b.data[i + 1]) +
        Math.abs(a.data[i + 2] - b.data[i + 2]);
      if (delta > 24) {
        out.data[i] = 255;
        out.data[i + 1] = 64;
        out.data[i + 2] = 104;
        out.data[i + 3] = Math.min(210, 70 + delta);
      }
    }
    heatCtx.putImageData(out, 0, 0);
  }, []);

  return (
    <div className="p-6">
      <div className="relative overflow-hidden rounded-lg border border-white/12">
        <canvas ref={afterRef} width={520} height={260} className="block h-auto w-full" />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
          <canvas
            ref={beforeRef}
            width={520}
            height={260}
            className="block h-auto"
            style={{ width: `${10000 / split}%`, maxWidth: "none" }}
          />
        </div>
        <canvas
          ref={heatRef}
          width={520}
          height={260}
          className="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300"
          style={{ opacity: heat ? 1 : 0 }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-white/70"
          style={{ left: `${split}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(event) => setSplit(Number(event.target.value))}
          aria-label={t.compare}
          className="h-1 flex-1 cursor-pointer appearance-none rounded bg-white/20 accent-white"
        />
        <button
          type="button"
          onClick={() => setHeat((v) => !v)}
          aria-pressed={heat}
          className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
            heat ? "border-rose-400 text-rose-300" : "border-white/20 text-white/55"
          }`}
        >
          {t.diff}
        </button>
      </div>
      <p className="mt-3 text-xs text-white/45">
        {t.note}
      </p>
    </div>
  );
}
