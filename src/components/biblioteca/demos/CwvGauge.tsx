import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const METRICS = [
  {
    key: "LCP", value: 1.6, max: 4, unit: "s", good: 2.5,
    note: {
      ro: "Cât durează până apare elementul principal. Peste 2,5 s, vizitatorul începe să se întrebe dacă merge site-ul.",
      en: "How long until the main element shows. Past 2.5 s, the visitor starts wondering whether the site works.",
    },
  },
  {
    key: "INP", value: 142, max: 500, unit: "ms", good: 200,
    note: {
      ro: "Cât așteaptă după ce apasă. Peste 200 ms, apasă din nou — și îți dublează comenzile sau formularele.",
      en: "How long they wait after tapping. Past 200 ms they tap again — and duplicate your orders or form entries.",
    },
  },
  {
    key: "CLS", value: 0.02, max: 0.25, unit: "", good: 0.1,
    note: {
      ro: "Cât sare layout-ul în timpul încărcării. Peste 0,1, oamenii apasă pe altceva decât voiau.",
      en: "How much the layout jumps while loading. Past 0.1, people tap something other than what they meant.",
    },
  },
];

const HINT = {
  ro: "Treci peste o metrică: îți spune ce înseamnă în clienți pierduți, nu în puncte.",
  en: "Hover a metric: it tells you what it means in lost customers, not in points.",
};

/**
 * QAT-S4 — Core Web Vitals explicate.
 *
 * Nu afișăm doar cifra: la hover, fiecare metrică spune ce pierde clientul
 * dacă e roșie. Un scor fără traducere în bani nu convinge pe nimeni.
 */
export default function CwvGauge() {
  const { lang } = useLang();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / 1100);
          setProgress(t * t * (3 - 2 * t));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const shown = METRICS.find((m) => m.key === active) ?? null;

  return (
    <div ref={hostRef} className="min-h-[260px] p-6">
      <div className="grid grid-cols-3 gap-4">
        {METRICS.map((metric) => {
          const ratio = Math.min(1, metric.value / metric.max) * progress;
          const ok = metric.value <= metric.good;
          const circumference = 2 * Math.PI * 34;
          return (
            <button
              key={metric.key}
              type="button"
              onPointerEnter={() => setActive(metric.key)}
              onFocus={() => setActive(metric.key)}
              onPointerLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              className="flex flex-col items-center gap-2 rounded-lg p-2 transition-colors hover:bg-white/[0.04]"
            >
              <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none" strokeWidth="6" strokeLinecap="round"
                  stroke={ok ? "#4ade80" : "#f87171"}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - ratio)}
                />
              </svg>
              <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">{metric.key}</span>
              <span className="font-mono text-sm tabular-nums text-white">
                {(metric.value * progress).toFixed(metric.key === "CLS" ? 2 : metric.key === "LCP" ? 1 : 0)}
                {metric.unit}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 min-h-[3rem] text-sm text-white/60">
        {shown ? shown.note[lang] : HINT[lang]}
      </p>
    </div>
  );
}
