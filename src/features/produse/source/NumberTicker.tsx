import { useEffect, useRef, useState } from "react";

/**
 * NumberTicker — Avyron Products (avyron.ro/produse)
 * Numără până la valoare când intră în ecran. Formatare Intl (lei, €, %).
 */

type Props = {
  value: number;
  duration?: number;
  locale?: string;
  format?: Intl.NumberFormatOptions;
};

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function NumberTicker({ value, duration = 1.6, locale = "ro-RO", format }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / (duration * 1000));
        setShown(value * easeOutExpo(t));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, ...format });
  return (
    <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }} aria-label={formatter.format(value)}>
      <span aria-hidden="true">{formatter.format(shown)}</span>
    </span>
  );
}

export default NumberTicker;
