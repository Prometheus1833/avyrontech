import CurrencyConverter from "../source/CurrencyConverter";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function FxDemo({ lang }: DemoProps) {
  return (
    <Stage>
      <CurrencyConverter locale={lang === "ro" ? "ro-RO" : "en-IE"} />
    </Stage>
  );
}
