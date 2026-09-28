import { useRef } from "react";
import ScrollProgress from "../source/ScrollProgress";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function ScrollProgressDemo({ values, lang }: DemoProps) {
  const box = useRef<HTMLDivElement>(null);
  const ro = lang === "ro";
  const text = ro
    ? "Derulează caseta. Bara de sus arată cât ai citit, calculată o dată pe cadru, nu la fiecare eveniment de scroll. "
    : "Scroll the box. The bar shows how far you have read, computed once per frame instead of on every scroll event. ";
  return (
    <Stage>
      <div ref={box} className="h-[170px] w-full max-w-[320px] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] px-4 pb-4">
        <ScrollProgress color={str(values.color, "#8b5cf6")} target={box} />
        <p className="pt-3 text-[12px] leading-relaxed text-white/70">{text.repeat(6)}</p>
      </div>
    </Stage>
  );
}
