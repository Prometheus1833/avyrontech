import BillingForm from "../source/BillingForm";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function BillingFormDemo() {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 330, maxHeight: "100%", overflowY: "auto" }}>
        <BillingForm />
      </div>
    </Stage>
  );
}
