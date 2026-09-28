import ScrambleText from "../source/ScrambleText";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function ScrambleTextDemo({ values }: DemoProps) {
  const charset = str(values.charset, "symbols") as "symbols" | "binary" | "hex" | "kana";
  return (
    <Stage>
      <p className="text-center text-lg font-semibold text-white sm:text-2xl">
        <ScrambleText text={str(values.text, "AVYRON ARTEFACTE")} charset={charset} trigger="loop" />
      </p>
    </Stage>
  );
}
