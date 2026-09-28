import { useEffect, useState } from "react";
import SplitReveal from "../source/SplitReveal";
import { Stage } from "./_shell";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

export default function SplitRevealDemo({ values, lang, active }: DemoProps) {
  const text = str(values.text, lang === "ro" ? "Construiește ceva memorabil" : "Build something memorable");
  // Demo-ul se reia la fiecare intrare în ecran, ca să se vadă animația.
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (active) setKey((k) => k + 1);
  }, [active]);
  return (
    <Stage>
      <SplitReveal
        key={key}
        text={text}
        as="h3"
        trigger="mount"
        stagger={num(values.stagger, 0.035)}
        blur={num(values.blur, 12)}
        className="max-w-sm text-center text-2xl font-bold leading-tight text-white sm:text-3xl"
      />
    </Stage>
  );
}
