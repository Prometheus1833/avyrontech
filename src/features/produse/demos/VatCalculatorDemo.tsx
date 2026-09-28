import VatCalculator from "../source/VatCalculator";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

export default function VatCalculatorDemo({ values }: DemoProps) {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 330 }}>
        <VatCalculator rate={num(values.rate, 21)} amount={num(values.amount, 1000)} />
      </div>
    </Stage>
  );
}
