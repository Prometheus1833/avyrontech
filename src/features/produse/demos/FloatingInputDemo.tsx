import FloatingInput from "../source/FloatingInput";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function FloatingInputDemo({ values, lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 300, display: "grid", gap: 12 }}>
        <FloatingInput
          label={ro ? "Nume complet" : "Full name"}
          color={str(values.color, "#8b5cf6")}
          validate={(value) => (value.trim().length < 3 ? (ro ? "Prea scurt" : "Too short") : null)}
        />
        <FloatingInput
          label="Email"
          type="email"
          color={str(values.color, "#8b5cf6")}
          validate={(value) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? null : ro ? "Adresă invalidă" : "Invalid address")}
        />
      </div>
    </Stage>
  );
}
