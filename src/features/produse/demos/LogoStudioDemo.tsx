import LogoStudio from "../components/LogoStudio";
import type { DemoProps } from "./registry";

export default function LogoStudioDemo({ lang, active }: DemoProps) {
  return (
    <div className="h-full w-full overflow-auto p-2">
      <LogoStudio lang={lang} active={active} />
    </div>
  );
}
