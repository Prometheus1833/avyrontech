import MagneticButton from "../source/MagneticButton";
import { Stage } from "./_shell";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

export default function MagneticButtonDemo({ values, lang }: DemoProps) {
  return (
    <Stage>
      <MagneticButton strength={num(values.strength, 0.4)} radius={num(values.radius, 120)} color={str(values.color, "#22d3ee")}>
        {lang === "ro" ? "Apropie cursorul" : "Bring the cursor closer"}
      </MagneticButton>
    </Stage>
  );
}
