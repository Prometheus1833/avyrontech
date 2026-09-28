import FaviconStudio from "../source/FaviconStudio";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function FaviconStudioDemo({ values }: DemoProps) {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <FaviconStudio initial={str(values.text, "AV")} />
      </div>
    </Stage>
  );
}
