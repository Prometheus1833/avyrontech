import MeshGradient from "../source/MeshGradient";
import { Stage } from "./_shell";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

export default function MeshGradientDemo({ values, lang }: DemoProps) {
  return (
    <Stage pad={false}>
      <MeshGradient color={str(values.color, "#7c3aed")} speed={num(values.speed, 1)} style={{ width: "100%", height: "100%" }}>
        <div className="grid h-full place-items-center p-6 text-center">
          <p className="text-lg font-semibold text-white">{lang === "ro" ? "Fundal cald, doar din CSS" : "A warm background, pure CSS"}</p>
        </div>
      </MeshGradient>
    </Stage>
  );
}
