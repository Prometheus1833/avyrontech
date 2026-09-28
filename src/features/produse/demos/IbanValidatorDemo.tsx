import IbanValidator from "../source/IbanValidator";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function IbanValidatorDemo({ values }: DemoProps) {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 330 }}>
        <IbanValidator initial={str(values.iban, "RO49 AAAA 1B31 0075 9384 0000")} />
      </div>
    </Stage>
  );
}
