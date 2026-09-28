import ParticleLabStudio from "../components/ParticleLabStudio";
import type { DemoProps } from "./registry";

export default function ParticleLabDemo({ lang, active }: DemoProps) {
  return (
    <div className="h-full w-full [&>div]:h-full [&>div]:rounded-none [&>div]:border-0 [&>div>div:first-child]:h-full">
      <ParticleLabStudio lang={lang} active={active} compact />
    </div>
  );
}
