import NoiseField from "../source/NoiseField";
import { Stage } from "./_shell";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

export default function NoiseFieldDemo({ values, lang }: DemoProps) {
  return (
    <Stage pad={false}>
      <div className="relative h-full w-full overflow-hidden">
        <NoiseField colorA={str(values.colorA, "#8b5cf6")} colorB={str(values.colorB, "#22d3ee")} speed={num(values.speed, 0.12)} />
        <p className="pa-mono absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.28em] text-white/70">
          {lang === "ro" ? "canvas 2d · fără webgl" : "canvas 2d · no webgl"}
        </p>
      </div>
    </Stage>
  );
}
