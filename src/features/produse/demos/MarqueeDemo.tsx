import ScrollMarquee from "../source/ScrollMarquee";
import { Stage } from "./_shell";
import { bool, num } from "./_props";
import type { DemoProps } from "./registry";

const WORDS = ["React", "Three.js", "GSAP", "Tailwind", "WebGL2", "TypeScript", "Vite", "Cloudflare"];

export default function MarqueeDemo({ values }: DemoProps) {
  return (
    <Stage pad={false}>
      <div className="w-full">
        <ScrollMarquee speed={num(values.speed, 1)} reverse={bool(values.reverse, false)} gap={32}>
          {WORDS.map((w) => (
            <span key={w} className="pa-mono whitespace-nowrap text-sm uppercase tracking-[0.2em] text-white/70">
              {w} <span className="text-brand">◆</span>
            </span>
          ))}
        </ScrollMarquee>
      </div>
    </Stage>
  );
}
