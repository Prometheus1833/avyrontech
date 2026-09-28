import PaletteStudio from "../source/PaletteStudio";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function PaletteStudioDemo({ values }: DemoProps) {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 340, maxHeight: "100%", overflowY: "auto" }}>
        <PaletteStudio brand={str(values.color, "#8b5cf6")} />
      </div>
    </Stage>
  );
}
