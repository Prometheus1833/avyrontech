import HolidaysWidget from "../source/HolidaysWidget";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function HolidaysDemo({ values, lang }: DemoProps) {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 320 }}>
        <p className="pa-mono mb-2 text-[10px] uppercase tracking-[0.26em] text-white/50">
          {lang === "ro" ? "date.nager.at · fără cheie" : "date.nager.at · no key"}
        </p>
        <HolidaysWidget country={str(values.country, "RO")} />
      </div>
    </Stage>
  );
}
