import { useState } from "react";
import FluidTabs from "../source/FluidTabs";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function FluidTabsDemo({ lang }: DemoProps) {
  const tabs =
    lang === "ro"
      ? [
          { id: "a", label: "Prezentare" },
          { id: "b", label: "Magazin" },
          { id: "c", label: "Aplicație" },
        ]
      : [
          { id: "a", label: "Website" },
          { id: "b", label: "Store" },
          { id: "c", label: "App" },
        ];
  const [value, setValue] = useState("a");
  return (
    <Stage>
      <FluidTabs tabs={tabs} value={value} onChange={setValue} label={lang === "ro" ? "Exemplu" : "Example"} />
    </Stage>
  );
}
