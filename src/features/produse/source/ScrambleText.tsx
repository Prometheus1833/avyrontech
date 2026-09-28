import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ScrambleText — Avyron Products (avyron.ro/produse)
 * Textul se „decodează” din caractere aleatorii. Lățime stabilă (monospace).
 */

const SETS = {
  symbols: "!<>-_\\/[]{}—=+*^?#$%&@",
  binary: "01",
  hex: "0123456789ABCDEF",
  kana: "アイウエオカキクケコサシスセソタチツテトナニヌネノ",
} as const;

type Props = {
  text: string;
  charset?: keyof typeof SETS;
  trigger?: "hover" | "visible" | "loop";
  speed?: number;
};

export function ScrambleText({ text, charset = "symbols", trigger = "visible", speed = 1 }: Props) {
  const [output, setOutput] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  const run = useCallback(() => {
    cancelAnimationFrame(frame.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOutput(text);
      return;
    }
    const pool = SETS[charset];
    const start = performance.now();
    const total = (400 + text.length * 40) / speed;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / total);
      const revealed = Math.floor(progress * text.length);
      let next = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealed || text[i] === " ") next += text[i];
        else next += pool[Math.floor(Math.random() * pool.length)];
      }
      setOutput(next);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [text, charset, speed]);

  useEffect(() => {
    if (trigger === "hover") return;
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      run();
      if (trigger === "loop") timer = window.setInterval(run, 3200);
      observer.disconnect();
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      cancelAnimationFrame(frame.current);
    };
  }, [run, trigger]);

  return (
    <span
      ref={ref}
      aria-label={text}
      onPointerEnter={trigger === "hover" ? run : undefined}
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.04em", whiteSpace: "pre" }}
    >
      <span aria-hidden="true">{output}</span>
    </span>
  );
}

export default ScrambleText;
