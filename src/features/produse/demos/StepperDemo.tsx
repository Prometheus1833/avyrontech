import { useEffect, useState } from "react";
import Stepper from "../source/Stepper";
import { Stage } from "./_shell";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

export default function StepperDemo({ values, lang, active }: DemoProps) {
  const ro = lang === "ro";
  const steps = ro
    ? [{ label: "Brief" }, { label: "Design" }, { label: "Dezvoltare" }, { label: "Lansare" }]
    : [{ label: "Brief" }, { label: "Design" }, { label: "Build" }, { label: "Launch" }];
  const [current, setCurrent] = useState(num(values.current, 1));

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setCurrent((step) => (step + 1) % steps.length), 1800);
    return () => window.clearInterval(timer);
  }, [active, steps.length]);

  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Stepper steps={steps} current={current} color={str(values.color, "#8b5cf6")} />
      </div>
    </Stage>
  );
}
