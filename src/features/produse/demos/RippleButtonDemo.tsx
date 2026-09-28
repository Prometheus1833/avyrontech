import RippleButton from "../source/RippleButton";
import { Stage } from "./_shell";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

export default function RippleButtonDemo({ values, lang }: DemoProps) {
  return (
    <Stage>
      <RippleButton
        color={str(values.color, "#8b5cf6")}
        duration={num(values.duration, 600)}
        radius={num(values.radius, 999)}
        style={{ fontSize: 15 }}
      >
        {str(values.label, lang === "ro" ? "Începe acum" : "Start now")}
      </RippleButton>
    </Stage>
  );
}
