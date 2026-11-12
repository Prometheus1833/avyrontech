import FaviconStudio from "../source/FaviconStudio";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function FaviconStudioDemo({ values, lang }: DemoProps) {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <FaviconStudio key={str(values.text, "AV")} initial={str(values.text, "AV")} lang={lang} />
      </div>
    </Stage>
  );
}
