import WeatherWidget from "../source/WeatherWidget";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function WeatherDemo({ lang }: DemoProps) {
  return (
    <Stage>
      <WeatherWidget locale={lang === "ro" ? "ro-RO" : "en-IE"} />
    </Stage>
  );
}
