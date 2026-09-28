import { useState } from "react";
import ThemeSwitch from "../source/ThemeSwitch";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

export default function ThemeSwitchDemo({ values, lang }: DemoProps) {
  const [dark, setDark] = useState(true);
  return (
    <Stage>
      <div
        className="grid place-items-center gap-3 rounded-2xl border px-8 py-6 transition-colors"
        style={{ background: dark ? "#0b0d16" : "#f6f7fb", borderColor: dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)" }}
      >
        <ThemeSwitch size={num(values.size, 46)} onChange={setDark} />
        <p className="text-[11px]" style={{ color: dark ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.55)" }}>
          {lang === "ro" ? (dark ? "Temă întunecată" : "Temă deschisă") : dark ? "Dark theme" : "Light theme"}
        </p>
      </div>
    </Stage>
  );
}
