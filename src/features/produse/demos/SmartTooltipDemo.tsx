import SmartTooltip from "../source/SmartTooltip";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function SmartTooltipDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const chip = "rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12px] text-white";
  return (
    <Stage>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <SmartTooltip label={ro ? "Stă sus când are loc" : "Sits on top when there is room"} preferred="top">
          <button type="button" className={chip}>{ro ? "sus" : "top"}</button>
        </SmartTooltip>
        <SmartTooltip label={ro ? "Aici n-are loc jos, deci urcă singur" : "No room below, so it flips up"} preferred="bottom">
          <button type="button" className={chip}>{ro ? "jos" : "bottom"}</button>
        </SmartTooltip>
        <SmartTooltip label={ro ? "Se deschide și din tastatură" : "Opens from the keyboard too"} preferred="right">
          <button type="button" className={chip}>{ro ? "dreapta" : "right"}</button>
        </SmartTooltip>
      </div>
    </Stage>
  );
}
