import LiquidGlass from "../source/LiquidGlass";
import { Stage } from "./_shell";
import { num } from "./_props";
import type { DemoProps } from "./registry";

export default function LiquidGlassDemo({ values, lang }: DemoProps) {
  return (
    <Stage className="relative" pad={false}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 20%, #7c3aed88, transparent 60%), radial-gradient(50% 50% at 80% 70%, #22d3ee88, transparent 60%), linear-gradient(120deg,#0b0d16,#161a2c)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{ background: "repeating-linear-gradient(45deg, #ffffff10 0 8px, transparent 8px 16px)" }}
      />
      <LiquidGlass blur={num(values.blur, 14)} refraction={num(values.refraction, 40)} radius={num(values.radius, 28)} style={{ padding: 22, width: "min(320px, 80%)" }}>
        <p className="text-xs uppercase tracking-[0.22em] text-white/60">Liquid Glass</p>
        <p className="mt-2 text-lg font-semibold text-white">{lang === "ro" ? "Sticlă care refractă fundalul" : "Glass that refracts the background"}</p>
        <p className="mt-1 text-xs text-white/60">{lang === "ro" ? "Mișcă panoul peste dungi ca să vezi lentila." : "Move the panel over the stripes to see the lens."}</p>
      </LiquidGlass>
    </Stage>
  );
}
