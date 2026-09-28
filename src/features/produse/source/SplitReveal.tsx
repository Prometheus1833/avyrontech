import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * SplitReveal — Avyron Products (avyron.ro/produse)
 * Textul real rămâne în DOM (SEO + cititoare de ecran); animăm doar copiile
 * vizuale aria-hidden, literă cu literă, pornite la scroll.
 */

gsap.registerPlugin(ScrollTrigger);

type Props = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  stagger?: number;
  blur?: number;
  className?: string;
  /** "scroll" pornește la intrarea în ecran, "mount" imediat. */
  trigger?: "scroll" | "mount";
};

export function SplitReveal({ text, as: Tag = "h2", stagger = 0.035, blur = 12, className, trigger = "scroll" }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const chars = root.querySelectorAll<HTMLElement>("[data-char]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(chars, { opacity: 1, filter: "none", y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        chars,
        { opacity: 0, y: "0.35em", filter: `blur(${blur}px)` },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.9,
          ease: "power3.out",
          stagger,
          scrollTrigger: trigger === "scroll" ? { trigger: root, start: "top 85%" } : undefined,
        },
      );
    }, root);
    return () => ctx.revert();
  }, [text, stagger, blur, trigger]);

  return (
    <Tag ref={ref as never} className={className} style={{ position: "relative" }}>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{text}</span>
      <span aria-hidden="true">
        {text.split(" ").map((word, w) => (
          <span key={w} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {Array.from(word).map((char, c) => (
              <span key={c} data-char style={{ display: "inline-block", willChange: "transform, filter, opacity" }}>
                {char}
              </span>
            ))}
            {" "}
          </span>
        ))}
      </span>
    </Tag>
  );
}

export default SplitReveal;
