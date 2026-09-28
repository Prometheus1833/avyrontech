import NumberTicker from "../source/NumberTicker";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

export default function TickerDemo({ values, lang }: DemoProps) {
  const value = num(values.value, 12480);
  return (
    <Stage>
      <div className="text-center">
        <p className="text-4xl font-bold tabular-nums text-white sm:text-5xl">
          <NumberTicker value={value} duration={num(values.duration, 1.6)} locale={lang === "ro" ? "ro-RO" : "en-IE"} />
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">{lang === "ro" ? "vizitatori luna trecută" : "visitors last month"}</p>
      </div>
    </Stage>
  );
}
