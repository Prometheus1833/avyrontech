import SpotlightGrid from "../source/SpotlightGrid";
import { Stage } from "./_shell";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

export default function SpotlightGridDemo({ values, lang }: DemoProps) {
  return (
    <Stage pad={false}>
      <SpotlightGrid step={num(values.step, 32)} color={str(values.color, "#8b5cf6")} style={{ width: "100%", height: "100%" }}>
        <div className="grid h-full place-items-center p-6 text-center">
          <p className="text-sm text-white/80">{lang === "ro" ? "Mișcă cursorul peste grilă" : "Move the cursor over the grid"}</p>
        </div>
      </SpotlightGrid>
    </Stage>
  );
}
