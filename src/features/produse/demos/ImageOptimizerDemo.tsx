import ImageOptimizer from "../source/ImageOptimizer";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

export default function ImageOptimizerDemo({ values }: DemoProps) {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <ImageOptimizer maxWidth={num(values.maxWidth, 1600)} quality={num(values.quality, 0.82)} />
      </div>
    </Stage>
  );
}
